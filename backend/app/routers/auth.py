"""
SAMUDRA-3D Authentication API Router
Provides secure institutional login, session verification, and logout.
"""
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Request, status
from backend.app.services.auth_service import auth_service
from backend.app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    AuthStatus,
    UserProfile
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    """Helper to extract token from Authorization header."""
    if not authorization:
        return None
    parts = authorization.strip().split(" ")
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return parts[0] if len(parts) == 1 else None

def get_current_user_from_header(authorization: Optional[str] = Header(None)) -> UserProfile:
    """Dependency for protected endpoints."""
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
    return user

@router.post("/login", response_model=TokenResponse, summary="User Authentication")
def login(request: LoginRequest, req: Request):
    """
    Authenticates user credentials against the database.
    Does not reveal whether a username exists to prevent account enumeration.
    """
    if not request.username or not request.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required."
        )

    client_ip = req.client.host if req.client else None
    token_response = auth_service.authenticate(request.username, request.password, client_ip)
    if not token_response:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials."
        )
    return token_response

@router.get("/me", response_model=AuthStatus, summary="Current Session Status")
def get_current_session(authorization: Optional[str] = Header(None)):
    """
    Validates active bearer token and returns current user profile and permissions.
    """
    token = extract_bearer_token(authorization)
    user = auth_service.validate_token(token) if token else None

    if not user:
        return AuthStatus(
            authenticated=False,
            user=None,
            message="No active session."
        )

    return AuthStatus(
        authenticated=True,
        user=user,
        message=f"Welcome {user.display_name}."
    )

@router.post("/logout", summary="Session Termination")
def logout(req: Request, authorization: Optional[str] = Header(None)):
    """
    Revokes the current bearer session token and logs sign-out.
    """
    token = extract_bearer_token(authorization)
    client_ip = req.client.host if req.client else None
    if token:
        auth_service.revoke_token(token, client_ip)
    return {
        "status": "success",
        "message": "Session terminated."
    }
