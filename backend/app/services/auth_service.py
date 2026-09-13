"""
SAMUDRA-3D Database-Backed Authentication, RBAC & Security Service
Implements PBKDF2-HMAC-SHA256 password hashing, bearer session lifecycle,
role-based authorization, and persistent security audit trails.
"""
import json
import secrets
import hmac
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from backend.app.schemas.auth import (
    UserRole,
    UserProfile,
    TokenResponse,
    AuditLogEntry,
    AdminUserSummary,
    CreateUserRequest,
    DataSourceSummary
)
from backend.app.db import get_db_connection, hash_password

def _row_to_profile(row) -> UserProfile:
    """Converts a database row into a UserProfile."""
    capabilities = []
    if "capabilities" in row.keys() and row["capabilities"]:
        try:
            capabilities = json.loads(row["capabilities"])
        except (json.JSONDecodeError, TypeError):
            capabilities = []

    badge_color = row["badge_color"] if "badge_color" in row.keys() and row["badge_color"] else "#38bdf8"
    clearance = row["clearance_level"] if "clearance_level" in row.keys() and row["clearance_level"] else "LEVEL-1 RESEARCH"
    avatar = row["avatar_initials"] if "avatar_initials" in row.keys() and row["avatar_initials"] else "US"

    return UserProfile(
        user_id=row["id"],
        username=row["username"],
        display_name=row["full_name"],
        role=row["role"],
        clearance=clearance,
        organization=row["organization"] if "organization" in row.keys() else "Ocean Information Services",
        avatar_initials=avatar,
        badge_color=badge_color,
        capabilities=capabilities
    )

