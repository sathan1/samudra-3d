"""
SAMUDRA-3D Authentication & User Role Schemas
Clean institutional role-based access control and security schemas.
"""
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"
    RESEARCHER = "RESEARCHER"
    VIEWER = "VIEWER"
    # Aliases for backward compatibility
    CHIEF_OCEANOGRAPHER = "OPERATOR"
    NAVAL_OPERATIONS = "OPERATOR"
    RESEARCH_OBSERVER = "RESEARCHER"
    GUEST = "VIEWER"

class ClearanceLevel(str, Enum):
    LEVEL_3_COMMAND = "LEVEL-3 COMMAND"
    LEVEL_2_TACTICAL = "LEVEL-2 TACTICAL"
    LEVEL_1_RESEARCH = "LEVEL-1 RESEARCH"
    PUBLIC = "PUBLIC"

class UserProfile(BaseModel):
    user_id: str = Field(..., description="Unique user identifier")
    username: str = Field(..., description="Login username")
    display_name: str = Field(..., description="Full display name")
    role: str = Field(..., description="Assigned role: ADMIN, OPERATOR, RESEARCHER, VIEWER")
    clearance: str = Field("LEVEL-1 RESEARCH", description="Clearance level")
    organization: str = Field("Ocean Information Services", description="Affiliated organization")
    avatar_initials: str = Field("US", description="Two-letter initials")
    badge_color: str = Field("#38bdf8", description="Role badge color")
    capabilities: List[str] = Field(default_factory=list, description="Granted functional permissions")

class LoginRequest(BaseModel):
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="Account password")

class TokenResponse(BaseModel):
    access_token: str = Field(..., description="Bearer session token")
    token_type: str = Field("bearer", description="Token type")
    expires_in_seconds: int = Field(86400, description="Token validity in seconds (24h)")
    user: UserProfile = Field(..., description="Authenticated user profile")

class AuthStatus(BaseModel):
    authenticated: bool = Field(..., description="Whether a valid session is active")
    user: Optional[UserProfile] = Field(None, description="Active user profile if authenticated")
    message: str = Field(..., description="Status message")

class AuditLogEntry(BaseModel):
    id: Optional[int] = Field(None, description="Audit log entry ID")
    timestamp: str = Field(..., description="ISO 8601 event timestamp")
    actor: str = Field(..., description="User ID or username who initiated action")
    action: str = Field(..., description="Action performed: LOGIN, LOGOUT, USER_CREATE, etc.")
    target: Optional[str] = Field(None, description="Target entity or resource")
    result: str = Field(..., description="Outcome: SUCCESS or DENIED")
    details: Optional[str] = Field(None, description="Contextual message")

class AdminUserSummary(BaseModel):
    user_id: str = Field(..., description="Unique user identifier")
    username: str = Field(..., description="Login username")
    display_name: str = Field(..., description="Full display name")
    email: Optional[str] = Field(None, description="Email address")
    role: str = Field(..., description="Assigned role")
    clearance: str = Field(..., description="Clearance level")
    organization: str = Field(..., description="Affiliated agency or division")
    avatar_initials: str = Field(..., description="Initials")
    badge_color: str = Field(..., description="Role badge color")
    created_at: str = Field(..., description="Registration timestamp")
    last_login: Optional[str] = Field(None, description="Last login timestamp")
    is_active: bool = Field(True, description="Active account flag")

class UsersListResponse(BaseModel):
    users: List[AdminUserSummary] = Field(..., description="List of registered accounts")
    total: int = Field(..., description="Total user count")

class CreateUserRequest(BaseModel):
    username: str = Field(..., description="Login username")
    password: str = Field(..., description="Initial password")
    full_name: str = Field(..., description="Full name")
    email: Optional[str] = Field(None, description="Email address")
    role: UserRole = Field(UserRole.RESEARCHER, description="Assigned role")
    organization: str = Field("Ocean Information Services", description="Organization name")

class UpdateUserStatusRequest(BaseModel):
    is_active: bool = Field(..., description="Set active status (true=enabled, false=disabled)")

class UpdateUserRoleRequest(BaseModel):
    role: UserRole = Field(..., description="New role assignment")

class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., description="New account password")

class DataSourceSummary(BaseModel):
    id: str = Field(..., description="Identifier")
    name: str = Field(..., description="Dataset name")
    provider: str = Field(..., description="Data provider / institution")
    dataset_type: str = Field(..., description="Type: Numerical Model, Profiling Float Array, etc.")
    variables: List[str] = Field(default_factory=list, description="Variables provided")
    spatial_coverage: str = Field(..., description="Geographic coverage")
    temporal_coverage: str = Field(..., description="Temporal coverage")
    update_frequency: str = Field(..., description="Update frequency")
    status: str = Field(..., description="Connection status: Active, Connected, etc.")
    last_updated: str = Field(..., description="Last updated timestamp")
    description: str = Field(..., description="Description of the dataset")
