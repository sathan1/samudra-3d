import assert from 'node:assert/strict';
import { sampleColormap, getColormapCssGradient, VARIABLE_CONFIGS } from '../src/utils/colormaps.js';

console.log('--- Testing SAMUDRA-3D Scientific Colormaps (cmocean) ---');

// 1. Thermal colormap anchor stops
{
  const cMin = sampleColormap('thermal', 0.0);
  assert.deepEqual(cMin.map(v => Math.round(v * 100)), [5, 20, 55], 'Thermal min should be deep blue');

  const cMid = sampleColormap('thermal', 0.5);
  assert.deepEqual(cMid.map(v => Math.round(v * 100)), [15, 72, 45], 'Thermal midpoint should be green-teal');

  const cMax = sampleColormap('thermal', 1.0);
  assert.deepEqual(cMax.map(v => Math.round(v * 100)), [92, 18, 15], 'Thermal max should be coral red');
  console.log('[OK] cmocean thermal stops verified (min: blue, mid: teal, max: coral)');
}

// 2. Haline colormap anchor stops
{
  const cMin = sampleColormap('haline', 0.0);
  assert.deepEqual(cMin.map(v => Math.round(v * 100)), [22, 12, 55], 'Haline min should be indigo');

  const cMid = sampleColormap('haline', 0.5);
  assert.deepEqual(cMid.map(v => Math.round(v * 100)), [10, 65, 55], 'Haline midpoint should be cyan-teal');

  const cMax = sampleColormap('haline', 1.0);
  assert.deepEqual(cMax.map(v => Math.round(v * 100)), [95, 90, 35], 'Haline max should be light yellow');
  console.log('[OK] cmocean haline stops verified (min: indigo, mid: cyan-teal, max: yellow)');
}

// 3. Robustness against extreme and invalid inputs
{
  // Clamping below 0.0
  const cUnder = sampleColormap('thermal', -2.5);
  assert.deepEqual(cUnder, sampleColormap('thermal', 0.0), 'Negative values must clamp to 0.0');

  // Clamping above 1.0
  const cOver = sampleColormap('thermal', 99.0);
  assert.deepEqual(cOver, sampleColormap('thermal', 1.0), 'Values above 1.0 must clamp to 1.0');

  // NaN and Infinity safety
  const cNaN = sampleColormap('haline', NaN);
  assert.deepEqual(cNaN, sampleColormap('haline', 0.0), 'NaN must clamp safely to 0.0');

  const cInf = sampleColormap('haline', Infinity);
  assert.deepEqual(cInf, sampleColormap('haline', 1.0), 'Infinity must clamp safely to 1.0');
  console.log('[OK] Clamping and numerical robustness verified (out-of-bounds, NaN, Infinity)');
}

// 4. CSS Gradient string generation
{
  const gradThermal = getColormapCssGradient('thermal');
  assert(gradThermal.startsWith('linear-gradient(to right,'), 'Thermal gradient format valid');
  assert(gradThermal.includes('0%') && gradThermal.includes('100%'), 'Gradient includes stop percentages');

  const gradHaline = getColormapCssGradient('haline');
  assert(gradHaline.startsWith('linear-gradient(to right,'), 'Haline gradient format valid');
  assert(gradHaline.includes('rgb(242, 230, 89)'), 'Haline gradient includes max stop');
  console.log('[OK] CSS gradient generation verified for both palettes');
}

// 5. Variable metadata contracts
{
  assert.equal(VARIABLE_CONFIGS.temperature.units, '°C');
  assert.equal(VARIABLE_CONFIGS.temperature.palette, 'thermal');
  assert.equal(VARIABLE_CONFIGS.salinity.units, 'PSU');
  assert.equal(VARIABLE_CONFIGS.salinity.palette, 'haline');
  console.log('[OK] Variable units and palette mapping verified');
}

console.log('ALL COLORMAP NUMERICAL TESTS PASSED (100%)');
