import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.data.registry import dataset_registry

class OceanVolumeApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_get_volume_synthetic_temperature(self):
        """Verify 3D volume endpoint returns valid structured voxel data for synthetic dataset."""
        response = self.client.get("/api/ocean/volume", params={
            "dataset_id": "incois_roms_synthetic",
            "variable": "temperature",
            "time_idx": 0,
            "max_lon_samples": 20,
            "max_lat_samples": 15,
            "max_depth_samples": 9
        })
        self.assertEqual(response.status_code, 200, f"Error: {response.text}")
        data = response.json()

        # Schema validations
        self.assertIn("dataset", data)
        self.assertIn("variable", data)
        self.assertIn("bounds", data)
        self.assertIn("coordinates", data)
        self.assertIn("values", data)
        self.assertIn("shape", data)
        self.assertIn("native_shape", data)
        self.assertIn("render_shape", data)
        self.assertIn("resolution", data)
        self.assertIn("provenance", data)

        nz, ny, nx = data["shape"]
        self.assertEqual(len(data["coordinates"]["longitude"]), nx)
        self.assertEqual(len(data["coordinates"]["latitude"]), ny)
        self.assertEqual(len(data["coordinates"]["depth"]), nz)
        self.assertEqual(len(data["values"]), nz)
        self.assertEqual(len(data["values"][0]), ny)
        self.assertEqual(len(data["values"][0][0]), nx)

        # Check provenance
        self.assertEqual(data["provenance"]["source_mode"], "SYNTHETIC")
        self.assertEqual(data["dataset"]["source_mode"], "SYNTHETIC")

        # Values check
        valid_vals = [
            v for plane in data["values"] for row in plane for v in row if v is not None
        ]
        self.assertTrue(len(valid_vals) > 0, "Expected non-empty valid values in volume")
        if data["min_value"] is not None and data["max_value"] is not None:
            self.assertLessEqual(data["min_value"], data["max_value"])

    def test_get_volume_synthetic_currents(self):
        """Verify currents returns magnitude values along with u_values and v_values."""
        response = self.client.get("/api/ocean/volume", params={
            "dataset_id": "incois_roms_synthetic",
            "variable": "currents",
            "time_idx": 0,
            "max_lon_samples": 10,
            "max_lat_samples": 10,
            "max_depth_samples": 5
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["variable"]["name"], "currents")
        self.assertIsNotNone(data["u_values"])
        self.assertIsNotNone(data["v_values"])
        nz, ny, nx = data["shape"]
        self.assertEqual(len(data["u_values"]), nz)
        self.assertEqual(len(data["u_values"][0]), ny)
        self.assertEqual(len(data["u_values"][0][0]), nx)
        self.assertEqual(len(data["v_values"]), nz)
        self.assertEqual(len(data["v_values"][0]), ny)
        self.assertEqual(len(data["v_values"][0][0]), nx)

    def test_get_volume_glorys_truth_in_depth(self):
        """Verify GLORYS volume reflects real 0.49-92.33m depth limits and never fakes 4000m."""
        glorys_desc = dataset_registry.get_dataset("cmems_mod_glo_phy_my_0.083deg_P1D-m")
        if not glorys_desc or not glorys_desc.local_path:
            self.skipTest("GLORYS dataset not registered locally")

        response = self.client.get("/api/ocean/volume", params={
            "dataset_id": "cmems_mod_glo_phy_my_0.083deg_P1D-m",
            "variable": "temperature",
            "time_idx": 0,
            "min_lon": 65.0,
            "max_lon": 95.0,
            "min_lat": 0.0,
            "max_lat": 25.0,
            "max_lon_samples": 24,
            "max_lat_samples": 20,
            "max_depth_samples": 16
        })
        self.assertEqual(response.status_code, 200, f"Error: {response.text}")
        data = response.json()

        self.assertEqual(data["provenance"]["source_mode"], "REAL_LOCAL")
        self.assertEqual(data["dataset"]["source_mode"], "REAL_LOCAL")

        # Depth limits: must be within 0.49m to 92.33m
        depths = data["coordinates"]["depth"]
        self.assertGreaterEqual(depths[0], 0.4)
        self.assertLessEqual(depths[-1], 95.0, f"Depth exceeded real GLORYS limit: {depths[-1]}m")
        self.assertNotIn(4000.0, depths)

        # Land cells should be None
        has_null = any(
            v is None for plane in data["values"] for row in plane for v in row
        )
        self.assertTrue(has_null, "Expected land cells to be None/null in GLORYS volume")

if __name__ == "__main__":
    unittest.main()
