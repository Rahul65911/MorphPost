"""
Generate draft for a SINGLE platform.

This node runs in the platform subgraph.
State contains data for ONE platform only - NO for loops needed.
"""

from datetime import datetime, timezone
from uuid import uuid4

from src.langgraph.state import PlatformGraphState, DraftSnapshot
from src.langgraph.ai.content_builder import build_generation_context
from src.core.logging import get_logger

log = get_logger(__name__)


async def generate_draft(state: PlatformGraphState) -> PlatformGraphState:
    """
    Generate AI draft for this platform.
    
    State is for ONE platform only - process directly, no iteration needed.
    """
    platform = state["platform"]
    workflow_id = state["workflow_id"]
    
    log.info(
        "Generating draft | workflow_id={} | platform={} | iteration={}",
        workflow_id,
        platform,
        state["iteration"] + 1,
    )
    
    # Check for specific human feedback (refinement)
    feedback_instructions = state.get("feedback_instructions")

    # Skip if already have a draft (resuming after HITL) AND no feedback to act on
    if state["current_draft"] is not None and not feedback_instructions:
        log.info("Draft already exists and no feedback provided, skipping generation")
        return state
    
    # If regenerating due to feedback, archive current draft
    if state["current_draft"]:
        state.setdefault("previous_drafts", []).append(state["current_draft"])
        # We don't strictly need to set current_draft to None as we overwrite it below,
        # but logically we are creating a new one.

    # ✅ Build context from correct source based on mode
    context = build_generation_context(
        source_content=state.get("source_content"),
        template_input=state.get("template_input"),
        resources=state["resources"],
        manual_options=state.get("manual_options"),
    )
    
    # Generate content using OpenAI
    from src.langgraph.ai.generator import DraftGenerator
    
    generator = DraftGenerator()
    content = await generator.generate(
        platform=platform,
        context=context,
        user_id=str(state["user_id"]),
        previous_feedback=state["last_evaluation"]["feedback"] if state["last_evaluation"] else None,
        feedback_instructions=feedback_instructions
    )
    
    log.info(
        "Draft generated | platform={} | length={} | preview={}",
        platform,
        len(content),
        content[:100] + "..." if len(content) > 100 else content,
    )
    
    # Persist to database using DraftService
    from src.db.session import AsyncSessionLocal
    from src.services.draft_service import DraftService
    from src.models.draft import DraftSource
    
    # Extract media from resources for attachment
    media_urls = []
    media_type = None
    
    for r in state["resources"]:
        # Check for image or video types
        # Note: ResourceSnapshot type is string, assume "image" or "video"
        if r.get("type") in ["image", "video"]:
            media_urls.append(r["source"])
            if not media_type:
                media_type = r.get("type")
            elif media_type != r.get("type"):
                media_type = "mixed"

    async with AsyncSessionLocal() as db:
         stored_draft = await DraftService.create_and_set_active(
            db=db,
            workflow_id=workflow_id,
            platform=platform,
            content=content,
            source=DraftSource.AI,
            media_urls=media_urls,
            media_type=media_type,
        )
        
    # Create draft snapshot from the stored draft
    draft: DraftSnapshot = {
        "draft_id": stored_draft.id,
        "platform": platform,
        "content": content,
        "source": "ai",
        "created_at": stored_draft.created_at,
        "based_on_id": None, 
    }
    
    # Update state (for THIS platform only)
    state["current_draft"] = draft
    state["iteration"] += 1
    
    # Consume the feedback instructions so we don't regenerate infinitely
    if feedback_instructions:
        state["feedback_instructions"] = None
    
    log.info(
        "Draft generated | draft_id={} | length={}",
        draft["draft_id"],
        len(content),
    )
    
    return state