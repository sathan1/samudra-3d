/**
 * Unit Test Suite for Frontend 3D Difference Field & Anomaly Utilities
 */
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  deltaToColor,
  createAnomalyFieldMesh,
  raycastAnomalyField,
  disposeAnomalyField,
  ANOMALY_COLORS
} from '../src/utils/anomalyField.js';

console.log('--- Testing SAMUDRA-3D 3D Difference Field & Anomaly Utilities  ---');

// 1. Test Diverging Color Mapping centered at zero (delta = MODEL - OBSERVED)
console.log('1. Testing diverging color mapping for residuals...');
{
  // Negative delta (model under-prediction) -> Blue spectrum (B > R)
  const colorUnder = deltaToColor(-1.5);
  assert.ok(colorUnder.b > colorUnder.r, `Under-prediction color (${colorUnder.getHexString()}) must have b > r`);
  assert.ok(colorUnder.b > 0.5, 'Blue channel should be significant');

  // Positive delta (model over-prediction) -> Red spectrum (R > B)
  const colorOver = deltaToColor(1.5);
  assert.ok(colorOver.r > colorOver.b, `Over-prediction color (${colorOver.getHexString()}) must have r > b`);
  assert.ok(colorOver.r > 0.5, 'Red channel should be significant');

  // Near-zero delta -> Neutral light grey/white
  const colorZero = deltaToColor(0.0);
  assert.ok(colorZero.r > 0.8 && colorZero.g > 0.8 && colorZero.b > 0.8, 'Zero delta should be light neutral');

  console.log('✓ 1. Diverging color mapping verified: under-prediction=blue, over-prediction=red, zero=neutral');
}

// 2. Test createAnomalyFieldMesh InstancedMesh generation
console.log('2. Testing createAnomalyFieldMesh generation with sample points...');
{
  const testPoints = [
    { platform_id: 'ARGO_2902145', platform_type: 'argo', lat: 10.0, lon: 75.0, depth: 10.0, delta: -0.45, is_alert: false },
    { platform_id: 'ARGO_2902145', platform_type: 'argo', lat: 10.0, lon: 75.0, depth: 50.0, delta: 0.82, is_alert: true },
    { platform_id: 'GLIDER_BOB_SG01', platform_type: 'glider', lat: 12.0, lon: 82.0, depth: 100.0, delta: 0.02, is_alert: false }
  ];

  const group = createAnomalyFieldMesh(testPoints, { globeRadius: 100, verticalExaggeration: 30 });
  assert.ok(group, 'createAnomalyFieldMesh should return a THREE.Group');
  assert.equal(group.name, 'anomaly-field-group');

  const instancedMesh = group.getObjectByName('anomaly-spheres-mesh');
  assert.ok(instancedMesh, 'Group must contain anomaly-spheres-mesh InstancedMesh');
  assert.equal(instancedMesh.count, 3, 'InstancedMesh count must equal input points count');
  assert.equal(instancedMesh.userData.points.length, 3);

  // Null or empty returns null
  assert.equal(createAnomalyFieldMesh([]), null);
  assert.equal(createAnomalyFieldMesh(null), null);

  console.log('✓ 2. InstancedMesh generation verified with 3 sample points and null handling');

  // 3. Test disposal
  disposeAnomalyField(group);
  console.log('✓ 3. disposeAnomalyField executed cleanly');
}

// 4. Test raycastAnomalyField
console.log('4. Testing raycastAnomalyField mock lookup...');
{
  const testPoints = [
    { platform_id: 'FLOAT_A', delta: -0.5 },
    { platform_id: 'FLOAT_B', delta: 1.2 }
  ];
  const group = createAnomalyFieldMesh(testPoints);

  // Mock raycaster hitting instance 1
  const mockRaycaster = {
    intersectObject(_obj, _recurse) {
      return [{ instanceId: 1 }];
    }
  };

  const hitPoint = raycastAnomalyField(mockRaycaster, group);
  assert.ok(hitPoint, 'Should return clicked point metadata');
  assert.equal(hitPoint.platform_id, 'FLOAT_B');
  assert.equal(hitPoint.delta, 1.2);

  // Missing raycaster returns null
  assert.equal(raycastAnomalyField(null, group), null);

  disposeAnomalyField(group);
  console.log('✓ 4. raycastAnomalyField verified with instance picking');
}

console.log('\n=== ALL 4 FRONTEND ANOMALY UNIT TESTS PASSED ===');
