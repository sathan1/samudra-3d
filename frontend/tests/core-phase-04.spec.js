import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('..', 'docs', 'evidence', 'core-phase-04');
mkdirSync(evidenceDir, { recursive: true });

const TEST_DATASET = {
  dataset_id: 'cmems_mod_glo_phy_my_0.083deg_P1D-m',
  name: 'Copernicus GLORYS12V1 Global Reanalysis',
  provider: 'Copernicus Marine Service',
  format: 'NetCDF-4',
  temporal_resolution: 'Daily',
  spatial_resolution: '0.083 degree (~8.3 km)',
  coverage_bounds: { lat_min: 0.0, lat_max: 25.0, lon_min: 50.0, lon_max: 100.0 },
  depth_range: [0.0, 4000.0],
  source_mode: 'REAL_LOCAL',
  status: 'READY'
};

const TEST_METADATA = {
  dataset_id: 'cmems_mod_glo_phy_my_0.083deg_P1D-m',
  name: 'Copernicus GLORYS12V1 Global Reanalysis',
  depth_levels_m: [0.0, 10.0, 50.0, 100.0, 200.0, 500.0, 1000.0, 2000.0, 4000.0],
  time_timestamps: ['2026-09-10T00:00:00Z', '2026-09-10T06:00:00Z'],
  variables: {
    temperature: { name: 'Sea Water Temperature', units: '°C' },
    salinity: { name: 'Sea Water Salinity', units: 'PSU' },
    currents: { name: 'Ocean Currents Velocity', units: 'm/s' }
  }
};

async function triggerProbeAndOpenInDepth(page, lat = 12.0, lon = 82.0) {
  const searchInput = page.locator('input[type="search"]').first();
  await expect(searchInput).toBeVisible({ timeout: 8000 });
  await searchInput.fill(`${lat.toFixed(2)}, ${lon.toFixed(2)}`);

  const searchResultBtn = page.locator('.search-results-dropdown button').first();
  await expect(searchResultBtn).toBeVisible({ timeout: 5000 });
  await searchResultBtn.click();

  const inspector = page.locator('[aria-label="Location Inspector"]');
  await expect(inspector).toBeVisible({ timeout: 8000 });

  const openBtn = inspector.locator('[data-testid="open-indepth-analysis-btn"]');
  await expect(openBtn).toBeVisible({ timeout: 5000 });
  await openBtn.click();

  const modalTitle = page.locator('[data-testid="indepth-modal-title"]');
  await expect(modalTitle).toBeVisible({ timeout: 8000 });
}

