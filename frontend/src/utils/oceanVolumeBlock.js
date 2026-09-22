/**
 * SAMUDRA-3D Regional 3D Ocean Volume Block Engine
 * Visualizes the ocean volume as a true 3D spatial voxel block (Longitude × Latitude × Depth):
 * - Renders real scalar data (Temperature, Salinity, Currents) using GPU-efficient THREE.InstancedMesh.
 * - Dynamic bounds derived directly from dataset metadata (e.g. 65-95°E, 0-25°N, 0.49-92.33m).
 * - Strict truth-in-depth: Never fakes 4000m depths for GLORYS; displays actual dataset depth range.
 * - Depth Slice Modes: 'full' (all layers), 'slice' (selected depth), 'surface' (surface only).
 * - Real depth markers and vertical exaggeration scale indicator.
 * - Interactive probe pins and ODV transect slices.
 */
import * as THREE from 'three';
import { sampleColormap } from './colormaps.js';
import { geoToCartesian, DEFAULT_GLOBE_RADIUS } from './coordinates.js';

// Default bounds for Northern Indian Ocean Block (fallback if no volume metadata)
export const DEFAULT_BLOCK_BOUNDS = {
  latMin: 0.0,
  latMax: 25.0,
  lonMin: 65.0,
  lonMax: 95.0,
  depthMin: 0.49,
  depthMax: 92.33,
  width: 120,   // X axis: West to East
  length: 100,  // Z axis: South to North
  height: 40    // Y axis: Surface (0) down to max depth (-40)
};

let currentActiveBounds = { ...DEFAULT_BLOCK_BOUNDS };

/**
 * Updates the active block coordinate mapping bounds from a volume response.
 */
export function setActiveBlockBounds(bounds, dimensions = { width: 120, length: 100, height: 40 }) {
  if (!bounds) return;
  currentActiveBounds = {
    latMin: bounds.min_lat ?? DEFAULT_BLOCK_BOUNDS.latMin,
    latMax: bounds.max_lat ?? DEFAULT_BLOCK_BOUNDS.latMax,
    lonMin: bounds.min_lon ?? DEFAULT_BLOCK_BOUNDS.lonMin,
    lonMax: bounds.max_lon ?? DEFAULT_BLOCK_BOUNDS.lonMax,
    depthMin: bounds.min_depth ?? DEFAULT_BLOCK_BOUNDS.depthMin,
    depthMax: bounds.max_depth ?? DEFAULT_BLOCK_BOUNDS.depthMax,
    width: dimensions.width ?? 120,
    length: dimensions.length ?? 100,
    height: dimensions.height ?? 40
  };
}

export function getActiveBlockBounds() {
  return currentActiveBounds;
}

/**
 * Converts geographic coordinates (lat, lon, depth) to 3D Cartesian block coordinates.
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {number} [depth=0] - Depth in meters
 * @param {object} [customBounds=null] - Optional bounds override
 * @returns {THREE.Vector3}
 */
export function geoToBlock(lat, lon, depth = 0, customBounds = null) {
  const b = customBounds || currentActiveBounds || DEFAULT_BLOCK_BOUNDS;
  const lonSpan = Math.max(1e-4, b.lonMax - b.lonMin);
  const latSpan = Math.max(1e-4, b.latMax - b.latMin);
  const depthSpan = Math.max(1e-4, b.depthMax - b.depthMin);

  const normLon = (lon - b.lonMin) / lonSpan;
  const normLat = (lat - b.latMin) / latSpan;
  const normDepth = Math.max(0, Math.min(1, (depth - b.depthMin) / depthSpan));

  const width = b.width || 120;
  const length = b.length || 100;
  const height = b.height || 40;

  const x = normLon * width - width / 2;
  const z = -(normLat * length - length / 2); // -Z is North
  const y = -normDepth * height;              // Negative Y is Depth

  return new THREE.Vector3(x, y, z);
}

/**
 * Converts 3D Cartesian block coordinates (x, z) back to geographic coordinates.
 * @param {number} x
 * @param {number} z
 * @param {object} [customBounds=null]
 * @returns {{lat: number, lon: number}}
 */
