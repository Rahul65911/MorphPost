from fastapi import APIRouter

from src.api.v1.create import router as create_router
from src.api.v1.review import router as review_router
from src.api.v1.publish import router as publish_router
from src.api.v1.workflow import router as workflow_router
from src.api.v1.auth import router as auth_router
from src.api.v1.onboarding import router as onboarding_router
from src.api.v1.templates import router as templates_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(create_router)
api_router.include_router(review_router)
api_router.include_router(publish_router)
api_router.include_router(workflow_router)
api_router.include_router(onboarding_router)
api_router.include_router(templates_router)
