import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('..', 'docs', 'evidence', 'core-phase-02');
mkdirSync(evidenceDir, { recursive: true });

// Mock Dataset A (Copernicus GLORYS12V1)
const DATASET_A = {
  dataset_id: 'cmems_mod_glo_phy_my_0.083deg_P1D-m',
  name: 'Copernicus GLORYS12V1 Global Reanalysis',
  provider: 'Copernicus Marine Service',
  format: 'NetCDF-4',
  temporal_resolution: 'Daily',
  spatial_resolution: '0.083 degree (~8.3 km)',
  coverage_bounds: {
    lat_min: 0.0,
    lat_max: 25.0,
    lon_min: 50.0,
    lon_max: 100.0
  },
  depth_range: [0.49, 92.3],
  source_mode: 'REAL_LOCAL',
  status: 'READY'
};

const METADATA_A = {
  dataset_id: 'cmems_mod_glo_phy_my_0.083deg_P1D-m',
  name: 'Copernicus GLORYS12V1 Global Reanalysis',
  depth_levels_m: [0.494, 5.0, 10.0, 20.0, 50.0, 92.3],
  time_timestamps: ['2025-01-01T00:00:00Z', '2025-01-02T00:00:00Z', '2025-01-03T00:00:00Z'],
  variables: {
    temperature: { name: 'Sea Water Potential Temperature', units: '°C' },
    salinity: { name: 'Sea Water Salinity', units: 'PSU' },
    currents: { name: 'Ocean Currents Velocity', units: 'm/s' }
  }
};

// Mock Dataset B (INCOIS Regional ROMS - No currents variable, different depth/time grid)
const DATASET_B = {
  dataset_id: 'incois_roms_nio_daily_0.05deg',
  name: 'INCOIS High-Res Regional ROMS NIO',
  provider: 'MoES / INCOIS',
  format: 'NetCDF-4',
  temporal_resolution: 'Daily',
  spatial_resolution: '0.05 degree (~5 km)',
  coverage_bounds: {
    lat_min: 5.0,
    lat_max: 22.0,
    lon_min: 60.0,
    lon_max: 95.0
  },
  depth_range: [0.0, 500.0],
  source_mode: 'REAL_LOCAL',
  status: 'READY'
};

const METADATA_B = {
  dataset_id: 'incois_roms_nio_daily_0.05deg',
  name: 'INCOIS High-Res Regional ROMS NIO',
  depth_levels_m: [0.0, 10.0, 25.0, 75.0, 150.0, 300.0, 500.0],
  time_timestamps: ['2025-01-10T00:00:00Z', '2025-01-11T00:00:00Z'],
  variables: {
    temperature: { name: 'Potential Temperature', units: '°C' },
    salinity: { name: 'Practical Salinity', units: 'PSU' }
  }
};

