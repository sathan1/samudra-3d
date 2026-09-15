import math
import shutil
from typing import List, Optional, Dict, Any
from pathlib import Path
from pydantic import BaseModel, Field
from backend.app.core.config import settings

class SizeEstimateRequest(BaseModel):
    variables: List[str] = Field(default_factory=lambda: ["thetao", "so", "uo", "vo"])
    lat_min: float = Field(0.0, ge=-90.0, le=90.0)
    lat_max: float = Field(25.0, ge=-90.0, le=90.0)
    lon_min: float = Field(50.0, ge=-180.0, le=180.0)
    lon_max: float = Field(100.0, ge=-180.0, le=180.0)
    depth_levels_count: int = Field(22, ge=1, le=100)
    days_count: int = Field(7, ge=1, le=365)
    resolution_deg: float = Field(0.083333, gt=0)
    dtype_bytes: int = Field(4, ge=2, le=8)

class SizeEstimateResponse(BaseModel):
    total_grid_points_2d: int
    total_voxels_per_step: int
    total_data_points: int
    raw_size_bytes: int
    raw_size_mb: float
    raw_size_gb: float
    estimated_compressed_bytes: int
    estimated_compressed_mb: float
    estimated_transfer_mb: float
    available_disk_bytes: int
    available_disk_gb: float
    has_sufficient_disk: bool
    dimensions_summary: Dict[str, int]
    reference_benchmark: Dict[str, Any]
    recommendation: str

def estimate_dataset_download_size(req: SizeEstimateRequest) -> SizeEstimateResponse:
    """
    Scientifically calculates raw and compressed download sizes for NetCDF subsets.
    Calibrated against real Copernicus GLORYS12V1 benchmarks (CF-1.4 zlib deflation).
    """
    if req.lat_min > req.lat_max:
        raise ValueError(f"lat_min ({req.lat_min}) must be <= lat_max ({req.lat_max})")
    if req.lon_min > req.lon_max:
        raise ValueError(f"lon_min ({req.lon_min}) must be <= lon_max ({req.lon_max})")

    n_lat = max(1, int(round((req.lat_max - req.lat_min) / req.resolution_deg)) + 1)
    n_lon = max(1, int(round((req.lon_max - req.lon_min) / req.resolution_deg)) + 1)
    n_depth = max(1, req.depth_levels_count)
    n_time = max(1, req.days_count)
    n_vars = max(1, len(req.variables))

    points_2d = n_lat * n_lon
    voxels_per_step = points_2d * n_depth
    total_data_points = voxels_per_step * n_time * n_vars

    # Logical raw uncompressed size (in RAM)
    raw_size_bytes = total_data_points * req.dtype_bytes
    raw_size_mb = round(raw_size_bytes / (1024 * 1024), 2)
    raw_size_gb = round(raw_size_bytes / (1024 * 1024 * 1024), 3)

    # NetCDF4 zlib level-1 / level-4 compression ratio observed on GLORYS ocean tensors
    # Land cells (~25% in Indian Ocean) compress to near-zero; spatial fields compress ~3.5x to 4.2x.
    compression_ratio = 0.252
    estimated_compressed_bytes = int(raw_size_bytes * compression_ratio)
    estimated_compressed_mb = round(estimated_compressed_bytes / (1024 * 1024), 2)
    estimated_transfer_mb = round(estimated_compressed_mb * 1.05, 2) # 5% chunk transport header overhead

    # Check available disk
    target_disk = settings.RAW_DATA_DIR or Path.cwd()
    if not target_disk.exists():
        target_disk = Path.cwd()
    
    total_d, used_d, free_d = shutil.disk_usage(target_disk)
    free_gb = round(free_d / (1024 * 1024 * 1024), 2)
    sufficient = free_d > (estimated_compressed_bytes * 1.5) # safety margin 1.5x

    rec = "Ready for targeted download."
    if estimated_compressed_mb > 1024:
        rec = "Large download (> 1 GB): Recommend streaming via OPeNDAP or narrowing bounding box."
    elif not sufficient:
        rec = "Insufficient disk space on target volume."

    ref_bench = {
        "dataset": "cmems_mod_glo_phy_my_0.083deg_P1D-m",
        "observed_subset": "7 days, 50E-100E, 0N-25N, 22 depths (0-92m), 4 vars",
        "observed_disk_mb": 212.68,
        "observed_xarray_logical_mb": 850.0,
        "observed_compression_ratio": 0.2502
    }

    return SizeEstimateResponse(
        total_grid_points_2d=points_2d,
        total_voxels_per_step=voxels_per_step,
        total_data_points=total_data_points,
        raw_size_bytes=raw_size_bytes,
        raw_size_mb=raw_size_mb,
        raw_size_gb=raw_size_gb,
        estimated_compressed_bytes=estimated_compressed_bytes,
        estimated_compressed_mb=estimated_compressed_mb,
        estimated_transfer_mb=estimated_transfer_mb,
        available_disk_bytes=free_d,
        available_disk_gb=free_gb,
        has_sufficient_disk=sufficient,
        dimensions_summary={
            "latitude_points": n_lat,
            "longitude_points": n_lon,
            "depth_levels": n_depth,
            "time_steps": n_time,
            "variables_count": n_vars
        },
        reference_benchmark=ref_bench,
        recommendation=rec
    )
