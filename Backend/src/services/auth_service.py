from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from uuid import uuid4
import httpx
import secrets
import re

from src.core.security import create_access_token
from src.models.user import User
from src.schemas.auth import LoginRequest, SignupRequest, TokenResponse

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


class AuthService:
    """
    Authentication business logic.
    """

    @staticmethod
    async def signup(
        db: AsyncSession,
        payload: SignupRequest,
    ) -> TokenResponse:
        # Check existing user
        # COMMENT: Having a repository for each of the defined model is always good and scalable approach.
        # Also I don't think we need an username at all unless there is a requirement I am not aware of, why increase complexity, just lets use the email itself as unique identifier, its more natural for users as well.
        stmt = select(User).where(User.username == payload.username)
        if (await db.execute(stmt)).scalar_one_or_none():
            raise ValueError("Username already registered")
        
        stmt = select(User).where(User.email == payload.email)
        if (await db.execute(stmt)).scalar_one_or_none():
            raise ValueError("Email already registered")

        user = User(
            id=uuid4(),
            username=payload.username,
            email=payload.email,
            hashed_password=pwd_context.hash(payload.password),
        )

        db.add(user)
        await db.commit()

        # COMMENT: We can create a refresh token as well, its just a good and standard approach to make sure an active user won't have to login again & again.
        token = create_access_token(user.id)

        return TokenResponse(access_token=token)

    @staticmethod
    async def login(
        db: AsyncSession,
        payload: LoginRequest,
    ) -> TokenResponse:
        stmt = select(User).where(User.email == payload.email)
        user = (await db.execute(stmt)).scalar_one_or_none()
        

        if not user or not pwd_context.verify(
            payload.password,
            user.hashed_password,
        ):
            raise ValueError("Invalid credentials")

        token = create_access_token(user.id)

        return TokenResponse(access_token=token)

    @staticmethod
    async def google_login(
        db: AsyncSession,
        token: str,
    ) -> TokenResponse:
        # Verify token with Google and get user info
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token}"}
            )
            if resp.status_code != 200:
                raise ValueError("Invalid Google token")
                
            payload = resp.json()
            
        email = payload.get("email")
        if not email:
            raise ValueError("Email not found in Google token")
            
        # Check if user exists
        stmt = select(User).where(User.email == email)
        user = (await db.execute(stmt)).scalar_one_or_none()
        
        if not user:
            # Create new user
            # Generate username from email
            base_username = email.split("@")[0].replace(".", "_")
            base_username = re.sub(r'[^a-zA-Z0-9_]', '', base_username)
            if not base_username:
                base_username = "user"
                
            # Ensure uniqueness by appending random hex
            username = f"{base_username}_{secrets.token_hex(3)}"
            # Truncate to 16 chars if needed (max length in User model)
            if len(username) > 16:
                 username = username[:12] + secrets.token_hex(2)
            
            # Generate random secure password
            password = secrets.token_urlsafe(32)
            
            user = User(
                id=uuid4(),
                username=username,
                email=email,
                hashed_password=pwd_context.hash(password),
            )
            
            db.add(user)
            await db.commit()
            
        token = create_access_token(user.id)
        return TokenResponse(access_token=token)

    @staticmethod
    async def get_user_by_id(
        db: AsyncSession,
        user_id: uuid4,
    ) -> User | None:
        stmt = select(User).where(User.id == user_id)
        return (await db.execute(stmt)).scalar_one_or_none()
