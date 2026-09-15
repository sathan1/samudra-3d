import os
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel

def _load_env_file(env_path: Path):
    """Loads key-value pairs from .env without requiring external libraries."""
    if env_path.is_file():
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass

class Settings(BaseModel):
    PROJECT_NAME: str = "SAMUDRA-3D Indian Ocean Digital Twin"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Base Directories
    BASE_DIR: Path = Path(__file__).resolve().parents[2]
    WORKSPACE_ROOT: Path = Path(__file__).resolve().parents[3]
    SAMPLE_DATA_DIR: Path = BASE_DIR / "sample_data"
    SYNTHETIC_NETCDF_PATH: Path = SAMPLE_DATA_DIR / "model_indian_ocean.nc"
    NETCDF_PATH: Path = SYNTHETIC_NETCDF_PATH
    ARGO_PATH: Path = SAMPLE_DATA_DIR / "argo_profiles.json"
    
    # Real Scientific Ocean Dataset Hierarchy (Configurable via SAMUDRA_DATA_ROOT)
    # Default search order: 1. os.environ['SAMUDRA_DATA_ROOT'], 2. WORKSPACE_ROOT / 'SAMUDRA_DATA'
    SAMUDRA_DATA_ROOT: Optional[Path] = None
    RAW_DATA_DIR: Optional[Path] = None
    PROCESSED_DATA_DIR: Optional[Path] = None
    CACHE_DATA_DIR: Optional[Path] = None
    INDEXES_DATA_DIR: Optional[Path] = None
    MANIFESTS_DATA_DIR: Optional[Path] = None
    DEMO_DATA_DIR: Optional[Path] = None

    def __init__(self, **data):
        # Auto-load workspace .env if present
        workspace_env = Path(__file__).resolve().parents[3] / ".env"
        _load_env_file(workspace_env)

        super().__init__(**data)

        # Resolve SAMUDRA_DATA_ROOT
        env_root = os.environ.get("SAMUDRA_DATA_ROOT")
        candidate = None
        if env_root:
            candidate = Path(env_root).resolve()
        elif (self.WORKSPACE_ROOT / "SAMUDRA_DATA").is_dir():
            candidate = (self.WORKSPACE_ROOT / "SAMUDRA_DATA").resolve()

        if candidate and candidate.is_dir():
            self.SAMUDRA_DATA_ROOT = candidate
            self.RAW_DATA_DIR = candidate / "raw"
            self.PROCESSED_DATA_DIR = candidate / "processed"
            self.CACHE_DATA_DIR = candidate / "cache"
            self.INDEXES_DATA_DIR = candidate / "indexes"
            self.MANIFESTS_DATA_DIR = candidate / "manifests"
            self.DEMO_DATA_DIR = candidate / "demo"
            
            # Ensure runtime directories exist
            for d in [self.CACHE_DATA_DIR, self.INDEXES_DATA_DIR, self.MANIFESTS_DATA_DIR, self.DEMO_DATA_DIR]:
                if d and not d.exists():
                    try:
                        d.mkdir(parents=True, exist_ok=True)
                    except Exception:
                        pass

    
    # CORS Origins (Restricted to production frontend and authorized dev environments)
    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.environ.get(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4175,http://127.0.0.1:4175,https://samudra-3dd.vercel.app"
        ).split(",")
        if origin.strip()
    ]

    # Initial Admin Provisioning (Configured via environment variables)
    ADMIN_INITIAL_USERNAME: str = os.environ.get("SAMUDRA_ADMIN_USERNAME", "admin")
    ADMIN_INITIAL_PASSWORD: str = os.environ.get("SAMUDRA_ADMIN_PASSWORD", "Samudra#Admin2026!")

    # Active dataset configuration
    DEFAULT_DATASET_ID: str = os.environ.get("DEFAULT_DATASET_ID", "cmems_mod_glo_phy_my_0.083deg_P1D-m")

settings = Settings()


