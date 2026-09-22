"""
SAMUDRA-3D Dataset, DatasetVersion, DatasetFile, and DatasetVariable Models
"""
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.db.database import Base

class Dataset(Base):
    __tablename__ = "datasets"

    dataset_id = Column(String(128), primary_key=True, index=True)
    name = Column(String(256), nullable=False)
    provider = Column(String(128), nullable=False)
    product_id = Column(String(128), nullable=True)
    source_mode = Column(String(32), nullable=False, default="REAL_LOCAL") # REAL_LOCAL, REMOTE_CHUNKED, SYNTHETIC
    access_method = Column(String(64), nullable=False, default="LOCAL_NETCDF")
    local_path = Column(String(512), nullable=True)
    remote_url = Column(String(512), nullable=True)
    format = Column(String(32), nullable=False, default="NetCDF4-CF")
    variables = Column(JSON, default=list, nullable=False)
    raw_variables = Column(JSON, default=list, nullable=False)
    units = Column(JSON, default=dict, nullable=False)
    spatial_resolution = Column(String(64), nullable=True)
    spatial_resolution_km = Column(Float, nullable=True)
    temporal_resolution = Column(String(64), nullable=True)
    coverage = Column(JSON, default=dict, nullable=False) # {lat_min, lat_max, lon_min, lon_max}
    depth_range = Column(JSON, default=dict, nullable=False) # {min_m, max_m, levels_count}
    time_range = Column(JSON, default=dict, nullable=False) # {start, end, steps_count}
    size_bytes = Column(Integer, nullable=True)
    status = Column(String(32), nullable=False, default="VERIFIED")
    provenance = Column(Text, nullable=True)
    license = Column(String(128), nullable=True)
    checksum = Column(String(128), nullable=True)
    last_verified = Column(DateTime(timezone=True), nullable=True)
    last_updated = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    versions = relationship("DatasetVersion", back_populates="dataset", cascade="all, delete-orphan")
    files = relationship("DatasetFile", back_populates="dataset", cascade="all, delete-orphan")
    dataset_variables = relationship("DatasetVariable", back_populates="dataset", cascade="all, delete-orphan")

class DatasetVersion(Base):
    __tablename__ = "dataset_versions"

    id = Column(String(64), primary_key=True, index=True)
    dataset_id = Column(String(128), ForeignKey("datasets.dataset_id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(String(32), nullable=False)
    released_at = Column(DateTime(timezone=True), nullable=True)
    changes_summary = Column(Text, nullable=True)

    dataset = relationship("Dataset", back_populates="versions")

class DatasetFile(Base):
    __tablename__ = "dataset_files"

    id = Column(String(64), primary_key=True, index=True)
    dataset_id = Column(String(128), ForeignKey("datasets.dataset_id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    sha256_hash = Column(String(64), nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Integer, default=1, nullable=False)

    dataset = relationship("Dataset", back_populates="files")

class DatasetVariable(Base):
    __tablename__ = "dataset_variables"

    id = Column(String(64), primary_key=True, index=True)
    dataset_id = Column(String(128), ForeignKey("datasets.dataset_id", ondelete="CASCADE"), nullable=False, index=True)
    variable_name = Column(String(64), nullable=False)
    standard_name = Column(String(128), nullable=True)
    long_name = Column(String(256), nullable=True)
    units = Column(String(32), nullable=False)
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)

    dataset = relationship("Dataset", back_populates="dataset_variables")
