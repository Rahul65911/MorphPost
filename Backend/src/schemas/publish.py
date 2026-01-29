from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class PublishRequest(BaseModel):
    """
    Request to publish or schedule an accepted draft
    for a specific platform.
    """

    workflow_id: UUID = Field(..., description="Workflow identifier")
    platform: str = Field(..., description="Target platform")

    # Scheduling
    publish_at: Optional[datetime] = Field(
        default=None,
        description="Datetime at which to publish (None = publish immediately)",
    )

    timezone: Optional[str] = Field(
        default="Asia/Kolkata",
        description="Timezone for scheduled publishing",
    )

    # Validation
    @model_validator(mode="before")
    @classmethod
    def validate_schedule(cls, values):
        publish_at = values.get("publish_at")
        timezone = values.get("timezone")

        if publish_at and not timezone:
            raise ValueError(
                "timezone is required when publish_at is provided"
            )

        # if not publish_at and timezone:
        #     # It's better to be lenient and just ignore timezone if provided for immediate publishing
        #     pass

        return values


class PublishUpdateRequest(BaseModel):
    """
    Request to update a publishing job (cancel or reschedule).
    """
    status: Optional[str] = Field(None, description="New status (only 'cancelled' allowed for updates)")
    publish_at: Optional[datetime] = Field(None, description="New publish time")
    
    @model_validator(mode="before")
    @classmethod
    def validate_update(cls, values):
        status = values.get("status")
        publish_at = values.get("publish_at")
        
        if not status and not publish_at:
            raise ValueError("Either status or publish_at must be provided")
            
        if status and status.lower() != "cancelled":
             raise ValueError("Only 'cancelled' status is allowed for updates")
             
        return values
