"""
Async SQLAlchemy database setup for the Ingestion Service.
Uses SQLite locally (zero config) — swap DATABASE_URL to PostgreSQL in production.
"""
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

# Use SQLite by default (works without Docker), PostgreSQL if configured
_DB_URL = os.getenv(
    "DATABASE_URL",
    os.getenv("INGESTION_DATABASE_URL", "sqlite+aiosqlite:////tmp/cognigrid_ingestion.db")
)

engine = create_async_engine(_DB_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables on startup and apply lightweight migrations."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Add user_id column if it doesn't exist (migration for existing DBs)
        try:
            await conn.execute(
                __import__('sqlalchemy').text(
                    "ALTER TABLE ingestion_jobs ADD COLUMN user_id VARCHAR(256)"
                )
            )
        except Exception:
            pass  # Column already exists — safe to ignore


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
