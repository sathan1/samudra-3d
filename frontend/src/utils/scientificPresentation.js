/**
 * scientificPresentation.js
 *
 * Shared presentation utilities for scientific dataset provenance,
 * numerical metric formatting (preserving finite zero vs missing),
 * and operational descriptors.
 *
 * Adheres to Core Phase 03 & Bounded Corrections:
 * - Reconciles with backend SourceMode (REAL_LOCAL, SYNTHETIC, REMOTE_LIVE, REMOTE_CHUNKED).
 * - Distinguishes remote catalog descriptors from confirmed live feeds (REMOTE (UNCONFIRMED) vs REMOTE LIVE).
 * - Preserves provided product/provider names without changing every Copernicus product to GLORYS12V1.
 * - Enforces finite-number checks (0.0 is valid, null/NaN is Unavailable).
 * - Detects dataset identity mismatches between probe responses and active dataset.
 * - Prevents unsupported live or official bulletin claims for fixture/model data.
 */

export function isFiniteNumber(val) {
  return typeof val === 'number' && Number.isFinite(val);
}

export function formatMetric(val, { unit = '', decimals = 1, fallback = 'Unavailable' } = {}) {
  if (!isFiniteNumber(val)) return fallback;
  const numStr = val.toFixed(decimals);
  return unit ? `${numStr} ${unit}` : numStr;
}

export function resolveSourceMode(mode, { status = null, isLiveConfirmed = false } = {}) {
  if (!mode || typeof mode !== 'string') return 'UNKNOWN';
  const upper = mode.toUpperCase().trim();

  if (upper === 'REAL_LOCAL' || upper === 'REAL') {
    return 'REAL';
  }

  if (upper === 'SYNTHETIC' || upper === 'DEMO') {
    return 'SYNTHETIC';
  }

  if (upper === 'REMOTE_LIVE') {
    const s = typeof status === 'string' ? status.toUpperCase().trim() : '';
    if (s === 'UNAVAILABLE' || s === 'OFFLINE' || s === 'ERROR') {
      return 'REMOTE (UNAVAILABLE)';
    }
    if (isLiveConfirmed || s === 'CONNECTED_LIVE' || s === 'LIVE_CONFIRMED') {
      return 'REMOTE LIVE';
    }
    // A remote catalog entry alone must not become a confirmed live feed
    return 'REMOTE (UNCONFIRMED)';
  }

  if (upper === 'REMOTE_CHUNKED') {
    const s = typeof status === 'string' ? status.toUpperCase().trim() : '';
    if (s === 'UNAVAILABLE' || s === 'OFFLINE' || s === 'ERROR') {
      return 'REMOTE (UNAVAILABLE)';
    }
    return 'REMOTE CHUNKED';
  }

  if (upper === 'UNAVAILABLE_REMOTE') {
    return 'UNAVAILABLE REMOTE';
  }

  if (upper === 'UNKNOWN') {
    return 'UNKNOWN';
  }

  return upper;
}

export function extractResolutionLabel(dataset, response) {
  // Response resolution takes priority over dataset descriptor
  const candidate = response?.resolution
    || response?.spatial_resolution
    || dataset?.resolution
    || dataset?.spatial_resolution
    || (isFiniteNumber(dataset?.resolution_km) ? `~${dataset.resolution_km} km` : null)
    || (isFiniteNumber(dataset?.spatial_resolution_km) ? `~${dataset.spatial_resolution_km} km` : null);

  if (!candidate || typeof candidate !== 'string' || !candidate.trim()) {
    return 'Unknown resolution';
  }

  const str = candidate.trim();
  // If resolution contains km like "0.083° (~8.3 km)", extract "8.3 km" or "~8.3 km"
  const kmMatch = str.match(/~?\s*(\d+(?:\.\d+)?)\s*km/i);
  if (kmMatch) {
    return `${kmMatch[1]} km`;
  }
  const degMatch = str.match(/(\d+(?:\.\d+)?)\s*°/);
  if (degMatch) {
    return `${degMatch[1]}°`;
  }
  return str;
}

export function getDatasetProvenance({ activeDataset, probeData, metadata } = {}) {
  const datasetId = activeDataset?.dataset_id || metadata?.dataset_id || null;
  const probeDatasetId = probeData?.dataset_id || null;

  // Detect conflict between response identity and active descriptor
  const isMismatch = Boolean(datasetId && probeDatasetId && datasetId !== probeDatasetId);

  if (isMismatch) {
    return {
      sourceMode: 'MISMATCH',
      sourceModeLabel: 'DATASET MISMATCH',
      provider: 'Inconsistent Dataset Response',
      resolution: 'Unavailable',
      isMismatch: true,
      badgeText: 'DATASET MISMATCH • Inconsistent'
    };
  }

  // Derive source mode with priority on response provenance over descriptor
  const rawMode = probeData?.source_mode
    || activeDataset?.source_mode
    || metadata?.source_mode
    || (activeDataset?.synthetic === true || metadata?.synthetic === true ? 'SYNTHETIC' : null)
    || (activeDataset?.synthetic === false || metadata?.synthetic === false ? 'REAL_LOCAL' : null)
    || null;

  const status = probeData?.status || activeDataset?.status || metadata?.status || null;
  const isLiveConfirmed = Boolean(probeData?.is_live_confirmed || activeDataset?.is_live_confirmed);

  const sourceModeLabel = resolveSourceMode(rawMode, { status, isLiveConfirmed });

  // Derive source / provider / product: preserve actual supplied identity without rewriting
  let provider = probeData?.source
    || probeData?.product_name
    || activeDataset?.name
    || activeDataset?.provider
    || metadata?.name
    || metadata?.source
    || metadata?.institution
    || metadata?.provider
    || null;

  if (!provider || !provider.trim()) {
    provider = sourceModeLabel === 'UNKNOWN' ? 'Unknown Source' : 'Unspecified Provider';
  } else {
    provider = provider.trim();
  }

  // Derive resolution with priority on response resolution
  const resolution = extractResolutionLabel(activeDataset || metadata, probeData);

  const resolutionStr = (resolution && resolution !== 'Unknown resolution') ? ` (${resolution})` : '';
  const badgeText = `${sourceModeLabel} • ${provider}${resolutionStr}`;

  return {
    sourceMode: rawMode || 'UNKNOWN',
    sourceModeLabel,
    provider,
    resolution,
    isMismatch: false,
    badgeText
  };
}
