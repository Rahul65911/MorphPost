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
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class PublishingStatus(str, Enum):
    """
    Lifecycle of a publishing job.
    """

    PENDING = "pending"       # Created, waiting for execution time
    RUNNING = "running"       # Worker picked it up
    SUCCESS = "success"       # Published successfully
    FAILED = "failed"         # Permanent failure
    CANCELLED = "cancelled"   # User cancelled before execution


class PublishingJob(Base):
    """
    Represents an intent to publish a specific draft to a platform.

    Key properties:
    - Created only AFTER human acceptance
    - One job per (workflow, platform, draft)
    - Execution is handled by workers
    - LangGraph is NOT involved here
    """

    __tablename__ = "publishing_jobs"

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

    platform: Mapped[str] = mapped_column(
        String(length=32),
        nullable=False,
        index=True,
    )

    draft_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("drafts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Accepted draft to be published",
    )

    # Scheduling
    publish_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        doc="Execution time (immediate = now)",
    )

    timezone: Mapped[str] = mapped_column(
        String(length=64),
        nullable=False,
        doc="Timezone used when scheduling",
    )

    # Execution State
    status: Mapped[str] = mapped_column(
        String(length=32),
        default=PublishingStatus.PENDING,
        nullable=False,
        index=True,
    )

    attempts: Mapped[int] = mapped_column(
        default=0,
        nullable=False,
        doc="Execution attempts by workers",
    )

    last_error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Last error message if publishing failed",
    )

    # Control Flags
    immediate: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="True if published immediately after acceptance",
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

    executed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Set when publishing attempt completes",
    )

    # Relationships
    workflow = relationship(
        "Workflow",
        back_populates="publishing_jobs",
        lazy="selectin",
    )

    draft = relationship(
        "Draft",
        lazy="selectin",
    )

    # Indexes & Constraints
    __table_args__ = (
        # Prevent duplicate jobs for same draft & platform
        Index(
            "ix_publish_unique_job",
            "workflow_id",
            "platform",
            "draft_id",
            unique=True,
        ),
        Index(
            "ix_publish_status_time",
            "status",
            "publish_at",
        ),
    )

    # Representation
    def __repr__(self) -> str:
        return (
            f"<PublishingJob id={self.id} "
            f"platform={self.platform} "
            f"status={self.status} "
            f"publish_at={self.publish_at}>"
        )