test.describe('Core Phase 02: Dataset, Date and Depth Consistency Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Global default mock for ocean data slice
    await page.route('**/api/ocean-data*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dataset_id: 'cmems_mod_glo_phy_my_0.083deg_P1D-m',
          variable: 'temperature',
          requested_depth: 0,
          selected_depth: 0.494,
          timestamp: '2025-01-01T00:00:00Z',
          lats: [10, 11],
          lons: [75, 76],
          values: [[28.5, 28.6], [28.4, 28.5]]
        })
      });
    });

    await page.route('**/api/ocean/volume*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dataset_id: 'cmems_mod_glo_phy_my_0.083deg_P1D-m',
          variable: 'temperature',
          dimensions: { depths: 3, lats: 2, lons: 2 },
          depths: [0, 50, 100],
          lats: [10, 11],
          lons: [75, 76],
          data_flat: [28.5, 28.6, 28.4, 28.5, 25.0, 25.1, 24.9, 25.0, 20.0, 20.1, 19.9, 20.0]
        })
      });
    });

    await page.route('**/api/datasets/manifests*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('**/api/datasets/generate-command*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cli_command: 'python scripts/download_subset.py',
          sha256_checksum: 'mock-hash'
        })
      });
    });

    await page.route('**/api/collocation/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          bias_temp: 0.1,
          bias_sal: -0.05,
          mae_temp: 0.2,
          mae_sal: 0.08,
          rmse_temp: 0.25,
          rmse_sal: 0.10,
          pearson_r_temp: 0.98,
          pearson_r_sal: 0.95
        })
      });
    });

    await page.route('**/api/insitu/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
  });

  test('TC-P02-01: Startup initialization fetches metadata in both auto-activation and pre-active branches', async ({ page }) => {
    let metadataFetchCount = 0;

    await page.route('**/api/datasets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_dataset_id: DATASET_B.dataset_id,
          datasets: [DATASET_A, DATASET_B]
        })
      });
    });

    await page.route('**/api/metadata', async (route) => {
      metadataFetchCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(METADATA_B)
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible({ timeout: 15000 });

    // Verify metadata was fetched for already-active Dataset B
    await expect(async () => {
      expect(metadataFetchCount).toBeGreaterThanOrEqual(1);
    }).toPass();

    // Verify timestamp badge is populated with Dataset B's timestamp
    const timeBadge = page.getByTestId('current-time-badge');
    await expect(timeBadge).toContainText('2025-01-10');

    // Verify depth ruler displays Dataset B's max depth (500m)
    const depthBar = page.getByRole('complementary', { name: 'Ocean Depth Selector' });
    await expect(depthBar.getByText('500 m (MAX)')).toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, '01_startup_metadata_initialized.png') });
  });

  test('TC-P02-02: Switching dataset from A to B reconciles controls, labels, and fetches new metadata', async ({ page }) => {
    let currentActive = DATASET_A;

    await page.route('**/api/datasets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_dataset_id: currentActive.dataset_id,
          datasets: [DATASET_A, DATASET_B]
        })
      });
    });

    await page.route('**/api/datasets/select', async (route) => {
      currentActive = DATASET_B;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          active_dataset: DATASET_B
        })
      });
    });

    await page.route('**/api/metadata', async (route) => {
      const meta = currentActive.dataset_id === DATASET_B.dataset_id ? METADATA_B : METADATA_A;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(meta)
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();

    // Initial state check - Dataset A
    await expect(page.getByTestId('current-time-badge')).toContainText('2025-01-01');

    // Open Dataset Manager Modal via DATA ▾ menu
    await page.getByRole('button', { name: 'DATA ▾' }).click();
    await page.getByRole('button', { name: /Dataset Registry & Downloads/i }).click();
    await expect(page.getByText(/Dataset Management & Provenance Architecture/i)).toBeVisible();

    // Switch to Dataset B via Activate button
    await page.getByRole('button', { name: 'Activate Dataset' }).click();

    // Verify time badge updated to Dataset B's timestamp
    await expect(page.getByTestId('current-time-badge')).toContainText('2025-01-10');

    // Verify depth ruler updated to 500 m MAX
    const depthBar = page.getByRole('complementary', { name: 'Ocean Depth Selector' });
    await expect(depthBar.getByText('500 m (MAX)')).toBeVisible();

    // Verify CURRENTS button in dock is disabled since Dataset B does not support currents
    const currentsTab = page.getByRole('tab', { name: /CURRENTS/i });
    await expect(currentsTab).toBeDisabled();

    await page.screenshot({ path: path.join(evidenceDir, '02_dataset_switched_reconciled.png') });
  });

  test('TC-P02-03: Client cache isolation across datasets prevents cross-dataset pollution', async ({ page }) => {
    let currentActive = DATASET_A;
    let oceanDataResponses = [];

    await page.route('**/api/datasets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_dataset_id: currentActive.dataset_id,
          datasets: [DATASET_A, DATASET_B]
        })
      });
    });

    await page.route('**/api/datasets/select', async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      if (payload.dataset_id === DATASET_B.dataset_id) {
        currentActive = DATASET_B;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', active_dataset: DATASET_B })
        });
      } else {
        currentActive = DATASET_A;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', active_dataset: DATASET_A })
        });
      }
    });

    await page.route('**/api/metadata', async (route) => {
      const meta = currentActive.dataset_id === DATASET_B.dataset_id ? METADATA_B : METADATA_A;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(meta)
      });
    });

    await page.route('**/api/ocean-data*', async (route) => {
      const isB = currentActive.dataset_id === DATASET_B.dataset_id;
      const val = isB ? 24.2 : 28.5;
      oceanDataResponses.push({ dataset: currentActive.dataset_id, val });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dataset_id: currentActive.dataset_id,
          variable: 'temperature',
          requested_depth: 0,
          selected_depth: isB ? 0.0 : 0.494,
          timestamp: isB ? '2025-01-10T00:00:00Z' : '2025-01-01T00:00:00Z',
          lats: [10, 11],
          lons: [75, 76],
          values: [[val, val], [val, val]]
        })
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();

    // Verify initial request for Dataset A returned 28.5
    await expect(async () => {
      expect(oceanDataResponses.some(r => r.dataset === DATASET_A.dataset_id && r.val === 28.5)).toBeTruthy();
    }).toPass();

    // Switch to Dataset B
    await page.getByRole('button', { name: 'DATA ▾' }).click();
    await page.getByRole('button', { name: /Dataset Registry & Downloads/i }).click();
    await page.getByRole('button', { name: 'Activate Dataset' }).click();

    // Verify fresh request for Dataset B returned 24.2
    await expect(async () => {
      expect(oceanDataResponses.some(r => r.dataset === DATASET_B.dataset_id && r.val === 24.2)).toBeTruthy();
    }).toPass();

    // Revisit Dataset A
    const activateButtons = page.getByRole('button', { name: 'Activate Dataset' });
    if (await activateButtons.count() > 0) {
      await activateButtons.first().click();
      await expect(page.getByTestId('current-time-badge')).toContainText('2025-01-01');
      await expect(async () => {
        expect(oceanDataResponses.filter(r => r.dataset === DATASET_A.dataset_id).length).toBeGreaterThanOrEqual(2);
      }).toPass();
    }
  });

  test('TC-P02-04: Sequential dataset switch mutations reconcile correctly with active backend identity', async ({ page }) => {
    let backendActive = DATASET_A;

    await page.route('**/api/datasets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_dataset_id: backendActive.dataset_id,
          datasets: [DATASET_A, DATASET_B]
        })
      });
    });

    await page.route('**/api/datasets/select', async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      if (payload.dataset_id === DATASET_B.dataset_id) {
        backendActive = DATASET_B;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', active_dataset: DATASET_B })
        });
      } else {
        backendActive = DATASET_A;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', active_dataset: DATASET_A })
        });
      }
    });

    await page.route('**/api/metadata', async (route) => {
      const meta = backendActive.dataset_id === DATASET_B.dataset_id ? METADATA_B : METADATA_A;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(meta)
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();

    // Open Dataset Manager Modal
    await page.getByRole('button', { name: 'DATA ▾' }).click();
    await page.getByRole('button', { name: /Dataset Registry & Downloads/i }).click();

    // Switch to Dataset B
    const activateBtn = page.getByRole('button', { name: 'Activate Dataset' }).first();
    await activateBtn.click();
    await expect(page.getByTestId('current-time-badge')).toContainText('2025-01-10');

    // Switch back to Dataset A
    const activateButtons = page.getByRole('button', { name: 'Activate Dataset' });
    if (await activateButtons.count() > 0) {
      await activateButtons.first().click();
      await expect(page.getByTestId('current-time-badge')).toContainText('2025-01-01');
    }
  });

  test('TC-P02-05: Dataset switch failure displays error banner and recovers upon retry', async ({ page }) => {
    let selectCalled = false;
    let metadataFailCount = 0;

    await page.route('**/api/datasets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_dataset_id: selectCalled ? DATASET_B.dataset_id : DATASET_A.dataset_id,
          datasets: [DATASET_A, DATASET_B]
        })
      });
    });

    await page.route('**/api/datasets/select', async (route) => {
      selectCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', active_dataset: DATASET_B })
      });
    });

    await page.route('**/api/metadata', async (route) => {
      if (selectCalled && metadataFailCount === 0) {
        metadataFailCount++;
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Failed to parse NetCDF header dimensions' })
        });
        return;
      }
      const meta = selectCalled ? METADATA_B : METADATA_A;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(meta)
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();

    // Open Dataset Manager Modal
    await page.getByRole('button', { name: 'DATA ▾' }).click();
    await page.getByRole('button', { name: /Dataset Registry & Downloads/i }).click();

    // Attempt to switch to Dataset B (Select succeeds, metadata fails)
    await page.getByRole('button', { name: 'Activate Dataset' }).click();

    // Close dataset manager modal to inspect workspace error banner
    await page.getByRole('button', { name: 'Close modal' }).click();

    // Verify error banner is visible with Retry Metadata button
    await expect(page.getByTestId('dataset-transition-error-banner')).toBeVisible();
    await expect(page.getByTestId('current-time-badge')).toContainText('DATASET ERROR');
    await expect(page.getByRole('button', { name: 'Next Forecast Step' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Previous Forecast Step' })).toBeDisabled();

    // Click Retry Metadata button
    await page.getByRole('button', { name: 'Retry Metadata' }).click();

    // Verify successful recovery of Dataset B as Dataset B (timestamp 2025-01-10, depth 500m)
    await expect(page.getByTestId('current-time-badge')).toContainText('2025-01-10');
    const depthBar = page.getByRole('complementary', { name: 'Ocean Depth Selector' });
    await expect(depthBar.getByText('500 m (MAX)')).toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, '05_dataset_switch_failure_recovered.png') });
  });

  test('TC-P02-06: Advancing timeline steps live-synchronizes active probed point and model profile', async ({ page }) => {
    let probeRequests = [];

    await page.route('**/api/datasets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_dataset_id: DATASET_A.dataset_id,
          datasets: [DATASET_A]
        })
      });
    });

    await page.route('**/api/metadata', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(METADATA_A)
      });
    });

    await page.route('**/api/ocean/probe*', async (route) => {
      const url = new URL(route.request().url());
      const timeIdx = url.searchParams.get('time_idx') || '0';
      probeRequests.push({ timeIdx, url: route.request().url() });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 14.5,
          lon: 88.5,
          time_idx: parseInt(timeIdx, 10),
          timestamp: METADATA_A.time_timestamps[parseInt(timeIdx, 10)] || '2025-01-01T00:00:00Z',
          depths: [0.494, 10, 50, 92.3],
          temperature: [28.5 + parseInt(timeIdx, 10) * 0.5, 28.0, 26.0, 22.0],
          salinity: [34.5, 34.6, 34.8, 35.0],
          nearest_observation: null
        })
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();
    await expect(page.getByTestId('current-time-badge')).toContainText('2025-01-01');

    // Probe point via search box for Bay of Bengal
    await page.getByPlaceholder(/Search location/i).fill('Bay of Bengal');
    await page.locator('.search-results-dropdown button').first().click();

    // Verify Inspector appears for t=0
    await expect(page.getByRole('region', { name: 'Location Inspector' })).toBeVisible({ timeout: 10000 });

    // Step forward on timeline to t=1
    await page.getByRole('button', { name: 'Next Forecast Step' }).click();

    // Verify fresh probe was requested for t=1
    await expect(async () => {
      expect(probeRequests.some(r => r.timeIdx === '1')).toBeTruthy();
    }).toPass();

    // Verify timestamp badge reflects t=1
    await expect(page.getByTestId('current-time-badge')).toContainText('2025-01-02');

    // Open Profile Modal for probed point via CTD PROFILE button
    await page.getByRole('button', { name: 'CTD PROFILE' }).click();
    await expect(page.getByTestId('profile-modal-container')).toBeVisible();

    // Close Profile Modal
    await page.getByTestId('deselect-float-btn').click();
    await expect(page.getByTestId('profile-modal-container')).not.toBeVisible();

    // Close Location Inspector
    await page.getByRole('button', { name: 'Close Location Inspector' }).click();
    await expect(page.getByRole('region', { name: 'Location Inspector' })).not.toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, '06_probe_sync_on_time_advance.png') });
  });

  test('TC-P02-07: Rapid location probe clicks ensure final coordinate owns state without race conditions', async ({ page }) => {
    let resolvedProbes = [];

    await page.route('**/api/datasets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_dataset_id: DATASET_A.dataset_id,
          datasets: [DATASET_A]
        })
      });
    });

    await page.route('**/api/metadata', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(METADATA_A)
      });
    });

    await page.route('**/api/ocean/probe*', async (route) => {
      const url = new URL(route.request().url());
      const lat = parseFloat(url.searchParams.get('lat') || '0');
      // Delay response for Arabian Sea (lat 15.0) but respond fast for Bay of Bengal (lat 14.5)
      if (lat === 15.0) {
        await new Promise((r) => setTimeout(r, 400));
      }
      resolvedProbes.push(lat);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat,
          lon: lat === 15.0 ? 68.0 : 88.5,
          time_idx: 0,
          timestamp: '2025-01-01T00:00:00Z',
          depths: [0.494, 10, 50, 92.3],
          temperature: lat === 15.0 ? [29.0, 28.5, 26.5, 23.0] : [27.5, 27.0, 25.0, 21.0],
          salinity: [35.0, 35.1, 35.2, 35.3],
          nearest_observation: null
        })
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();

    // Click Arabian Sea then immediately Bay of Bengal via search
    await page.getByPlaceholder(/Search location/i).fill('Arabian Sea');
    await page.locator('.search-results-dropdown button').first().click();

    await page.getByPlaceholder(/Search location/i).fill('Bay of Bengal');
    await page.locator('.search-results-dropdown button').first().click();

    // Wait for inspector to stabilize
    const inspector = page.getByRole('region', { name: 'Location Inspector' });
    await expect(inspector).toBeVisible();

    // Ensure final coordinate displayed is Bay of Bengal (lat 14.500° N, 88.500° E) and not overwritten by late Arabian Sea response
    await expect(inspector).toContainText('14.500° N');
    await expect(inspector).toContainText('88.500° E');
  });

  test('TC-P02-08: Derived Views (Fisherman Fronts and Physics Analysis) forward active time_idx and dataset', async ({ page }) => {
    let frontsRequests = [];
    let physicsRequests = [];

    await page.route('**/api/datasets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_dataset_id: DATASET_A.dataset_id,
          datasets: [DATASET_A]
        })
      });
    });

    await page.route('**/api/metadata', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(METADATA_A)
      });
    });

    await page.route('**/api/ocean/thermal-fronts*', async (route) => {
      const url = new URL(route.request().url());
      frontsRequests.push({ time_idx: url.searchParams.get('time_idx'), url: route.request().url() });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fronts: [
            { id: 'PFZ_FRONT_01', lat: 15.2, lon: 70.4, gradient: 0.45, category: 'STRONG_PFZ' }
          ],
          provenance_badge: '[REAL • COPERNICUS GLORYS12V1]'
        })
      });
    });

    await page.route('**/api/ocean/in-depth-analysis*', async (route) => {
      const url = new URL(route.request().url());
      const lat = url.searchParams.get('lat');
      const lon = url.searchParams.get('lon');
      physicsRequests.push({ time_idx: url.searchParams.get('time_idx'), lat, lon, url: route.request().url() });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: parseFloat(lat || '15.0'),
          lon: parseFloat(lon || '85.0'),
          max_depth_analyzed: 1000.0,
          num_depth_levels: 10,
          acoustics: {
            surface_sound_speed_mps: 1540.2,
            sofar_channel_axis_depth_m: 1200.0,
            sofar_minimum_sound_speed_mps: 1490.5,
            sound_speed_gradient_mps_per_100m: -4.1,
            acoustic_duct_type: 'SOFAR Deep Sound Channel'
          },
          stratification: {
            surface_density_sigma: 22.4,
            bottom_density_sigma: 27.8,
            pycnocline_depth_m: 65.0,
            maximum_density_gradient_kg_m4: 0.045,
            stability_status: 'STABLE_STRATIFIED',
            brunt_vaisala_profile: []
          },
          marine_heatwave: {
            status: 'NO_HEATWAVE',
            surface_anomaly_celsius: 0.2,
            subsurface_penetration_depth_m: 25.0,
            ecological_stress_level: 'NORMAL_SEASONAL'
          },
          water_masses: {
            dominant_water_mass: {
              code: 'BBW',
              name: 'Bay of Bengal Water',
              description: 'Low-salinity river-influenced surface layer',
              color: '#38bdf8',
              origin: 'Ganga-Brahmaputra River Plume'
            },
            vertical_profile: [
              {
                depth: 10.0,
                water_mass: { code: 'BBW', name: 'Bay of Bengal Water', color: '#38bdf8' },
                temperature: 28.5,
                salinity: 33.2,
                sound_speed: 1540.2,
                density_sigma: 21.8
              }
            ]
          }
        })
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();
    await expect(page.getByTestId('current-time-badge')).toContainText('2025-01-01');

    // Advance timeline to t=1 (2025-01-02)
    await page.getByRole('button', { name: 'Next Forecast Step' }).click();
    await expect(page.getByTestId('current-time-badge')).toContainText('2025-01-02');

    // Open Fisherman Mode Modal via OPERATIONS ▾ menu
    await page.getByRole('button', { name: 'OPERATIONS ▾' }).click();
    await page.getByRole('button', { name: /Fisherman View/i }).click();
    await expect(page.getByText('Fisherman Operational Intelligence')).toBeVisible();

    // Switch to Fronts tab
    await page.getByRole('button', { name: /Thermal Fronts/i }).click();

    // Verify thermal fronts received time_idx=1
    await expect(async () => {
      expect(frontsRequests.some(r => r.time_idx === '1')).toBeTruthy();
    }).toPass();

    // Close Fisherman Modal
    await page.getByTestId('fisherman-modal-close-btn').click();
    await expect(page.getByText('Fisherman Operational Intelligence')).not.toBeVisible();

    // Open In-Depth Ocean Physics Modal via ANALYSIS ▾ menu
    await page.getByTestId('nav-analysis-btn').click();
    await expect(page.getByTestId('header-physics-btn')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('header-physics-btn').click();
    await expect(page.getByTestId('indepth-modal-title')).toBeVisible({ timeout: 10000 });

    // Select Northern Arabian Sea preset (19.5°N, 66.0°E)
    await page.getByRole('button', { name: /Northern Arabian Sea/i }).click();

    // Verify physics analysis requested Northern Arabian Sea coordinates
    await expect(async () => {
      expect(physicsRequests.some(r => r.lat === '19.5' && r.lon === '66')).toBeTruthy();
    }).toPass();

    // Close In-Depth Modal
    await page.getByTestId('indepth-modal-close-btn').click();
    await expect(page.getByTestId('indepth-modal-title')).not.toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, '08_derived_views_context_forwarding.png') });
  });

  test('TC-P02-09: Depth selector derives discrete levels from metadata and displays resolved depth correctly', async ({ page }) => {
    await page.route('**/api/datasets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_dataset_id: DATASET_A.dataset_id,
          datasets: [DATASET_A]
        })
      });
    });

    await page.route('**/api/metadata', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(METADATA_A)
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();

    // Check depth bar exists and contains dynamic MAX label (92 m for GLORYS)
    const depthBar = page.getByRole('complementary', { name: 'Ocean Depth Selector' });
    await expect(depthBar).toBeVisible();
    await expect(depthBar.getByText('SURFACE')).toBeVisible();
    await expect(depthBar.getByText('92 m (MAX)')).toBeVisible();

    // Click 50 m depth tick
    await depthBar.getByRole('button', { name: '50 m' }).click();

    // Verify depth bar header reflects 50.0m
    await expect(depthBar.locator('.current-depth-val')).toContainText('50.0m');

    await page.screenshot({ path: path.join(evidenceDir, '09_metadata_depth_ruler.png') });
  });

  test('TC-P02-10: Preserves Phase 01 in-situ observed comparison semantics without regression', async ({ page }) => {
    await page.route('**/api/datasets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_dataset_id: DATASET_A.dataset_id,
          datasets: [DATASET_A]
        })
      });
    });

    await page.route('**/api/metadata', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(METADATA_A)
      });
    });

    await page.route('**/api/insitu/argo*', async (route) => {
      const argoDetail = {
        id: 'ARGO_2902145',
        wmo_id: '2902145',
        name: 'Float 2902145',
        platform_type: 'argo',
        lat: 13.5,
        lon: 84.5,
        timestamp: '2025-01-04T06:00:00Z',
        depths: [5, 10, 20, 50],
        temperature: [28.2, 28.0, 27.5, 25.0],
        salinity: [34.5, 34.6, 34.8, 35.0],
        qc_flags: [1, 1, 1, 1],
        source_mode: 'OPERATIONAL'
      };
      if (route.request().url().includes('/insitu/argo/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(argoDetail)
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([argoDetail])
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();

    // Open observation fleet drawer via OBSERVATIONS button in Header
    await page.getByTestId('open-observation-drawer-btn').click();
    await expect(page.getByText('OBSERVATION FLEET')).toBeVisible();

    // Open Profile for ARGO_2902145
    const openProfileBtn = page.getByRole('button', { name: 'OPEN PROFILE' }).first();
    await expect(openProfileBtn).toBeVisible({ timeout: 10000 });
    await openProfileBtn.click();

    // Verify ProfileModal opens with observation data
    await expect(page.getByTestId('profile-modal-container')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('profile-details')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('profile-details').getByText('ARGO FLOAT')).toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, '10_insitu_comparison_preserved.png') });
  });
});
