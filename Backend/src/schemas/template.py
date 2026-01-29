from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

class TemplateBase(BaseModel):
    name: str = Field(..., max_length=100)
    goal: str = Field(..., max_length=255)
    audience: str = Field(..., max_length=255)
    key_message: str
    tone: str | None = Field(None, max_length=100)
    keywords: list[str] = []
    constraints: str | None = None
    call_to_action: str | None = Field(None, max_length=255)

class TemplateCreate(TemplateBase):
    pass

class TemplateResponse(TemplateBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
