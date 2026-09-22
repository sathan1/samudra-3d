"""
SAMUDRA-3D Download Jobs and Cache Metadata Models
"""
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey, JSON
from backend.app.db.database import Base

class DownloadJob(Base):
    __tablename__ = "download_jobs"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    dataset_id = Column(String(128), ForeignKey("datasets.dataset_id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(32), nullable=False, default="QUEUED") # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    parameters = Column(JSON, default=dict, nullable=False) # {lat_min, lat_max, lon_min, lon_max, depth_min, depth_max, start_date, end_date, variables}
    estimated_download_mb = Column(Float, nullable=False)
    expanded_logical_mb = Column(Float, nullable=False)
    progress_percent = Column(Float, default=0.0, nullable=False)
    output_file_path = Column(String(512), nullable=True)
    sha256_hash = Column(String(64), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

class CacheEntry(Base):
    __tablename__ = "cache_entries"

    key_hash = Column(String(64), primary_key=True, index=True)
    dataset_id = Column(String(128), ForeignKey("datasets.dataset_id", ondelete="CASCADE"), nullable=False, index=True)
    query_type = Column(String(32), nullable=False, index=True) # slice, point, profile, region
    parameters_json = Column(Text, nullable=False)
    file_path = Column(String(512), nullable=True)
    size_bytes = Column(Integer, nullable=False, default=0)
    access_count = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_accessed = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
