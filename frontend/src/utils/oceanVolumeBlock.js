/**
 * SAMUDRA-3D Regional 3D Ocean Volume Block Engine
 * Visualizes the Northern Indian Ocean (0-25°N, 65-95°E) as a true 3D volumetric slab:
 * - Top surface (0m) with temperature/salinity contours or current vectors.
 * - 4 vertical boundary depth curtains (South, North, West, East) showing continuous depth stratification from 0m down to 4000m.
 * - Bottom bathymetric seafloor relief base plate.
 * - Bounding depth markers (0m, 50m, 100m, 500m, 1000m, 2000m, 4000m).
 * - Click-to-Probe 3D pins and ODV vertical transect curtain slices.
 */
import * as THREE from 'three';
import { sampleColormap } from './colormaps.js';
import { geoToCartesian, DEFAULT_GLOBE_RADIUS } from './coordinates.js';

// Domain bounds for Northern Indian Ocean Block
export const BLOCK_BOUNDS = {
  latMin: 0.0,
  latMax: 25.0,
  lonMin: 65.0,
  lonMax: 95.0,
  depthMax: 4000.0,
  width: 120, // X axis: 65°E (-60) to 95°E (+60)
  length: 100, // Z axis: 25°N (-50) to 0°N (+50)
  height: 40 // Y axis: 0m (0) down to 4000m (-40)
};

/**
 * Converts geographic coordinates to 3D Cartesian block coordinates.
 * @param {number} lat - Latitude (0 to 25°N)
 * @param {number} lon - Longitude (65 to 95°E)
 * @param {number} [depth=0] - Depth in meters (0 to 4000m)
 * @returns {THREE.Vector3}
 */
export function geoToBlock(lat, lon, depth = 0) {
  const normLon = (lon - BLOCK_BOUNDS.lonMin) / (BLOCK_BOUNDS.lonMax - BLOCK_BOUNDS.lonMin);
  const normLat = (lat - BLOCK_BOUNDS.latMin) / (BLOCK_BOUNDS.latMax - BLOCK_BOUNDS.latMin);
  const normDepth = Math.max(0, Math.min(BLOCK_BOUNDS.depthMax, depth)) / BLOCK_BOUNDS.depthMax;

  const x = normLon * BLOCK_BOUNDS.width - BLOCK_BOUNDS.width / 2;
  const z = -(normLat * BLOCK_BOUNDS.length - BLOCK_BOUNDS.length / 2); // -Z is North
  const y = -normDepth * BLOCK_BOUNDS.height; // Negative Y is down

  return new THREE.Vector3(x, y, z);
}

/**
 * Converts 3D Cartesian block coordinates (x, z) back to geographic coordinates.
 * @param {number} x
 * @param {number} z
 * @returns {{lat: number, lon: number}}
 */
export function blockToGeo(x, z) {
  const normLon = (x + BLOCK_BOUNDS.width / 2) / BLOCK_BOUNDS.width;
  const normLat = (-z + BLOCK_BOUNDS.length / 2) / BLOCK_BOUNDS.length;

  const lon = BLOCK_BOUNDS.lonMin + normLon * (BLOCK_BOUNDS.lonMax - BLOCK_BOUNDS.lonMin);
  const lat = BLOCK_BOUNDS.latMin + normLat * (BLOCK_BOUNDS.latMax - BLOCK_BOUNDS.latMin);

  return {
    lat: Math.max(BLOCK_BOUNDS.latMin, Math.min(BLOCK_BOUNDS.latMax, lat)),
    lon: Math.max(BLOCK_BOUNDS.lonMin, Math.min(BLOCK_BOUNDS.lonMax, lon))
  };
}

/**
 * Generates an HTML5 canvas texture from a 2D scalar field matrix.
 */
