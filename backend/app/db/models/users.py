"""
SAMUDRA-3D User, Role, Session, and Security Audit Log Models
"""
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.db.database import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(64), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    permissions = Column(JSON, default=list, nullable=False)

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(256), nullable=False)
    salt = Column(String(64), nullable=False)
    full_name = Column(String(128), nullable=False)
    email = Column(String(128), nullable=True)
    role = Column(String(32), nullable=False, default="VIEWER")
    clearance_level = Column(String(64), nullable=False, default="LEVEL-1 RESEARCH")
    organization = Column(String(128), nullable=False, default="Ocean Information Services")
    avatar_initials = Column(String(8), nullable=False, default="US")
    badge_color = Column(String(32), nullable=False, default="#38bdf8")
    capabilities = Column(JSON, default=list, nullable=False)
    status = Column(String(32), nullable=False, default="active")
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

class UserSession(Base):
    __tablename__ = "sessions"

    token = Column(String(128), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    user = relationship("User", back_populates="sessions")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    actor = Column(String(64), nullable=False, default="system")
    user_id = Column(String(64), nullable=True, index=True)
    action = Column(String(128), nullable=False, index=True)
    target = Column(String(256), nullable=True)
    result = Column(String(32), nullable=False, default="SUCCESS")
    status = Column(String(32), nullable=False, default="SUCCESS")
    details = Column(Text, nullable=True)
