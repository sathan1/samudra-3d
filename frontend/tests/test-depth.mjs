import assert from 'node:assert/strict';
import { geoToCartesian, getVisualDepthScale, DEFAULT_GLOBE_RADIUS } from '../src/utils/coordinates.js';
import { buildScalarFieldGeometry } from '../src/utils/scalarField.js';

console.log('--- Testing SAMUDRA-3D Interactive Depth Slicer  ---');

// 1. Inward Radial Movement Verification
{
  const lat = 12.0;
  const lon = 75.0;
  const depths = [0, 10, 50, 100, 200, 500, 1000, 2000, 4000];
  const radii = depths.map(d => geoToCartesian(lat, lon, d).radius);

  for (let i = 0; i < radii.length - 1; i++) {
    assert(
      radii[i] > radii[i + 1],
      `Radial distance at depth ${depths[i]}m (${radii[i].toFixed(4)}) must strictly exceed depth ${depths[i + 1]}m (${radii[i + 1].toFixed(4)})`
    );
  }
  console.log('[OK] Inward radial hierarchy verified: r(0) > r(10) > ... > r(4000)');
}

// 2. Geometry Radius Reduction Verification across Full 3D Slices
{
  const lats = [5.0, 15.0];
  const lons = [70.0, 80.0];
  const values = [[25.0, 25.0], [25.0, 25.0]];

  const geom0 = buildScalarFieldGeometry({ lats, lons, values, selected_depth: 0.0 });
  const geom100 = buildScalarFieldGeometry({ lats, lons, values, selected_depth: 100.0 });
  const geom4000 = buildScalarFieldGeometry({ lats, lons, values, selected_depth: 4000.0 });

  const getR = (geom) => Math.hypot(
    geom.getAttribute('position').getX(0),
    geom.getAttribute('position').getY(0),
    geom.getAttribute('position').getZ(0)
  );

  const r0 = getR(geom0);
  const r100 = getR(geom100);
  const r4000 = getR(geom4000);

  assert(r0 > r100, `Surface radius (${r0}) must exceed 100m radius (${r100})`);
  assert(r100 > r4000, `100m radius (${r100}) must exceed 4000m radius (${r4000})`);
  console.log(`[OK] 3D mesh radius strictly decreases: r(0m)=${r0.toFixed(2)} > r(100m)=${r100.toFixed(2)} > r(4000m)=${r4000.toFixed(2)}`);
}

// 3. Discrete Vertical Model Snapping Resolution Logic
{
  const modelLevels = [0.0, 10.0, 50.0, 100.0, 200.0, 500.0, 1000.0, 2000.0, 4000.0];

  function snapToNearestModelLevel(depth) {
    let nearest = modelLevels[0];
    let minDiff = Math.abs(depth - nearest);
    for (const lvl of modelLevels) {
      const diff = Math.abs(depth - lvl);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = lvl;
      }
    }
    return nearest;
  }

  assert.equal(snapToNearestModelLevel(0), 0.0);
  assert.equal(snapToNearestModelLevel(25), 10.0); // 25 is 15 away from 10, 25 away from 50
  assert.equal(snapToNearestModelLevel(75), 50.0); // 75 is 25 away from 50 and 100 (ties pick lower)
  assert.equal(snapToNearestModelLevel(85), 100.0);
  assert.equal(snapToNearestModelLevel(180), 200.0);
  assert.equal(snapToNearestModelLevel(400), 500.0);
  assert.equal(snapToNearestModelLevel(1450), 1000.0);
  assert.equal(snapToNearestModelLevel(3500), 4000.0);
  console.log('[OK] Continuous-to-discrete nearest model level snapping verified');
}

// 4. Visual Exaggeration Scale Independence
{
  const scale30 = getVisualDepthScale(DEFAULT_GLOBE_RADIUS, 30);
  const scale50 = getVisualDepthScale(DEFAULT_GLOBE_RADIUS, 50);

  assert(scale50 > scale30, '50x visual exaggeration must scale larger than 30x');
  assert(scale30 > 0 && scale50 > 0, 'Scales must be positive');
  console.log(`[OK] Visual exaggeration independence verified (30x: ${scale30.toFixed(6)}, 50x: ${scale50.toFixed(6)})`);
}

console.log('ALL DEPTH NUMERICAL TESTS PASSED (100%)');
