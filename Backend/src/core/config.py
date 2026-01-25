from functools import lru_cache
from typing import Optional, Literal
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):
    """
    Central configuration for the AI Content Generation & Publishing Platform.

    Responsibilities:
    - Environment configuration
    - Infrastructure toggles
    - LangGraph safety limits
    - Publishing & scheduling controls

    Non-responsibilities:
    - Business logic
    - Workflow state
    - Runtime process management
    """

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Application settings
    app_name: str = Field(default="Morph Post", description="Application name")
    app_version: str = Field(default="1.0.0", description="Application version")
    app_description: str = Field(default="LangGraph-powered AI content creation and publishing platform", description="Application description")
    debug: bool = Field(default=False, description="Debug mode")
    environment: str = Field(default="development", description="Environment")
    
    # API settings
    api_prefix: str = Field(default="/api/v1", description="API URL prefix")

    # Server settings
    host: str = Field(default="127.0.0.1", description="Server host")
    port: int = Field(default=8000, description="Server port")
    
    # Database settings
    database_url: str = Field(
        description="Async PostgreSQL database URL"
    )
    database_echo: bool = Field(default=False, description="Echo SQL queries")

    #Authentication
    jwt_secret_key: str = Field(
        description="JWT signing key"
    )
    jwt_algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=60 * 24)
    
    # Redis settings (for Dramatiq)
    redis_host: str = Field(default="localhost", description="Redis host")
    redis_port: int = Field(default=6379, description="Redis port")
    redis_db: int = Field(default=0, description="Redis database number")
    redis_password: Optional[str] = Field(default=None, description="Redis password")
    
    frontend_url: str = Field(default="http://localhost:8080/style-setup", description="Frontend URL for redirecting after Twitter callback")
    
    # CORS settings
    cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://localhost:8080"],
        description="CORS allowed origins"
    )
    cors_methods: list[str] = Field(
        default=["*"], description="CORS allowed methods"
    )
    cors_headers: list[str] = Field(
        default=["*"], description="CORS allowed headers"
    )

    # LangGraph Controls (Critical Safety)
    langgraph_max_iterations: int = Field(
        default=3,
        description="Max regeneration attempts per platform"
    )
    evaluation_score_threshold: int = Field(
        default=70,
        description="Minimum evaluation score to accept AI draft"
    )
    style_drift_tolerance: float = Field(
        default=0.15,
        description="Allowed deviation from learned user style"
    )

    # Publishing & Scheduling
    default_timezone: str = Field(default="UTC")

    enable_immediate_publish: bool = Field(default=True)
    enable_scheduled_publish: bool = Field(default=True)

    # Object Storage (Resources Only)
    storage_backend: Literal["local", "s3"] = Field(default="local")

    storage_bucket: Optional[str] = None
    storage_base_path: str = Field(default="./storage")
    
    # OpenAI / LLM settings
    openai_api_key: str = Field(description="OpenAI API key")
    llm_model: str = Field(default="gpt-4-turbo-preview", description="LLM model to use")
    llm_temperature: float = Field(default=0.7, description="LLM temperature")
    llm_max_tokens: int = Field(default=2000, description="Max tokens for generation")
    
    # Tavily Search API
    tavily_api_key: str = Field(description="Tavily API key for web search")
    
    # Platform Publishing APIs
    linkedin_client_id: str = Field(default="", description="LinkedIn OAuth client ID")
    linkedin_client_secret: str = Field(default="", description="LinkedIn OAuth client secret")
    x_api_key: str = Field(default="", description="X API key")
    x_api_secret: str = Field(default="", description="X API secret")
    x_access_token: str = Field(default="", description="X access token")
    x_access_token_secret: str = Field(default="", description="X access token secret")
    x_client_id: str = Field(default="", description="X client ID")
    x_client_secret: str = Field(default="", description="X client secret")
    
    # Rate limiting
    # rate_limit_requests: int = Field(default=100, description="Requests per minute")
    # rate_limit_window: int = Field(default=60, description="Rate limit window in seconds")
    
    # Logging
    log_level: str = Field(default="INFO", description="Logging level")
    log_format: str = Field(
        default="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>",
        description="Log format"
    )

    @property
    def redis_url(self) -> str:
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"


@lru_cache()
def get_settings() -> Settings:
    return Settings()