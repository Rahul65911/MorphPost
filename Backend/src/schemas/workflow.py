from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


# Draft View
class DraftView(BaseModel):
    id: UUID
    platform: str
    content: str
    source: str
    created_at: datetime


# Evaluation View
class EvaluationView(BaseModel):
    id: UUID
    draft_id: UUID
    score: int
    passed: bool
    feedback: Optional[str]
    iteration: int
    created_at: datetime


# Platform State View
class PlatformStateView(BaseModel):
    platform: str
    status: str
    active_draft: Optional[DraftView] = None
    evaluations: List[EvaluationView] = []


# Resource View
class ResourceView(BaseModel):
    id: UUID
    type: str
    name: Optional[str]
    source: str
    created_at: datetime


# Workflow View (Main Read Model)
class WorkflowView(BaseModel):
    """
    Read-only representation of a workflow.

    Used for:
    - Review workspace
    - Polling workflow state
    - History listing
    """

    id: UUID
    user_id: UUID
    status: str

    title: Optional[str]
    description: Optional[str]

    platforms: List[PlatformStateView]
    resources: List[ResourceView]

    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

    # Validation
    @model_validator(mode="after")
    def validate_platforms(self):
        """
        Ensure platform list is not empty.
        """
        if not self.platforms:
            raise ValueError("workflow must contain at least one platform")
        return self
