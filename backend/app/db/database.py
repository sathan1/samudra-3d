"""
SAMUDRA-3D PostgreSQL & SQLAlchemy 2.x Database Engine
Provides connection pooling, session management, and fallback test support.
"""
import os
import logging
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import QueuePool, StaticPool

logger = logging.getLogger("samudra.db")

# In production / Docker, DATABASE_URL is set (e.g. postgresql+psycopg://...)
# In local development or testing, fall back safely to SQLite.
env_db_url = os.getenv("DATABASE_URL")

engine = None
IS_SQLITE = False

if env_db_url and not env_db_url.startswith("sqlite"):
    try:
        DATABASE_URL = env_db_url
        engine = create_engine(
            DATABASE_URL,
            poolclass=QueuePool,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=300
        )
    except Exception as e:
        logger.warning("Could not initialize PostgreSQL engine (%s); falling back to SQLite.", e)
        engine = None
elif env_db_url and env_db_url.startswith("sqlite"):
    DATABASE_URL = env_db_url
    IS_SQLITE = True
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )

if engine is None:
    IS_SQLITE = True
    cand_1 = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "samudra.db")
    cand_2 = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "samudra.db")
    sqlite_path = cand_1 if os.path.exists(cand_1) else cand_2
    os.makedirs(os.path.dirname(sqlite_path), exist_ok=True)
    DATABASE_URL = f"sqlite:///{sqlite_path.replace(os.sep, '/')}"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
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
