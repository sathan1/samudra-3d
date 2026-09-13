import * as THREE from 'three';
import { geoToCartesian, DEFAULT_GLOBE_RADIUS, DEFAULT_VERTICAL_EXAGGERATION } from './coordinates.js';
import { sampleColormap } from './colormaps.js';

/** Maps normalized scalar value t in [0, 1] to an oceanographic thermal palette. */
export function getThermalColor(t) {
  const clamped = Math.max(0.0, Math.min(1.0, t));
  const stops = [
    [0.00, [0.05, 0.25, 0.65]],
    [0.25, [0.02, 0.55, 0.75]],
    [0.50, [0.10, 0.72, 0.50]],
    [0.75, [0.92, 0.75, 0.12]],
    [0.90, [0.96, 0.45, 0.08]],
    [1.00, [0.92, 0.18, 0.15]]
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    const [s0, c0] = stops[i];
    const [s1, c1] = stops[i + 1];
    if (clamped >= s0 && clamped <= s1) {
      const f = (clamped - s0) / (s1 - s0);
      return [
        c0[0] + f * (c1[0] - c0[0]),
        c0[1] + f * (c1[1] - c0[1]),
        c0[2] + f * (c1[2] - c0[2])
      ];
    }
  }
  return stops[stops.length - 1][1];
}

/**
 * Build a land-masked, geographically positioned scalar field.
 * Subsurface slices are kept inside the Earth radius so depth selection
 * reads as an actual ocean section rather than a second surface.
 */
export function buildScalarFieldGeometry(sliceData, options = {}) {
  const {
    lats,
    lons,
    values,
    selected_depth: depth = 0.0,
    min_val: customMin = null,
    max_val: customMax = null
  } = sliceData;

  const globeRadius = options.globeRadius ?? DEFAULT_GLOBE_RADIUS;
  const verticalExaggeration = options.verticalExaggeration ?? DEFAULT_VERTICAL_EXAGGERATION;
  const ny = lats.length;
  const nx = lons.length;

  let vMin = customMin ?? 2.0;
  let vMax = customMax ?? 30.0;
  if (vMin >= vMax) {
    vMin = 0.0;
    vMax = 30.0;
  }
  const vRange = vMax - vMin || 1.0;
  const variable = sliceData.variable || 'temperature';
  const palette = options.palette || (variable === 'salinity' ? 'haline' : 'thermal');

  const pointGrid = [];
  for (let j = 0; j < ny; j++) {
    const row = [];
    const lat = lats[j];
    for (let i = 0; i < nx; i++) {
      const lon = lons[i];
      const val = values[j][i];
      if (val === null || val === undefined || Number.isNaN(Number(val))) {
        row.push({ valid: false });
        continue;
      }

      // Surface field sits just above the base Earth. Subsurface fields move
      // inward by depth, while keeping a small offset to avoid z-fighting.
      const surfaceOffset = depth === 0 ? 0.34 : -0.18;
      const cart = geoToCartesian(lat, lon, depth, {
        globeRadius: globeRadius + surfaceOffset,
        verticalExaggeration
      });
      const t = (Number(val) - vMin) / vRange;
      const rgb = sampleColormap(palette, t);
      row.push({ valid: true, pos: [cart.x, cart.y, cart.z], color: rgb });
    }
    pointGrid.push(row);
  }

  const positions = [];
  const colors = [];
  const indices = [];

  // Indexed geometry reduces duplicate vertices and gives Three.js cleaner
  // normal computation. Null/masked cells are still completely omitted.
  const vertexGrid = Array.from({ length: ny }, () => Array(nx).fill(-1));
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const p = pointGrid[j][i];
      if (!p.valid) continue;
      vertexGrid[j][i] = positions.length / 3;
      positions.push(...p.pos);
      colors.push(...p.color);
    }
  }

  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = vertexGrid[j][i];
      const b = vertexGrid[j + 1][i];
      const c = vertexGrid[j][i + 1];
      const d = vertexGrid[j + 1][i + 1];
      if (a < 0 || b < 0 || c < 0 || d < 0) continue;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Scientific field material: bright data, restrained specular response. */
export function createScalarFieldMaterial() {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.62,
    metalness: 0.0,
    transparent: true,
    opacity: 0.92,
    depthWrite: true,
    flatShading: false
  });
}
