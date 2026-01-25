from typing import Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.logging import get_logger
from src.models.workflow import Workflow, WorkflowStatus
from src.models.platform_state import PlatformState, PlatformStatus
from src.models.resource import Resource
from src.schemas.create import CreatePostRequest
from src.langgraph.runner import start_workflow_graph  # thin adapter
from src.services.resource_service import ResourceService
from src.langgraph.ai.title_generator import generate_title

log = get_logger(__name__)


class WorkflowService:
    """
    Service responsible for:
    - Creating a workflow
    - Initializing platform states
    - Attaching resources
    - Starting LangGraph orchestration

    This service:
    - DOES persist data
    - DOES NOT generate content
    - DOES NOT evaluate drafts
    - DOES NOT publish
    """

    @staticmethod
    async def create_workflow(
        db: AsyncSession,
        user_id: UUID,
        payload: CreatePostRequest,
    ) -> UUID:
        """
        Create a new workflow and start LangGraph execution.

        Returns:
            workflow_id
        """

        # Determine input for title generation
        title_input = ""
        if payload.mode == "manual":
            title_input = payload.content or "New Post"
        elif payload.mode == "template" and payload.template:
            title_input = f"{payload.template.goal} - {payload.template.key_message}"
        
        generated_title = await generate_title(title_input)

        # 1. Create workflow root
        workflow = Workflow(
            user_id=user_id,
            status=WorkflowStatus.CREATED,
            title=generated_title,
            description=None,
        )
        db.add(workflow)
        await db.flush()  # get workflow.id without committing

        log.info("Workflow created | id={}", workflow.id)

        # 2. Initialize platform states
        platform_states: Sequence[PlatformState] = [
            PlatformState(
                workflow_id=workflow.id,
                platform=platform.value,
                status=PlatformStatus.PENDING,
            )
            for platform in payload.platforms
        ]

        db.add_all(platform_states)

        # 3. Attach resources (context only)
        if payload.resources:
            await ResourceService(
                db=db,
                workflow_id=workflow.id,
                resources=payload.resources,
            )

        # 4. Mark workflow as in progress
        workflow.status = WorkflowStatus.IN_PROGRESS

        await db.commit()
        await db.refresh(workflow)

        # 5. Start LangGraph (async)
        await start_workflow_graph(
            workflow_id=workflow.id,
            user_id=user_id,
            payload=payload,
        )

        log.info(
            "LangGraph started | workflow_id={} | platforms={}",
            workflow.id,
            [p.value for p in payload.platforms],
        )

        return workflow.id

    @staticmethod
    async def get_workflow(
        db: AsyncSession,
        workflow_id: UUID,
        user_id: UUID,
    ) -> Workflow:
        """
        Fetch workflow with ownership check.
        """

        stmt = (
            select(Workflow)
            .where(Workflow.id == workflow_id)
            .where(Workflow.user_id == user_id)
        )

        result = await db.execute(stmt)
        workflow = result.scalar_one_or_none()

        if not workflow:
            raise ValueError("Workflow not found")

        return workflow