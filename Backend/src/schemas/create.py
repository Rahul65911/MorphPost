from enum import Enum
from typing import Optional, List, Literal

from pydantic import BaseModel, Field, model_validator


# Enums
class PlatformName(str, Enum):
    LINKEDIN = "linkedin"
    X = "x"

class ResourceType(str, Enum):
    DOCUMENT = "document"
    URL = "url"
    IMAGE = "image"
    VIDEO = "video"


# Resource Input
class ResourceInput(BaseModel):
    type: ResourceType
    source: str = Field(..., description="URL or uploaded file reference")
    name: Optional[str] = None
    mime_type: Optional[str] = None


# Manual / Idea Mode
class ManualOptions(BaseModel):
    keep_wording: bool = False
    improve_clarity: bool = True
    rewrite_to_match_style: bool = True
    adapt_for_platforms: bool = True


# Structured Template Mode
class TemplateInput(BaseModel):
    goal: str
    audience: str
    key_message: str
    tone: Optional[str] = None
    call_to_action: Optional[str] = None
    keywords: List[str] = []
    constraints: Optional[str] = None


# Create Workflow Request
# COMMENT: Not able to understand by manual & template here.
class CreatePostRequest(BaseModel):
    """
    Entry point schema for starting a workflow.
    """

    mode: Literal["manual", "template"]

    # Manual / idea content
    content: Optional[str] = Field(
        default=None,
        description="Handwritten post, rough draft, or idea",
    )

    options: Optional[ManualOptions] = None

    # Template-based input
    template: Optional[TemplateInput] = None

    # Shared
    platforms: List[PlatformName]
    resources: List[ResourceInput] = []

    # Validation
    @model_validator(mode="before")
    @classmethod
    def validate_mode_inputs(cls, values):
        mode = values.get("mode")
        content = values.get("content")
        template = values.get("template")

        if mode == "manual":
            if not content:
                raise ValueError("content is required when mode='manual'")
            if template is not None:
                raise ValueError("template must not be provided when mode='manual'")

        if mode == "template":
            if not template:
                raise ValueError("template is required when mode='template'")
            if content is not None:
                raise ValueError("content must not be provided when mode='template'")

        return values
