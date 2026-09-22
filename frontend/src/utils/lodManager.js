/**
 * SAMUDRA-3D Level-of-Detail (LOD) Manager
 * Provides 6-tier continuous LOD calculation based on camera distance and altitude.
 * 
 * Hierarchy:
 * LOD 0: GLOBAL      (Coastlines, major bathymetry, broad ocean visualization)
 * LOD 1: BASIN       (Coarse model representation, major currents, broad scalar field)
 * LOD 2: REGIONAL    (Requested variable, time, depth, regional grid)
 * LOD 3: LOCAL       (High-resolution regional subset, observations, profile availability)
 * LOD 4: POINT       (Exact point value, vertical profile, nearest observations)
 * LOD 5: OBSERVATION (Complete profile, QC, model comparison, anomaly, metadata)
 */

export const LOD_TIERS = {
  0: {
    level: 0,
    id: 'GLOBAL',
    name: 'Global Overview',
    resolution: 'Broad Scale (~25 km)',
    maxDistance: 450,
    minDistance: 280,
    features: ['bathymetry', 'coastlines', 'graticules']
  },
  1: {
    level: 1,
    id: 'BASIN',
    name: 'Ocean Basin',
    resolution: 'Basin Scale (~15 km)',
    maxDistance: 280,
    minDistance: 190,
    features: ['major_currents', 'basin_labels', 'scalar_field']
  },
  2: {
    level: 2,
    id: 'REGIONAL',
    name: 'Regional Grid',
    resolution: '8.3 km (Native Model)',
    maxDistance: 190,
    minDistance: 130,
    features: ['regional_grid', 'depth_contours', 'platform_clusters']
  },
  3: {
    level: 3,
    id: 'LOCAL',
    name: 'Local Sector',
    resolution: '8.3 km (High Precision)',
    maxDistance: 130,
    minDistance: 80,
    features: ['individual_platforms', 'detailed_currents', 'subsurface_probes']
  },
  4: {
    level: 4,
    id: 'POINT',
    name: 'Point Probe',
    resolution: 'Exact Coordinate Interp',
    maxDistance: 80,
    minDistance: 35,
    features: ['vertical_column', 'point_provenance', 'nearest_collocation']
  },
  5: {
    level: 5,
    id: 'OBSERVATION',
    name: 'Platform Inspection',
    resolution: 'In-Situ Profile',
    maxDistance: 35,
    minDistance: 0,
    features: ['full_profile', 'qc_flags', 'model_comparison', 't_s_diagram']
  }
};

/**
 * Calculates the current LOD tier based on camera distance from the globe center.
 * Default globe radius is 100.
 */
export function calculateLOD(cameraDistance) {
  if (cameraDistance >= 280) {
    return LOD_TIERS[0];
  } else if (cameraDistance >= 190) {
    return LOD_TIERS[1];
  } else if (cameraDistance >= 130) {
    return LOD_TIERS[2];
  } else if (cameraDistance >= 80) {
    return LOD_TIERS[3];
  } else if (cameraDistance >= 35) {
    return LOD_TIERS[4];
  } else {
    return LOD_TIERS[5];
  }
}

/**
 * Generates an unobtrusive scientific status badge string and object.
 */
export function getLODStatusBadge(lodTier, datasetId = 'COPERNICUS GLORYS12V1', timestamp = '2025-01-04') {
  const sourceName = datasetId.includes('cmems') || datasetId.includes('glorys') || datasetId.includes('COPERNICUS')
    ? 'COPERNICUS GLORYS12V1'
    : datasetId;

  return {
    resolution: lodTier.resolution,
    source: sourceName,
    time: timestamp,
    lodName: lodTier.name,
    level: lodTier.level
  };
}
