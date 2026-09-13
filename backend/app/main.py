from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.routers.ocean import router as ocean_router
from backend.app.routers.routes_insitu import router as insitu_router
from backend.app.routers.collocation import router as collocation_router
from backend.app.routers.anomaly import router as anomaly_router
from backend.app.routers.assistant import router as assistant_router
from backend.app.routers.auth import router as auth_router
from backend.app.routers.admin import router as admin_router
from backend.app.services.ocean_service import ocean_service
from backend.app.db import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: Pre-loads dataset and initializes database on startup."""
    print(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}...")
    try:
        init_db()
        print("[OK] Database schema verified.")
    except Exception as e:
        print(f"[WARNING] Could not initialize database at startup: {e}")

    try:
        ocean_service.load_dataset()
        print(f"[OK] Ocean dataset loaded successfully from {ocean_service.nc_path}")
    except Exception as e:
        print(f"[WARNING] Could not load dataset at startup: {e}")
    yield
    print("Shutting down SAMUDRA-3D API server...")
    ocean_service.close()
    print("[OK] Dataset handles closed cleanly.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="High-performance backend API serving numerical ocean model outputs and in-situ observations (MoES / INCOIS Ocean Digital Twin)",
    lifespan=lifespan
)

# Configure CORS restricted to local development & preview origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(ocean_router)
app.include_router(insitu_router)
app.include_router(collocation_router)
app.include_router(anomaly_router)
app.include_router(assistant_router)
app.include_router(auth_router)
app.include_router(admin_router)

@app.get("/", tags=["System"])
def root():
    return {
        "project": "SAMUDRA-3D",
        "title": "Indian Ocean Digital Twin Platform",
        "organization": "Ministry of Earth Sciences (MoES) / INCOIS",
        "status": "online",
        "documentation": "/docs",
        "api_health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
