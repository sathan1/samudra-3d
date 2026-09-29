import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('..', 'docs', 'evidence', 'core-phase-03');
mkdirSync(evidenceDir, { recursive: true });

const GLORYS_DATASET = {
  dataset_id: 'cmems_mod_glo_phy_my_0.083deg_P1D-m',
  name: 'Copernicus GLORYS12V1 Global Reanalysis',
  provider: 'Copernicus Marine Service',
  format: 'NetCDF-4',
  temporal_resolution: 'Daily',
  spatial_resolution: '0.083 degree (~8.3 km)',
  coverage_bounds: { lat_min: 0.0, lat_max: 25.0, lon_min: 50.0, lon_max: 100.0 },
  depth_range: [0.49, 92.3],
  source_mode: 'REAL_LOCAL',
  status: 'READY'
};

const GLORYS_METADATA = {
  dataset_id: 'cmems_mod_glo_phy_my_0.083deg_P1D-m',
  name: 'Copernicus GLORYS12V1 Global Reanalysis',
  depth_levels_m: [0.494, 5.0, 10.0, 20.0, 50.0, 92.3],
  time_timestamps: ['2023-05-15T00:00:00Z', '2023-05-16T00:00:00Z'],
  variables: {
    temperature: { name: 'Sea Water Potential Temperature', units: '°C' },
    salinity: { name: 'Sea Water Salinity', units: 'PSU' },
    currents: { name: 'Ocean Currents Velocity', units: 'm/s' }
  }
};

const INCOIS_ROMS_DATASET = {
  dataset_id: 'incois_roms_nio_daily_0.05deg',
  name: 'INCOIS High-Res Regional ROMS NIO',
  provider: 'MoES / INCOIS',
  format: 'NetCDF-4',
  temporal_resolution: 'Daily',
  spatial_resolution: '0.05 degree (~5 km)',
  coverage_bounds: { lat_min: 5.0, lat_max: 22.0, lon_min: 60.0, lon_max: 95.0 },
  depth_range: [0.0, 500.0],
  source_mode: 'REAL_LOCAL',
  status: 'READY'
};

const INCOIS_ROMS_METADATA = {
  dataset_id: 'incois_roms_nio_daily_0.05deg',
  name: 'INCOIS High-Res Regional ROMS NIO',
  depth_levels_m: [0.0, 10.0, 25.0, 75.0, 150.0, 300.0, 500.0],
  time_timestamps: ['2023-05-15T00:00:00Z'],
  variables: {
    temperature: { name: 'Potential Temperature', units: '°C' },
    salinity: { name: 'Practical Salinity', units: 'PSU' }
  }
};

const COPERNICUS_BIO_DATASET = {
  dataset_id: 'cmems_mod_glo_bgc_my_0.25deg',
  name: 'Copernicus Global Biogeochemistry Analysis',
  provider: 'Mercator Ocean International',
  format: 'NetCDF-4',
  temporal_resolution: 'Monthly',
  spatial_resolution: '0.25 degree (~25 km)',
  coverage_bounds: { lat_min: -10.0, lat_max: 30.0, lon_min: 40.0, lon_max: 110.0 },
  depth_range: [0.0, 500.0],
  source_mode: 'REAL_LOCAL',
  status: 'READY'
};

const SYNTHETIC_DATASET = {
  dataset_id: 'synthetic_indian_ocean_daily',
  name: 'Synthetic Test Dataset',
  provider: 'SAMUDRA Synthetic Generator',
  format: 'Generated',
  temporal_resolution: 'Daily',
  spatial_resolution: '0.25 degree (~25 km)',
  coverage_bounds: { lat_min: -10.0, lat_max: 30.0, lon_min: 40.0, lon_max: 110.0 },
  depth_range: [0.0, 1000.0],
  source_mode: 'SYNTHETIC',
  status: 'READY'
};

