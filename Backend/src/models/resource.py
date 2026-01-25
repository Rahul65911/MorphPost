from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import (
    DateTime,
    String,
    Text,
    ForeignKey,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class ResourceType(str, Enum):
    """
    Supported resource types.

    Resources are used as CONTEXT only.
    They never participate in style learning.
    """

    DOCUMENT = "document"   # PDF, DOCX, TXT, MD
    URL = "url"             # Website or article
    IMAGE = "image"         # PNG, JPG, etc.
    VIDEO = "video"         # MP4, YouTube, Vimeo


class Resource(Base):
    """
    Contextual resource attached to a workflow.

    Purpose:
    - Provide factual grounding
    - Improve content accuracy
    - Support multi-modal context

    Resources are immutable once created.
    """

    __tablename__ = "resources"

    # Identity
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    workflow_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Resource Metadata
    type: Mapped[str] = mapped_column(
        String(length=32),
        nullable=False,
        doc="document | url | image | video",
    )

    name: Mapped[str | None] = mapped_column(
        String(length=255),
        nullable=True,
        doc="Original filename or display name",
    )

    source: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="URL or object storage path",
    )

    mime_type: Mapped[str | None] = mapped_column(
        String(length=128),
        nullable=True,
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    workflow = relationship(
        "Workflow",
        back_populates="resources",
        lazy="selectin",
    )

    # Indexes
    __table_args__ = (
        Index(
            "ix_resource_workflow_type",
            "workflow_id",
            "type",
        ),
    )

    # Representation
    def __repr__(self) -> str:
        return (
            f"<Resource id={self.id} "
            f"type={self.type} "
            f"workflow_id={self.workflow_id}>"
        )
