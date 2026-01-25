from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.config import get_settings
from src.core.logging import get_logger
from src.models.platform_state import PlatformState, PlatformStatus
from src.models.draft import Draft
from src.models.publishing_job import PublishingJob, PublishingStatus
from src.schemas.publish import PublishRequest

settings = get_settings()
log = get_logger(__name__)


class PublishingService:
    """
    Service responsible for:
    - Validating publishing eligibility
    - Creating publishing jobs
    - Enforcing scheduling rules

    Guarantees:
    - Publishing only after acceptance
    - One job per (workflow, platform, draft)
    - LangGraph is never re-entered
    """

    @staticmethod
    async def create_publishing_job(
        db: AsyncSession,
        user_id: UUID,
        payload: PublishRequest,
    ) -> UUID:
        """
        Create a publishing job for an accepted platform draft.
        """

        # 1. Load platform state with ownership validation
        stmt = (
            select(PlatformState)
            .join(PlatformState.workflow)
            .where(PlatformState.workflow_id == payload.workflow_id)
            .where(PlatformState.platform == payload.platform)
        )

        result = await db.execute(stmt)
        platform_state = result.scalar_one_or_none()

        if not platform_state:
            raise ValueError("Platform state not found")

        workflow = platform_state.workflow

        if workflow.user_id != user_id:
            raise PermissionError("Unauthorized publish request")

        # 2. Validate platform acceptance
        if platform_state.status != PlatformStatus.ACCEPTED:
            raise ValueError(
                "Platform must be accepted before publishing"
            )

        if not platform_state.active_draft_id:
            raise ValueError("No active draft to publish")

        # 3. Resolve publish time
        if payload.publish_at:
            publish_at = payload.publish_at
            immediate = False
        else:
            publish_at = datetime.now(timezone.utc)
            immediate = True

        # 4. Prevent duplicate publishing jobs
        stmt = (
            select(PublishingJob)
            .where(PublishingJob.workflow_id == workflow.id)
            .where(PublishingJob.platform == payload.platform)
            .where(PublishingJob.draft_id == platform_state.active_draft_id)
        )

        existing_job = (await db.execute(stmt)).scalar_one_or_none()
        if existing_job:
            raise ValueError("Publishing job already exists")

        # 5. Create publishing job
        job = PublishingJob(
            workflow_id=workflow.id,
            platform=payload.platform,
            draft_id=platform_state.active_draft_id,
            publish_at=publish_at,
            timezone=payload.timezone or settings.default_timezone,
            immediate=immediate,
            status=PublishingStatus.PENDING,
        )

        db.add(job)

        # 6. Update platform state
        platform_state.status = (
            PlatformStatus.PUBLISHED
            if immediate
            else PlatformStatus.SCHEDULED
        )

        await db.commit()
        await db.refresh(job)

        log.info(
            "Publishing job created | job_id={} | workflow_id={} | platform={} | immediate={}",
            job.id,
            workflow.id,
            payload.platform,
            immediate,
        )

        # 7. Execute immediate publishing via scheduler
        if immediate:
            from src.workers.scheduler import process_pending_jobs
            
            # COMMENT: Completly skip the job flow in case if we have to publish it immediately. I assume publishing means posting it on X.
            log.info("Triggering immediate publish | job_id={}", job.id)
            await process_pending_jobs()  # Process the pending job immediately

        # 8. Check if workflow is now complete
        from src.services.review_service import ReviewService
        await ReviewService.check_and_update_workflow_status(
            db=db, 
            workflow_id=workflow.id
        )

        return job.id
