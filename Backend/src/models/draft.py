from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import (
    DateTime,
    String,
    Boolean,
    ForeignKey,
    Index,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class DraftSource(str, Enum):
    """
    Origin of the draft.
    """
    AI = "ai"
    HUMAN = "human"


class Draft(Base):
    """
    Immutable snapshot of content for a specific platform.

    Core invariants:
    - Drafts are NEVER updated
    - Human drafts override AI drafts
    - New edits always create a new draft
    """

    __tablename__ = "drafts"

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

    # Platform
    platform: Mapped[str] = mapped_column(
        String(length=32),
        nullable=False,
        index=True,
        doc="Target platform (linkedin, x, blog)",
    )

    # Content
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="The actual draft content",
    )

    source: Mapped[str] = mapped_column(
        String(length=16),
        nullable=False,
        default=DraftSource.AI,
        doc="Origin: ai or human",
    )

    # Media
    media_urls: Mapped[list[str] | None] = mapped_column(
        ARRAY(String),
        nullable=True,
        doc="List of media URLs attached to this draft",
    )

    media_type: Mapped[str | None] = mapped_column(
        String(length=16),
        nullable=True,
        doc="Type of media: image, video, etc.",
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
        back_populates="drafts",
        lazy="selectin",
    )

    # Indexes
    __table_args__ = (
        Index("ix_draft_workflow_platform", "workflow_id", "platform"),
    )

    # Representation
    def __repr__(self) -> str:
        return (
            f"<Draft id={self.id} "
            f"platform={self.platform} "
            f"source={self.source}>"
        )
