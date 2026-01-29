from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import (
    DateTime,
    String,
    Text,
    ForeignKey,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class PostTemplate(Base):
    """
    Reusable template for content creation.
    """
    __tablename__ = "post_templates"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(length=100),
        nullable=False,
        doc="Human readable name for the template",
    )

    # Template Content
    goal: Mapped[str] = mapped_column(String(length=255), nullable=False)
    audience: Mapped[str] = mapped_column(String(length=255), nullable=False)
    key_message: Mapped[str] = mapped_column(Text, nullable=False)
    tone: Mapped[str | None] = mapped_column(String(length=100), nullable=True)
    keywords: Mapped[list[str]] = mapped_column(ARRAY(String), default=[], nullable=False)
    constraints: Mapped[str | None] = mapped_column(Text, nullable=True)
    call_to_action: Mapped[str | None] = mapped_column(String(length=255), nullable=True)

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

    def __repr__(self) -> str:
        return f"<PostTemplate id={self.id} name={self.name} user_id={self.user_id}>"
