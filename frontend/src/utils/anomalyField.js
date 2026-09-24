/**
 * SAMUDRA-3D 3D Difference Field & Anomaly Heatmap Visualizer
 *
 * Implements 3D sparse residual visualization:
 * - Diverging color scale centered at zero (delta = MODEL - OBSERVED)
 *   - delta < 0: Model under-prediction -> Blue shades
 *   - delta == 0: Near-zero residual -> Light neutral/white
 *   - delta > 0: Model over-prediction -> Amber/Red shades
 * - Three.js InstancedMesh for high-performance 60+ FPS rendering of 3D residual spheres
 * - Traceable click-picking from 3D anomaly spheres back to source in-situ platform
 */
import * as THREE from 'three';
import { geoToCartesian, DEFAULT_GLOBE_RADIUS, DEFAULT_VERTICAL_EXAGGERATION } from './coordinates.js';
import { isMarkerOccluded } from './argoProfiles.js';

export const ANOMALY_COLORS = {
  deepUnder: 0x0284c7,     // Strong model under-prediction (< -1.0)
  moderateUnder: 0x38bdf8, // Moderate under-prediction
  mildUnder: 0xbae6fd,     // Slight under-prediction
  neutral: 0xf8fafc,       // Near zero (|delta| < 0.05)
  mildOver: 0xfde68a,      // Slight over-prediction
  moderateOver: 0xfbbf24,  // Moderate over-prediction
  deepOver: 0xef4444       // Strong model over-prediction (> +1.0)
};

/**
 * Maps a residual value (delta = MODEL - OBSERVED) to a diverging Three.js Color.
 * 
 * @param {number} delta - Residual in physical units (degC or PSU)
 * @param {number} [maxDelta=2.0] - Reference maximum residual for normalization
 * @returns {THREE.Color}
 */
export function deltaToColor(delta, maxDelta = 2.0) {
  if (delta === null || delta === undefined || isNaN(delta)) {
    return new THREE.Color(0x94a3b8); // Muted slate for invalid
  }

  const absDelta = Math.abs(delta);
  if (absDelta < 0.05) {
    return new THREE.Color(ANOMALY_COLORS.neutral);
  }

  const ratio = Math.min(absDelta / maxDelta, 1.0);

  if (delta < 0) {
    // Model under-prediction -> shades of blue
    const c1 = new THREE.Color(ANOMALY_COLORS.mildUnder);
    const c2 = new THREE.Color(ANOMALY_COLORS.deepUnder);
    return c1.clone().lerp(c2, ratio);
  } else {
    // Model over-prediction -> shades of amber/red
    const c1 = new THREE.Color(ANOMALY_COLORS.mildOver);
    const c2 = new THREE.Color(ANOMALY_COLORS.deepOver);
    return c1.clone().lerp(c2, ratio);
  }
}

/**
 * Builds a Three.js Group containing an InstancedMesh of 3D spheres representing residuals.
 * 
 * @param {Array<Object>} points - Array of AnomalyPoint objects from /api/anomaly/field
 * @param {Object} [options]
 * @param {number} [options.globeRadius=100] - Base 3D globe radius
 * @param {number} [options.verticalExaggeration=30] - Visual vertical exaggeration
 * @returns {THREE.Group|null}
 */
