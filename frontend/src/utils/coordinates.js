/**
 * SAMUDRA-3D Coordinate Conversion Utilities
 * Authority: Master Handbook physical pp. 6-7, 9-11; roadmap p. 10 (SIH26067)
 * 
 * Implements spherical-to-Cartesian mapping:
 *   X = r * cos(lat) * sin(lon)
 *   Y = r * sin(lat)
 *   Z = r * cos(lat) * cos(lon)
 * 
 * Spherical Anchor Verification:
 *   - lat=0, lon=0   => (0, 0, r)   [+Z axis]
 *   - lat=0, lon=90  => (r, 0, 0)   [+X axis]
 *   - lat=90, any    => (0, r, 0)   [+Y axis / North Pole]
 *   - lat=-90, any   => (0, -r, 0)  [-Y axis / South Pole]
 * 
 * Vertical Exaggeration Policy (20x - 50x):
 * Real Earth ocean depth (~4000m) is ~0.06% of Earth's 6,371km radius.
 * To enable visual subsurface exploration, a visual exaggeration of 20x-50x
 * (default 30x) is applied strictly to 3D geometry radii.
 * IMPORTANT: This exaggeration is VISUAL ONLY and does not modify the physical
 * scientific measurements or depth coordinates (which remain in true meters).
 */

import * as THREE from 'three';

export const DEFAULT_GLOBE_RADIUS = 100;
export const EARTH_RADIUS_METERS = 6371000;
export const DEFAULT_VERTICAL_EXAGGERATION = 30; // 20x - 50x policy

/**
 * Calculates the visual depth scale factor in Three.js world units per meter.
 * @param {number} globeRadius - Base 3D globe radius
 * @param {number} verticalExaggeration - Visual exaggeration factor (20 to 50)
 * @returns {number} Scale factor (units / meter)
 */
export function getVisualDepthScale(globeRadius = DEFAULT_GLOBE_RADIUS, verticalExaggeration = DEFAULT_VERTICAL_EXAGGERATION) {
  return (globeRadius / EARTH_RADIUS_METERS) * verticalExaggeration;
}

/**
 * Converts geographic coordinates (lat, lon, depth) to 3D Cartesian coordinates (x, y, z).
 * 
 * @param {number} lat - Latitude in degrees (-90 to 90)
 * @param {number} lon - Longitude in degrees (-180 to 180)
 * @param {number} depth - Depth in meters (positive downwards, 0 = sea surface)
 * @param {Object} options - Configuration options
 * @param {number} [options.globeRadius=100] - Base 3D globe radius
 * @param {number} [options.verticalExaggeration=30] - Visual exaggeration multiplier
 * @returns {{ x: number, y: number, z: number, radius: number }}
 */
export function geoToCartesian(lat, lon, depth = 0, options = {}) {
  const globeRadius = options.globeRadius ?? DEFAULT_GLOBE_RADIUS;
  const verticalExaggeration = options.verticalExaggeration ?? DEFAULT_VERTICAL_EXAGGERATION;

  // Calculate subsurface radius: increasing depth decreases radius
  const depthScale = getVisualDepthScale(globeRadius, verticalExaggeration);
  const visualDepthOffset = Math.max(0, depth) * depthScale;
  const r = Math.max(0.001, globeRadius - visualDepthOffset);

  // Convert angles to radians
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;

  // Handbook spherical projection formulas
  const cosLat = Math.cos(latRad);
  const sinLat = Math.sin(latRad);
  const sinLon = Math.sin(lonRad);
  const cosLon = Math.cos(lonRad);

  const x = r * cosLat * sinLon;
  const y = r * sinLat;
  const z = r * cosLat * cosLon;

  return { x, y, z, radius: r };
}

/**
 * Converts 3D Cartesian coordinates back to geographic coordinates (lat, lon, depth).
 * 
 * @param {number} x - Cartesian X coordinate
 * @param {number} y - Cartesian Y coordinate
 * @param {number} z - Cartesian Z coordinate
 * @param {Object} options - Configuration options
 * @returns {{ lat: number, lon: number, depth: number, radius: number }}
 */
