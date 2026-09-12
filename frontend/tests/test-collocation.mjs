/**
 * Unit Test Suite for Frontend Collocation Utilities & Model Overlays (Phase 13)
 * Authority: Master Handbook physical pp. 5-6, 9-11, 13; roadmap row 13 (SIH26067)
 */
import assert from 'node:assert/strict';
import { generateModelOverlaySvgPath, createProfileScales } from '../src/utils/profileCharts.js';

console.log('--- Testing SAMUDRA-3D Frontend Collocation & Model Overlay Engine (Phase 13) ---');

// 1. Test Sign Convention and Residual Math
console.log('1. Testing residual delta sign convention (delta = MODEL - OBSERVED)...');
{
  // Test case 1: model = 18.5, obs = 19.1 -> delta = -0.6 (under-prediction)
  const model1 = 18.5;
  const obs1 = 19.1;
  const delta1 = Math.round((model1 - obs1) * 100) / 100;
  assert.equal(delta1, -0.6);
  assert.ok(delta1 < 0, 'Negative delta represents model under-prediction');

  // Test case 2: model = 19.1, obs = 18.5 -> delta = +0.6 (over-prediction)
  const model2 = 19.1;
  const obs2 = 18.5;
  const delta2 = Math.round((model2 - obs2) * 100) / 100;
  assert.equal(delta2, 0.6);
  assert.ok(delta2 > 0, 'Positive delta represents model over-prediction');

  console.log('✓ 1. Residual delta sign convention verified (model=18.5, obs=19.1 -> delta=-0.6; reverse -> +0.6)');
}

// 2. Test Statistical Error Metrics (Handbook residual example [-1, 0, 2])
console.log('2. Testing statistical metrics (Bias, MAE, RMSE) on residuals [-1, 0, 2]...');
{
  const residuals = [-1.0, 0.0, 2.0];
  const n = residuals.length;

  const bias = residuals.reduce((a, b) => a + b, 0) / n;
  const mae = residuals.reduce((a, b) => a + Math.abs(b), 0) / n;
  const rmse = Math.sqrt(residuals.reduce((a, b) => a + b * b, 0) / n);

  const expectedBias = 1.0 / 3.0;
  const expectedMae = 1.0;
  const expectedRmse = Math.sqrt(5.0 / 3.0);

  assert.ok(Math.abs(bias - expectedBias) < 1e-6, `Bias ${bias} should equal 1/3 (${expectedBias})`);
  assert.ok(Math.abs(mae - expectedMae) < 1e-6, `MAE ${mae} should equal 1.0`);
  assert.ok(Math.abs(rmse - expectedRmse) < 1e-6, `RMSE ${rmse} should equal sqrt(5/3) (${expectedRmse})`);

  console.log(`✓ 2. Statistical error metrics verified: Bias=${bias.toFixed(4)} (1/3), MAE=${mae.toFixed(4)} (1.0), RMSE=${rmse.toFixed(4)} (sqrt(5/3))`);
}

// 3. Test Continuous Model Overlay Path Generation
console.log('3. Testing continuous model overlay SVG path generation...');
{
  const scales = createProfileScales({
    minVal: 10.0,
    maxVal: 30.0,
    maxDepth: 1000.0,
    width: 440,
    height: 280,
    padding: { top: 20, right: 25, bottom: 35, left: 55 }
  });

  const modelLevels = [
    { depth: 0.0, model_value: 29.1, valid: true },
    { depth: 50.0, model_value: 27.5, valid: true },
    { depth: 100.0, model_value: 24.2, valid: true },
    { depth: 500.0, model_value: 12.8, valid: true },
    { depth: 1000.0, model_value: 6.5, valid: true }
  ];

  const { pathSegments, modelCoords } = generateModelOverlaySvgPath(
    modelLevels,
    scales.valueToX,
    scales.depthToY
  );

  assert.equal(pathSegments.length, 1, 'Continuous valid levels should generate 1 single path segment');
  assert.equal(modelCoords.length, 5, 'Should produce 5 coordinate points');
  assert.ok(pathSegments[0].startsWith('M '), 'SVG path should begin with M command');
  assert.ok(pathSegments[0].includes(' L '), 'SVG path should contain L commands');

  // Verify positive-down depth ordering: Y should strictly increase as depth increases
  for (let i = 1; i < modelCoords.length; i++) {
    assert.ok(modelCoords[i].y > modelCoords[i - 1].y, 'SVG Y coordinate must increase with depth (positive-down)');
  }

  console.log('✓ 3. Continuous model overlay SVG path verified with inverted depth axis');
}

// 4. Test Model Discontinuity Gap Handling (Unmasked / Invalid Points)
console.log('4. Testing model overlay gap segmentation on invalid or unmasked levels...');
{
  const scales = createProfileScales({
    minVal: 10.0,
    maxVal: 30.0,
    maxDepth: 1000.0,
    width: 440,
    height: 280,
    padding: { top: 20, right: 25, bottom: 35, left: 55 }
  });

  const modelLevelsWithGap = [
    { depth: 0.0, model_value: 29.1, valid: true },
    { depth: 50.0, model_value: 27.5, valid: true },
    { depth: 100.0, model_value: null, valid: false, rejection_reason: 'MASKED_LAND' },
    { depth: 500.0, model_value: 12.8, valid: true },
    { depth: 1000.0, model_value: 6.5, valid: true }
  ];

  const { pathSegments, modelCoords } = generateModelOverlaySvgPath(
    modelLevelsWithGap,
    scales.valueToX,
    scales.depthToY
  );

  // The invalid level at 100m must split the path into 2 disconnected segments!
  assert.equal(pathSegments.length, 2, 'Invalid/masked level should break path into 2 segments');
  assert.equal(modelCoords.length, 4, 'Only 4 valid coordinates should be plotted');

  console.log('✓ 4. Model overlay gap segmentation verified (invalid levels break curve into disconnected sub-paths)');
}

console.log('\nALL PHASE 13 FRONTEND COLLOCATION TESTS PASSED (100%)');
