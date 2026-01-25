from datetime import datetime, timezone
from enum import Enum
from uuid import UUID
import uuid

from sqlalchemy import (
    DateTime,
    String,
    Boolean,
    ForeignKey,
    Index,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class Platform(str, Enum):
    """
    Supported publishing platforms.
    """
    LINKEDIN = "linkedin"
    X = "x"


class PlatformStatus(str, Enum):
    """
    Lifecycle status of a platform within a workflow.
    """

    PENDING = "pending"                 # Drafts being generated
    AWAITING_REVIEW = "awaiting_review" # Waiting for human action
    ACCEPTED = "accepted"               # Human accepted final draft
    REJECTED = "rejected"               # Human rejected platform entirely
    SCHEDULED = "scheduled"             # Accepted and scheduled
    PUBLISHED = "published"             # Successfully published
    FAILED = "failed"                   # Publishing failed


class PlatformState(Base):
    """
    Per-platform state inside a workflow.

    This model is the authority for:
    - HITL decisions
    - Active draft pointer
    - Publishing readiness
    """

    __tablename__ = "platform_states"

    # Identity
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    workflow_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    platform: Mapped[str] = mapped_column(
        String(length=32),
        nullable=False,
    )

    # State
    status: Mapped[str] = mapped_column(
        String(length=32),
        default=PlatformStatus.PENDING,
        nullable=False,
        index=True,
    )

    # Pointer to the currently active draft (per platform)
    active_draft_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("drafts.id", ondelete="SET NULL"),
        nullable=True,
    )

    # HITL Flags
    human_override: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="True if human directly published without AI rewrite",
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    workflow = relationship(
        "Workflow",
        back_populates="platform_states",
        lazy="selectin",
    )

    active_draft = relationship(
        "Draft",
        foreign_keys=[active_draft_id],
        lazy="selectin",
    )

    # Constraints & Indexes
    __table_args__ = (
        # One platform only once per workflow
        UniqueConstraint(
            "workflow_id",
            "platform",
            name="uq_workflow_platform",
        ),
        Index(
            "ix_platform_workflow_status",
            "workflow_id",
            "status",
        ),
    )

    # Representation
    def __repr__(self) -> str:
        return (
            f"<PlatformState "
            f"workflow_id={self.workflow_id} "
            f"platform={self.platform} "
            f"status={self.status}>"
        )
