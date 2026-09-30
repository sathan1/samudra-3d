import { test, expect } from '@playwright/test';
import { buildScalarFieldGeometry } from '../src/utils/scalarField.js';

const datasetId = 'incois_roms_synthetic';
const lats = [0, 5, 10, 15, 20, 25];
const lons = [65, 70, 75, 80, 85, 90, 95];
const values = lats.map((_, j) => lons.map((_, i) => 28.5 + (i + j) / 20));

test('scalar coverage fades at its boundary without extending beyond valid cells', () => {
  const geometry = buildScalarFieldGeometry({ lats, lons, values, variable: 'temperature' });
  const colors = geometry.getAttribute('color');
  const alphas = Array.from({ length: colors.count }, (_, i) => colors.getW(i));
  expect(colors.itemSize).toBe(4);
  expect(Math.min(...alphas)).toBe(0);
  expect(Math.max(...alphas)).toBe(1);
  expect(geometry.getAttribute('position').count).toBe((lats.length - 1) * (lons.length - 1) * 6);
  geometry.dispose();
});

async function edgeBrightness(page) {
  const canvas = page.locator('.globe-canvas-wrapper canvas');
  const png = await canvas.screenshot();
  return page.evaluate(async (base64) => {
    const img = new window.Image();
    img.src = `data:image/png;base64,${base64}`;
    await img.decode();
    const scratch = document.createElement('canvas');
    scratch.width = img.width;
    scratch.height = img.height;
    const ctx = scratch.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const brightness = (fraction) => {
      const x = Math.round(img.width * fraction);
      const y = Math.round(img.height * 0.55);
      const pixels = ctx.getImageData(x - 3, y - 3, 7, 7).data;
      let sum = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        sum += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      }
      return sum / (pixels.length / 4);
    };
    return [brightness(0.05), brightness(0.95)];
  }, png.toString('base64'));
}

test('extreme zoom and basin navigation retain the globe silhouette on desktop and narrow screens', async ({ page }) => {
  await page.route('**/api/datasets', route => route.fulfill({ json: {
    active_dataset_id: datasetId,
    datasets: [{ dataset_id: datasetId, name: 'ROMS Synthetic Ocean Model', status: 'READY', source_mode: 'SYNTHETIC' }],
  } }));
  await page.route('**/api/metadata', route => route.fulfill({ json: {
    dataset_id: datasetId,
    depth_levels_m: [0, 10],
    time_timestamps: ['2026-09-10T00:00:00Z'],
    variables: { temperature: { name: 'Potential Temperature', units: 'degC' } },
  } }));
  await page.route('**/api/ocean-data*', route => route.fulfill({ json: {
    dataset_id: datasetId,
    variable: 'temperature',
    units: 'degC',
    requested_depth: 0,
    selected_depth: 0,
    time_idx: 0,
    timestamp: '2026-09-10T00:00:00Z',
    lats, lons, values,
    min_val: 28.5,
    max_val: 29.05,
    shape: [lats.length, lons.length],
  } }));

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await expect(page.getByTestId('hud-layer-badge')).toBeVisible();
  await page.getByRole('button', { name: 'Bay of Bengal', exact: true }).last().click();
  await page.waitForTimeout(900);

  const canvas = page.locator('.globe-canvas-wrapper canvas');
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -500);
  await page.waitForTimeout(500);
  for (const brightness of await edgeBrightness(page)) expect(brightness).toBeLessThan(55);
  await page.screenshot({ path: 'test-results/globe-box-after.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  for (const brightness of await edgeBrightness(page)) expect(brightness).toBeLessThan(55);
  await expect(page.getByTestId('hud-layer-badge')).toBeVisible();
  await page.screenshot({ path: 'test-results/globe-box-mobile-after.png' });
});
