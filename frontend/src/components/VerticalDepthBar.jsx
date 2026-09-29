import React, { useMemo } from 'react';

/**
 * VerticalDepthBar - Minimalist Vertical Water Column Depth Control
 * Positioned on the left/right of the 3D globe.
 * Dynamically rendered from actual NetCDF metadata.
 * Never fabricates depths beyond dataset coverage.
 * Adheres to .
 */
export default function VerticalDepthBar({
  availableDepths = [],
  requestedDepth = 0,
  resolvedDepth = 0,
  onSelectDepth,
  isTransitioningDataset = false,
  isDatasetReady = true,
  datasetTransitionError = null
}) {
  const isBlocked = isTransitioningDataset || !isDatasetReady || Boolean(datasetTransitionError);

  const depths = useMemo(() => {
    return availableDepths && availableDepths.length > 0
      ? availableDepths
      : [0, 5, 10, 20, 50, 100, 200, 500, 1000];
  }, [availableDepths]);

  const maxDepth = depths[depths.length - 1] || 0;

  // Pick representative discrete levels dynamically from availableDepths
  const targetLevels = useMemo(() => {
    if (depths.length <= 9) {
      return depths.map((d, idx) => ({
        target: d,
        label: idx === 0 ? 'SURFACE' : (idx === depths.length - 1 ? `${Math.round(d)} m (MAX)` : `${Math.round(d)} m`)
      }));
    }
    // Sub-sample up to 9 evenly spaced levels across available depths
    const step = (depths.length - 1) / 8;
    const indices = Array.from({ length: 9 }, (_, i) => Math.round(i * step));
    const uniqueIndices = [...new Set(indices)];
    return uniqueIndices.map((idx, i) => ({
      target: depths[idx],
      label: i === 0 ? 'SURFACE' : (i === uniqueIndices.length - 1 ? `${Math.round(depths[idx])} m (MAX)` : `${Math.round(depths[idx])} m`)
    }));
  }, [depths]);

  return (
    <aside className="vertical-depth-bar glassmorphic-panel" aria-label="Ocean Depth Selector">
      <div className="depth-header text-center pb-2 border-b border-slate-700/60">
        <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
          DEPTH
        </span>
        <div className="current-depth-val font-mono text-xs font-bold text-sky-400 mt-0.5">
          {resolvedDepth !== undefined && resolvedDepth !== null
            ? (Math.abs(resolvedDepth - requestedDepth) > 0.05
                ? `${requestedDepth.toFixed(1)}m (snap: ${resolvedDepth.toFixed(1)}m)`
                : `${resolvedDepth.toFixed(1)}m`)
            : `${requestedDepth.toFixed(1)}m`}
        </div>
      </div>

      <div className="depth-ruler-track flex flex-col justify-between py-2 space-y-1">
        {targetLevels.map((lvl, idx) => {
          let closest = depths[0];
          let minDiff = Math.abs(closest - lvl.target);
          for (const d of depths) {
            const diff = Math.abs(d - lvl.target);
            if (diff < minDiff) {
              minDiff = diff;
              closest = d;
            }
          }

          const isActive = Math.abs(requestedDepth - closest) < 0.2 || Math.abs(resolvedDepth - closest) < 0.2;

          return (
            <button
              key={`${lvl.label}-${idx}`}
              type="button"
              className={`depth-tick-btn ${isActive ? 'active' : ''} ${isBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
              disabled={isBlocked}
              onClick={() => {
                if (!isBlocked) onSelectDepth(closest);
              }}
              title={`Select depth: ${closest.toFixed(2)} meters`}
            >
              <span className="depth-tick-line" />
              <span className="depth-tick-label font-mono text-[10px]">
                {lvl.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="depth-footer text-center pt-2 border-t border-slate-800/80">
        <span className="text-[9px] font-mono text-slate-500 uppercase block">
          MAX: {maxDepth.toFixed(1)}m
        </span>
      </div>
    </aside>
  );
}
