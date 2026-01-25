from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import get_settings
from src.core.logging import setup_logging
from src.db.session import engine
from src.api.v1 import api_router

settings = get_settings()
setup_logging()


import asyncio
from src.workers.scheduler import run_scheduler

# Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize LangGraph with checkpointer
    from src.langgraph import graph as graph_module
    from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
    
    # Convert SQLAlchemy URL format to psycopg format
    # postgresql+asyncpg://... -> postgresql://...
    checkpoint_db_url = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
    
    # Start scheduler in background
    scheduler_task = asyncio.create_task(run_scheduler())
    
    # Create and setup checkpointer using async context manager
    async with AsyncPostgresSaver.from_conn_string(checkpoint_db_url) as checkpointer:
        # Setup creates the necessary tables
        await checkpointer.setup()
        
        # Rebuild graph with checkpointer
        graph_module.workflow_graph = graph_module.build_workflow_graph(checkpointer)
        
        yield
    
    # Shutdown: cancel scheduler and close engine
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass
        
    await engine.dispose()

docs_url = "/docs" if settings.environment == "development" else None
redoc_url = "/redoc" if settings.environment == "development" else None

# App
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=settings.app_description,
    debug=settings.debug,
    lifespan=lifespan,
    docs_url=docs_url,
    redoc_url=redoc_url
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=settings.cors_methods,
    allow_headers=settings.cors_headers,
)


# Routes
app.include_router(api_router, prefix=settings.api_prefix)
