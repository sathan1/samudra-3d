"""
SAMUDRA-3D Comprehensive End-to-End API Smoke Test
Verifies real Copernicus GLORYS12V1 data flow, 3D volume shape/coordinates/provenance,
point, profile, collocation, anomaly, and download manager endpoints.
"""
import sys
import json
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from backend.app.main import app

def run_smoke_tests():
    from backend.app.services.ocean_service import ocean_service
    from backend.app.data.registry import dataset_registry
    dataset_registry.set_active_dataset("cmems_mod_glo_phy_my_0.083deg_P1D-m")
    ocean_service.set_active_dataset("cmems_mod_glo_phy_my_0.083deg_P1D-m")

    client = TestClient(app)
    results = {}

    print("======================================================================")
    print("SAMUDRA-3D: LIVE API SMOKE TESTS (REAL DATA VERIFICATION)")
    print("======================================================================")

    # 1. Dataset Registry Check
    r = client.get("/api/datasets")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    resp_data = r.json()
    datasets = resp_data.get("datasets", [])
    glorys = next((d for d in datasets if d["dataset_id"] == "cmems_mod_glo_phy_my_0.083deg_P1D-m"), None)
    assert glorys is not None, "Real Copernicus GLORYS12V1 not found in registry"
    assert glorys["source_mode"] == "REAL_LOCAL", f"Expected REAL_LOCAL, got {glorys['source_mode']}"
    assert glorys["depth_range"][0] <= 0.5, f"Expected ~0.49, got {glorys['depth_range'][0]}"
    assert glorys["depth_range"][-1] >= 92.0, f"Expected ~92.33, got {glorys['depth_range'][-1]}"
    print(f"[PASS] 1. Dataset Registry: Found '{glorys['name']}' ({glorys['source_mode']}, {glorys['depth_range'][0]}m-{glorys['depth_range'][-1]}m)")
    results["datasets"] = "PASS"

    # 2. 3D Ocean Volume API Check (Temperature)
    r = client.get(
        "/api/ocean/volume",
        params={
            "dataset_id": "cmems_mod_glo_phy_my_0.083deg_P1D-m",
            "variable": "temperature",
            "time_idx": 0,
            "min_lon": 65.0,
            "max_lon": 80.0,
            "min_lat": 10.0,
            "max_lat": 20.0,
            "depth_min": 0.49,
            "depth_max": 92.33,
            "max_lon_samples": 20,
            "max_lat_samples": 20,
            "max_depth_samples": 10
        }
    )
    assert r.status_code == 200, f"Volume endpoint error: {r.status_code} {r.text}"
    vdata = r.json()
    assert "values" in vdata, "No values key in volume response"
    assert "shape" in vdata, "No shape key in volume response"
    nz, ny, nx = vdata["shape"]
    assert len(vdata["values"]) == nz, f"Expected {nz} depth planes, got {len(vdata['values'])}"
    assert len(vdata["values"][0]) == ny, f"Expected {ny} lat rows, got {len(vdata['values'][0])}"
    assert len(vdata["values"][0][0]) == nx, f"Expected {nx} lon columns, got {len(vdata['values'][0][0])}"
    assert vdata["bounds"]["min_depth"] == 0.49, f"Expected min_depth 0.49, got {vdata['bounds']['min_depth']}"
    assert vdata["bounds"]["max_depth"] <= 92.33, f"Depth exceeded 92.33m: {vdata['bounds']['max_depth']}"
    assert vdata["provenance"]["source_mode"] == "REAL_LOCAL", f"Expected REAL_LOCAL provenance, got {vdata['provenance']['source_mode']}"
    
    # Check land mask presence (None values) and valid ocean temperatures
    has_null = any(val is None for plane in vdata["values"] for row in plane for val in row)
    valid_temps = [val for plane in vdata["values"] for row in plane for val in row if val is not None]
    assert has_null, "Expected land/fill values to be None"
    assert len(valid_temps) > 0, "No valid ocean temperatures found in Arabian Sea region"
    avg_temp = sum(valid_temps) / len(valid_temps)
    assert 15.0 <= avg_temp <= 35.0, f"Ocean temperature out of reasonable physical bounds: {avg_temp}"
    print(f"[PASS] 2. 3D Volume (Temp): shape=[{nz}, {ny}, {nx}], depth=[{vdata['coordinates']['depth'][0]}m..{vdata['coordinates']['depth'][-1]}m], avg_temp={avg_temp:.2f}C, land_masked={has_null}")
    results["volume_temperature"] = "PASS"

    # 3. 3D Ocean Volume API Check (Currents with U, V vectors)
    r = client.get(
        "/api/ocean/volume",
        params={
            "dataset_id": "cmems_mod_glo_phy_my_0.083deg_P1D-m",
            "variable": "currents",
            "time_idx": 0,
            "min_lon": 65.0,
            "max_lon": 80.0,
            "min_lat": 10.0,
            "max_lat": 20.0,
            "max_lon_samples": 15,
            "max_lat_samples": 15,
            "max_depth_samples": 8
        }
    )
    assert r.status_code == 200, f"Volume currents error: {r.status_code}"
    cdata = r.json()
    assert cdata["u_values"] is not None, "Missing u_values in currents volume"
    assert cdata["v_values"] is not None, "Missing v_values in currents volume"
    assert len(cdata["u_values"]) == cdata["shape"][0]
    print(f"[PASS] 3. 3D Volume (Currents): shape={cdata['shape']}, u_values and v_values present")
    results["volume_currents"] = "PASS"

    # 4. Point Interpolation API Check
    r = client.get(
        "/api/ocean/point",
        params={
            "lat": 15.0,
            "lon": 70.0,
            "variable": "temperature",
            "depth": 10.0,
            "time_idx": 0
        }
    )
    assert r.status_code == 200, f"Point API error: {r.status_code} {r.text}"
    pdata = r.json()
    assert pdata["value"] is not None, "Point value is None"
    assert 20.0 <= pdata["value"] <= 33.0, f"Unexpected point temperature: {pdata['value']}"
    print(f"[PASS] 4. Point Query: (15N, 70E, 10m) = {pdata['value']} {pdata['unit']}")
    results["point"] = "PASS"

    # 5. Vertical Profile API Check
    r = client.get(
        "/api/ocean/profile",
        params={
            "lat": 15.0,
            "lon": 70.0,
            "variable": "temperature",
            "time_idx": 0
        }
    )
    assert r.status_code == 200, f"Profile API error: {r.status_code} {r.text}"
    prof_data = r.json()
    assert len(prof_data["depths"]) >= 10, f"Too few depth levels: {len(prof_data['depths'])}"
    assert round(prof_data["depths"][0], 2) == 0.49, f"Expected 0.49m surface level, got {prof_data['depths'][0]}"
    assert round(prof_data["depths"][-1], 2) == 92.33, f"Expected 92.33m base level, got {prof_data['depths'][-1]}"
    print(f"[PASS] 5. Profile Query: {len(prof_data['depths'])} levels from {prof_data['depths'][0]:.2f}m to {prof_data['depths'][-1]:.2f}m")
    results["profile"] = "PASS"

    # 6. Water Column Probe & Derived Metrics Check
    r = client.get("/api/ocean/probe", params={"lat": 15.0, "lon": 70.0, "time_idx": 0})
    assert r.status_code == 200, f"Probe API error: {r.status_code}"
    probe = r.json()
    assert probe["sst"] is not None, "SST is None"
    assert probe["mld"] is not None, "MLD is None"
    assert probe["tchp"] is not None, "TCHP is None"
    print(f"[PASS] 6. Water Column Probe: SST={probe['sst']}C, MLD={probe['mld']}m, D20={probe['d20']}, TCHP={probe['tchp']} kJ/cm2 ({probe['tchp_category']})")
    results["probe"] = "PASS"

    # 7. Real In-situ Fleet (Argo & Moored Buoys)
    r = client.get("/api/insitu/profiles?source_mode=REAL_LOCAL")
    assert r.status_code == 200, f"Insitu error: {r.status_code}"
    insitu_profiles = r.json()
    assert len(insitu_profiles) >= 6, f"Expected >= 6 real profiles, got {len(insitu_profiles)}"
    argo_real = next((p for p in insitu_profiles if "ARGO" in p["id"]), None)
    assert argo_real is not None, "No real Argo profile found"
    print(f"[PASS] 7. In-situ Fleet: {len(insitu_profiles)} real platforms ingested (e.g. {argo_real['id']})")
    results["insitu"] = "PASS"

    # 8. Model vs. Real Argo Collocation & Temporal Boundary Enforcement
    r = client.get("/api/collocation/profile/ARGO_2902210_REAL")
    assert r.status_code == 200, f"Collocation error: {r.status_code}"
    colloc_glorys = r.json()
    # Under GLORYS (2025), a 2026 observation must be honestly rejected with OUT_OF_BOUNDS_TEMPORAL
    rejections = [lvl.get("rejection_reason") for lvl in colloc_glorys.get("temperature_levels", [])]
    assert any("OUT_OF_BOUNDS_TEMPORAL" in (r or "") for r in rejections), "Temporal boundary enforcement failed"
    print(f"[PASS] 8a. Temporal Guard: GLORYS (2025) correctly rejects 2026 profile with OUT_OF_BOUNDS_TEMPORAL (no faked time alignment)")

    # Switch to 2026 ROMS model to verify collocation metrics when time is aligned
    ocean_service.set_active_dataset("incois_roms_synthetic")
    r2 = client.get("/api/collocation/profile/ARGO_2902210_REAL")
    assert r2.status_code == 200
    colloc_aligned = r2.json()
    assert colloc_aligned["temperature"]["valid_pairs"] > 0, "Expected valid pairs when time is aligned"
    assert colloc_aligned["temperature"]["bias"] is not None, "Bias missing in time-aligned collocation"
    assert colloc_aligned["temperature"]["rmse"] is not None, "RMSE missing in time-aligned collocation"
    print(f"[PASS] 8b. Aligned Collocation: ARGO_2902210_REAL against 2026 model: N={colloc_aligned['temperature']['valid_pairs']}, Bias={colloc_aligned['temperature']['bias']:.3f}C, RMSE={colloc_aligned['temperature']['rmse']:.3f}C, Health={colloc_aligned['model_health']}")
    
    # Switch back to GLORYS for subsequent tests
    ocean_service.set_active_dataset("cmems_mod_glo_phy_my_0.083deg_P1D-m")
    results["collocation"] = "PASS"

    # 9. 3D Anomaly Residual Field
    r = client.get("/api/anomaly/field?variable=temperature")
    assert r.status_code == 200, f"Anomaly error: {r.status_code}"
    anom = r.json()
    assert "points" in anom, "Missing points in anomaly field"
    print(f"[PASS] 9. 3D Anomaly Field: {len(anom['points'])} sparse model-observation anomaly points (Platforms: {anom['platform_count']})")
    results["anomaly"] = "PASS"

    # 10. Download Manager Safety Capping
    r = client.post(
        "/api/datasets/generate-command",
        json={
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
    )
    assert r.status_code == 200, f"Generate command error: {r.status_code}"
    cmd_info = r.json()
    assert cmd_info["safety_level"] == "SAFE", f"Expected SAFE, got {cmd_info['safety_level']}"
    assert "copernicusmarine subset" in cmd_info["command"]
    print(f"[PASS] 10. Download Manager: CLI subset command generated (Status={cmd_info['safety_level']}, Estimated={cmd_info.get('estimate', {}).get('estimated_mb', 0):.1f} MB)")
    results["download_manager"] = "PASS"

    print("======================================================================")
    print("ALL 10 REAL DATA API SMOKE TESTS PASSED!")
    print("======================================================================")
    return results

if __name__ == "__main__":
    run_smoke_tests()
