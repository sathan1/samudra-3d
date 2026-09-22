"""
SAMUDRA-3D Geographical Locations and User-Saved Locations Models
"""
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.db.database import Base

class Location(Base):
    __tablename__ = "locations"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False, index=True)
    category = Column(String(64), nullable=False) # ocean_basin, sub_basin, coastal, harbor, island
    lat = Column(Float, nullable=False, index=True)
    lon = Column(Float, nullable=False, index=True)
    zoom_distance = Column(Float, default=150.0, nullable=False)
    bbox = Column(JSON, default=dict, nullable=True) # {lat_min, lat_max, lon_min, lon_max}
    description = Column(String(256), nullable=True)

class SavedLocation(Base):
    __tablename__ = "saved_locations"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    zoom_distance = Column(Float, default=150.0, nullable=False)
    depth_m = Column(Float, default=0.0, nullable=False)
    variable = Column(String(32), default="temperature", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
