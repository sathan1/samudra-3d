/**
 * SAMUDRA-3D Underwater Glider Sawtooth Transect Utilities
 */
import * as THREE from 'three';
import { geoToCartesian, DEFAULT_GLOBE_RADIUS, DEFAULT_VERTICAL_EXAGGERATION } from './coordinates.js';
import { isMarkerOccluded } from './argoProfiles.js';

export const GLIDER_COLORS = {
  defaultTrack: 0x10b981,   // Emerald green transect track
  selectedTrack: 0x38bdf8,  // Vibrant Sky blue on selection
  surfacing: 0x34d399,      // Mint surface GPS transmission beacon
  diveBottom: 0x06b6d4,     // Cyan subsurface turnaround inflection
  head: 0xf59e0b,           // Amber glider position
  outlier: 0xf43f5e         // Rose alert for bad QC
};

/**
 * Converts geographic waypoint (lat, lon, depth) to 3D Cartesian position with visual depth exaggeration.
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {number} [depth=0] - Depth in meters (positive downwards)
 * @param {Object} [options={}] - Globe radius and vertical exaggeration options
 * @returns {THREE.Vector3}
 */
export function waypointToCartesian(lat, lon, depth = 0, options = {}) {
  const globeRadius = options.globeRadius ?? DEFAULT_GLOBE_RADIUS;
  const verticalExaggeration = options.verticalExaggeration ?? DEFAULT_VERTICAL_EXAGGERATION;
  const pt = geoToCartesian(lat, lon, depth, { globeRadius, verticalExaggeration });
  return new THREE.Vector3(pt.x, pt.y, pt.z);
}

/**
 * Analyzes and segments glider waypoints into continuous valid 3D tracks.
 * Enforces strict gap handling: missing depths, invalid coordinates, or bad QC flags (flags 3, 4)
 * break line continuity into disconnected segments. No line may bridge an invalid gap!
 * 
 * @param {Array<Object>} waypoints - Chronologically ordered waypoints
 * @param {number} [maxTimeGapHours=12] - Threshold for temporal gap breaking
 * @returns {{ segments: Array<Array<Object>>, surfacings: Array<Object>, diveBottoms: Array<Object>, outliers: Array<Object>, hasGaps: boolean }}
 */
export function segmentGliderTrack(waypoints = [], maxTimeGapHours = 12) {
  if (!Array.isArray(waypoints) || waypoints.length === 0) {
    return { segments: [], surfacings: [], diveBottoms: [], outliers: [], hasGaps: false };
  }

  // Sort chronologically by timestamp or waypoint_index
  const sorted = [...waypoints].sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      if (!isNaN(ta) && !isNaN(tb)) return ta - tb;
    }
    return (a.waypoint_index ?? 0) - (b.waypoint_index ?? 0);
  });

  const segments = [];
  let currentSegment = [];
  const surfacings = [];
  const diveBottoms = [];
  const outliers = [];
  let hasGaps = false;

  for (let i = 0; i < sorted.length; i++) {
    const wp = sorted[i];
    const isBadQC = wp.qc_flag === 3 || wp.qc_flag === 4;
    const isMissingDepth = wp.depth === null || wp.depth === undefined || isNaN(wp.depth);
    const isInvalidCoord = wp.lat == null || wp.lon == null || isNaN(wp.lat) || isNaN(wp.lon) ||
                           wp.lat < -90 || wp.lat > 90 || wp.lon < -180 || wp.lon > 180;

    // Check temporal gap between consecutive points
    let isTimeGap = false;
    if (currentSegment.length > 0 && wp.timestamp) {
      const prevWp = currentSegment[currentSegment.length - 1];
      if (prevWp.timestamp) {
        const dt = (new Date(wp.timestamp).getTime() - new Date(prevWp.timestamp).getTime()) / (1000 * 3600);
        if (dt > maxTimeGapHours) {
          isTimeGap = true;
        }
      }
    }

    if (isBadQC || isMissingDepth || isInvalidCoord || isTimeGap) {
      hasGaps = true;
      if (isBadQC) {
        outliers.push(wp);
      }
      if (currentSegment.length >= 2) {
        segments.push(currentSegment);
      }
      currentSegment = [];
      // If the current point is valid coordinates/depth but had a time gap, start new segment with it
      if (!isBadQC && !isMissingDepth && !isInvalidCoord && isTimeGap) {
        currentSegment.push(wp);
      }
    } else {
      currentSegment.push(wp);

      // Detect surfacing events (depth == 0 or phase == 'surface')
      if (wp.depth === 0.0 || wp.phase === 'surface') {
        surfacings.push(wp);
      }
      // Detect dive bottom turnaround inflections
      if (wp.phase === 'bottom' || (wp.depth != null && wp.depth >= 1000.0)) {
        diveBottoms.push(wp);
      }
    }
  }

  if (currentSegment.length >= 2) {
    segments.push(currentSegment);
  }

  return { segments, surfacings, diveBottoms, outliers, hasGaps };
}

