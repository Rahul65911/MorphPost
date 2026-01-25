from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import (
    DateTime,
    String,
    Enum,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class WorkflowStatus(str, Enum):
    """
    High-level lifecycle status of a workflow.
    """

    CREATED = "created"
    IN_PROGRESS = "in_progress"
    AWAITING_REVIEW = "awaiting_review"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Workflow(Base):
    """
    Root aggregate for a content creation workflow.

    One workflow represents:
    - One user intent
    - One creation session
    - Multiple platform-specific states
    - Multiple drafts with lineage
    """

    __tablename__ = "workflows"

    # Identity
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    # COMMENT: Okay so this is not a foreign key on db level as of now, this kind of columns harm the integratiy of data. Like currently if you check db we have workflows but we don't have any users, it should not be possible since all the workflows are associated with users and if there are no users then there should not be any workflows either, but we have. Always add the FK definition on DB level so DB it self will manage & make sure the data is alwasy valid. Unless we have a special requiremetn and that's pretty rare.
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=False,
        index=True,
        doc="Owner of this workflow",
    )

    # Status
    status: Mapped[str] = mapped_column(
        String(length=32),
        default=WorkflowStatus.CREATED,
        nullable=False,
        index=True,
    )

    # Metadata
    title: Mapped[str | None] = mapped_column(
        String(length=255),
        nullable=True,
        doc="Optional human-readable title",
    )

    description: Mapped[str | None] = mapped_column(
        String(length=1024),
        nullable=True,
        doc="Optional description or intent",
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Set when all platforms are accepted or cancelled",
    )

    # Relationships
    platform_states = relationship(
        "PlatformState",
        back_populates="workflow",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    drafts = relationship(
        "Draft",
        back_populates="workflow",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    publishing_jobs = relationship(
        "PublishingJob",
        back_populates="workflow",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    resources = relationship(
        "Resource",
        back_populates="workflow",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # Indexes
    __table_args__ = (
        Index("ix_workflow_user_created", "user_id", "created_at"),
    )

    # Representation
    def __repr__(self) -> str:
        return (
            f"<Workflow id={self.id} "
            f"user_id={self.user_id} "
            f"status={self.status}>"
        )
