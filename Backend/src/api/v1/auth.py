from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import get_current_user, CurrentUser
from src.db.session import get_db_session
from src.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserResponse, GoogleLoginRequest
from src.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/signup",
    status_code=status.HTTP_201_CREATED,
    response_model=TokenResponse,
)
async def signup(
    payload: SignupRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Create a new user and return an access token.
    """

    try:
        token = await AuthService.signup(db, payload)
        return token
    # COMMENT: As far as I remember just defining the response & request for the api itself allows fastapi to validate them, we don't need to explictily validate it unless required.
    except ValueError as exc:
        # schema-level or business validation errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except Exception:
        # last-resort safety net
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create user",
        )


@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    response_model=TokenResponse,
)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Authenticate user and return an access token.
    """

    return await AuthService.login(db, payload)


@router.post(
    "/google",
    status_code=status.HTTP_200_OK,
    response_model=TokenResponse,
)
async def google_login(
    payload: GoogleLoginRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Authenticate user via Google OAuth.
    """
    try:
        return await AuthService.google_login(db, payload.token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to authenticate with Google",
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Get current user profile.
    """
    user_data = await AuthService.get_user_by_id(db, user.id)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user_data
