"""
SAMUDRA-3D In-Depth Ocean Physical & Acoustic Analysis Tests
Authority: UNESCO EOS-80, Mackenzie (1981) Sound Velocity, Hobday et al. (2016) Marine Heatwaves
Phase 04: Missing-data physics contract, input validation, and genuine zero preservation.
"""
import math
import sys
import unittest
from pathlib import Path

root_dir = Path(__file__).resolve().parents[2]
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.depth_analysis import (
    calculate_sound_velocity,
    calculate_potential_density,
    calculate_buoyancy_frequency,
    classify_water_mass,
    analyze_in_depth_column
)

client = TestClient(app)


class TestDepthAnalysis(unittest.TestCase):
    def setUp(self):
        from backend.app.services.ocean_service import ocean_service
        ocean_service.set_active_dataset("incois_roms_synthetic")

    def test_mackenzie_sound_velocity(self):
        """Tests Mackenzie (1981) formula for typical surface tropical seawater."""
        # T=28°C, S=35 PSU, Depth=0m -> c should be ~1540 m/s
        c_surface = calculate_sound_velocity(temp_c=28.0, sal_psu=35.0, depth_m=0.0)
        self.assertIsNotNone(c_surface)
        self.assertGreater(c_surface, 1530.0)
        self.assertLess(c_surface, 1550.0)

        # Deep cold water: T=2°C, S=34.8 PSU, Depth=4000m -> pressure increases c
        c_deep = calculate_sound_velocity(temp_c=2.0, sal_psu=34.8, depth_m=4000.0)
        self.assertIsNotNone(c_deep)
        self.assertGreater(c_deep, 1510.0)
        self.assertLess(c_deep, 1540.0)

        # Intermediate cold water without extreme pressure (SOFAR axis region): T=6°C, S=35 PSU, D=1000m
        c_sofar = calculate_sound_velocity(temp_c=6.0, sal_psu=35.0, depth_m=1000.0)
        self.assertIsNotNone(c_sofar)
        # Should be lower than both surface warm water and abyssal high-pressure water
        self.assertLess(c_sofar, c_surface)

    def test_unesco_eos80_potential_density(self):
        """Tests UNESCO EOS-80 potential density anomaly sigma_theta."""
        # Warm low-salinity surface water (T=28°C, S=32 PSU) -> low density
        sigma_warm = calculate_potential_density(temp_c=28.0, sal_psu=32.0)
        self.assertIsNotNone(sigma_warm)
        self.assertGreater(sigma_warm, 18.0)
        self.assertLess(sigma_warm, 22.0)

        # Cold saline deep water (T=2°C, S=35 PSU) -> high density
        sigma_cold = calculate_potential_density(temp_c=2.0, sal_psu=35.0)
        self.assertIsNotNone(sigma_cold)
        self.assertGreater(sigma_cold, 27.0)
        self.assertLess(sigma_cold, 29.0)
        self.assertGreater(sigma_cold, sigma_warm)

    def test_brunt_vaisala_buoyancy_frequency(self):
        """Tests Brunt-Väisälä buoyancy frequency calculation and stability status."""
        depths = [0.0, 50.0, 100.0, 200.0]
        sigmas = [21.0, 22.5, 24.5, 26.0]  # Stable density increase with depth
        n2_profile = calculate_buoyancy_frequency(depths, sigmas)

        self.assertEqual(len(n2_profile), 3)
        for layer in n2_profile:
            self.assertGreater(layer["n2_rad2_s2"], 0)
            self.assertEqual(layer["stability"], "STABLE")
            self.assertIsNotNone(layer["buoyancy_period_minutes"])

    def test_water_mass_classification(self):
        """Tests classification of regional Indian Ocean water masses."""
        # Bay of Bengal Surface Water (S < 33.2, lon >= 80)
        bob = classify_water_mass(temp_c=29.0, sal_psu=31.5, depth_m=20.0, lat=15.0, lon=85.0)
        self.assertIsNotNone(bob)
        self.assertEqual(bob["code"], "BBW")

        # Arabian Sea High Salinity Water (S >= 35.6, lon < 78)
        asw = classify_water_mass(temp_c=27.0, sal_psu=36.2, depth_m=30.0, lat=18.0, lon=65.0)
        self.assertIsNotNone(asw)
        self.assertEqual(asw["code"], "ASW")

        # Persian Gulf Outflow Water (200-400m, high salinity, NW Arabian Sea)
        pgw = classify_water_mass(temp_c=20.0, sal_psu=36.8, depth_m=250.0, lat=22.0, lon=62.0)
        self.assertIsNotNone(pgw)
        self.assertEqual(pgw["code"], "PGW")

        # Antarctic Intermediate Water (800-1500m, low salinity)
        aaiw = classify_water_mass(temp_c=5.0, sal_psu=34.4, depth_m=1000.0, lat=5.0, lon=75.0)
        self.assertIsNotNone(aaiw)
        self.assertEqual(aaiw["code"], "AAIW")

    def test_analyze_in_depth_column_reference(self):
        """Tests full column analytical integration for a finite reference column."""
        depths = [0.0, 50.0, 100.0, 200.0, 500.0, 1000.0, 2000.0, 4000.0]
        temperatures = [28.5, 27.8, 22.0, 16.0, 10.0, 6.5, 3.2, 1.8]
        salinities = [32.5, 33.0, 34.8, 35.2, 35.0, 34.8, 34.7, 34.72]

        analysis = analyze_in_depth_column(
            lat=14.0,
            lon=88.0,
            depths=depths,
            temperatures=temperatures,
            salinities=salinities
        )

        self.assertIn("acoustics", analysis)
        self.assertIn("stratification", analysis)
        self.assertIn("marine_heatwave", analysis)
        self.assertIn("water_masses", analysis)

        # SOFAR axis depth should be identified
        self.assertIsNotNone(analysis["acoustics"]["sofar_channel_axis_depth_m"])
        self.assertGreaterEqual(analysis["acoustics"]["sofar_channel_axis_depth_m"], 500.0)
        # Pycnocline depth should be in thermocline region (50-200m)
        self.assertIsNotNone(analysis["stratification"]["pycnocline_depth_m"])
        self.assertGreaterEqual(analysis["stratification"]["pycnocline_depth_m"], 50.0)
        self.assertLessEqual(analysis["stratification"]["pycnocline_depth_m"], 200.0)
        self.assertEqual(analysis["stratification"]["stability_status"], "STABLE_STRATIFIED")
        self.assertIsNotNone(analysis["water_masses"]["dominant_water_mass"])

    # ──────────────────────────────────────────────────────────────────────────
    # Phase 04 Required Meaningful Physics & Missing-Data Contract Tests
    # ──────────────────────────────────────────────────────────────────────────

    def test_all_null_inputs(self):
        """Phase 04: All-null measurements produce explicit unavailable outputs without invented fallbacks."""
        depths = [0.0, 50.0, 100.0, 200.0]
        temperatures = [None, None, None, None]
        salinities = [None, None, None, None]

        analysis = analyze_in_depth_column(
            lat=15.0,
            lon=85.0,
            depths=depths,
            temperatures=temperatures,
            salinities=salinities
        )

        # Acoustics must be unavailable
        self.assertIsNone(analysis["acoustics"]["surface_sound_speed_mps"])
        self.assertIsNone(analysis["acoustics"]["sofar_channel_axis_depth_m"])
        self.assertIsNone(analysis["acoustics"]["sofar_minimum_sound_speed_mps"])
        self.assertIsNone(analysis["acoustics"]["sound_speed_gradient_mps_per_100m"])
        self.assertEqual(analysis["acoustics"]["acoustic_duct_type"], "UNAVAILABLE")
        self.assertIsNotNone(analysis["acoustics"]["explanation"])

        # Stratification must be unavailable
        self.assertIsNone(analysis["stratification"]["surface_density_sigma"])
        self.assertIsNone(analysis["stratification"]["bottom_density_sigma"])
        self.assertIsNone(analysis["stratification"]["pycnocline_depth_m"])
        self.assertIsNone(analysis["stratification"]["maximum_density_gradient_kg_m4"])
        self.assertEqual(analysis["stratification"]["stability_status"], "UNAVAILABLE")
        self.assertEqual(analysis["stratification"]["brunt_vaisala_profile"], [])

        # Marine heatwave must be unavailable (not fake NO_HEATWAVE or zero risk)
        self.assertEqual(analysis["marine_heatwave"]["status"], "UNAVAILABLE")
        self.assertIsNone(analysis["marine_heatwave"]["surface_anomaly_celsius"])
        self.assertIsNone(analysis["marine_heatwave"]["subsurface_penetration_depth_m"])
        self.assertEqual(analysis["marine_heatwave"]["ecological_stress_level"], "UNAVAILABLE")

        # Water mass must be unavailable (not default STW)
        self.assertIsNone(analysis["water_masses"]["dominant_water_mass"])

        # Vertical profile must preserve depths and align nulls
        self.assertEqual(len(analysis["water_masses"]["vertical_profile"]), 4)
        for lvl in analysis["water_masses"]["vertical_profile"]:
            self.assertIsNone(lvl["temperature"])
            self.assertIsNone(lvl["salinity"])
            self.assertIsNone(lvl["sound_speed"])
            self.assertIsNone(lvl["density_sigma"])
            self.assertIsNone(lvl["water_mass"])

    def test_missing_only_salinity(self):
        """Phase 04: Missing only salinity preserves temperature, while density/sound-speed/water-mass are unavailable."""
        depths = [0.0, 50.0, 100.0, 200.0]
        temperatures = [28.5, 27.0, 22.0, 16.0]
        salinities = [None, None, None, None]

        analysis = analyze_in_depth_column(
            lat=15.0,
            lon=85.0,
            depths=depths,
            temperatures=temperatures,
            salinities=salinities
        )

        # Temperature is preserved in vertical profile; salinity is None
        for i, lvl in enumerate(analysis["water_masses"]["vertical_profile"]):
            self.assertEqual(lvl["temperature"], temperatures[i])
            self.assertIsNone(lvl["salinity"])
            self.assertIsNone(lvl["sound_speed"])
            self.assertIsNone(lvl["density_sigma"])
            self.assertIsNone(lvl["water_mass"])

        # Derived metrics requiring salinity must be unavailable
        self.assertEqual(analysis["acoustics"]["acoustic_duct_type"], "UNAVAILABLE")
        self.assertEqual(analysis["stratification"]["stability_status"], "UNAVAILABLE")
        self.assertIsNone(analysis["water_masses"]["dominant_water_mass"])

        # Temperature-only metric (MHW) is preserved and computed
        self.assertNotEqual(analysis["marine_heatwave"]["status"], "UNAVAILABLE")
        self.assertEqual(analysis["marine_heatwave"]["surface_anomaly_celsius"], 0.5)

    def test_missing_only_temperature(self):
        """Phase 04: Missing only temperature preserves salinity, while density/sound-speed/MHW are unavailable."""
        depths = [0.0, 50.0, 100.0, 200.0]
        temperatures = [None, None, None, None]
        salinities = [33.0, 33.5, 34.8, 35.2]

        analysis = analyze_in_depth_column(
            lat=15.0,
            lon=85.0,
            depths=depths,
            temperatures=temperatures,
            salinities=salinities
        )

        for i, lvl in enumerate(analysis["water_masses"]["vertical_profile"]):
            self.assertIsNone(lvl["temperature"])
            self.assertEqual(lvl["salinity"], salinities[i])
            self.assertIsNone(lvl["sound_speed"])
            self.assertIsNone(lvl["density_sigma"])

        self.assertEqual(analysis["marine_heatwave"]["status"], "UNAVAILABLE")
        self.assertIsNone(analysis["marine_heatwave"]["surface_anomaly_celsius"])

    def test_one_invalid_middle_level(self):
        """
        Phase 04: One invalid middle level:
        - Valid levels compute and preserve supported metrics requiring fewer inputs.
        - Stratification and gradient summaries do not bridge the invalid gap.
        - Derived column axes (SOFAR axis, pycnocline depth) explain insufficient coverage.
        """
        depths = [0.0, 50.0, 100.0, 200.0]
        temperatures = [28.5, None, 22.0, 16.0]
        salinities = [33.0, None, 34.8, 35.2]

        analysis = analyze_in_depth_column(
            lat=15.0,
            lon=85.0,
            depths=depths,
            temperatures=temperatures,
            salinities=salinities
        )

        # Levels 0, 2, 3 have computed physics; Level 1 is unavailable
        vp = analysis["water_masses"]["vertical_profile"]
        self.assertIsNotNone(vp[0]["sound_speed"])
        self.assertIsNone(vp[1]["sound_speed"])
        self.assertIsNotNone(vp[2]["sound_speed"])
        self.assertIsNotNone(vp[3]["sound_speed"])

        # Surface metrics requiring fewer inputs are preserved
        self.assertIsNotNone(analysis["acoustics"]["surface_sound_speed_mps"])
        self.assertIsNotNone(analysis["stratification"]["surface_density_sigma"])
        self.assertIsNotNone(analysis["stratification"]["bottom_density_sigma"])

        # Column-wide summaries must NOT bridge the invalid gap
        self.assertIsNone(analysis["acoustics"]["sound_speed_gradient_mps_per_100m"])
        self.assertIsNone(analysis["acoustics"]["sofar_channel_axis_depth_m"])
        self.assertEqual(analysis["acoustics"]["acoustic_duct_type"], "UNAVAILABLE")

        self.assertIsNone(analysis["stratification"]["pycnocline_depth_m"])
        self.assertIsNone(analysis["stratification"]["maximum_density_gradient_kg_m4"])
        self.assertEqual(analysis["stratification"]["stability_status"], "UNAVAILABLE")

        # Buoyancy frequency only computes for the continuous layer (100m to 200m), without bridging 0m-100m
        bv = analysis["stratification"]["brunt_vaisala_profile"]
        self.assertEqual(len(bv), 1)
        self.assertEqual(bv[0]["mid_depth"], 150.0)

    def test_nonfinite_values(self):
        """Phase 04: Nonfinite values (NaN, Inf, -Inf) are treated as invalid levels without crashing."""
        depths = [0.0, 50.0, 100.0, 200.0]
        temperatures = [28.5, float('nan'), 22.0, float('inf')]
        salinities = [33.0, 33.5, float('-inf'), 35.2]

        analysis = analyze_in_depth_column(
            lat=15.0,
            lon=85.0,
            depths=depths,
            temperatures=temperatures,
            salinities=salinities
        )

        vp = analysis["water_masses"]["vertical_profile"]
        self.assertIsNotNone(vp[0]["sound_speed"])
        self.assertIsNone(vp[1]["temperature"])
        self.assertIsNone(vp[1]["sound_speed"])
        self.assertIsNone(vp[2]["salinity"])
        self.assertIsNone(vp[2]["sound_speed"])
        self.assertIsNone(vp[3]["temperature"])
        self.assertIsNone(vp[3]["sound_speed"])

        # Summaries report unavailable due to nonfinite gaps
        self.assertIsNone(analysis["acoustics"]["sofar_channel_axis_depth_m"])
        self.assertIsNone(analysis["stratification"]["pycnocline_depth_m"])

    def test_insufficient_levels_and_misaligned_arrays(self):
        """Phase 04: Rejects insufficient depth levels (<2) and misaligned arrays with ValueError."""
        # Single depth level (insufficient for column physics)
        with self.assertRaises(ValueError) as ctx1:
            analyze_in_depth_column(15.0, 85.0, [0.0], [28.0], [35.0])
        self.assertIn("at least 2 depth levels required", str(ctx1.exception))

        # Misaligned array lengths
        with self.assertRaises(ValueError) as ctx2:
            analyze_in_depth_column(15.0, 85.0, [0.0, 50.0], [28.0], [35.0, 35.0])
        self.assertIn("Inconsistent array lengths", str(ctx2.exception))

        # Nonfinite depth
        with self.assertRaises(ValueError) as ctx3:
            analyze_in_depth_column(15.0, 85.0, [0.0, float('nan')], [28.0, 25.0], [35.0, 35.0])
        self.assertIn("depths must be finite", str(ctx3.exception))

        # Nonfinite coordinates
        with self.assertRaises(ValueError) as ctx4:
            analyze_in_depth_column(float('nan'), 85.0, [0.0, 50.0], [28.0, 25.0], [35.0, 35.0])
        self.assertIn("Latitude and longitude must be finite", str(ctx4.exception))

    def test_genuine_zero_inputs(self):
        """Phase 04: Genuine zero measurements (0°C, 0 PSU, 0m depth) are preserved and computed, not treated as missing."""
        depths = [0.0, 10.0, 50.0]
        temperatures = [0.0, 0.0, 0.0]
        salinities = [0.0, 0.0, 0.0]

        analysis = analyze_in_depth_column(
            lat=10.0,
            lon=80.0,
            depths=depths,
            temperatures=temperatures,
            salinities=salinities
        )

        vp = analysis["water_masses"]["vertical_profile"]
        self.assertEqual(vp[0]["temperature"], 0.0)
        self.assertEqual(vp[0]["salinity"], 0.0)
        self.assertIsNotNone(vp[0]["sound_speed"])
        self.assertIsNotNone(vp[0]["density_sigma"])

        # Surface sound speed with T=0, S=0, D=0 is Mackenzie constant term 1448.96 - 1.340*35 = 1402.06 m/s
        self.assertEqual(analysis["acoustics"]["surface_sound_speed_mps"], 1402.06)
        self.assertIsNotNone(analysis["stratification"]["surface_density_sigma"])
        self.assertNotEqual(analysis["acoustics"]["acoustic_duct_type"], "UNAVAILABLE")

    def test_in_depth_analysis_api_endpoint(self):
        """Tests GET /api/ocean/in-depth-analysis endpoint."""
        r = client.get("/api/ocean/in-depth-analysis?lat=12.0&lon=82.0&time_idx=0")
        self.assertEqual(r.status_code, 200)
        data = r.json()

        self.assertIn("acoustics", data)
        self.assertIn("stratification", data)
        self.assertIn("water_masses", data)
        self.assertIn("marine_heatwave", data)
        self.assertIn("sst", data)
        self.assertIn("mld", data)
        self.assertIn("d20", data)
        self.assertIn("tchp", data)
        self.assertIsNotNone(data["acoustics"]["sofar_channel_axis_depth_m"])
        self.assertIsNotNone(data["stratification"]["maximum_density_gradient_kg_m4"])


    def test_duplicate_depths_rejected(self):
        """Phase 04 Correction: Duplicate depths must be rejected with ValueError rather than producing -1 gradient or fake pycnocline."""
        with self.assertRaises(ValueError) as ctx:
            analyze_in_depth_column(
                lat=12.0,
                lon=82.0,
                depths=[50.0, 50.0],
                temperatures=[28.0, 20.0],
                salinities=[35.0, 35.0]
            )
        self.assertIn("strictly increasing and distinct", str(ctx.exception))

    def test_descending_depths_rejected(self):
        """Phase 04 Correction: Descending depth profiles must be rejected with ValueError."""
        with self.assertRaises(ValueError) as ctx:
            analyze_in_depth_column(
                lat=12.0,
                lon=82.0,
                depths=[100.0, 50.0],
                temperatures=[22.0, 28.0],
                salinities=[35.0, 34.0]
            )
        self.assertIn("strictly increasing and distinct", str(ctx.exception))

    def test_sound_speed_gradient_nonzero_start_depth(self):
        """Phase 04 Correction: Sound speed gradient uses actual sampled depth span (bottom - top) when top depth > 0."""
        depths = [50.0, 200.0]
        temperatures = [26.0, 16.0]
        salinities = [34.5, 35.2]

        analysis = analyze_in_depth_column(
            lat=12.0,
            lon=82.0,
            depths=depths,
            temperatures=temperatures,
            salinities=salinities
        )

        c_top = analysis["water_masses"]["vertical_profile"][0]["sound_speed"]
        c_bot = analysis["water_masses"]["vertical_profile"][1]["sound_speed"]
        expected_grad = round(((c_bot - c_top) / (200.0 - 50.0)) * 100.0, 2)

        self.assertEqual(analysis["acoustics"]["sound_speed_gradient_mps_per_100m"], expected_grad)


if __name__ == "__main__":
    unittest.main()
