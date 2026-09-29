import * as THREE from 'three';
import { geoToCartesian, DEFAULT_GLOBE_RADIUS } from './coordinates.js';
import { isMarkerOccluded } from './argoProfiles.js';

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
 * Comprehensive 4-Tier Multi-Scale Hierarchical Ocean Places Database.
 * Emulates Google Maps place expansion:
 * Tier 1: Macro Basins (visible from global orbit > 132)
 * Tier 2: Regional Sub-Basins & Marginal Seas (fades in 120-220)
 * Tier 3: Coastal Maritime Zones & Upwelling Shelves (fades in 110-165)
 * Tier 4: Local Fishing Harbors, INCOIS PFZ Zones, Ports & Atolls (expands when zoomed <= 134)
 */
export const PRECISION_OCEAN_PLACES = [
  // --- TIER 1: MACRO BASINS (Level 1) ---
  {
    id: 'macro-arabian',
    name: 'Arabian Sea',
    lat: 16.0,
    lon: 66.5,
    level: 1,
    type: 'basin',
    tag: 'BASIN',
    minDist: 132,
    maxDist: 450,
    peakDist: 210,
    baseScale: { x: 14.5, y: 3.6 },
    color: '#38bdf8',
    pillBg: 'rgba(11, 19, 34, 0.90)',
    badgeBg: '#0369a1',
    badgeText: '#38bdf8'
  },
  {
    id: 'macro-bob',
    name: 'Bay of Bengal',
    lat: 14.5,
    lon: 88.5,
    level: 1,
    type: 'basin',
    tag: 'BASIN',
    minDist: 132,
    maxDist: 450,
    peakDist: 210,
    baseScale: { x: 14.5, y: 3.6 },
    color: '#38bdf8',
    pillBg: 'rgba(11, 19, 34, 0.90)',
    badgeBg: '#0369a1',
    badgeText: '#38bdf8'
  },
  {
    id: 'macro-equator',
    name: 'Equatorial Indian Ocean',
    lat: 0.0,
    lon: 78.0,
    level: 1,
    type: 'basin',
    tag: 'EQUATOR',
    minDist: 140,
    maxDist: 450,
    peakDist: 220,
    baseScale: { x: 17.5, y: 3.6 },
    color: '#38bdf8',
    pillBg: 'rgba(11, 19, 34, 0.90)',
    badgeBg: '#0369a1',
    badgeText: '#38bdf8'
  },
  {
    id: 'macro-carlsberg',
    name: 'Carlsberg Ridge',
    lat: 3.5,
    lon: 63.5,
    level: 1,
    type: 'ridge',
    tag: 'RIDGE',
    minDist: 140,
    maxDist: 380,
    peakDist: 200,
    baseScale: { x: 14.0, y: 3.5 },
    color: '#f59e0b',
    pillBg: 'rgba(24, 18, 11, 0.90)',
    badgeBg: '#78350f',
    badgeText: '#fbbf24'
  },
  {
    id: 'macro-ninetyeast',
    name: 'Ninety East Ridge',
    lat: -2.0,
    lon: 90.0,
    level: 1,
    type: 'ridge',
    tag: 'RIDGE',
    minDist: 140,
    maxDist: 380,
    peakDist: 200,
    baseScale: { x: 15.0, y: 3.5 },
    color: '#f59e0b',
    pillBg: 'rgba(24, 18, 11, 0.90)',
    badgeBg: '#78350f',
    badgeText: '#fbbf24'
  },
  {
    id: 'macro-somali',
    name: 'Somali Deep Basin',
    lat: 4.5,
    lon: 53.0,
    level: 1,
    type: 'basin',
    tag: 'BASIN',
    minDist: 140,
    maxDist: 380,
    peakDist: 210,
    baseScale: { x: 15.0, y: 3.5 },
    color: '#38bdf8',
    pillBg: 'rgba(11, 19, 34, 0.90)',
    badgeBg: '#0369a1',
    badgeText: '#38bdf8'
  },

  // --- TIER 2: REGIONAL SUB-BASINS & MARGINAL SEAS (Level 2) ---
  {
    id: 'sub-lakshadweep',
    name: 'Lakshadweep Sea',
    lat: 10.5,
    lon: 72.5,
    level: 2,
    type: 'margin',
    tag: 'MARGIN',
    minDist: 120,
    maxDist: 220,
    peakDist: 160,
    baseScale: { x: 12.5, y: 3.0 },
    color: '#06b6d4',
    pillBg: 'rgba(8, 28, 36, 0.90)',
    badgeBg: '#155e75',
    badgeText: '#22d3ee'
  },
  {
    id: 'sub-andaman',
    name: 'Andaman Sea',
    lat: 11.5,
    lon: 93.5,
    level: 2,
    type: 'margin',
    tag: 'MARGIN',
    minDist: 120,
    maxDist: 220,
    peakDist: 160,
    baseScale: { x: 12.0, y: 3.0 },
    color: '#06b6d4',
    pillBg: 'rgba(8, 28, 36, 0.90)',
    badgeBg: '#155e75',
    badgeText: '#22d3ee'
  },
  {
    id: 'sub-aden',
    name: 'Gulf of Aden',
    lat: 12.5,
    lon: 48.0,
    level: 2,
    type: 'gulf',
    tag: 'GULF',
    minDist: 122,
    maxDist: 210,
    peakDist: 155,
    baseScale: { x: 11.5, y: 3.0 },
    color: '#0ea5e9',
    pillBg: 'rgba(10, 25, 40, 0.90)',
    badgeBg: '#0369a1',
    badgeText: '#38bdf8'
  },
  {
    id: 'sub-oman',
    name: 'Gulf of Oman',
    lat: 24.5,
    lon: 58.5,
    level: 2,
    type: 'gulf',
    tag: 'GULF',
    minDist: 122,
    maxDist: 210,
    peakDist: 155,
    baseScale: { x: 11.5, y: 3.0 },
    color: '#0ea5e9',
    pillBg: 'rgba(10, 25, 40, 0.90)',
    badgeBg: '#0369a1',
    badgeText: '#38bdf8'
  },
  {
    id: 'sub-chagos',
    name: 'Chagos Trench Basin',
    lat: -5.5,
    lon: 72.0,
    level: 2,
    type: 'trench',
    tag: 'TRENCH',
    minDist: 122,
    maxDist: 220,
    peakDist: 165,
    baseScale: { x: 13.5, y: 3.0 },
    color: '#818cf8',
    pillBg: 'rgba(20, 18, 45, 0.90)',
    badgeBg: '#3730a3',
    badgeText: '#a5b4fc'
  },
  {
    id: 'sub-mannar',
    name: 'Gulf of Mannar',
    lat: 8.5,
    lon: 79.0,
    level: 2,
    type: 'gulf',
    tag: 'GULF',
    minDist: 118,
    maxDist: 185,
    peakDist: 145,
    baseScale: { x: 11.5, y: 2.8 },
    color: '#06b6d4',
    pillBg: 'rgba(8, 28, 36, 0.90)',
    badgeBg: '#155e75',
    badgeText: '#22d3ee'
  },
  {
    id: 'sub-palk',
    name: 'Palk Strait',
    lat: 9.8,
    lon: 79.5,
    level: 2,
    type: 'strait',
    tag: 'STRAIT',
    minDist: 116,
    maxDist: 180,
    peakDist: 140,
    baseScale: { x: 10.5, y: 2.8 },
    color: '#06b6d4',
    pillBg: 'rgba(8, 28, 36, 0.90)',
    badgeBg: '#155e75',
    badgeText: '#22d3ee'
  },

  // --- TIER 3: COASTAL MARITIME ZONES & SHELF UPWELLING (Level 3) ---
  {
    id: 'coast-gujarat',
    name: 'Gujarat Coastal Shelf',
    lat: 21.0,
    lon: 70.0,
    level: 3,
    type: 'shelf',
    tag: 'SHELF',
    minDist: 110,
    maxDist: 165,
    peakDist: 130,
    baseScale: { x: 11.0, y: 2.6 },
    color: '#38bdf8',
    pillBg: 'rgba(11, 25, 44, 0.92)',
    badgeBg: '#0284c7',
    badgeText: '#7dd3fc'
  },
  {
    id: 'coast-khambhat',
    name: 'Gulf of Khambhat',
    lat: 21.5,
    lon: 72.2,
    level: 3,
    type: 'gulf',
    tag: 'GULF',
    minDist: 110,
    maxDist: 155,
    peakDist: 128,
    baseScale: { x: 10.5, y: 2.5 },
    color: '#38bdf8',
    pillBg: 'rgba(11, 25, 44, 0.92)',
    badgeBg: '#0284c7',
    badgeText: '#7dd3fc'
  },
  {
    id: 'coast-kutch',
    name: 'Gulf of Kutch Marine Shelf',
    lat: 22.6,
    lon: 69.5,
    level: 3,
    type: 'shelf',
    tag: 'SHELF',
    minDist: 110,
    maxDist: 155,
    peakDist: 128,
    baseScale: { x: 12.0, y: 2.5 },
    color: '#38bdf8',
    pillBg: 'rgba(11, 25, 44, 0.92)',
    badgeBg: '#0284c7',
    badgeText: '#7dd3fc'
  },
  {
    id: 'coast-konkan',
    name: 'Konkan Coast & Shelf',
    lat: 18.5,
    lon: 72.0,
    level: 3,
    type: 'shelf',
    tag: 'SHELF',
    minDist: 110,
    maxDist: 165,
    peakDist: 130,
    baseScale: { x: 11.0, y: 2.6 },
    color: '#38bdf8',
    pillBg: 'rgba(11, 25, 44, 0.92)',
    badgeBg: '#0284c7',
    badgeText: '#7dd3fc'
  },
  {
    id: 'coast-malabar',
    name: 'Malabar Upwelling Zone',
    lat: 10.2,
    lon: 75.5,
    level: 3,
    type: 'upwelling',
    tag: 'UPWELLING',
    minDist: 110,
    maxDist: 165,
    peakDist: 130,
    baseScale: { x: 12.5, y: 2.6 },
    color: '#10b981',
    pillBg: 'rgba(6, 32, 24, 0.92)',
    badgeBg: '#047857',
    badgeText: '#6ee7b7'
  },
  {
    id: 'coast-coromandel',
    name: 'Coromandel Coastal Shelf',
    lat: 12.0,
    lon: 80.8,
    level: 3,
    type: 'shelf',
    tag: 'SHELF',
    minDist: 110,
    maxDist: 165,
    peakDist: 130,
    baseScale: { x: 12.5, y: 2.6 },
    color: '#38bdf8',
    pillBg: 'rgba(11, 25, 44, 0.92)',
    badgeBg: '#0284c7',
    badgeText: '#7dd3fc'
  },
  {
    id: 'coast-andhra',
    name: 'Northern Circars / Andhra Shelf',
    lat: 16.5,
    lon: 82.8,
    level: 3,
    type: 'shelf',
    tag: 'SHELF',
    minDist: 110,
    maxDist: 165,
    peakDist: 130,
    baseScale: { x: 13.5, y: 2.6 },
    color: '#38bdf8',
    pillBg: 'rgba(11, 25, 44, 0.92)',
    badgeBg: '#0284c7',
    badgeText: '#7dd3fc'
  },
  {
    id: 'coast-odisha',
    name: 'Odisha Shelf & Plume',
    lat: 19.5,
    lon: 86.0,
    level: 3,
    type: 'shelf',
    tag: 'SHELF',
    minDist: 110,
    maxDist: 165,
    peakDist: 130,
    baseScale: { x: 11.5, y: 2.6 },
    color: '#38bdf8',
    pillBg: 'rgba(11, 25, 44, 0.92)',
    badgeBg: '#0284c7',
    badgeText: '#7dd3fc'
  },
  {
    id: 'coast-sundarbans',
    name: 'Sundarbans Delta Plume',
    lat: 21.3,
    lon: 89.0,
    level: 3,
    type: 'delta',
    tag: 'DELTA',
    minDist: 110,
    maxDist: 165,
    peakDist: 130,
    baseScale: { x: 12.5, y: 2.6 },
    color: '#10b981',
    pillBg: 'rgba(6, 32, 24, 0.92)',
    badgeBg: '#047857',
    badgeText: '#6ee7b7'
  },
  {
    id: 'coast-wadge',
    name: 'Wadge Bank Pelagic Shelf',
    lat: 7.8,
    lon: 77.5,
    level: 3,
    type: 'shelf',
    tag: 'BANK',
    minDist: 110,
    maxDist: 165,
    peakDist: 130,
    baseScale: { x: 12.5, y: 2.6 },
    color: '#10b981',
    pillBg: 'rgba(6, 32, 24, 0.92)',
    badgeBg: '#047857',
    badgeText: '#6ee7b7'
  },
  {
    id: 'coast-lakshadweep-atolls',
    name: 'Lakshadweep Archipelago',
    lat: 11.0,
    lon: 72.8,
    level: 3,
    type: 'atoll',
    tag: 'ATOLL',
    minDist: 110,
    maxDist: 165,
    peakDist: 130,
    baseScale: { x: 12.5, y: 2.6 },
    color: '#14b8a6',
    pillBg: 'rgba(4, 28, 28, 0.92)',
    badgeBg: '#0f766e',
    badgeText: '#5eead4'
  },
  {
    id: 'coast-andaman-ridge',
    name: 'Andaman Ridge Shelf',
    lat: 12.0,
    lon: 92.8,
    level: 3,
    type: 'shelf',
    tag: 'ISLANDS',
    minDist: 110,
    maxDist: 165,
    peakDist: 130,
    baseScale: { x: 12.0, y: 2.6 },
    color: '#14b8a6',
    pillBg: 'rgba(4, 28, 28, 0.92)',
    badgeBg: '#0f766e',
    badgeText: '#5eead4'
  },
  {
    id: 'coast-nicobar',
    name: 'Nicobar Deep Basin',
    lat: 7.5,
    lon: 93.5,
    level: 3,
    type: 'shelf',
    tag: 'ISLANDS',
    minDist: 110,
    maxDist: 165,
    peakDist: 130,
    baseScale: { x: 11.5, y: 2.6 },
    color: '#14b8a6',
    pillBg: 'rgba(4, 28, 28, 0.92)',
    badgeBg: '#0f766e',
    badgeText: '#5eead4'
  },

  // --- TIER 4: LOCAL FISHING HARBORS, INCOIS PFZ CENTERS, PORTS & ATOLLS (Level 4) ---
  {
    id: 'sec-veraval',
    name: 'Veraval Fishing Harbor & PFZ',
    lat: 20.90,
    lon: 70.37,
    level: 4,
    type: 'pfz',
    tag: 'PFZ/HARBOR',
    minDist: 103,
    maxDist: 134,
    peakDist: 114,
    baseScale: { x: 8.8, y: 2.2 },
    color: '#10b981',
    pillBg: 'rgba(5, 24, 18, 0.94)',
    badgeBg: '#059669',
    badgeText: '#a7f3d0'
  },
  {
    id: 'sec-porbandar',
    name: 'Porbandar Deep Sea Port',
    lat: 21.64,
    lon: 69.60,
    level: 4,
    type: 'port',
    tag: 'PORT',
    minDist: 103,
    maxDist: 132,
    peakDist: 114,
    baseScale: { x: 7.8, y: 2.2 },
    color: '#818cf8',
    pillBg: 'rgba(16, 14, 38, 0.94)',
    badgeBg: '#4f46e5',
    badgeText: '#c7d2fe'
  },
  {
    id: 'sec-okha',
    name: 'Okha Port & Sanctuary',
    lat: 22.47,
    lon: 69.07,
    level: 4,
    type: 'port',
    tag: 'PORT',
    minDist: 103,
    maxDist: 132,
    peakDist: 114,
    baseScale: { x: 7.6, y: 2.2 },
    color: '#818cf8',
    pillBg: 'rgba(16, 14, 38, 0.94)',
    badgeBg: '#4f46e5',
    badgeText: '#c7d2fe'
  },
  {
    id: 'sec-jaffrabad',
    name: 'Jaffrabad Coastal Fishery',
    lat: 20.87,
    lon: 71.37,
    level: 4,
    type: 'pfz',
    tag: 'PFZ',
    minDist: 103,
    maxDist: 132,
    peakDist: 114,
    baseScale: { x: 7.8, y: 2.2 },
    color: '#10b981',
    pillBg: 'rgba(5, 24, 18, 0.94)',
    badgeBg: '#059669',
    badgeText: '#a7f3d0'
  },
  {
    id: 'sec-sassoon',
    name: 'Sassoon Dock & Mumbai Port',
    lat: 18.92,
    lon: 72.83,
    level: 4,
    type: 'harbor',
    tag: 'HARBOR',
    minDist: 103,
    maxDist: 134,
    peakDist: 114,
    baseScale: { x: 8.8, y: 2.2 },
    color: '#0284c7',
    pillBg: 'rgba(8, 24, 38, 0.94)',
    badgeBg: '#0369a1',
    badgeText: '#7dd3fc'
  },
  {
    id: 'sec-alibaug',
    name: 'Alibaug Marine Station',
    lat: 18.64,
    lon: 72.87,
    level: 4,
    type: 'station',
    tag: 'STATION',
    minDist: 103,
    maxDist: 130,
    peakDist: 114,
    baseScale: { x: 7.5, y: 2.2 },
    color: '#f59e0b',
    pillBg: 'rgba(28, 20, 8, 0.94)',
    badgeBg: '#b45309',
    badgeText: '#fde68a'
  },
  {
    id: 'sec-ratnagiri',
    name: 'Ratnagiri Fishing Base',
    lat: 16.99,
    lon: 73.30,
    level: 4,
    type: 'pfz',
    tag: 'PFZ',
    minDist: 103,
    maxDist: 132,
    peakDist: 114,
    baseScale: { x: 7.8, y: 2.2 },
    color: '#10b981',
    pillBg: 'rgba(5, 24, 18, 0.94)',
    badgeBg: '#059669',
    badgeText: '#a7f3d0'
  },
  {
    id: 'sec-mormugao',
    name: 'Mormugao Anchorage (Goa)',
    lat: 15.41,
    lon: 73.80,
    level: 4,
    type: 'port',
    tag: 'PORT',
    minDist: 103,
    maxDist: 134,
    peakDist: 114,
    baseScale: { x: 8.5, y: 2.2 },
    color: '#818cf8',
    pillBg: 'rgba(16, 14, 38, 0.94)',
    badgeBg: '#4f46e5',
    badgeText: '#c7d2fe'
  },
  {
    id: 'sec-karwar',
    name: 'Karwar Bight Fishery Cell',
    lat: 14.81,
    lon: 74.13,
    level: 4,
    type: 'harbor',
    tag: 'HARBOR',
    minDist: 103,
    maxDist: 132,
    peakDist: 114,
    baseScale: { x: 8.0, y: 2.2 },
    color: '#0284c7',
    pillBg: 'rgba(8, 24, 38, 0.94)',
    badgeBg: '#0369a1',
    badgeText: '#7dd3fc'
  },
  {
    id: 'sec-malpe',
    name: 'Malpe Fishing Harbor',
    lat: 13.35,
    lon: 74.70,
    level: 4,
    type: 'harbor',
    tag: 'HARBOR',
    minDist: 103,
    maxDist: 132,
    peakDist: 114,
    baseScale: { x: 7.6, y: 2.2 },
    color: '#0284c7',
    pillBg: 'rgba(8, 24, 38, 0.94)',
    badgeBg: '#0369a1',
    badgeText: '#7dd3fc'
  },
  {
    id: 'sec-mangalore',
    name: 'Mangalore Old Port Base',
    lat: 12.87,
    lon: 74.84,
    level: 4,
    type: 'port',
    tag: 'PORT',
    minDist: 103,
    maxDist: 134,
    peakDist: 114,
    baseScale: { x: 8.0, y: 2.2 },
    color: '#818cf8',
    pillBg: 'rgba(16, 14, 38, 0.94)',
    badgeBg: '#4f46e5',
    badgeText: '#c7d2fe'
  },
  {
    id: 'sec-kochi',
    name: 'Kochi Port & Bight Sector',
    lat: 9.96,
    lon: 76.24,
    level: 4,
    type: 'harbor',
    tag: 'HARBOR',
    minDist: 103,
    maxDist: 134,
    peakDist: 114,
    baseScale: { x: 8.5, y: 2.2 },
    color: '#0284c7',
    pillBg: 'rgba(8, 24, 38, 0.94)',
    badgeBg: '#0369a1',
    badgeText: '#7dd3fc'
  },
  {
    id: 'sec-neendakara',
    name: 'Neendakara Fishing Harbor',
    lat: 8.93,
    lon: 76.54,
    level: 4,
    type: 'harbor',
    tag: 'HARBOR',
    minDist: 103,
    maxDist: 132,
    peakDist: 114,
    baseScale: { x: 8.2, y: 2.2 },
    color: '#0284c7',
    pillBg: 'rgba(8, 24, 38, 0.94)',
    badgeBg: '#0369a1',
    badgeText: '#7dd3fc'
  },
  {
    id: 'sec-vizhinjam',
    name: 'Vizhinjam Deepwater Port',
    lat: 8.37,
    lon: 76.99,
    level: 4,
    type: 'port',
    tag: 'PORT',
    minDist: 103,
    maxDist: 134,
    peakDist: 114,
    baseScale: { x: 8.2, y: 2.2 },
    color: '#818cf8',
    pillBg: 'rgba(16, 14, 38, 0.94)',
    badgeBg: '#4f46e5',
    badgeText: '#c7d2fe'
  },
  {
    id: 'sec-wadge-local',
    name: 'Wadge Bank Pelagic Fishery',
    lat: 7.80,
    lon: 77.30,
    level: 4,
    type: 'pfz',
    tag: 'PFZ',
    minDist: 103,
    maxDist: 134,
    peakDist: 114,
    baseScale: { x: 8.8, y: 2.2 },
    color: '#10b981',
    pillBg: 'rgba(5, 24, 18, 0.94)',
    badgeBg: '#059669',
    badgeText: '#a7f3d0'
  },
  {
    id: 'sec-kanyakumari',
    name: 'Kanyakumari Marine Cape',
    lat: 8.08,
    lon: 77.55,
    level: 4,
    type: 'station',
    tag: 'CAPE',
    minDist: 103,
    maxDist: 132,
    peakDist: 114,
    baseScale: { x: 8.0, y: 2.2 },
    color: '#f59e0b',
    pillBg: 'rgba(28, 20, 8, 0.94)',
    badgeBg: '#b45309',
    badgeText: '#fde68a'
  },
  {
    id: 'sec-tuticorin',
    name: 'Tuticorin Major Port & Pearl Bank',
    lat: 8.76,
    lon: 78.13,
    level: 4,
    type: 'port',
    tag: 'PORT',
    minDist: 103,
    maxDist: 134,
    peakDist: 114,
    baseScale: { x: 9.5, y: 2.2 },
    color: '#818cf8',
    pillBg: 'rgba(16, 14, 38, 0.94)',
    badgeBg: '#4f46e5',
    badgeText: '#c7d2fe'
  },
  {
    id: 'sec-mandapam',
    name: 'Mandapam Reef Sanctuary',
    lat: 9.28,
    lon: 79.12,
    level: 4,
    type: 'sanctuary',
    tag: 'REEF',
    minDist: 103,
    maxDist: 130,
    peakDist: 114,
    baseScale: { x: 8.0, y: 2.2 },
    color: '#14b8a6',
    pillBg: 'rgba(4, 28, 28, 0.94)',
    badgeBg: '#0f766e',
    badgeText: '#5eead4'
  },
  {
    id: 'sec-cuddalore',
    name: 'Cuddalore Marine Base',
    lat: 11.75,
    lon: 79.77,
    level: 4,
    type: 'pfz',
    tag: 'PFZ',
    minDist: 103,
    maxDist: 132,
    peakDist: 114,
    baseScale: { x: 7.6, y: 2.2 },
    color: '#10b981',
    pillBg: 'rgba(5, 24, 18, 0.94)',
    badgeBg: '#059669',
    badgeText: '#a7f3d0'
  },
  {
    id: 'sec-chennai',
    name: 'Kasimedu Fishing Harbor / Chennai',
    lat: 13.12,
    lon: 80.30,
    level: 4,
    type: 'harbor',
    tag: 'HARBOR',
    minDist: 103,
    maxDist: 134,
    peakDist: 114,
    baseScale: { x: 9.6, y: 2.2 },
    color: '#0284c7',
    pillBg: 'rgba(8, 24, 38, 0.94)',
    badgeBg: '#0369a1',
    badgeText: '#7dd3fc'
  },
  {
    id: 'sec-krishnapatnam',
    name: 'Krishnapatnam Deep Port',
    lat: 14.25,
    lon: 80.12,
    level: 4,
    type: 'port',
    tag: 'PORT',
    minDist: 103,
    maxDist: 132,
    peakDist: 114,
    baseScale: { x: 8.0, y: 2.2 },
    color: '#818cf8',
    pillBg: 'rgba(16, 14, 38, 0.94)',
    badgeBg: '#4f46e5',
    badgeText: '#c7d2fe'
  },
  {
    id: 'sec-machilipatnam',
    name: 'Machilipatnam Coastal Cell',
    lat: 16.18,
    lon: 81.14,
    level: 4,
    type: 'pfz',
    tag: 'PFZ',
    minDist: 103,
    maxDist: 132,
    peakDist: 114,
    baseScale: { x: 8.0, y: 2.2 },
    color: '#10b981',
    pillBg: 'rgba(5, 24, 18, 0.94)',
    badgeBg: '#059669',
    badgeText: '#a7f3d0'
  },
  {
    id: 'sec-kakinada',
    name: 'Kakinada Bay & Godavari Delta',
    lat: 16.98,
    lon: 82.24,
    level: 4,
    type: 'pfz',
    tag: 'PFZ/BAY',
    minDist: 103,
    maxDist: 134,
    peakDist: 114,
    baseScale: { x: 8.8, y: 2.2 },
    color: '#10b981',
    pillBg: 'rgba(5, 24, 18, 0.94)',
    badgeBg: '#059669',
    badgeText: '#a7f3d0'
  },
  {
    id: 'sec-vizag',
    name: 'Visakhapatnam Harbor & Dolphin Bight',
    lat: 17.69,
    lon: 83.30,
    level: 4,
    type: 'harbor',
    tag: 'HARBOR',
    minDist: 103,
    maxDist: 134,
    peakDist: 114,
    baseScale: { x: 9.6, y: 2.2 },
    color: '#0284c7',
    pillBg: 'rgba(8, 24, 38, 0.94)',
    badgeBg: '#0369a1',
    badgeText: '#7dd3fc'
  },
  {
    id: 'sec-gopalpur',
    name: 'Gopalpur Offshore Port',
    lat: 19.26,
    lon: 84.91,
    level: 4,
    type: 'port',
    tag: 'PORT',
    minDist: 103,
    maxDist: 132,
    peakDist: 114,
    baseScale: { x: 7.8, y: 2.2 },
    color: '#818cf8',
    pillBg: 'rgba(16, 14, 38, 0.94)',
    badgeBg: '#4f46e5',
    badgeText: '#c7d2fe'
  },
  {
    id: 'sec-paradip',
    name: 'Paradip Anchorage & Plume',
    lat: 20.26,
    lon: 86.67,
    level: 4,
    type: 'port',
    tag: 'PORT/PLUME',
    minDist: 103,
    maxDist: 134,
    peakDist: 114,
    baseScale: { x: 8.8, y: 2.2 },
    color: '#818cf8',
    pillBg: 'rgba(16, 14, 38, 0.94)',
    badgeBg: '#4f46e5',
    badgeText: '#c7d2fe'
  },
  {
    id: 'sec-dhamra',
    name: 'Dhamra Port Deep Basin',
    lat: 20.80,
    lon: 86.95,
    level: 4,
    type: 'port',
    tag: 'PORT',
    minDist: 103,
    maxDist: 132,
    peakDist: 114,
    baseScale: { x: 7.8, y: 2.2 },
    color: '#818cf8',
    pillBg: 'rgba(16, 14, 38, 0.94)',
    badgeBg: '#4f46e5',
    badgeText: '#c7d2fe'
  },
  {
    id: 'sec-digha',
    name: 'Digha Fishing Harbor',
    lat: 21.63,
    lon: 87.51,
    level: 4,
    type: 'harbor',
    tag: 'HARBOR',
    minDist: 103,
    maxDist: 132,
    peakDist: 114,
    baseScale: { x: 7.6, y: 2.2 },
    color: '#0284c7',
    pillBg: 'rgba(8, 24, 38, 0.94)',
    badgeBg: '#0369a1',
    badgeText: '#7dd3fc'
  },
  {
    id: 'sec-kakdwip',
    name: 'Kakdwip / Sagar Island Plume',
    lat: 21.87,
    lon: 88.19,
    level: 4,
    type: 'pfz',
    tag: 'PFZ/DELTA',
    minDist: 103,
    maxDist: 132,
    peakDist: 114,
    baseScale: { x: 8.5, y: 2.2 },
    color: '#10b981',
    pillBg: 'rgba(5, 24, 18, 0.94)',
    badgeBg: '#059669',
    badgeText: '#a7f3d0'
  },
  {
    id: 'sec-minicoy',
    name: 'Minicoy Atoll Lagoon',
    lat: 8.28,
    lon: 73.05,
    level: 4,
    type: 'atoll',
    tag: 'ATOLL',
    minDist: 103,
    maxDist: 134,
    peakDist: 114,
    baseScale: { x: 7.6, y: 2.2 },
    color: '#14b8a6',
    pillBg: 'rgba(4, 28, 28, 0.94)',
    badgeBg: '#0f766e',
    badgeText: '#5eead4'
  },
  {
    id: 'sec-kavaratti',
    name: 'Kavaratti INCOIS Base',
    lat: 10.56,
    lon: 72.64,
    level: 4,
    type: 'atoll',
    tag: 'ATOLL',
    minDist: 103,
    maxDist: 134,
    peakDist: 114,
    baseScale: { x: 7.8, y: 2.2 },
    color: '#14b8a6',
    pillBg: 'rgba(4, 28, 28, 0.94)',
    badgeBg: '#0f766e',
    badgeText: '#5eead4'
  },
  {
    id: 'sec-agatti',
    name: 'Agatti Oceanic Shelf',
    lat: 10.85,
    lon: 72.18,
    level: 4,
    type: 'atoll',
    tag: 'ATOLL',
    minDist: 103,
    maxDist: 132,
    peakDist: 114,
    baseScale: { x: 7.6, y: 2.2 },
    color: '#14b8a6',
    pillBg: 'rgba(4, 28, 28, 0.94)',
    badgeBg: '#0f766e',
    badgeText: '#5eead4'
  },
  {
    id: 'sec-portblair',
    name: 'Port Blair Basin & Fishery',
    lat: 11.66,
    lon: 92.74,
    level: 4,
    type: 'harbor',
    tag: 'HARBOR',
    minDist: 103,
    maxDist: 134,
    peakDist: 114,
    baseScale: { x: 8.5, y: 2.2 },
    color: '#0284c7',
    pillBg: 'rgba(8, 24, 38, 0.94)',
    badgeBg: '#0369a1',
    badgeText: '#7dd3fc'
  },
  {
    id: 'sec-campbellbay',
    name: 'Campbell Bay (Great Nicobar)',
    lat: 6.99,
    lon: 93.93,
    level: 4,
    type: 'station',
    tag: 'STATION',
    minDist: 103,
    maxDist: 134,
    peakDist: 114,
    baseScale: { x: 8.5, y: 2.2 },
    color: '#f59e0b',
    pillBg: 'rgba(28, 20, 8, 0.94)',
    badgeBg: '#b45309',
    badgeText: '#fde68a'
  }
];

