from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.core.config import get_settings
from src.core.logging import get_logger

settings = get_settings()
log = get_logger(__name__)

# Async Engine
engine: AsyncEngine = create_async_engine(
    settings.database_url,
    echo=settings.database_echo,
    future=True,
    pool_pre_ping=True,
)

# Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

# Dependency (FastAPI)
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a transactional async DB session.

    Usage:
        async def route(db: AsyncSession = Depends(get_db_session)):
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            log.exception("Database session rollback due to exception")
            await session.rollback()
            raise
        finally:
            await session.close()


# Utilities (Non-HTTP contexts: workers, scripts)
def get_session() -> AsyncSession:
    """
    Create an async session outside FastAPI dependency injection.

    Usage:
        async with get_session() as session:
            ...
    """
    return AsyncSessionLocal()
