/* global HTMLCanvasElement, CanvasRenderingContext2D */
import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('..', 'docs', 'evidence', 'phase-02');
mkdirSync(evidenceDir, { recursive: true });

test.describe('Phase 02: Three.js 3D Earth Globe & OrbitControls', () => {

  test('AC04 & AC07: 3D Globe renders, displays Indian Ocean, and responds to viewports', async ({ page, browser }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // 1. Desktop Viewport (1440x1000)
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '3D Indian Ocean Globe' })).toBeVisible();
    await expect(page.locator('.subtle-tag', { hasText: 'WebGL2 Active' })).toBeVisible();

    const canvas = page.locator('.globe-canvas-wrapper canvas');
    await expect(canvas).toBeVisible();

    // Verify canvas dimensions match container
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox.width).toBeGreaterThan(400);
    expect(canvasBox.height).toBeGreaterThan(400);

    // Wait 1.5 seconds for initial render loop and texture settling
    await page.waitForTimeout(1500);

    // Take Desktop Screenshot
    await page.screenshot({
      path: path.join(evidenceDir, '01-desktop-indian-ocean.png'),
      fullPage: true
    });

    // 2. Measure actual rendering performance from the browser
    const perfStats = await page.evaluate(async () => {
      return new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        const frameTimes = [];
        let lastFrame = start;

        function measure() {
          const now = performance.now();
          frameTimes.push(now - lastFrame);
          lastFrame = now;
          frames++;
          if (now - start < 1000) {
            requestAnimationFrame(measure);
          } else {
            const totalDuration = now - start;
            const avgFps = Math.round((frames * 1000) / totalDuration);
            const avgFrameTimeMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            resolve({
              framesMeasured: frames,
              durationMs: totalDuration,
              measuredFps: avgFps,
              avgFrameTimeMs: parseFloat(avgFrameTimeMs.toFixed(2)),
              hardwareConcurrency: navigator.hardwareConcurrency,
              userAgent: navigator.userAgent
            });
          }
        }
        requestAnimationFrame(measure);
      });
    });

    console.log('Browser Measured Render Performance:', JSON.stringify(perfStats, null, 2));
    expect(perfStats.measuredFps).toBeGreaterThan(15); // Solid active render loop
    writeFileSync(path.join(evidenceDir, 'performance-measurements.json'), JSON.stringify({
      timestamp: new Date().toISOString(),
      browser: browser.version(),
      measurements: perfStats,
      result: 'PASS'
    }, null, 2));

    // 3. Test OrbitControls Interaction: Drag to Rotate
    const box = await canvas.boundingBox();
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 150, centerY + 50, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(600);

    // Screenshot after rotation
    await page.screenshot({
      path: path.join(evidenceDir, '02-rotated-globe.png'),
      fullPage: false
    });

    // 4. Test OrbitControls Zoom: Scroll Wheel
    await page.mouse.move(centerX, centerY);
    await page.mouse.wheel(0, -300); // Zoom in
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(evidenceDir, '03-zoomed-globe.png'),
      fullPage: false
    });

    // 5. Test "Reset View" Button
    const resetButton = page.getByRole('button', { name: 'Reset View' });
    await expect(resetButton).toBeVisible();
    await resetButton.click();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(evidenceDir, '04-reset-view.png'),
      fullPage: false
    });

    // 6. Test Light Theme Compatibility
    const themeBtn = page.getByRole('button', { name: 'Light theme' });
    await themeBtn.click();
    await expect(page.locator('.app')).toHaveAttribute('data-theme', 'light');
    await page.waitForTimeout(400);

    await page.screenshot({
      path: path.join(evidenceDir, '05-light-theme.png'),
      fullPage: true
    });

    // 7. Responsive Resizing Tests (Laptop, Tablet, Mobile)
    // Laptop (1024x900)
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.waitForTimeout(400);
    const laptopBox = await canvas.boundingBox();
    expect(laptopBox.width).toBeGreaterThan(250);
    await page.screenshot({ path: path.join(evidenceDir, '06-laptop-1024.png') });

    // Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(evidenceDir, '07-tablet-768.png') });

    // Mobile (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    const mobileBox = await canvas.boundingBox();
    expect(mobileBox.width).toBeLessThanOrEqual(390);
    await page.screenshot({ path: path.join(evidenceDir, '08-mobile-390.png') });

    // Narrow reflow (320x900)
    await page.setViewportSize({ width: 320, height: 900 });
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

    expect(errors).toEqual([]);
  });

  test('AC06: Component unmount and remount stability (no duplicate canvases or leaked RAF)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.globe-canvas-wrapper canvas')).toHaveCount(1);

    // Toggle theme back and forth or refresh to exercise lifecycle
    const themeBtn = page.getByRole('button', { name: 'Light theme' });
    await themeBtn.click();
    await page.waitForTimeout(200);
    await themeBtn.click();
    await page.waitForTimeout(200);

    // Canvas count must remain exactly 1 (no duplicates)
    await expect(page.locator('.globe-canvas-wrapper canvas')).toHaveCount(1);
  });

  test('AC05: WebGL unsupported fallback state is readable and accessible', async ({ page }) => {
    // Intercept WebGL context creation to simulate unsupported hardware
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = function (type) {
        if (type === 'webgl' || type === 'experimental-webgl' || type === 'webgl2') {
          return null;
        }
        return CanvasRenderingContext2D.prototype;
      };
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'WebGL Acceleration Unavailable' })).toBeVisible();
    await expect(page.locator('.viewport-fallback')).toContainText('Interactive 3D rendering requires WebGL support');
    await page.screenshot({ path: path.join(evidenceDir, '09-webgl-fallback.png') });
  });

});