export function createAnomalyFieldMesh(points = [], options = {}) {
  if (!points || points.length === 0) return null;

  const globeRadius = options.globeRadius ?? DEFAULT_GLOBE_RADIUS;
  const verticalExaggeration = options.verticalExaggeration ?? DEFAULT_VERTICAL_EXAGGERATION;

  const group = new THREE.Group();
  group.name = 'anomaly-field-group';

  // Base sphere geometry with radius 1.0, scaled per instance
  const sphereGeom = new THREE.SphereGeometry(1.0, 16, 16);
  const sphereMat = new THREE.MeshStandardMaterial({
    roughness: 0.35,
    metalness: 0.15,
    wireframe: false
  });

  const count = points.length;
  const instancedMesh = new THREE.InstancedMesh(sphereGeom, sphereMat, count);
  instancedMesh.name = 'anomaly-spheres-mesh';
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    const pt = points[i];
    const cart = geoToCartesian(pt.lat, pt.lon, pt.depth, {
      globeRadius,
      verticalExaggeration
    });

    dummy.position.set(cart.x, cart.y, cart.z);

    // Scale sphere radius: base 0.4, alert points scaled up to 0.75
    const baseScale = 0.4 + Math.min(Math.abs(pt.delta), 2.0) * 0.15;
    const finalScale = pt.is_alert ? baseScale * 1.35 : baseScale;
    dummy.scale.set(finalScale, finalScale, finalScale);
    dummy.updateMatrix();

    instancedMesh.setMatrixAt(i, dummy.matrix);

    const color = deltaToColor(pt.delta);
    instancedMesh.setColorAt(i, color);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) {
    instancedMesh.instanceColor.needsUpdate = true;
  }

  // Store metadata on mesh for raycast inspection
  instancedMesh.userData = {
    points,
    type: 'anomaly-field'
  };

  group.add(instancedMesh);
  return group;
}

/**
 * Raycasts against the anomaly field InstancedMesh.
 * 
 * @param {THREE.Raycaster} raycaster
 * @param {THREE.Group} anomalyGroup
 * @returns {Object|null} The clicked AnomalyPoint metadata or null
 */
export function raycastAnomalyField(raycaster, anomalyGroup) {
  if (!raycaster || !anomalyGroup) return null;

  const instancedMesh = anomalyGroup.getObjectByName('anomaly-spheres-mesh');
  if (!instancedMesh) return null;

  const intersects = raycaster.intersectObject(instancedMesh, false);
  if (intersects.length > 0) {
    const hit = intersects[0];
    const instanceId = hit.instanceId;
    if (instanceId !== undefined && instancedMesh.userData.points) {
      return instancedMesh.userData.points[instanceId] || null;
    }
  }
  return null;
}

/**
 * Updates visibility of anomaly spheres against camera occlusion by the Earth.
 * 
 * @param {THREE.Group} anomalyGroup
 * @param {THREE.Camera} camera
 * @param {number} [globeRadius=DEFAULT_GLOBE_RADIUS]
 */
export function updateAnomalyOcclusion(anomalyGroup, camera, globeRadius = DEFAULT_GLOBE_RADIUS) {
  if (!anomalyGroup || !camera) return;

  const instancedMesh = anomalyGroup.getObjectByName('anomaly-spheres-mesh');
  if (!instancedMesh || !instancedMesh.userData.points) return;

  const points = instancedMesh.userData.points;
  const count = points.length;
  const cameraPos = camera.position;
  const dummy = new THREE.Object3D();
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();

  let modified = false;

  for (let i = 0; i < count; i++) {
    instancedMesh.getMatrixAt(i, matrix);
    position.setFromMatrixPosition(matrix);

    const occluded = isMarkerOccluded(position, cameraPos, globeRadius);
    const pt = points[i];
    const baseScale = 0.4 + Math.min(Math.abs(pt.delta), 2.0) * 0.15;
    const finalScale = pt.is_alert ? baseScale * 1.35 : baseScale;

    dummy.position.copy(position);
    if (occluded) {
      dummy.scale.set(0, 0, 0); // Hide occluded
    } else {
      dummy.scale.set(finalScale, finalScale, finalScale);
    }
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
    modified = true;
  }

  if (modified) {
    instancedMesh.instanceMatrix.needsUpdate = true;
  }
}

/**
 * Disposes geometry and materials of an anomaly field group.
 * 
 * @param {THREE.Group} anomalyGroup
 */
export function disposeAnomalyField(anomalyGroup) {
  if (!anomalyGroup) return;

  anomalyGroup.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => mat.dispose());
      } else {
        child.material.dispose();
      }
    }
  });

  if (anomalyGroup.parent) {
    anomalyGroup.parent.remove(anomalyGroup);
  }
}
