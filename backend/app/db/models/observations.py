"""
SAMUDRA-3D Observation Platforms, Profiles, Measurements, and Glider Transects Models
"""
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.db.database import Base

class ObservationPlatform(Base):
    __tablename__ = "observation_platforms"

    id = Column(String(64), primary_key=True, index=True)
    platform_type = Column(String(32), nullable=False, index=True) # argo, glider, mooring_buoy, drifter
    wmo_id = Column(String(32), nullable=True, index=True)
    name = Column(String(128), nullable=False)
    agency = Column(String(128), nullable=False, default="INCOIS")
    deployment_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(32), nullable=False, default="active") # active, inactive, historical
    lat = Column(Float, nullable=False, index=True)
    lon = Column(Float, nullable=False, index=True)
    source_mode = Column(String(32), nullable=False, default="REAL_LOCAL") # REAL_LOCAL, SYNTHETIC
    description = Column(Text, nullable=True)
    created_by = Column(String(64), default="system")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    profiles = relationship("ObservationProfile", back_populates="platform", cascade="all, delete-orphan")
    transects = relationship("GliderTransect", back_populates="platform", cascade="all, delete-orphan")

class ObservationProfile(Base):
    __tablename__ = "observation_profiles"

    id = Column(String(128), primary_key=True, index=True)
    platform_id = Column(String(64), ForeignKey("observation_platforms.id", ondelete="CASCADE"), nullable=False, index=True)
    cycle_number = Column(Integer, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    lat = Column(Float, nullable=False, index=True)
    lon = Column(Float, nullable=False, index=True)
    max_depth_m = Column(Float, nullable=False)
    qc_status = Column(String(32), default="PASSED")
    data_source_mode = Column(String(32), default="REAL_LOCAL")
    depths = Column(JSON, default=list, nullable=False)
    temperature = Column(JSON, default=list, nullable=False)
    salinity = Column(JSON, default=list, nullable=False)
    pressure = Column(JSON, default=list, nullable=True)
    qc_flags = Column(JSON, default=list, nullable=True)

    platform = relationship("ObservationPlatform", back_populates="profiles")
    measurements = relationship("ObservationMeasurement", back_populates="profile", cascade="all, delete-orphan")

class ObservationMeasurement(Base):
    __tablename__ = "observation_measurements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(String(128), ForeignKey("observation_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    depth_m = Column(Float, nullable=False)
    variable = Column(String(32), nullable=False) # temperature, salinity, etc.
    value = Column(Float, nullable=False)
    qc_flag = Column(Integer, default=1, nullable=False)

    profile = relationship("ObservationProfile", back_populates="measurements")

class GliderTransect(Base):
    __tablename__ = "glider_transects"

    id = Column(String(128), primary_key=True, index=True)
    platform_id = Column(String(64), ForeignKey("observation_platforms.id", ondelete="CASCADE"), nullable=False, index=True)
    mission_name = Column(String(128), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    waypoints = Column(JSON, default=list, nullable=False)
    variables = Column(JSON, default=list, nullable=False)

    platform = relationship("ObservationPlatform", back_populates="transects")