test.describe('Core Phase 04: Real Local Data Verification and Missing Physics Inputs', () => {

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.route('**/api/datasets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_dataset_id: TEST_DATASET.dataset_id,
          datasets: [TEST_DATASET]
        })
      });
    });

    await page.route('**/api/metadata', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TEST_METADATA)
      });
    });

    await page.route('**/api/insitu/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('**/api/assistant/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('**/api/datasets/manifests*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible({ timeout: 15000 });
  });

  test('TC-P04-01: In-depth physics modal handles all-null physical measurements with visible concise unavailable states', async ({ page }) => {
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 12.0,
          lon: 82.0,
          time_idx: 0,
          timestamp: '2026-09-10T00:00:00Z',
          is_land: false,
          depths: [0.0, 50.0, 100.0, 200.0],
          temperature: [null, null, null, null],
          salinity: [null, null, null, null],
          sst: null,
          sss: null,
          mld: null,
          d20: null,
          tchp: null
        })
      });
    });

    await page.route('**/api/ocean/in-depth-analysis*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 12.0,
          lon: 82.0,
          max_depth_analyzed: 200.0,
          num_depth_levels: 4,
          acoustics: {
            surface_sound_speed_mps: null,
            sofar_channel_axis_depth_m: null,
            sofar_minimum_sound_speed_mps: null,
            sound_speed_gradient_mps_per_100m: null,
            acoustic_duct_type: 'UNAVAILABLE',
            explanation: 'Cannot determine SOFAR axis: profile contains missing or invalid levels'
          },
          stratification: {
            surface_density_sigma: null,
            bottom_density_sigma: null,
            pycnocline_depth_m: null,
            maximum_density_gradient_kg_m4: null,
            stability_status: 'UNAVAILABLE',
            brunt_vaisala_profile: [],
            explanation: 'Cannot determine pycnocline: density profile contains missing or invalid levels'
          },
          marine_heatwave: {
            status: 'UNAVAILABLE',
            surface_anomaly_celsius: null,
            subsurface_penetration_depth_m: null,
            ecological_stress_level: 'UNAVAILABLE',
            explanation: 'Surface temperature measurement is unavailable'
          },
          water_masses: {
            dominant_water_mass: null,
            vertical_profile: [
              { depth: 0.0, temperature: null, salinity: null, sound_speed: null, density_sigma: null, water_mass: null },
              { depth: 50.0, temperature: null, salinity: null, sound_speed: null, density_sigma: null, water_mass: null },
              { depth: 100.0, temperature: null, salinity: null, sound_speed: null, density_sigma: null, water_mass: null },
              { depth: 200.0, temperature: null, salinity: null, sound_speed: null, density_sigma: null, water_mass: null }
            ],
            explanation: 'No water mass classification available: missing valid temperature and salinity measurements'
          },
          sst: null,
          sss: null,
          mld: null,
          d20: null,
          d26: null,
          tchp: null,
          tchp_category: null,
          nearest_observation: null,
          is_land: false
        })
      });
    });

    await triggerProbeAndOpenInDepth(page, 12.0, 82.0);

    // 1. Verify Acoustics tab shows Unavailable and explanation
    const modal = page.locator('div.fixed.inset-0');
    await expect(modal).toContainText('UNAVAILABLE');
    await expect(modal).toContainText('Cannot determine SOFAR axis');
    await expect(modal).not.toContainText('NaN');
    await expect(modal).not.toContainText('null m/s');

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P04-01-acoustics-unavailable.png') });

    // 2. Switch to Density & Buoyancy (N²)
    await page.getByRole('button', { name: /Density & Buoyancy/i }).click();
    await expect(modal).toContainText('UNAVAILABLE');
    await expect(modal).toContainText('Cannot determine pycnocline');
    await expect(modal).not.toContainText('CONVECTIVELY_UNSTABLE');
    await expect(modal).not.toContainText('NaN');

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P04-01-stratification-unavailable.png') });

    // 3. Switch to Water Mass Classification
    await page.getByRole('button', { name: /Water Mass Classification/i }).click();
    await expect(modal).toContainText('No Dominant Water Mass Identified');
    await expect(modal).toContainText('Unclassified (missing T/S)');
    await expect(modal).not.toContainText('Subtropical Transition Water (STW)');

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P04-01-water-masses-unavailable.png') });

    // 4. Switch to Marine Heatwave Penetration
    await page.getByRole('button', { name: /Marine Heatwave Penetration/i }).click();
    await expect(modal).toContainText('UNAVAILABLE');
    await expect(modal).toContainText('Surface temperature measurement is unavailable');
    await expect(modal).not.toContainText('NO_HEATWAVE');
    await expect(modal).not.toContainText('NORMAL_SEASONAL');

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P04-01-heatwave-unavailable.png') });
  });

  test('TC-P04-02: Partial/one-invalid-middle-level preserves supported metrics while column-wide derived summaries report unavailable', async ({ page }) => {
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 14.0,
          lon: 88.0,
          time_idx: 0,
          timestamp: '2026-09-10T00:00:00Z',
          is_land: false,
          depths: [0.0, 50.0, 100.0, 200.0],
          temperature: [28.5, null, 22.0, 16.0],
          salinity: [33.0, null, 34.8, 35.2],
          sst: 28.5,
          sss: 33.0,
          mld: 25.0,
          d20: 120.0,
          tchp: null
        })
      });
    });

    await page.route('**/api/ocean/in-depth-analysis*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 14.0,
          lon: 88.0,
          max_depth_analyzed: 200.0,
          num_depth_levels: 4,
          acoustics: {
            surface_sound_speed_mps: 1541.35,
            sofar_channel_axis_depth_m: null,
            sofar_minimum_sound_speed_mps: null,
            sound_speed_gradient_mps_per_100m: null,
            acoustic_duct_type: 'UNAVAILABLE',
            explanation: 'Cannot determine SOFAR axis or sound speed gradient: profile contains missing or invalid levels'
          },
          stratification: {
            surface_density_sigma: 21.154,
            bottom_density_sigma: 25.842,
            pycnocline_depth_m: null,
            maximum_density_gradient_kg_m4: null,
            stability_status: 'UNAVAILABLE',
            brunt_vaisala_profile: [
              { mid_depth: 150.0, n2_rad2_s2: 0.000125, stability: 'STABLE', buoyancy_period_minutes: 9.4 }
            ],
            explanation: 'Cannot determine pycnocline: density profile contains missing or invalid levels'
          },
          marine_heatwave: {
            status: 'CATEGORY_I_MODERATE',
            surface_anomaly_celsius: 0.5,
            subsurface_penetration_depth_m: null,
            ecological_stress_level: 'NORMAL_SEASONAL',
            explanation: 'Cannot determine subsurface penetration depth: subsurface temperature data contains invalid or missing levels'
          },
          water_masses: {
            dominant_water_mass: {
              code: 'BBW',
              name: 'Bay of Bengal Low-Salinity Surface Plume',
              description: 'Monsoon river discharge creating stratification.',
              origin: 'Terrestrial runoff',
              color: '#38bdf8'
            },
            vertical_profile: [
              { depth: 0.0, temperature: 28.5, salinity: 33.0, sound_speed: 1541.35, density_sigma: 21.154, water_mass: { code: 'BBW', name: 'Bay of Bengal Low-Salinity Surface Plume', color: '#38bdf8' } },
              { depth: 50.0, temperature: null, salinity: null, sound_speed: null, density_sigma: null, water_mass: null },
              { depth: 100.0, temperature: 22.0, salinity: 34.8, sound_speed: 1528.12, density_sigma: 23.952, water_mass: { code: 'ICW', name: 'Indian Central Water', color: '#10b981' } },
              { depth: 200.0, temperature: 16.0, salinity: 35.2, sound_speed: 1515.44, density_sigma: 25.842, water_mass: { code: 'ICW', name: 'Indian Central Water', color: '#10b981' } }
            ]
          },
          sst: 28.5,
          sss: 33.0,
          mld: 25.0,
          d20: 120.0,
          d26: null,
          tchp: null,
          tchp_category: null,
          nearest_observation: null,
          is_land: false
        })
      });
    });

    await triggerProbeAndOpenInDepth(page, 14.0, 88.0);

    const modal = page.locator('div.fixed.inset-0');
    // Surface sound speed is preserved!
    await expect(modal).toContainText('1541.35 m/s');
    // SOFAR axis is unavailable due to invalid middle level
    await expect(modal).toContainText('UNAVAILABLE');

    // Switch to Stratification: surface and bottom density preserved, pycnocline unavailable
    await page.getByRole('button', { name: /Density & Buoyancy/i }).click();
    await expect(modal).toContainText('21.154 kg/m³');
    await expect(modal).toContainText('25.842 kg/m³');
    await expect(modal).toContainText('UNAVAILABLE');

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P04-02-partial-column-metrics.png') });
  });

  test('TC-P04-03: Finite reference column produces valid physics, SOFAR waveguide, and water mass identification', async ({ page }) => {
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 14.0,
          lon: 88.0,
          time_idx: 0,
          timestamp: '2026-09-10T00:00:00Z',
          is_land: false,
          depths: [0.0, 50.0, 100.0, 200.0, 500.0, 1000.0, 2000.0, 4000.0],
          temperature: [28.5, 27.8, 22.0, 16.0, 10.0, 6.5, 3.2, 1.8],
          salinity: [32.5, 33.0, 34.8, 35.2, 35.0, 34.8, 34.7, 34.72],
          sst: 28.5,
          sss: 32.5,
          mld: 30.0,
          d20: 125.0,
          tchp: 85.4
        })
      });
    });

    await page.route('**/api/ocean/in-depth-analysis*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 14.0,
          lon: 88.0,
          max_depth_analyzed: 4000.0,
          num_depth_levels: 8,
          acoustics: {
            surface_sound_speed_mps: 1540.28,
            sofar_channel_axis_depth_m: 1000.0,
            sofar_minimum_sound_speed_mps: 1495.62,
            sound_speed_gradient_mps_per_100m: -0.85,
            acoustic_duct_type: 'SOFAR Deep Sound Channel',
            explanation: null
          },
          stratification: {
            surface_density_sigma: 20.782,
            bottom_density_sigma: 27.815,
            pycnocline_depth_m: 150.0,
            maximum_density_gradient_kg_m4: 0.0189,
            stability_status: 'STABLE_STRATIFIED',
            brunt_vaisala_profile: [
              { mid_depth: 25.0, n2_rad2_s2: 0.000085, stability: 'STABLE', buoyancy_period_minutes: 11.2 }
            ],
            explanation: null
          },
          marine_heatwave: {
            status: 'CATEGORY_I_MODERATE',
            surface_anomaly_celsius: 0.5,
            subsurface_penetration_depth_m: 100.0,
            ecological_stress_level: 'NORMAL_SEASONAL',
            explanation: null
          },
          water_masses: {
            dominant_water_mass: {
              code: 'BBW',
              name: 'Bay of Bengal Low-Salinity Surface Plume',
              description: 'Monsoon river discharge creating high stratification.',
              origin: 'Terrestrial runoff & precipitation',
              color: '#38bdf8'
            },
            vertical_profile: [
              { depth: 0.0, temperature: 28.5, salinity: 32.5, sound_speed: 1540.28, density_sigma: 20.782, water_mass: { code: 'BBW', name: 'Bay of Bengal Low-Salinity Surface Plume', color: '#38bdf8' } },
              { depth: 50.0, temperature: 27.8, salinity: 33.0, sound_speed: 1539.10, density_sigma: 21.378, water_mass: { code: 'BBW', name: 'Bay of Bengal Low-Salinity Surface Plume', color: '#38bdf8' } },
              { depth: 100.0, temperature: 22.0, salinity: 34.8, sound_speed: 1528.12, density_sigma: 23.952, water_mass: { code: 'ICW', name: 'Indian Central Water', color: '#10b981' } },
              { depth: 200.0, temperature: 16.0, salinity: 35.2, sound_speed: 1515.44, density_sigma: 25.842, water_mass: { code: 'ICW', name: 'Indian Central Water', color: '#10b981' } },
              { depth: 500.0, temperature: 10.0, salinity: 35.0, sound_speed: 1502.80, density_sigma: 26.910, water_mass: { code: 'ICW', name: 'Indian Central Water', color: '#10b981' } },
              { depth: 1000.0, temperature: 6.5, salinity: 34.8, sound_speed: 1495.62, density_sigma: 27.350, water_mass: { code: 'AAIW', name: 'Antarctic Intermediate Water', color: '#6366f1' } },
              { depth: 2000.0, temperature: 3.2, salinity: 34.7, sound_speed: 1505.30, density_sigma: 27.620, water_mass: { code: 'IDW', name: 'Indian Deep Water / Common Water', color: '#1e293b' } },
              { depth: 4000.0, temperature: 1.8, salinity: 34.72, sound_speed: 1535.20, density_sigma: 27.815, water_mass: { code: 'IDW', name: 'Indian Deep Water / Common Water', color: '#1e293b' } }
            ]
          },
          sst: 28.5,
          sss: 32.5,
          mld: 30.0,
          d20: 125.0,
          d26: 80.0,
          tchp: 85.4,
          tchp_category: 'HIGH_HEAT_CONTENT',
          nearest_observation: null,
          is_land: false
        })
      });
    });

    await triggerProbeAndOpenInDepth(page, 14.0, 88.0);

    const modal = page.locator('div.fixed.inset-0');
    // Verify Acoustics tab
    await expect(modal).toContainText('SOFAR Deep Sound Channel');
    await expect(modal).toContainText('1540.28 m/s');
    await expect(modal).toContainText('1000 m');
    await expect(modal).toContainText('1495.62 m/s');

    // Verify Stratification tab
    await page.getByRole('button', { name: /Density & Buoyancy/i }).click();
    await expect(modal).toContainText('STABLE_STRATIFIED');
    await expect(modal).toContainText('20.782 kg/m³');
    await expect(modal).toContainText('150 m');
    await expect(modal).toContainText('27.815 kg/m³');

    // Verify Water Masses tab
    await page.getByRole('button', { name: /Water Mass Classification/i }).click();
    await expect(modal).toContainText('Bay of Bengal Low-Salinity Surface Plume (BBW)');
    await expect(modal).toContainText('Terrestrial runoff & precipitation');

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P04-03-finite-reference-column.png') });
  });

  test('TC-P04-04: Genuine zero measurements (0°C, 0 PSU) are preserved and formatted as valid numbers', async ({ page }) => {
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 10.0,
          lon: 80.0,
          time_idx: 0,
          timestamp: '2026-09-10T00:00:00Z',
          is_land: false,
          depths: [0.0, 10.0, 50.0],
          temperature: [0.0, 0.0, 0.0],
          salinity: [0.0, 0.0, 0.0],
          sst: 0.0,
          sss: 0.0,
          mld: 0.0,
          d20: null,
          tchp: null
        })
      });
    });

    await page.route('**/api/ocean/in-depth-analysis*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 10.0,
          lon: 80.0,
          max_depth_analyzed: 50.0,
          num_depth_levels: 3,
          acoustics: {
            surface_sound_speed_mps: 1402.06,
            sofar_channel_axis_depth_m: 0.0,
            sofar_minimum_sound_speed_mps: 1402.06,
            sound_speed_gradient_mps_per_100m: 1.63,
            acoustic_duct_type: 'Surface Acoustic Duct',
            explanation: null
          },
          stratification: {
            surface_density_sigma: -0.157,
            bottom_density_sigma: -0.157,
            pycnocline_depth_m: 0.0,
            maximum_density_gradient_kg_m4: 0.0,
            stability_status: 'CONVECTIVELY_UNSTABLE',
            brunt_vaisala_profile: [],
            explanation: null
          },
          marine_heatwave: {
            status: 'NO_HEATWAVE',
            surface_anomaly_celsius: 0.0,
            subsurface_penetration_depth_m: 0.0,
            ecological_stress_level: 'NORMAL_SEASONAL',
            explanation: null
          },
          water_masses: {
            dominant_water_mass: {
              code: 'IDW',
              name: 'Indian Deep Water / Common Water',
              description: 'Cold unventilated abyssal ocean water mass.',
              origin: 'Antarctic Bottom Water modification',
              color: '#1e293b'
            },
            vertical_profile: [
              { depth: 0.0, temperature: 0.0, salinity: 0.0, sound_speed: 1402.06, density_sigma: -0.157, water_mass: { code: 'IDW', name: 'Indian Deep Water', color: '#1e293b' } },
              { depth: 10.0, temperature: 0.0, salinity: 0.0, sound_speed: 1402.22, density_sigma: -0.157, water_mass: { code: 'IDW', name: 'Indian Deep Water', color: '#1e293b' } },
              { depth: 50.0, temperature: 0.0, salinity: 0.0, sound_speed: 1402.88, density_sigma: -0.157, water_mass: { code: 'IDW', name: 'Indian Deep Water', color: '#1e293b' } }
            ]
          },
          sst: 0.0,
          sss: 0.0,
          mld: 0.0,
          d20: null,
          d26: null,
          tchp: null,
          tchp_category: null,
          nearest_observation: null,
          is_land: false
        })
      });
    });

    await triggerProbeAndOpenInDepth(page, 10.0, 80.0);

    const modal = page.locator('div.fixed.inset-0');
    // Verify 1402.06 m/s is displayed (genuine 0.0 computed value, not Unavailable)
    await expect(modal).toContainText('1402.06 m/s');

    // Switch to Water Masses: verify 0°C and 0 PSU are rendered explicitly
    await page.getByRole('button', { name: /Water Mass Classification/i }).click();
    await expect(modal).toContainText('0°C');
    await expect(modal).toContainText('0 PSU');

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P04-04-genuine-zero-inputs.png') });
  });

  test('TC-P04-05: Unavailable dataset entry in DatasetManagerModal disables activation button with clear reason and blocks activation', async ({ page }) => {
    const GLORYS_UNAVAILABLE = {
      dataset_id: 'cmems_mod_glo_phy_my_0.083deg_P1D-m',
      name: 'Copernicus GLORYS12V1 Global Reanalysis',
      provider: 'Copernicus Marine Service',
      format: 'NetCDF-4',
      temporal_resolution: 'Daily',
      spatial_resolution: '0.083 degree (~8.3 km)',
      coverage_bounds: { lat_min: 0.0, lat_max: 25.0, lon_min: 50.0, lon_max: 100.0 },
      depth_range: [0.0, 4000.0],
      source_mode: 'REAL_LOCAL',
      status: 'UNAVAILABLE'
    };

    const SYNTHETIC_ACTIVE = {
      dataset_id: 'incois_roms_synthetic',
      name: 'INCOIS High-Res Regional ROMS NIO (Synthetic)',
      provider: 'SAMUDRA Simulation Lab',
      format: 'NetCDF-4',
      temporal_resolution: '3-hourly',
      spatial_resolution: '0.25 degree (~25 km)',
      coverage_bounds: { lat_min: 0.0, lat_max: 25.0, lon_min: 65.0, lon_max: 95.0 },
      depth_range: [0.0, 1000.0],
      source_mode: 'SYNTHETIC',
      status: 'READY'
    };

    await page.route('**/api/datasets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_dataset_id: 'incois_roms_synthetic',
          datasets: [SYNTHETIC_ACTIVE, GLORYS_UNAVAILABLE]
        })
      });
    });

    // Open DATA dropdown and click Dataset Registry & Downloads
    const dataNavBtn = page.locator('[data-testid="nav-data-btn"]');
    await expect(dataNavBtn).toBeVisible({ timeout: 5000 });
    await dataNavBtn.click();

    const datasetsBtn = page.locator('[data-testid="header-datasets-btn"]');
    await expect(datasetsBtn).toBeVisible({ timeout: 5000 });
    await datasetsBtn.click();

    // Verify DatasetManagerModal is open
    const modal = page.locator('[data-testid="dataset-manager-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify status badge for GLORYS displays UNAVAILABLE
    const statusBadge = modal.locator('[data-testid="dataset-status-badge-cmems_mod_glo_phy_my_0.083deg_P1D-m"]');
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toContainText('UNAVAILABLE');

    // Verify activation button is disabled
    const activateBtn = modal.locator('[data-testid="activate-dataset-cmems_mod_glo_phy_my_0.083deg_P1D-m"]');
    await expect(activateBtn).toBeVisible();
    await expect(activateBtn).toBeDisabled();
    await expect(activateBtn).toContainText('Unavailable');

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P04-05-dataset-manager-unavailable-disabled.png') });
  });

});