export function blockToGeo(x, z, customBounds = null) {
  const b = customBounds || currentActiveBounds || DEFAULT_BLOCK_BOUNDS;
  const width = b.width || 120;
  const length = b.length || 100;

  const normLon = (x + width / 2) / width;
  const normLat = (-z + length / 2) / length;

  const lon = b.lonMin + normLon * (b.lonMax - b.lonMin);
  const lat = b.latMin + normLat * (b.latMax - b.latMin);

  return {
    lat: Math.max(b.latMin, Math.min(b.latMax, lat)),
    lon: Math.max(b.lonMin, Math.min(b.lonMax, lon))
  };
}

/**
 * Creates a text sprite for spatial annotations in 3D scene.
 */
function createTextSprite(text, { color = '#38bdf8', fontSize = 28, bgColor = 'rgba(15, 23, 42, 0.75)' } = {}) {
  if (typeof document === 'undefined') return new THREE.Group();

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Group();

  ctx.fillStyle = bgColor;
  ctx.roundRect(4, 4, 248, 56, 8);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(12, 3, 1);
  return sprite;
}

/**
 * Fits the camera to frame the entire volume mesh using THREE.Box3.
 * @param {THREE.Camera} camera
 * @param {THREE.OrbitControls} controls
 * @param {THREE.Object3D} object
 */
export function fitVolumeCamera(camera, controls, object) {
  if (!camera || !object) return;
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;

  const center = new THREE.Vector3();
  box.getCenter(center);

  const size = new THREE.Vector3();
  box.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = (camera.fov || 45) * (Math.PI / 180);
  let cameraDistance = (maxDim / 2) / Math.tan(fov / 2);
  cameraDistance *= 1.45; // Add safety padding

  const offset = new THREE.Vector3(0.9, 0.75, 1.25).normalize().multiplyScalar(cameraDistance);
  camera.position.copy(center).add(offset);
  camera.lookAt(center);

  if (controls) {
    controls.target.copy(center);
    controls.update();
  }
}

/**
 * Creates the complete 3D Ocean Volume Block group using InstancedMesh.
 * @param {object} volumeData - Structured OceanVolumeResponse from /api/ocean/volume
 * @param {object} options - Visualization configuration
 * @returns {THREE.Group}
 */
