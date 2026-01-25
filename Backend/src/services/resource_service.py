from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.resource import Resource


class ResourceService:
    @staticmethod
    async def attach_resources(
        db: AsyncSession,
        *,
        workflow_id: UUID,
        resources: list[dict],
    ) -> None:
        """
        Persist uploaded resources and associate them with a workflow.
        Side-effect free outside DB.
        """
        for r in resources:
            db.add(
                Resource(
                    workflow_id=workflow_id,
                    type=r["type"],
                    uri=r["uri"],
                    metadata=r.get("metadata", {}),
                )
            )

        await db.commit()