class AuthService:
    """Centralized service managing credentials, active sessions, RBAC, and audit logs."""

    def authenticate(self, username: str, password: str, client_ip: Optional[str] = None) -> Optional[TokenResponse]:
        """Authenticates credentials against SQLite. Generic failure response prevents user enumeration."""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1",
            (username.strip(), username.strip())
        )
        row = cursor.fetchone()

        if not row:
            self._log_audit(cursor, username, "LOGIN", username, "DENIED", "Invalid credentials", client_ip)
            conn.commit()
            conn.close()
            return None

        # Check account status
        if "status" in row.keys() and row["status"] == "disabled":
            self._log_audit(cursor, username, "LOGIN", username, "DENIED", "Account is disabled", client_ip)
            conn.commit()
            conn.close()
            return None

        # Constant-time comparison of PBKDF2 hash
        candidate_hash = hash_password(password, row["salt"])
        if not hmac.compare_digest(candidate_hash, row["password_hash"]):
            self._log_audit(cursor, username, "LOGIN", username, "DENIED", "Invalid credentials", client_ip)
            conn.commit()
            conn.close()
            return None

        user_profile = _row_to_profile(row)
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        expires_at = (now + timedelta(seconds=86400)).isoformat()

        # Update last login
        cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (now_iso, user_profile.user_id))

        # Generate bearer token
        token = secrets.token_urlsafe(32)
        cursor.execute(
            "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_profile.user_id, now_iso, expires_at)
        )

        self._log_audit(cursor, user_profile.username, "LOGIN", user_profile.user_id, "SUCCESS", f"Authenticated with role {user_profile.role}", client_ip)

        conn.commit()
        conn.close()

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            expires_in_seconds=86400,
            user=user_profile
        )

    def validate_token(self, token: str) -> Optional[UserProfile]:
        """Validates bearer session token against active non-expired database sessions."""
        if not token:
            return None

        now_iso = datetime.now(timezone.utc).isoformat()
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT users.* FROM sessions
            JOIN users ON sessions.user_id = users.id
            WHERE sessions.token = ? AND sessions.expires_at > ? AND users.is_active = 1
        """, (token, now_iso))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        if "status" in row.keys() and row["status"] == "disabled":
            return None

        return _row_to_profile(row)

    def verify_token(self, token: str) -> Optional[UserProfile]:
        """Alias for validate_token."""
        return self.validate_token(token)

    def revoke_token(self, token: str, client_ip: Optional[str] = None) -> bool:
        """Revokes bearer session token on logout."""
        if not token:
            return False

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT user_id FROM sessions WHERE token = ?", (token,))
        session_row = cursor.fetchone()

        if session_row:
            user_id = session_row["user_id"]
            cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
            self._log_audit(cursor, user_id, "LOGOUT", token[:8] + "...", "SUCCESS", "Session revoked", client_ip)
            conn.commit()
            conn.close()
            return True

        conn.close()
        return False

    def get_all_users(self) -> List[AdminUserSummary]:
        """Retrieves user accounts for administrator inspection."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, username, full_name, email, role, clearance_level, organization,
                   avatar_initials, badge_color, created_at, last_login, is_active, status
            FROM users
            ORDER BY created_at DESC
        """)
        rows = cursor.fetchall()
        conn.close()

        users = []
        for r in rows:
            is_active = bool(r["is_active"])
            if "status" in r.keys() and r["status"] == "disabled":
                is_active = False

            users.append(AdminUserSummary(
                user_id=r["id"],
                username=r["username"],
                display_name=r["full_name"],
                email=r["email"],
                role=r["role"],
                clearance=r["clearance_level"] if "clearance_level" in r.keys() else "LEVEL-1 RESEARCH",
                organization=r["organization"] if "organization" in r.keys() else "Ocean Information Services",
                avatar_initials=r["avatar_initials"] if "avatar_initials" in r.keys() else "US",
                badge_color=r["badge_color"] if "badge_color" in r.keys() else "#38bdf8",
                created_at=r["created_at"],
                last_login=r["last_login"] if "last_login" in r.keys() else None,
                is_active=is_active
            ))
        return users

    def create_user(self, req: CreateUserRequest, actor: str, client_ip: Optional[str] = None) -> UserProfile:
        """Admin creates a new user account with role assignment."""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM users WHERE username = ?", (req.username.strip(),))
        if cursor.fetchone():
            conn.close()
            raise ValueError(f"Username '{req.username}' is already registered.")

        if req.email:
            cursor.execute("SELECT id FROM users WHERE email = ?", (req.email.strip(),))
            if cursor.fetchone():
                conn.close()
                raise ValueError(f"Email '{req.email}' is already registered.")

        user_id = f"USR-{secrets.token_hex(4).upper()}"
        salt = secrets.token_hex(16)
        pw_hash = hash_password(req.password, salt)
        initials = "".join([p[0].upper() for p in req.full_name.split()[:2]]) or "US"
        now_iso = datetime.now(timezone.utc).isoformat()

        clearance = "LEVEL-3 COMMAND" if req.role == UserRole.ADMIN else "LEVEL-2 TACTICAL" if req.role == UserRole.OPERATOR else "LEVEL-1 RESEARCH"
        badge_color = "#38bdf8" if req.role == UserRole.ADMIN else "#10b981" if req.role == UserRole.OPERATOR else "#94a3b8"

        cursor.execute("""
            INSERT INTO users (
                id, username, password_hash, salt, full_name, email,
                role, clearance_level, organization, avatar_initials,
                badge_color, capabilities, status, created_at, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 1)
        """, (
            user_id,
            req.username.strip(),
            pw_hash,
            salt,
            req.full_name.strip(),
            req.email.strip() if req.email else None,
            req.role.value,
            clearance,
            req.organization.strip() if req.organization else "Ocean Information Services",
            initials,
            badge_color,
            json.dumps(["map_view", "observation_view", "analysis_view"]),
            now_iso
        ))

        self._log_audit(cursor, actor, "USER_CREATE", req.username, "SUCCESS", f"Created account {user_id} with role {req.role.value}", client_ip)
        conn.commit()

        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        created_row = cursor.fetchone()
        profile = _row_to_profile(created_row)
        conn.close()
        return profile

    def update_user_status(self, user_id: str, is_active: bool, actor: str, client_ip: Optional[str] = None) -> bool:
        """Enables or disables an account. If disabled, terminates all active sessions."""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT username, role FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return False

        if row["role"] == UserRole.ADMIN.value and not is_active:
            # Prevent disabling the last admin
            cursor.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'ADMIN' AND is_active = 1")
            admin_count = cursor.fetchone()["cnt"]
            if admin_count <= 1:
                conn.close()
                raise ValueError("Cannot disable the sole active system administrator.")

        status_str = "active" if is_active else "disabled"
        int_active = 1 if is_active else 0
        cursor.execute("UPDATE users SET is_active = ?, status = ? WHERE id = ?", (int_active, status_str, user_id))

        if not is_active:
            # Revoke all active sessions immediately
            cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))

        self._log_audit(cursor, actor, "USER_STATUS_CHANGE", user_id, "SUCCESS", f"Set status to {status_str}", client_ip)
        conn.commit()
        conn.close()
        return True

    def update_user_role(self, user_id: str, new_role: UserRole, actor: str, client_ip: Optional[str] = None) -> bool:
        """Updates user role."""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT username, role FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return False

        if row["role"] == UserRole.ADMIN.value and new_role != UserRole.ADMIN:
            cursor.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'ADMIN' AND is_active = 1")
            admin_count = cursor.fetchone()["cnt"]
            if admin_count <= 1:
                conn.close()
                raise ValueError("Cannot demote the sole active system administrator.")

        cursor.execute("UPDATE users SET role = ? WHERE id = ?", (new_role.value, user_id))
        self._log_audit(cursor, actor, "ROLE_CHANGE", user_id, "SUCCESS", f"Changed role to {new_role.value}", client_ip)
        conn.commit()
        conn.close()
        return True

    def reset_password(self, user_id: str, new_password: str, actor: str, client_ip: Optional[str] = None) -> bool:
        """Resets user password and terminates all existing sessions."""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT username FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return False

        salt = secrets.token_hex(16)
        pw_hash = hash_password(new_password, salt)

        cursor.execute("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?", (pw_hash, salt, user_id))
        # Revoke existing sessions so user must log in with new password
        cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))

        self._log_audit(cursor, actor, "PASSWORD_RESET", user_id, "SUCCESS", "Password reset by administrator", client_ip)
        conn.commit()
        conn.close()
        return True

    def get_audit_logs(self, limit: int = 100) -> List[AuditLogEntry]:
        """Retrieves chronological audit events for admin inspection."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, timestamp, actor, action, target, result, details FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()

        return [
            AuditLogEntry(
                id=r["id"],
                timestamp=r["timestamp"],
                actor=r["actor"],
                action=r["action"],
                target=r["target"],
                result=r["result"],
                details=r["details"]
            )
            for r in rows
        ]

    def get_data_sources(self) -> List[DataSourceSummary]:
        """Returns official connected oceanographic datasets."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, provider, dataset_type, variables, spatial_coverage, temporal_coverage, update_frequency, status, last_updated, description FROM data_sources ORDER BY id ASC")
        rows = cursor.fetchall()
        conn.close()

        sources = []
        for r in rows:
            vars_list = []
            try:
                vars_list = json.loads(r["variables"])
            except Exception:
                vars_list = [r["variables"]]

            sources.append(DataSourceSummary(
                id=r["id"],
                name=r["name"],
                provider=r["provider"],
                dataset_type=r["dataset_type"],
                variables=vars_list,
                spatial_coverage=r["spatial_coverage"],
                temporal_coverage=r["temporal_coverage"],
                update_frequency=r["update_frequency"],
                status=r["status"],
                last_updated=r["last_updated"],
                description=r["description"]
            ))
        return sources

    def _log_audit(self, cursor, actor: str, action: str, target: Optional[str], result: str, details: Optional[str] = None, ip: Optional[str] = None):
        """Internal helper for audit logging."""
        now_iso = datetime.now(timezone.utc).isoformat()
        detail_msg = details
        if ip:
            detail_msg = f"[{ip}] {details}" if details else f"[{ip}]"

        cursor.execute(
            "INSERT INTO audit_logs (timestamp, actor, user_id, action, target, status, result, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (now_iso, str(actor), str(actor), str(action), str(target) if target else None, str(result), str(result), detail_msg)
        )

auth_service = AuthService()
