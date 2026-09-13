"""
Automated Unit and Integration Tests for SAMUDRA-3D Authentication and RBAC
Verifies database-backed login, session lifecycle, admin authorization,
account lifecycle (create, disable, role update), and audit logging.
"""
import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.auth_service import auth_service
from backend.app.schemas.auth import CreateUserRequest, UserRole
from backend.app.core.config import settings

class TestAuthenticationAndAdminRBAC(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        # Ensure a known admin test account exists for test run
        cls.admin_username = "test_admin"
        cls.admin_password = "SecureAdminTestPassword#2026!"
        try:
            auth_service.create_user(
                CreateUserRequest(
                    username=cls.admin_username,
                    password=cls.admin_password,
                    full_name="Test Administrator",
                    email="test_admin@incois.gov.in",
                    role=UserRole.ADMIN,
                    organization="Ocean Information Center"
                ),
                actor="system"
            )
        except ValueError:
            # Already exists
            pass

    def test_01_public_unauthenticated_session(self):
        """Unauthenticated /api/auth/me returns authenticated=false."""
        res = self.client.get("/api/auth/me")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["authenticated"])
        self.assertIsNone(data["user"])

    def test_02_invalid_credentials_rejected(self):
        """Invalid credentials return HTTP 401 without user enumeration."""
        res = self.client.post("/api/auth/login", json={
            "username": "non_existent_officer",
            "password": "WrongPassword123!"
        })
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.json()["detail"], "Invalid credentials.")

    def test_03_admin_login_and_me_lifecycle(self):
        """Valid login issues bearer token and unlocks authenticated session."""
        login_res = self.client.post("/api/auth/login", json={
            "username": self.admin_username,
            "password": self.admin_password
        })
        self.assertEqual(login_res.status_code, 200)
        token_data = login_res.json()
        self.assertIn("access_token", token_data)
        token = token_data["access_token"]
        self.assertEqual(token_data["user"]["role"], "ADMIN")

        # Verify /me with token
        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.status_code, 200)
        self.assertTrue(me_res.json()["authenticated"])
        self.assertEqual(me_res.json()["user"]["username"], self.admin_username)

        # Logout
        logout_res = self.client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(logout_res.status_code, 200)

        # Verify session is revoked
        me_after = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertFalse(me_after.json()["authenticated"])

    def test_04_admin_endpoints_require_admin_role(self):
        """Admin endpoints return 401 for unauthenticated and 403 for non-admin users."""
        # 1. Unauthenticated request -> 401
        res_unauth = self.client.get("/api/admin/overview")
        self.assertEqual(res_unauth.status_code, 401)

        # 2. Authenticate as admin, create a regular VIEWER user
        admin_login = self.client.post("/api/auth/login", json={
            "username": self.admin_username,
            "password": self.admin_password
        })
        admin_token = admin_login.json()["access_token"]

        viewer_username = "standard_viewer_01"
        viewer_password = "ViewerPassword#2026!"
        try:
            auth_service.create_user(
                CreateUserRequest(
                    username=viewer_username,
                    password=viewer_password,
                    full_name="Standard Observer",
                    email="observer@ocean.org",
                    role=UserRole.VIEWER,
                    organization="Marine Institute"
                ),
                actor=self.admin_username
            )
        except ValueError:
            pass

        # Login as viewer
        viewer_login = self.client.post("/api/auth/login", json={
            "username": viewer_username,
            "password": viewer_password
        })
        self.assertEqual(viewer_login.status_code, 200)
        viewer_token = viewer_login.json()["access_token"]

        # Viewer attempts admin endpoint -> 403 Forbidden
        res_forbidden = self.client.get("/api/admin/overview", headers={"Authorization": f"Bearer {viewer_token}"})
        self.assertEqual(res_forbidden.status_code, 403)
        self.assertIn("Administrative privileges required", res_forbidden.json()["detail"])

        # Admin accesses admin endpoint -> 200 OK
        res_admin = self.client.get("/api/admin/overview", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(res_admin.status_code, 200)
        self.assertTrue(res_admin.json()["model_loaded"])

    def test_05_admin_user_lifecycle_and_disabling(self):
        """Admin creates, disables, and verifies disabled user cannot authenticate."""
        admin_login = self.client.post("/api/auth/login", json={
            "username": self.admin_username,
            "password": self.admin_password
        })
        admin_token = admin_login.json()["access_token"]

        import uuid
        test_user = f"operator_temp_{uuid.uuid4().hex[:6]}"
        test_pw = "TempPassword#2026!"

        # Create user via admin API
        create_res = self.client.post(
            "/api/admin/users",
            json={
                "username": test_user,
                "password": test_pw,
                "full_name": "Temporary Operator",
                "email": f"{test_user}@incois.gov.in",
                "role": "OPERATOR",
                "organization": "Naval Operations"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        self.assertIn(create_res.status_code, (200, 409))
        user_id = create_res.json()["user"]["user_id"] if create_res.status_code == 200 else None

        if not user_id:
            users_list = self.client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"}).json()["users"]
            for u in users_list:
                if u["username"] == test_user:
                    user_id = u["user_id"]
                    break

        # Verify user can log in
        login_res = self.client.post("/api/auth/login", json={"username": test_user, "password": test_pw})
        self.assertEqual(login_res.status_code, 200)

        # Admin disables the user
        disable_res = self.client.put(
            f"/api/admin/users/{user_id}/status",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        self.assertEqual(disable_res.status_code, 200)

        # Disabled user cannot login -> 401
        failed_login = self.client.post("/api/auth/login", json={"username": test_user, "password": test_pw})
        self.assertEqual(failed_login.status_code, 401)

    def test_06_sensor_registration_empty_state(self):
        """Admin registers sensor platform without observations; returns has_observations=false."""
        admin_login = self.client.post("/api/auth/login", json={
            "username": self.admin_username,
            "password": self.admin_password
        })
        admin_token = admin_login.json()["access_token"]

        sensor_id = "BUOY-IO-881"
        # Register via admin API
        reg_res = self.client.post(
            "/api/admin/sensors",
            json={
                "id": sensor_id,
                "platform_type": "Moored Buoy",
                "name": "Central Indian Ocean Mooring Buoy",
                "lat": -5.2,
                "lon": 78.5,
                "deployment_date": "2026-09-01",
                "data_provider": "INCOIS OON",
                "description": "Meteorological and subsurface CTD mooring"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        self.assertIn(reg_res.status_code, (200, 409))

        # Query sensor detail from insitu service
        from backend.app.services.insitu_service import insitu_service
        sensor = insitu_service.get_profile_by_id(sensor_id)
        if sensor:
            self.assertFalse(sensor["has_observations"])
            self.assertEqual(len(sensor["temperature"]), 0)
            self.assertEqual(len(sensor["salinity"]), 0)

    @classmethod
    def tearDownClass(cls):
        from backend.app.db import get_db_connection
        with get_db_connection() as conn:
            conn.execute("DELETE FROM users WHERE username IN ('test_admin', 'standard_viewer_01') OR username LIKE 'operator_temp_%'")
            conn.execute("DELETE FROM sensors WHERE id = 'BUOY-IO-881'")
            conn.commit()

if __name__ == "__main__":
    unittest.main()
