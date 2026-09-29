import React from 'react';
import { isFiniteNumber, getDatasetProvenance } from '../utils/scientificPresentation.js';

/**
 * LocationInspector - Sleek Floating Scientific Coordinate Inspector
 * Appears when user selects/clicks any ocean location on the 3D globe.
 * Adheres to Master Prompt §25 and Core Phase 03.
 */
export default function LocationInspector({
  probedPoint,
  probeData,
  isLoading,
  currentTime,
  activeDataset = null,
  _activeDatasetName = 'COPERNICUS GLORYS12V1',
  onClose,
  onOpenProfile,
  onOpenComparison,
  onOpenInDepthAnalysis,
  _onFilterNearbyObservations
}) {
  if (!probedPoint) return null;

  const latStr = `${Math.abs(probedPoint.lat).toFixed(3)}° ${probedPoint.lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(probedPoint.lon).toFixed(3)}° ${probedPoint.lon >= 0 ? 'E' : 'W'}`;

  const isUnavailable = Boolean(probeData?.unavailable || probeData?.error || probeData?.is_land);
  const provenance = getDatasetProvenance({ activeDataset, probeData });

  const hasSst = isFiniteNumber(probeData?.sst);
  const hasSss = isFiniteNumber(probeData?.sss);
  const hasMld = isFiniteNumber(probeData?.mld);
  const hasD20 = isFiniteNumber(probeData?.d20);

  return (
    <div className="location-inspector-card glassmorphic-panel" role="region" aria-label="Location Inspector">
      <div className="inspector-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inspector-pulse-dot" aria-hidden="true" />
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
          <span className="badge-source-copernicus" data-testid="inspector-source-badge">
            {provenance.sourceModeLabel} &bull; {provenance.provider}
          </span>
          <span className="badge-resolution font-mono text-xs" data-testid="inspector-resolution-badge">
            {provenance.resolution}
          </span>
          <span className="badge-time font-mono text-xs" data-testid="inspector-time-badge">
            {probeData?.timestamp || currentTime || 'Timestamp unavailable'}
          </span>
        </div>

        {isLoading ? (
          <div className="probe-loading-indicator my-3 flex items-center gap-2 text-xs text-sky-400">
            <span className="spinner-small" aria-hidden="true" />
            <span>Interpolating vertical water column...</span>
          </div>
        ) : isUnavailable ? (
          <div className="probe-unavailable-notice my-3 text-xs text-amber-400 bg-amber-950/40 p-2 rounded border border-amber-800/40">
            <p className="font-semibold">{probeData?.is_land ? 'LAND TERRAIN DETECTED' : 'REAL DATA UNAVAILABLE'}</p>
            <p className="text-[11px] opacity-80 mt-0.5">
              {probeData?.is_land
                ? 'Selected coordinate lies on land. Numerical ocean model column is not defined over land terrain.'
                : (probeData?.error || 'Selected coordinate lies outside active numerical model domain.')}
            </p>
          </div>
        ) : (
          <>
            <div className="data-availability-grid my-3 text-xs font-mono grid grid-cols-2 gap-1.5 bg-slate-900/60 p-2 rounded border border-slate-700/50">
              <div className={`flex items-center gap-1.5 ${hasSst ? 'text-emerald-400' : 'text-slate-400'}`} data-testid="metric-temperature">
                {hasSst ? <span className="metric-valid-icon">&check;</span> : <span className="metric-missing-dash text-slate-500">&mdash;</span>}
                <span className="text-slate-300">Temperature:</span>
                <span className={`font-bold ${hasSst ? 'text-white' : 'text-slate-400'}`}>
                  {hasSst ? `${probeData.sst.toFixed(2)}°C` : 'Unavailable'}
                </span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasSss ? 'text-emerald-400' : 'text-slate-400'}`} data-testid="metric-salinity">
                {hasSss ? <span className="metric-valid-icon">&check;</span> : <span className="metric-missing-dash text-slate-500">&mdash;</span>}
                <span className="text-slate-300">Salinity:</span>
                <span className={`font-bold ${hasSss ? 'text-white' : 'text-slate-400'}`}>
                  {hasSss ? `${probeData.sss.toFixed(2)} PSU` : 'Unavailable'}
                </span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasMld ? 'text-emerald-400' : 'text-slate-400'}`} data-testid="metric-mld">
                {hasMld ? <span className="metric-valid-icon">&check;</span> : <span className="metric-missing-dash text-slate-500">&mdash;</span>}
                <span className="text-slate-300">MLD:</span>
                <span className={`font-bold ${hasMld ? 'text-white' : 'text-slate-400'}`}>
                  {hasMld ? `${probeData.mld.toFixed(1)} m` : 'Unavailable'}
                </span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasD20 ? 'text-emerald-400' : 'text-slate-400'}`} data-testid="metric-d20">
                {hasD20 ? <span className="metric-valid-icon">&check;</span> : <span className="metric-missing-dash text-slate-500">&mdash;</span>}
                <span className="text-slate-300">D20:</span>
                <span className={`font-bold ${hasD20 ? 'text-white' : 'text-slate-400'}`}>
                  {hasD20 ? `${probeData.d20.toFixed(1)} m` : 'Unavailable'}
                </span>
              </div>
            </div>

            {probeData?.nearest_observation ? (
              <div className="nearest-obs-box my-2 p-2 bg-sky-950/40 border border-sky-800/40 rounded text-xs">
                <div className="text-[10px] text-sky-400 uppercase font-mono tracking-wider">
                  Nearest Collocated Platform
                </div>
                <div className="font-mono font-semibold text-white mt-0.5 flex justify-between items-center">
                  <span>{probeData.nearest_observation.name || probeData.nearest_observation.id}</span>
                  <span className="text-sky-300 font-normal text-[11px]">{probeData.nearest_observation.distance_km?.toFixed(1)} km away</span>
                </div>
              </div>
            ) : (
              <div className="my-2 p-1.5 bg-slate-900/40 border border-slate-700/40 rounded text-[11px] text-slate-400 text-center">
                No in-situ platform within collocation range (200 km)
              </div>
            )}
          </>
        )}

        <div className="inspector-actions flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            className="action-btn-primary text-xs flex-1"
            onClick={() => onOpenProfile && onOpenProfile(probeData || probedPoint)}
            disabled={isLoading}
          >
            CTD PROFILE
          </button>
          <button
            type="button"
            className="action-btn-secondary text-xs flex-1"
            onClick={() => onOpenComparison && onOpenComparison(probeData || probedPoint)}
            disabled={isLoading}
          >
            COMPARE MODEL
          </button>
          <button
            type="button"
            data-testid="open-indepth-analysis-btn"
            className="action-btn-secondary text-xs w-full mt-1"
            onClick={() => onOpenInDepthAnalysis && onOpenInDepthAnalysis(probedPoint)}
          >
            DEEP OCEAN PHYSICS & SOUND SPEED
          </button>
        </div>
      </div>
    </div>
  );
}
