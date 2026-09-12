import assert from 'node:assert/strict';
import { geoToCartesian, cartesianToGeo, DEFAULT_GLOBE_RADIUS, getVisualDepthScale } from '../src/utils/coordinates.js';

console.log('--- Testing SAMUDRA-3D Coordinate System ---');

const EPSILON = 1e-5;

function isClose(a, b, eps = EPSILON) {
  return Math.abs(a - b) < eps;
}

// 1. Anchor check: lat=0, lon=0 => +Z axis (0, 0, r)
{
  const p = geoToCartesian(0, 0, 0);
  assert(isClose(p.x, 0), `Expected x=0, got ${p.x}`);
  assert(isClose(p.y, 0), `Expected y=0, got ${p.y}`);
  assert(isClose(p.z, DEFAULT_GLOBE_RADIUS), `Expected z=${DEFAULT_GLOBE_RADIUS}, got ${p.z}`);
  assert(isClose(p.radius, DEFAULT_GLOBE_RADIUS));
  console.log('✔ Anchor (0°, 0°) correctly maps to +Z axis (0, 0, 100)');
}

// 2. Anchor check: lat=0, lon=90 => +X axis (r, 0, 0)
{
  const p = geoToCartesian(0, 90, 0);
  assert(isClose(p.x, DEFAULT_GLOBE_RADIUS), `Expected x=${DEFAULT_GLOBE_RADIUS}, got ${p.x}`);
  assert(isClose(p.y, 0), `Expected y=0, got ${p.y}`);
  assert(isClose(p.z, 0), `Expected z=0, got ${p.z}`);
  console.log('✔ Anchor (0°, 90°) correctly maps to +X axis (100, 0, 0)');
}

// 3. Anchor check: lat=90, lon=0 => +Y axis (North Pole)
{
  const p = geoToCartesian(90, 0, 0);
  assert(isClose(p.x, 0), `Expected x=0, got ${p.x}`);
  assert(isClose(p.y, DEFAULT_GLOBE_RADIUS), `Expected y=${DEFAULT_GLOBE_RADIUS}, got ${p.y}`);
  assert(isClose(p.z, 0), `Expected z=0, got ${p.z}`);
  console.log('✔ Anchor North Pole (90°, any) correctly maps to +Y axis (0, 100, 0)');
}

// 4. Anchor check: lat=-90, lon=0 => -Y axis (South Pole)
{
  const p = geoToCartesian(-90, 0, 0);
  assert(isClose(p.x, 0), `Expected x=0, got ${p.x}`);
  assert(isClose(p.y, -DEFAULT_GLOBE_RADIUS), `Expected y=-${DEFAULT_GLOBE_RADIUS}, got ${p.y}`);
  assert(isClose(p.z, 0), `Expected z=0, got ${p.z}`);
  console.log('✔ Anchor South Pole (-90°, any) correctly maps to -Y axis (0, -100, 0)');
}

// 5. Depth mapping: increasing depth must reduce radius
{
  const surface = geoToCartesian(10, 70, 0);
  const d500 = geoToCartesian(10, 70, 500);
  const d2000 = geoToCartesian(10, 70, 2000);
  const d4000 = geoToCartesian(10, 70, 4000);

  assert(surface.radius > d500.radius, 'Radius at 500m must be smaller than surface');
  assert(d500.radius > d2000.radius, 'Radius at 2000m must be smaller than 500m');
  assert(d2000.radius > d4000.radius, 'Radius at 4000m must be smaller than 2000m');

  const scale = getVisualDepthScale(DEFAULT_GLOBE_RADIUS, 30);
  const expectedR4000 = DEFAULT_GLOBE_RADIUS - 4000 * scale;
  assert(isClose(d4000.radius, expectedR4000), `Expected r=${expectedR4000}, got ${d4000.radius}`);
  console.log(`✔ Depth mapping verified: Surface r=${surface.radius.toFixed(3)}, 4000m r=${d4000.radius.toFixed(3)} (Delta=${(surface.radius - d4000.radius).toFixed(3)} units)`);
}

// 6. Roundtrip test: cartesianToGeo(geoToCartesian(lat, lon, depth))
{
  const testPoints = [
    [15.5, 72.8, 0],     // Arabian Sea near Mumbai
    [12.0, 85.0, 1500],  // Bay of Bengal deep
    [-5.0, 60.0, 3000],  // Central Indian Ocean basin
    [-30.0, 80.0, 4000]  // Southern Indian Ocean
  ];

  for (const [lat, lon, depth] of testPoints) {
    const c = geoToCartesian(lat, lon, depth);
    const g = cartesianToGeo(c.x, c.y, c.z);
    assert(isClose(g.lat, lat, 1e-4), `Lat mismatch: expected ${lat}, got ${g.lat}`);
    assert(isClose(g.lon, lon, 1e-4), `Lon mismatch: expected ${lon}, got ${g.lon}`);
    assert(isClose(g.depth, depth, 0.1), `Depth mismatch: expected ${depth}, got ${g.depth}`);
  }
  console.log('✔ Roundtrip Cartesian <-> Geographic conversions verified across Indian Ocean coordinates');
}

// 7. Exaggeration policy range (20x to 50x)
{
  for (const factor of [20, 30, 40, 50]) {
    const scale = getVisualDepthScale(DEFAULT_GLOBE_RADIUS, factor);
    const rAt4000 = DEFAULT_GLOBE_RADIUS - 4000 * scale;
    assert(rAt4000 > 90 && rAt4000 < 100, `Exaggeration ${factor}x should keep 4000m radius in realistic visual bracket`);
  }
  console.log('✔ Visual exaggeration policy (20x - 50x) validated within bounded subsurface bracket');
}

console.log('ALL COORDINATE ACCEPTANCE TESTS PASSED (100%)');
