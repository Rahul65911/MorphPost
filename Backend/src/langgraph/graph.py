"""
Main workflow graph with parallel platform processing.

Uses Send mechanism to fan out to independent platform subgraphs.
"""

from langgraph.graph import StateGraph, END
from langgraph.types import Send, Command
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from src.core.config import get_settings
from src.langgraph.state import WorkflowGraphState, PlatformGraphState
from src.langgraph.platform_subgraph import build_platform_subgraph

settings = get_settings()


def fanout_to_platforms(state: WorkflowGraphState) -> Command[list[Send]]:
    """
    Fan out to parallel platform processing.
    
    Returns a list of Send objects - one per platform that needs processing.
    Each Send triggers an independent subgraph execution.
    """
    sends = []
    
    for platform_state in state["platforms"]:
        # Skip platforms that are already done
        if platform_state.get("accepted") or platform_state.get("rejected"):
            continue
        
        # Prepare input for platform subgraph
        platform_input: PlatformGraphState = {
            "workflow_id": state["workflow_id"],
            "user_id": state["user_id"],
            "platform": platform_state["platform"],
            
            # ✅ Handle both manual and template modes
            "source_content": state.get("source_content"),
            "template_input": state.get("template_input"),
            "mode": state["mode"],
            
            # Platform-specific state
            "current_draft": platform_state.get("current_draft"),
            "previous_drafts": platform_state.get("previous_drafts", []),
            "last_evaluation": platform_state.get("last_evaluation"),
            "iteration": platform_state.get("iteration", 0),
            "awaiting_human": platform_state.get("awaiting_human", False),
            "accepted": platform_state.get("accepted", False),
            "rejected": platform_state.get("rejected", False),
            
            # Context
            "resources": state["resources"],
            "max_iterations": state["max_iterations"],
            "manual_options": state.get("manual_options"),
            "feedback_instructions": platform_state.get("feedback_instructions"),
        }
        
        # Send this platform to its own subgraph instance
        sends.append(
            Send("platform_processor", platform_input)
        )
    
    # Return Command with goto list
    return Command(goto=sends)


def merge_platform_results(states: list[PlatformGraphState]) -> WorkflowGraphState:
    """
    Merge results from all parallel platform executions.
    
    Called automatically by LangGraph after all Send branches complete.
    """
    if not states:
        raise ValueError("No platform states to merge")
    
    # Extract workflow-level data from first state
    first_state = states[0]
    
    # Collect all platform states
    platform_states = []
    for state in states:
        platform_states.append({
            "platform": state["platform"],
            "current_draft": state["current_draft"],
            "previous_drafts": state["previous_drafts"],
            "last_evaluation": state["last_evaluation"],
            "iteration": state["iteration"],
            "awaiting_human": state["awaiting_human"],
            "accepted": state["accepted"],
            "rejected": state["rejected"],
        })
    
    # Reconstruct workflow state
    return {
        "workflow_id": first_state["workflow_id"],
        "user_id": first_state["user_id"],
        "mode": first_state["mode"],
        "source_content": first_state.get("source_content"),
        "template_input": first_state.get("template_input"),
        "manual_options": first_state.get("manual_options"),
        "resources": first_state["resources"],
        "platforms": platform_states,
        "max_iterations": first_state["max_iterations"],
    }


def check_all_platforms_complete(state: WorkflowGraphState) -> str:
    """
    Check if all platforms have reached a terminal state.
    
    Returns:
        "complete" if all done, "continue" if any still need processing
    """
    all_done = all(
        ps.get("accepted") or ps.get("rejected") or ps.get("awaiting_human")
        for ps in state["platforms"]
    )
    
    return "complete" if all_done else "continue"


def build_workflow_graph(checkpointer: AsyncPostgresSaver = None):
    """
    Build the main workflow graph with fan-out/fan-in for parallel platforms.
    
    Graph structure:
        START → fanout → [platform_processor × N] → merge → check → END/HITL
    
    Responsibilities:
    - Define node topology
    - Define routing rules
    - Enforce max regeneration attempts
    - Define HITL interrupt points

    Non-responsibilities:
    - AI logic
    - DB access
    - HTTP handling
    """
    builder = StateGraph(WorkflowGraphState)
    
    # Platform subgraph (runs once per platform in parallel)
    platform_subgraph = build_platform_subgraph()
    
    # Nodes
    builder.add_node("fanout", fanout_to_platforms)
    builder.add_node("platform_processor", platform_subgraph)
    builder.add_node("merge", merge_platform_results)
    
    # Flow
    builder.set_entry_point("fanout")
    
    # Fan-out happens automatically when fanout returns list[Send]
    # builder.add_edge("fanout", "platform_processor")
    
    # All parallel branches merge automatically
    builder.add_edge("platform_processor", "merge")
    
    # After merge, check if we're done or need more processing
    builder.add_conditional_edges(
        "merge",
        check_all_platforms_complete,
        {
            "complete": END,
            "continue": "fanout",  # Loop back to process remaining platforms
        }
    )
    
    # Compile with checkpointer
    return builder.compile(checkpointer=checkpointer)


# Global graph instance (initialized on app startup with checkpointer)
# For now, build without checkpointer so imports work
workflow_graph = build_workflow_graph(checkpointer=None)
