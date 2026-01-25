import re
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator


class SignupRequest(BaseModel):
    username: str = Field(
        ...,
        min_length=3,
        max_length=16,
        description="Username must be 3-16 characters, alphanumeric and underscores only"
    )
    email: EmailStr = Field(
        ...,
        description="Valid email address"
    )
    password: str = Field(
        ...,
        min_length=8,
        description="Password must be at least 8 characters with uppercase, lowercase, digit, and special character"
    )

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        """
        Validate username:
        - Only alphanumeric characters and underscores
        - No leading or trailing whitespace
        - No consecutive underscores
        """
        v = v.strip()
        
        if not v:
            raise ValueError("Username cannot be empty or whitespace")
        
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError("Username can only contain letters, numbers, and underscores")
        
        if '__' in v:
            raise ValueError("Username cannot contain consecutive underscores")
        
        if v.startswith('_') or v.endswith('_'):
            raise ValueError("Username cannot start or end with an underscore")
        
        return v.lower()  # Normalize to lowercase

    @field_validator('email')
    @classmethod
    def normalize_email(cls, v: EmailStr) -> EmailStr:
        """Normalize email to lowercase"""
        return str(v).lower().strip()

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """
        Validate password strength:
        - At least 8 characters
        - Contains uppercase letter
        - Contains lowercase letter
        - Contains digit
        - Contains special character
        """
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        if not re.search(r'[A-Z]', v):
            raise ValueError("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', v):
            raise ValueError("Password must contain at least one lowercase letter")
        
        if not re.search(r'\d', v):
            raise ValueError("Password must contain at least one digit")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError("Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)")
        
        # Check for common weak passwords
        weak_passwords = ['password', '12345678', 'qwerty123', 'admin123']
        if v.lower() in weak_passwords:
            raise ValueError("Password is too common. Please choose a stronger password")
        
        return v


class LoginRequest(BaseModel):
    email: EmailStr = Field(
        ...,
        description="Valid email address"
    )
    password: str = Field(
        ...,
        min_length=1,
        description="User password"
    )

    @field_validator('email')
    @classmethod
    def normalize_email(cls, v: EmailStr) -> EmailStr:
        """Normalize email to lowercase"""
        return str(v).lower().strip()


class GoogleLoginRequest(BaseModel):
    token: str = Field(
        ...,
        description="Google OAuth2 Access Token or ID Token"
    )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    is_onboarded: bool = False

    class Config:
        from_attributes = True
