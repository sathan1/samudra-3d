/**
 * SAMUDRA-3D API Client Service
 * Connects frontend to the FastAPI backend service layer.
 */

const API_BASE = (
  typeof window !== 'undefined' && (window.location.hostname.endsWith('.vercel.app') || window.location.hostname.includes('trycloudflare.com'))
    ? '/api'
    : (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api')
);

/**
 * Checks backend health and dataset readiness.
 */
export async function fetchHealth(signal = null) {
  const res = await fetch(`${API_BASE}/health`, { signal });
  if (!res.ok) {
    throw new Error(`Health check failed: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Retrieves CF metadata, available variables, depth levels, and forecast time steps.
 */
export async function fetchMetadata(signal = null) {
  const res = await fetch(`${API_BASE}/metadata`, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch ocean metadata: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Slices 2D ocean field by variable, time index, depth, and optional bounding box.
 */
export async function fetchOceanData({
  variable = 'temperature',
  time_idx = 0,
  depth = 0,
  lat_min = null,
  lat_max = null,
  lon_min = null,
  lon_max = null,
  signal = null
} = {}) {
  const params = new URLSearchParams();
  params.set('variable', variable);
  params.set('time_idx', String(time_idx));
  params.set('depth', String(depth));

  if (lat_min !== null) params.set('lat_min', String(lat_min));
  if (lat_max !== null) params.set('lat_max', String(lat_max));
  if (lon_min !== null) params.set('lon_min', String(lon_min));
  if (lon_max !== null) params.set('lon_max', String(lon_max));

  const res = await fetch(`${API_BASE}/ocean-data?${params.toString()}`, { signal });
  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {
      // ignore json parse error on response
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

/**
 * Retrieves in-situ observation profiles (Argo floats and Glider transects).
 */
export async function fetchInsituProfiles(signal = null) {
  const res = await fetch(`${API_BASE}/insitu/profiles`, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch in-situ profiles: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Retrieves Argo float profiles list.
 */
export async function fetchArgoFloats({ qc_filter = false, source_mode = null, signal = null } = {}) {
  const params = new URLSearchParams();
  if (qc_filter) params.set('qc_filter', 'true');
  if (source_mode) params.set('source_mode', source_mode);

  const qs = params.toString();
  const url = `${API_BASE}/insitu/argo${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch Argo floats: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Retrieves single detailed Argo float profile by ID.
 */
export async function fetchArgoFloatById(floatId, signal = null) {
  const res = await fetch(`${API_BASE}/insitu/argo/${encodeURIComponent(floatId)}`, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch Argo float ${floatId}: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Retrieves in-situ ingestion status and ERDDAP telemetry.
 */
export async function fetchInsituStatus(signal = null) {
  const res = await fetch(`${API_BASE}/insitu/status`, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch in-situ status: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Retrieves underwater glider mission transects.
 */
export async function fetchGliderTransects({ qc_filter = false, source_mode = null, signal = null } = {}) {
  const params = new URLSearchParams();
  if (qc_filter) params.set('qc_filter', 'true');
  if (source_mode) params.set('source_mode', source_mode);

  const qs = params.toString();
  const url = `${API_BASE}/insitu/gliders${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch glider transects: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Retrieves detailed glider mission transect by ID (with 3D waypoints).
 */
export async function fetchGliderById(gliderId, signal = null) {
  const res = await fetch(`${API_BASE}/insitu/gliders/${encodeURIComponent(gliderId)}`, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch glider ${gliderId}: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Retrieves co-located 4D model profile and bias analytics for a given sensor profile.
 */
export async function fetchProfileCollocation(profileId, { time_strategy = 'linear', signal = null } = {}) {
  const url = `${API_BASE}/collocation/profile/${encodeURIComponent(profileId)}?time_strategy=${encodeURIComponent(time_strategy)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch collocation for profile ${profileId}: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Retrieves co-located 4D model metrics for all waypoints of a glider mission.
 */
export async function fetchGliderCollocation(gliderId, signal = null) {
  const url = `${API_BASE}/collocation/glider/${encodeURIComponent(gliderId)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch collocation for glider ${gliderId}: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Retrieves collocation engine health and domain verification status.
 */
export async function fetchCollocationHealth(signal = null) {
  const url = `${API_BASE}/collocation/health`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch collocation health: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Retrieves sparse 3D residual/anomaly field across all platforms.
 */
export async function fetchAnomalyField({
  variable = 'temperature',
  threshold = null,
  depth_min = 0,
  depth_max = 4000,
  signal = null
} = {}) {
  const params = new URLSearchParams();
  if (variable) params.set('variable', variable);
  if (threshold !== null && threshold !== undefined) params.set('threshold', threshold);
  if (depth_min !== undefined) params.set('depth_min', depth_min);
  if (depth_max !== undefined) params.set('depth_max', depth_max);

  const url = `${API_BASE}/anomaly/field?${params.toString()}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch anomaly field: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Retrieves cross-variable anomaly summary and coverage metadata.
 */
export async function fetchAnomalySummary(signal = null) {
  const url = `${API_BASE}/anomaly/summary`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch anomaly summary: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Submits a bounded natural language or scientific query to the AI Ocean Assistant.
 */
export async function queryAssistant(query, context = {}, signal = null) {
  const url = `${API_BASE}/assistant/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, context }),
    signal
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Assistant query failed: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Retrieves pre-canned scientific query presets for the AI Assistant.
 */
export async function fetchAssistantPresets(signal = null) {
  const url = `${API_BASE}/assistant/presets`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch assistant presets: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Authenticates officer credentials against MoES/INCOIS personnel records.
 */
export async function loginUser({ username, password }, signal = null) {
  const url = `${API_BASE}/auth/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    signal
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Authentication failed: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Validates active session token and returns officer profile and capabilities.
 */
export async function fetchCurrentUser(token, signal = null) {
  const url = `${API_BASE}/auth/me`;
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers, signal });
  if (!res.ok) {
    throw new Error(`Failed to verify session: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Revokes active session token and signs officer out.
 */
export async function logoutUser(token, signal = null) {
  const url = `${API_BASE}/auth/logout`;
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { method: 'POST', headers, signal });
  if (!res.ok) {
    throw new Error(`Logout failed: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Retrieves operational persona presets for single-click executive briefing.
 */
export async function fetchAuthPersonas(signal = null) {
  const url = `${API_BASE}/auth/personas`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch personas: HTTP ${res.status}`);
  }
  return res.json();
}
