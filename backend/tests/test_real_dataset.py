"""
SAMUDRA-3D Real Dataset & Dataset Management Acceptance Tests
Tests:
1. Dataset catalog listing (/api/datasets)
2. Download size estimator (/api/datasets/estimate-size)
3. Dynamic runtime dataset switching (/api/datasets/select)
4. Real Copernicus GLORYS12V1 NetCDF slicing, variable mapping, probe, and transect
5. Non-destructive fallback to synthetic baseline
"""
import sys
import unittest
from pathlib import Path

root_dir = Path(__file__).resolve().parents[2]
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.data.registry import dataset_registry
from backend.app.services.ocean_service import ocean_service

client = TestClient(app)

class TestRealDataset(unittest.TestCase):
    def setUp(self):
        # Reset to synthetic before/after test if needed
        pass

    def tearDown(self):
        # Ensure synthetic dataset is restored for other tests
        ocean_service.set_active_dataset("incois_roms_synthetic")

    def test_list_datasets(self):
        """Tests that /api/datasets returns registered real and synthetic models."""
        r = client.get("/api/datasets")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertGreaterEqual(data["total_datasets"], 1)
        ids = [d["dataset_id"] for d in data["datasets"]]
        self.assertIn("incois_roms_synthetic", ids)
        self.assertIn("cmems_mod_glo_phy_my_0.083deg_P1D-m", ids)

    def test_estimate_dataset_size(self):
        """Tests scientific download size calculation against calibrated Copernicus benchmark."""
        req = {
            "variables": ["thetao", "so", "uo", "vo"],
            "lat_min": 0.0,
            "lat_max": 25.0,
            "lon_min": 50.0,
            "lon_max": 100.0,
            "depth_levels_count": 22,
            "days_count": 7,
            "resolution_deg": 0.083333,
            "dtype_bytes": 4
        }
        r = client.post("/api/datasets/estimate-size", json=req)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["dimensions_summary"]["latitude_points"], 301)
        self.assertEqual(data["dimensions_summary"]["longitude_points"], 601)
        self.assertEqual(data["dimensions_summary"]["depth_levels"], 22)
        self.assertEqual(data["dimensions_summary"]["time_steps"], 7)
        # Expected uncompressed ~425 MB
        self.assertGreater(data["raw_size_mb"], 400.0)
        self.assertLess(data["raw_size_mb"], 460.0)
        # Expected compressed ~100-115 MB
        self.assertGreater(data["estimated_compressed_mb"], 90.0)
        self.assertLess(data["estimated_compressed_mb"], 125.0)
        self.assertTrue(data["has_sufficient_disk"])

    def test_real_glorys_activation_and_slicing(self):
        """Tests activating real Copernicus GLORYS12V1 and slicing real physical fields."""
        glorys = dataset_registry.get_dataset("cmems_mod_glo_phy_my_0.083deg_P1D-m")
        if not glorys or not glorys.local_path or not Path(glorys.local_path).exists():
            self.skipTest("Real Copernicus NetCDF file not present on this machine")

        # 1. Switch to GLORYS
        r_select = client.post("/api/datasets/select", json={"dataset_id": "cmems_mod_glo_phy_my_0.083deg_P1D-m"})
        self.assertEqual(r_select.status_code, 200)
        self.assertEqual(r_select.json()["active_dataset"]["source_mode"], "REAL_LOCAL")

        # 2. Verify metadata
        r_meta = client.get("/api/metadata")
        self.assertEqual(r_meta.status_code, 200)
        meta = r_meta.json()
        self.assertEqual(meta["synthetic"], False)
        self.assertEqual(meta["source_mode"], "REAL_LOCAL")
        self.assertEqual(len(meta["depth_levels_m"]), 22)
        self.assertIn("~8.3 km", meta["spatial_resolution"])

        # 3. Macro 2D slice (auto LOD decimation for high-speed 60fps rendering).
        #    Bounds are now REQUIRED — the backend auto-decimates to stay within the
        #    payload budget instead of ever streaming the full 301x601 native grid.
        r_slice = client.get("/api/ocean-data?variable=temperature&depth=0.49&time_idx=0&lat_min=0.0&lat_max=25.0&lon_min=50.0&lon_max=100.0")
        self.assertEqual(r_slice.status_code, 200)
        sl = r_slice.json()
        self.assertEqual(sl["source_mode"], "REAL_LOCAL")
        self.assertEqual(sl["shape"], [151, 301])
        self.assertGreater(sl["valid_count"], 25000)
        self.assertGreater(sl["missing_count"], 5000)
        self.assertGreater(sl["min_val"], 15.0)
        self.assertLess(sl["max_val"], 35.0)

        # 4. Focused regional slice (100% full 8.3 km resolution, step=1)
        r_focus = client.get("/api/ocean-data?variable=temperature&depth=0.49&time_idx=0&lat_min=10.0&lat_max=15.0&lon_min=80.0&lon_max=85.0")
        self.assertEqual(r_focus.status_code, 200)
        f_sl = r_focus.json()
        self.assertEqual(f_sl["resolution"], "~8.3 km (Copernicus GLORYS12V1)")
        self.assertEqual(f_sl["shape"], [61, 61])

        # 5. Probe water column in Bay of Bengal
        r_probe = client.get("/api/ocean/probe?lat=12.0&lon=82.0&time_idx=0")
        self.assertEqual(r_probe.status_code, 200)
        probe = r_probe.json()
        self.assertEqual(len(probe["depths"]), 22)
        self.assertEqual(len(probe["temperature"]), 22)
        self.assertFalse(probe["is_land"])
        self.assertIsNotNone(probe["sst"])
        self.assertIsNotNone(probe["mld"])
        self.assertIsNotNone(probe["d20"])
        self.assertIsNotNone(probe["tchp"])

        # 6. Extract Transect across Bay of Bengal
        r_transect = client.get("/api/ocean/transect?lat1=10.0&lon1=80.0&lat2=15.0&lon2=85.0&variable=temperature&time_idx=0")
        self.assertEqual(r_transect.status_code, 200)
        trans = r_transect.json()
        self.assertEqual(trans["num_points"], 100)
        self.assertEqual(len(trans["depth_levels"]), 22)
        self.assertEqual(len(trans["matrix"]), 22)
        self.assertEqual(len(trans["matrix"][0]), 100)

        # 7. Switch back to synthetic
        r_back = client.post("/api/datasets/select", json={"dataset_id": "incois_roms_synthetic"})
        self.assertEqual(r_back.status_code, 200)
        self.assertEqual(r_back.json()["active_dataset"]["source_mode"], "SYNTHETIC")

        r_meta_synth = client.get("/api/metadata")
        self.assertEqual(r_meta_synth.json()["synthetic"], True)
        self.assertEqual(len(r_meta_synth.json()["depth_levels_m"]), 9)

if __name__ == "__main__":
    unittest.main()