function createSurfaceTexture(sliceData, palette = 'thermal', minVal = null, maxVal = null) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  const ny = sliceData?.shape ? sliceData.shape[0] : (sliceData?.values ? sliceData.values.length : 50);
  const nx = sliceData?.shape ? sliceData.shape[1] : (sliceData?.values && sliceData.values[0] ? sliceData.values[0].length : 60);

  canvas.width = nx;
  canvas.height = ny;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imgData = ctx.createImageData(nx, ny);
  const values = sliceData?.values || [];

  const effectiveMin = minVal !== null ? minVal : (sliceData?.min_val ?? 2.0);
  const effectiveMax = maxVal !== null ? maxVal : (sliceData?.max_val ?? 32.0);
  const range = Math.max(1e-4, effectiveMax - effectiveMin);

  for (let j = 0; j < ny; j++) {
    // Invert row index: row 0 in array is min lat (South), but image y=0 is top (North)
    const srcRowIdx = ny - 1 - j;
    const row = values[srcRowIdx] || [];

    for (let i = 0; i < nx; i++) {
      const val = row[i];
      const pixelIdx = (j * nx + i) * 4;

      if (val === null || val === undefined || isNaN(val)) {
        // Land point: dark slate / deep navy coastline
        imgData.data[pixelIdx] = 15;
        imgData.data[pixelIdx + 1] = 23;
        imgData.data[pixelIdx + 2] = 42;
        imgData.data[pixelIdx + 3] = 255;
      } else {
        const t = Math.max(0, Math.min(1, (val - effectiveMin) / range));
        const [r, g, b] = sampleColormap(palette, t);
        imgData.data[pixelIdx] = Math.round(r * 255);
        imgData.data[pixelIdx + 1] = Math.round(g * 255);
        imgData.data[pixelIdx + 2] = Math.round(b * 255);
        imgData.data[pixelIdx + 3] = 240;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates vertical gradient texture for depth boundary curtains.
 */
function createCurtainTexture(palette = 'thermal') {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Vertical gradient: y=0 (surface, warm) to y=255 (4000m abyss, cold)
  for (let y = 0; y < 256; y++) {
    // Non-linear ocean stratification: rapid thermocline drop in top 20%, gentle gradient in deep ocean
    const depthFrac = y / 255.0; // 0 at surface, 1 at 4000m
    // Map depth fraction to temperature normalized t (1.0 at surface down to 0.0 at bottom)
    const t = Math.pow(1.0 - depthFrac, 2.2);
    const [r, g, b] = sampleColormap(palette, t);

    ctx.fillStyle = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    ctx.fillRect(0, y, 64, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates the complete 3D Ocean Volume Block group for Three.js.
 */
export function createOceanVolumeBlock(sliceData, {
  variable = 'temperature',
  rangeMode = 'dynamic'
} = {}) {
  const group = new THREE.Group();
  group.name = 'ocean-volume-block-group';

  const isSalinity = variable === 'salinity';
  const palette = isSalinity ? 'haline' : 'thermal';
  const minVal = rangeMode === 'fixed' ? (isSalinity ? 32.0 : 2.0) : sliceData?.min_val;
  const maxVal = rangeMode === 'fixed' ? (isSalinity ? 38.0 : 32.0) : sliceData?.max_val;

  // 1. Top Surface Ocean Plane (0m, Y = 0)
  const surfaceGeo = new THREE.PlaneGeometry(BLOCK_BOUNDS.width, BLOCK_BOUNDS.length, 60, 50);
  const surfaceTex = createSurfaceTexture(sliceData, palette, minVal, maxVal);
  const surfaceMat = new THREE.MeshStandardMaterial({
    map: surfaceTex || undefined,
    color: surfaceTex ? 0xffffff : 0x0284c7,
    roughness: 0.25,
    metalness: 0.15,
    side: THREE.DoubleSide
  });
  const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
  surfaceMesh.name = 'ocean-block-surface';
  surfaceMesh.rotation.x = -Math.PI / 2; // Flat horizontal plane
  surfaceMesh.position.set(0, 0, 0);
  group.add(surfaceMesh);

  // 2. Vertical Boundary Depth Curtains
  const curtainTex = createCurtainTexture(palette);
  const curtainMat = new THREE.MeshStandardMaterial({
    map: curtainTex || undefined,
    color: curtainTex ? 0xffffff : 0x0369a1,
    roughness: 0.4,
    metalness: 0.1,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.88
  });

  // South Curtain (0°N, Z = +50)
  const southGeo = new THREE.PlaneGeometry(BLOCK_BOUNDS.width, BLOCK_BOUNDS.height);
  const southMesh = new THREE.Mesh(southGeo, curtainMat);
  southMesh.name = 'curtain-south';
  southMesh.position.set(0, -BLOCK_BOUNDS.height / 2, BLOCK_BOUNDS.length / 2);
  group.add(southMesh);

  // North Curtain (25°N, Z = -50)
  const northGeo = new THREE.PlaneGeometry(BLOCK_BOUNDS.width, BLOCK_BOUNDS.height);
  const northMesh = new THREE.Mesh(northGeo, curtainMat);
  northMesh.name = 'curtain-north';
  northMesh.rotation.y = Math.PI;
  northMesh.position.set(0, -BLOCK_BOUNDS.height / 2, -BLOCK_BOUNDS.length / 2);
  group.add(northMesh);

  // West Curtain (65°E, X = -60)
  const westGeo = new THREE.PlaneGeometry(BLOCK_BOUNDS.length, BLOCK_BOUNDS.height);
  const westMesh = new THREE.Mesh(westGeo, curtainMat);
  westMesh.name = 'curtain-west';
  westMesh.rotation.y = Math.PI / 2;
  westMesh.position.set(-BLOCK_BOUNDS.width / 2, -BLOCK_BOUNDS.height / 2, 0);
  group.add(westMesh);

  // East Curtain (95°E, X = +60)
  const eastGeo = new THREE.PlaneGeometry(BLOCK_BOUNDS.length, BLOCK_BOUNDS.height);
  const eastMesh = new THREE.Mesh(eastGeo, curtainMat);
  eastMesh.name = 'curtain-east';
  eastMesh.rotation.y = -Math.PI / 2;
  eastMesh.position.set(BLOCK_BOUNDS.width / 2, -BLOCK_BOUNDS.height / 2, 0);
  group.add(eastMesh);

  // 3. Bottom Bathymetric Seafloor Base Plate (4000m, Y = -40)
  const seabedGeo = new THREE.PlaneGeometry(BLOCK_BOUNDS.width, BLOCK_BOUNDS.length, 30, 25);
  const seabedMat = new THREE.MeshStandardMaterial({
    color: 0x051329,
    roughness: 0.85,
    metalness: 0.2,
    wireframe: false,
    side: THREE.DoubleSide
  });
  const seabedMesh = new THREE.Mesh(seabedGeo, seabedMat);
  seabedMesh.name = 'ocean-block-seabed';
  seabedMesh.rotation.x = -Math.PI / 2;
  seabedMesh.position.set(0, -BLOCK_BOUNDS.height, 0);
  group.add(seabedMesh);

  // Bathymetric seafloor grid lines overlay
  const seabedGrid = new THREE.GridHelper(BLOCK_BOUNDS.width, 12, 0x00f5d4, 0x1e3a8a);
  seabedGrid.position.set(0, -BLOCK_BOUNDS.height + 0.05, 0);
  group.add(seabedGrid);

  // 4. Volume Bounding Wireframe Box Edges
  const boxGeo = new THREE.BoxGeometry(BLOCK_BOUNDS.width, BLOCK_BOUNDS.height, BLOCK_BOUNDS.length);
  const edgesGeo = new THREE.EdgesGeometry(boxGeo);
  const edgesMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.6
  });
  const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
  wireframe.position.set(0, -BLOCK_BOUNDS.height / 2, 0);
  group.add(wireframe);

  // 5. Depth Level Tick Markers along front-left corner (-60, Y, +50)
  const depthTicks = [
    { depth: 0, label: '0m' },
    { depth: 50, label: '50m' },
    { depth: 100, label: '100m' },
    { depth: 500, label: '500m' },
    { depth: 1000, label: '1000m' },
    { depth: 2000, label: '2000m' },
    { depth: 4000, label: '4000m' }
  ];

  depthTicks.forEach((dt) => {
    const y = -(dt.depth / BLOCK_BOUNDS.depthMax) * BLOCK_BOUNDS.height;
    const tickGeo = new THREE.RingGeometry(0.6, 1.2, 16);
    const tickMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const tickMesh = new THREE.Mesh(tickGeo, tickMat);
    tickMesh.position.set(-BLOCK_BOUNDS.width / 2, y, BLOCK_BOUNDS.length / 2 + 0.2);
    group.add(tickMesh);
  });

  return group;
}

/**
 * Creates an interactive 3D Probe Pin beacon.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {boolean} [isBlockMode=false] - Whether in 3D Block mode vs Globe mode
 * @returns {THREE.Group}
 */
export function createProbePinMesh(lat, lon, isBlockMode = false) {
  const pinGroup = new THREE.Group();
  pinGroup.name = 'probe-pin-group';

  if (isBlockMode) {
    const topPos = geoToBlock(lat, lon, 0);
    pinGroup.position.copy(topPos);

    // Luminous vertical probe needle extending down to seabed
    const needleGeo = new THREE.CylinderGeometry(0.15, 0.15, BLOCK_BOUNDS.height, 8);
    const needleMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.85
    });
    const needleMesh = new THREE.Mesh(needleGeo, needleMat);
    needleMesh.position.set(0, -BLOCK_BOUNDS.height / 2, 0);
    pinGroup.add(needleMesh);

    // Surface beacon head
    const headGeo = new THREE.SphereGeometry(1.6, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.2,
      roughness: 0.2
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.set(0, 1.2, 0);
    pinGroup.add(headMesh);

    // Surface halo ring
    const ringGeo = new THREE.RingGeometry(2.0, 3.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.set(0, 0.2, 0);
    pinGroup.add(ringMesh);
  } else {
    // Globe Mode: align with surface normal
    const pos = geoToCartesian(lat, lon, 0, {
      globeRadius: DEFAULT_GLOBE_RADIUS + 1.2,
      verticalExaggeration: 0
    });
    pinGroup.position.set(pos.x, pos.y, pos.z);

    const normal = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
    pinGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

    // Probe pin needle
    const needleGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.0, 8);
    const needleMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    const needleMesh = new THREE.Mesh(needleGeo, needleMat);
    needleMesh.position.set(0, 2.0, 0);
    pinGroup.add(needleMesh);

    // Glowing head
    const headGeo = new THREE.SphereGeometry(1.4, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.2
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.set(0, 4.2, 0);
    pinGroup.add(headMesh);

    // Surface beacon ring
    const ringGeo = new THREE.RingGeometry(1.6, 2.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.set(0, 0.1, 0);
    pinGroup.add(ringMesh);
  }

  return pinGroup;
}

/**
 * Creates an ODV vertical transect curtain slice mesh for the 3D Ocean Volume Block.
 */
export function createTransectCurtainMesh(transectData, { palette = 'thermal' } = {}) {
  if (!transectData || !transectData.matrix || !transectData.matrix.length) return null;

  const group = new THREE.Group();
  group.name = 'odv-transect-curtain';

  const p1 = geoToBlock(transectData.lat1, transectData.lon1, 0);
  const p2 = geoToBlock(transectData.lat2, transectData.lon2, 0);

  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  if (length < 1e-3) return null;

  const height = BLOCK_BOUNDS.height;
  const geo = new THREE.PlaneGeometry(length, height, 50, 9);

  // Generate canvas texture from the transect matrix resampled to physical depth [0m .. 4000m]
  const matrix = transectData.matrix;
  const depths = transectData.depth_levels || [0, 10, 50, 100, 200, 500, 1000, 2000, 4000];
  const ndepths = matrix.length;
  const npts = matrix[0].length;
  const texHeight = 256;

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = npts;
    canvas.height = texHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imgData = ctx.createImageData(npts, texHeight);
      const minV = transectData.min_val ?? 2.0;
      const maxV = transectData.max_val ?? 32.0;
      const range = Math.max(1e-4, maxV - minV);

      // Resample along physical depth axis (0m at y=0 down to 4000m at y=texHeight-1)
      for (let y = 0; y < texHeight; y++) {
        const targetDepth = (y / (texHeight - 1)) * 4000.0;
        // Find bounding depth indices
        let k0 = 0;
        let k1 = 1;
        for (let k = 0; k < ndepths - 1; k++) {
          if (targetDepth >= depths[k] && targetDepth <= depths[k + 1]) {
            k0 = k;
            k1 = k + 1;
            break;
          }
        }
        const z0 = depths[k0];
        const z1 = depths[k1];
        const alpha = Math.max(0, Math.min(1, (z1 > z0) ? (targetDepth - z0) / (z1 - z0) : 0));

        const row0 = matrix[k0] || [];
        const row1 = matrix[k1] || [];

        for (let i = 0; i < npts; i++) {
          const v0 = row0[i];
          const v1 = row1[i];
          const pIdx = (y * npts + i) * 4;

          if (v0 === null || v0 === undefined || v1 === null || v1 === undefined) {
            imgData.data[pIdx] = 15;
            imgData.data[pIdx + 1] = 23;
            imgData.data[pIdx + 2] = 42;
            imgData.data[pIdx + 3] = 255;
          } else {
            const val = (1.0 - alpha) * v0 + alpha * v1;
            const t = Math.max(0, Math.min(1, (val - minV) / range));
            const [r, g, b] = sampleColormap(palette, t);
            imgData.data[pIdx] = Math.round(r * 255);
            imgData.data[pIdx + 1] = Math.round(g * 255);
            imgData.data[pIdx + 2] = Math.round(b * 255);
            imgData.data[pIdx + 3] = 235;
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);

      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;

      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
        roughness: 0.3
      });

      const mesh = new THREE.Mesh(geo, mat);
      // Position midpoint between p1 and p2 at y = -height / 2
      mesh.position.set((p1.x + p2.x) / 2, -height / 2, (p1.z + p2.z) / 2);
      // Rotate plane to align along transect vector
      const angle = Math.atan2(dz, dx);
      mesh.rotation.y = -angle;

      group.add(mesh);

      // Add top path line along surface
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(p1.x, 0.2, p1.z),
        new THREE.Vector3(p2.x, 0.2, p2.z)
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 3 });
      group.add(new THREE.Line(lineGeo, lineMat));
    }
  }

  return group;
}

/**
 * Disposes all geometries, materials, and textures in a volume block group.
 */
export function disposeOceanVolumeBlock(group) {
  if (!group) return;

  group.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      } else {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    }
  });

  while (group.children.length > 0) {
    group.remove(group.children[0]);
  }
}