export function createOceanVolumeBlock(volumeData, {
  variable = 'temperature',
  rangeMode = 'dynamic',
  depthSliceMode = 'full', // 'full' | 'slice' | 'surface'
  selectedDepthIdx = 0
} = {}) {
  const group = new THREE.Group();
  group.name = 'ocean-volume-block-group';

  if (!volumeData || !volumeData.values) {
    return group;
  }

  // Support both Phase 4 (shape & coordinates) and legacy (grid & longitude/latitude/depth)
  const lons = volumeData.coordinates?.longitude || volumeData.longitude || [];
  const lats = volumeData.coordinates?.latitude || volumeData.latitude || [];
  const depths = volumeData.coordinates?.depth || volumeData.depth || [];
  const values = volumeData.values || [];

  const nz = volumeData.shape ? volumeData.shape[0] : (volumeData.grid?.nz || depths.length || 0);
  const ny = volumeData.shape ? volumeData.shape[1] : (volumeData.grid?.ny || lats.length || 0);
  const nx = volumeData.shape ? volumeData.shape[2] : (volumeData.grid?.nx || lons.length || 0);

  if (nz === 0 || ny === 0 || nx === 0) {
    return group;
  }

  const is3DValues = Array.isArray(values[0]) && Array.isArray(values[0][0]);

  const bounds = {
    latMin: volumeData.bounds?.min_lat ?? (lats[0] || 0),
    latMax: volumeData.bounds?.max_lat ?? (lats[lats.length - 1] || 25),
    lonMin: volumeData.bounds?.min_lon ?? (lons[0] || 65),
    lonMax: volumeData.bounds?.max_lon ?? (lons[lons.length - 1] || 95),
    depthMin: volumeData.bounds?.min_depth ?? (depths[0] || 0.49),
    depthMax: volumeData.bounds?.max_depth ?? (depths[depths.length - 1] || 92.33),
    width: 120,
    length: 100,
    height: 40
  };
  setActiveBlockBounds(bounds);

  const isSalinity = variable === 'salinity';
  const isCurrents = variable === 'currents' || variable === 'u_current' || variable === 'v_current';
  const palette = isSalinity ? 'haline' : (isCurrents ? 'speed' : 'thermal');

  const minVal = rangeMode === 'fixed'
    ? (isSalinity ? 32.0 : (isCurrents ? 0.0 : 2.0))
    : (volumeData.min_value ?? volumeData.min_val ?? 2.0);
  const maxVal = rangeMode === 'fixed'
    ? (isSalinity ? 38.0 : (isCurrents ? 2.5 : 32.0))
    : (volumeData.max_value ?? volumeData.max_val ?? 32.0);
  const range = Math.max(1e-4, maxVal - minVal);

  const { width, length, height } = bounds;
  const cellDx = (width / nx) * 0.94;
  const cellDz = (length / ny) * 0.94;
  const cellDy = (height / nz) * 0.88;

  // Filter instances according to depthSliceMode
  const instanceRecords = [];
  for (let k = 0; k < nz; k++) {
    if (depthSliceMode === 'surface' && k !== 0) continue;
    if (depthSliceMode === 'slice' && k !== selectedDepthIdx) continue;

    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        let val;
        if (is3DValues) {
          val = values[k]?.[j]?.[i];
        } else {
          const idx = k * (ny * nx) + j * nx + i;
          val = values[idx];
        }

        if (val === null || val === undefined || isNaN(val)) continue; // Land / missing

        const x = ((i + 0.5) / nx) * width - width / 2;
        const z = -(((j + 0.5) / ny) * length - length / 2); // -Z is North
        const y = -((k + 0.5) / nz) * height;                // -Y is Depth

        instanceRecords.push({
          i, j, k,
          x, y, z,
          val,
          lon: lons[i] ?? 0,
          lat: lats[j] ?? 0,
          depth: depths[k] ?? 0
        });
      }
    }
  }

  const instanceCount = instanceRecords.length;
  if (instanceCount > 0) {
    const cellGeo = new THREE.BoxGeometry(cellDx, cellDy, cellDz);
    const cellMat = new THREE.MeshStandardMaterial({
      roughness: 0.35,
      metalness: 0.15,
      transparent: depthSliceMode === 'full',
      opacity: depthSliceMode === 'full' ? 0.82 : 0.96,
      side: THREE.FrontSide
    });

    const instancedMesh = new THREE.InstancedMesh(cellGeo, cellMat, instanceCount);
    instancedMesh.name = 'ocean-volume-instanced-voxels';
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const cellMetadata = [];

    for (let m = 0; m < instanceCount; m++) {
      const rec = instanceRecords[m];
      dummy.position.set(rec.x, rec.y, rec.z);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(m, dummy.matrix);

      const t = Math.max(0, Math.min(1, (rec.val - minVal) / range));
      const [r, g, b] = sampleColormap(palette, t);
      color.setRGB(r, g, b);
      instancedMesh.setColorAt(m, color);

      cellMetadata.push({
        instanceId: m,
        lon: rec.lon,
        lat: rec.lat,
        depth: rec.depth,
        value: rec.val,
        variable: volumeData.variable?.name || variable,
        units: volumeData.variable?.units || '',
        dataset: volumeData.dataset?.name || 'Ocean Model',
        source: volumeData.provenance?.source_mode || volumeData.dataset?.source_mode || 'REAL_LOCAL',
        time: volumeData.timestamp || ''
      });
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
    instancedMesh.userData = {
      isOceanVolume: true,
      instances: cellMetadata,
      bounds,
      provenanceBadge: (volumeData.provenance?.source_mode === 'REAL_LOCAL' || volumeData.dataset?.source_mode === 'REAL_LOCAL')
        ? 'REAL • COPERNICUS GLORYS12V1 (~8.3 km)'
        : 'SYNTHETIC • DEVELOPMENT',
      dataset: volumeData.dataset,
      provenance: volumeData.provenance,
      resolution: volumeData.resolution
    };

    group.add(instancedMesh);
  }

  // 2. Volume Bounding Wireframe Box Frame
  const boxGeo = new THREE.BoxGeometry(width, height, length);
  const edgesGeo = new THREE.EdgesGeometry(boxGeo);
  const edgesMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.55
  });
  const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
  wireframe.name = 'ocean-block-wireframe';
  wireframe.position.set(0, -height / 2, 0);
  group.add(wireframe);

  // 3. Seabed Base Grid at bottom of dataset volume (Y = -height)
  const seabedGrid = new THREE.GridHelper(width, 10, 0x00f5d4, 0x1e3a8a);
  seabedGrid.name = 'ocean-block-seabed-grid';
  seabedGrid.position.set(0, -height, 0);
  group.add(seabedGrid);

  // 4. Depth Tick Markers & Reference Labels along front-left vertical edge
  // Only use actual depths from dataset
  const sampleDepths = [];
  if (depths.length > 0) {
    sampleDepths.push(depths[0]); // Surface (e.g. 0.49m)
    if (depths.length > 3) sampleDepths.push(depths[Math.floor(depths.length * 0.25)]);
    if (depths.length > 2) sampleDepths.push(depths[Math.floor(depths.length * 0.5)]);
    if (depths.length > 4) sampleDepths.push(depths[Math.floor(depths.length * 0.75)]);
    sampleDepths.push(depths[depths.length - 1]); // Max depth (e.g. 92.33m)
  }

  const depthSpan = Math.max(1e-4, bounds.depthMax - bounds.depthMin);
  sampleDepths.forEach((d) => {
    const normD = (d - bounds.depthMin) / depthSpan;
    const y = -normD * height;

    // Small circular ring marker
    const tickGeo = new THREE.RingGeometry(0.5, 1.0, 16);
    const tickMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const tickMesh = new THREE.Mesh(tickGeo, tickMat);
    tickMesh.position.set(-width / 2 - 0.2, y, length / 2 + 0.2);
    group.add(tickMesh);

    // Text label
    const labelSprite = createTextSprite(`${d.toFixed(1)}m`, {
      color: '#00f5d4',
      fontSize: 24,
      bgColor: 'rgba(5, 19, 41, 0.85)'
    });
    labelSprite.position.set(-width / 2 - 8, y, length / 2 + 0.2);
    group.add(labelSprite);
  });

  // 5. Vertical Scale & Provenance Annotation Sprite
  const meanLatRad = ((bounds.latMin + bounds.latMax) / 2) * (Math.PI / 180);
  const widthKm = Math.max(1, (bounds.lonMax - bounds.lonMin) * 111 * Math.cos(meanLatRad));
  const depthKm = Math.max(0.001, (bounds.depthMax - bounds.depthMin) / 1000);
  const vertExag = Math.round((bounds.height * widthKm) / (bounds.width * depthKm));

  const verticalScaleLabel = createTextSprite(
    `VERTICAL EXAGGERATION: ~${vertExag}× | DEPTH: ${bounds.depthMin.toFixed(1)}m — ${bounds.depthMax.toFixed(1)}m`,
    { color: '#f59e0b', fontSize: 20, bgColor: 'rgba(15, 23, 42, 0.9)' }
  );
  verticalScaleLabel.scale.set(30, 4, 1);
  verticalScaleLabel.position.set(0, 10, length / 2 + 8);
  group.add(verticalScaleLabel);

  return group;
}

