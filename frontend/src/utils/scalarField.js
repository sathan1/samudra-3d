import * as THREE from 'three';
import { geoToCartesian, DEFAULT_GLOBE_RADIUS, DEFAULT_VERTICAL_EXAGGERATION } from './coordinates.js';
import { sampleColormap } from './colormaps.js';

/**
 * Maps normalized scalar value t in [0, 1] to RGB color (Oceanographic Thermal Palette).
 */
export function getThermalColor(t) {
  const clamped = Math.max(0.0, Math.min(1.0, t));
  // Palette stops: [stop, [r, g, b]]
  const stops = [
    [0.00, [0.05, 0.25, 0.65]], // Deep ocean abyssal blue (~2°C)
    [0.25, [0.02, 0.55, 0.75]], // Subsurface cyan (~12°C)
    [0.50, [0.10, 0.72, 0.50]], // Thermocline transition green-teal (~18°C)
    [0.75, [0.92, 0.75, 0.12]], // Warm yellow (~24°C)
    [0.90, [0.96, 0.45, 0.08]], // Tropical surface orange (~27°C)
    [1.00, [0.92, 0.18, 0.15]]  // Peak tropical coral red (~30°C)
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
 * Builds a Three.js BufferGeometry for a 2D scalar field slice.
 * Strict Land-Mask Handling: Any quad containing a null/missing vertex is skipped,
 * ensuring zero false triangles are rendered over the Indian subcontinent.
 * 
 * @param {Object} sliceData - Response from /api/ocean-data
 * @param {Object} options - Configuration options
 * @returns {THREE.BufferGeometry}
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

  // Tiny radial offset at surface to prevent z-fighting with the base globe
  const surfaceOffset = depth === 0 ? 0.25 : 0.0;
  const effectiveRadius = globeRadius + surfaceOffset;

  const ny = lats.length;
  const nx = lons.length;

  // Determine normalization scale
  let vMin = customMin ?? 2.0;
  let vMax = customMax ?? 30.0;
  if (vMin >= vMax) {
    vMin = 0.0;
    vMax = 30.0;
  }
  const vRange = vMax - vMin || 1.0;
  const variable = sliceData.variable || 'temperature';
  const palette = options.palette || (variable === 'salinity' ? 'haline' : 'thermal');

  // Pre-calculate 3D Cartesian coordinates and colors for all grid points
  // Grid layout: pointGrid[j][i] = { pos: [x, y, z], color: [r, g, b], valid: bool }
  const pointGrid = [];
  for (let j = 0; j < ny; j++) {
    const row = [];
    const lat = lats[j];
    for (let i = 0; i < nx; i++) {
      const lon = lons[i];
      const val = values[j][i];
      if (val === null || val === undefined || isNaN(val)) {
        row.push({ valid: false });
      } else {
        const cart = geoToCartesian(lat, lon, depth, {
          globeRadius: effectiveRadius,
          verticalExaggeration
        });
        const t = (val - vMin) / vRange;
        const rgb = sampleColormap(palette, t);
        row.push({
          valid: true,
          pos: [cart.x, cart.y, cart.z],
          color: rgb
        });
      }
    }
    pointGrid.push(row);
  }

  // Assemble triangle vertex arrays
  const positions = [];
  const colors = [];

  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const p00 = pointGrid[j][i];
      const p10 = pointGrid[j + 1][i];
      const p01 = pointGrid[j][i + 1];
      const p11 = pointGrid[j + 1][i + 1];

      // If all 4 vertices are valid ocean points, construct 2 triangles
      if (p00.valid && p10.valid && p01.valid && p11.valid) {
        // Triangle 1: (j, i) -> (j+1, i) -> (j, i+1)
        positions.push(...p00.pos, ...p10.pos, ...p01.pos);
        colors.push(...p00.color, ...p10.color, ...p01.color);

        // Triangle 2: (j+1, i) -> (j+1, i+1) -> (j, i+1)
        positions.push(...p10.pos, ...p11.pos, ...p01.pos);
        colors.push(...p10.color, ...p11.color, ...p01.color);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Creates a standard material for the scalar field mesh.
 */
export function createScalarFieldMaterial() {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.35,
    metalness: 0.05,
    transparent: true,
    opacity: 0.90,
    depthWrite: true
  });
}
