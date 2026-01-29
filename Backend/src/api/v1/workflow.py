"""
Workflow endpoints for retrieving workflow status and drafts.
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.db.session import get_db_session
from src.core.security import get_current_user
from src.models.workflow import Workflow
from src.models.platform_state import PlatformState
from src.models.user import User
from src.core.logging import get_logger

router = APIRouter(prefix="/workflow", tags=["Workflow"])
log = get_logger(__name__)


@router.get("/stats", status_code=status.HTTP_200_OK)
async def get_stats(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get dashboard stats for the current user.
    """
    try:
        log.info("Fetching stats | user_id={}", current_user.id)
        
        # Count total workflows (created)
        stmt_total = (
            select(Workflow)
            .where(Workflow.user_id == current_user.id)
        )
        result_total = await db.execute(stmt_total)
        workflows = result_total.scalars().all()
        
        total_posts = len(workflows)
        
        # Count published/completed
        published_count = sum(1 for w in workflows if w.status in ["published", "completed"])
        
        # Count active drafts (not published/completed and not rejected/cancelled)
        drafts_count = sum(1 for w in workflows if w.status in ["created", "in_progress", "awaiting_review"])
        
        # Calculate time saved (10 mins per post/draft), rounded to 1 decimal
        time_saved_hours = round((published_count + drafts_count) * (10 / 60), 1)
        
        return {
            "total_posts": total_posts,
            "published_posts": published_count,
            "active_drafts": drafts_count,
            "time_saved_hours": time_saved_hours,
        }
    except Exception as e:
        log.error("Error fetching stats: {}", str(e))
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.get("/", status_code=status.HTTP_200_OK)
async def list_workflows(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20,
):
    """
    List workflows for the current user.
    """
    try:
        log.info("Listing workflows | user_id={} | skip={} | limit={}", current_user.id, skip, limit)
        # COMMENT: This way methods grow long thats why I personally prefer to use following flow: router -> service -> repo, this works but hard to debug and manage long term.
        stmt = (
            select(Workflow)
            .where(Workflow.user_id == current_user.id)
            .order_by(Workflow.created_at.desc())
            .offset(skip)
            .limit(limit)
            .options(selectinload(Workflow.platform_states))
        )
        
        result = await db.execute(stmt)
        workflows = result.scalars().all()
        
        response = []
        for wf in workflows:
            response.append({
                "id": str(wf.id),
                "status": wf.status,
                "title": wf.title,
                "created_at": wf.created_at.isoformat(),
                "platform_counts": len(wf.platform_states),
                "platforms": [ps.platform for ps in wf.platform_states],
            })
            
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Log via logger too just in case
        log.error("Error listing workflows: {}", str(e))
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.get(
    "/{workflow_id}",
    status_code=status.HTTP_200_OK,
)
async def get_workflow(
    workflow_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get workflow status with all platform states and drafts.
    
    Returns:
        - Workflow metadata
        - Platform states with status
        - Active drafts for each platform
        - Evaluation scores
    """
    log.info("Fetching workflow | workflow_id={} | user_id={}", workflow_id, current_user.id)
    
    # Fetch workflow with all related data
    stmt = (
        select(Workflow)
        .where(Workflow.id == workflow_id)
        .where(Workflow.user_id == current_user.id)
        .options(
            selectinload(Workflow.platform_states).selectinload(PlatformState.active_draft),
            selectinload(Workflow.drafts),
            selectinload(Workflow.resources),
            selectinload(Workflow.publishing_jobs),
        )
    )
    
    result = await db.execute(stmt)
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Build response with platform states and drafts
    platforms_data = []

    # Map jobs by platform for easy access
    jobs_by_platform = {job.platform: job for job in workflow.publishing_jobs}

    for platform_state in workflow.platform_states:
        platform_data = {
            "platform": platform_state.platform,
            "status": platform_state.status,
            "active_draft": None,
            "evaluations": [], # TODO: Include evaluations if needed
            "publishing_job": None, 
        }

        # Include scheduling info if exists
        if platform_state.platform in jobs_by_platform:
            job = jobs_by_platform[platform_state.platform]
            platform_data["publishing_job"] = {
                "id": str(job.id),
                "status": job.status,
                "publish_at": job.publish_at.isoformat(),
            }
        
        # Include active draft if available
        if platform_state.active_draft:
            platform_data["active_draft"] = {
                "id": str(platform_state.active_draft.id),
                "platform": platform_state.active_draft.platform,
                "content": platform_state.active_draft.content,
                "source": platform_state.active_draft.source,
                "media_urls": platform_state.active_draft.media_urls,
                "media_type": platform_state.active_draft.media_type,
                "created_at": platform_state.active_draft.created_at.isoformat(),
            }
        
        platforms_data.append(platform_data)

    resource_data = []
    for res in workflow.resources:
        resource_data.append({
            "id": str(res.id),
            "type": res.type,
            "name": res.name,
            "source": res.source,
            "created_at": res.created_at.isoformat(),
        })
    
    response = {
        "id": str(workflow.id),
        "user_id": str(workflow.user_id),
        "status": workflow.status,
        "title": workflow.title,
        "description": workflow.description,
        "created_at": workflow.created_at.isoformat(),
        "updated_at": workflow.updated_at.isoformat(),
        "completed_at": workflow.completed_at.isoformat() if workflow.completed_at else None,
        "platforms": platforms_data,
        "resources": resource_data,
    }
    
    log.info(
        "Workflow retrieved | workflow_id={} | platforms={}",
        workflow_id,
        len(platforms_data),
    )
    
    return response
