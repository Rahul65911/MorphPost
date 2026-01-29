from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from uuid import UUID

from src.db.session import get_db_session
from src.core.security import get_current_user
from src.models.template import PostTemplate
from src.schemas.template import TemplateCreate, TemplateResponse
from src.core.logging import get_logger

router = APIRouter(prefix="/templates", tags=["Templates"])
log = get_logger(__name__)

@router.get("/", response_model=list[TemplateResponse])
async def get_templates(
    db: AsyncSession = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    """List all templates for the current user."""
    try:
        stmt = select(PostTemplate).where(PostTemplate.user_id == current_user.id).order_by(PostTemplate.created_at.desc())
        result = await db.execute(stmt)
        return result.scalars().all()
    except Exception as e:
        log.error("Error fetching templates: {}", str(e))
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: TemplateCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    """Create a new template."""
    try:
        template = PostTemplate(
            user_id=current_user.id,
            **payload.model_dump()
        )
        db.add(template)
        await db.commit()
        await db.refresh(template)
        return template
    except Exception as e:
        log.error("Error creating template: {}", str(e))
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    """Delete a template."""
    try:
        stmt = delete(PostTemplate).where(
            PostTemplate.id == template_id,
            PostTemplate.user_id == current_user.id
        )
        result = await db.execute(stmt)
        await db.commit()
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Template not found")
            
    except HTTPException:
        raise
    except Exception as e:
        log.error("Error deleting template: {}", str(e))
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal Server Error")