/**
 * Creates an interactive 3D Probe Pin beacon.
 * Spans from surface down to dataset base.
 */
export function createProbePinMesh(lat, lon, isBlockMode = false, customBounds = null) {
  const pinGroup = new THREE.Group();
  pinGroup.name = 'probe-pin-group';

  if (isBlockMode) {
    const b = customBounds || currentActiveBounds || DEFAULT_BLOCK_BOUNDS;
    const topPos = geoToBlock(lat, lon, b.depthMin, b);
    pinGroup.position.copy(topPos);

    // Luminous vertical probe needle extending down to actual dataset depth base
    const needleGeo = new THREE.CylinderGeometry(0.2, 0.2, b.height, 8);
    const needleMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.85
    });
    const needleMesh = new THREE.Mesh(needleGeo, needleMat);
    needleMesh.position.set(0, -b.height / 2, 0);
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

  const b = currentActiveBounds || DEFAULT_BLOCK_BOUNDS;
  const p1 = geoToBlock(transectData.lat1, transectData.lon1, b.depthMin, b);
  const p2 = geoToBlock(transectData.lat2, transectData.lon2, b.depthMin, b);

  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  if (length < 1e-3) return null;

  const height = b.height;
  const geo = new THREE.PlaneGeometry(length, height, 50, 9);

  const matrix = transectData.matrix;
  const depths = transectData.depth_levels || [0.49, 10, 20, 50, 92.33];
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
      const minD = depths[0] || 0;
      const maxD = depths[depths.length - 1] || 100;
      const dRange = Math.max(1e-4, maxD - minD);

      for (let y = 0; y < texHeight; y++) {
        const targetDepth = minD + (y / (texHeight - 1)) * dRange;
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
      mesh.position.set((p1.x + p2.x) / 2, -height / 2, (p1.z + p2.z) / 2);
      const angle = Math.atan2(dz, dx);
      mesh.rotation.y = -angle;
      group.add(mesh);

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
