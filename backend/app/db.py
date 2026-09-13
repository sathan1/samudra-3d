"""
SAMUDRA-3D Persistent SQLite Database Module
Authority: MoES / INCOIS Operational Ocean Digital Twin Architecture
"""
import os
import json
import sqlite3
import hashlib
from datetime import datetime, timezone

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
DB_PATH = os.path.join(DB_DIR, "samudra.db")

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
    """Initializes the database schema and seeds official MoES/INCOIS personas."""
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
        clearance_level TEXT NOT NULL,
        organization TEXT NOT NULL,
        avatar_initials TEXT NOT NULL,
        badge_color TEXT NOT NULL,
        capabilities TEXT NOT NULL,
        created_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
    );
    """)

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
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT
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
        depths TEXT NOT NULL,
        temperature TEXT NOT NULL,
        salinity TEXT NOT NULL,
        surface_temp REAL,
        surface_salinity REAL,
        max_depth REAL,
        agency TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
    );
    """)

    # Check if seed users exist
    cursor.execute("SELECT COUNT(*) as cnt FROM users WHERE username = 'admin'")
    admin_exists = cursor.fetchone()["cnt"] > 0
    now_iso = datetime.now(timezone.utc).isoformat()

    if not admin_exists:
        cursor.execute("""
        INSERT OR IGNORE INTO users (
            id, username, password_hash, salt, full_name, email,
            role, clearance_level, organization, avatar_initials,
            badge_color, capabilities, created_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            "MOES-ADM-000",
            "admin",
            hash_password("Samudra#Admin2026!", "admin_salt_9921"),
            "admin_salt_9921",
            "System Administrator",
            "admin@incois.gov.in",
            "ADMIN",
            "LEVEL-3 COMMAND",
            "INCOIS IT & Ocean Data Center",
            "AD",
            "#38bdf8",
            json.dumps([
                "user_management",
                "sensor_registration",
                "model_forecast_validation",
                "collocation_export",
                "anomaly_threshold_override"
            ]),
            now_iso
        ))

    cursor.execute("SELECT COUNT(*) as cnt FROM users")
    count = cursor.fetchone()["cnt"]

    if count <= 1:
        seeds = [
            (
                "MOES-DIR-001",
                "chief.oceanographer",
                hash_password("Samudra#Command2026!", "moes_salt_918237"),
                "moes_salt_918237",
                "Dr. M. Ravichandran",
                "director@incois.gov.in",
                "CHIEF_OCEANOGRAPHER",
                "LEVEL-3 COMMAND",
                "Ministry of Earth Sciences / INCOIS",
                "MR",
                "#00f5d4",
                json.dumps([
                    "model_forecast_validation",
                    "collocation_export",
                    "anomaly_threshold_override",
                    "executive_diagnostic_query",
                    "fleet_telemetry_control"
                ]),
                now_iso,
                1
            ),
            (
                "NAVY-OPS-4402",
                "cmdr.varma",
                hash_password("Naval#OpsTactical2026!", "navy_salt_482910"),
                "navy_salt_482910",
                "Commander K. Varma",
                "operations@dnom.navy.mil.in",
                "NAVAL_OPERATIONS",
                "LEVEL-2 TACTICAL",
                "Directorate of Naval Oceanology & Meteorology (DNOM)",
                "KV",
                "#f59e0b",
                json.dumps([
                    "tactical_current_streamlines",
                    "acoustic_thermocline_analysis",
                    "platform_fleet_tracking",
                    "sar_drift_assessment",
                    "hazard_discrepancy_alerts"
                ]),
                now_iso,
                1
            ),
            (
                "INCOIS-RES-8831",
                "priya.nair",
                hash_password("Research#Argo2026!", "argo_salt_736152"),
                "argo_salt_736152",
                "Dr. Priya Nair",
                "priya.nair@incois.gov.in",
                "RESEARCH_OBSERVER",
                "LEVEL-1 RESEARCH",
                "INCOIS Ocean Observation Network (OON)",
                "PN",
                "#10b981",
                json.dumps([
                    "deep_ctd_profile_inspection",
                    "ts_diagram_correlation",
                    "glider_sawtooth_verification",
                    "observation_logging",
                    "scientific_assistant_queries"
                ]),
                now_iso,
                1
            )
        ]

        cursor.executemany("""
        INSERT INTO users (
            id, username, password_hash, salt, full_name, email,
            role, clearance_level, organization, avatar_initials,
            badge_color, capabilities, created_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, seeds)

    conn.commit()
    conn.close()

# Initialize immediately on import
init_db()
