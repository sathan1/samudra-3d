import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('..', 'docs', 'evidence', 'core-phase-01');
mkdirSync(evidenceDir, { recursive: true });

test.describe('Core Phase 01: Profile and Observation Validation Regression Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // Mock initial dataset catalog and metadata
    await page.route('**/api/datasets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_dataset_id: 'cmems_mod_glo_phy_my_0.083deg_P1D-m',
          datasets: [
            {
              dataset_id: 'cmems_mod_glo_phy_my_0.083deg_P1D-m',
              name: 'Copernicus GLORYS12V1 Global Reanalysis',
              source_mode: 'REAL_LOCAL'
            }
          ]
        })
      });
    });

    await page.route('**/api/metadata', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dataset_id: 'cmems_mod_glo_phy_my_0.083deg_P1D-m',
          depth_levels_m: [0, 5, 10, 20, 50, 100, 200, 500, 1000],
          time_timestamps: ['2025-01-04T00:00:00Z', '2025-01-04T06:00:00Z'],
          variables: {
            temperature: { name: 'Temperature', units: '°C' },
            salinity: { name: 'Salinity', units: 'PSU' }
          }
        })
      });
    });

    // Mock fleet lists
    await page.route('**/api/insitu/argo*', async (route) => {
      if (route.request().url().includes('/insitu/argo/')) {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ARGO_2902145',
            wmo_id: '2902145',
            name: 'Float 2902145',
            lat: 13.5,
            lon: 84.5,
            timestamp: '2025-01-04T06:00:00Z',
            cycle_number: 42,
            source_mode: 'OPERATIONAL'
          }
        ])
      });
    });

    await page.route('**/api/insitu/gliders*', async (route) => {
      if (route.request().url().includes('/insitu/gliders/')) {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'GLIDER_INCOIS_01',
            mission_name: 'Bay of Bengal Monsoon Mission',
            lat: 12.5,
            lon: 86.0,
            start_time: '2025-01-04T00:00:00Z',
            waypoints: [{ lat: 12.5, lon: 86.0, depth: 10, observed_temp: 28.2, observed_sal: 34.5 }]
          }
        ])
      });
    });

    // Navigate to workspace
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible({ timeout: 15000 });
  });

  test('TC-P01-01: Probed ocean point CTD builds Model Water Column Profile', async ({ page }) => {
    // Mock probe response with valid numerical model vertical column
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 14.25,
          lon: 85.50,
          time_idx: 0,
          timestamp: '2025-01-04T00:00:00Z',
          is_land: false,
          depths: [0, 5, 10, 25, 50, 100, 200, 500, 1000],
          temperature: [28.5, 28.2, 27.9, 25.1, 22.0, 18.2, 14.1, 8.5, 5.2],
          salinity: [34.2, 34.4, 34.8, 35.1, 35.2, 35.0, 34.9, 34.8, 34.7],
          sst: 28.5,
          sss: 34.2,
          mld: 35.0,
          d20: 110.0,
          nearest_observation: null
        })
      });
    });

    // Direct search coordinate trigger
    const searchInput = page.locator('input[type="search"]').first();
    await searchInput.fill('14.25, 85.50');

    const searchResultBtn = page.locator('.search-results-dropdown button').first();
    await expect(searchResultBtn).toBeVisible({ timeout: 5000 });
    await searchResultBtn.click();

    // Wait for LocationInspector to appear
    const inspector = page.locator('[aria-label="Location Inspector"]');
    await expect(inspector).toBeVisible({ timeout: 8000 });

    // Click CTD PROFILE button
    const ctdBtn = inspector.locator('button:has-text("CTD PROFILE")');
    await expect(ctdBtn).toBeVisible();
    await ctdBtn.click();

    // Verify ProfileModal opens with NUMERICAL MODEL PROFILE
    const profileModal = page.locator('[data-testid="profile-modal-container"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });
    await expect(profileModal.getByText('NUMERICAL MODEL PROFILE', { exact: true })).toBeVisible();

    // Verify Title shows model coordinates and not a stale float
    const title = page.locator('[data-testid="profile-title"]');
    await expect(title).toBeVisible();
    const titleText = await title.innerText();
    expect(titleText).toContain('Model Water Column Profile');
    expect(titleText).not.toContain('Float');

    // Verify SVG curves rendered
    await expect(page.locator('[data-testid="vertical-depth-svg"]')).toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-01-ctd-model-profile.png') });
  });

  test('TC-P01-02: Land coordinate renders explicit unavailable state in ProfileModal', async ({ page }) => {
    // Mock probe response for land terrain
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 19.0,
          lon: 73.0,
          time_idx: 0,
          timestamp: '2025-01-04T00:00:00Z',
          is_land: true,
          depths: [],
          temperature: [],
          salinity: [],
          nearest_observation: null
        })
      });
    });

    // Search land coordinate
    const searchInput = page.locator('input[type="search"]').first();
    await searchInput.fill('19.0, 73.0');

    const searchResultBtn = page.locator('.search-results-dropdown button').first();
    await expect(searchResultBtn).toBeVisible({ timeout: 5000 });
    await searchResultBtn.click();

    const inspector = page.locator('[aria-label="Location Inspector"]');
    await expect(inspector).toBeVisible({ timeout: 8000 });
    await expect(inspector.locator('text=LAND TERRAIN DETECTED')).toBeVisible();

    // Click CTD PROFILE button
    const ctdBtn = inspector.locator('button:has-text("CTD PROFILE")');
    await ctdBtn.click();

    // Verify ProfileModal renders unavailable panel
    const unavailableModal = page.locator('[data-testid="profile-modal-model-unavailable"]');
    await expect(unavailableModal).toBeVisible({ timeout: 5000 });
    await expect(unavailableModal.locator('text=Model Profile Data Unavailable')).toBeVisible();
    await expect(unavailableModal.locator('text=land terrain')).toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-02-land-model-unavailable.png') });
  });

  test('TC-P01-03: Compare from probe with nearest observation hydrates platform and runs comparison with exact metrics', async ({ page }) => {
    // Mock probe with nearest observation
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 13.5,
          lon: 84.5,
          time_idx: 0,
          timestamp: '2025-01-04T00:00:00Z',
          is_land: false,
          depths: [0, 10, 50],
          temperature: [28.5, 27.9, 22.0],
          salinity: [34.2, 34.8, 35.2],
          nearest_observation: {
            id: 'ARGO_2902145',
            name: 'Float 2902145',
            platform_type: 'argo',
            lat: 13.5,
            lon: 84.5,
            distance_km: 12.4,
            timestamp: '2025-01-04T06:00:00Z',
            depths: [0, 10, 50],
            temperature: [28.4, 27.8, 22.1],
            salinity: [34.3, 34.8, 35.1]
          }
        })
      });
    });

    await page.route('**/api/insitu/argo/ARGO_2902145', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ARGO_2902145',
          wmo_id: '2902145',
          name: 'Float 2902145',
          lat: 13.5,
          lon: 84.5,
          timestamp: '2025-01-04T06:00:00Z',
          depths: [0, 10, 50],
          temperature: [28.4, 27.8, 22.1],
          salinity: [34.3, 34.8, 35.1],
          qc_flags: [1, 1, 1],
          qc_summary: { pass_rate_pct: 100, good: 3, total: 3 }
        })
      });
    });

    await page.route('**/api/collocation/profile/ARGO_2902145*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profile_id: 'ARGO_2902145',
          platform_type: 'argo',
          model_health: 'EXCELLENT',
          temperature: {
            bias: -0.12,
            rmse: 0.24,
            mae: 0.18,
            valid_pairs: 3,
            spatial_distance_km: 12.4,
            prediction_tendency: 'Subsurface Cold Bias'
          },
          temperature_levels: [
            { depth: 0, observed_value: 28.4, model_value: 28.5, delta: 0.1, valid: true, qc_flag: 1 },
            { depth: 10, observed_value: 27.8, model_value: 27.9, delta: 0.1, valid: true, qc_flag: 1 },
            { depth: 50, observed_value: 22.1, model_value: 22.0, delta: -0.1, valid: true, qc_flag: 1 }
          ]
        })
      });
    });

    // Trigger probe
    const searchInput = page.locator('input[type="search"]').first();
    await searchInput.fill('13.5, 84.5');

    const searchResultBtn = page.locator('.search-results-dropdown button').first();
    await expect(searchResultBtn).toBeVisible({ timeout: 5000 });
    await searchResultBtn.click();

    const inspector = page.locator('[aria-label="Location Inspector"]');
    await expect(inspector).toBeVisible({ timeout: 8000 });
    await expect(inspector.locator('text=Float 2902145')).toBeVisible();

    // Click COMPARE MODEL
    const compareBtn = inspector.locator('button:has-text("COMPARE MODEL")');
    await compareBtn.click();

    // Verify ModelComparisonModal opens targeting ARGO_2902145
    const compModal = page.locator('[data-testid="model-comparison-modal"]');
    await expect(compModal).toBeVisible({ timeout: 8000 });

    const platformSelect = compModal.locator('[data-testid="compare-platform-select"]');
    await expect(platformSelect).toHaveValue('ARGO_2902145');

    // Verify exact scorecard metrics
    await expect(compModal.locator('[data-testid="metric-bias-val"]').first()).toHaveText('-0.12 °C');
    await expect(compModal.locator('[data-testid="metric-rmse-val"]').first()).toHaveText('0.24 °C');
    await expect(compModal.locator('[data-testid="metric-mae-val"]').first()).toHaveText('0.18 °C');
    await expect(compModal.locator('[data-testid="metric-pearson-val"]').first()).toHaveText('+1.0000');
    await expect(compModal.locator('[data-testid="metric-health-val"]').first()).toHaveText('EXCELLENT');

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-03-compare-nearest-argo.png') });
  });

  test('TC-P01-04: Compare from probe with no nearest observation shows unavailable panel even with loaded fleet', async ({ page }) => {
    // Mock probe with NO nearest observation
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 5.0,
          lon: 70.0,
          time_idx: 0,
          timestamp: '2025-01-04T00:00:00Z',
          is_land: false,
          depths: [0, 50, 100],
          temperature: [29.0, 25.0, 20.0],
          salinity: [35.0, 35.2, 35.1],
          nearest_observation: null
        })
      });
    });

    // Probe point in open ocean with no nearest float
    const searchInput = page.locator('input[type="search"]').first();
    await searchInput.fill('5.0, 70.0');

    const searchResultBtn = page.locator('.search-results-dropdown button').first();
    await expect(searchResultBtn).toBeVisible({ timeout: 5000 });
    await searchResultBtn.click();

    const inspector = page.locator('[aria-label="Location Inspector"]');
    await expect(inspector).toBeVisible({ timeout: 8000 });
    await expect(inspector.locator('text=No in-situ platform within collocation range')).toBeVisible();

    // Click COMPARE MODEL
    const compareBtn = inspector.locator('button:has-text("COMPARE MODEL")');
    await compareBtn.click();

    // Verify No-Platform unavailable modal is rendered
    const unavailableComp = page.locator('[data-testid="model-comparison-no-platform"]');
    await expect(unavailableComp).toBeVisible({ timeout: 5000 });
    await expect(unavailableComp.locator('text=No Nearby Observation Available')).toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-04-compare-no-nearest-unavailable.png') });
  });

  test('TC-P01-05: Observation Fleet drawer supports Buoy filter notice', async ({ page }) => {
    // Open drawer
    const drawerBtn = page.locator('[data-testid="open-observation-drawer-btn"]');
    await expect(drawerBtn).toBeVisible();
    await drawerBtn.click();

    const drawer = page.locator('[aria-label="In-Situ Observation Fleet Drawer"]');
    await expect(drawer).toBeVisible();

    // 1. Check BUOY filter notice
    const buoyFilter = drawer.locator('[data-testid="filter-buoy"]');
    await buoyFilter.click();
    await expect(drawer.locator('.unsupported-buoy-notice')).toBeVisible();
    await expect(drawer.locator('text=Moored Buoy Telemetry Unsupported')).toBeVisible();

    // 2. Switch back to ALL
    await drawer.locator('[data-testid="filter-all"]').click();
    await expect(drawer.locator('.platform-item-card').first()).toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-05-drawer-buoy-filter.png') });
  });

  test('TC-P01-06: Fleet drawer handles full Argo -> Glider -> Argo transitions with distinct detail shapes and preserved bad QC', async ({ page }) => {
    // Mock Argo detail with 1 bad QC flag level (67% pass rate)
    await page.route('**/api/insitu/argo/ARGO_2902145', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ARGO_2902145',
          wmo_id: '2902145',
          name: 'Float 2902145',
          lat: 13.5,
          lon: 84.5,
          timestamp: '2025-01-04T06:00:00Z',
          cycle_number: 42,
          depths: [0, 10, 50],
          temperature: [28.4, 27.8, 22.1],
          salinity: [34.3, 34.8, 35.1],
          qc_flags: [1, 3, 1],
          qc_summary: { pass_rate_pct: 67, good: 2, total: 3 }
        })
      });
    });

    // Mock Glider detail with waypoints and vertical depth arrays (matching GliderTransectDetail schema)
    await page.route('**/api/insitu/gliders/GLIDER_INCOIS_01', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'GLIDER_INCOIS_01',
          mission_name: 'Bay of Bengal Monsoon Mission',
          platform_type: 'glider',
          lat: 12.5,
          lon: 86.0,
          start_time: '2025-01-04T00:00:00Z',
          depths: [5, 25],
          temperature: [28.5, 27.1],
          salinity: [34.2, 34.9],
          qc_flags: [1, 1],
          qc_summary: { pass_rate_pct: 100, good: 2, total: 2 },
          waypoints: [
            { lat: 12.5, lon: 86.0, depth: 5, observed_temp: 28.5, observed_sal: 34.2 },
            { lat: 12.5, lon: 86.0, depth: 25, observed_temp: 27.1, observed_sal: 34.9 }
          ]
        })
      });
    });

    // 1. Open drawer and select Argo
    await page.locator('[data-testid="open-observation-drawer-btn"]').click();
    const drawer = page.locator('[aria-label="In-Situ Observation Fleet Drawer"]');
    await expect(drawer).toBeVisible();

    const argoCard = drawer.locator('.platform-item-card:has-text("2902145")');
    await argoCard.locator('button:has-text("OPEN PROFILE")').click();

    // Verify Argo Profile modal rendered with bad QC badge preserved
    const profileModal = page.locator('[data-testid="profile-modal-container"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });
    await expect(profileModal.getByText('ARGO FLOAT', { exact: true })).toBeVisible();
    await expect(profileModal.locator('[data-testid="qc-badge"]')).toHaveText('67% Pass (2/3 levels)');
    await expect(profileModal.locator('[data-testid="profile-title"]')).toHaveText('Float 2902145');

    // Close profile modal
    await profileModal.locator('[data-testid="deselect-float-btn"]').first().click();
    await expect(profileModal).not.toBeVisible();

    // 2. Select Glider from open drawer
    const gliderCard = drawer.locator('.platform-item-card:has-text("Bay of Bengal Monsoon Mission")');
    await gliderCard.locator('button:has-text("OPEN PROFILE")').click();

    await expect(profileModal).toBeVisible({ timeout: 5000 });
    await expect(profileModal.getByText('GLIDER TRANSECT', { exact: true })).toBeVisible();
    await expect(profileModal.locator('[data-testid="profile-title"]')).toHaveText('Bay of Bengal Monsoon Mission');

    // Close profile modal
    await profileModal.locator('[data-testid="deselect-float-btn"]').first().click();
    await expect(profileModal).not.toBeVisible();

    // 3. Re-select Argo from open drawer
    await argoCard.locator('button:has-text("OPEN PROFILE")').click();

    await expect(profileModal).toBeVisible({ timeout: 5000 });
    await expect(profileModal.getByText('ARGO FLOAT', { exact: true })).toBeVisible();
    await expect(profileModal.locator('[data-testid="profile-title"]')).toHaveText('Float 2902145');

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-06-drawer-transitions-qc.png') });
  });

  test('TC-P01-07: Out-of-order platform detail responses maintain final target ownership', async ({ page }) => {
    // Route for Argo with 400ms delay
    await page.route('**/api/insitu/argo/ARGO_2902145', async (route) => {
      await new Promise((r) => setTimeout(r, 400));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ARGO_2902145',
          wmo_id: '2902145',
          name: 'Float 2902145',
          lat: 13.5,
          lon: 84.5,
          timestamp: '2025-01-04T06:00:00Z',
          depths: [0, 50],
          temperature: [28.4, 22.1],
          salinity: [34.3, 35.1]
        })
      });
    });

    // Route for Glider with immediate response
    await page.route('**/api/insitu/gliders/GLIDER_INCOIS_01', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'GLIDER_INCOIS_01',
          mission_name: 'Bay of Bengal Monsoon Mission',
          platform_type: 'glider',
          lat: 12.5,
          lon: 86.0,
          start_time: '2025-01-04T00:00:00Z',
          depths: [10, 40],
          temperature: [28.2, 24.5],
          salinity: [34.5, 35.1],
          qc_flags: [1, 1],
          qc_summary: { pass_rate_pct: 100, good: 2, total: 2 },
          waypoints: [{ lat: 12.5, lon: 86.0, depth: 10, observed_temp: 28.2, observed_sal: 34.5 }]
        })
      });
    });

    // Open drawer
    await page.locator('[data-testid="open-observation-drawer-btn"]').click();
    const drawer = page.locator('[aria-label="In-Situ Observation Fleet Drawer"]');

    // Click Argo first (slow)
    await drawer.locator('.platform-item-card:has-text("2902145")').click();

    // Immediately click Glider (fast)
    await drawer.locator('.platform-item-card:has-text("Bay of Bengal Monsoon Mission")').click();

    // Open profile modal
    await drawer.locator('.platform-item-card:has-text("Bay of Bengal Monsoon Mission") button:has-text("OPEN PROFILE")').click();

    // Wait for the slow Argo response delay to expire
    await page.waitForTimeout(600);

    // Profile modal must remain owned by Glider, not overwritten by delayed Argo
    const profileModal = page.locator('[data-testid="profile-modal-container"]');
    await expect(profileModal).toBeVisible();
    await expect(profileModal.getByText('GLIDER TRANSECT', { exact: true })).toBeVisible();
    await expect(profileModal.locator('[data-testid="profile-title"]')).toHaveText('Bay of Bengal Monsoon Mission');

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-07-out-of-order-race-resolved.png') });
  });

  test('TC-P01-08: Deselecting or closing profile during detail loading prevents stale modal reopen or selection restoration', async ({ page }) => {
    // Route for Argo with 500ms delay
    await page.route('**/api/insitu/argo/ARGO_2902145', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ARGO_2902145',
          wmo_id: '2902145',
          name: 'Float 2902145',
          lat: 13.5,
          lon: 84.5,
          timestamp: '2025-01-04T06:00:00Z',
          depths: [0, 50],
          temperature: [28.4, 22.1],
          salinity: [34.3, 35.1]
        })
      });
    });

    // Open drawer and click Argo
    await page.locator('[data-testid="open-observation-drawer-btn"]').click();
    const drawer = page.locator('[aria-label="In-Situ Observation Fleet Drawer"]');
    await drawer.locator('.platform-item-card:has-text("2902145") button:has-text("OPEN PROFILE")').click();

    // Modal opens in loading state
    const loadingModal = page.locator('[data-testid="profile-modal-loading"]');
    await expect(loadingModal).toBeVisible({ timeout: 3000 });

    // Close immediately before response arrives
    await loadingModal.locator('[data-testid="deselect-float-btn"]').click();
    await expect(loadingModal).not.toBeVisible();

    // Wait 700ms for delayed response to resolve
    await page.waitForTimeout(700);

    // Modal must NOT reopen or restore
    await expect(page.locator('[data-testid="profile-modal-container"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="profile-modal-loading"]')).not.toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-08-close-during-loading.png') });
  });

  test('TC-P01-09: Probe nearest comparison isolates target from prior selection without old-platform collocation request', async ({ page }) => {
    let oldPlatformCollocationRequested = false;

    // Track collocation requests
    await page.route('**/api/collocation/profile/ARGO_2902145*', async (route) => {
      oldPlatformCollocationRequested = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile_id: 'ARGO_2902145', platform_type: 'argo', temperature_levels: [] })
      });
    });

    await page.route('**/api/collocation/glider**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          glider_id: 'GLIDER_INCOIS_01',
          platform_type: 'glider',
          model_health: 'GOOD',
          temperature: { bias: 0.05, rmse: 0.15, mae: 0.10, valid_pairs: 2, spatial_distance_km: 8.2 },
          waypoints: [
            { depth: 5, observed_temp: 28.5, model_temp: 28.6, delta_temp: 0.1, valid: true },
            { depth: 25, observed_temp: 27.1, model_temp: 27.1, delta_temp: 0.0, valid: true }
          ]
        })
      });
    });

    await page.route('**/api/insitu/argo/ARGO_2902145', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ARGO_2902145',
          wmo_id: '2902145',
          name: 'Float 2902145',
          lat: 13.5,
          lon: 84.5,
          depths: [0, 50],
          temperature: [28.4, 22.1],
          salinity: [34.3, 35.1]
        })
      });
    });

    // 1. First select Argo from drawer
    await page.locator('[data-testid="open-observation-drawer-btn"]').click();
    const drawer = page.locator('[aria-label="In-Situ Observation Fleet Drawer"]');
    await drawer.locator('.platform-item-card:has-text("2902145") button:has-text("OPEN PROFILE")').click();
    await expect(page.locator('[data-testid="profile-modal-container"]')).toBeVisible();
    await page.locator('[data-testid="deselect-float-btn"]').first().click();
    await drawer.locator('[aria-label="Close Observation Drawer"]').click();
    oldPlatformCollocationRequested = false;

    // 2. Probe a point near the Glider with 300ms delayed glider detail
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 12.5,
          lon: 86.0,
          time_idx: 0,
          timestamp: '2025-01-04T00:00:00Z',
          is_land: false,
          depths: [0, 50],
          temperature: [28.5, 22.0],
          salinity: [34.2, 35.2],
          nearest_observation: {
            id: 'GLIDER_INCOIS_01',
            name: 'Bay of Bengal Monsoon Mission',
            platform_type: 'glider',
            lat: 12.5,
            lon: 86.0,
            distance_km: 8.2
          }
        })
      });
    });

    await page.route('**/api/insitu/gliders/GLIDER_INCOIS_01', async (route) => {
      await new Promise((r) => setTimeout(r, 300));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'GLIDER_INCOIS_01',
          mission_name: 'Bay of Bengal Monsoon Mission',
          platform_type: 'glider',
          lat: 12.5,
          lon: 86.0,
          start_time: '2025-01-04T00:00:00Z',
          depths: [5, 25],
          temperature: [28.5, 27.1],
          salinity: [34.2, 34.9],
          qc_flags: [1, 1],
          qc_summary: { pass_rate_pct: 100, good: 2, total: 2 },
          waypoints: [
            { lat: 12.5, lon: 86.0, depth: 5, observed_temp: 28.5, observed_sal: 34.2 },
            { lat: 12.5, lon: 86.0, depth: 25, observed_temp: 27.1, observed_sal: 34.9 }
          ]
        })
      });
    });

    const searchInput = page.locator('input[type="search"]').first();
    await searchInput.fill('12.5, 86.0');
    const searchResultBtn = page.locator('.search-results-dropdown button').first();
    await expect(searchResultBtn).toBeVisible({ timeout: 5000 });
    await searchResultBtn.click();

    const inspector = page.locator('[aria-label="Location Inspector"]');
    await expect(inspector).toBeVisible();

    // Click COMPARE MODEL
    const compareBtn = inspector.locator('button:has-text("COMPARE MODEL")');
    await compareBtn.click();

    const compModal = page.locator('[data-testid="model-comparison-modal"]');
    await expect(compModal).toBeVisible();

    // Verify comparison targets the glider and NO collocation was fired for old Argo platform
    const platformSelect = compModal.locator('[data-testid="compare-platform-select"]');
    await expect(platformSelect).toHaveValue('GLIDER_INCOIS_01');

    // Wait for Glider collocation to render
    await expect(compModal.locator('[data-testid="metric-bias-val"]').first()).toHaveText('+0.05 °C');
    expect(oldPlatformCollocationRequested).toBe(false);

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-09-probe-comparison-target-isolation.png') });
  });

  test('TC-P01-10: Closing comparison modal during nearest platform hydration invalidates pending response', async ({ page }) => {
    // Mock probe with nearest observation
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 13.5,
          lon: 84.5,
          time_idx: 0,
          timestamp: '2025-01-04T00:00:00Z',
          is_land: false,
          depths: [0, 50],
          temperature: [28.5, 22.0],
          salinity: [34.2, 35.2],
          nearest_observation: {
            id: 'ARGO_2902145',
            name: 'Float 2902145',
            platform_type: 'argo',
            lat: 13.5,
            lon: 84.5,
            distance_km: 12.4
          }
        })
      });
    });

    // Slow Argo detail response
    await page.route('**/api/insitu/argo/ARGO_2902145', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ARGO_2902145',
          wmo_id: '2902145',
          name: 'Float 2902145',
          lat: 13.5,
          lon: 84.5,
          depths: [0, 50],
          temperature: [28.4, 22.1],
          salinity: [34.3, 35.1]
        })
      });
    });

    const searchInput = page.locator('input[type="search"]').first();
    await searchInput.fill('13.5, 84.5');
    const searchResultBtn = page.locator('.search-results-dropdown button').first();
    await expect(searchResultBtn).toBeVisible({ timeout: 5000 });
    await searchResultBtn.click();

    const inspector = page.locator('[aria-label="Location Inspector"]');
    await expect(inspector).toBeVisible();

    // Click COMPARE MODEL
    await inspector.locator('button:has-text("COMPARE MODEL")').click();

    const compModal = page.locator('[data-testid="model-comparison-modal"]');
    await expect(compModal).toBeVisible();

    // Close comparison modal immediately while hydration is pending
    await compModal.locator('[data-testid="close-comparison-modal-btn"]').click();
    await expect(compModal).not.toBeVisible();

    // Wait 700ms for delayed hydration response
    await page.waitForTimeout(700);

    // Confirm no modal was inadvertently reopened
    await expect(compModal).not.toBeVisible();
    await expect(page.locator('[data-testid="profile-modal-container"]')).not.toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-10-close-comparison-hydration.png') });
  });

  test('TC-P01-11: Genuine out-of-order collocation responses across platform dropdown, strategy switches, and close invalidation do not overwrite newer results', async ({ page }) => {
    // Helper to create controlled Promise response gates
    const gateArgoLinear = (() => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; })();
    const gateGliderLinear = (() => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; })();
    const gateArgoNearest = (() => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; })();
    const gateArgoLinear2 = (() => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; })();

    let argoLinearRequestStarted = false;
    let gliderLinearRequestStarted = false;
    let argoNearestRequestStarted = false;
    let argoLinear2RequestStarted = false;

    await page.route('**/api/insitu/argo/ARGO_2902145', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ARGO_2902145',
          wmo_id: '2902145',
          name: 'Float 2902145',
          platform_type: 'argo',
          lat: 13.5,
          lon: 84.5,
          depths: [0, 50],
          temperature: [28.4, 22.1],
          salinity: [34.3, 35.1]
        })
      });
    });

    await page.route('**/api/insitu/gliders/GLIDER_INCOIS_01', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'GLIDER_INCOIS_01',
          mission_name: 'Bay of Bengal Monsoon Mission',
          platform_type: 'glider',
          lat: 12.5,
          lon: 86.0,
          start_time: '2025-01-04T00:00:00Z',
          waypoints: [
            { lat: 12.5, lon: 86.0, depth: 5, observed_temp: 28.5, observed_sal: 34.2 },
            { lat: 12.5, lon: 86.0, depth: 25, observed_temp: 27.1, observed_sal: 34.9 }
          ]
        })
      });
    });

    let argoCollocCount = 0;
    await page.route('**/api/collocation/profile/ARGO_2902145*', async (route) => {
      const url = route.request().url();
      if (url.includes('time_strategy=nearest')) {
        argoNearestRequestStarted = true;
        await gateArgoNearest.promise;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            profile_id: 'ARGO_2902145',
            platform_type: 'argo',
            model_health: 'GOOD',
            temperature: { bias: -0.44, rmse: 0.55, mae: 0.48, valid_pairs: 2 },
            salinity: { bias: 0.12, rmse: 0.22, mae: 0.18, valid_pairs: 2 },
            temperature_levels: [
              { depth: 0, observed_value: 28.4, model_value: 28.84, delta: 0.44, valid: true, qc_flag: 1 },
              { depth: 50, observed_value: 22.1, model_value: 22.54, delta: 0.44, valid: true, qc_flag: 1 }
            ]
          })
        });
      } else {
        argoCollocCount++;
        if (argoCollocCount === 1) {
          argoLinearRequestStarted = true;
          await gateArgoLinear.promise;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              profile_id: 'ARGO_2902145',
              platform_type: 'argo',
              model_health: 'GOOD',
              temperature: { bias: -0.15, rmse: 0.25, mae: 0.20, valid_pairs: 2 },
              salinity: { bias: 0.35, rmse: 0.45, mae: 0.40, valid_pairs: 2 },
              temperature_levels: [
                { depth: 0, observed_value: 28.4, model_value: 28.55, delta: 0.15, valid: true, qc_flag: 1 },
                { depth: 50, observed_value: 22.1, model_value: 22.25, delta: 0.15, valid: true, qc_flag: 1 }
              ],
              salinity_levels: [
                { depth: 0, observed_value: 34.3, model_value: 34.65, delta: 0.35, valid: true, qc_flag: 1 },
                { depth: 50, observed_value: 35.1, model_value: 35.45, delta: 0.35, valid: true, qc_flag: 1 }
              ]
            })
          });
        } else {
          argoLinear2RequestStarted = true;
          await gateArgoLinear2.promise;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              profile_id: 'ARGO_2902145',
              platform_type: 'argo',
              model_health: 'EXCELLENT',
              temperature: { bias: -0.15, rmse: 0.25, mae: 0.20, valid_pairs: 2 },
              salinity: { bias: 0.35, rmse: 0.45, mae: 0.40, valid_pairs: 2 },
              temperature_levels: [
                { depth: 0, observed_value: 28.4, model_value: 28.55, delta: 0.15, valid: true, qc_flag: 1 },
                { depth: 50, observed_value: 22.1, model_value: 22.25, delta: 0.15, valid: true, qc_flag: 1 }
              ]
            })
          });
        }
      }
    });

    await page.route('**/api/collocation/glider**', async (route) => {
      gliderLinearRequestStarted = true;
      await gateGliderLinear.promise;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          glider_id: 'GLIDER_INCOIS_01',
          platform_type: 'glider',
          model_health: 'OPTIMAL',
          temperature: { bias: 0.05, rmse: 0.15, mae: 0.10, valid_pairs: 2, spatial_distance_km: 8.2 },
          waypoints: [
            { depth: 5, observed_temp: 28.5, model_temp: 28.55, delta_temp: 0.05, valid: true },
            { depth: 25, observed_temp: 27.1, model_temp: 27.15, delta_temp: 0.05, valid: true }
          ]
        })
      });
    });

    // 1. Open comparison suite for Argo
    await page.locator('[data-testid="open-observation-drawer-btn"]').click();
    const drawer = page.locator('[aria-label="In-Situ Observation Fleet Drawer"]');
    await drawer.locator('.platform-item-card:has-text("2902145") button:has-text("COMPARE MODEL")').click();

    const compModal = page.locator('[data-testid="model-comparison-modal"]');
    await expect(compModal).toBeVisible();

    // Wait for Argo request 1 to start
    await expect.poll(() => argoLinearRequestStarted).toBe(true);

    // 2. While Argo request 1 is pending, switch target platform dropdown to Glider
    const platformSelect = compModal.locator('[data-testid="compare-platform-select"]');
    await platformSelect.selectOption('GLIDER_INCOIS_01');

    // Wait for Glider request 2 to start
    await expect.poll(() => gliderLinearRequestStarted).toBe(true);

    // 3. Release newer Glider response FIRST
    gateGliderLinear.resolve();
    await expect(compModal.locator('[data-testid="metric-bias-val"]').first()).toHaveText('+0.05 °C', { timeout: 5000 });
    await expect(compModal.locator('[data-testid="metric-health-val"]').first()).toHaveText('OPTIMAL');

    // 4. Release older Argo response LAST
    gateArgoLinear.resolve();
    await page.waitForTimeout(300);

    // Assert that the old Argo response CANNOT overwrite the Glider metrics or platform
    await expect(compModal.locator('[data-testid="metric-bias-val"]').first()).toHaveText('+0.05 °C');
    await expect(compModal.locator('[data-testid="metric-health-val"]').first()).toHaveText('OPTIMAL');
    await expect(platformSelect).toHaveValue('GLIDER_INCOIS_01');

    // 5. Test temporal strategy switch out-of-order: switch to Argo, then switch strategy nearest -> linear
    await platformSelect.selectOption('ARGO_2902145');
    // Start strategy switch: nearest
    const strategySelect = compModal.locator('[data-testid="time-strategy-select"]');
    await strategySelect.selectOption('nearest');
    await expect.poll(() => argoNearestRequestStarted).toBe(true);

    // Immediately switch back to linear while nearest is pending
    await strategySelect.selectOption('linear');
    await expect.poll(() => argoLinear2RequestStarted).toBe(true);

    // Release newer linear response FIRST
    gateArgoLinear2.resolve();
    await expect(compModal.locator('[data-testid="metric-bias-val"]').first()).toHaveText('-0.15 °C', { timeout: 5000 });
    await expect(compModal.locator('[data-testid="metric-health-val"]').first()).toHaveText('EXCELLENT');

    // Release older nearest response LAST
    gateArgoNearest.resolve();
    await page.waitForTimeout(300);

    // Assert linear metrics remained intact
    await expect(compModal.locator('[data-testid="metric-bias-val"]').first()).toHaveText('-0.15 °C');
    await expect(compModal.locator('[data-testid="metric-health-val"]').first()).toHaveText('EXCELLENT');

    // 6. Test parameter switcher: Temperature <-> Salinity instant view
    await compModal.locator('[data-testid="compare-param-sal-btn"]').click();
    await expect(compModal.locator('[data-testid="metric-bias-val"]').first()).toHaveText('+0.35 PSU');

    // 7. Close modal with in-flight collocation request pending and confirm clean closed state & no reopening
    const gatePendingClose = (() => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; })();
    let pendingCloseRequestStarted = false;
    await page.route('**/api/collocation/glider**', async (route) => {
      pendingCloseRequestStarted = true;
      await gatePendingClose.promise;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          glider_id: 'GLIDER_INCOIS_01',
          platform_type: 'glider',
          model_health: 'OPTIMAL',
          temperature: { bias: 0.05, rmse: 0.15, mae: 0.10, valid_pairs: 2, spatial_distance_km: 8.2 },
          waypoints: [
            { depth: 5, observed_temp: 28.5, model_temp: 28.55, delta_temp: 0.05, valid: true }
          ]
        })
      });
    });

    // Trigger in-flight collocation request by switching platform dropdown to Glider
    await platformSelect.selectOption('GLIDER_INCOIS_01');
    await expect.poll(() => pendingCloseRequestStarted).toBe(true);

    // Click close while collocation is genuinely pending in-flight
    await compModal.locator('[data-testid="close-comparison-modal-btn"]').click();
    await expect(compModal).not.toBeVisible();

    // Release the in-flight gate after closing
    gatePendingClose.resolve();
    await page.waitForTimeout(300);

    // Assert modal remains cleanly closed
    await expect(compModal).not.toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-11-out-of-order-collocation-gates.png') });
  });

  test('TC-P01-12: Probe point without nearest platform after completed comparison asserts unavailable state and no reused result', async ({ page }) => {
    // 1. Complete comparison for ARGO_2902145
    await page.route('**/api/insitu/argo/ARGO_2902145', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ARGO_2902145',
          wmo_id: '2902145',
          name: 'Float 2902145',
          lat: 13.5,
          lon: 84.5,
          depths: [0, 50],
          temperature: [28.4, 22.1],
          salinity: [34.3, 35.1]
        })
      });
    });

    await page.route('**/api/collocation/profile/ARGO_2902145*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profile_id: 'ARGO_2902145',
          platform_type: 'argo',
          temperature: { bias: -0.10, rmse: 0.20, mae: 0.15, valid_pairs: 2 },
          temperature_levels: [{ depth: 0, observed_value: 28.4, model_value: 28.5, delta: 0.1, valid: true, qc_flag: 1 }]
        })
      });
    });

    await page.locator('[data-testid="open-observation-drawer-btn"]').click();
    const drawer = page.locator('[aria-label="In-Situ Observation Fleet Drawer"]');
    await drawer.locator('.platform-item-card:has-text("2902145") button:has-text("COMPARE MODEL")').click();

    const compModal = page.locator('[data-testid="model-comparison-modal"]');
    await expect(compModal).toBeVisible();
    await compModal.locator('[data-testid="close-comparison-modal-btn"]').click();
    await expect(compModal).not.toBeVisible();
    await drawer.locator('[aria-label="Close Observation Drawer"]').click();

    // 2. Probe open ocean point with nearest_observation = null
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 5.0,
          lon: 70.0,
          time_idx: 0,
          timestamp: '2025-01-04T00:00:00Z',
          is_land: false,
          depths: [0, 50],
          temperature: [29.0, 25.0],
          salinity: [35.0, 35.2],
          nearest_observation: null
        })
      });
    });

    const searchInput = page.locator('input[type="search"]').first();
    await searchInput.fill('5.0, 70.0');
    const searchResultBtn = page.locator('.search-results-dropdown button').first();
    await expect(searchResultBtn).toBeVisible({ timeout: 5000 });
    await searchResultBtn.click();

    const inspector = page.locator('[aria-label="Location Inspector"]');
    await expect(inspector).toBeVisible();

    // Click COMPARE MODEL
    await inspector.locator('button:has-text("COMPARE MODEL")').click();

    // Must show No Nearby Observation Available panel, without reusing prior platform or metrics
    const unavailableModal = page.locator('[data-testid="model-comparison-no-platform"]');
    await expect(unavailableModal).toBeVisible();
    await expect(unavailableModal.locator('text=No Nearby Observation Available')).toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-12-no-nearest-after-comparison.png') });
  });

  test('TC-P01-13: Detail API failure displays visible error panel and retry action recovers cleanly', async ({ page }) => {
    let attempt = 0;
    await page.route('**/api/insitu/argo/ARGO_2902145', async (route) => {
      attempt++;
      if (attempt === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Telemetry data ingestion service timed out' })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'ARGO_2902145',
            wmo_id: '2902145',
            name: 'Float 2902145',
            lat: 13.5,
            lon: 84.5,
            timestamp: '2025-01-04T06:00:00Z',
            cycle_number: 42,
            depths: [0, 10, 50],
            temperature: [28.4, 27.8, 22.1],
            salinity: [34.3, 34.8, 35.1],
            qc_flags: [1, 1, 1],
            qc_summary: { pass_rate_pct: 100, good: 3, total: 3 }
          })
        });
      }
    });

    await page.locator('[data-testid="open-observation-drawer-btn"]').click();
    const drawer = page.locator('[aria-label="In-Situ Observation Fleet Drawer"]');
    await drawer.locator('.platform-item-card:has-text("2902145") button:has-text("OPEN PROFILE")').click();

    // 1. Verify error panel is rendered with retry button
    const errorModal = page.locator('[data-testid="profile-modal-error"]');
    await expect(errorModal).toBeVisible({ timeout: 5000 });
    await expect(errorModal.locator('text=Profile Ingestion Failed')).toBeVisible();
    const retryBtn = errorModal.locator('[data-testid="profile-retry-btn"]');
    await expect(retryBtn).toBeVisible();

    // 2. Click Retry and verify recovery
    await retryBtn.click();

    const profileModal = page.locator('[data-testid="profile-modal-container"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });
    await expect(profileModal.locator('[data-testid="profile-title"]')).toHaveText('Float 2902145');
    await expect(profileModal.locator('[data-testid="qc-badge"]')).toHaveText('100% Pass (3/3 levels)');
    await expect(page.locator('[data-testid="vertical-depth-svg"]')).toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-13-detail-failure-retry-recovery.png') });
  });

  test('TC-P01-14: Scorecard metrics calculate Pearson correlation accurately across negative, zero, zero-variance, and insufficient pairs', async ({ page }) => {
    await page.route('**/api/insitu/argo/ARGO_2902145', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ARGO_2902145',
          wmo_id: '2902145',
          name: 'Float 2902145',
          lat: 13.5,
          lon: 84.5,
          depths: [0, 10, 50],
          temperature: [28.4, 27.8, 22.1],
          salinity: [34.3, 34.8, 35.1]
        })
      });
    });

    let currentCase = 'negative';

    await page.route('**/api/collocation/profile/ARGO_2902145*', async (route) => {
      if (currentCase === 'negative') {
        // Negative Pearson correlation: inverse linear relationship
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            profile_id: 'ARGO_2902145',
            platform_type: 'argo',
            temperature: { bias: -0.10, rmse: 0.20, mae: 0.15, valid_pairs: 3 },
            temperature_levels: [
              { depth: 0, observed_value: 28.0, model_value: 20.0, delta: -8.0, valid: true, qc_flag: 1 },
              { depth: 10, observed_value: 25.0, model_value: 23.0, delta: -2.0, valid: true, qc_flag: 1 },
              { depth: 50, observed_value: 20.0, model_value: 28.0, delta: 8.0, valid: true, qc_flag: 1 }
            ]
          })
        });
      } else if (currentCase === 'zero') {
        // Zero Pearson correlation: orthogonal pairs
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            profile_id: 'ARGO_2902145',
            platform_type: 'argo',
            temperature: { bias: 0.0, rmse: 1.0, mae: 0.8, valid_pairs: 3 },
            temperature_levels: [
              { depth: 0, observed_value: 10.0, model_value: 20.0, delta: 10.0, valid: true, qc_flag: 1 },
              { depth: 10, observed_value: 20.0, model_value: 10.0, delta: -10.0, valid: true, qc_flag: 1 },
              { depth: 50, observed_value: 30.0, model_value: 20.0, delta: -10.0, valid: true, qc_flag: 1 }
            ]
          })
        });
      } else if (currentCase === 'insufficient') {
        // Insufficient pairs: only 1 pair (n < 2)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            profile_id: 'ARGO_2902145',
            platform_type: 'argo',
            temperature: { bias: 0.1, rmse: 0.1, mae: 0.1, valid_pairs: 1 },
            temperature_levels: [
              { depth: 0, observed_value: 28.0, model_value: 28.1, delta: 0.1, valid: true, qc_flag: 1 }
            ]
          })
        });
      } else {
        // Zero variance: constant model values
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            profile_id: 'ARGO_2902145',
            platform_type: 'argo',
            temperature: { bias: 0.0, rmse: 1.2, mae: 0.9, valid_pairs: 3 },
            temperature_levels: [
              { depth: 0, observed_value: 28.4, model_value: 25.0, delta: -3.4, valid: true, qc_flag: 1 },
              { depth: 10, observed_value: 27.8, model_value: 25.0, delta: -2.8, valid: true, qc_flag: 1 },
              { depth: 50, observed_value: 22.1, model_value: 25.0, delta: 2.9, valid: true, qc_flag: 1 }
            ]
          })
        });
      }
    });

    await page.locator('[data-testid="open-observation-drawer-btn"]').click();
    const drawer = page.locator('[aria-label="In-Situ Observation Fleet Drawer"]');
    await drawer.locator('.platform-item-card:has-text("2902145") button:has-text("COMPARE MODEL")').click();

    const compModal = page.locator('[data-testid="model-comparison-modal"]');
    await expect(compModal).toBeVisible();

    // 1. Negative Pearson R verification
    await expect(compModal.locator('[data-testid="metric-pearson-val"]').first()).toHaveText('-1.0000');

    // 2. Zero Pearson R verification
    currentCase = 'zero';
    await compModal.locator('[data-testid="run-prediction-job-btn"]').click();
    await expect(compModal.locator('[data-testid="metric-pearson-val"]').first()).toHaveText('0.0000');

    // 3. Zero Variance verification
    currentCase = 'zero_variance';
    await compModal.locator('[data-testid="run-prediction-job-btn"]').click();
    await expect(compModal.locator('[data-testid="metric-pearson-val"]').first()).toHaveText('n/a (zero variance)');

    // 4. Insufficient pairs verification (n < 2)
    currentCase = 'insufficient';
    await compModal.locator('[data-testid="run-prediction-job-btn"]').click();
    await expect(compModal.locator('[data-testid="metric-pearson-val"]').first()).toHaveText('n/a (n<2)');

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-14-pearson-exact-calculations.png') });
  });

  test('TC-P01-15: Platform dispatch uses explicit platform_type metadata regardless of ID spelling prefix', async ({ page }) => {
    // Argo float with GLIDER prefix in ID
    const oddArgoId = 'GLIDER_ARGO_99';
    // Glider with non-glider prefix in ID
    const oddGliderId = 'INCOIS_SG01';

    let argoEndpointRequested = false;
    let argoCollocRequested = false;
    let gliderEndpointRequested = false;
    let gliderCollocRequested = false;

    await page.route(`**/api/insitu/argo/${oddArgoId}`, async (route) => {
      argoEndpointRequested = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: oddArgoId,
          wmo_id: '9999999',
          name: 'Float 9999999',
          platform_type: 'argo',
          lat: 11.0,
          lon: 82.0,
          depths: [0, 50, 100],
          temperature: [29.0, 26.0, 20.0],
          salinity: [34.5, 35.0, 35.2],
          qc_flags: [1, 1, 1],
          qc_summary: { pass_rate_pct: 100, good: 3, total: 3 }
        })
      });
    });

    await page.route(`**/api/collocation/profile/${oddArgoId}*`, async (route) => {
      argoCollocRequested = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profile_id: oddArgoId,
          platform_type: 'argo',
          model_health: 'GOOD',
          temperature: { bias: -0.05, rmse: 0.12, mae: 0.08, valid_pairs: 3 },
          temperature_levels: [
            { depth: 0, observed_value: 29.0, model_value: 29.05, delta: 0.05, valid: true, qc_flag: 1 },
            { depth: 50, observed_value: 26.0, model_value: 26.05, delta: 0.05, valid: true, qc_flag: 1 },
            { depth: 100, observed_value: 20.0, model_value: 20.05, delta: 0.05, valid: true, qc_flag: 1 }
          ]
        })
      });
    });

    let argoGliderCollocAttempted = false;
    await page.route(`**/api/collocation/profile/${oddGliderId}*`, async (route) => {
      argoGliderCollocAttempted = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile_id: oddGliderId, platform_type: 'argo', temperature_levels: [] })
      });
    });

    await page.route(`**/api/insitu/gliders/${oddGliderId}`, async (route) => {
      gliderEndpointRequested = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: oddGliderId,
          mission_name: 'SeaGlider Mission 01',
          platform_type: 'glider',
          lat: 14.0,
          lon: 88.0,
          start_time: '2025-01-04T00:00:00Z',
          depths: [10, 40],
          temperature: [28.1, 24.5],
          salinity: [34.6, 35.1],
          qc_flags: [1, 1],
          qc_summary: { pass_rate_pct: 100, good: 2, total: 2 },
          waypoints: [
            { lat: 14.0, lon: 88.0, depth: 10, observed_temp: 28.1, observed_sal: 34.6 },
            { lat: 14.0, lon: 88.0, depth: 40, observed_temp: 24.5, observed_sal: 35.1 }
          ]
        })
      });
    });

    await page.route('**/api/collocation/glider**', async (route) => {
      gliderCollocRequested = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          glider_id: oddGliderId,
          platform_type: 'glider',
          model_health: 'GOOD',
          temperature: { bias: 0.02, rmse: 0.08, mae: 0.05, valid_pairs: 2 },
          waypoints: [
            { depth: 10, observed_temp: 28.1, model_temp: 28.12, delta_temp: 0.02, valid: true },
            { depth: 40, observed_temp: 24.5, model_temp: 24.52, delta_temp: 0.02, valid: true }
          ]
        })
      });
    });

    // Probe point with nearest Argo float having GLIDER prefix in ID
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 11.0,
          lon: 82.0,
          time_idx: 0,
          timestamp: '2025-01-04T00:00:00Z',
          is_land: false,
          depths: [0, 50, 100],
          temperature: [29.0, 26.0, 20.0],
          salinity: [34.5, 35.0, 35.2],
          nearest_observation: {
            id: oddArgoId,
            name: 'Float 9999999',
            platform_type: 'argo',
            lat: 11.0,
            lon: 82.0,
            distance_km: 5.0
          }
        })
      });
    });

    const searchInput = page.locator('input[type="search"]').first();
    await searchInput.fill('11.0, 82.0');
    const searchResultBtn = page.locator('.search-results-dropdown button').first();
    await expect(searchResultBtn).toBeVisible({ timeout: 5000 });
    await searchResultBtn.click();

    const inspector = page.locator('[aria-label="Location Inspector"]');
    await expect(inspector).toBeVisible();

    // 1. Open comparison: must route to Argo endpoints even though ID starts with GLIDER
    await inspector.locator('button:has-text("COMPARE MODEL")').click();
    const compModal = page.locator('[data-testid="model-comparison-modal"]');
    await expect(compModal).toBeVisible();

    await expect.poll(() => argoEndpointRequested).toBe(true);
    await expect.poll(() => argoCollocRequested).toBe(true);
    expect(gliderEndpointRequested).toBe(false);
    expect(gliderCollocRequested).toBe(false);

    await compModal.locator('[data-testid="close-comparison-modal-btn"]').click();

    // 2. Probe point with nearest Glider having non-GLIDER prefix in ID and vertical depth arrays
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 14.0,
          lon: 88.0,
          time_idx: 0,
          timestamp: '2025-01-04T00:00:00Z',
          is_land: false,
          depths: [0, 50],
          temperature: [28.0, 24.0],
          salinity: [34.5, 35.0],
          nearest_observation: {
            id: oddGliderId,
            name: 'SeaGlider Mission 01',
            platform_type: 'glider',
            lat: 14.0,
            lon: 88.0,
            distance_km: 6.0
          }
        })
      });
    });

    await searchInput.fill('14.0, 88.0');
    const searchResultBtn2 = page.locator('.search-results-dropdown button').first();
    await expect(searchResultBtn2).toBeVisible({ timeout: 5000 });
    await searchResultBtn2.click();

    await inspector.locator('button:has-text("COMPARE MODEL")').click();
    await expect(compModal).toBeVisible();

    // Must route to glider endpoints and NOT Argo profile collocation
    await expect.poll(() => gliderEndpointRequested).toBe(true);
    await expect.poll(() => gliderCollocRequested).toBe(true);
    expect(argoGliderCollocAttempted).toBe(false);

    await compModal.locator('[data-testid="close-comparison-modal-btn"]').click();

    // 3. Verify fleet drawer / dropdown glider entry flow
    let fleetGliderCollocRequested = false;
    await page.route('**/api/collocation/glider**', async (route) => {
      fleetGliderCollocRequested = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          glider_id: 'GLIDER_INCOIS_01',
          platform_type: 'glider',
          model_health: 'OPTIMAL',
          temperature: { bias: 0.05, rmse: 0.15, mae: 0.10, valid_pairs: 2 },
          waypoints: [
            { depth: 5, observed_temp: 28.5, model_temp: 28.55, delta_temp: 0.05, valid: true }
          ]
        })
      });
    });

    await page.locator('[data-testid="open-observation-drawer-btn"]').click();
    const drawer = page.locator('[aria-label="In-Situ Observation Fleet Drawer"]');
    await drawer.locator('.platform-item-card:has-text("Bay of Bengal Monsoon Mission") button:has-text("COMPARE MODEL")').click();

    await expect(compModal).toBeVisible();
    await expect.poll(() => fleetGliderCollocRequested).toBe(true);
    expect(argoGliderCollocAttempted).toBe(false);

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-15-explicit-type-dispatch.png') });
  });

  test('TC-P01-16: All-null model columns and absent model metadata show explicit unavailable states rather than synthetic fallbacks', async ({ page }) => {
    // 1. Probe with all-null model column
    await page.route('**/api/ocean/probe*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 15.0,
          lon: 85.0,
          time_idx: 0,
          timestamp: '2025-01-04T00:00:00Z',
          is_land: false,
          depths: [0, 10, 50],
          temperature: [null, null, null],
          salinity: [null, null, null],
          nearest_observation: null
        })
      });
    });

    const searchInput = page.locator('input[type="search"]').first();
    await searchInput.fill('15.0, 85.0');
    const searchResultBtn = page.locator('.search-results-dropdown button').first();
    await expect(searchResultBtn).toBeVisible({ timeout: 5000 });
    await searchResultBtn.click();

    const inspector = page.locator('[aria-label="Location Inspector"]');
    await expect(inspector).toBeVisible();

    // Click CTD Profile
    await inspector.locator('button:has-text("CTD PROFILE")').click();

    // Verify ProfileModal renders explicit unavailable state with no fabricated curve data
    const unavailableModal = page.locator('[data-testid="profile-modal-model-unavailable"]');
    await expect(unavailableModal).toBeVisible();
    await expect(unavailableModal.locator('text=Model Profile Data Unavailable')).toBeVisible();
    await expect(unavailableModal.locator('text=No valid vertical ocean measurements available')).toBeVisible();

    await unavailableModal.locator('[data-testid="deselect-float-btn"]').click();

    // 2. Collocation response with absent model health and prediction tendency metadata
    await page.route('**/api/insitu/argo/ARGO_2902145', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ARGO_2902145',
          wmo_id: '2902145',
          name: 'Float 2902145',
          lat: 13.5,
          lon: 84.5,
          depths: [0, 50],
          temperature: [28.4, 22.1],
          salinity: [34.3, 35.1]
        })
      });
    });

    await page.route('**/api/collocation/profile/ARGO_2902145*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profile_id: 'ARGO_2902145',
          platform_type: 'argo',
          // Missing model_health and missing prediction_tendency
          temperature: { bias: 0.1, rmse: 0.2, mae: 0.15, valid_pairs: 2 },
          temperature_levels: [
            { depth: 0, observed_value: 28.4, model_value: 28.5, delta: 0.1, valid: true, qc_flag: 1 },
            { depth: 50, observed_value: 22.1, model_value: 22.2, delta: 0.1, valid: true, qc_flag: 1 }
          ]
        })
      });
    });

    await page.locator('[data-testid="open-observation-drawer-btn"]').click();
    const drawer = page.locator('[aria-label="In-Situ Observation Fleet Drawer"]');
    await drawer.locator('.platform-item-card:has-text("2902145") button:has-text("COMPARE MODEL")').click();

    const compModal = page.locator('[data-testid="model-comparison-modal"]');
    await expect(compModal).toBeVisible();

    // Health grade must show Unavailable (not default 'GOOD')
    await expect(compModal.locator('[data-testid="metric-health-val"]').first()).toHaveText('Unavailable');

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-16-all-null-and-absent-metadata.png') });
  });
});
