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
