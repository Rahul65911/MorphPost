from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel

from src.core.config import get_settings

settings = get_settings()

# OAuth2 Scheme
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

bearer_scheme = HTTPBearer(auto_error=True)


# Token Payload
class TokenPayload(BaseModel):
    sub: UUID
    exp: int


# User Context (lightweight)
class CurrentUser(BaseModel):
    id: UUID


# Token Utilities
def create_access_token(
    subject: UUID,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT access token.
    """

    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.access_token_expire_minutes)
    )

    payload = {
        "sub": str(subject),
        "exp": expire,
    }

    encoded_jwt = jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    return encoded_jwt


# Dependency: Get Current User
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> CurrentUser:
    """
    Resolve and validate the current authenticated user.

    Used as a dependency in all protected routes.
    """

    token = credentials.credentials
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )

        token_data = TokenPayload(
            sub=UUID(payload.get("sub")),
            exp=payload.get("exp"),
        )

    except (JWTError, KeyError, ValueError):
        raise credentials_exception

    return CurrentUser(id=token_data.sub)
