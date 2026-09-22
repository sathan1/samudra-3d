import React from 'react';

/**
 * LocationInspector - Sleek Floating Scientific Coordinate Inspector
 * Appears when user selects/clicks any ocean location on the 3D globe.
 * Adheres to Master Prompt §25.
 */
export default function LocationInspector({
  probedPoint,
  probeData,
  isLoading,
  currentTime,
  activeDatasetName = 'COPERNICUS GLORYS12V1',
  onClose,
  onOpenProfile,
  onOpenComparison,
  onOpenInDepthAnalysis,
  _onFilterNearbyObservations
}) {
  if (!probedPoint) return null;

  const latStr = `${Math.abs(probedPoint.lat).toFixed(3)}° ${probedPoint.lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(probedPoint.lon).toFixed(3)}° ${probedPoint.lon >= 0 ? 'E' : 'W'}`;

  const isUnavailable = probeData?.unavailable || probeData?.error;

  return (
    <div className="location-inspector-card glassmorphic-panel" role="region" aria-label="Location Inspector">
      <div className="inspector-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="live-pulse-dot" aria-hidden="true" />
          <span className="text-xs font-mono font-bold tracking-wider text-ocean-bright uppercase">
            COORDINATE INSPECTOR
          </span>
        </div>
        <button
          type="button"
          className="icon-close-btn"
          onClick={onClose}
          aria-label="Close Location Inspector"
        >
          &times;
        </button>
      </div>

      <div className="inspector-body mt-2">
        <div className="coordinate-display font-mono text-base font-bold text-white tracking-wide">
          {latStr} &nbsp;&bull;&nbsp; {lonStr}
        </div>

        <div className="metadata-badges-row flex flex-wrap gap-2 mt-2">
          <span className="badge-source-copernicus">
            REAL &bull; {activeDatasetName.includes('cmems') || activeDatasetName.includes('glorys') ? 'COPERNICUS' : activeDatasetName}
          </span>
          <span className="badge-resolution font-mono text-xs">
            8.3 km
          </span>
          <span className="badge-time font-mono text-xs">
            {currentTime || '2025-01-04'}
          </span>
        </div>

        {isLoading ? (
          <div className="probe-loading-indicator my-3 flex items-center gap-2 text-xs text-sky-400">
            <span className="spinner-small" aria-hidden="true" />
            <span>Interpolating vertical water column...</span>
          </div>
        ) : isUnavailable ? (
          <div className="probe-unavailable-notice my-3 text-xs text-amber-400 bg-amber-950/40 p-2 rounded border border-amber-800/40">
            <p className="font-semibold">REAL DATA UNAVAILABLE</p>
            <p className="text-[11px] opacity-80 mt-0.5">
              Selected coordinate lies on land or outside the active numerical model domain (0–25°N, 50–100°E).
            </p>
          </div>
        ) : (
          <>
            <div className="data-availability-grid my-3 text-xs font-mono grid grid-cols-2 gap-1.5 bg-slate-900/60 p-2 rounded border border-slate-700/50">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span>&check;</span>
                <span className="text-slate-300">Temperature:</span>
                <span className="text-white font-bold">{probeData?.sst !== undefined && probeData?.sst !== null ? `${probeData.sst.toFixed(2)}°C` : 'avail'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span>&check;</span>
                <span className="text-slate-300">Salinity:</span>
                <span className="text-white font-bold">{probeData?.sss !== undefined && probeData?.sss !== null ? `${probeData.sss.toFixed(2)} PSU` : 'avail'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span>&check;</span>
                <span className="text-slate-300">MLD:</span>
                <span className="text-white font-bold">{probeData?.mld ? `${probeData.mld.toFixed(1)} m` : 'calc'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span>&check;</span>
                <span className="text-slate-300">D20:</span>
                <span className="text-white font-bold">{probeData?.d20 ? `${probeData.d20.toFixed(1)} m` : 'calc'}</span>
              </div>
            </div>

            {probeData?.nearest_observation && (
              <div className="nearest-obs-box my-2 p-2 bg-sky-950/40 border border-sky-800/40 rounded text-xs">
                <div className="text-[10px] text-sky-400 uppercase font-mono tracking-wider">
                  Nearest Collocated Platform
                </div>
                <div className="font-mono font-semibold text-white mt-0.5 flex justify-between items-center">
                  <span>{probeData.nearest_observation.name || probeData.nearest_observation.id}</span>
                  <span className="text-sky-300 font-normal text-[11px]">{probeData.nearest_observation.distance_km?.toFixed(1)} km away</span>
                </div>
              </div>
            )}
          </>
        )}

        <div className="inspector-actions flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            className="action-btn-primary text-xs flex-1"
            onClick={() => onOpenProfile && onOpenProfile(probeData || probedPoint)}
            disabled={isUnavailable}
          >
            CTD PROFILE
          </button>
          <button
            type="button"
            className="action-btn-secondary text-xs flex-1"
            onClick={() => onOpenComparison && onOpenComparison(probeData || probedPoint)}
            disabled={isUnavailable}
          >
            COMPARE MODEL
          </button>
          <button
            type="button"
            className="action-btn-secondary text-xs w-full mt-1"
            onClick={() => onOpenInDepthAnalysis && onOpenInDepthAnalysis(probedPoint)}
            disabled={isUnavailable}
          >
            DEEP OCEAN PHYSICS & SOUND SPEED
          </button>
        </div>
      </div>
    </div>
  );
}
