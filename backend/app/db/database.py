"""
SAMUDRA-3D PostgreSQL & SQLAlchemy 2.x Database Engine
Provides connection pooling, session management, and fallback test support.
"""
import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import QueuePool, StaticPool

# Retrieve DATABASE_URL from environment
# Production default targets PostgreSQL with psycopg3 driver
DEFAULT_PG_URL = "postgresql+psycopg://samudra:samudra@localhost:5432/samudra"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_PG_URL)

# Check if running in SQLite compatibility / test mode
IS_SQLITE = DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
else:
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=300
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields an active database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
