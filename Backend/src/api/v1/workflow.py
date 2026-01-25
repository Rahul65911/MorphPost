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
        )
    )
    
    result = await db.execute(stmt)
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Build response with platform states and drafts
    platforms_data = []
    for platform_state in workflow.platform_states:
        platform_data = {
            "platform": platform_state.platform,
            "status": platform_state.status,
            "active_draft": None,
            "evaluations": [], # TODO: Include evaluations if needed
        }
        
        # Include active draft if available
        if platform_state.active_draft:
            platform_data["active_draft"] = {
                "id": str(platform_state.active_draft.id),
                "platform": platform_state.active_draft.platform,
                "content": platform_state.active_draft.content,
                "source": platform_state.active_draft.source,
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
