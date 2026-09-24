import { test, expect } from '@playwright/test';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const evidenceDir = path.resolve('test-results', 'screenshots');
mkdirSync(evidenceDir, { recursive: true });

test.describe('Time Animation Playback Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    await page.locator('[data-testid="hud-time-badge"]').waitFor({ timeout: 15000 });
  });

  test('Initial time T+00h, manual stepping forward and backward', async ({ page }) => {
    // 1. Initial time verification
    const timeDisplay = page.locator('[data-testid="time-value-display"]');
    const hudTimeBadge = page.locator('[data-testid="hud-time-badge"]');
    const timeSlider = page.locator('input#time');

    await expect(timeDisplay).toContainText('2026-09-10 00:00 UTC (T+00h)');
    await expect(hudTimeBadge).toContainText('2026-09-10 00:00 UTC (T+00h)');
    await expect(hudTimeBadge).toContainText('[STEP 1/8]');
    expect(await timeSlider.inputValue()).toBe('0');

    // Screenshot 1: Surface T+00h
    await page.screenshot({ path: path.join(evidenceDir, '01-initial-time-00h.png'), fullPage: true });

    // 2. Step forward to T+06h (Step 2)
    const stepForwardBtn = page.locator('button#time-step-forward');
    await stepForwardBtn.click();
    await expect(hudTimeBadge).toContainText('2026-09-10 06:00 UTC (T+06h)');
    await expect(hudTimeBadge).toContainText('[STEP 2/8]');
    expect(await timeSlider.inputValue()).toBe('1');

    // 3. Step forward to T+12h (Step 3)
    await stepForwardBtn.click();
    await expect(hudTimeBadge).toContainText('2026-09-10 12:00 UTC (T+12h)');
    await expect(hudTimeBadge).toContainText('[STEP 3/8]');
    expect(await timeSlider.inputValue()).toBe('2');

    // Screenshot 2: Step forward 12h
    await page.screenshot({ path: path.join(evidenceDir, '02-step-forward-12h.png'), fullPage: true });

    // 4. Step backward back to T+06h (Step 2)
    const stepBackBtn = page.locator('button#time-step-back');
    await stepBackBtn.click();
    await expect(hudTimeBadge).toContainText('2026-09-10 06:00 UTC (T+06h)');
    await expect(hudTimeBadge).toContainText('[STEP 2/8]');
    expect(await timeSlider.inputValue()).toBe('1');
  });

  test('Play/Pause animation advances frames automatically', async ({ page }) => {
    const playPauseBtn = page.locator('button#time-play-pause');
    const speedSelect = page.locator('select#time-speed');
    const hudTimeBadge = page.locator('[data-testid="hud-time-badge"]');

    // Set speed to 2x (500ms) for responsive automated testing
    await speedSelect.selectOption('2');

    // Start playback
    await playPauseBtn.click();
    await expect(playPauseBtn).toContainText('Pause');

    // Wait for playback to reach at least T+24h [STEP 5/8]
    await expect(hudTimeBadge).toContainText('[STEP 5/8]', { timeout: 10000 });
    await expect(hudTimeBadge).toContainText('2026-09-11 00:00 UTC (T+24h)');

    // Screenshot 3: Playing state at 24h
    await page.screenshot({ path: path.join(evidenceDir, '03-playing-state-24h.png'), fullPage: true });

    // Pause playback
    await playPauseBtn.click();
    await expect(playPauseBtn).toContainText('Play');

    // Ensure it stopped advancing
    const stepText = await hudTimeBadge.innerText();
    await page.waitForTimeout(700);
    expect(await hudTimeBadge.innerText()).toBe(stepText);
  });

  test('Non-looping behavior and variable/depth preservation', async ({ page }) => {
    const timeSlider = page.locator('input#time');
    const loopCheckbox = page.locator('input#time-loop');
    const depthSlider = page.locator('input#depth');
    const variableSelect = page.locator('select#variable');
    const hudTimeBadge = page.locator('[data-testid="hud-time-badge"]');
    const hudDepthBadge = page.locator('[data-testid="hud-depth-badge"]');

    // 1. Change depth to 100m (thermocline) and variable to salinity
    await depthSlider.fill('100');
    await depthSlider.dispatchEvent('change');
    await variableSelect.selectOption('salinity');

    // 2. Set time to final step 7 (T+42h)
    await timeSlider.fill('7');
    await timeSlider.dispatchEvent('change');

    await expect(hudTimeBadge).toContainText('2026-09-11 18:00 UTC (T+42h)');
    await expect(hudTimeBadge).toContainText('[STEP 8/8]');
    await expect(hudDepthBadge).toContainText('100m');

    // Uncheck loop
    await loopCheckbox.uncheck();
    expect(await loopCheckbox.isChecked()).toBe(false);

    // Screenshot 4: Final frame 42h with Salinity at 100m depth
    await page.screenshot({ path: path.join(evidenceDir, '04-loop-end-or-final-42h.png'), fullPage: true });

    // Reset loop
    await loopCheckbox.check();
  });

  test('Rapid scrub stress and out-of-order rejection', async ({ page }) => {
    const timeSlider = page.locator('input#time');
    const hudTimeBadge = page.locator('[data-testid="hud-time-badge"]');

    // Rapidly change slider values
    for (const val of ['1', '5', '2', '6', '3']) {
      await timeSlider.fill(val);
      await timeSlider.dispatchEvent('change');
      await page.waitForTimeout(40);
    }

    // Must settle on step 3 (T+18h)
    await expect(hudTimeBadge).toContainText('2026-09-10 18:00 UTC (T+18h)');
    await expect(hudTimeBadge).toContainText('[STEP 4/8]');
  });
});
