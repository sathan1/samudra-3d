#!/usr/bin/env python3
"""
Automated Integration and Acceptance Tests for SAMUDRA-3D MoES/INCOIS Authentication
Authority: MoES / INCOIS Operational Ocean Digital Twin Architecture
"""
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parents[2]
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.auth_service import auth_service

def test_auth_suite():
    print("=== SAMUDRA-3D MoES/INCOIS Operational Authentication Test Suite ===")

    with TestClient(app) as client:
        # 1. Test Personas Endpoint
        r_personas = client.get("/api/auth/personas")
        assert r_personas.status_code == 200, f"Personas failed: {r_personas.status_code}"
        personas_data = r_personas.json()["personas"]
        assert len(personas_data) == 3, f"Expected 3 personas, got {len(personas_data)}"

        persona_roles = {p["role"] for p in personas_data}
        assert "CHIEF_OCEANOGRAPHER" in persona_roles
        assert "NAVAL_OPERATIONS" in persona_roles
        assert "RESEARCH_OBSERVER" in persona_roles
        print(f"[OK] GET /api/auth/personas -> HTTP 200 (Found {len(personas_data)} MoES/INCOIS operational personas)")

        # 2. Test Unauthenticated /me Endpoint
        r_unauth = client.get("/api/auth/me")
        assert r_unauth.status_code == 200
        unauth_json = r_unauth.json()
        assert unauth_json["authenticated"] is False
        assert unauth_json["user"] is None
        print("[OK] GET /api/auth/me (no header) -> HTTP 200 (Public Mode confirmed)")

        # 3. Test Invalid Credentials
        r_bad_pw = client.post("/api/auth/login", json={
            "username": "chief.oceanographer",
            "password": "WrongPassword123!"
        })
        assert r_bad_pw.status_code == 401, f"Expected 401 on wrong pw, got {r_bad_pw.status_code}"

        r_bad_user = client.post("/api/auth/login", json={
            "username": "nonexistent.officer",
            "password": "SomePassword!"
        })
        assert r_bad_user.status_code == 401, f"Expected 401 on bad user, got {r_bad_user.status_code}"

        r_empty = client.post("/api/auth/login", json={
            "username": "",
            "password": ""
        })
        assert r_empty.status_code == 400
        print("[OK] POST /api/auth/login -> HTTP 401/400 (Security defenses verified)")

        # 4. Test Successful Login for Each Persona
        # Persona 1: Chief Oceanographer
        r_chief = client.post("/api/auth/login", json={
            "username": "chief.oceanographer",
            "password": "Samudra#Command2026!"
        })
        assert r_chief.status_code == 200, f"Chief login failed: {r_chief.text}"
        chief_token = r_chief.json()["access_token"]
        chief_user = r_chief.json()["user"]
        assert chief_user["role"] == "CHIEF_OCEANOGRAPHER"
        assert chief_user["clearance"] == "LEVEL-3 COMMAND"
        assert chief_user["avatar_initials"] == "MR"
        assert "collocation_export" in chief_user["capabilities"]
        print(f"[OK] Login Chief Oceanographer -> HTTP 200 ({chief_user['display_name']} - {chief_user['clearance']})")

        # Verify Session via /me with Bearer Token
        r_chief_me = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {chief_token}"}
        )
        assert r_chief_me.status_code == 200
        assert r_chief_me.json()["authenticated"] is True
        assert r_chief_me.json()["user"]["username"] == "chief.oceanographer"
        print("[OK] GET /api/auth/me with Bearer token -> Valid session verified")

        # Persona 2: Naval Operations Officer
        r_navy = client.post("/api/auth/login", json={
            "username": "cmdr.varma",
            "password": "Naval#OpsTactical2026!"
        })
        assert r_navy.status_code == 200
        navy_token = r_navy.json()["access_token"]
        navy_user = r_navy.json()["user"]
        assert navy_user["role"] == "NAVAL_OPERATIONS"
        assert navy_user["clearance"] == "LEVEL-2 TACTICAL"
        assert "tactical_current_streamlines" in navy_user["capabilities"]
        print(f"[OK] Login Naval Operations -> HTTP 200 ({navy_user['display_name']} - {navy_user['clearance']})")

        # Persona 3: Marine Research Observer
        r_res = client.post("/api/auth/login", json={
            "username": "priya.nair",
            "password": "Research#Argo2026!"
        })
        assert r_res.status_code == 200
        res_token = r_res.json()["access_token"]
        res_user = r_res.json()["user"]
        assert res_user["role"] == "RESEARCH_OBSERVER"
        assert res_user["clearance"] == "LEVEL-1 RESEARCH"
        assert "deep_ctd_profile_inspection" in res_user["capabilities"]
        print(f"[OK] Login Research Observer -> HTTP 200 ({res_user['display_name']} - {res_user['clearance']})")

        # 5. Test Logout and Session Revocation
        r_logout = client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {chief_token}"}
        )
        assert r_logout.status_code == 200
        assert r_logout.json()["status"] == "success"

        # Verification that revoked token no longer authenticates
        r_revoked_me = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {chief_token}"}
        )
        assert r_revoked_me.status_code == 200
        assert r_revoked_me.json()["authenticated"] is False
        print("[OK] POST /api/auth/logout -> Token invalidated, session revoked")

        # 6. Test Registration into SQLite Database
        new_officer_username = "test.commander"
        r_reg = client.post("/api/auth/register", json={
            "username": new_officer_username,
            "password": "SecurePassword#2026!",
            "full_name": "Lieutenant Commander Ananya",
            "role": "NAVAL_OPERATIONS",
            "clearance": "LEVEL-2 TACTICAL",
            "organization": "Indian Navy Oceanographic Office"
        })
        # If already exists or created:
        assert r_reg.status_code in (200, 409)
        if r_reg.status_code == 200:
            reg_json = r_reg.json()
            assert reg_json["success"] is True
            assert reg_json["user"]["username"] == new_officer_username
            # Verify can login with newly registered credentials
            r_new_login = client.post("/api/auth/login", json={
                "username": new_officer_username,
                "password": "SecurePassword#2026!"
            })
            assert r_new_login.status_code == 200
            print("[OK] POST /api/auth/register & login -> Registered officer credentials verified in SQLite")

        # 7. Test Audit Log
        r_audit = client.get("/api/auth/audit-log")
        assert r_audit.status_code == 200
        audit_records = r_audit.json()
        assert len(audit_records) >= 5
        assert any(rec["status"] == "DENIED" for rec in audit_records)
        assert any(rec["status"] == "SUCCESS" for rec in audit_records)
        print(f"[OK] GET /api/auth/audit-log -> HTTP 200 ({len(audit_records)} audit events logged)")

    print("\nALL MOES/INCOIS AUTHENTICATION TESTS PASSED (100%)\n")

if __name__ == "__main__":
    test_auth_suite()
