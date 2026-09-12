"""
SAMUDRA-3D Authentication API Router
Authority: MoES / INCOIS Operational Ocean Digital Twin Architecture
"""
from typing import List, Optional
from fastapi import APIRouter, Header, HTTPException, status
from backend.app.services.auth_service import auth_service
from backend.app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    PersonasResponse,
    AuthStatus,
    AuditLogEntry,
    RegisterRequest,
    RegisterResponse
)

router = APIRouter(prefix="/api/auth", tags=["Operational Authentication"])

def _extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    """Helper to extract token from Authorization: Bearer <token> header."""
    if not authorization:
        return None
    parts = authorization.strip().split(" ")
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return parts[0] if len(parts) == 1 else None

@router.post("/login", response_model=TokenResponse, summary="Officer Authentication Login")
def login(request: LoginRequest):
    """
    Authenticates operational credentials against MoES/INCOIS personnel records.
    Issues a cryptographically secure session token upon success.
    """
    if not request.username or not request.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password must be provided."
        )

    token_response = auth_service.authenticate(request.username, request.password)
    if not token_response:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid operational credentials. Authentication rejected."
        )
    return token_response

@router.post("/register", response_model=RegisterResponse, summary="Register Officer Record in Database")
def register(request: RegisterRequest):
    """
    Registers a new operational officer credential record directly in SQLite database.
    """
    if not request.username or not request.password or not request.full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username, password, and full name are required."
        )
    try:
        user_profile = auth_service.register_user(request)
        return RegisterResponse(
            success=True,
            message=f"Officer record for {user_profile.display_name} created successfully in database.",
            user=user_profile
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )

@router.get("/me", response_model=AuthStatus, summary="Current Officer Session Status")
def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Validates active bearer token and returns current officer profile and granted capabilities.
    """
    token = _extract_bearer_token(authorization)
    user = auth_service.verify_token(token) if token else None

    if not user:
        return AuthStatus(
            authenticated=False,
            user=None,
            message="No active session found. Standard public preview mode."
        )

    return AuthStatus(
        authenticated=True,
        user=user,
        message=f"Welcome {user.display_name}. Clearance {user.clearance.value} verified."
    )

@router.post("/logout", summary="Officer Session Termination")
def logout(authorization: Optional[str] = Header(None)):
    """
    Revokes the current bearer session token and logs officer sign-out.
    """
    token = _extract_bearer_token(authorization)
    if token:
        auth_service.revoke_token(token)
    return {
        "status": "success",
        "message": "Officer session terminated cleanly. System reverted to public mode."
    }

@router.get("/personas", response_model=PersonasResponse, summary="Available MoES/INCOIS Personas")
def get_personas():
    """
    Returns preset operational personas with pre-filled credentials for rapid evaluation and briefing.
    """
    return PersonasResponse(personas=auth_service.get_personas())

@router.get("/audit-log", response_model=List[AuditLogEntry], summary="Authentication Audit Telemetry")
def get_audit_log(limit: int = 25):
    """
    Returns the recent authentication audit trail for security accountability.
    """
    return auth_service.get_audit_log(limit=limit)
