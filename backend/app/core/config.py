from pathlib import Path
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "SAMUDRA-3D Ocean Intelligence Platform"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Dataset Paths
    BASE_DIR: Path = Path(__file__).resolve().parents[2]
    SAMPLE_DATA_DIR: Path = BASE_DIR / "sample_data"
    NETCDF_PATH: Path = SAMPLE_DATA_DIR / "model_indian_ocean.nc"
    ARGO_PATH: Path = SAMPLE_DATA_DIR / "argo_profiles.json"
    
    # CORS Origins (Allow all origins for cloud preview & production deployment)
    CORS_ORIGINS: list[str] = ["*"]

settings = Settings()