/**
 * Creates a complete Three.js visual representation of an underwater glider mission.
 * Includes: 3D sawtooth track line segments, surfacing beacons, dive inflections, and head marker.
 * 
 * @param {Object} gliderDetail - Glider transect detail object from API
 * @param {Object} [options={}] - Visual options (isSelected, globeRadius, verticalExaggeration)
 * @returns {THREE.Group}
 */
export function createGliderTransectMesh(gliderDetail, options = {}) {
  const group = new THREE.Group();
  group.name = `glider-${gliderDetail.id}`;

  const isSelected = options.isSelected ?? false;
  const globeRadius = options.globeRadius ?? DEFAULT_GLOBE_RADIUS;
  const verticalExaggeration = options.verticalExaggeration ?? DEFAULT_VERTICAL_EXAGGERATION;
  const waypoints = gliderDetail.waypoints || [];

  const { segments, surfacings, diveBottoms, outliers, hasGaps } = segmentGliderTrack(waypoints);

  const trackColor = isSelected ? GLIDER_COLORS.selectedTrack : GLIDER_COLORS.defaultTrack;

  // 1. Render 3D Sawtooth Track Segments
  segments.forEach((seg, segIdx) => {
    const points = seg.map((wp) =>
      waypointToCartesian(wp.lat, wp.lon, wp.depth, { globeRadius, verticalExaggeration })
    );

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: trackColor,
      linewidth: isSelected ? 3 : 2,
      transparent: true,
      opacity: isSelected ? 0.95 : 0.8
    });

    const line = new THREE.Line(geometry, material);
    line.name = `glider-track-seg-${segIdx}`;
    group.add(line);
  });

  // 2. Surfacing GPS Transmission Beacons (Sea surface z=0) - Diamond Glyphs (◆)
  const surfaceGeo = new THREE.OctahedronGeometry(isSelected ? 0.55 : 0.45, 0);
  const surfaceMat = new THREE.MeshBasicMaterial({
    color: isSelected ? GLIDER_COLORS.selectedTrack : GLIDER_COLORS.surfacing
  });

  surfacings.forEach((wp, sIdx) => {
    const pos = waypointToCartesian(wp.lat, wp.lon, 0, { globeRadius, verticalExaggeration });
    const mesh = new THREE.Mesh(surfaceGeo, surfaceMat);
    mesh.position.copy(pos);
    mesh.rotation.y = Math.PI / 4; // Distinct diamond orientation
    mesh.name = `glider-surface-${sIdx}`;
    mesh.userData = {
      type: 'glider_surface',
      gliderId: gliderDetail.id,
      waypoint: wp
    };
    group.add(mesh);
  });

  // 3. Dive Bottom Inflection Anchors (Deepest turnaround points) - Inverted Diamond Inflections
  const bottomGeo = new THREE.OctahedronGeometry(isSelected ? 0.5 : 0.38, 0);
  const bottomMat = new THREE.MeshBasicMaterial({
    color: GLIDER_COLORS.diveBottom,
    wireframe: false
  });

  diveBottoms.forEach((wp, bIdx) => {
    const pos = waypointToCartesian(wp.lat, wp.lon, wp.depth, { globeRadius, verticalExaggeration });
    const mesh = new THREE.Mesh(bottomGeo, bottomMat);
    mesh.position.copy(pos);
    mesh.name = `glider-bottom-${bIdx}`;
    mesh.userData = {
      type: 'glider_bottom',
      gliderId: gliderDetail.id,
      waypoint: wp
    };
    group.add(mesh);
  });

  // 4. Outlier / QC Alert Points
  if (outliers.length > 0) {
    const outlierGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const outlierMat = new THREE.MeshBasicMaterial({ color: GLIDER_COLORS.outlier });
    outliers.forEach((wp, oIdx) => {
      const z = wp.depth != null ? wp.depth : 0;
      const pos = waypointToCartesian(wp.lat, wp.lon, z, { globeRadius, verticalExaggeration });
      const mesh = new THREE.Mesh(outlierGeo, outlierMat);
      mesh.position.copy(pos);
      mesh.name = `glider-outlier-${oIdx}`;
      mesh.userData = {
        type: 'glider_outlier',
        gliderId: gliderDetail.id,
        waypoint: wp
      };
      group.add(mesh);
    });
  }

  // 5. Glider Fuselage & Diamond Head Beacon (◆) - Distinct from circular Argo Floats
  if (waypoints.length > 0) {
    const latestWp = waypoints[waypoints.length - 1];
    const headPos = waypointToCartesian(
      gliderDetail.lat ?? latestWp.lat,
      gliderDetail.lon ?? latestWp.lon,
      latestWp.depth ?? 0,
      { globeRadius, verticalExaggeration }
    );

    const headGroup = new THREE.Group();
    headGroup.position.copy(headPos);
    headGroup.name = `glider-head-${gliderDetail.id}`;

    // 5a. Aerodynamic Diamond Fuselage Body
    const fuselageGeo = new THREE.OctahedronGeometry(0.9, 0);
    fuselageGeo.scale(1.5, 0.65, 0.85); // Streamlined glider hull
    const fuselageMat = new THREE.MeshStandardMaterial({
      color: isSelected ? GLIDER_COLORS.selectedTrack : GLIDER_COLORS.head,
      emissive: isSelected ? GLIDER_COLORS.selectedTrack : GLIDER_COLORS.head,
      emissiveIntensity: isSelected ? 1.0 : 0.6,
      roughness: 0.3,
      metalness: 0.2
    });
    const fuselageMesh = new THREE.Mesh(fuselageGeo, fuselageMat);
    fuselageMesh.name = 'glider-fuselage';
    headGroup.add(fuselageMesh);

    // 5b. Swept Delta Wings (Lateral Glide Planes)
    const wingsGeo = new THREE.BoxGeometry(2.2, 0.08, 0.65);
    const wingsMat = new THREE.MeshStandardMaterial({
      color: isSelected ? 0x38bdf8 : 0xd97706,
      roughness: 0.4
    });
    const wingsMesh = new THREE.Mesh(wingsGeo, wingsMat);
    wingsMesh.name = 'glider-wings';
    headGroup.add(wingsMesh);

    // 5c. Vertical Stabilizer Rudder Fin
    const finGeo = new THREE.BoxGeometry(0.08, 0.6, 0.45);
    const finMat = new THREE.MeshStandardMaterial({
      color: isSelected ? 0x38bdf8 : 0xb45309,
      roughness: 0.4
    });
    const finMesh = new THREE.Mesh(finGeo, finMat);
    finMesh.position.set(0, 0.35, -0.4);
    finMesh.name = 'glider-fin';
    headGroup.add(finMesh);

    // 5d. Diamond Selection Halo Ring (◆)
    const diamondRingGeo = new THREE.RingGeometry(1.6, 2.1, 4); // 4 sides = diamond
    const diamondRingMat = new THREE.MeshBasicMaterial({
      color: GLIDER_COLORS.selectedTrack,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isSelected ? 0.9 : 0.0
    });
    const diamondRingMesh = new THREE.Mesh(diamondRingGeo, diamondRingMat);
    diamondRingMesh.name = 'glider-selection-diamond';
    diamondRingMesh.rotation.x = Math.PI / 2;
    diamondRingMesh.rotation.z = Math.PI / 4; // Rotate into diamond shape ◆
    diamondRingMesh.visible = isSelected;
    headGroup.add(diamondRingMesh);

    headGroup.userData = {
      type: 'glider_head',
      gliderId: gliderDetail.id,
      detail: gliderDetail,
      waypoint: latestWp
    };
    group.add(headGroup);
  }

  group.userData = {
    id: gliderDetail.id,
    platform_type: 'glider',
    name: gliderDetail.name,
    hasGaps,
    detail: gliderDetail
  };

  return group;
}

