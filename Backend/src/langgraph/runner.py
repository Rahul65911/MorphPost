from typing import Optional
from uuid import UUID

from langgraph.errors import GraphInterrupt
from langgraph.types import Command

from src.core.config import get_settings
from src.core.logging import get_logger
from src.core.logging import get_logger
from src.langgraph.state import WorkflowGraphState

settings = get_settings()
log = get_logger(__name__)


async def start_workflow_graph(
    workflow_id: UUID,
    user_id: UUID,
    payload,
) -> None:
    """
    Start LangGraph execution for a newly created workflow.

    This function:
    - Builds initial graph state
    - Starts execution
    - Handles HITL interrupts

    It does NOT:
    - Persist drafts (done by nodes)
    - Call services
    - Block HTTP requests
    """

    initial_state: WorkflowGraphState = {
        "workflow_id": workflow_id,
        "user_id": user_id,
        "mode": payload.mode,
        
        # ✅ Handle both modes correctly
        "source_content": payload.content if payload.mode == "manual" else None,
        "template_input": (
            payload.template.model_dump()
            if payload.mode == "template" and payload.template
            else None
        ),
        
        "manual_options": (
            payload.options.model_dump()
            if payload.options
            else None
        ),
        "resources": [
            {
                "type": r.type.value,
                "source": r.source,
                "name": r.name,
                "mime_type": r.mime_type,
            }
            for r in payload.resources
        ],
        "platforms": [
            {
                "platform": p.value,
                "current_draft": None,
                "previous_drafts": [],
                "last_evaluation": None,
                "iteration": 0,
                "awaiting_human": False,
                "accepted": False,
                "rejected": False,
            }
            for p in payload.platforms
        ],
        "max_iterations": settings.langgraph_max_iterations,
    }

    # Configuration with thread_id for checkpointing
    config = {
        "configurable": {
            "thread_id": str(workflow_id),
        }
    }

    try:
        # ✅ Use async invoke
        # Dynamic import to get the initialized graph (with checkpointer) from main.py startup
        from src.langgraph import graph as graph_module
        await graph_module.workflow_graph.ainvoke(initial_state, config=config)

    except Exception as exc:
        if isinstance(exc, GraphInterrupt):
            log.info(
                "Workflow interrupted for HITL | workflow_id={}",
                workflow_id,
            )
        else:
            raise


async def resume_workflow_graph(
    workflow_id: UUID,
    platform: str,
    draft_id: Optional[UUID] = None,
    feedback_instructions: Optional[str] = None,
) -> None:
    """
    Resume LangGraph execution after human input.

    Called only from services (review_service).
    """

    log.info(
        "Resuming LangGraph | workflow_id={} | platform={} | draft_id={} | feedback={}",
        workflow_id,
        platform,
        draft_id,
        "Yes" if feedback_instructions else "No",
    )

    # Configuration with thread_id for checkpointing
    config = {
        "configurable": {
            "thread_id": str(workflow_id),
        }
    }

    try:
        # Dynamic import to get the initialized graph (with checkpointer) from main.py startup
        from src.langgraph import graph as graph_module
        
        # Prepare resume payload
        resume_payload = {}
        
        if feedback_instructions:
            resume_payload["feedback_instructions"] = feedback_instructions
            resume_payload["awaiting_human"] = False

        # DEBUG: Inspect state before resume
        # Must use aget_state for AsyncPostgresSaver to avoid sync call error
        snapshot = await graph_module.workflow_graph.aget_state(config)
        log.info(f"DEBUG: Snapshot before resume | next={snapshot.next} | tasks={snapshot.tasks}")
            
        # Resume parent graph with Command
        # This propagates the resume payload to the interrupted node (HITL in subgraph)
        log.info(f"DEBUG: invoking graph with resume_payload: {resume_payload}")
        result = await graph_module.workflow_graph.ainvoke(
            Command(resume=resume_payload),
            config=config
        )
        log.info(f"DEBUG: graph resumed successfully. Result keys: {result.keys() if result else 'None'}")
        
    except Exception as exc:
        if isinstance(exc, GraphInterrupt):
            # Another interrupt (e.g., another platform needs review)
            log.info(
                "Workflow interrupted again | workflow_id={}",
                workflow_id,
            )   
        else:
            raise
