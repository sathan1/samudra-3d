/**
 * SAMUDRA-3D Time Animation Utilities
 * Authority: Master Handbook physical pp. 6-7, 9-11; roadmap p. 10 (SIH26067)
 * Handles 4D numerical forecast playback, discrete UTC timestamps,
 * speed calculations, loop wrapping, and bounded request throttling.
 *
 * IMPORTANT (Master Prompt Section 9): timestamps are dynamic, loaded from dataset metadata.
 * Never hardcode scientific timestamps.  Call setForecastTimestamps() after
 * fetchMetadata() resolves so all time controls use the actual dataset timestamps.
 */

/** Mutable timestamp array — default synthetic values before metadata is loaded. */
let timestamps = [
  '2026-09-10T00:00:00Z','2026-09-10T06:00:00Z','2026-09-10T12:00:00Z',
  '2026-09-10T18:00:00Z','2026-09-11T00:00:00Z','2026-09-11T06:00:00Z',
  '2026-09-11T12:00:00Z','2026-09-11T18:00:00Z'
];

/** Fallback when metadata has not been loaded yet. */
export const DEFAULT_TIMESTAMPS = timestamps.slice();

/** Live backing count for TOTAL_FORECAST_STEPS — updated by setForecastTimestamps. */
let _totalSteps = timestamps.length;

/** Returns the currently active forecast timestamps (dynamic from dataset metadata). */
export function getForecastTimestamps() { return timestamps; }

/** Replaces timestamps with values from dataset metadata (Master Prompt Section 9).
 *  Call after fetchMetadata() resolves.  All time controls then use actual dataset timestamps. */
export function setForecastTimestamps(newTimestamps) {
  if (!Array.isArray(newTimestamps) || newTimestamps.length === 0) return;
  timestamps = newTimestamps.slice();
  _totalSteps = timestamps.length;
}

/** Total number of time steps (snapshot; use getTotalForecastSteps() for live value). */
export const TOTAL_FORECAST_STEPS = _totalSteps;

/** Returns the live total number of time steps (call this after metadata is loaded). */
export function getTotalForecastSteps() { return _totalSteps; }

/** Playback speed presets used by the sidebar control panel. */
export const SPEED_PRESETS = [
  { value: 0.5, label: '0.5×', intervalMs: 2000 },
  { value: 1.0, label: '1×', intervalMs: 1000 },
  { value: 2.0, label: '2×', intervalMs: 500 }
];

/** Maps playback speed multiplier to timer interval in milliseconds. */
export function getIntervalForSpeed(speed) {
  const num = typeof speed === 'number' ? speed : parseFloat(speed);
  if (num <= 0.5) return 2000;
  if (num >= 2.0) return 500;
  return 1000;
}

/** Computes forecast lead time in hours from time index using ACTUAL timestamp delta. */
export function getForecastLeadHours(timeIndex) {
  const idx = Math.max(0, Math.floor(Number(timeIndex) || 0));
  if (idx === 0 || timestamps.length < 2) return 0;
  try {
    const t0 = new Date(timestamps[0]).getTime();
    const ti = new Date(timestamps[idx]).getTime();
    if (isNaN(t0) || isNaN(ti)) return idx * 6;
    return (ti - t0) / 3600000;
  } catch { return idx * 6; }
}

/** Formats ISO timestamp + forecast lead time into UTC string.
 *  Example: '2025-01-03 00:00 UTC (T+48h)'  |  '2026-09-10 12:00 UTC (T+12h)' */
export function formatTimeLabel(isoString, timeIndex = 0) {
  const leadHours = getForecastLeadHours(timeIndex);
  const leadStr = `(T+${String(Math.round(leadHours)).padStart(2, '0')}h)`;
  if (!isoString) {
    const active = timestamps.length > 0 ? timestamps : DEFAULT_TIMESTAMPS;
    return formatTimeLabel(active[timeIndex] || active[0], timeIndex);
  }
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return `Step ${timeIndex} ${leadStr}`;
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth()+1).padStart(2,'0') + '-' + String(d.getUTCDate()).padStart(2,'0') + ' ' +
           String(d.getUTCHours()).padStart(2,'0') + ':' + String(d.getUTCMinutes()).padStart(2,'0') + ' UTC ' + leadStr;
  } catch { return 'Step ' + timeIndex + ' ' + leadStr; }
}

/** Computes the next time step index taking loop settings into account. */
export function computeNextStep(currentIndex, totalSteps, loop = true) {
  if (totalSteps == null || totalSteps <= 1) totalSteps = timestamps.length;
  const idx = Math.max(0, Math.floor(Number(currentIndex) || 0));
  if (idx < totalSteps - 1) return idx + 1;
  return loop ? 0 : idx;
}

/** Computes the previous time step index taking loop settings into account. */
export function computePrevStep(currentIndex, totalSteps, loop = true) {
  if (totalSteps == null || totalSteps <= 1) totalSteps = timestamps.length;
  const idx = Math.max(0, Math.floor(Number(currentIndex) || 0));
  if (idx > 0) return idx - 1;
  return loop ? totalSteps - 1 : 0;
}

/** Checks if the current step is the final frame in the forecast sequence. */
export function isFinalStep(currentIndex, totalSteps) {
  if (totalSteps == null || totalSteps <= 1) totalSteps = timestamps.length;
  const idx = Math.max(0, Math.floor(Number(currentIndex) || 0));
  return idx >= totalSteps - 1;
}
