/**
 * Unit Test Suite for Underwater Glider Sawtooth Transects (Phase 12)
 * Authority: Master Handbook physical pp. 4, 6, 9-11, 13; roadmap p. 10 (SIH26067)
 */
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  waypointToCartesian,
  segmentGliderTrack,
  createGliderTransectMesh,
  disposeGliderTransects,
  GLIDER_COLORS
} from '../src/utils/gliderTransects.js';
import { DEFAULT_GLOBE_RADIUS, getVisualDepthScale } from '../src/utils/coordinates.js';

console.log('--- Testing SAMUDRA-3D Underwater Glider Transects Engine (Phase 12) ---');

// 1. Waypoint to Cartesian with Visual Depth Exaggeration
console.log('1. Testing waypoint coordinate projection and depth exaggeration...');
const surfacePt = waypointToCartesian(13.0, 84.0, 0.0);
assert(surfacePt instanceof THREE.Vector3, 'Surface point must be THREE.Vector3');
const surfaceR = surfacePt.length();
assert(Math.abs(surfaceR - DEFAULT_GLOBE_RADIUS) < 1e-4, `Surface radius must be exactly 100.0, got ${surfaceR}`);

const deepPt = waypointToCartesian(13.0, 84.0, 1000.0);
const deepR = deepPt.length();
assert(deepR < surfaceR, `Subsurface radius must be strictly less than surface radius (${deepR} < ${surfaceR})`);

const expectedScale = getVisualDepthScale(DEFAULT_GLOBE_RADIUS, 30);
const expectedOffset = 1000.0 * expectedScale;
const actualOffset = surfaceR - deepR;
assert(Math.abs(actualOffset - expectedOffset) < 1e-3, `Depth offset must match 30x vertical exaggeration policy (${actualOffset} vs ${expectedOffset})`);
console.log(`✓ 1. Waypoint coordinate projection verified (surface R=${surfaceR.toFixed(1)}, depth 1000m R=${deepR.toFixed(3)})`);

// 2. Clean Sawtooth Transect Segmentation
console.log('2. Testing clean sawtooth yo-yo dive/climb segmentation...');
const cleanWaypoints = [
  { waypoint_index: 0, timestamp: "2026-09-10T00:00:00Z", lat: 13.0, lon: 84.0, depth: 0.0, qc_flag: 1, phase: "surface" },
  { waypoint_index: 1, timestamp: "2026-09-10T01:00:00Z", lat: 13.1, lon: 84.1, depth: 250.0, qc_flag: 1, phase: "dive" },
  { waypoint_index: 2, timestamp: "2026-09-10T02:00:00Z", lat: 13.2, lon: 84.2, depth: 500.0, qc_flag: 1, phase: "dive" },
  { waypoint_index: 3, timestamp: "2026-09-10T03:00:00Z", lat: 13.3, lon: 84.3, depth: 1000.0, qc_flag: 1, phase: "bottom" },
  { waypoint_index: 4, timestamp: "2026-09-10T04:00:00Z", lat: 13.4, lon: 84.4, depth: 500.0, qc_flag: 1, phase: "climb" },
  { waypoint_index: 5, timestamp: "2026-09-10T05:00:00Z", lat: 13.5, lon: 84.5, depth: 0.0, qc_flag: 1, phase: "surface" }
];

const resClean = segmentGliderTrack(cleanWaypoints);
assert.equal(resClean.hasGaps, false, 'Clean transect must not have gaps');
assert.equal(resClean.segments.length, 1, 'Clean transect must have 1 continuous line segment');
assert.equal(resClean.segments[0].length, 6, 'Continuous segment must contain all 6 waypoints');
assert.equal(resClean.surfacings.length, 2, 'Must detect 2 surfacing events (start and end at 0m)');
assert.equal(resClean.diveBottoms.length, 1, 'Must detect 1 dive bottom turnaround (1000m)');
assert.equal(resClean.outliers.length, 0, 'Clean transect has 0 outliers');
console.log('✓ 2. Continuous sawtooth trajectory segmentation verified');

