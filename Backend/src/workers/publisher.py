"""
Background worker for executing publishing jobs.
"""

from datetime import datetime, timezone
from sqlalchemy import select

from src.core.logging import get_logger
from src.db.session import get_session
from src.models.publishing_job import PublishingJob, PublishingStatus
from src.models.draft import Draft
from src.services.platform_publisher import publish_to_platform

log = get_logger(__name__)


async def publish_job(job_id):
    """
    Execute a single publishing job using the platform publisher.
    """
    async with get_session() as db:
        stmt = (
            select(PublishingJob)
            .where(PublishingJob.id == job_id)
        )

        job = (await db.execute(stmt)).scalar_one_or_none()
        if not job:
            raise ValueError("Publishing job not found")

        # Load draft
        draft_stmt = select(Draft).where(Draft.id == job.draft_id)
        draft = (await db.execute(draft_stmt)).scalar_one()

        try:
            # Use the real platform publisher
            result = await publish_to_platform(
                platform=job.platform,
                content=draft.content,
                # TODO: Add access_token and person_urn from user settings
                # access_token=user.linkedin_token,
                # person_urn=user.linkedin_urn,
            )

            job.status = PublishingStatus.SUCCESS
            job.executed_at = datetime.now(timezone.utc)
            job.external_id = result.get("post_id") or result.get("tweet_id")

            log.info(
                "Publishing successful | job_id={} | platform={} | external_id={}",
                job.id,
                job.platform,
                job.external_id,
            )

        except Exception as exc:
            job.status = PublishingStatus.FAILED
            job.last_error = str(exc)
            job.executed_at = datetime.now(timezone.utc)

            log.exception(
                "Publishing failed | job_id={} | platform={}",
                job.id,
                job.platform,
            )

        finally:
            job.attempts += 1
            await db.commit()
