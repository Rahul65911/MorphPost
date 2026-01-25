from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.logging import get_logger
from src.models.workflow import Workflow, WorkflowStatus
from src.models.platform_state import PlatformState, PlatformStatus
from src.models.draft import Draft, DraftSource
from src.schemas.review import ReviewActionRequest, ReviewAction
from src.langgraph.runner import resume_workflow_graph

log = get_logger(__name__)


class ReviewService:
    """
    Service responsible for Human-in-the-Loop (HITL) actions.

    Guarantees:
    - Human edits create immutable drafts
    - Human drafts override AI drafts
    - Accepting one platform does not affect others
    - AI never overwrites human content
    """

    @staticmethod
    async def handle_review_action(
        db: AsyncSession,
        user_id: UUID,
        payload: ReviewActionRequest,
    ) -> None:
        """
        Apply a human review action to a specific platform.
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
            raise ValueError(
                f"Platform '{payload.platform}' not found in workflow '{payload.workflow_id}'"
            )

        workflow = platform_state.workflow

        if workflow.user_id != user_id:
            raise PermissionError(
                f"User {user_id} is not authorized to modify workflow {workflow.id}"
            )
        
        # Validate edited content is provided for edit actions
        if payload.action in {ReviewAction.EDIT_AND_REFINE, ReviewAction.EDIT_AND_PUBLISH}:
            if not payload.edited_content or not payload.edited_content.strip():
                raise ValueError(
                    f"Edited content is required for action '{payload.action}'"
                )

        # 2. Apply action
        should_check_completion = True

        if payload.action == ReviewAction.REJECT:
            platform_state.status = PlatformStatus.REJECTED
            await db.commit()

            log.info(
                "Platform rejected | workflow_id={} | platform={}",
                workflow.id,
                payload.platform,
            )

        # 3. Handle human edit actions (new immutable draft)
        elif payload.action in {
            ReviewAction.EDIT_AND_REFINE,
            ReviewAction.EDIT_AND_PUBLISH,
        }:
            # Use DraftService to create new draft and set as active
            from src.services.draft_service import DraftService
            
            human_draft = await DraftService.create_and_set_active(
                db=db,
                workflow_id=workflow.id,
                platform=payload.platform,
                content=payload.edited_content,
                source=DraftSource.HUMAN,
            )
            
            platform_state.active_draft_id = human_draft.id
            platform_state.human_override = True

            # Edit + Publish = final acceptance
            if payload.action == ReviewAction.EDIT_AND_PUBLISH:
                platform_state.status = PlatformStatus.ACCEPTED
            else:
                platform_state.status = PlatformStatus.AWAITING_REVIEW
                should_check_completion = False
                # Not complete, still refinement/review needed

            await db.commit()

            log.info(
                "Human draft created | draft_id={} | platform={}",
                human_draft.id,
                payload.platform,
            )

            # Resume LangGraph only if refinement requested
            if payload.action == ReviewAction.EDIT_AND_REFINE:
                await resume_workflow_graph(
                    workflow_id=workflow.id,
                    platform=payload.platform,
                    draft_id=human_draft.id,
                    feedback_instructions=payload.feedback_instructions
                )

        # 4. Accept AI draft (no modification)
        elif payload.action == ReviewAction.ACCEPT:
            platform_state.status = PlatformStatus.ACCEPTED
            await db.commit()

            log.info(
                "AI draft accepted | workflow_id={} | platform={}",
                workflow.id,
                payload.platform,
            )

        else:
             raise ValueError(f"Unsupported review action: {payload.action}")

        # Check if workflow is complete
        if should_check_completion:
            await ReviewService.check_and_update_workflow_status(
                db=db, 
                workflow_id=workflow.id
            )

    @staticmethod
    async def check_and_update_workflow_status(
        db: AsyncSession, 
        workflow_id: UUID
    ) -> None:
        """
        Check if all platforms are finalized and update workflow status.
        
        Logic:
        - If any platform is PENDING/AWAITING_REVIEW -> In Progress (no change)
        - If ALL platforms are REJECTED -> CANCELLED
        - If ALL platforms are final (Accepted, Rejected, Published, etc.), with at least one NOT rejected -> COMPLETED
        """
        from datetime import datetime
        
        # Fetch all platform states for this workflow
        stmt = select(PlatformState).where(PlatformState.workflow_id == workflow_id)
        result = await db.execute(stmt)
        states = result.scalars().all()
        
        if not states:
            return

        active_statuses = {
            PlatformStatus.PENDING, 
            PlatformStatus.AWAITING_REVIEW,
            PlatformStatus.ACCEPTED, # Still active until published/scheduled
        }
        
        # Check if any is active
        for state in states:
            if state.status in active_statuses:
                # Workflow still active
                return

        # All finalized. Determine outcome.
        total = len(states)
        rejected_count = sum(1 for s in states if s.status == PlatformStatus.REJECTED)
        
        new_status = None
        
        if rejected_count == total:
            new_status = WorkflowStatus.CANCELLED
        else:
            # Mixed or all accepted -> Completed
            new_status = WorkflowStatus.COMPLETED
            
        # Update workflow
        wf_stmt = select(Workflow).where(Workflow.id == workflow_id)
        wf_result = await db.execute(wf_stmt)
        workflow = wf_result.scalar_one_or_none()
        
        if workflow and workflow.status != new_status:
            workflow.status = new_status
            workflow.completed_at = datetime.utcnow()
            await db.commit()
            
            log.info(
                "Workflow status updated | workflow_id={} | status={}",
                workflow.id,
                new_status
            )