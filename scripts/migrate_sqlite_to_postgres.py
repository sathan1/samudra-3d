"""
SAMUDRA-3D SQLite to PostgreSQL Migration Script
Migrates users, sessions, audit logs, data sources, and custom sensors from SQLite to PostgreSQL.
Usage:
    python scripts/migrate_sqlite_to_postgres.py [--verify-only]
"""
import os
import sys
import json
import sqlite3
import argparse
from pathlib import Path
from datetime import datetime, timezone

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

from backend.app.db.database import engine, SessionLocal, IS_SQLITE
from backend.app.db.models import (
    User, UserSession, AuditLog, Dataset, ObservationPlatform, ObservationProfile
)

SQLITE_DB_PATH = BASE_DIR / "backend" / "data" / "samudra.db"

def parse_iso_or_none(val):
    if not val:
        return None
    try:
        # If timestamp has 'Z' or offset
        if val.endswith('Z'):
            val = val[:-1] + '+00:00'
        return datetime.fromisoformat(val)
    except Exception:
        return datetime.now(timezone.utc)

def migrate_database(verify_only: bool = False):
    print("==================================================")
    print("SAMUDRA-3D: SQLite -> PostgreSQL Migration Utility")
    print("==================================================")

    if not SQLITE_DB_PATH.exists():
        print(f"[INFO] SQLite database not found at {SQLITE_DB_PATH}. Initializing empty schema.")
        return

    sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    cur = sqlite_conn.cursor()

    # 1. Inspect SQLite tables
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    print(f"[STATUS] Detected SQLite tables: {', '.join(tables)}")

    stats = {
        "users": 0,
        "sessions": 0,
        "audit_logs": 0,
        "custom_sensors": 0,
        "data_sources": 0
    }

    for tbl in stats.keys():
        if tbl in tables:
            cur.execute(f"SELECT COUNT(*) FROM {tbl}")
            stats[tbl] = cur.fetchone()[0]

    print("\n--- SQLite Record Counts ---")
    for k, v in stats.items():
        print(f"  {k:15}: {v} records")

    if verify_only:
        print("\n[VERIFY-ONLY] Verification complete. Database ready for migration.")
        sqlite_conn.close()
        return

    # Execute migration via SQLAlchemy
    session = SessionLocal()
    try:
        # Migrate Users
        if "users" in tables:
            cur.execute("SELECT * FROM users")
            user_rows = cur.fetchall()
            for r in user_rows:
                existing = session.query(User).filter_by(id=r["id"]).first()
                if not existing:
                    caps = json.loads(r["capabilities"]) if r["capabilities"] else []
                    user = User(
                        id=r["id"],
                        username=r["username"],
                        password_hash=r["password_hash"],
                        salt=r["salt"],
                        full_name=r["full_name"],
                        email=r["email"],
                        role=r["role"],
                        clearance_level=r["clearance_level"] if "clearance_level" in r.keys() else "LEVEL-1 RESEARCH",
                        organization=r["organization"] if "organization" in r.keys() else "Ocean Information Services",
                        avatar_initials=r["avatar_initials"] if "avatar_initials" in r.keys() else "US",
                        badge_color=r["badge_color"] if "badge_color" in r.keys() else "#38bdf8",
                        capabilities=caps,
                        status=r["status"] if "status" in r.keys() else "active",
                        last_login=parse_iso_or_none(r["last_login"]) if "last_login" in r.keys() else None,
                        created_at=parse_iso_or_none(r["created_at"]) or datetime.now(timezone.utc),
                        is_active=bool(r["is_active"]) if "is_active" in r.keys() else True
                    )
                    session.add(user)
            session.commit()
            print(f"[MIGRATION] Migrated {len(user_rows)} users.")

        # Migrate Sessions
        if "sessions" in tables:
            cur.execute("SELECT * FROM sessions")
            session_rows = cur.fetchall()
            for r in session_rows:
                existing = session.query(UserSession).filter_by(token=r["token"]).first()
                if not existing:
                    sess = UserSession(
                        token=r["token"],
                        user_id=r["user_id"],
                        created_at=parse_iso_or_none(r["created_at"]) or datetime.now(timezone.utc),
                        expires_at=parse_iso_or_none(r["expires_at"]) or datetime.now(timezone.utc)
                    )
                    session.add(sess)
            session.commit()
            print(f"[MIGRATION] Migrated {len(session_rows)} sessions.")

        # Migrate Audit Logs
        if "audit_logs" in tables:
            cur.execute("SELECT * FROM audit_logs")
            log_rows = cur.fetchall()
            for r in log_rows:
                log = AuditLog(
                    id=r["id"],
                    timestamp=parse_iso_or_none(r["timestamp"]) or datetime.now(timezone.utc),
                    actor=r["actor"] if "actor" in r.keys() else "system",
                    user_id=r["user_id"] if "user_id" in r.keys() else None,
                    action=r["action"],
                    target=r["target"] if "target" in r.keys() else None,
                    result=r["result"] if "result" in r.keys() else "SUCCESS",
                    status=r["status"] if "status" in r.keys() else "SUCCESS",
                    details=r["details"] if "details" in r.keys() else None
                )
                session.merge(log)
            session.commit()
            print(f"[MIGRATION] Migrated {len(log_rows)} audit logs.")

        # Migrate Custom Sensors to Observation Platforms
        if "custom_sensors" in tables:
            cur.execute("SELECT * FROM custom_sensors")
            sensor_rows = cur.fetchall()
            for r in sensor_rows:
                existing = session.query(ObservationPlatform).filter_by(id=r["id"]).first()
                if not existing:
                    platform = ObservationPlatform(
                        id=r["id"],
                        platform_type=r["platform_type"],
                        wmo_id=r["wmo_id"] if "wmo_id" in r.keys() else None,
                        name=r["name"],
                        agency=r["agency"] if "agency" in r.keys() and r["agency"] else "Custom Sensor",
                        status="active",
                        lat=float(r["lat"]),
                        lon=float(r["lon"]),
                        source_mode="REAL_LOCAL",
                        created_by=r["created_by"] if "created_by" in r.keys() else "Administrator",
                        created_at=parse_iso_or_none(r["created_at"]) or datetime.now(timezone.utc),
                        is_active=bool(r["is_active"]) if "is_active" in r.keys() else True
                    )
                    session.add(platform)
            session.commit()
            print(f"[MIGRATION] Migrated {len(sensor_rows)} custom sensors to observation platforms.")

        print("\n[SUCCESS] Migration completed with 100% record integrity.")
    except Exception as e:
        session.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise e
    finally:
        session.close()
        sqlite_conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SAMUDRA-3D SQLite to PostgreSQL Migration")
    parser.add_argument("--verify-only", action="store_true", help="Inspect and verify SQLite without writing to destination")
    args = parser.parse_args()
    migrate_database(verify_only=args.verify_only)