/** Backward compatibility alias */
export const OCEAN_FEATURES = PRECISION_OCEAN_PLACES;

/**
 * Creates 3D Multi-Scale Hierarchical Floating Canvas Sprite Badges for Ocean Geographic Features.
 * Features are organized with Level-of-Detail (LOD) metadata and dynamically expand
 * as the user zooms in towards the Earth surface, replicating the Google Maps zoom experience.
 */
export function createHierarchicalPlaceMeshGroup(options = {}) {
  const globeRadius = options.globeRadius ?? DEFAULT_GLOBE_RADIUS;
  const placeGroup = new THREE.Group();
  placeGroup.name = 'hierarchical-ocean-places';

  PRECISION_OCEAN_PLACES.forEach((place) => {
    // Build crisp high-DPI canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 84;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const x = 10, y = 10, w = 400, h = 64, r = 16;

    // Outer glow / shadow
    ctx.shadowColor = place.color;
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    // Pill background
    ctx.fillStyle = place.pillBg || 'rgba(11, 19, 34, 0.92)';
    ctx.strokeStyle = place.color || '#38bdf8';
    ctx.lineWidth = place.level === 4 ? 2.2 : (place.level === 3 ? 2.5 : 3.0);

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

    // Reset shadow for text rendering
    ctx.shadowBlur = 0;

    // Type Badge Pill
    const tagW = Math.max(68, place.tag.length * 10 + 16);
    ctx.fillStyle = place.badgeBg || '#0369a1';
    ctx.beginPath();
    const bx = 22, by = 22, bh = 40, br = 8;
    ctx.moveTo(bx + br, by);
    ctx.lineTo(bx + tagW - br, by);
    ctx.quadraticCurveTo(bx + tagW, by, bx + tagW, by + br);
    ctx.lineTo(bx + tagW, by + bh - br);
    ctx.quadraticCurveTo(bx + tagW, by + bh, bx + tagW - br, by + bh);
    ctx.lineTo(bx + br, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br);
    ctx.lineTo(bx, by + br);
    ctx.quadraticCurveTo(bx, by, bx + br, by);
    ctx.closePath();
    ctx.fill();

    // Tag text
    ctx.fillStyle = place.badgeText || '#38bdf8';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "SF Mono", "Roboto Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(place.tag, bx + tagW / 2, by + bh / 2);

    // Place Name
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Ellipsize long names if needed
    let displayName = place.name;
    const maxTextW = w - tagW - 40;
    while (ctx.measureText(displayName).width > maxTextW && displayName.length > 3) {
      displayName = displayName.slice(0, -4) + '...';
    }
    ctx.fillText(displayName, bx + tagW + 16, 42);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.90,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(spriteMat);
    const cart = geoToCartesian(place.lat, place.lon, 0, {
      globeRadius: globeRadius * 1.015
    });
    sprite.position.set(cart.x, cart.y, cart.z);
    sprite.scale.set(place.baseScale.x, place.baseScale.y, 1);
    sprite.renderOrder = 20 - place.level; // Lower level (closer) renders on top

    // Attach place metadata directly to sprite for LOD and raycasting
    sprite.userData = {
      ...place,
      isPlaceMarker: true
    };

    placeGroup.add(sprite);
  });

  return placeGroup;
}

