import assert from 'node:assert/strict';
import {
  FORECAST_TIMESTAMPS,
  TOTAL_FORECAST_STEPS,
  SPEED_PRESETS,
  getIntervalForSpeed,
  getForecastLeadHours,
  formatTimeLabel,
  computeNextStep,
  computePrevStep,
  isFinalStep
} from '../src/utils/timeAnimation.js';

console.log('--- Testing timeAnimation.js ---');

// 1. Forecast Timestamps & Step Counts
assert.equal(FORECAST_TIMESTAMPS.length, 8, 'Must have 8 forecast time steps');
assert.equal(TOTAL_FORECAST_STEPS, 8, 'TOTAL_FORECAST_STEPS must match array length');
for (let i = 0; i < FORECAST_TIMESTAMPS.length - 1; i++) {
  const d1 = new Date(FORECAST_TIMESTAMPS[i]).getTime();
  const d2 = new Date(FORECAST_TIMESTAMPS[i + 1]).getTime();
  const diffHours = (d2 - d1) / (1000 * 60 * 60);
  assert.equal(diffHours, 6, `Step ${i} to ${i+1} must be exactly 6 hours apart`);
}
console.log('✓ 1. Forecast timestamps valid and spaced 6h apart');

// 2. Playback Speed Intervals
assert.equal(getIntervalForSpeed(0.5), 2000, '0.5x speed must be 2000ms');
assert.equal(getIntervalForSpeed('0.5'), 2000, 'String 0.5x speed must parse to 2000ms');
assert.equal(getIntervalForSpeed(1.0), 1000, '1x speed must be 1000ms');
assert.equal(getIntervalForSpeed(2.0), 500, '2x speed must be 500ms');
assert.equal(getIntervalForSpeed('2'), 500, 'String 2x speed must parse to 500ms');
assert.equal(SPEED_PRESETS.length, 3, 'Must have 3 speed presets');
console.log('✓ 2. Speed multipliers and interval math verified');

// 3. Forecast Lead Time Hours
assert.equal(getForecastLeadHours(0), 0, 'Index 0 -> T+00h');
assert.equal(getForecastLeadHours(2), 12, 'Index 2 -> T+12h');
assert.equal(getForecastLeadHours(7), 42, 'Index 7 -> T+42h');
console.log('✓ 3. Lead hour calculations verified');

// 4. Timestamp Formatting
assert.equal(formatTimeLabel('2026-09-10T00:00:00Z', 0), '2026-09-10 00:00 UTC (T+00h)');
assert.equal(formatTimeLabel('2026-09-10T12:00:00Z', 2), '2026-09-10 12:00 UTC (T+12h)');
assert.equal(formatTimeLabel('2026-09-11T18:00:00Z', 7), '2026-09-11 18:00 UTC (T+42h)');
// Fallback when isoString is null
assert.equal(formatTimeLabel(null, 0), '2026-09-10 00:00 UTC (T+00h)');
console.log('✓ 4. Time label formatting verified');

// 5. Next Step Computation & Loop Behavior
assert.equal(computeNextStep(0, 8, true), 1, 'Step 0 -> 1');
assert.equal(computeNextStep(6, 8, true), 7, 'Step 6 -> 7');
assert.equal(computeNextStep(7, 8, true), 0, 'Step 7 with loop=true wraps to 0');
assert.equal(computeNextStep(7, 8, false), 7, 'Step 7 with loop=false clamps at 7');
// Single-frame dataset edge case
assert.equal(computeNextStep(0, 1, true), 0, 'Single-frame dataset remains 0');
console.log('✓ 5. Next step computation and wrapping verified');

// 6. Previous Step Computation & Loop Behavior
assert.equal(computePrevStep(7, 8, true), 6, 'Step 7 -> 6');
assert.equal(computePrevStep(1, 8, true), 0, 'Step 1 -> 0');
assert.equal(computePrevStep(0, 8, true), 7, 'Step 0 with loop=true wraps to 7');
assert.equal(computePrevStep(0, 8, false), 0, 'Step 0 with loop=false clamps at 0');
// Single-frame dataset edge case
assert.equal(computePrevStep(0, 1, true), 0, 'Single-frame dataset remains 0');
console.log('✓ 6. Previous step computation and wrapping verified');

// 7. Final Step Detection
assert.equal(isFinalStep(0, 8), false, 'Step 0 is not final');
assert.equal(isFinalStep(6, 8), false, 'Step 6 is not final');
assert.equal(isFinalStep(7, 8), true, 'Step 7 is final');
console.log('✓ 7. Final step detection verified');

console.log('\nAll timeAnimation unit tests PASSED (100%).');
