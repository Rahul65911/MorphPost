import asyncio
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.db.session import get_session
from src.models.publishing_job import PublishingJob, PublishingStatus
from src.workers.publisher import publish_job

log = get_logger(__name__)


async def run_scheduler(poll_interval: int = 10) -> None:
    """
    Periodically scan for publishing jobs that are ready to execute.
    """

    log.info("Scheduler worker started")

    while True:
        async with get_session() as db:
            await _process_due_jobs(db)

        await asyncio.sleep(poll_interval)


async def _process_due_jobs(db: AsyncSession) -> None:
    """
    Find and dispatch due publishing jobs.
    """

    now = datetime.now(timezone.utc)

    stmt = (
        select(PublishingJob)
        .where(PublishingJob.status == PublishingStatus.PENDING)
        .where(PublishingJob.publish_at <= now)
        .order_by(PublishingJob.publish_at)
        .limit(10)
    )

    result = await db.execute(stmt)
    jobs = result.scalars().all()

    for job in jobs:
        try:
            job.status = PublishingStatus.RUNNING
            await db.commit()

            log.info(
                "Dispatching publishing job | job_id={} | platform={}",
                job.id,
                job.platform,
            )

            await publish_job(job.id)

        except Exception as exc:
            log.exception(
                "Failed to dispatch job | job_id={}",
                job.id,
            )

            job.status = PublishingStatus.FAILED
            job.last_error = str(exc)
            await db.commit()


async def process_pending_jobs() -> None:
    """
    Process pending jobs once (for immediate publishing).
    
    This is called by publishing_service for immediate execution.
    """
    async with get_session() as db:
        await _process_due_jobs(db)
