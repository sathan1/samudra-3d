"""
SAMUDRA-3D Administration API Router
Provides strict RBAC-protected administrative controls for user management,
sensor platform registration, data source inspection, and security audit logs.
"""
from typing import List, Optional
from fastapi import APIRouter, Header, HTTPException, Request, Depends, status
from pydantic import BaseModel, Field
from backend.app.services.auth_service import auth_service
from backend.app.services.ocean_service import ocean_service
from backend.app.routers.auth import extract_bearer_token
from backend.app.schemas.auth import (
    UserRole,
    UserProfile,
    AdminUserSummary,
    UsersListResponse,
    CreateUserRequest,
    UpdateUserStatusRequest,
    UpdateUserRoleRequest,
    ResetPasswordRequest,
    AuditLogEntry,
    DataSourceSummary
)
from backend.app.db import get_db_connection

router = APIRouter(prefix="/api/admin", tags=["System Administration"])

def require_admin(authorization: Optional[str] = Header(None)) -> UserProfile:
    """Strict dependency enforcing ADMIN role authorization on all admin endpoints."""
    token = extract_bearer_token(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication session required."
        )
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid. Please sign in again."
        )
    if user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to access this resource."
        )
    return user

class AdminOverviewResponse(BaseModel):
    status: str
    users_count: int
    sensors_count: int
    data_sources_count: int
    model_loaded: bool
    model_variable_count: int

class SensorRegistrationRequest(BaseModel):
    id: str = Field(..., description="Unique sensor/platform identifier")
    platform_type: str = Field(..., description="Type: Argo Float, Underwater Glider, Moored Buoy, Surface Drifter, Other")
    name: str = Field(..., description="Platform deployment name")
    lat: float = Field(..., description="Latitude (-90 to 90)")
    lon: float = Field(..., description="Longitude (-180 to 180)")
    deployment_date: Optional[str] = Field(None, description="ISO deployment date")
    data_provider: Optional[str] = Field("Ocean Observation Network", description="Operating agency or provider")
    description: Optional[str] = Field(None, description="Operational notes")

class SensorSummary(BaseModel):
    id: str
    platform_type: str
    name: str
    lat: float
    lon: float
    deployment_date: Optional[str]
    status: str
    data_provider: str
    description: Optional[str]
    created_at: str
    has_observations: bool = False

