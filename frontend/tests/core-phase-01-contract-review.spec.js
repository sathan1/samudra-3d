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

    // 2. Probe point with nearest Glider having non-GLIDER prefix in ID
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

    await expect.poll(() => gliderEndpointRequested).toBe(true);
    await expect.poll(() => gliderCollocRequested).toBe(true);

    await page.screenshot({ path: path.join(evidenceDir, 'TC-P01-15-explicit-type-dispatch.png') });
  });


});
