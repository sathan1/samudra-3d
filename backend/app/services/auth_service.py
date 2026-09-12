"""
SAMUDRA-3D Database-Backed Authentication & Session Service
Authority: MoES / INCOIS Operational Ocean Digital Twin Architecture
Directly backed by SQLite database (backend/data/samudra.db)
"""
import json
import secrets
import hmac
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from backend.app.schemas.auth import (
    UserRole,
    ClearanceLevel,
    UserProfile,
    PersonaPreset,
    TokenResponse,
    AuditLogEntry,
    RegisterRequest
)
from backend.app.db import get_db_connection, hash_password

def _row_to_profile(row) -> UserProfile:
    """Helper to convert a database row into a validated UserProfile Pydantic object."""
    capabilities = []
    if row["capabilities"]:
        try:
            capabilities = json.loads(row["capabilities"])
        except (json.JSONDecodeError, TypeError):
            capabilities = []

    return UserProfile(
        user_id=row["id"],
        username=row["username"],
        display_name=row["full_name"],
        role=UserRole(row["role"]),
        clearance=ClearanceLevel(row["clearance_level"]),
        organization=row["organization"],
        avatar_initials=row["avatar_initials"],
        badge_color=row["badge_color"],
        capabilities=capabilities
    )

class AuthService:
    """Manages authentication, user registration, and sessions directly against SQLite database."""

    def authenticate(self, username: str, password: str, client_ip: Optional[str] = None) -> Optional[TokenResponse]:
        """Authenticates user credentials strictly against the SQLite database."""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM users WHERE username = ? AND is_active = 1", (username,))
        row = cursor.fetchone()

        if not row:
            self._log_audit(cursor, username, "LOGIN", "DENIED", "User not found or inactive", client_ip)
            conn.commit()
            conn.close()
            return None

        # Verify cryptographic password hash with PBKDF2
        candidate_hash = hash_password(password, row["salt"])
        if not hmac.compare_digest(candidate_hash, row["password_hash"]):
            self._log_audit(cursor, username, "LOGIN", "DENIED", "Invalid passphrase", client_ip)
            conn.commit()
            conn.close()
            return None

        user_profile = _row_to_profile(row)

        # Generate cryptographically secure bearer token
        token = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)
        expires_at = (now + timedelta(seconds=86400)).isoformat()

        cursor.execute(
            "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_profile.user_id, now.isoformat(), expires_at)
        )

        self._log_audit(
            cursor,
            user_profile.user_id,
            "LOGIN",
            "SUCCESS",
            f"Officer {user_profile.display_name} authenticated with {user_profile.clearance.value}",
            client_ip
        )

        conn.commit()
        conn.close()

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            expires_in_seconds=86400,
            user=user_profile
        )

    def validate_token(self, token: str) -> Optional[UserProfile]:
        """Validates a bearer token against active SQLite database sessions."""
        if not token:
            return None

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT users.* FROM sessions
            JOIN users ON sessions.user_id = users.id
            WHERE sessions.token = ? AND users.is_active = 1
        """, (token,))
        row = cursor.fetchone()

        conn.close()

        if not row:
            return None

        return _row_to_profile(row)

    def verify_token(self, token: str) -> Optional[UserProfile]:
        """Alias for validate_token for backwards and interface compatibility."""
        return self.validate_token(token)

    def revoke_token(self, token: str, client_ip: Optional[str] = None) -> bool:
        """Revokes a session by deleting it from the database."""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT user_id FROM sessions WHERE token = ?", (token,))
        session_row = cursor.fetchone()

        if session_row:
            user_id = session_row["user_id"]
            cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
            self._log_audit(cursor, user_id, "LOGOUT", "SUCCESS", "Session terminated", client_ip)
            conn.commit()
            conn.close()
            return True

        conn.close()
        return False

    def register_user(self, req: RegisterRequest, client_ip: Optional[str] = None) -> UserProfile:
        """Registers a new officer directly into the SQLite database."""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM users WHERE username = ?", (req.username,))
        if cursor.fetchone():
            conn.close()
            raise ValueError(f"Officer username '{req.username}' is already registered in the database.")

        user_id = f"OFFICER-{secrets.token_hex(4).upper()}"
        salt = secrets.token_hex(16)
        pw_hash = hash_password(req.password, salt)
        initials = "".join([part[0].upper() for part in req.full_name.split()[:2]]) or "OF"

        badge_color = "#00f5d4"
        if req.role == UserRole.NAVAL_OPERATIONS:
            badge_color = "#f59e0b"
        elif req.role == UserRole.RESEARCH_OBSERVER:
            badge_color = "#10b981"

        capabilities = [
            "deep_ctd_profile_inspection",
            "observation_logging",
            "scientific_assistant_queries"
        ]
        if req.role == UserRole.CHIEF_OCEANOGRAPHER:
            capabilities.extend(["model_forecast_validation", "collocation_export", "anomaly_threshold_override"])
        elif req.role == UserRole.NAVAL_OPERATIONS:
            capabilities.extend(["tactical_current_streamlines", "platform_fleet_tracking", "hazard_discrepancy_alerts"])

        now_iso = datetime.now(timezone.utc).isoformat()

        cursor.execute("""
            INSERT INTO users (
                id, username, password_hash, salt, full_name, email,
                role, clearance_level, organization, avatar_initials,
                badge_color, capabilities, created_at, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            user_id,
            req.username,
            pw_hash,
            salt,
            req.full_name,
            req.email,
            req.role.value,
            req.clearance.value,
            req.organization,
            initials,
            badge_color,
            json.dumps(capabilities),
            now_iso
        ))

        self._log_audit(cursor, user_id, "REGISTER", "SUCCESS", f"New account created for {req.full_name}", client_ip)

        conn.commit()

        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        created_row = cursor.fetchone()
        profile = _row_to_profile(created_row)

        conn.close()
        return profile

    def get_personas(self) -> List[PersonaPreset]:
        """Provides operational persona presets for single-click switching."""
        return [
            PersonaPreset(
                id="chief_oceanographer",
                label="Chief Oceanographer",
                username="chief.oceanographer",
                default_password="Samudra#Command2026!",
                role=UserRole.CHIEF_OCEANOGRAPHER,
                clearance=ClearanceLevel.LEVEL_3_COMMAND,
                description="Executive oceanographer authority. Authorized for forecast certification and anomaly overrides.",
                badge_color="#00f5d4"
            ),
            PersonaPreset(
                id="naval_operations",
                label="Naval Operations",
                username="cmdr.varma",
                default_password="Naval#OpsTactical2026!",
                role=UserRole.NAVAL_OPERATIONS,
                clearance=ClearanceLevel.LEVEL_2_TACTICAL,
                description="Maritime tactical command. Responsible for SAR drift trajectories, currents, and fleet routing.",
                badge_color="#f59e0b"
            ),
            PersonaPreset(
                id="research_observer",
                label="Marine Researcher",
                username="priya.nair",
                default_password="Research#Argo2026!",
                role=UserRole.RESEARCH_OBSERVER,
                clearance=ClearanceLevel.LEVEL_1_RESEARCH,
                description="In-situ observation specialist. Inspects Argo CTD sensor profiles, glider transects, and T-S curves.",
                badge_color="#10b981"
            )
        ]

    def get_audit_logs(self, limit: int = 50) -> List[AuditLogEntry]:
        """Retrieves recent authentication audit events from the database."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT timestamp, user_id, action, status, details FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()

        return [
            AuditLogEntry(
                timestamp=row["timestamp"],
                user_id=row["user_id"],
                action=row["action"],
                status=row["status"],
                details=row["details"]
            )
            for row in rows
        ]

    def get_audit_log(self, limit: int = 50) -> List[AuditLogEntry]:
        """Alias for get_audit_logs."""
        return self.get_audit_logs(limit=limit)

    def _log_audit(self, cursor, user_id: str, action: str, status: str, details: Optional[str] = None, ip: Optional[str] = None):
        """Internal helper to insert audit trail records."""
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            "INSERT INTO audit_logs (timestamp, user_id, action, status, details) VALUES (?, ?, ?, ?, ?)",
            (now, user_id, action, status, details)
        )

# Module-level singleton
auth_service = AuthService()