const REMOTE_LIVE_DATASET = {
  dataset_id: 'incois_coastal_radar_live',
  name: 'INCOIS Coastal High-Frequency Radar',
  provider: 'MoES / INCOIS',
  format: 'OPeNDAP',
  temporal_resolution: 'Hourly',
  spatial_resolution: '0.02 degree (~2 km)',
  coverage_bounds: { lat_min: 8.0, lat_max: 22.0, lon_min: 68.0, lon_max: 89.0 },
  depth_range: [0.0, 0.0],
  source_mode: 'REMOTE_LIVE',
  status: 'READY'
};

const UNKNOWN_SOURCE_DATASET = {
  dataset_id: 'unspecified_external_layer',
  name: '',
  provider: '',
  format: 'NetCDF',
  temporal_resolution: '',
  spatial_resolution: '',
  coverage_bounds: { lat_min: 0.0, lat_max: 20.0, lon_min: 60.0, lon_max: 90.0 },
  depth_range: [0.0, 100.0],
  status: 'READY'
};

function setupStandardRoutes(page, { activeDataset = GLORYS_DATASET, metadata = null } = {}) {
  const effectiveMetadata = metadata || {
    dataset_id: activeDataset.dataset_id,
    name: activeDataset.name,
    depth_levels_m: [0.0, 10.0, 50.0],
    time_timestamps: ['2023-05-15T00:00:00Z'],
    variables: {
      temperature: { name: 'Temperature', units: '°C' },
      salinity: { name: 'Salinity', units: 'PSU' }
    }
  };

  return Promise.all([
    page.route('**/api/datasets/select*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          active_dataset_id: activeDataset.dataset_id,
          active_dataset: activeDataset
        })
      });
    }),
    page.route('**/api/datasets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_dataset_id: activeDataset.dataset_id,
          datasets: [activeDataset]
        })
      });
    }),
    page.route('**/api/metadata', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(effectiveMetadata)
      });
    }),
    page.route('**/api/ocean-data*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dataset_id: activeDataset.dataset_id,
          variable: 'temperature',
          requested_depth: 0,
          selected_depth: 0.494,
          timestamp: '2023-05-15T00:00:00Z',
          lats: [10, 11],
          lons: [75, 76],
          values: [[28.5, 28.6], [28.4, 28.5]]
        })
      });
    }),
    page.route('**/api/ocean/volume*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dataset_id: activeDataset.dataset_id,
          variable: 'temperature',
          dimensions: { depths: 2, lats: 2, lons: 2 },
          depths: [0, 50],
          lats: [10, 11],
          lons: [75, 76],
          data_flat: [28.5, 28.6, 28.4, 28.5, 25.0, 25.1, 24.9, 25.0]
        })
      });
    }),
    page.route('**/api/ocean/thermal-fronts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fronts: [
            {
              lat: 18.2,
              lon: 84.5,
              front_intensity: 'HIGH',
              gradient_deg_c_per_km: 0.045,
              sst_celsius: 28.5,
              pfz_probability: 0.88
            }
          ],
          provenance_badge: '[REAL • COPERNICUS]'
        })
      });
    }),
    page.route('**/api/datasets/manifests*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    })
  ]);
}

async function triggerCoordinateProbe(page, lat, lon) {
  const searchInput = page.getByPlaceholder(/Search location/i);
  await searchInput.fill(`${lat}, ${lon}`);
  const resultBtn = page.locator('.search-results-dropdown button').first();
  await expect(resultBtn).toBeVisible({ timeout: 5000 });
  await resultBtn.click();
}