/**
 * Updates visibility and occlusion for glider transect groups based on camera position.
 * Hides far-side geometries to prevent shining through the semi-transparent Earth sphere.
 * 
 * @param {THREE.Group} gliderGroup - Group containing glider transects
 * @param {THREE.Vector3} cameraPos - Current camera position
 * @param {number} [globeRadius=DEFAULT_GLOBE_RADIUS] - Earth radius
 */
export function updateGliderOcclusion(gliderGroup, cameraPos, globeRadius = DEFAULT_GLOBE_RADIUS) {
  if (!gliderGroup || !cameraPos) return;

  const worldPos = new THREE.Vector3();
  gliderGroup.children.forEach((child) => {
    child.getWorldPosition(worldPos);
    const occluded = isMarkerOccluded(worldPos, cameraPos, globeRadius);
    child.visible = !occluded;
  });
}

/**
 * Disposes all geometries, materials, and children in a glider transects group.
 * @param {THREE.Group} gliderGroup
 */
export function disposeGliderTransects(gliderGroup) {
  if (!gliderGroup) return;

  gliderGroup.children.forEach((child) => {
    child.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach((m) => m.dispose());
        } else {
          node.material.dispose();
        }
      }
    });
  });

  while (gliderGroup.children.length > 0) {
    gliderGroup.remove(gliderGroup.children[0]);
  }
}

