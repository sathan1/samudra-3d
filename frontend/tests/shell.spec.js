import { test, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const evidence = path.resolve('test-results', 'shell');
mkdirSync(evidence, { recursive: true });

for (const viewport of [{ width: 1440, height: 1000 }, { width: 1024, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 900 }]) {
  test(`regression shell at ${viewport.width}px: layout, focus, availability, theme and refresh`, async ({ page, browser }) => {
    const errors = []
    const requests = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (['error'].includes(message.type())) errors.push(`${message.type()}: ${message.text()}`) })
    page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`))
    page.on('request', request => requests.push(request.url()))
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible()
    await page.locator('.subtle-tag', { hasText: '3D Thermal Layer Active' }).waitFor({ timeout: 5000 }).catch(() => {})
    const initialText = await page.locator('main').innerText()
    await expect(page.getByRole('status')).toContainText('3D Earth Globe active.')
    await expect(page.locator('canvas')).toBeVisible()
    const allAsideControls = page.locator('aside input, aside select, aside button')
    expect(await allAsideControls.count()).toBe(14)
    await expect(page.locator('select#variable')).toBeEnabled()
    await expect(page.locator('input#depth')).toBeEnabled()
    await expect(page.locator('input#time')).toBeEnabled()
    await expect(page.locator('button#time-play-pause')).toBeEnabled()
    const disabledControls = page.locator('aside input:disabled, aside button:disabled')
    expect(await disabledControls.count()).toBe(2)
    await expect(page.locator('input#layer-argo')).not.toBeChecked()
    const layout = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll('.dashboard > *')].map(el => {
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
      })
      return { boxes, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, tailwindDisplay: window.getComputedStyle(document.querySelector('.header')).display, minHeight: window.getComputedStyle(document.querySelector('.app')).minHeight }
    })
    expect(layout.scrollWidth).toBeLessThanOrEqual(viewport.width)
    expect(layout.tailwindDisplay).toBe('flex')
    expect(parseFloat(layout.minHeight)).toBe(viewport.height)
    for (let i = 0; i < layout.boxes.length; i++) {
      const a = layout.boxes[i]
      expect(a.x).toBeGreaterThanOrEqual(0)
      expect(a.right).toBeLessThanOrEqual(viewport.width)
      for (const b of layout.boxes.slice(i + 1)) {
        expect(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y).toBe(true)
      }
    }
    await page.screenshot({ path: path.join(evidence, `${viewport.width}-dark.png`), fullPage: true })
    // The only enabled controls are shell navigation/theme/disclosure and canvas hud.
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to ocean workspace' })).toBeFocused()
    const focus = await page.locator(':focus').evaluate(el => ({ outline: window.getComputedStyle(el).outlineStyle, width: window.getComputedStyle(el).outlineWidth, top: el.getBoundingClientRect().top }))
    expect(focus.outline).toBe('solid')
    expect(focus.width).toBe('3px')
    expect(focus.top).toBeGreaterThanOrEqual(0)
    await page.keyboard.press('Enter')
    await expect(page.locator('main')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('select#variable')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('input#depth')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('input#time')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('button#time-step-back')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('button#time-play-pause')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('button#time-step-forward')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('select#time-speed')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('input#time-loop')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('input#layer-argo')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('input#layer-glider')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('input#layer-currents')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Reset View' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="color-bar-legend"] button')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('input#toggle-anomaly-layer')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('summary')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('details')).toHaveAttribute('open', '')
    await page.keyboard.press('Enter')
    await expect(page.locator('details')).not.toHaveAttribute('open')
    const theme = page.getByRole('button', { name: 'Light theme' })
    await theme.focus()
    await page.keyboard.press('Space')
    await expect(theme).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.app')).toHaveAttribute('data-theme', 'light')
    await page.screenshot({ path: path.join(evidence, `${viewport.width}-light.png`), fullPage: true })
    await page.keyboard.press('Space')
    await expect(theme).toHaveAttribute('aria-pressed', 'false')
    // Check text and viewport geometry remain stable on refresh.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible()
    await page.locator('.subtle-tag', { hasText: '3D Thermal Layer Active' }).waitFor({ timeout: 5000 }).catch(() => {})
    expect(await page.locator('main').innerText()).toBe(initialText)
    expect(await page.locator('.dashboard').boundingBox()).not.toBeNull()
    await expect(page.locator('.app')).toHaveAttribute('data-theme', 'dark')
    expect(requests.every(url => url.startsWith('http://127.0.0.1:4175/') || url.startsWith('http://127.0.0.1:8000/api/'))).toBe(true)
    expect(requests.some(url => url.includes('/api/ocean-data'))).toBe(true)
    expect(errors).toEqual([])
    writeFileSync(path.join(evidence, `${viewport.width}-results.json`), JSON.stringify({ timestamp: new Date().toISOString(), browser: browser.version(), viewport, layout, focus, errors, requests, disabledControls: await disabledControls.count(), refreshTextStable: true, result: 'PASS' }, null, 2))
  })
}
