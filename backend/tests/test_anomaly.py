"""
SAMUDRA-3D Anomaly Engine Test Suite
"""
import sys
import math
import time
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

root = Path(__file__).resolve().parents[2]
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

from backend.app.main import app
from backend.app.services.anomaly_engine import anomaly_engine

class TestAnomalyEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_anomaly_field_sign_convention_and_points(self):
        """Verify delta = MODEL - OBSERVED, points structure, and physical units."""
        res = self.client.get("/api/anomaly/field?variable=temperature")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["variable"], "temperature")
        self.assertEqual(data["unit"], "degC")
        self.assertGreater(data["total_valid_pairs"], 0)
        self.assertGreater(data["platform_count"], 0)

        # Check every point respects delta = MODEL - OBSERVED
        for pt in data["points"]:
            expected_delta = round(pt["model_value"] - pt["observed_value"], 4)
            self.assertAlmostEqual(pt["delta"], expected_delta, places=3)
            self.assertIn(pt["platform_type"], ["argo", "glider"])
            self.assertGreaterEqual(pt["depth"], 0.0)

    def test_02_threshold_boundary(self):
        """Threshold boundary logic (|delta| >= threshold triggers alert)."""
        # 1. Default threshold 0.5
        res = self.client.get("/api/anomaly/field?variable=temperature&threshold=0.5")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        threshold = data["threshold"]
        self.assertEqual(threshold, 0.5)

        for pt in data["points"]:
            if abs(pt["delta"]) >= 0.5:
                self.assertTrue(pt["is_alert"], f"Point {pt['platform_id']} delta {pt['delta']} should be alert")
            else:
                self.assertFalse(pt["is_alert"], f"Point {pt['platform_id']} delta {pt['delta']} should not be alert")

        # 2. Extreme threshold: 0.0 -> all points must be alert
        res_zero = self.client.get("/api/anomaly/field?variable=temperature&threshold=0.0")
        data_zero = res_zero.json()
        self.assertEqual(data_zero["alert_count"], data_zero["total_valid_pairs"])
        for pt in data_zero["points"]:
            self.assertTrue(pt["is_alert"])

        # 3. Extreme threshold: 999.0 -> zero alerts
        res_high = self.client.get("/api/anomaly/field?variable=temperature&threshold=999.0")
        data_high = res_high.json()
        self.assertEqual(data_high["alert_count"], 0)
        for pt in data_high["points"]:
            self.assertFalse(pt["is_alert"])

    def test_03_qc_and_missing_exclusion(self):
        """Bad QC flags (3, 4) and missing values excluded from anomaly field."""
        res = self.client.get("/api/anomaly/field?variable=temperature")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        for pt in data["points"]:
            self.assertNotIn(pt["qc_flag"], [3, 4], "Bad QC flag should not appear in anomaly field")
            self.assertIsNotNone(pt["observed_value"])
            self.assertIsNotNone(pt["model_value"])
            self.assertIsNotNone(pt["delta"])

    def test_04_depth_range_filter(self):
        """Depth range filtering [depth_min, depth_max]."""
        d_min, d_max = 50.0, 300.0
        res = self.client.get(f"/api/anomaly/field?variable=temperature&depth_min={d_min}&depth_max={d_max}")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        for pt in data["points"]:
            self.assertGreaterEqual(pt["depth"], d_min)
            self.assertLessEqual(pt["depth"], d_max)

        # Inverted range must return 400 Bad Request
        res_inv = self.client.get("/api/anomaly/field?depth_min=400&depth_max=100")
        self.assertEqual(res_inv.status_code, 400)

    def test_05_coverage_bins_and_sparse_disclaimer(self):
        """Coverage bins, support radius, and mandatory sparse disclaimer."""
        res = self.client.get("/api/anomaly/field?variable=temperature")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # Check coverage bins
        self.assertGreater(len(data["coverage_bins"]), 0)
        total_binned = sum(b["count"] for b in data["coverage_bins"])
        self.assertEqual(total_binned, data["total_valid_pairs"])
        for b in data["coverage_bins"]:
            self.assertTrue(b["has_data"])
            self.assertGreater(b["count"], 0)

        # Check sparse policy & disclaimer
        self.assertIn("55", str(data["support_radius_km"]))
        self.assertIn("Sparse observations", data["no_data_warning"])
        self.assertIn("No interpolation", data["no_data_warning"])

    def test_06_summary_endpoint(self):
        """Verify /api/anomaly/summary endpoint structure."""
        res = self.client.get("/api/anomaly/summary")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("temperature", data)
        self.assertIn("salinity", data)
        self.assertEqual(data["temperature"]["variable"], "temperature")
        self.assertEqual(data["salinity"]["variable"], "salinity")
        self.assertGreater(data["platform_count"], 0)

        # Verify D07 explicit deferral record
        self.assertIn("DEFERRED", data["health_score_status"])
        self.assertIn("D07", data["health_score_status"])

    def test_07_invalid_parameters(self):
        """Parameter validation error handling."""
        # Unsupported variable
        res = self.client.get("/api/anomaly/field?variable=current_speed")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Unsupported variable", res.json()["detail"])

        # Negative depth_min -> FastAPI validation 422
        res_neg = self.client.get("/api/anomaly/field?depth_min=-10")
        self.assertEqual(res_neg.status_code, 422)

    def test_08_field_latency(self):
        """Performance check: /api/anomaly/field completes in < 500ms."""
        t0 = time.perf_counter()
        res = self.client.get("/api/anomaly/field?variable=temperature")
        dt_ms = (time.perf_counter() - t0) * 1000.0
        self.assertEqual(res.status_code, 200)
        self.assertLess(dt_ms, 500.0)
        print(f"[OK] Anomaly field endpoint latency: {dt_ms:.2f}ms (< 500ms target)")

if __name__ == "__main__":
    unittest.main(verbosity=2)
