import logging
import sys
from pathlib import Path

from loguru import logger

from src.core.config import get_settings


class InterceptHandler(logging.Handler):
    """
    Redirect standard logging (logging module) to Loguru.

    This ensures:
    - Uvicorn logs
    - FastAPI logs
    - SQLAlchemy logs
    all follow the same structured format.
    """

    def emit(self, record: logging.LogRecord) -> None:
        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = logging.currentframe(), 2
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())


def setup_logging() -> None:
    """
    Configure application-wide logging.

    Call this ONCE at application startup.
    """
    
    settings = get_settings()
    
    # Remove default logger
    logger.remove()
    
    # Add console logger
    logger.add(
        sys.stdout,
        format=settings.log_format,
        level=settings.log_level,
        colorize=True,
        backtrace=True,
        diagnose=True,
    )

    # Intercept standard logging and redirect to loguru
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
    
    # Intercept uvicorn and fastapi loggers
    for logger_name in ["uvicorn", "uvicorn.access", "uvicorn.error", "sqlalchemy.engine", "fastapi"]:
        logging_logger = logging.getLogger(logger_name)
        logging_logger.handlers = [InterceptHandler()]
        logging_logger.propagate = False

    # Add file logger for production
    if settings.environment == "production":
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        logger.add(
            log_dir / "MorphPost.log",
            format=settings.log_format,
            level=settings.log_level,
            rotation="10 MB",
            retention="30 days",
            compression="gz",
            backtrace=True,
            diagnose=False,  # Don't include sensitive info in production logs
        )
        
        # Separate error log
        logger.add(
            log_dir / "errors.log",
            format=settings.log_format,
            level="ERROR",
            rotation="5 MB",
            retention="90 days",
            compression="gz",
            backtrace=True,
            diagnose=False,
        )
     
    logger.info(
        "Logging initialized | env={} | level={}",
        settings.environment,
        settings.log_level
    )


def get_logger(name: str = None):
    if name:
        return logger.bind(name=name)
    return logger