// 3. Gap Discontinuity & Bad QC / Missing Depth Rejection
console.log('3. Testing gap discontinuity and line bridging prevention...');
const gapWaypoints = [
  { waypoint_index: 0, timestamp: "2026-09-10T00:00:00Z", lat: 13.0, lon: 84.0, depth: 0.0, qc_flag: 1, phase: "surface" },
  { waypoint_index: 1, timestamp: "2026-09-10T01:00:00Z", lat: 13.1, lon: 84.1, depth: 250.0, qc_flag: 1, phase: "dive" },
  { waypoint_index: 2, timestamp: "2026-09-10T02:00:00Z", lat: 13.2, lon: 84.2, depth: 500.0, qc_flag: 1, phase: "dive" },
  // Corrupted point (QC flag 4)
  { waypoint_index: 3, timestamp: "2026-09-10T03:00:00Z", lat: 13.3, lon: 84.3, depth: 750.0, qc_flag: 4, phase: "dive" },
  // Missing depth (null)
  { waypoint_index: 4, timestamp: "2026-09-10T04:00:00Z", lat: 13.4, lon: 84.4, depth: null, qc_flag: 9, phase: "bottom" },
  // Valid continuation
  { waypoint_index: 5, timestamp: "2026-09-10T05:00:00Z", lat: 13.5, lon: 84.5, depth: 500.0, qc_flag: 1, phase: "climb" },
  { waypoint_index: 6, timestamp: "2026-09-10T06:00:00Z", lat: 13.6, lon: 84.6, depth: 0.0, qc_flag: 1, phase: "surface" }
];

const resGap = segmentGliderTrack(gapWaypoints);
assert.equal(resGap.hasGaps, true, 'Transect with bad QC and missing depth must report hasGaps=true');
assert.equal(resGap.segments.length, 2, 'Trajectory must be split into 2 disconnected sub-paths');
assert.equal(resGap.segments[0].length, 3, 'First segment has 3 points before gap');
assert.equal(resGap.segments[1].length, 2, 'Second segment has 2 points after gap');
assert.equal(resGap.outliers.length, 1, 'Must record 1 outlier waypoint');
assert.equal(resGap.outliers[0].qc_flag, 4, 'Outlier must have QC flag 4');
console.log('✓ 3. Discontinuity gap handling verified: invalid points split path and no bridge is rendered');

// 4. Temporal Gap Threshold Handling
console.log('4. Testing temporal gap threshold segmentation...');
const timeGapWaypoints = [
  { waypoint_index: 0, timestamp: "2026-09-10T00:00:00Z", lat: 13.0, lon: 84.0, depth: 0.0, qc_flag: 1 },
  { waypoint_index: 1, timestamp: "2026-09-10T02:00:00Z", lat: 13.1, lon: 84.1, depth: 500.0, qc_flag: 1 },
  // 24 hour telemetry gap (exceeds 12h threshold)
  { waypoint_index: 2, timestamp: "2026-09-11T04:00:00Z", lat: 13.5, lon: 84.5, depth: 500.0, qc_flag: 1 },
  { waypoint_index: 3, timestamp: "2026-09-11T06:00:00Z", lat: 13.6, lon: 84.6, depth: 0.0, qc_flag: 1 }
];
const resTime = segmentGliderTrack(timeGapWaypoints, 12);
assert.equal(resTime.hasGaps, true, 'Temporal gap exceeding 12h must trigger gap');
assert.equal(resTime.segments.length, 2, 'Temporal gap must split path into 2 segments');
console.log('✓ 4. Temporal gap handling verified');

// 5. Three.js Glider Mesh Creation & Selection
console.log('5. Testing Three.js 3D glider mesh creation...');
const mockGlider = {
  id: "GLIDER_UNIT_TEST",
  name: "Unit Test Glider",
  lat: 13.5,
  lon: 84.5,
  waypoints: cleanWaypoints
};

const defaultMesh = createGliderTransectMesh(mockGlider, { isSelected: false });
assert(defaultMesh instanceof THREE.Group, 'Glider mesh must be THREE.Group');
assert(defaultMesh.children.length >= 4, 'Must contain track lines, surfacing beacons, bottom markers, and head');

// Check line material color
const trackLine = defaultMesh.children.find(c => c.name.startsWith('glider-track-seg'));
assert(trackLine, 'Track line must exist in group');
assert.equal(trackLine.material.color.getHex(), GLIDER_COLORS.defaultTrack, 'Default track color must be emerald');

const selectedMesh = createGliderTransectMesh(mockGlider, { isSelected: true });
const selectedLine = selectedMesh.children.find(c => c.name.startsWith('glider-track-seg'));
assert.equal(selectedLine.material.color.getHex(), GLIDER_COLORS.selectedTrack, 'Selected track color must be sky blue');
console.log('✓ 5. Three.js 3D mesh creation and selection styling verified');

// 6. Resource Disposal
console.log('6. Testing Three.js resource disposal...');
disposeGliderTransects(defaultMesh);
assert.equal(defaultMesh.children.length, 0, 'Disposed mesh group must have 0 children');
disposeGliderTransects(selectedMesh);
assert.equal(selectedMesh.children.length, 0, 'Disposed selected mesh group must have 0 children');
console.log('✓ 6. Clean resource disposal verified');

console.log('\nALL PHASE 12 GLIDER TRANSECT TESTS PASSED (100%)');
