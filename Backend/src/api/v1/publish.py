from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from uuid import UUID

from src.db.session import get_db_session
from src.schemas.publish import PublishRequest
from src.services.publishing_service import PublishingService
from src.core.security import get_current_user  # JWT dependency
from src.core.logging import get_logger

router = APIRouter(prefix="/publish", tags=["Publish"])
log = get_logger(__name__)


@router.post(
    "/schedule",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
async def publish_or_schedule(
    payload: PublishRequest,
    db: AsyncSession = Depends(get_db_session),
    user=Depends(get_current_user),
):
    """
    Publish immediately or schedule publishing for a specific platform.

    Preconditions (enforced by service):
    - Platform must be ACCEPTED
    - Active draft must exist
    """
    
    log.info(
        "Publishing requested | user_id={} | workflow_id={} | platform={} | publish_at={}",
        user.id,
        payload.workflow_id,
        payload.platform,
        payload.publish_at,
    )

    try:
        job_id: UUID = await PublishingService.create_publishing_job(
            db=db,
            user_id=user.id,
            payload=payload,
        )
        
        status_msg = "scheduled" if payload.publish_at else "published"
        
        log.info(
            "Publishing request successful | job_id={} | status={}",
            job_id,
            status_msg,
        )

        return {
            "job_id": job_id,
            "status": status_msg,
            "message": f"Successfully {status_msg} content for {payload.platform}"
        }
        
    except ValueError as e:
        # Handle validation errors (not found, invalid state, etc.)
        error_msg = str(e)
        log.warning(
            "Publishing validation error | workflow_id={} | platform={} | error={}",
            payload.workflow_id,
            payload.platform,
            error_msg,
        )
        
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
        log.warning(
            "Publishing unauthorized | user_id={} | workflow_id={} | platform={}",
            user.id,
            payload.workflow_id,
            payload.platform,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to publish for this workflow",
        )
        
    except SQLAlchemyError as e:
        log.error(
            "Database error during publishing | workflow_id={} | platform={} | error={}",
            payload.workflow_id,
            payload.platform,
            str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="A database error occurred while processing your request",
        )
        
    except Exception as e:
        log.error(
            "Unexpected error during publishing | workflow_id={} | platform={} | error={} | type={}",
            payload.workflow_id,
            payload.platform,
            str(e),
            type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your request",
        )
