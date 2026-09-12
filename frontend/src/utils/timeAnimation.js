/**
 * SAMUDRA-3D Time Animation Utilities
 * Authority: Master Handbook physical pp. 6-7, 9-11; roadmap p. 10 (SIH26067)
 * Handles 4D numerical forecast playback, discrete UTC timestamps,
 * speed calculations, loop wrapping, and bounded request throttling.
 */

export const FORECAST_TIMESTAMPS = [
  '2026-09-10T00:00:00Z',
  '2026-09-10T06:00:00Z',
  '2026-09-10T12:00:00Z',
  '2026-09-10T18:00:00Z',
  '2026-09-11T00:00:00Z',
  '2026-09-11T06:00:00Z',
  '2026-09-11T12:00:00Z',
  '2026-09-11T18:00:00Z'
];

export const TOTAL_FORECAST_STEPS = FORECAST_TIMESTAMPS.length;

export const SPEED_PRESETS = [
  { value: 0.5, label: '0.5×', intervalMs: 2000 },
  { value: 1.0, label: '1×', intervalMs: 1000 },
  { value: 2.0, label: '2×', intervalMs: 500 }
];

/**
 * Maps playback speed multiplier to timer interval in milliseconds.
 * 0.5x -> 2000ms, 1x -> 1000ms, 2x -> 500ms
 */
export function getIntervalForSpeed(speed) {
  const num = typeof speed === 'number' ? speed : parseFloat(speed);
  if (num <= 0.5) return 2000;
  if (num >= 2.0) return 500;
  return 1000;
}

/**
 * Computes forecast lead time in hours from time index.
 * Standard INCOIS 6-hourly interval: index 0 -> 0h, index 1 -> 6h, ..., index 7 -> 42h.
 */
export function getForecastLeadHours(timeIndex) {
  const idx = Math.max(0, Math.floor(Number(timeIndex) || 0));
  return idx * 6;
}

/**
 * Formats ISO timestamp and forecast lead time into human-readable scientific UTC string.
 * Example: '2026-09-10 12:00 UTC (T+12h)'
 */
export function formatTimeLabel(isoString, timeIndex = 0) {
  const leadHours = getForecastLeadHours(timeIndex);
  const leadStr = `(T+${String(leadHours).padStart(2, '0')}h)`;

  if (!isoString) {
    const fallback = FORECAST_TIMESTAMPS[timeIndex] || FORECAST_TIMESTAMPS[0];
    return formatTimeLabel(fallback, timeIndex);
  }

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return `Step ${timeIndex} ${leadStr}`;
    }
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes} UTC ${leadStr}`;
  } catch {
    return `Step ${timeIndex} ${leadStr}`;
  }
}

/**
 * Computes the next time step index taking loop settings into account.
 */
export function computeNextStep(currentIndex, totalSteps = TOTAL_FORECAST_STEPS, loop = true) {
  if (totalSteps <= 1) return currentIndex;
  const idx = Math.max(0, Math.floor(Number(currentIndex) || 0));
  if (idx < totalSteps - 1) {
    return idx + 1;
  }
  return loop ? 0 : idx;
}

/**
 * Computes the previous time step index taking loop settings into account.
 */
export function computePrevStep(currentIndex, totalSteps = TOTAL_FORECAST_STEPS, loop = true) {
  if (totalSteps <= 1) return currentIndex;
  const idx = Math.max(0, Math.floor(Number(currentIndex) || 0));
  if (idx > 0) {
    return idx - 1;
  }
  return loop ? totalSteps - 1 : 0;
}

/**
 * Checks if the current step is the final frame in the forecast sequence.
 */
export function isFinalStep(currentIndex, totalSteps = TOTAL_FORECAST_STEPS) {
  const idx = Math.max(0, Math.floor(Number(currentIndex) || 0));
  return idx >= totalSteps - 1;
}
