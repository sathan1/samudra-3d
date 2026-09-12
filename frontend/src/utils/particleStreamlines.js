import * as THREE from 'three';
import { geoToCartesian, EARTH_RADIUS_METERS, DEFAULT_GLOBE_RADIUS, DEFAULT_VERTICAL_EXAGGERATION } from './coordinates.js';

export const PARTICLE_COUNT = 1500;
export const DEFAULT_SPEED_SCALE = 65000; // Visual advection multiplier for physical m/s on 3D globe

/**
 * Computes eastward unit tangent vector at given longitude.
 * e_east = (cos(lon), 0, -sin(lon))
 */
export function getEastTangent(lonDeg) {
  const lonRad = (lonDeg * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(lonRad), 0, -Math.sin(lonRad)).normalize();
}

/**
 * Computes northward unit tangent vector at given latitude and longitude.
 * e_north = (-sin(lat)*sin(lon), cos(lat), -sin(lat)*cos(lon))
 */
export function getNorthTangent(latDeg, lonDeg) {
  const latRad = (latDeg * Math.PI) / 180;
  const lonRad = (lonDeg * Math.PI) / 180;
  return new THREE.Vector3(
    -Math.sin(latRad) * Math.sin(lonRad),
    Math.cos(latRad),
    -Math.sin(latRad) * Math.cos(lonRad)
  ).normalize();
}

/**
 * Combines horizontal (u, v) velocities into 3D world tangent velocity vector.
 */
export function computeTangentVelocity(u, v, latDeg, lonDeg) {
  const eEast = getEastTangent(lonDeg);
  const eNorth = getNorthTangent(latDeg, lonDeg);
  return new THREE.Vector3()
    .addScaledVector(eEast, u)
    .addScaledVector(eNorth, v);
}

/**
 * Bilinearly samples (u, v) and derived speed from 2D regular grids.
 * Returns null if out of bounds or if any surrounding cell is masked (null).
 */
export function sampleGridVector(lat, lon, lats, lons, uGrid, vGrid) {
  if (!lats || !lons || !uGrid || !vGrid) return null;
  const numLats = lats.length;
  const numLons = lons.length;

  const latMin = lats[0];
  const latMax = lats[numLats - 1];
  const lonMin = lons[0];
  const lonMax = lons[numLons - 1];

  if (lat < latMin || lat > latMax || lon < lonMin || lon > lonMax) {
    return null;
  }

  // Calculate fractional indices
  const dLat = (latMax - latMin) / (numLats - 1);
  const dLon = (lonMax - lonMin) / (numLons - 1);

  const iFloat = (lat - latMin) / dLat;
  const jFloat = (lon - lonMin) / dLon;

  const i0 = Math.floor(iFloat);
  const i1 = Math.min(numLats - 1, i0 + 1);
  const j0 = Math.floor(jFloat);
  const j1 = Math.min(numLons - 1, j0 + 1);

  const fx = jFloat - j0;
  const fy = iFloat - i0;

  // Retrieve 4 corner values
  const u00 = uGrid[i0]?.[j0];
  const u10 = uGrid[i0]?.[j1];
  const u01 = uGrid[i1]?.[j0];
  const u11 = uGrid[i1]?.[j1];

  const v00 = vGrid[i0]?.[j0];
  const v10 = vGrid[i0]?.[j1];
  const v01 = vGrid[i1]?.[j0];
  const v11 = vGrid[i1]?.[j1];

  // Land / missing data rejection
  if (
    u00 === null || u00 === undefined ||
    u10 === null || u10 === undefined ||
    u01 === null || u01 === undefined ||
    u11 === null || u11 === undefined ||
    v00 === null || v00 === undefined ||
    v10 === null || v10 === undefined ||
    v01 === null || v01 === undefined ||
    v11 === null || v11 === undefined
  ) {
    return null;
  }

  // Bilinear interpolation
  const u = (1 - fy) * ((1 - fx) * u00 + fx * u10) + fy * ((1 - fx) * u01 + fx * u11);
  const v = (1 - fy) * ((1 - fx) * v00 + fx * v10) + fy * ((1 - fx) * v01 + fx * v11);
  const speed = Math.hypot(u, v);

  return { u, v, speed };
}

/**
 * Maps current speed (m/s) to a high-contrast oceanographic particle color.
 */
export function getColorForSpeed(speed) {
  // Speed ranges: 0.0 - 0.2 (cyan), 0.2 - 0.6 (teal/yellow), > 0.6 (coral/white)
  if (speed < 0.2) {
    return new THREE.Color(0x38bdf8); // Sky blue
  } else if (speed < 0.5) {
    return new THREE.Color(0x34d399); // Emerald teal
  } else if (speed < 0.8) {
    return new THREE.Color(0xfbbf24); // Amber gold
  } else {
    return new THREE.Color(0xf87171); // Coral red
  }
}

/**
 * High-performance GPU InstancedMesh Particle System
 */