export function cartesianToGeo(x, y, z, options = {}) {
  const globeRadius = options.globeRadius ?? DEFAULT_GLOBE_RADIUS;
  const verticalExaggeration = options.verticalExaggeration ?? DEFAULT_VERTICAL_EXAGGERATION;

  const r = Math.hypot(x, y, z);
  if (r < 1e-6) {
    return { lat: 0, lon: 0, depth: 0, radius: 0 };
  }

  // Latitude from Y
  const latRad = Math.asin(Math.max(-1, Math.min(1, y / r)));
  const lat = (latRad * 180) / Math.PI;

  // Longitude from X and Z (atan2(X, Z) corresponds to sin(lon)/cos(lon))
  const lonRad = Math.atan2(x, z);
  const lon = (lonRad * 180) / Math.PI;

  // Depth in meters (inverse of radius calculation)
  const depthScale = getVisualDepthScale(globeRadius, verticalExaggeration);
  const depth = Math.max(0, (globeRadius - r) / depthScale);

  return { lat, lon, depth, radius: r };
}

/**
 * Computes the geographic bounding box of the currently-visible Earth window.
 *
 * The Four Points method: from the camera distance + FOV we compute the
 * angular radius of the visible disc.  We then sample four points on the
 * globe at the horizon and on the meridian cross-sections, convert them back
 * to lat/lon, and derive a conservative lat/lon bbox.
 *
 * Used by the frontend so fetchOceanData ALWAYS carries explicit bounds
 * (Master Prompt Section 18).  The full global grid can never be requested by accident.
 */
export function cameraVisibleBoundingBox(camera, globeRadius = DEFAULT_GLOBE_RADIUS, _maxSpanDeg = 180) {
  const dist = Math.max(0.001, camera.position.length());
  const fov = camera.fov * (Math.PI / 180);
  const halfFov = fov / 2;
  const alpha = Math.atan2(globeRadius, dist);
  const visibleHalfAngle = halfFov + Math.asin(Math.min(1, globeRadius / Math.max(1, dist)));
  const edgeAngle = Math.min(Math.PI / 2, visibleHalfAngle + alpha);
  const pts = [[edgeAngle, 0], [-edgeAngle, 0], [0, edgeAngle], [0, -edgeAngle]];
  const corners = pts.map(([thLat, thLon]) => {
    const local = new THREE.Vector3(
      Math.cos(thLat) * Math.sin(thLon),
      Math.sin(thLat),
      Math.cos(thLat) * Math.cos(thLon)
    ).multiplyScalar(globeRadius);
    const world = local.applyQuaternion(camera.quaternion).normalize().multiplyScalar(globeRadius);
    const g = cartesianToGeo(world.x, world.y, world.z, { globeRadius });
    return { lat: g.lat, lon: g.lon };
  });
  let latMin = Math.min(...corners.map(p => p.lat));
  let latMax = Math.max(...corners.map(p => p.lat));
  let lonMin = Math.min(...corners.map(p => p.lon));
  let lonMax = Math.max(...corners.map(p => p.lon));
  if (lonMax - lonMin > 180) {
    const mid = (lonMax + lonMin) / 2;
    lonMin = mid - 120; lonMax = mid + 120;
  }
  const SAF = 5;
  latMin = Math.max(-90 + SAF, Math.min(latMin, 90 - SAF));
  latMax = Math.max(-89 + SAF, Math.min(latMax, 90 + SAF));
  lonMin = Math.max(-180 + SAF, Math.min(lonMin, 180 - SAF));
  lonMax = Math.max(-179 + SAF, Math.min(lonMax, 180 + SAF));
  if (latMax - latMin < 1) latMax = Math.min(90, latMin + 10);
  if (lonMax - lonMin < 1) lonMax = Math.min(180, lonMin + 10);
  return { lat_min: latMin, lat_max: latMax, lon_min: lonMin, lon_max: lonMax };
}
