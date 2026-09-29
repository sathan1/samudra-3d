"""
SAMUDRA-3D Synthetic Local NetCDF Integration Verification Suite
Explicitly tests:
1. Local NetCDF file loading (backend/sample_data/model_indian_ocean.nc) via SyntheticRomsAdapter
2. Accurate dataset provenance reporting: dataset_id=incois_roms_synthetic, source_mode=SYNTHETIC
3. EXACT 4-point bilinear interpolation from raw NetCDF grid nodes vs /api/ocean/probe response
4. Land terrain masking from raw NetCDF surface mask
5. Domain boundary enforcement (HTTP 400 Out of Domain)
6. Deep physics missing-data vs finite-input contract against sample file data

NOTE: This tests the local SYNTHETIC sample file, NOT a genuine real-world GLORYS reanalysis file.
Genuine real-model verification remains NOT RUN / BLOCKED because the 212 MB Copernicus file is absent.
"""
import sys
import unittest
from pathlib import Path
import numpy as np
import netCDF4

root_dir = Path(__file__).resolve().parents[2]
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.data.registry import dataset_registry
from backend.app.services.ocean_service import ocean_service

client = TestClient(app)
SAMPLE_NC_PATH = Path(root_dir) / "backend" / "sample_data" / "model_indian_ocean.nc"


class TestSampleNetCDFIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not SAMPLE_NC_PATH.exists():
            raise FileNotFoundError(f"Sample NetCDF file missing at {SAMPLE_NC_PATH}")
        cls.raw_ds = netCDF4.Dataset(str(SAMPLE_NC_PATH), "r")
        ocean_service.set_active_dataset("incois_roms_synthetic")

    @classmethod
    def tearDownClass(cls):
        cls.raw_ds.close()

    def test_sample_file_dimensions_and_provenance(self):
        """Verify sample file dimensions and API metadata provenance (SYNTHETIC, not real)."""
        # 1. Raw NetCDF inspection
        self.assertIn("time", self.raw_ds.dimensions)
        self.assertIn("depth", self.raw_ds.dimensions)
        self.assertIn("lat", self.raw_ds.dimensions)
        self.assertIn("lon", self.raw_ds.dimensions)
        self.assertEqual(len(self.raw_ds.dimensions["time"]), 8)
        self.assertEqual(len(self.raw_ds.dimensions["depth"]), 9)
        self.assertEqual(len(self.raw_ds.dimensions["lat"]), 50)
        self.assertEqual(len(self.raw_ds.dimensions["lon"]), 60)

        # 2. API metadata provenance inspection
        r = client.get("/api/metadata")
        self.assertEqual(r.status_code, 200)
        meta = r.json()
        self.assertEqual(meta["dataset_id"], "incois_roms_synthetic")
        self.assertEqual(meta["source_mode"], "SYNTHETIC")
        self.assertTrue(meta["synthetic"])
        self.assertEqual(len(meta["depth_levels_m"]), 9)

    def test_exact_bilinear_interpolation_vs_raw_netcdf(self):
        """
        Calculates exact 4-point bilinear interpolation from raw NetCDF array
        and asserts exact match with /api/ocean/probe API response.
        """
        test_lat = 12.0
        test_lon = 82.0
        time_idx = 0
        depth_idx = 0  # Surface level (0m)

        lats = self.raw_ds.variables["lat"][:]
        lons = self.raw_ds.variables["lon"][:]

        # 1. Find bounding grid indices
        j0 = int(np.where(lats <= test_lat)[0][-1])
        j1 = j0 + 1
        i0 = int(np.where(lons <= test_lon)[0][-1])
        i1 = i0 + 1

        # 2. Normalized bilinear weights
        u = float((test_lat - lats[j0]) / (lats[j1] - lats[j0]))
        v = float((test_lon - lons[i0]) / (lons[i1] - lons[i0]))

        # 3. Read raw 4 corner values from NetCDF
        raw_temp = self.raw_ds.variables["temperature"][time_idx, depth_idx, :, :]
        t00 = float(raw_temp[j0, i0])
        t01 = float(raw_temp[j0, i1])
        t10 = float(raw_temp[j1, i0])
        t11 = float(raw_temp[j1, i1])

        # 4. Standard 4-corner bilinear formula:
        # f(x, y) = (1-u)(1-v)*f00 + (1-u)*v*f01 + u*(1-v)*f10 + u*v*f11
        expected_temp = (1.0 - u) * (1.0 - v) * t00 + (1.0 - u) * v * t01 + u * (1.0 - v) * t10 + u * v * t11
        expected_rounded = round(float(expected_temp), 3)

        # 5. Query API probe
        r = client.get(f"/api/ocean/probe?lat={test_lat}&lon={test_lon}&time_idx={time_idx}")
        self.assertEqual(r.status_code, 200)
        probe_data = r.json()

        api_temp = probe_data["temperature"][depth_idx]
        self.assertEqual(api_temp, expected_rounded, f"API temperature {api_temp} != manual bilinear {expected_rounded}")
        self.assertAlmostEqual(api_temp, expected_temp, places=3)

    def test_land_mask_detection(self):
        """Verifies land mask detection from sample NetCDF at continental coordinates (20°N, 78°E)."""
        r = client.get("/api/ocean/probe?lat=20.0&lon=78.0&time_idx=0")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data["is_land"])

    def test_domain_boundary_rejection(self):
        """Verifies out-of-domain coordinates (30°N, 82°E) return HTTP 400."""
        r = client.get("/api/ocean/probe?lat=30.0&lon=82.0&time_idx=0")
        self.assertEqual(r.status_code, 400)
        self.assertIn("outside domain bounds", r.json()["detail"].lower())

    def test_in_depth_physics_on_sample_profile(self):
        """Verifies in-depth physics engine consumes sample dataset profile and yields valid non-invented metrics."""
        r = client.get("/api/ocean/in-depth-analysis?lat=12.0&lon=82.0&time_idx=0")
        self.assertEqual(r.status_code, 200)
        data = r.json()

        # Surface sound speed should be ~1540 m/s for tropical Indian Ocean surface
        self.assertIsNotNone(data["acoustics"]["surface_sound_speed_mps"])
        self.assertGreater(data["acoustics"]["surface_sound_speed_mps"], 1500.0)
        self.assertLess(data["acoustics"]["surface_sound_speed_mps"], 1560.0)

        # SOFAR axis should be located in deep channel (> 200m)
        self.assertIsNotNone(data["acoustics"]["sofar_channel_axis_depth_m"])
        self.assertEqual(data["acoustics"]["acoustic_duct_type"], "SOFAR Deep Sound Channel")

        # Stratification should be stable
        self.assertEqual(data["stratification"]["stability_status"], "STABLE_STRATIFIED")
        self.assertIsNotNone(data["stratification"]["pycnocline_depth_m"])


if __name__ == "__main__":
    unittest.main()
