"""
SAMUDRA-3D Authentication & User Role Schemas
Authority: MoES / INCOIS Operational Ocean Digital Twin Architecture
"""
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    CHIEF_OCEANOGRAPHER = "CHIEF_OCEANOGRAPHER"
    NAVAL_OPERATIONS = "NAVAL_OPERATIONS"
    RESEARCH_OBSERVER = "RESEARCH_OBSERVER"
    GUEST = "GUEST"

class ClearanceLevel(str, Enum):
    LEVEL_3_COMMAND = "LEVEL-3 COMMAND"
    LEVEL_2_TACTICAL = "LEVEL-2 TACTICAL"
    LEVEL_1_RESEARCH = "LEVEL-1 RESEARCH"
    PUBLIC = "PUBLIC"

class AdminUserSummary(BaseModel):
    user_id: str = Field(..., description="Unique user/officer identifier")
    username: str = Field(..., description="Login username")
    display_name: str = Field(..., description="Full display name")
    email: Optional[str] = Field(None, description="Email address")
    role: str = Field(..., description="Assigned role")
    clearance: str = Field(..., description="Clearance level")
    organization: str = Field(..., description="Affiliated agency or division")
    avatar_initials: str = Field(..., description="Initials")
    badge_color: str = Field(..., description="Role badge color")
    created_at: str = Field(..., description="ISO 8601 registration timestamp")
    is_active: bool = Field(True, description="Account active flag")

class UsersListResponse(BaseModel):
    users: List[AdminUserSummary] = Field(..., description="List of registered accounts in database")
    total: int = Field(..., description="Total user count")


class UserProfile(BaseModel):
    user_id: str = Field(..., description="Unique operational officer identifier")
    username: str = Field(..., description="Login username")
    display_name: str = Field(..., description="Officer full name and operational title")
    role: UserRole = Field(..., description="Assigned operational role")
    clearance: ClearanceLevel = Field(..., description="Security and operational clearance level")
    organization: str = Field(..., description="Affiliated agency or division")
    avatar_initials: str = Field(..., description="Two-letter initials for avatar badge")
    badge_color: str = Field(..., description="Hex or CSS accent color for role badge")
    capabilities: List[str] = Field(default_factory=list, description="List of granted functional permissions")

class LoginRequest(BaseModel):
    username: str = Field(..., description="Officer username or email")
    password: str = Field(..., description="Cryptographic passphrase or secret token")

class TokenResponse(BaseModel):
    access_token: str = Field(..., description="Bearer authentication token")
    token_type: str = Field("bearer", description="Token type")
    expires_in_seconds: int = Field(86400, description="Token validity window in seconds")
    user: UserProfile = Field(..., description="Authenticated user profile")

class PersonaPreset(BaseModel):
    id: str = Field(..., description="Persona machine identifier")
    label: str = Field(..., description="Short button label")
    username: str = Field(..., description="Preset username")
    default_password: str = Field(..., description="Pre-filled password")
    role: UserRole = Field(..., description="Operational role")
    clearance: ClearanceLevel = Field(..., description="Clearance level")
    description: str = Field(..., description="Summary of mission responsibilities")
    badge_color: str = Field(..., description="Hex accent color")

class PersonasResponse(BaseModel):
    personas: List[PersonaPreset] = Field(..., description="List of MoES/INCOIS personas for rapid switching")

class AuthStatus(BaseModel):
    authenticated: bool = Field(..., description="Whether a valid session is established")
    user: Optional[UserProfile] = Field(None, description="Active user profile if authenticated")
    message: str = Field(..., description="Status explanation or welcome note")

class AuditLogEntry(BaseModel):
    timestamp: str = Field(..., description="ISO 8601 event timestamp")
    user_id: str = Field(..., description="Officer identifier")
    action: str = Field(..., description="Authentication action performed")
    status: str = Field(..., description="Outcome: SUCCESS or DENIED")
    details: Optional[str] = Field(None, description="Contextual message")

class RegisterRequest(BaseModel):
    username: str = Field(..., description="Officer username or identifier")
    password: str = Field(..., description="Plaintext passphrase to securely hash")
    full_name: str = Field(..., description="Full name of the officer")
    email: Optional[str] = Field(None, description="Official email address")
    role: UserRole = Field(UserRole.RESEARCH_OBSERVER, description="Assigned role")
    clearance: ClearanceLevel = Field(ClearanceLevel.LEVEL_1_RESEARCH, description="Clearance level")
    organization: str = Field("MoES / INCOIS Ocean Observations", description="Organization name")

class RegisterResponse(BaseModel):
    success: bool = Field(..., description="Whether registration succeeded")
    message: str = Field(..., description="Confirmation message")
    user: UserProfile = Field(..., description="Created user profile")

