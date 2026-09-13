import os
from pathlib import Path
from typing import List
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "SAMUDRA-3D Indian Ocean Digital Twin"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Dataset Paths
    BASE_DIR: Path = Path(__file__).resolve().parents[2]
    SAMPLE_DATA_DIR: Path = BASE_DIR / "sample_data"
    NETCDF_PATH: Path = SAMPLE_DATA_DIR / "model_indian_ocean.nc"
    ARGO_PATH: Path = SAMPLE_DATA_DIR / "argo_profiles.json"
    
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

settings = Settings()