@router.get("/overview", response_model=AdminOverviewResponse, summary="System Overview")
def get_overview(admin: UserProfile = Depends(require_admin)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as cnt FROM users")
    users_count = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM sensors")
    sensors_count = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM data_sources")
    sources_count = cursor.fetchone()["cnt"]
    conn.close()

    return AdminOverviewResponse(
        status="Operational",
        users_count=users_count,
        sensors_count=sensors_count,
        data_sources_count=sources_count,
        model_loaded=ocean_service.dataset is not None,
        model_variable_count=len(ocean_service.get_metadata().variables) if ocean_service.dataset is not None else 0
    )

@router.get("/users", response_model=UsersListResponse, summary="List Users")
def list_users(admin: UserProfile = Depends(require_admin)):
    users = auth_service.get_all_users()
    return UsersListResponse(users=users, total=len(users))

@router.post("/users", summary="Create User Account")
def create_user(request: CreateUserRequest, req: Request, admin: UserProfile = Depends(require_admin)):
    client_ip = req.client.host if req.client else None
    try:
        user = auth_service.create_user(request, actor=admin.username, client_ip=client_ip)
        return {
            "success": True,
            "message": f"User account for {user.display_name} created.",
            "user": user
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@router.put("/users/{user_id}/status", summary="Enable or Disable User")
def update_user_status(user_id: str, request: UpdateUserStatusRequest, req: Request, admin: UserProfile = Depends(require_admin)):
    client_ip = req.client.host if req.client else None
    try:
        success = auth_service.update_user_status(user_id, request.is_active, actor=admin.username, client_ip=client_ip)
        if not success:
            raise HTTPException(status_code=404, detail="User not found.")
        status_text = "enabled" if request.is_active else "disabled"
        return {"success": True, "message": f"User account {user_id} has been {status_text}."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/users/{user_id}/role", summary="Change User Role")
def update_user_role(user_id: str, request: UpdateUserRoleRequest, req: Request, admin: UserProfile = Depends(require_admin)):
    client_ip = req.client.host if req.client else None
    try:
        success = auth_service.update_user_role(user_id, request.role, actor=admin.username, client_ip=client_ip)
        if not success:
            raise HTTPException(status_code=404, detail="User not found.")
        return {"success": True, "message": f"User {user_id} role updated to {request.role.value}."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/users/{user_id}/reset-password", summary="Reset User Password")
def reset_password(user_id: str, request: ResetPasswordRequest, req: Request, admin: UserProfile = Depends(require_admin)):
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    client_ip = req.client.host if req.client else None
    success = auth_service.reset_password(user_id, request.new_password, actor=admin.username, client_ip=client_ip)
    if not success:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"success": True, "message": f"Password for {user_id} reset successfully."}

@router.get("/audit-logs", response_model=List[AuditLogEntry], summary="Security Audit Logs")
def get_audit_logs(limit: int = 100, admin: UserProfile = Depends(require_admin)):
    return auth_service.get_audit_logs(limit=limit)

@router.get("/data-sources", response_model=List[DataSourceSummary], summary="Data Sources")
def get_data_sources(admin: UserProfile = Depends(require_admin)):
    return auth_service.get_data_sources()

@router.get("/sensors", response_model=List[SensorSummary], summary="List Registered Sensor Platforms")
def list_sensors(admin: UserProfile = Depends(require_admin)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, platform_type, name, lat, lon, deployment_date, status, data_provider, description, created_at
        FROM sensors
        ORDER BY created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    return [
        SensorSummary(
            id=r["id"],
            platform_type=r["platform_type"],
            name=r["name"],
            lat=r["lat"],
            lon=r["lon"],
            deployment_date=r["deployment_date"],
            status=r["status"],
            data_provider=r["data_provider"] or "Ocean Observation Network",
            description=r["description"],
            created_at=r["created_at"],
            has_observations=False
        )
        for r in rows
    ]

@router.post("/sensors", response_model=SensorSummary, summary="Register New Sensor Platform")
def register_sensor(request: SensorRegistrationRequest, req: Request, admin: UserProfile = Depends(require_admin)):
    if not (-90.0 <= request.lat <= 90.0) or not (-180.0 <= request.lon <= 180.0):
        raise HTTPException(status_code=400, detail="Invalid geographic coordinates.")

    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    client_ip = req.client.host if req.client else None

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM sensors WHERE id = ?", (request.id.strip(),))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=409, detail=f"Sensor ID '{request.id}' is already registered.")

    cursor.execute("""
        INSERT INTO sensors (
            id, platform_type, name, lat, lon, deployment_date,
            status, data_provider, description, created_by, created_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, 'deployed', ?, ?, ?, ?, 1)
    """, (
        request.id.strip(),
        request.platform_type.strip(),
        request.name.strip(),
        request.lat,
        request.lon,
        request.deployment_date or now_iso[:10],
        request.data_provider or "Ocean Observation Network",
        request.description or "",
        admin.username,
        now_iso
    ))

    # Also register in custom_sensors table for spatial rendering without fake curves
    cursor.execute("""
        INSERT OR REPLACE INTO custom_sensors (
            id, platform_type, name, lat, lon, depths, temperature, salinity,
            surface_temp, surface_salinity, max_depth, agency, created_by, created_at, is_active
        ) VALUES (?, ?, ?, ?, ?, '[]', '[]', '[]', NULL, NULL, 0, ?, ?, ?, 1)
    """, (
        request.id.strip(),
        request.platform_type.strip(),
        request.name.strip(),
        request.lat,
        request.lon,
        request.data_provider or "Ocean Observation Network",
        admin.username,
        now_iso
    ))

    # Also update in-memory insitu_service
    from backend.app.services.insitu_service import insitu_service
    insitu_service.load_custom_sensors()

    auth_service._log_audit(cursor, admin.username, "SENSOR_REGISTER", request.id.strip(), "SUCCESS", f"Registered {request.platform_type} {request.name}", client_ip)
    conn.commit()
    conn.close()

    return SensorSummary(
        id=request.id.strip(),
        platform_type=request.platform_type.strip(),
        name=request.name.strip(),
        lat=request.lat,
        lon=request.lon,
        deployment_date=request.deployment_date or now_iso[:10],
        status="deployed",
        data_provider=request.data_provider or "Ocean Observation Network",
        description=request.description,
        created_at=now_iso,
        has_observations=False
    )

@router.delete("/sensors/{sensor_id}", summary="Delete or Decommission Sensor Platform")
def delete_sensor(sensor_id: str, req: Request, admin: UserProfile = Depends(require_admin)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sensors WHERE id = ?", (sensor_id,))
    cursor.execute("DELETE FROM custom_sensors WHERE id = ?", (sensor_id,))

    from backend.app.services.insitu_service import insitu_service
    insitu_service.delete_sensor(sensor_id)

    client_ip = req.client.host if req.client else None
    auth_service._log_audit(cursor, admin.username, "SENSOR_DELETE", sensor_id, "SUCCESS", "Decommissioned sensor platform", client_ip)
    conn.commit()
    conn.close()
    return {"success": True, "message": f"Sensor platform {sensor_id} decommissioned."}
