"""
SAMUDRA-3D Underwater Glider Transects Test Suite
"""
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parents[2]
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.insitu_service import insitu_service, PRESSURE_TO_DEPTH_FACTOR

client = TestClient(app)

def test_glider_suite():
    print("=== SAMUDRA-3D Underwater Glider Transects Test Suite ===")

    # 1. System Status with Gliders
    r_stat = client.get("/api/insitu/status")
    assert r_stat.status_code == 200
    stat = r_stat.json()
    assert stat["status"] == "operational"
    assert stat["glider_count"] >= 2
    assert stat["argo_count"] >= 3
    print(f"[OK] In-situ status verified: {stat['total_profiles']} platforms ({stat['glider_count']} gliders, {stat['argo_count']} Argo)")

    # 2. Gliders list endpoint
    r_list = client.get("/api/insitu/gliders")
    assert r_list.status_code == 200
    gliders = r_list.json()
    assert len(gliders) >= 2
    ids = [g["id"] for g in gliders]
    assert "GLIDER_BOB_SG01" in ids
    assert "GLIDER_TEST_GAP_FIXTURE" in ids
    print(f"[OK] GET /api/insitu/gliders returned {len(gliders)} synthetic glider missions")

    # 3. QC Filtering
    r_qc = client.get("/api/insitu/gliders?qc_filter=true")
    assert r_qc.status_code == 200
    qc_gliders = r_qc.json()
    qc_ids = [g["id"] for g in qc_gliders]
    assert "GLIDER_BOB_SG01" in qc_ids
    assert "GLIDER_TEST_GAP_FIXTURE" not in qc_ids
    print("[OK] QC filter successfully excluded GLIDER_TEST_GAP_FIXTURE")

    # 4. Real Local Glider Sample
    r_real = client.get("/api/insitu/gliders?source_mode=REAL_LOCAL")
    assert r_real.status_code == 200
    real_gliders = r_real.json()
    assert len(real_gliders) == 1
    assert real_gliders[0]["id"] == "GLIDER_REAL_INCOIS_SG02"
    assert real_gliders[0]["source_mode"] == "REAL_LOCAL"
    print("[OK] Real local glider sample verified: GLIDER_REAL_INCOIS_SG02")

    # 5. Detailed Glider Mission with 3D Sawtooth Waypoints
    r_bob = client.get("/api/insitu/gliders/GLIDER_BOB_SG01")
    assert r_bob.status_code == 200
    bob = r_bob.json()
    assert bob["id"] == "GLIDER_BOB_SG01"
    assert bob["platform_type"] == "glider"
    assert bob["max_depth"] == 1000.0
    assert bob["total_dives"] == 3
    assert len(bob["waypoints"]) == 25

    # Verify yo-yo dive/climb depth sequence
    wps = bob["waypoints"]
    assert wps[0]["depth"] == 0.0 and wps[0]["phase"] == "surface"
    assert wps[4]["depth"] == 1000.0 and wps[4]["phase"] == "bottom"
    assert wps[8]["depth"] == 0.0 and wps[8]["phase"] == "surface"
    assert wps[12]["depth"] == 1000.0 and wps[12]["phase"] == "bottom"
    print(f"[OK] Sawtooth yo-yo dive/climb waypoints verified (25 waypoints, 3 dive cycles to 1000m)")

    # 6. Gap Fixture Detailed Retrieval
    r_gap = client.get("/api/insitu/gliders/GLIDER_TEST_GAP_FIXTURE")
    assert r_gap.status_code == 200
    gap = r_gap.json()
    assert gap["qc_summary"]["bad"] >= 1
    assert any(wp["qc_flag"] == 4 for wp in gap["waypoints"])
    print("[OK] Gap fixture verified with bad QC flag (flag 4)")

    # 7. Error Handling: 404 for unknown glider
    r_unknown = client.get("/api/insitu/gliders/UNKNOWN_NONEXISTENT_GLIDER")
    assert r_unknown.status_code == 404
    print("[OK] HTTP 404 returned for unknown glider ID")

    print("\nALL GLIDER BACKEND TESTS PASSED (100%)")

if __name__ == "__main__":
    test_glider_suite()
