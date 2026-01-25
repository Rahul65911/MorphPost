from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from src.db.session import get_db_session
from src.schemas.review import ReviewActionRequest, ReviewAction
from src.services.review_service import ReviewService
from src.core.security import get_current_user
from src.core.logging import get_logger
from src.models.platform_state import PlatformState

from sqlalchemy import select
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/review", tags=["Review"])
log = get_logger(__name__)


@router.post(
    "/action",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
async def review_action(
    payload: ReviewActionRequest,
    db: AsyncSession = Depends(get_db_session),
    user=Depends(get_current_user),
):
    """
    Apply a Human-in-the-Loop (HITL) action to a platform draft.

    Actions are platform-scoped and do not affect other platforms
    within the same workflow.
    
    Raises:
        HTTPException 404: Workflow or platform not found
        HTTPException 403: User not authorized for this workflow
        HTTPException 400: Invalid action or missing required data
        HTTPException 500: Internal server error
    """
    
    log.info(
        "Review action requested | user_id={} | workflow_id={} | platform={} | action={}",
        user.id,
        payload.workflow_id,
        payload.platform,
        payload.action,
    )

    try:
        await ReviewService.handle_review_action(
            db=db,
            user_id=user.id,
            payload=payload,
        )
        
        log.info(
            "Review action completed | workflow_id={} | platform={} | action={}",
            payload.workflow_id,
            payload.platform,
            payload.action,
        )

        response_data = {
            "status": "ok",
            "message": f"Review action '{payload.action}' applied successfully to {payload.platform}",
        }

        # If action is Refine, fetch the new draft to update UI immediately
        if payload.action == ReviewAction.EDIT_AND_REFINE:
            stmt = (
                select(PlatformState)
                .where(PlatformState.workflow_id == payload.workflow_id)
                .where(PlatformState.platform == payload.platform)
                .options(selectinload(PlatformState.active_draft))
            )
            result = await db.execute(stmt)
            updated_state = result.scalar_one_or_none()
            
            if updated_state and updated_state.active_draft:
                 response_data["draft"] = {
                    "id": str(updated_state.active_draft.id),
                    "content": updated_state.active_draft.content,
                    "platform": updated_state.active_draft.platform,
                    "created_at": updated_state.active_draft.created_at.isoformat(),
                    "source": updated_state.active_draft.source,
                }

        return response_data
        
    except ValueError as e:
        # Handle validation errors (not found, invalid action, etc.)
        error_msg = str(e)
        log.warning(
            "Review action validation error | workflow_id={} | platform={} | error={}",
            payload.workflow_id,
            payload.platform,
            error_msg,
        )
        
        # Determine appropriate status code based on error message
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg,
            )
    
    except PermissionError as e:
        # Handle authorization errors
        log.warning(
            "Review action unauthorized | user_id={} | workflow_id={} | platform={}",
            user.id,
            payload.workflow_id,
            payload.platform,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to perform this action on this workflow",
        )
    
    except SQLAlchemyError as e:
        # Handle database errors
        log.error(
            "Database error during review action | workflow_id={} | platform={} | error={}",
            payload.workflow_id,
            payload.platform,
            str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="A database error occurred while processing your request",
        )
    
    except Exception as e:
        # Catch-all for unexpected errors
        import traceback
        log.error(
            "Unexpected error during review action | workflow_id={} | platform={} | error={} | type={} | traceback={}",
            payload.workflow_id,
            payload.platform,
            str(e),
            type(e).__name__,
            traceback.format_exc(),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}",
        )
