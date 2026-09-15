"""
SAMUDRA-3D In-Depth Ocean Physical & Acoustic Analysis Tests
Authority: UNESCO EOS-80, Mackenzie (1981) Sound Velocity, Hobday et al. (2016) Marine Heatwaves
"""
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
        self.assertGreater(c_surface, 1530.0)
        self.assertLess(c_surface, 1550.0)

        # Deep cold water: T=2°C, S=34.8 PSU, Depth=4000m -> pressure increases c
        c_deep = calculate_sound_velocity(temp_c=2.0, sal_psu=34.8, depth_m=4000.0)
        self.assertGreater(c_deep, 1510.0)
        self.assertLess(c_deep, 1540.0)

        # Intermediate cold water without extreme pressure (SOFAR axis region): T=6°C, S=35 PSU, D=1000m
        c_sofar = calculate_sound_velocity(temp_c=6.0, sal_psu=35.0, depth_m=1000.0)
        # Should be lower than both surface warm water and abyssal high-pressure water
        self.assertLess(c_sofar, c_surface)

    def test_unesco_eos80_potential_density(self):
        """Tests UNESCO EOS-80 potential density anomaly sigma_theta."""
        # Warm low-salinity surface water (T=28°C, S=32 PSU) -> low density
        sigma_warm = calculate_potential_density(temp_c=28.0, sal_psu=32.0)
        self.assertGreater(sigma_warm, 18.0)
        self.assertLess(sigma_warm, 22.0)

        # Cold saline deep water (T=2°C, S=35 PSU) -> high density
        sigma_cold = calculate_potential_density(temp_c=2.0, sal_psu=35.0)
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
        self.assertEqual(bob["code"], "BBW")

        # Arabian Sea High Salinity Water (S >= 35.6, lon < 78)
        asw = classify_water_mass(temp_c=27.0, sal_psu=36.2, depth_m=30.0, lat=18.0, lon=65.0)
        self.assertEqual(asw["code"], "ASW")

        # Persian Gulf Outflow Water (200-400m, high salinity, NW Arabian Sea)
        pgw = classify_water_mass(temp_c=20.0, sal_psu=36.8, depth_m=250.0, lat=22.0, lon=62.0)
        self.assertEqual(pgw["code"], "PGW")

        # Antarctic Intermediate Water (800-1500m, low salinity)
        aaiw = classify_water_mass(temp_c=5.0, sal_psu=34.4, depth_m=1000.0, lat=5.0, lon=75.0)
        self.assertEqual(aaiw["code"], "AAIW")

    def test_analyze_in_depth_column(self):
        """Tests full column analytical integration."""
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
        self.assertGreaterEqual(analysis["acoustics"]["sofar_channel_axis_depth_m"], 500.0)
        # Pycnocline depth should be in thermocline region (50-200m)
        self.assertGreaterEqual(analysis["stratification"]["pycnocline_depth_m"], 50.0)
        self.assertLessEqual(analysis["stratification"]["pycnocline_depth_m"], 200.0)

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


if __name__ == "__main__":
    unittest.main()
