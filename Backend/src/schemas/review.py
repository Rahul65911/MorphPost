from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# Enums
class ReviewAction(str, Enum):
    """
    Allowed human review actions per platform.
    """

    ACCEPT = "accept"
    REJECT = "reject"
    EDIT_AND_REFINE = "edit_and_refine"
    EDIT_AND_PUBLISH = "edit_and_publish"


# Review Action Request
class ReviewActionRequest(BaseModel):
    """
    Human-in-the-loop action on a specific platform draft.
    """

    workflow_id: UUID = Field(..., description="Workflow identifier")
    platform: str = Field(..., description="Target platform")
    action: ReviewAction

    # Required when human edits content
    edited_content: Optional[str] = Field(
        default=None,
        description="Human-edited content (required for edit actions)",
    )
    
    # Optional feedback for refinement
    feedback_instructions: Optional[str] = Field(
        default=None,
        description="User feedback/instructions for LLM refinement",
    )

    # Validation
    def validate_action(self):
        if self.action in {
            ReviewAction.EDIT_AND_REFINE,
            ReviewAction.EDIT_AND_PUBLISH,
        } and not self.edited_content:
            raise ValueError(
                "edited_content is required for edit actions"
            )

        if self.action in {
            ReviewAction.ACCEPT,
            ReviewAction.REJECT,
        } and self.edited_content is not None:
            raise ValueError(
                "edited_content must not be provided for accept/reject"
            )
