"""
Platform-specific subgraph.

This graph is executed once per platform in parallel via Send.
Each instance is completely independent.

NO FOR LOOPS NEEDED - each instance handles ONE platform only.
"""

from langgraph.graph import StateGraph, END

from src.langgraph.state import PlatformGraphState
from src.langgraph.nodes.generate import generate_draft
from src.langgraph.nodes.evaluate import evaluate_draft
from src.langgraph.nodes.hitl import await_human_review


def build_platform_subgraph() -> StateGraph:
    """
    Build subgraph for single-platform processing.
    
    This runs independently for each platform via Send.
    State contains data for ONE platform only.
    
    Flow:
        generate → evaluate → [goto hitl OR goto generate (regenerate)]
        
    Evaluate node now handles routing internally via Command:
    - If passed: goto hitl
    - If failed and iterations < max: goto generate (regenerate)
    - If max iterations: goto hitl anyway
    """
    builder = StateGraph(PlatformGraphState)
    
    # Nodes (each operates on single platform state)
    builder.add_node("generate", generate_draft)
    builder.add_node("evaluate", evaluate_draft)
    builder.add_node("hitl", await_human_review)
    
    # Entry point
    builder.set_entry_point("generate")
    
    # Edges
    # generate → evaluate (always)
    builder.add_edge("generate", "evaluate")
    
    # evaluate uses Command to route to either:
    # - "hitl" (if passed or max iterations)
    # - "generate" (if failed and can regenerate)
    # No conditional edges needed - evaluate returns Command
    
    # HITL is terminal state (workflow pauses here)
    builder.add_edge("hitl", END)
    
    return builder.compile()
