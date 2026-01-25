"""
HITL (Human-in-the-Loop) node.

Interrupts execution to wait for human review.
NO for loops - operates on single platform.
"""

from langgraph.types import interrupt, Command

from src.langgraph.state import PlatformGraphState
from src.core.logging import get_logger

log = get_logger(__name__)


async def await_human_review(state: PlatformGraphState) -> PlatformGraphState:
    """
    Pause execution and wait for human review.
    
    NO for loop - this is ONE platform's state.
    """
    platform = state["platform"]
    workflow_id = state["workflow_id"]
    
    # Skip if already awaiting human
    if state["awaiting_human"]:
        log.info("Already awaiting human review")
        return state
    
    log.info(
        "Requesting human review | workflow_id={} | platform={}",
        workflow_id,
        platform,
    )
    
    
    # Update database status
    from src.services.draft_service import DraftService
    from src.models.platform_state import PlatformStatus
    from src.db.session import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        await DraftService.update_platform_status(
            db=db,
            workflow_id=workflow_id,
            platform=platform,
            status=PlatformStatus.AWAITING_REVIEW,
        )
    
    # Mark as awaiting
    state["awaiting_human"] = True
    
    # ✅ Call interrupt() to pause graph execution and capture resume payload
    resume_payload = interrupt(
        {
            "workflow_id": str(workflow_id),
            "platform": platform,
            "draft_id": str(state["current_draft"]["draft_id"]) if state["current_draft"] else None,
            "message": f"Please review the draft for {platform}",
        }
    )
    
    log.info(f"DEBUG: hitl.py RESUMED from interrupt! Payload: {resume_payload}")

    # Resume logic:
    # If we are resumed with a payload (e.g., feedback), update state and route accordingly
    if resume_payload and isinstance(resume_payload, dict):
        # Update local state with whatever was passed in resume (e.g. awaiting_human=False)
        state.update(resume_payload)
        
        # If feedback is provided, we MUST loop back to generation
        if state.get("feedback_instructions"):
            log.info(
                "Resuming with feedback | workflow_id={} | platform={} | feedback={}",
                workflow_id,
                platform,
                state["feedback_instructions"]
            )
            return Command(
                goto="generate",
                update=state
            )

    return state