/** Backward compatibility alias */
export const createBasinLabelsGroup = createHierarchicalPlaceMeshGroup;

/**
 * Updates dynamic Level-of-Detail (LOD) and Earth horizon occlusion for ocean place labels.
 * Emulates Google Maps place expansion:
 * - When camera is far, macro ocean basins are visible.
 * - As the user zooms in, regional sub-basins appear, followed by coastal shelves,
 *   and finally local fishing harbors and PFZ sectors expand into full view.
 *
 * @param {THREE.Group} placesGroup - Hierarchical place labels group
 * @param {THREE.Camera} camera - Active scene camera
 * @param {number} globeRadius - Earth sphere radius
 */
export function updatePlaceLabelsLOD(placesGroup, camera, globeRadius = DEFAULT_GLOBE_RADIUS) {
  if (!placesGroup || !placesGroup.visible) return;

  const camDist = camera.position.length();
  const worldPos = new THREE.Vector3();

  placesGroup.children.forEach((sprite) => {
    const p = sprite.userData;
    if (!p || !p.isPlaceMarker) return;

    // 1. Earth horizon occlusion check: hide if on the other side of the planet
    sprite.getWorldPosition(worldPos);
    if (isMarkerOccluded(worldPos, camera.position, globeRadius)) {
      sprite.visible = false;
      return;
    }

    // 2. Distance-based LOD range check
    if (camDist < p.minDist || camDist > p.maxDist) {
      sprite.visible = false;
      return;
    }

    sprite.visible = true;

    // 3. Calculate smooth Google Maps-style alpha curve
    let alpha = 1.0;
    if (camDist > p.peakDist) {
      // Fading out towards maxDist (orbit)
      const range = p.maxDist - p.peakDist;
      alpha = range > 0 ? 1.0 - (camDist - p.peakDist) / range : 1.0;
    } else {
      // Fading out towards minDist (surface)
      const range = p.peakDist - p.minDist;
      alpha = range > 0 ? 1.0 - (p.peakDist - camDist) / range : 1.0;
    }
    alpha = THREE.MathUtils.clamp(alpha, 0.0, 1.0);

    // 4. Dynamic scale compensation based on true camera-to-sprite distance
    // In perspective projection, objects enlarge as camera approaches.
    // By scaling directly with (distToCam / 130), labels maintain a balanced, compact chip size
    // on screen, completely preventing them from blowing up into oversized billboards.
    const distToCam = camera.position.distanceTo(worldPos);
    const distFactor = THREE.MathUtils.clamp(distToCam / 130.0, 0.05, 1.2);
    sprite.scale.set(p.baseScale.x * distFactor, p.baseScale.y * distFactor, 1);

    // 5. Close-proximity smooth fade: as the camera approaches within 8 units of the sea surface,
    // gracefully fade out place chips so oceanographers have a 100% unobstructed view of data & probe pin.
    let closeFade = 1.0;
    if (distToCam < 8.0) {
      closeFade = THREE.MathUtils.clamp((distToCam - 2.5) / 5.5, 0.0, 1.0);
    }

    if (sprite.material) {
      sprite.material.opacity = alpha * closeFade * 0.94;
      if (sprite.material.opacity < 0.02) {
        sprite.visible = false;
      }
    }
  });
}

/**
 * Raycasts against visible hierarchical place markers to detect click/hover.
 *
 * @param {THREE.Raycaster} raycaster - Active raycaster
 * @param {THREE.Group} placesGroup - Place mesh group
 * @returns {Object|null} Place metadata if hit, else null
 */
export function raycastPlaceMarker(raycaster, placesGroup) {
  if (!placesGroup || !placesGroup.visible) return null;

  const candidateSprites = placesGroup.children.filter(
    (s) => s.visible && s.material && s.material.opacity > 0.35 && s.userData?.isPlaceMarker
  );

  if (candidateSprites.length === 0) return null;

  const intersects = raycaster.intersectObjects(candidateSprites, false);
  if (intersects.length > 0) {
    return intersects[0].object.userData || null;
  }

  return null;
}

/**
 * Disposes of graticule and label group resources cleanly.
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

