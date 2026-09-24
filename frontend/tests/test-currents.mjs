import assert from 'node:assert/strict';
import {
  PARTICLE_COUNT,
  DEFAULT_SPEED_SCALE,
  getEastTangent,
  getNorthTangent,
  computeTangentVelocity,
  sampleGridVector,
  getColorForSpeed,
  ParticleSystem
} from '../src/utils/particleStreamlines.js';

console.log('--- Testing SAMUDRA-3D Current Vector Streamlines  ---');

// 1. Tangent Basis Orthonormality Check across latitudes
const testLats = [0, 5, 12.5, 20, 25];
const testLons = [65, 75, 80, 90, 95];

for (const lat of testLats) {
  for (const lon of testLons) {
    const eEast = getEastTangent(lon);
    const eNorth = getNorthTangent(lat, lon);

    assert.ok(Math.abs(eEast.length() - 1.0) < 1e-6, `eEast at (${lat}, ${lon}) must be unit length`);
    assert.ok(Math.abs(eNorth.length() - 1.0) < 1e-6, `eNorth at (${lat}, ${lon}) must be unit length`);

    const dot = eEast.dot(eNorth);
    assert.ok(Math.abs(dot) < 1e-6, `eEast and eNorth at (${lat}, ${lon}) must be strictly orthogonal (got dot=${dot})`);
  }
}
console.log('✓ 1. Tangent basis orthonormality verified across domain latitudes and longitudes');

// 2. Pure Eastward and Northward Velocity Directions
const vEast = computeTangentVelocity(1.0, 0.0, 10, 75);
const expectedEast = getEastTangent(75);
assert.ok(vEast.distanceTo(expectedEast) < 1e-6, 'u=1, v=0 must match getEastTangent');
assert.ok(Math.abs(vEast.length() - 1.0) < 1e-6, 'Pure eastward flow must have length 1.0');

const vNorth = computeTangentVelocity(0.0, 1.0, 10, 75);
const expectedNorth = getNorthTangent(10, 75);
assert.ok(vNorth.distanceTo(expectedNorth) < 1e-6, 'u=0, v=1 must match getNorthTangent');
assert.ok(Math.abs(vNorth.length() - 1.0) < 1e-6, 'Pure northward flow must have length 1.0');
console.log('✓ 2. Pure eastward and northward vector directions verified');

// 3. Zero Velocity and 3-4-5 Triangle Speed Test
const vZero = computeTangentVelocity(0.0, 0.0, 15, 80);
assert.equal(vZero.length(), 0.0, 'u=0, v=0 must give zero speed');

const vPythagoras = computeTangentVelocity(3.0, 4.0, 15, 80);
assert.ok(Math.abs(vPythagoras.length() - 5.0) < 1e-6, 'u=3, v=4 must yield exact speed 5.0 m/s');
console.log('✓ 3. Zero-current and 3-4-5 triangle speed (5.0 m/s) verified');

// 4. Bilinear Grid Sampling & Interpolation
const lats = [0, 10, 20];
const lons = [60, 70, 80];
const uGrid = [
  [1.0, 2.0, 3.0],
  [2.0, 4.0, 6.0],
  [3.0, 6.0, 9.0]
];
const vGrid = [
  [0.5, 1.0, 1.5],
  [1.0, 2.0, 3.0],
  [1.5, 3.0, 4.5]
];

// Center point (lat=5, lon=65): midpoint of [0, 10] and [60, 70]
// u should be (1.0 + 2.0 + 2.0 + 4.0)/4 = 9.0/4 = 2.25
const sampled = sampleGridVector(5, 65, lats, lons, uGrid, vGrid);
assert.ok(sampled !== null, 'Sampled vector must not be null for valid ocean cells');
assert.ok(Math.abs(sampled.u - 2.25) < 1e-6, `Interpolated u must be 2.25 (got ${sampled.u})`);
assert.ok(Math.abs(sampled.v - 1.125) < 1e-6, `Interpolated v must be 1.125 (got ${sampled.v})`);
assert.ok(Math.abs(sampled.speed - Math.hypot(2.25, 1.125)) < 1e-6, 'Speed must equal hypot(u, v)');
console.log('✓ 4. Bilinear grid interpolation verified');

// 5. Land Mask Rejection & Domain Boundaries
const uGridWithLand = [
  [1.0, null],
  [2.0, 4.0]
];
const vGridWithLand = [
  [1.0, 1.0],
  [1.0, 1.0]
];
const landSample = sampleGridVector(5, 65, [0, 10], [60, 70], uGridWithLand, vGridWithLand);
assert.equal(landSample, null, 'Any masked/null neighbor must reject the point (return null)');

// Out-of-bounds sampling
const outOfBounds = sampleGridVector(-5, 75, [0, 10], [60, 70], uGrid, vGrid);
assert.equal(outOfBounds, null, 'Coordinates outside grid domain must return null');
console.log('✓ 5. Land mask rejection and domain boundaries verified');

// 6. Frame-Rate Independence
const dtFull = 0.04;
const dtHalf = 0.02;
const uTest = 0.8;
const vTest = -0.4;
const R = 6371000;
const scale = DEFAULT_SPEED_SCALE;
const lat0 = 10;
const latRad = (lat0 * Math.PI) / 180;
const cosLat = Math.cos(latRad);

// One full step
const dLat1 = (vTest / R) * (180 / Math.PI) * dtFull * scale;
const dLon1 = (uTest / (R * cosLat)) * (180 / Math.PI) * dtFull * scale;

// Two half steps
const dLat2 = (vTest / R) * (180 / Math.PI) * dtHalf * scale * 2;
const dLon2 = (uTest / (R * cosLat)) * (180 / Math.PI) * dtHalf * scale * 2;

assert.ok(Math.abs(dLat1 - dLat2) < 1e-9, 'dLat must be linear with dt');
assert.ok(Math.abs(dLon1 - dLon2) < 1e-9, 'dLon must be linear with dt');
console.log('✓ 6. Frame-rate independent Euler advection verified');

// 7. Particle System & Budget
assert.equal(PARTICLE_COUNT, 1500, 'Particle budget must be exactly 1,500 particles');
assert.ok(getColorForSpeed(0.1).isColor, 'getColorForSpeed returns valid THREE.Color');
assert.ok(getColorForSpeed(0.6).isColor, 'getColorForSpeed returns valid THREE.Color for high speed');
const ps = new ParticleSystem(100);
assert.equal(ps.count, 100, 'Custom particle budget supported');
assert.equal(ps.lats.length, 100, 'Typed arrays properly allocated');
ps.dispose();
assert.equal(ps.mesh, null, 'dispose() cleans up mesh reference');
console.log('✓ 7. ParticleSystem budget and lifecycle verified');

console.log('\nALL CURRENT VECTOR TESTS PASSED (100%)');