/**
 * Raycasts against visible Glider transects in gliderGroup, excluding Earth-occluded geometry.
 * @param {THREE.Raycaster} raycaster
 * @param {THREE.Group} gliderGroup
 * @param {THREE.Vector3} cameraPos
 * @param {number} [globeRadius=DEFAULT_GLOBE_RADIUS]
 * @returns {Object|null} Intersected glider detail or null
 */
export function raycastGliderTransects(raycaster, gliderGroup, cameraPos, globeRadius = DEFAULT_GLOBE_RADIUS) {
  if (!gliderGroup || !gliderGroup.visible) return null;

  const intersects = raycaster.intersectObjects(gliderGroup.children, true);
  if (!intersects.length) return null;

  for (const hit of intersects) {
    let obj = hit.object;
    while (obj && !obj.userData?.gliderId && !obj.userData?.id && obj.parent) {
      obj = obj.parent;
    }

    if (obj) {
      const gliderId = obj.userData?.gliderId || obj.userData?.id;
      const detail = obj.userData?.detail || (obj.parent && obj.parent.userData?.detail);
      if (gliderId) {
        if (!isMarkerOccluded(hit.point, cameraPos, globeRadius)) {
          return detail || { id: gliderId, platform_type: 'glider' };
        }
      }
    }
  }

  return null;
}

/**
 * Updates visual appearance of glider transects when selected.
 * @param {THREE.Group} gliderGroup
 * @param {string|null} selectedId
 */
export function updateGliderSelectionVisuals(gliderGroup, selectedId) {
  if (!gliderGroup) return;

  gliderGroup.children.forEach((child) => {
    const isSelected = child.userData?.id === selectedId;
    const trackColor = isSelected ? GLIDER_COLORS.selectedTrack : GLIDER_COLORS.defaultTrack;

    child.traverse((node) => {
      if (node.name && node.name.startsWith('glider-track-seg') && node.material) {
        node.material.color.setHex(trackColor);
        node.material.opacity = isSelected ? 0.95 : 0.8;
      }
      if (node.name && node.name.startsWith('glider-surface') && node.material) {
        node.material.color.setHex(isSelected ? GLIDER_COLORS.selectedTrack : GLIDER_COLORS.surfacing);
      }
      if (node.name === 'glider-selection-diamond') {
        node.visible = isSelected;
        if (node.material) {
          node.material.opacity = isSelected ? 0.9 : 0.0;
        }
      }
      if (node.name === 'glider-fuselage' && node.material) {
        node.material.color.setHex(isSelected ? GLIDER_COLORS.selectedTrack : GLIDER_COLORS.head);
        if (node.material.emissive) {
          node.material.emissive.setHex(isSelected ? GLIDER_COLORS.selectedTrack : GLIDER_COLORS.head);
          node.material.emissiveIntensity = isSelected ? 1.0 : 0.6;
        }
      }
    });
  });
}
