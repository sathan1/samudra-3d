"""
Unit Tests for SAMUDRA-3D Safe Ocean Download Pipeline & Manifest System
Verifies command generation, safety thresholds, disk headroom validation, and SHA-256 manifests.
"""
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.data.download_manager import (
    download_manager,
    SubsetCommandRequest,
    SafetyLevel,
    compute_file_sha256
)

client = TestClient(app)


class TestDownloadManager(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Ensures at least one manifest fixture exists for CI and fresh clones."""
        if len(download_manager.list_manifests()) == 0:
            from backend.app.core.config import settings
            if settings.SYNTHETIC_NETCDF_PATH.exists():
                download_manager.create_manifest(
                    settings.SYNTHETIC_NETCDF_PATH,
                    dataset_id="cmems_mod_glo_phy_my_0.083deg_P1D-m"
                )

    def test_01_safe_command_generation(self):
        """Tests that a standard regional subset generates a valid CLI command and SAFE status."""
        req = SubsetCommandRequest(
            dataset_id="cmems_mod_glo_phy_my_0.083deg_P1D-m",
            lat_min=10.0,
            lat_max=20.0,
            lon_min=65.0,
            lon_max=75.0,
            depth_min=0.49,
            depth_max=50.0,
            start_date="2025-01-01",
            end_date="2025-01-03",
            variables=["thetao", "so"]
        )
        res = download_manager.generate_command(req)
        self.assertIn("copernicusmarine subset", res.command)
        self.assertIn("--dataset-id cmems_mod_glo_phy_my_0.083deg_P1D-m", res.command)
        self.assertIn("-v thetao -v so", res.command)
        self.assertEqual(res.safety_level, SafetyLevel.SAFE)
        self.assertTrue(res.can_execute_automatically)

    def test_02_safety_cap_blocks_massive_requests(self):
        """Tests that excessive volume (> 1 TB) is flagged as BLOCKED to prevent unbounded global downloads."""
        # Extreme request: global coverage across 50 depths, 1000 days, all variables
        req = SubsetCommandRequest(
            dataset_id="cmems_mod_glo_phy_my_0.083deg_P1D-m",
            lat_min=-80.0,
            lat_max=80.0,
            lon_min=-180.0,
            lon_max=180.0,
            depth_min=0.0,
            depth_max=5000.0,
            start_date="2020-01-01",
            end_date="2025-01-01",  # ~1826 days
            variables=["thetao", "so", "uo", "vo"]
        )
        res = download_manager.generate_command(req)
        self.assertIn(res.safety_level, [SafetyLevel.BLOCKED, SafetyLevel.CRITICAL_WARNING])
        self.assertFalse(res.can_execute_automatically)
        self.assertIn("SAFETY VIOLATION", res.warning_message.upper())

    def test_03_manifest_cataloging_and_sha256(self):
        """Tests that existing NetCDF files are properly indexed with valid SHA-256 hashes."""
        manifests = download_manager.list_manifests()
        self.assertGreater(len(manifests), 0, "Expected at least 1 manifested file in SAMUDRA_DATA/raw")
        first = manifests[0]
        self.assertEqual(len(first.sha256), 64, "SHA-256 hash must be exactly 64 hexadecimal characters")
        self.assertGreater(first.file_size_bytes, 0)
        self.assertIn("[REAL • COPERNICUS]", first.provenance_badge)

    def test_04_api_generate_command_endpoint(self):
        """Tests POST /api/datasets/generate-command."""
        payload = {
            "dataset_id": "cmems_mod_glo_phy_my_0.083deg_P1D-m",
            "lat_min": 5.0,
            "lat_max": 15.0,
            "lon_min": 80.0,
            "lon_max": 90.0,
            "depth_min": 0.49,
            "depth_max": 100.0,
            "start_date": "2025-01-01",
            "end_date": "2025-01-05",
            "variables": ["thetao", "uo", "vo"]
        }
        resp = client.post("/api/datasets/generate-command", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("copernicusmarine subset", data["command"])
        self.assertIn("safety_level", data)
        self.assertIn("estimate", data)

    def test_05_api_manifests_endpoint(self):
        """Tests GET /api/datasets/manifests."""
        resp = client.get("/api/datasets/manifests")
        self.assertEqual(resp.status_code, 200)
        manifests = resp.json()
        self.assertIsInstance(manifests, list)
        self.assertGreater(len(manifests), 0)
        self.assertIn("sha256", manifests[0])
        self.assertIn("file_name", manifests[0])


if __name__ == "__main__":
    unittest.main()
