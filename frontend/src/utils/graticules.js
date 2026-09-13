import * as THREE from 'three';
import { geoToCartesian, DEFAULT_GLOBE_RADIUS } from './coordinates.js';

/**
 * Creates 3D Spherical Coordinate Graticules (Latitude Parallels & Longitude Meridians)
 * Specifically styled for institutional oceanographic visualization.
 */
export function createGraticuleMesh(options = {}) {
  const globeRadius = options.globeRadius ?? DEFAULT_GLOBE_RADIUS;
  const r = globeRadius * 1.002; // Float just above Earth surface

  const graticuleGroup = new THREE.Group();
  graticuleGroup.name = 'ocean-coordinate-graticules';

  const positionsStandard = [];
  const positionsMajor = [];
  const positionsEquator = [];

  // 1. Latitude Parallels (-80° to +80° in 10° increments)
  for (let lat = -80; lat <= 80; lat += 10) {
    const isEquator = lat === 0;
    const isTropic = Math.abs(lat - 23.5) < 0.5 || Math.abs(lat + 23.5) < 0.5;
    const isMajor = isTropic || lat === 20 || lat === 10;

    let targetArray = positionsStandard;
    if (isEquator) targetArray = positionsEquator;
    else if (isMajor) targetArray = positionsMajor;

    for (let lon = 0; lon < 360; lon += 3) {
      const p1 = geoToCartesian(lat, lon, 0, { globeRadius: r });
      const p2 = geoToCartesian(lat, lon + 3, 0, { globeRadius: r });
      targetArray.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
  }

  // 2. Longitude Meridians (0° to 350° in 10° increments)
  for (let lon = 0; lon < 360; lon += 10) {
    const isIndianOceanRef = lon === 80 || lon === 70 || lon === 90;
    let targetArray = isIndianOceanRef ? positionsMajor : positionsStandard;

    for (let lat = -80; lat < 80; lat += 3) {
      const p1 = geoToCartesian(lat, lon, 0, { globeRadius: r });
      const p2 = geoToCartesian(lat + 3, lon, 0, { globeRadius: r });
      targetArray.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
  }

  // Equator Line (Vibrant Cyan)
  if (positionsEquator.length > 0) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positionsEquator, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const lines = new THREE.LineSegments(geo, mat);
    lines.renderOrder = 5;
    graticuleGroup.add(lines);
  }

  // Major Parallels & Central Meridians (Sky Blue/Slate)
  if (positionsMajor.length > 0) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positionsMajor, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.50,
      depthWrite: false
    });
    const lines = new THREE.LineSegments(geo, mat);
    lines.renderOrder = 5;
    graticuleGroup.add(lines);
  }

  // Standard 10° Grid Lines (Muted Navy Slate)
  if (positionsStandard.length > 0) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positionsStandard, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    const lines = new THREE.LineSegments(geo, mat);
    lines.renderOrder = 5;
    graticuleGroup.add(lines);
  }

  return graticuleGroup;
}

/**
 * Key Indian Ocean Geographical Features and Basins
 */
export const OCEAN_FEATURES = [
  { name: 'Arabian Sea', lat: 16.0, lon: 66.5, type: 'basin', tag: 'BASIN' },
  { name: 'Bay of Bengal', lat: 14.5, lon: 88.5, type: 'basin', tag: 'BASIN' },
  { name: 'Equatorial Indian Ocean', lat: 0.0, lon: 78.0, type: 'basin', tag: 'EQUATOR' },
  { name: 'Lakshadweep Sea', lat: 10.5, lon: 72.5, type: 'shelf', tag: 'MARGIN' },
  { name: 'Andaman Sea', lat: 11.5, lon: 93.5, type: 'shelf', tag: 'MARGIN' },
  { name: 'Carlsberg Ridge', lat: 3.5, lon: 63.5, type: 'ridge', tag: 'RIDGE' },
  { name: 'Ninety East Ridge', lat: -2.0, lon: 90.0, type: 'ridge', tag: 'RIDGE' },
  { name: 'Chagos Basin', lat: -5.5, lon: 72.0, type: 'basin', tag: 'TRENCH' }
];

/**
 * Creates 3D Floating Canvas Sprite Badges for Ocean Geographic Features
 */
export function createBasinLabelsGroup(options = {}) {
  const globeRadius = options.globeRadius ?? DEFAULT_GLOBE_RADIUS;
  const labelGroup = new THREE.Group();
  labelGroup.name = 'ocean-feature-labels';

  OCEAN_FEATURES.forEach((feature) => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 72;
    const ctx = canvas.getContext('2d');

    // Transparent background with pill
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Pill background
    ctx.fillStyle = 'rgba(11, 19, 34, 0.85)';
    ctx.strokeStyle = feature.type === 'ridge' ? '#f59e0b' : '#38bdf8';
    ctx.lineWidth = 2.5;

    const x = 8, y = 8, w = 304, h = 56, r = 12;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Type Tag Pill
    ctx.fillStyle = feature.type === 'ridge' ? '#78350f' : '#0369a1';
    ctx.fillRect(20, 20, 52, 28);
    ctx.fillStyle = feature.type === 'ridge' ? '#fbbf24' : '#38bdf8';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(feature.tag, 46, 34);

    // Feature Name
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(feature.name, 82, 35);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.90,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(spriteMat);
    const cart = geoToCartesian(feature.lat, feature.lon, 0, {
      globeRadius: globeRadius * 1.018
    });
    sprite.position.set(cart.x, cart.y, cart.z);
    sprite.scale.set(13, 3.2, 1);
    sprite.renderOrder = 8;
    labelGroup.add(sprite);
  });

  return labelGroup;
}

/**
 * Disposes of graticule and label group resources
 */
export function disposeGraticuleGroup(group) {
  if (!group) return;
  group.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (child.material.map) child.material.map.dispose();
      child.material.dispose();
    }
  });
  while (group.children.length > 0) {
    group.remove(group.children[0]);
  }
}
