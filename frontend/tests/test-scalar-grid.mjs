import assert from 'node:assert/strict';
import { getThermalColor, buildScalarFieldGeometry } from '../src/utils/scalarField.js';

console.log('--- Testing SAMUDRA-3D Scalar Field Geometry and Mapping ---');

// 1. Color mapping tests
{
  const cCold = getThermalColor(0.0);
  assert(cCold[0] < 0.1 && cCold[2] > 0.5, 'Cold temperature should be deep blue');

  const cWarm = getThermalColor(1.0);
  assert(cWarm[0] > 0.8 && cWarm[2] < 0.3, 'Warm temperature should be coral red');

  const cMid = getThermalColor(0.5);
  assert(cMid[1] > cMid[0] && cMid[1] > cMid[2], 'Mid temperature should be green-teal');
  console.log('[OK] Thermal colormap stops verified (blue -> teal -> coral)');
}

// 2. Corner gradient and orientation test
{
  const lats = [0.0, 10.0, 20.0, 25.0];
  const lons = [65.0, 75.0, 85.0, 95.0];
  const ny = lats.length;
  const nx = lons.length;

  // Values with distinct corner values:
  // SW: 10, SE: 15, NW: 20, NE: 25
  const values = [];
  for (let j = 0; j < ny; j++) {
    const row = [];
    for (let i = 0; i < nx; i++) {
      row.push(10.0 + (j / (ny - 1)) * 10.0 + (i / (nx - 1)) * 5.0);
    }
    values.push(row);
  }

  const geom = buildScalarFieldGeometry({
    lats,
    lons,
    values,
    selected_depth: 0.0,
    min_val: 10.0,
    max_val: 25.0
  });

  const posAttr = geom.getAttribute('position');
  assert(posAttr.count > 0, 'Geometry must contain vertices');

  // Verify that all vertices have Y >= 0 since all lats are >= 0
  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i);
    assert(y >= -1e-4, `Expected Y >= 0 for northern latitudes, got ${y}`);
  }

  console.log(`[OK] Grid orientation verified: ${posAttr.count / 3} triangles generated with consistent spherical Y >= 0`);
}

// 3. Land mask test: Quads containing null must NOT generate triangles
{
  const lats = [0.0, 10.0, 20.0];
  const lons = [70.0, 80.0, 90.0];
  // 3x3 grid with center cell [1, 1] as null (masked land)
  const values = [
    [28.0, 28.5, 29.0],
    [27.0, null, 28.0], // Center is land
    [26.0, 26.5, 27.0]
  ];

  const geom = buildScalarFieldGeometry({
    lats,
    lons,
    values,
    selected_depth: 0.0,
    min_val: 26.0,
    max_val: 29.0
  });

  const posAttr = geom.getAttribute('position');
  // Full 3x3 grid has 2x2 = 4 quads = 8 triangles.
  // Since center is null, all 4 quads touch the center cell, so ZERO quads have all 4 valid vertices.
  // Triangle count must be 0!
  assert.equal(posAttr.count, 0, 'Quads touching masked center cell must produce 0 triangles');
  console.log('[OK] Strict land-mask skipping verified: 0 triangles produced over masked land cells');
}

// 4. Subsurface depth radius reduction
{
  const lats = [5.0, 15.0];
  const lons = [70.0, 80.0];
  const values = [[25.0, 25.0], [25.0, 25.0]];

  const geomSurface = buildScalarFieldGeometry({ lats, lons, values, selected_depth: 0.0 });
  const geomDeep = buildScalarFieldGeometry({ lats, lons, values, selected_depth: 2000.0 });

  const rSurf = Math.hypot(
    geomSurface.getAttribute('position').getX(0),
    geomSurface.getAttribute('position').getY(0),
    geomSurface.getAttribute('position').getZ(0)
  );
  const rDeep = Math.hypot(
    geomDeep.getAttribute('position').getX(0),
    geomDeep.getAttribute('position').getY(0),
    geomDeep.getAttribute('position').getZ(0)
  );

  assert(rSurf > rDeep, `Surface radius (${rSurf.toFixed(2)}) must exceed deep radius (${rDeep.toFixed(2)})`);
  console.log(`[OK] Subsurface radius reduction verified: surface r=${rSurf.toFixed(2)} vs 2000m r=${rDeep.toFixed(2)}`);
}

console.log('ALL SCALAR FIELD GEOMETRY TESTS PASSED (100%)');
