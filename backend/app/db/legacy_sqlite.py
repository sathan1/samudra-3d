"""
SAMUDRA-3D SQLite Compatibility Layer
Maintains backward compatibility for legacy SQLite queries while PostgreSQL is the primary engine.
"""
import os
import json
import sqlite3
import hashlib
import secrets
from datetime import datetime, timezone
from backend.app.core.config import settings

_cand_1 = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "samudra.db")
_cand_2 = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "samudra.db")
DB_PATH = _cand_1 if os.path.exists(_cand_1) else _cand_2
DB_DIR = os.path.dirname(DB_PATH)

def get_db_connection() -> sqlite3.Connection:
    """Returns an active SQLite database connection with row-factory enabled."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str, salt: str) -> str:
    """Derives a PBKDF2-HMAC-SHA256 hex digest for credential storage."""
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100_000
    )
    return key.hex()

def init_db():
    """Initializes the database schema, ensures tables exist, and registers data sources."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL,
        clearance_level TEXT NOT NULL DEFAULT 'LEVEL-1 RESEARCH',
        organization TEXT NOT NULL DEFAULT 'Ocean Information Services',
        avatar_initials TEXT NOT NULL DEFAULT 'US',
        badge_color TEXT NOT NULL DEFAULT '#38bdf8',
        capabilities TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'active',
        last_login TEXT,
        created_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
    );
    """)

    cursor.execute("PRAGMA table_info(users)")
    existing_cols = [col["name"] for col in cursor.fetchall()]
    if "status" not in existing_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'")
    if "last_login" not in existing_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN last_login TEXT")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT,
        result TEXT NOT NULL,
        details TEXT
    );
    """)

    cursor.execute("PRAGMA table_info(audit_logs)")
    audit_cols = [col["name"] for col in cursor.fetchall()]
    if "actor" not in audit_cols:
        cursor.execute("ALTER TABLE audit_logs ADD COLUMN actor TEXT NOT NULL DEFAULT 'system'")
    if "target" not in audit_cols:
        cursor.execute("ALTER TABLE audit_logs ADD COLUMN target TEXT")
    if "result" not in audit_cols:
        cursor.execute("ALTER TABLE audit_logs ADD COLUMN result TEXT NOT NULL DEFAULT 'SUCCESS'")
    if "user_id" not in audit_cols:
        cursor.execute("ALTER TABLE audit_logs ADD COLUMN user_id TEXT DEFAULT 'system'")
    if "status" not in audit_cols:
        cursor.execute("ALTER TABLE audit_logs ADD COLUMN status TEXT DEFAULT 'SUCCESS'")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sensors (
        id TEXT PRIMARY KEY,
        platform_type TEXT NOT NULL,
        name TEXT NOT NULL,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        deployment_date TEXT,
        status TEXT NOT NULL DEFAULT 'deployed',
        data_provider TEXT DEFAULT 'Ocean Observation Network',
        description TEXT,
        created_by TEXT DEFAULT 'Administrator',
        created_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS custom_sensors (
        id TEXT PRIMARY KEY,
        platform_type TEXT NOT NULL,
        name TEXT NOT NULL,
        wmo_id TEXT,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        depths TEXT NOT NULL DEFAULT '[]',
        temperature TEXT NOT NULL DEFAULT '[]',
        salinity TEXT NOT NULL DEFAULT '[]',
        surface_temp REAL,
        surface_salinity REAL,
        max_depth REAL,
        agency TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS data_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        dataset_type TEXT NOT NULL,
        variables TEXT NOT NULL,
        spatial_coverage TEXT NOT NULL,
        temporal_coverage TEXT NOT NULL,
        update_frequency TEXT NOT NULL,
        status TEXT NOT NULL,
        last_updated TEXT NOT NULL,
        description TEXT NOT NULL
    );
    """)

    now_iso = datetime.now(timezone.utc).isoformat()
    official_sources = [
        (
            "src-roms-indian-ocean",
            "ROMS Indian Ocean Hydrodynamic Model",
            "INCOIS / MoES Numerical Ocean Modeling",
            "Numerical Simulation Model",
            json.dumps(["Sea Water Temperature", "Practical Salinity", "Zonal Current (U)", "Meridional Current (V)"]),
            "Indian Ocean Basin (30°S - 30°N, 30°E - 120°E)",
            "48-Hour Forecast Cycle (6-hour intervals)",
            "Every 6 Hours",
            "Active / Verified",
            now_iso,
            "Regional Ocean Modeling System (ROMS) 4D hydrodynamic forecast fields formatted in CF-1.8 compliant NetCDF4."
        ),
        (
            "src-argo-incois-dac",
            "INCOIS-DAC Argo Profiling Float Array",
            "International Argo Program / INCOIS",
            "In-Situ Robotic Profiling Array",
            json.dumps(["Sea Water Temperature", "Practical Salinity", "Hydrostatic Pressure"]),
            "Global / Indian Ocean Distribution",
            "Active Profiling Cycles (10-day drift cycles)",
            "Upon Float Surfacing",
            "Active / Verified",
            now_iso,
            "Autonomous robotic profiling floats measuring temperature and salinity from surface to 2,000 meters depth."
        ),
        (
            "src-incois-seagliders",
            "Lakshadweep & Bay of Bengal Seaglider Missions",
            "INCOIS Ocean Observation Division",
            "Autonomous Underwater Glider Fleet",
            json.dumps(["Sea Water Temperature", "Practical Salinity", "Density (EOS-80)", "Depth Transects"]),
            "Bay of Bengal & Lakshadweep Sea Transects",
            "Continuous Sawtooth Mission Trajectories",
            "Hourly Satellite Surfacing",
            "Active / Verified",
            now_iso,
            "Autonomous buoyancy-driven underwater gliders conducting high-resolution sawtooth sampling across thermocline strata."
        )
    ]

    cursor.executemany("""
    INSERT OR IGNORE INTO data_sources (
        id, name, provider, dataset_type, variables, spatial_coverage,
        temporal_coverage, update_frequency, status, last_updated, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, official_sources)

    admin_username = settings.ADMIN_INITIAL_USERNAME or "admin"
    cursor.execute("SELECT id, password_hash, salt FROM users WHERE username = ?", (admin_username,))
    admin_row = cursor.fetchone()

    if not admin_row:
        salt = secrets.token_hex(16)
        admin_pw = settings.ADMIN_INITIAL_PASSWORD or secrets.token_urlsafe(16)
        pw_hash = hash_password(admin_pw, salt)
        cursor.execute("""
        INSERT INTO users (
            id, username, password_hash, salt, full_name, email,
            role, clearance_level, organization, avatar_initials,
            badge_color, capabilities, status, created_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            "ADM-001",
            admin_username,
            pw_hash,
            salt,
            "System Administrator",
            "admin@samudra.incois.gov.in",
            "ADMIN",
            "LEVEL-3 COMMAND",
            "IT & Ocean Data Center",
            "AD",
            "#38bdf8",
            json.dumps(["all_permissions", "user_management", "sensor_management", "data_sources_management", "audit_inspection"]),
            "active",
            now_iso
        ))

    conn.commit()
    conn.close()

# Auto-init sqlite
init_db()