test.describe('Core Phase 03: Scientific Presentation Integrity & Operational Descriptions', () => {

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('TC-P03-01: Header and Inspector derive provenance dynamically and distinct Copernicus product retains identity', async ({ page }) => {
    await setupStandardRoutes(page, { activeDataset: INCOIS_ROMS_DATASET, metadata: INCOIS_ROMS_METADATA });

    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dataset_id: INCOIS_ROMS_DATASET.dataset_id,
          source_mode: 'REAL_LOCAL',
          source: 'INCOIS High-Res Regional ROMS NIO',
          resolution: '5 km',
          timestamp: '2023-05-15T00:00:00Z',
          lat: 15.0,
          lon: 72.0,
          sst: 28.4,
          sss: 35.2,
          mld: 24.0,
          d20: 85.0
        })
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible({ timeout: 15000 });

    // 1. Verify Header Source Badge shows INCOIS ROMS and 5 km (NOT GLORYS or 8.3 km)
    const headerBadge = page.locator('[data-testid="header-source-badge"]');
    await expect(headerBadge).toBeVisible();
    await expect(headerBadge).toContainText('INCOIS High-Res Regional ROMS NIO');
    await expect(headerBadge).toContainText('REAL');
    await expect(headerBadge).toContainText('5 km');
    await expect(headerBadge).not.toContainText('GLORYS12V1');
    await expect(headerBadge).not.toContainText('8.3 km');

    // 2. Open Operations and check descriptions (no atmospheric track correlation)
    const opMenuBtn = page.getByRole('button', { name: /^OPERATIONS/i });
    await opMenuBtn.click();
    const opMenu = page.locator('.nav-dropdown-menu');
    await expect(opMenu).toBeVisible();
    const cycloneItemText = await opMenu.textContent();
    expect(cycloneItemText).not.toContain('atmospheric track correlation');
    expect(cycloneItemText).toContain('column heat content metrics');

    // 3. Open Data menu and check description does not hardcode Copernicus GLORYS
    const dataMenuBtn = page.locator('.nav-item').getByRole('button', { name: /^DATA/i });
    await dataMenuBtn.click();
    const dataItemText = await page.locator('.nav-dropdown-menu').textContent();
    expect(dataItemText).not.toContain('Manage Copernicus GLORYS');
    expect(dataItemText).toContain('Manage ocean datasets');

    // 4. Verify distinct Copernicus product retains its specific product identity (not rewritten to GLORYS12V1)
    await page.unroute('**/api/datasets');
    await page.unroute('**/api/metadata');
    await setupStandardRoutes(page, { activeDataset: COPERNICUS_BIO_DATASET });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible({ timeout: 15000 });

    const bioHeaderBadge = page.locator('[data-testid="header-source-badge"]');
    await expect(bioHeaderBadge).toBeVisible();
    await expect(bioHeaderBadge).toContainText('Copernicus Global Biogeochemistry Analysis');
    await expect(bioHeaderBadge).toContainText('25 km');
    await expect(bioHeaderBadge).not.toContainText('GLORYS12V1');

    await page.screenshot({ path: path.join(evidenceDir, 'tc-p03-01-header-provenance.png') });
  });

  test('TC-P03-02: Synthetic, remote unconfirmed, and unknown descriptors reflect honest non-live labels', async ({ page }) => {
    // 1. Synthetic dataset reflects SYNTHETIC and resolution honestly (never REAL)
    await setupStandardRoutes(page, { activeDataset: SYNTHETIC_DATASET });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible({ timeout: 15000 });

    const headerBadge = page.locator('[data-testid="header-source-badge"]');
    await expect(headerBadge).toBeVisible();
    await expect(headerBadge).toContainText('SYNTHETIC');
    await expect(headerBadge).not.toContainText('REAL');
    await expect(headerBadge).toContainText('25 km');

    // 2. Remote catalog descriptor does not promise a confirmed live feed
    await page.unroute('**/api/datasets');
    await page.unroute('**/api/metadata');
    await setupStandardRoutes(page, { activeDataset: REMOTE_LIVE_DATASET });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible({ timeout: 15000 });

    const remoteBadge = page.locator('[data-testid="header-source-badge"]');
    await expect(remoteBadge).toBeVisible();
    await expect(remoteBadge).toContainText('REMOTE (UNCONFIRMED)');
    await expect(remoteBadge).not.toContainText('REAL');

    // 3. Missing source and resolution yields explicit UNKNOWN / Unknown resolution
    await page.unroute('**/api/datasets');
    await page.unroute('**/api/metadata');
    await setupStandardRoutes(page, { activeDataset: UNKNOWN_SOURCE_DATASET });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible({ timeout: 15000 });

    const unknownBadge = page.locator('[data-testid="header-source-badge"]');
    await expect(unknownBadge).toBeVisible();
    await expect(unknownBadge).toContainText('UNKNOWN • Unknown Source');
    await expect(unknownBadge).not.toContainText('km');

    await triggerCoordinateProbe(page, 15.0, 75.0);
    const inspector = page.locator('.location-inspector-card');
    await expect(inspector).toBeVisible();

    const inspectorSource = page.locator('[data-testid="inspector-source-badge"]');
    await expect(inspectorSource).toContainText('UNKNOWN • Unknown Source');

    const inspectorRes = page.locator('[data-testid="inspector-resolution-badge"]');
    await expect(inspectorRes).toContainText('Unknown resolution');

    await page.screenshot({ path: path.join(evidenceDir, 'tc-p03-02-synthetic-and-unknown-badge.png') });
  });

  test('TC-P03-03: Missing vs valid zero metrics in LocationInspector', async ({ page }) => {
    await setupStandardRoutes(page, { activeDataset: GLORYS_DATASET, metadata: GLORYS_METADATA });

    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dataset_id: GLORYS_DATASET.dataset_id,
          source_mode: 'REAL_LOCAL',
          timestamp: '2023-05-15T00:00:00Z',
          lat: 12.5,
          lon: 80.5,
          sst: null,
          sss: null,
          mld: null,
          d20: null
        })
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible({ timeout: 15000 });

    await triggerCoordinateProbe(page, 12.5, 80.5);

    const inspector = page.locator('.location-inspector-card');
    await expect(inspector).toBeVisible();

    // Check Source & Resolution Badges
    const srcBadge = page.locator('[data-testid="inspector-source-badge"]');
    await expect(srcBadge).toContainText('REAL • Copernicus GLORYS12V1 Global Reanalysis');
    const resBadge = page.locator('[data-testid="inspector-resolution-badge"]');
    await expect(resBadge).toContainText('8.3 km');

    // Historical timestamp preserved (no live claims)
    const timeBadge = page.locator('[data-testid="inspector-time-badge"]');
    await expect(timeBadge).toContainText('2023-05-15T00:00:00Z');

    // Missing metrics must show Unavailable and dash, not checkmark
    const sstRow = inspector.locator('[data-testid="metric-temperature"]');
    await expect(sstRow).toBeVisible();
    await expect(sstRow).toContainText('Unavailable');
    await expect(sstRow.locator('.metric-missing-dash')).toBeVisible();
    await expect(sstRow.locator('.metric-valid-icon')).not.toBeVisible();

    const mldRow = inspector.locator('[data-testid="metric-mld"]');
    await expect(mldRow).toBeVisible();
    await expect(mldRow).toContainText('Unavailable');
    await expect(mldRow.locator('.metric-missing-dash')).toBeVisible();
    await expect(mldRow.locator('.metric-valid-icon')).not.toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, 'tc-p03-03-inspector-missing-metrics.png') });
  });

  test('TC-P03-04: Genuine zero metrics are preserved and displayed with valid checkmark', async ({ page }) => {
    await setupStandardRoutes(page, { activeDataset: GLORYS_DATASET, metadata: GLORYS_METADATA });

    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dataset_id: GLORYS_DATASET.dataset_id,
          source_mode: 'REAL_LOCAL',
          timestamp: '2023-05-15T00:00:00Z',
          lat: 10.0,
          lon: 75.0,
          sst: 0.0,
          sss: 0.0,
          mld: 0.0,
          d20: 0.0
        })
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible({ timeout: 15000 });

    await triggerCoordinateProbe(page, 10.0, 75.0);

    const inspector = page.locator('.location-inspector-card');
    await expect(inspector).toBeVisible();

    // 0.0 must be displayed accurately (not fabricated "Unavailable" or "—")
    const sstRow = inspector.locator('[data-testid="metric-temperature"]');
    await expect(sstRow).toBeVisible();
    await expect(sstRow).toContainText('0.00°C');
    await expect(sstRow.locator('.metric-valid-icon')).toBeVisible();

    const mldRow = inspector.locator('[data-testid="metric-mld"]');
    await expect(mldRow).toBeVisible();
    await expect(mldRow).toContainText('0.0 m');
    await expect(mldRow.locator('.metric-valid-icon')).toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, 'tc-p03-04-inspector-valid-zeros.png') });
  });

  test('TC-P03-05: LocationInspector flags DATASET MISMATCH on conflicting probe response identity', async ({ page }) => {
    await setupStandardRoutes(page, { activeDataset: GLORYS_DATASET, metadata: GLORYS_METADATA });

    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dataset_id: 'incois_roms_nio_daily_0.05deg',
          source_mode: 'REAL_LOCAL',
          lat: 11.0,
          lon: 76.0,
          sst: 28.0
        })
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible({ timeout: 15000 });

    await triggerCoordinateProbe(page, 11.0, 76.0);

    const inspector = page.locator('.location-inspector-card');
    await expect(inspector).toBeVisible();

    const srcBadge = page.locator('[data-testid="inspector-source-badge"]');
    await expect(srcBadge).toContainText('DATASET MISMATCH');

    const resBadge = page.locator('[data-testid="inspector-resolution-badge"]');
    await expect(resBadge).toContainText('Unavailable');

    await page.screenshot({ path: path.join(evidenceDir, 'tc-p03-05-dataset-mismatch.png') });
  });

  test('TC-P03-06: Cyclone Mode Modal displays column heat metrics without RI prediction, uses returned category only, and sanitizes reference table', async ({ page }) => {
    await setupStandardRoutes(page, { activeDataset: GLORYS_DATASET, metadata: GLORYS_METADATA });

    // 1. Missing metrics fixture
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dataset_id: GLORYS_DATASET.dataset_id,
          source_mode: 'REAL_LOCAL',
          lat: 14.0,
          lon: 82.0,
          tchp: null,
          d26: null,
          sst: null,
          tchp_category: null
        })
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible({ timeout: 15000 });

    await triggerCoordinateProbe(page, 14.0, 82.0);

    const opMenuBtn = page.getByRole('button', { name: /^OPERATIONS/i });
    await opMenuBtn.click();
    await page.getByRole('button', { name: /Cyclone & Marine Conditions/i }).click();

    const cycloneModal = page.locator('.fixed.inset-0').filter({ hasText: /Tropical Cyclone & Ocean Heat Engine/i });
    await expect(cycloneModal).toBeVisible();

    // Verify Header Badge is "Model Column Metrics" (NOT "IMD & SAMUDRA")
    await expect(cycloneModal).toContainText('Model Column Metrics');
    await expect(cycloneModal).not.toContainText('IMD & SAMUDRA');

    // Verify Strict Source Separation Mandate
    await expect(cycloneModal).toContainText('Strict Source Separation Mandate');
    await expect(cycloneModal).toContainText('SAMUDRA-3D does NOT generate cyclone forecasts or track correlation');

    // Missing metrics display Unavailable without fabricated numbers
    await expect(cycloneModal.locator('[data-testid="cyclone-tchp-energy"]')).toContainText('Unavailable');
    await expect(cycloneModal.locator('[data-testid="cyclone-d26-isotherm"]')).toContainText('Unavailable');
    await expect(cycloneModal.locator('[data-testid="cyclone-sst"]')).toContainText('Unavailable');
    await expect(cycloneModal.locator('[data-testid="cyclone-tchp-category-badge"]')).toContainText('Unavailable');
    await expect(cycloneModal.locator('[data-testid="cyclone-heat-heuristic-value"]')).toContainText('Unavailable');

    // Close modal to allow header search input interaction
    await cycloneModal.getByRole('button', { name: 'Close' }).click();
    await expect(cycloneModal).toBeHidden();

    // 2. Finite Zero TCHP with ABSENT tchp_category fixture
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dataset_id: GLORYS_DATASET.dataset_id,
          source_mode: 'REAL_LOCAL',
          lat: 14.0,
          lon: 82.0,
          tchp: 0.0,
          d26: 0.0,
          sst: 0.0,
          tchp_category: null
        })
      });
    });

    // Re-trigger probe sounding at same point
    await triggerCoordinateProbe(page, 14.0, 82.0);

    // Reopen modal to inspect updated probe data
    await opMenuBtn.click();
    await page.getByRole('button', { name: /Cyclone & Marine Conditions/i }).click();
    await expect(cycloneModal).toBeVisible();

    // Finite zero renders exact numerical values with units
    await expect(cycloneModal.locator('[data-testid="cyclone-tchp-energy"]')).toContainText('0.0 kJ/cm²');
    await expect(cycloneModal.locator('[data-testid="cyclone-d26-isotherm"]')).toContainText('0.0 m');
    await expect(cycloneModal.locator('[data-testid="cyclone-sst"]')).toContainText('0.0°C');
    // Absent classification MUST show Unavailable, not fabricated "Low"
    await expect(cycloneModal.locator('[data-testid="cyclone-tchp-category-badge"]')).toContainText('Unavailable');
    await expect(cycloneModal.locator('[data-testid="cyclone-heat-heuristic-value"]')).toContainText('Limited Heat Content (<80 kJ/cm²)');

    // Close modal before next probe
    await cycloneModal.getByRole('button', { name: 'Close' }).click();
    await expect(cycloneModal).toBeHidden();

    // 3. Positive TCHP with RETURNED classification fixture
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dataset_id: GLORYS_DATASET.dataset_id,
          source_mode: 'REAL_LOCAL',
          lat: 14.0,
          lon: 82.0,
          tchp: 92.4,
          d26: 48.0,
          sst: 29.8,
          tchp_category: 'High'
        })
      });
    });

    await triggerCoordinateProbe(page, 14.0, 82.0);

    // Reopen modal to inspect updated probe data
    await opMenuBtn.click();
    await page.getByRole('button', { name: /Cyclone & Marine Conditions/i }).click();
    await expect(cycloneModal).toBeVisible();

    await expect(cycloneModal.locator('[data-testid="cyclone-tchp-energy"]')).toContainText('92.4 kJ/cm²');
    await expect(cycloneModal.locator('[data-testid="cyclone-d26-isotherm"]')).toContainText('48.0 m');
    await expect(cycloneModal.locator('[data-testid="cyclone-sst"]')).toContainText('29.8°C');
    await expect(cycloneModal.locator('[data-testid="cyclone-tchp-category-badge"]')).toContainText('High');
    await expect(cycloneModal.locator('[data-testid="cyclone-heat-heuristic-value"]')).toContainText('Elevated Heat Content (≥80 kJ/cm²)');

    // 4. Verify reference table contains no RI timing or guaranteed Cat 4/5 outcomes
    const refTable = cycloneModal.locator('[data-testid="cyclone-reference-table"]');
    await expect(refTable).toBeVisible();
    const tableText = await refTable.textContent();
    expect(tableText).not.toContain('Rapid Intensification (RI) within 24 hours');
    expect(tableText).not.toContain('within 24 hours');
    expect(tableText).not.toContain('sustains Category 4/5 Super Cyclones');
    expect(tableText).toContain('Note: TCHP represents vertical column ocean thermal energy above 26°C. It does not predict atmospheric track');

    await page.screenshot({ path: path.join(evidenceDir, 'tc-p03-06-cyclone-metrics-and-heuristics.png') });
  });

  test('TC-P03-07: Fisherman Mode Modal supports harbor focus/probe action and displays distinct model-derived front metrics', async ({ page }) => {
    await setupStandardRoutes(page, { activeDataset: GLORYS_DATASET, metadata: GLORYS_METADATA });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible({ timeout: 15000 });

    // Open Fisherman Mode Modal
    const opMenuBtn = page.getByRole('button', { name: /^OPERATIONS/i });
    await opMenuBtn.click();
    await page.getByRole('button', { name: /Fisherman View/i }).click();

    const fishermanModal = page.locator('.fixed.inset-0').filter({ hasText: /Fisherman Operational Intelligence/i });
    await expect(fishermanModal).toBeVisible();

    // Check Header & Badge
    await expect(fishermanModal).toContainText('Fisherman Operational Intelligence & Model PFZ Proxies');
    await expect(fishermanModal).toContainText('Model-Derived Heuristics');
    await expect(fishermanModal).not.toContainText('MoES / INCOIS PFZ');

    // Check Harbor Cards: conditions must be "Unavailable (Reference location"
    const veravalCard = fishermanModal.locator('.grid > div').filter({ hasText: /Veraval Fishing Harbor/i });
    await expect(veravalCard).toBeVisible();
    await expect(veravalCard).toContainText('Conditions: Unavailable (Reference location · use probe to inspect)');
    await expect(veravalCard).not.toContainText('28.2°C');
    await expect(veravalCard).not.toContainText('0.42°C/km');
    await expect(veravalCard).toContainText('Harbor Depth: ~14m');

    // Click "Focus Sector & Probe" on Veraval harbor card: verifies coordinates and focus action
    const focusBtn = veravalCard.getByRole('button', { name: /Focus Sector & Probe/i });
    await focusBtn.click();

    // Verifies modal closes and LocationInspector opens with Veraval coordinates (20.900° N, 70.370° E)
    await expect(fishermanModal).not.toBeVisible();
    const inspector = page.locator('.location-inspector-card');
    await expect(inspector).toBeVisible();
    const coordDisplay = inspector.locator('.coordinate-display');
    await expect(coordDisplay).toContainText('20.900° N');
    await expect(coordDisplay).toContainText('70.370° E');

    // Re-open Fisherman modal to verify Fronts tab
    await opMenuBtn.click();
    await page.getByRole('button', { name: /Fisherman View/i }).click();
    await expect(fishermanModal).toBeVisible();

    // Switch to Fronts tab
    const frontsTabBtn = fishermanModal.getByRole('button', { name: /Active Model Thermal Fronts/i });
    await expect(frontsTabBtn).toBeVisible();
    await expect(fishermanModal).not.toContainText('Live Thermal Fronts');
    await frontsTabBtn.click();

    // Front item must display distinct returned gradient and SST, with PFZ Heuristic Score
    const frontItem = fishermanModal.locator('.space-y-3').filter({ hasText: /Gradient Vectors/i });
    await expect(frontItem).toBeVisible();
    await expect(frontItem).toContainText('0.045 °C/km');
    await expect(frontItem).toContainText('28.5°C');
    await expect(frontItem).toContainText('PFZ Heuristic Score: 88%');
    await expect(frontItem).not.toContainText('PFZ Confidence');

    // Check notice disclaimers
    await expect(fishermanModal).toContainText('These are physical model proxies and not official MoES/INCOIS bulletins');
    await expect(fishermanModal).toContainText('Not an official MoES/INCOIS broadcast');

    await page.screenshot({ path: path.join(evidenceDir, 'tc-p03-07-fisherman-modal.png') });
  });

});
