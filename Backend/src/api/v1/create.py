from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from src.db.session import get_db_session
from src.schemas.create import CreatePostRequest
from src.services.workflow_service import WorkflowService
from src.core.security import get_current_user  # JWT dependency

router = APIRouter(prefix="/create", tags=["Create"])

# COMMENT: The file names really need to be changed, we should be able to know that this file contains routes related to workflow.
@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
async def create_workflow(
    payload: CreatePostRequest,
    db: AsyncSession = Depends(get_db_session),
    user=Depends(get_current_user),
):
    """
    Start a new content creation workflow.
    """

    workflow_id: UUID = await WorkflowService.create_workflow(
        db=db,
        user_id=user.id,
        payload=payload,
    )

    return {
        "workflow_id": workflow_id,
    }
