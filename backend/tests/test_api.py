#!/usr/bin/env python3
"""
Automated Integration and Acceptance Tests for SAMUDRA-3D FastAPI Endpoints
Authority: Master Handbook physical pp. 5-10, 12, 14; roadmap p. 10 (SIH26067)
"""

import sys
import time
import json
from pathlib import Path
import numpy as np
import netCDF4 as nc

root_dir = Path(__file__).resolve().parents[2]
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.ocean_service import ocean_service

def test_api_suite():
    print("=== SAMUDRA-3D Phase 4 FastAPI Acceptance Test Suite ===")

    # Initialize client within lifespan context
    with TestClient(app) as client:

        # -------------------------------------------------------------
        # 1. Test Root and Health Endpoints
        # -------------------------------------------------------------
        r_root = client.get("/")
        assert r_root.status_code == 200, f"Root status {r_root.status_code}"
        assert r_root.json()["project"] == "SAMUDRA-3D"
        print("[OK] GET / -> HTTP 200 (Identity verified)")

        r_health = client.get("/api/health")
        assert r_health.status_code == 200, f"Health status {r_health.status_code}"
        health_data = r_health.json()
        assert health_data["status"] == "healthy"
        assert health_data["dataset_loaded"] is True
        assert "temperature" in health_data["variables_available"]
        print(f"[OK] GET /api/health -> HTTP 200 (Status: {health_data['status']}, Dataset Loaded: {health_data['dataset_loaded']})")

        # -------------------------------------------------------------
        # 2. Test Metadata Endpoint
        # -------------------------------------------------------------
        r_meta = client.get("/api/metadata")
        assert r_meta.status_code == 200, f"Metadata status {r_meta.status_code}"
        meta = r_meta.json()
        assert meta["conventions"] == "CF-1.8"
        assert meta["dimensions"] == {"time": 8, "depth": 9, "lat": 50, "lon": 60}
        assert set(meta["variables"].keys()) == {"temperature", "salinity", "currents", "u_current", "v_current"}
        assert meta["depth_levels_m"] == [0.0, 10.0, 50.0, 100.0, 200.0, 500.0, 1000.0, 2000.0, 4000.0]
        assert len(meta["time_timestamps"]) == 8
        print(f"[OK] GET /api/metadata -> HTTP 200 (Dimensions: {meta['dimensions']}, Depths: {len(meta['depth_levels_m'])})")

        # -------------------------------------------------------------
        # 3. Test Ocean Data Slicing & Numerical Agreement with NetCDF
        # -------------------------------------------------------------
        # Surface temperature slice at t=0, depth=0
        t0 = time.perf_counter()
        r_data = client.get("/api/ocean-data?variable=temperature&time_idx=0&depth=0&lat_min=0.0&lat_max=25.0&lon_min=65.0&lon_max=95.0")
        latency_ms = (time.perf_counter() - t0) * 1000.0
        payload_bytes = len(r_data.content)

        assert r_data.status_code == 200, f"Data slice status {r_data.status_code}"
        slice_res = r_data.json()

        assert slice_res["variable"] == "temperature"
        assert slice_res["units"] == "degC"
        assert slice_res["time_idx"] == 0
        assert slice_res["requested_depth"] == 0.0
        assert slice_res["selected_depth"] == 0.0
        assert slice_res["shape"] == [50, 60]

        # Verify numerical agreement with direct NetCDF read
        with nc.Dataset(str(ocean_service.nc_path), "r") as ds:
            direct_t = ds.variables["temperature"][0, 0, :, :]
            # Check open ocean point (e.g. index [5, 40] in southern Bay of Bengal)
            assert abs(slice_res["values"][5][40] - round(float(direct_t[5, 40]), 4)) < 1e-4

            # Check land point (e.g. index [35, 20] in central India)
            assert slice_res["values"][35][20] is None, "Land point must be serialized as JSON null"

        assert slice_res["missing_count"] == 703, f"Expected 703 masked land points, got {slice_res['missing_count']}"
        assert slice_res["valid_count"] == (50 * 60) - 703
        print(
            f"[OK] GET /api/ocean-data (temperature, 0m) -> HTTP 200 | "
            f"Shape: {slice_res['shape']}, Masked: {slice_res['missing_count']}, "
            f"Payload: {payload_bytes/1024:.1f} KB, Latency: {latency_ms:.2f} ms"
        )
        assert payload_bytes < 50 * 1024, f"Payload {payload_bytes} bytes exceeds <50 KB target"
        assert latency_ms < 1000.0, f"Latency {latency_ms} ms exceeds sub-second target"

        # -------------------------------------------------------------
        # 4. Test Temporal Slicing (First and Last Forecast Time Steps)
        # -------------------------------------------------------------
        r_t_last = client.get("/api/ocean-data?variable=temperature&time_idx=7&depth=0&lat_min=0.0&lat_max=25.0&lon_min=65.0&lon_max=95.0")
        assert r_t_last.status_code == 200
        assert r_t_last.json()["time_idx"] == 7
        assert r_t_last.json()["timestamp"] == meta["time_timestamps"][7]
        print(f"[OK] Temporal slice boundary verified: time_idx=7 -> {r_t_last.json()['timestamp']}")

        # -------------------------------------------------------------
        # 5. Test Depth Slicing (Surface vs. Deep Ocean Slices)
        # -------------------------------------------------------------
        # Surface slice (0m)
        t_surface = slice_res["max_val"]
        # Abyssal slice (4000m)
        r_deep = client.get("/api/ocean-data?variable=temperature&time_idx=0&depth=4000&lat_min=0.0&lat_max=25.0&lon_min=65.0&lon_max=95.0")
        assert r_deep.status_code == 200
        deep_res = r_deep.json()
        assert deep_res["selected_depth"] == 4000.0
        t_abyss = deep_res["max_val"]
        assert t_surface > 28.0 and t_abyss < 4.0, (
            f"Expected thermal gradient between surface ({t_surface}°C) and abyss ({t_abyss}°C)"
        )
        print(f"[OK] Vertical depth slicing verified: Surface max={t_surface:.2f}°C vs Abyssal max={t_abyss:.2f}°C")

        # Nearest depth selection disclosure
        r_nearest = client.get("/api/ocean-data?variable=temperature&depth=75&lat_min=0.0&lat_max=25.0&lon_min=65.0&lon_max=95.0")
        assert r_nearest.status_code == 200
        near_res = r_nearest.json()
        assert near_res["requested_depth"] == 75.0
        assert near_res["selected_depth"] in [50.0, 100.0]
        print(f"[OK] Nearest depth disclosure verified: requested=75.0m -> selected={near_res['selected_depth']}m")

        # -------------------------------------------------------------
        # 6. Test Spatial Bounding Box Subsetting
        # -------------------------------------------------------------
        r_bbox = client.get("/api/ocean-data?variable=temperature&lat_min=10.0&lat_max=18.0&lon_min=75.0&lon_max=85.0")
        assert r_bbox.status_code == 200
        bbox_res = r_bbox.json()
        assert bbox_res["lats"][0] >= 10.0 and bbox_res["lats"][-1] <= 18.0
        assert bbox_res["lons"][0] >= 75.0 and bbox_res["lons"][-1] <= 85.0
        assert bbox_res["shape"][0] < 50 and bbox_res["shape"][1] < 60
        print(f"[OK] Spatial bounding box subsetting verified: Subgrid shape {bbox_res['shape']}")

        # -------------------------------------------------------------
        # 7. Test Currents and Vector Fields
        # -------------------------------------------------------------
        r_curr = client.get("/api/ocean-data?variable=currents&time_idx=0&depth=0&lat_min=0.0&lat_max=25.0&lon_min=65.0&lon_max=95.0")
        assert r_curr.status_code == 200
        curr_res = r_curr.json()
        assert curr_res["variable"] == "currents"
        assert curr_res["units"] == "m/s"
        assert curr_res["u_values"] is not None
        assert curr_res["v_values"] is not None
        # Check speed calculation speed = sqrt(u^2 + v^2) on valid point
        row, col = 5, 40
        speed_calc = np.sqrt(curr_res["u_values"][row][col]**2 + curr_res["v_values"][row][col]**2)
        assert abs(curr_res["values"][row][col] - round(float(speed_calc), 4)) < 1e-3
        print("[OK] Vector currents verified: speed = sqrt(u^2 + v^2) matches component matrices")

        # -------------------------------------------------------------
        # 8. Test Error Handling and Input Validation
        # -------------------------------------------------------------
        # (A) Unsupported variable
        r_bad_var = client.get("/api/ocean-data?variable=chlorophyll_a&lat_min=0.0&lat_max=25.0&lon_min=65.0&lon_max=95.0")
        assert r_bad_var.status_code == 400
        assert "Unsupported variable" in r_bad_var.json()["detail"]
        print("[OK] Error check: Unsupported variable returns HTTP 400")

        # (B) Out-of-bounds time index
        r_bad_time = client.get("/api/ocean-data?time_idx=99&lat_min=0.0&lat_max=25.0&lon_min=65.0&lon_max=95.0")
        assert r_bad_time.status_code == 400
        assert "out of range" in r_bad_time.json()["detail"]
        print("[OK] Error check: Out-of-bounds time_idx returns HTTP 400")

        # (C) Inverted bounding box
        r_bad_bbox = client.get("/api/ocean-data?lat_min=20.0&lat_max=5.0&lon_min=65.0&lon_max=95.0")
        assert r_bad_bbox.status_code == 400
        assert "Invalid latitude range" in r_bad_bbox.json()["detail"]
        print("[OK] Error check: Inverted lat bounds return HTTP 400")

        # -------------------------------------------------------------
        # 9. Test In-Situ Observation Profiles Endpoint
        # -------------------------------------------------------------
        r_prof = client.get("/api/insitu/profiles")
        assert r_prof.status_code == 200
        profiles = r_prof.json()
        assert len(profiles) == 4
        assert any(p["id"] == "ARGO_2902145" for p in profiles)
        assert any(p["id"] == "GLIDER_INCOIS_04" for p in profiles)
        print(f"[OK] GET /api/insitu/profiles -> HTTP 200 ({len(profiles)} in-situ profiles retrieved)")

        # -------------------------------------------------------------
        # 10. Performance Distribution (10 Warm Requests)
        # -------------------------------------------------------------
        latencies = []
        for _ in range(10):
            t_start = time.perf_counter()
            res = client.get("/api/ocean-data?variable=temperature&time_idx=2&depth=100&lat_min=0.0&lat_max=25.0&lon_min=65.0&lon_max=95.0")
            latencies.append((time.perf_counter() - t_start) * 1000.0)
            assert res.status_code == 200

        avg_lat = sum(latencies) / len(latencies)
        p95_lat = np.percentile(latencies, 95)
        print(f"[OK] Performance benchmark: 10 requests avg={avg_lat:.2f} ms, p95={p95_lat:.2f} ms")
        assert avg_lat < 100.0, f"Average latency {avg_lat} ms should be well under 100ms for in-memory slice"

    print("\nALL PHASE 4 FASTAPI ACCEPTANCE TESTS PASSED (100%)")

if __name__ == "__main__":
    test_api_suite()
