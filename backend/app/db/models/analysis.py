"""
SAMUDRA-3D Scientific Analysis Runs, Collocation Results, and Anomalies Models
"""
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.db.database import Base

class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    run_type = Column(String(64), nullable=False, index=True) # collocation, anomaly_field, transect, sounding
    status = Column(String(32), nullable=False, default="COMPLETED") # COMPLETED, RUNNING, FAILED
    parameters = Column(JSON, default=dict, nullable=False)
    metrics = Column(JSON, default=dict, nullable=False)
    execution_time_ms = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    collocations = relationship("CollocationResult", back_populates="analysis_run", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="analysis_run", cascade="all, delete-orphan")

class CollocationResult(Base):
    __tablename__ = "collocation_results"

    id = Column(String(64), primary_key=True, index=True)
    run_id = Column(String(64), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    platform_id = Column(String(64), ForeignKey("observation_platforms.id", ondelete="CASCADE"), nullable=False, index=True)
    profile_id = Column(String(128), ForeignKey("observation_profiles.id", ondelete="CASCADE"), nullable=True, index=True)
    variable = Column(String(32), nullable=False)
    bias = Column(Float, nullable=False)
    mae = Column(Float, nullable=False)
    rmse = Column(Float, nullable=False)
    correlation_r = Column(Float, nullable=True)
    sample_count = Column(Integer, nullable=False)
    details = Column(JSON, default=dict, nullable=True)

    analysis_run = relationship("AnalysisRun", back_populates="collocations")

class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(String(64), primary_key=True, index=True)
    run_id = Column(String(64), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    lat = Column(Float, nullable=False, index=True)
    lon = Column(Float, nullable=False, index=True)
    depth_m = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    variable = Column(String(32), nullable=False)
    observed_value = Column(Float, nullable=False)
    model_value = Column(Float, nullable=False)
    delta = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    platform_id = Column(String(64), nullable=True, index=True)
    support_radius_km = Column(Float, default=25.0)
    severity = Column(String(32), default="MODERATE") # LOW, MODERATE, HIGH, CRITICAL

    analysis_run = relationship("AnalysisRun", back_populates="anomalies")
