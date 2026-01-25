from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy models.

    Imported by:
    - All model files
    - Alembic env.py for autogeneration

    Do NOT put business logic here.
    """
    pass
    # COMMENT: You can declare properties/columns to be present in each model/table here, and then inherit it. For example define crated_at & updated_at here and it will be available in all tables by default.
    