export class ParticleSystem {
  constructor(count = PARTICLE_COUNT, options = {}) {
    this.count = count;
    this.speedScale = options.speedScale ?? DEFAULT_SPEED_SCALE;

    this.lats = new Float32Array(count);
    this.lons = new Float32Array(count);
    this.ages = new Float32Array(count);
    this.maxAges = new Float32Array(count);
    this.validSpawnPoints = [];

    // Pre-allocated Three.js objects for zero GC in animation loop
    this._dummy = new THREE.Object3D();
    this._pos = new THREE.Vector3();
    this._v3d = new THREE.Vector3();
    this._forward = new THREE.Vector3(0, 1, 0); // Cone tip faces +Y
    this._color = new THREE.Color();

    // Low-poly tapered cone geometry representing current direction
    const geometry = new THREE.ConeGeometry(0.3, 1.1, 5);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.renderOrder = 4; // Render above scalar field & globe
  }

  /**
   * Initializes particle positions by finding valid unmasked ocean grid cells.
   */
  init(lats, lons, uGrid, _vGrid) {
    this.validSpawnPoints = [];
    if (lats && lons && uGrid) {
      for (let i = 0; i < lats.length; i += 2) {
        for (let j = 0; j < lons.length; j += 2) {
          if (uGrid[i]?.[j] !== null && uGrid[i]?.[j] !== undefined) {
            this.validSpawnPoints.push({ lat: lats[i], lon: lons[j] });
          }
        }
      }
    }

    // Default fallback if no grid provided yet
    if (this.validSpawnPoints.length === 0) {
      this.validSpawnPoints.push({ lat: 10, lon: 75 }, { lat: 5, lon: 80 });
    }

    for (let i = 0; i < this.count; i++) {
      this.respawnParticle(i);
      // Stagger initial ages
      this.ages[i] = Math.random() * this.maxAges[i];
    }
  }

  respawnParticle(i) {
    const pt = this.validSpawnPoints[Math.floor(Math.random() * this.validSpawnPoints.length)];
    // Slight jitter around grid point
    this.lats[i] = pt.lat + (Math.random() - 0.5) * 0.4;
    this.lons[i] = pt.lon + (Math.random() - 0.5) * 0.4;
    this.ages[i] = 0;
    this.maxAges[i] = 2.0 + Math.random() * 3.0; // 2 to 5 seconds lifetime
  }

  /**
   * Advects particles using Euler integration and updates GPU instance buffers.
   */
  update(dt, uGrid, vGrid, lats, lons, depth = 0, options = {}) {
    if (!this.mesh || !uGrid || !vGrid || !lats || !lons) return;

    const clampedDt = Math.min(0.1, Math.max(0.001, dt));
    const globeRadius = options.globeRadius ?? DEFAULT_GLOBE_RADIUS;
    const verticalExaggeration = options.verticalExaggeration ?? DEFAULT_VERTICAL_EXAGGERATION;

    for (let i = 0; i < this.count; i++) {
      this.ages[i] += clampedDt;

      if (this.ages[i] >= this.maxAges[i]) {
        this.respawnParticle(i);
      }

      let lat = this.lats[i];
      let lon = this.lons[i];

      const vec = sampleGridVector(lat, lon, lats, lons, uGrid, vGrid);
      if (!vec || vec.speed < 0.001) {
        this.respawnParticle(i);
        continue;
      }

      // Advection step: dLat & dLon in degrees
      const latRad = (lat * Math.PI) / 180;
      const cosLat = Math.max(0.01, Math.cos(latRad));

      const dLat = (vec.v / EARTH_RADIUS_METERS) * (180 / Math.PI) * clampedDt * this.speedScale;
      const dLon = (vec.u / (EARTH_RADIUS_METERS * cosLat)) * (180 / Math.PI) * clampedDt * this.speedScale;

      this.lats[i] += dLat;
      this.lons[i] += dLon;
      lat = this.lats[i];
      lon = this.lons[i];

      // Convert to 3D Cartesian coordinates with slight outward radial offset (+0.3)
      const cart = geoToCartesian(lat, lon, depth, { globeRadius, verticalExaggeration });
      const normRadius = cart.radius;
      const surfaceOffset = 1.0 + (0.35 / normRadius);
      this._pos.set(cart.x * surfaceOffset, cart.y * surfaceOffset, cart.z * surfaceOffset);

      // Compute local 3D tangent direction
      this._v3d.copy(computeTangentVelocity(vec.u, vec.v, lat, lon));
      if (this._v3d.lengthSq() > 0.0001) {
        this._v3d.normalize();
        this._dummy.quaternion.setFromUnitVectors(this._forward, this._v3d);
      }

      // Position and dynamic scale based on speed
      this._dummy.position.copy(this._pos);
      const lenScale = Math.min(2.2, 0.7 + vec.speed * 1.6);
      this._dummy.scale.set(0.7, lenScale, 0.7);
      this._dummy.updateMatrix();

      this.mesh.setMatrixAt(i, this._dummy.matrix);
      this.mesh.setColorAt(i, getColorForSpeed(vec.speed));
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      if (this.mesh.parent) {
        this.mesh.parent.remove(this.mesh);
      }
      this.mesh = null;
    }
    this.validSpawnPoints = [];
  }
}
