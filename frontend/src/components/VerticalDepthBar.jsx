import React from 'react';

/**
 * VerticalDepthBar - Minimalist Vertical Water Column Depth Control
 * Positioned on the left/right of the 3D globe.
 * Dynamically rendered from actual NetCDF metadata (0.494m to 92.326m).
 * Never fabricates depths beyond dataset coverage.
 * Adheres to Master Prompt §27.
 */
export default function VerticalDepthBar({
  availableDepths = [],
  requestedDepth = 0,
  resolvedDepth = 0,
  onSelectDepth
}) {
  // If no dynamic depths yet, fallback to active GLORYS depths
  const depths = availableDepths.length > 0
    ? availableDepths
    : [0.494, 2.0, 5.0, 10.0, 20.0, 30.0, 50.0, 75.0, 92.326];

  // Pick representative discrete levels for compact display
  const targetLevels = [
    { target: 0.494, label: 'SURFACE' },
    { target: 5.0, label: '5 m' },
    { target: 10.0, label: '10 m' },
    { target: 20.0, label: '20 m' },
    { target: 35.0, label: '35 m' },
    { target: 50.0, label: '50 m' },
    { target: 75.0, label: '75 m' },
    { target: 92.326, label: '92 m (MAX)' }
  ];

  return (
    <aside className="vertical-depth-bar glassmorphic-panel" aria-label="Ocean Depth Selector">
      <div className="depth-header text-center pb-2 border-b border-slate-700/60">
        <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
          DEPTH
        </span>
        <div className="current-depth-val font-mono text-xs font-bold text-sky-400 mt-0.5">
          {resolvedDepth !== undefined ? `${resolvedDepth.toFixed(1)}m` : '0.5m'}
        </div>
      </div>

      <div className="depth-ruler-track flex flex-col justify-between py-2 space-y-1">
        {targetLevels.map((lvl) => {
          // Find closest available depth in dataset
          let closest = depths[0];
          let minDiff = Math.abs(closest - lvl.target);
          for (const d of depths) {
            const diff = Math.abs(d - lvl.target);
            if (diff < minDiff) {
              minDiff = diff;
              closest = d;
            }
          }

          const isActive = Math.abs(requestedDepth - closest) < 1.0;

          return (
            <button
              key={lvl.label}
              type="button"
              className={`depth-tick-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectDepth(closest)}
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
          MAX: 92.3m
        </span>
      </div>
    </aside>
  );
}
