"""
Draft service for centralized draft management.

Handles all draft-related operations including creation, retrieval, and persistence.
"""

from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models.draft import Draft, DraftSource
from src.models.platform_state import PlatformState
from src.core.logging import get_logger

log = get_logger(__name__)


class DraftService:
    """
    Service for managing drafts.
    
    Centralizes all draft-related logic that was previously scattered
    across persistence utilities and nodes.
    """
    
    @staticmethod
    async def create_draft(
        db: AsyncSession,
        workflow_id: UUID,
        platform: str,
        content: str,
        source: DraftSource = DraftSource.AI,
        media_urls: list[str] | None = None,
        media_type: str | None = None,
    ) -> Draft:
        """
        Create and persist a new draft.
        
        Args:
            db: Database session
            workflow_id: Parent workflow ID
            platform: Target platform
            content: Draft content
            source: Draft source (AI or HUMAN)
            media_urls: List of media URLs
            media_type: Type of media
            
        Returns:
            Created Draft instance
        """
        log.info(
            "Creating draft | workflow_id={} | platform={} | source={} | length={}",
            workflow_id,
            platform,
            source,
            len(content),
        )
        
        # Create draft
        draft = Draft(
            workflow_id=workflow_id,
            platform=platform,
            content=content,
            source=source,
            media_urls=media_urls,
            media_type=media_type,
        )
        
        db.add(draft)
        await db.commit()
        await db.refresh(draft)
        
        log.info("Draft created | draft_id={}", draft.id)
        
        return draft
    
    @staticmethod
    async def set_active_draft(
        db: AsyncSession,
        workflow_id: UUID,
        platform: str,
        draft_id: UUID,
    ) -> None:
        """
        Set a draft as the active draft for a platform.
        
        Updates the platform_state to point to this draft.
        
        Args:
            db: Database session
            workflow_id: Parent workflow ID
            platform: Target platform
            draft_id: Draft to set as active
        """
        log.info(
            "Setting active draft | workflow_id={} | platform={} | draft_id={}",
            workflow_id,
            platform,
            draft_id,
        )
        
        # Find platform state
        stmt = (
            select(PlatformState)
            .where(PlatformState.workflow_id == workflow_id)
            .where(PlatformState.platform == platform)
        )
        
        result = await db.execute(stmt)
        platform_state = result.scalar_one_or_none()
        
        if not platform_state:
            raise ValueError(f"Platform state not found: {platform}")
        
        # Update active draft
        platform_state.active_draft_id = draft_id
        
        await db.commit()
        
        log.info("Active draft updated | platform={} | draft_id={}", platform, draft_id)
    
    @staticmethod
    async def get_active_draft(
        db: AsyncSession,
        workflow_id: UUID,
        platform: str,
    ) -> Draft | None:
        """
        Get the current active draft for a platform.
        
        Args:
            db: Database session
            workflow_id: Parent workflow ID
            platform: Target platform
            
        Returns:
            Active Draft or None if no active draft
        """
        # Find platform state
        stmt = (
            select(PlatformState)
            .where(PlatformState.workflow_id == workflow_id)
            .where(PlatformState.platform == platform)
        )
        
        result = await db.execute(stmt)
        platform_state = result.scalar_one_or_none()
        
        if not platform_state or not platform_state.active_draft_id:
            return None
        
        # Get draft
        draft_stmt = select(Draft).where(Draft.id == platform_state.active_draft_id)
        draft_result = await db.execute(draft_stmt)
        
        return draft_result.scalar_one_or_none()
    
    @staticmethod
    async def create_and_set_active(
        db: AsyncSession,
        workflow_id: UUID,
        platform: str,
        content: str,
        source: DraftSource = DraftSource.AI,
        media_urls: list[str] | None = None,
        media_type: str | None = None,
    ) -> Draft:
        """
        Create a draft and immediately set it as active.
        
        Convenience method that combines create_draft and set_active_draft.
        
        Args:
            db: Database session
            workflow_id: Parent workflow ID
            platform: Target platform
            content: Draft content
            source: Draft source (AI or HUMAN)
            media_urls: List of media URLs
            media_type: Type of media
            
        Returns:
            Created Draft instance
        """
        # Create draft
        draft = await DraftService.create_draft(
            db=db,
            workflow_id=workflow_id,
            platform=platform,
            content=content,
            source=source,
            media_urls=media_urls,
            media_type=media_type,
        )
        
        # Set as active
        await DraftService.set_active_draft(
            db=db,
            workflow_id=workflow_id,
            platform=platform,
            draft_id=draft.id,
        )
        
        return draft
    
    @staticmethod
    async def update_platform_status(
        db: AsyncSession,
        workflow_id: UUID,
        platform: str,
        status: str,
    ) -> None:
        """
        Update the status of a platform state.
        
        Args:
            db: Database session
            workflow_id: Parent workflow ID
            platform: Target platform
            status: New status (e.g., PlatformStatus.AWAITING_REVIEW)
        """
        log.info(
            "Updating platform status | workflow_id={} | platform={} | status={}",
            workflow_id,
            platform,
            status,
        )
        
        # Find platform state
        stmt = (
            select(PlatformState)
            .where(PlatformState.workflow_id == workflow_id)
            .where(PlatformState.platform == platform)
        )
        
        result = await db.execute(stmt)
        platform_state = result.scalar_one_or_none()
        
        if not platform_state:
            raise ValueError(f"Platform state not found: {platform}")
        
        # Update status
        platform_state.status = status
        
        await db.commit()
        
        log.info("Platform status updated | workflow_id={} | platform={} | status={}", workflow_id, platform, status)
