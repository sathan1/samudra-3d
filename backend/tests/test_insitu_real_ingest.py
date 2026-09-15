"""
Unit Tests for SAMUDRA-3D Multi-Platform Real In-situ Ingestion Pipeline
Verifies Argo GDAC, Glider missions, INCOIS moored buoys, satellite thermal front detection, and API source filtering.
"""
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.insitu_service import insitu_service
from backend.app.services.ocean_service import ocean_service
from backend.app.data.registry import dataset_registry
from backend.app.data.incois_ingest import scan_incois_directory
from backend.app.data.argo_ingest import is_in_indian_ocean, sanitize_val, scan_argo_directory
from backend.app.data.glider_ingest import scan_glider_directory
from backend.app.data.satellite_ingest import satellite_manager

client = TestClient(app)


class TestInsituRealIngest(unittest.TestCase):

    def setUp(self):
        # Ensure GLORYS real dataset is active for high-resolution analysis
        if "cmems_mod_glo_phy_my_0.083deg_P1D-m" in dataset_registry._datasets:
            desc = dataset_registry.get_dataset("cmems_mod_glo_phy_my_0.083deg_P1D-m")
            if desc and desc.local_path and Path(desc.local_path).exists():
                ocean_service.set_active_dataset("cmems_mod_glo_phy_my_0.083deg_P1D-m")

    def tearDown(self):
        # Restore default synthetic model for other tests
        ocean_service.set_active_dataset("incois_roms_synthetic")

    def test_01_incois_moored_buoys_ingestion(self):
        """Tests that official INCOIS OMNI moored buoys are loaded with multi-depth thermistor profiles."""
        buoys = scan_incois_directory()
        self.assertGreaterEqual(len(buoys), 5, "Expected at least 5 reference INCOIS moored buoys")
        buoy_ids = [b["id"] for b in buoys]
        self.assertIn("INCOIS_BUOY_BD08", buoy_ids)
        self.assertIn("INCOIS_BUOY_AD01", buoy_ids)

        bd08 = next(b for b in buoys if b["id"] == "INCOIS_BUOY_BD08")
        self.assertEqual(bd08["lat"], 18.15)
        self.assertEqual(bd08["lon"], 89.67)
        self.assertEqual(bd08["metadata"]["provenance_badge"], "[REAL • INCOIS]")
        self.assertIn(500.0, bd08["depths"])
        self.assertEqual(len(bd08["depths"]), len(bd08["temperature"]))

    def test_02_argo_real_ingest_and_domain_filter(self):
        """Tests Argo utility functions: domain bounds checking and missing/fill-value sanitization."""
        # Domain bounds
        self.assertTrue(is_in_indian_ocean(12.5, 80.0))    # Bay of Bengal
        self.assertTrue(is_in_indian_ocean(15.0, 65.0))    # Arabian Sea
        self.assertFalse(is_in_indian_ocean(45.0, -30.0))  # North Atlantic
        self.assertFalse(is_in_indian_ocean(0.0, -140.0))  # Pacific

        # Sanitization
        self.assertIsNone(sanitize_val(None))
        self.assertIsNone(sanitize_val(99999.0))
        self.assertIsNone(sanitize_val(-999.0))
        self.assertEqual(sanitize_val(28.456), 28.456)

    def test_03_glider_ingest_and_waypoints(self):
        """Tests Glider ingestion returns continuous 3D dive/climb waypoints."""
        gliders = insitu_service.get_glider_transects(source_mode="REAL_LOCAL")
        self.assertGreaterEqual(len(gliders), 1, "Expected at least 1 real glider transect")
        g = gliders[0]
        self.assertEqual(g["platform_type"], "glider")
        self.assertGreaterEqual(g["total_waypoints"], 5)

    def test_04_satellite_thermal_fronts(self):
        """Tests spatial temperature gradient vector computation and thermal front extraction."""
        analysis = satellite_manager.get_surface_thermal_analysis(
            lat_min=0.0, lat_max=25.0, lon_min=50.0, lon_max=100.0
        )
        self.assertIn("fronts", analysis)
        self.assertGreater(analysis["total_fronts_detected"], 0)
        front = analysis["fronts"][0]
        self.assertIn("gradient_deg_c_per_km", front)
        self.assertIn("pfz_probability", front)
        self.assertGreaterEqual(front["gradient_deg_c_per_km"], 0.015)

    def test_05_api_insitu_source_modes(self):
        """Tests /api/insitu/profiles with source_mode filtering: SYNTHETIC vs REAL_LOCAL vs ALL."""
        # 1. Default / SYNTHETIC: exactly 4 legacy synthetic profiles
        resp_synth = client.get("/api/insitu/profiles?source_mode=SYNTHETIC")
        self.assertEqual(resp_synth.status_code, 200)
        synth_profiles = resp_synth.json()
        self.assertEqual(len(synth_profiles), 4)

        # 2. REAL_LOCAL: real Argo and INCOIS buoys
        resp_real = client.get("/api/insitu/profiles?source_mode=REAL_LOCAL")
        self.assertEqual(resp_real.status_code, 200)
        real_profiles = resp_real.json()
        self.assertGreaterEqual(len(real_profiles), 6)
        real_ids = [p["id"] for p in real_profiles]
        self.assertIn("ARGO_2902210_REAL", real_ids)
        self.assertIn("INCOIS_BUOY_BD08", real_ids)

        # 3. ALL: union of synthetic, real, and custom sensors
        resp_all = client.get("/api/insitu/profiles?source_mode=ALL")
        self.assertEqual(resp_all.status_code, 200)
        all_profiles = resp_all.json()
        expected_count = len(synth_profiles) + len(real_profiles) + len(insitu_service.custom_profiles)
        self.assertEqual(len(all_profiles), expected_count)


if __name__ == "__main__":
    unittest.main()
