import React, { useState, useEffect } from 'react';
import ProfileModal from './ProfileModal.jsx';
import { fetchProfileCollocation } from '../services/api.js';

export const BASIN_PRESETS = [
  { name: 'Arabian Sea', lat: 15.0, lon: 68.0, desc: 'Central Basin' },
  { name: 'Bay of Bengal', lat: 14.0, lon: 88.0, desc: 'East Basin' },
  { name: 'Equatorial Basin', lat: 3.0, lon: 78.0, desc: 'South Equator' },
  { name: 'Lakshadweep', lat: 10.5, lon: 72.5, desc: 'West Margin' },
  { name: 'Andaman Sea', lat: 11.5, lon: 93.0, desc: 'East Shelf' }
];

/**
 * ComparisonPanel - Right Slide-Out Inspector Drawer (560-600px)
 * Authority: Master Handbook & HUD UI/UX Overhaul Specifications.
 * Slides out when a point is probed or an in-situ sensor/transect is selected.
 */
export default function ComparisonPanel({
  selectedFloat = null,
  onSelectFloat = null,
  collocation = null,
  probedPoint = null,
  probeData = null,
  isProbeLoading = false,
  onProbePoint = null,
  onCloseDrawer = null,
  activeTransect = null,
  onClearTransect = null,
  showAnomalyField = false,
  onToggleAnomalyField = null,
  anomalyVariable = 'temperature',
  onChangeAnomalyVariable = null,
  anomalyThreshold = 0.5,
  onChangeAnomalyThreshold = null,
  anomalyData = null,
  onSelectAnomalyPoint = null
}) {
  const [internalCollocation, setInternalCollocation] = useState(null);

  useEffect(() => {
    let ignore = false;
    if (selectedFloat) {
      fetchProfileCollocation(selectedFloat.id)
        .then((data) => {
          if (!ignore && data) {
            setInternalCollocation(data);
          }
        })
        .catch((err) => {
          console.warn('ComparisonPanel collocation note:', err.message);
        });
    }
    return () => {
      ignore = true;
    };
  }, [selectedFloat]);

  const activeCollocation = selectedFloat ? (collocation || internalCollocation) : null;
  const tempSummary = activeCollocation?.temperature;
  const alerts = anomalyData?.points?.filter((p) => p.is_alert) || [];
  const unit = anomalyVariable === 'temperature' ? '°C' : 'PSU';

  const isOpen = Boolean(selectedFloat || probedPoint || activeTransect);
  const isOutOfBounds = probedPoint && (
    probedPoint.lat < 0 || probedPoint.lat > 25 || probedPoint.lon < 65 || probedPoint.lon > 95
  );

  return (
    <aside
      className={`panel inspection inspector-drawer ${isOpen ? 'open' : 'collapsed'}`}
      aria-labelledby="inspection-heading"
      data-testid="inspector-drawer"
    >
      <div className="drawer-header flex justify-between items-center py-3 px-4 border-b border-slate-700/60 bg-slate-900/80 sticky top-0 z-20 backdrop-blur">
        <div>
          <span className="eyebrow text-[10px] text-cyan-400">
            {probedPoint ? 'VIRTUAL CTD STATION' : activeTransect ? 'ODV TRANSECT' : selectedFloat ? 'SENSOR INSPECTION' : 'OCEAN DATA NAVIGATOR'}
          </span>
          <h2 id="inspection-heading" className="text-base font-bold text-slate-100 m-0">
            {probedPoint
              ? `Water Column (${probedPoint.lat.toFixed(2)}°N, ${probedPoint.lon.toFixed(2)}°E)`
              : activeTransect
              ? `Vertical Cross-Section (${activeTransect.total_distance_km} km)`
              : selectedFloat?.name || 'Inspection & Collocation'}
          </h2>
        </div>
        <span
          role="button"
          tabIndex={-1}
          onClick={() => {
            onCloseDrawer?.();
            onSelectFloat?.(null);
            onClearTransect?.();
          }}
          className="close-drawer-btn text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition flex items-center gap-1 cursor-pointer select-none"
          aria-label="Close Inspector Drawer"
          data-testid="close-inspector-drawer-btn"
        >
          <span>✕</span>
          <span>Close</span>
        </span>
      </div>

      <div className="drawer-body p-4 space-y-4 overflow-y-auto">
        {/* Standby Location Navigator Card when no point or sensor is probed */}
        {!probedPoint && !selectedFloat && !activeTransect && (
          <section className="location-navigator-standby bg-slate-900/60 border border-slate-700/70 rounded-xl p-3.5 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                <span>📍</span>
                <span>Interactive Location Probe</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">9-Depth Sounding</span>
            </div>
            <p className="text-xs text-slate-300 m-0 leading-relaxed">
              Click anywhere on the 3D Indian Ocean globe to probe vertical water columns (SST, Salinity, MLD, Thermocline D20, and Cyclone Heat Potential across 0–4000m).
            </p>
            <div className="pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Basin Soundings:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {BASIN_PRESETS.map((b) => (
                  <span
                    key={b.name}
                    role="button"
                    tabIndex={-1}
                    onClick={() => onProbePoint?.({ lat: b.lat, lon: b.lon })}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 border border-slate-700 text-[11px] font-medium cursor-pointer transition select-none flex items-center gap-1"
                    title={`Probe ${b.name} (${b.lat}°N, ${b.lon}°E)`}
                  >
                    <span className="text-cyan-400">📍</span>
                    <span>{b.name}</span>
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 1. Probed Point Virtual CTD Section */}
        {probedPoint && (
          <section className="probed-station-section bg-slate-900/60 border border-slate-700/70 rounded-xl p-3.5 space-y-3.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-cyan-300">Virtual CTD Probe Sounding</span>
              {isOutOfBounds ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold">
                  ⚠️ Outside Basin Bounds
                </span>
              ) : probeData?.is_land ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold">
                  ⚠️ Coastal Land Cell
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
                  ✓ Open Ocean Column
                </span>
              )}
            </div>

            {isOutOfBounds ? (
              <div className="space-y-2 text-xs">
                <p className="text-slate-300 m-0">
                  Station coordinates <strong>{probedPoint.lat.toFixed(2)}°N, {probedPoint.lon.toFixed(2)}°E</strong> lie outside the Northern Indian Ocean simulation domain (0°–25°N, 65°–95°E).
                </p>
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Probe Active Regional Basins:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {BASIN_PRESETS.map((b) => (
                      <span
                        key={b.name}
                        role="button"
                        tabIndex={-1}
                        onClick={() => onProbePoint?.({ lat: b.lat, lon: b.lon })}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[11px] font-medium cursor-pointer transition select-none flex items-center gap-1"
                      >
                        <span>📍</span>
                        <span>{b.name}</span>
                        <span className="text-[9.5px] text-slate-400">({b.lat}°N, {b.lon}°E)</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : isProbeLoading ? (
              <div className="py-8 text-center text-slate-400 animate-pulse text-xs">
                ⟳ Slicing 3D water column across all 9 depth levels...
              </div>
            ) : probeData ? (
              <>
                {/* Physical Oceanographic Metrics Grid */}
                <div className="metrics-grid grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="metric-card bg-slate-800/70 border border-slate-700/80 rounded-lg p-2">
                    <span className="text-[10px] text-slate-400 block">SST (Surface Temp)</span>
                    <span className="text-sm font-bold text-amber-300 font-mono">
                      {probeData.sst !== null ? `${probeData.sst}°C` : 'N/A'}
                    </span>
                  </div>
                  <div className="metric-card bg-slate-800/70 border border-slate-700/80 rounded-lg p-2">
                    <span className="text-[10px] text-slate-400 block">SSS (Salinity)</span>
                    <span className="text-sm font-bold text-cyan-300 font-mono">
                      {probeData.sss !== null ? `${probeData.sss} PSU` : 'N/A'}
                    </span>
                  </div>
                  <div className="metric-card bg-slate-800/70 border border-slate-700/80 rounded-lg p-2">
                    <span className="text-[10px] text-slate-400 block">Current Velocity</span>
                    <span className="text-sm font-bold text-teal-300 font-mono">
                      {probeData.surface_current_speed !== null ? `${probeData.surface_current_speed} m/s` : 'N/A'}
                    </span>
                  </div>
                  <div className="metric-card bg-slate-800/70 border border-slate-700/80 rounded-lg p-2">
                    <span className="text-[10px] text-slate-400 block">Mixed Layer Depth (MLD)</span>
                    <span className="text-sm font-bold text-emerald-300 font-mono">
                      {probeData.mld !== null ? `${probeData.mld} m` : 'N/A'}
                    </span>
                  </div>
                  <div className="metric-card bg-slate-800/70 border border-slate-700/80 rounded-lg p-2">
                    <span className="text-[10px] text-slate-400 block">Thermocline (D20)</span>
                    <span className="text-sm font-bold text-sky-300 font-mono">
                      {probeData.d20 !== null ? `${probeData.d20} m` : 'N/A'}
                    </span>
                  </div>
                  <div className="metric-card bg-slate-800/70 border border-slate-700/80 rounded-lg p-2">
                    <span className="text-[10px] text-slate-400 block">TCHP (Cyclone Heat)</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-rose-300 font-mono">
                        {probeData.tchp !== null ? `${probeData.tchp}` : '0'}
                      </span>
                      <span className="text-[9px] text-slate-400">kJ/cm²</span>
                    </div>
                    {probeData.tchp_category && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950/60 text-rose-300 font-semibold inline-block mt-0.5">
                        {probeData.tchp_category} Risk
                      </span>
                    )}
                  </div>
                </div>

                {/* SVG CTD Profile Curves */}
                <div className="ctd-chart-container bg-slate-950/80 border border-slate-800 rounded-lg p-3">
                  <span className="text-[11px] font-bold text-slate-300 block mb-2">
                    Vertical CTD Profile (0m - 4000m Seabed)
                  </span>
                  <div className="h-48 w-full flex items-center justify-center">
                    <svg viewBox="0 0 480 180" className="w-full h-full overflow-visible">
                      {/* Grid Lines */}
                      <line x1="40" y1="20" x2="460" y2="20" stroke="#334155" strokeDasharray="3 3" />
                      <line x1="40" y1="60" x2="460" y2="60" stroke="#334155" strokeDasharray="3 3" />
                      <line x1="40" y1="100" x2="460" y2="100" stroke="#334155" strokeDasharray="3 3" />
                      <line x1="40" y1="150" x2="460" y2="150" stroke="#334155" strokeDasharray="3 3" />

                      {/* Depth Axis Labels (positive down) */}
                      <text x="35" y="24" fill="#94a3b8" fontSize="9" textAnchor="end">0m</text>
                      <text x="35" y="64" fill="#94a3b8" fontSize="9" textAnchor="end">500m</text>
                      <text x="35" y="104" fill="#94a3b8" fontSize="9" textAnchor="end">2000m</text>
                      <text x="35" y="154" fill="#94a3b8" fontSize="9" textAnchor="end">4000m</text>

                      {/* Temperature Profile Line (Orange/Coral) */}
                      {(() => {
                        const depths = probeData.depths || [];
                        const temps = probeData.temperature || [];
                        const points = depths.map((d, i) => {
                          const t = temps[i] ?? 0;
                          // x: temperature map [0°C to 32°C] -> [50, 450]
                          const x = 50 + ((t - 0) / 32) * 400;
                          // y: depth non-linear scale -> [20 to 150]
                          const y = 20 + Math.sqrt(d / 4000) * 130;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        }).join(' ');

                        return (
                          <>
                            <polyline fill="none" stroke="#f59e0b" strokeWidth="2.5" points={points} />
                            {depths.map((d, i) => {
                              const t = temps[i] ?? 0;
                              const x = 50 + ((t - 0) / 32) * 400;
                              const y = 20 + Math.sqrt(d / 4000) * 130;
                              return (
                                <circle key={d} cx={x} cy={y} r="3" fill="#f59e0b" stroke="#0f172a" strokeWidth="1">
                                  <title>{`${d}m: ${t}°C`}</title>
                                </circle>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block" />
                      <span>Temperature (°C)</span>
                    </span>
                    <span>Depth: 0m to 4000m (Non-linear Pycnocline)</span>
                  </div>
                </div>

                {/* Nearest In-Situ Collocation (within 200km) */}
                {probeData.nearest_observation ? (
                  <div className="nearest-obs-card bg-cyan-950/30 border border-cyan-500/30 rounded-lg p-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide">
                          Nearest Collocated Observation Platform
                        </span>
                        <h4 className="text-xs font-bold text-white mt-0.5">
                          {probeData.nearest_observation.name} ({probeData.nearest_observation.platform_type.toUpperCase()})
                        </h4>
                        <p className="text-[11px] text-slate-300 m-0 mt-0.5">
                          Position: {probeData.nearest_observation.lat.toFixed(2)}°N, {probeData.nearest_observation.lon.toFixed(2)}°E ·{' '}
                          <strong className="text-cyan-300">{probeData.nearest_observation.distance_km} km away</strong>
                        </p>
                      </div>
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={() => onSelectFloat?.(probeData.nearest_observation)}
                        className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium cursor-pointer select-none"
                      >
                        Inspect Platform
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded bg-slate-800/40 border border-slate-700/60 text-slate-400 text-[11px]">
                    No in-situ ocean observation platform within 200 km radius.
                  </div>
                )}
              </>
            ) : null}
          </section>
        )}

        {/* 2. ODV Vertical Transect Section */}
        {activeTransect && (
          <section className="transect-section bg-slate-900/60 border border-slate-700/70 rounded-xl p-3.5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-amber-300">ODV Vertical Cross-Section</span>
              <span className="text-[10px] font-mono text-slate-400">
                100 points · {activeTransect.total_distance_km} km
              </span>
            </div>

            {/* Transect Cross-Section SVG Matrix Heatmap */}
            <div className="transect-matrix-chart bg-slate-950 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1.5 px-1">
                <span className="font-mono text-amber-400 font-semibold">{activeTransect.variable.toUpperCase()} ({activeTransect.units})</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                    <span className="text-cyan-300">MLD</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-amber-400 inline-block" />
                    <span className="text-amber-300">D20 Thermocline</span>
                  </span>
                </div>
              </div>

              <svg viewBox="0 0 540 190" className="w-full h-48">
                {/* Depth axis ticks on left (0m, 100m, 500m, 1000m, 2000m, 4000m) */}
                {[
                  { d: 0, k: 0 },
                  { d: 100, k: 3 },
                  { d: 500, k: 5 },
                  { d: 1000, k: 6 },
                  { d: 2000, k: 7 },
                  { d: 4000, k: 8 }
                ].map(({ d, k }) => {
                  const y = 12 + (k / 8) * 150;
                  return (
                    <g key={d}>
                      <text x="38" y={y + 3} fill="#94a3b8" fontSize="8.5" textAnchor="end" fontFamily="monospace">
                        {d}m
                      </text>
                      <line x1="40" y1={y} x2="44" y2={y} stroke="#475569" strokeWidth="1" />
                    </g>
                  );
                })}

                {/* Heatmap cells */}
                {activeTransect.matrix?.map((row, depthIdx) => {
                  const y = 12 + (depthIdx / 9) * 150;
                  const rowHeight = 150 / 9;
                  const minV = activeTransect.min_val ?? 2.0;
                  const maxV = activeTransect.max_val ?? 32.0;
                  const range = Math.max(1e-4, maxV - minV);

                  return (
                    <g key={depthIdx}>
                      {row.map((val, ptIdx) => {
                        const x = 45 + (ptIdx / 100) * 480;
                        const colWidth = 480 / 100 + 0.5;
                        if (val === null || val === undefined) {
                          return <rect key={ptIdx} x={x} y={y} width={colWidth} height={rowHeight} fill="#0f172a" />;
                        }
                        const t = Math.max(0, Math.min(1, (val - minV) / range));
                        const hue = (1.0 - t) * 240;
                        return (
                          <rect
                            key={ptIdx}
                            x={x}
                            y={y}
                            width={colWidth}
                            height={rowHeight}
                            fill={`hsl(${hue}, 85%, 50%)`}
                          >
                            <title>{`Point ${ptIdx + 1}: ${val} ${activeTransect.units}`}</title>
                          </rect>
                        );
                      })}
                    </g>
                  );
                })}

                {/* MLD (Mixed Layer Depth) Profile Curve Overlay */}
                {(() => {
                  if (!activeTransect.mld_profile) return null;
                  const depthsList = activeTransect.depth_levels || [0, 10, 50, 100, 200, 500, 1000, 2000, 4000];
                  let dStr = '';
                  activeTransect.mld_profile.forEach((mld, idx) => {
                    if (mld === null || mld === undefined) return;
                    const x = 45 + (idx / 100) * 480;
                    // Interpolate y in depth grid
                    let k0 = 0;
                    let k1 = 1;
                    for (let k = 0; k < depthsList.length - 1; k++) {
                      if (mld >= depthsList[k] && mld <= depthsList[k + 1]) {
                        k0 = k;
                        k1 = k + 1;
                        break;
                      }
                    }
                    const frac = (depthsList[k1] > depthsList[k0]) ? (mld - depthsList[k0]) / (depthsList[k1] - depthsList[k0]) : 0;
                    const effK = k0 + frac;
                    const y = 12 + (effK / 8) * 150;
                    dStr += dStr === '' ? `M ${x} ${y}` : ` L ${x} ${y}`;
                  });
                  return dStr ? <path d={dStr} fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="3,2" /> : null;
                })()}

                {/* D20 Isotherm Curve Overlay */}
                {(() => {
                  if (!activeTransect.d20_profile) return null;
                  const depthsList = activeTransect.depth_levels || [0, 10, 50, 100, 200, 500, 1000, 2000, 4000];
                  let dStr = '';
                  activeTransect.d20_profile.forEach((d20, idx) => {
                    if (d20 === null || d20 === undefined) return;
                    const x = 45 + (idx / 100) * 480;
                    let k0 = 0;
                    let k1 = 1;
                    for (let k = 0; k < depthsList.length - 1; k++) {
                      if (d20 >= depthsList[k] && d20 <= depthsList[k + 1]) {
                        k0 = k;
                        k1 = k + 1;
                        break;
                      }
                    }
                    const frac = (depthsList[k1] > depthsList[k0]) ? (d20 - depthsList[k0]) / (depthsList[k1] - depthsList[k0]) : 0;
                    const effK = k0 + frac;
                    const y = 12 + (effK / 8) * 150;
                    dStr += dStr === '' ? `M ${x} ${y}` : ` L ${x} ${y}`;
                  });
                  return dStr ? <path d={dStr} fill="none" stroke="#f59e0b" strokeWidth="2" /> : null;
                })()}

                {/* Bottom Distance Axis Line */}
                <line x1="45" y1="164" x2="525" y2="164" stroke="#475569" strokeWidth="1" />
                <text x="45" y="177" fill="#94a3b8" fontSize="8" fontFamily="monospace">0 km</text>
                <text x="285" y="177" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">
                  {Math.round(activeTransect.total_distance_km / 2)} km
                </text>
                <text x="525" y="177" fill="#94a3b8" fontSize="8" textAnchor="end" fontFamily="monospace">
                  {activeTransect.total_distance_km} km
                </text>
              </svg>
              <div className="flex justify-between text-[10px] text-slate-400 px-2 pt-1 border-t border-slate-800">
                <span>Start: ({activeTransect.lat1}°N, {activeTransect.lon1}°E)</span>
                <span>End: ({activeTransect.lat2}°N, {activeTransect.lon2}°E)</span>
              </div>
            </div>
          </section>
        )}

        {/* 3. In-situ Sensor Profile Inspection (ProfileModal) */}
        <div className="selected-sensor-wrapper">
          <ProfileModal
            selectedFloat={selectedFloat}
            onSelectFloat={onSelectFloat}
            collocation={activeCollocation}
          />
        </div>

        {/* 4. Model vs Observation 4D Collocation Summary */}
        <section className="comparison bg-slate-900/60 border border-slate-700/70 rounded-xl p-3.5 space-y-2" aria-labelledby="comparison-heading" data-testid="model-comparison-summary">
          <h3 id="comparison-heading" className="text-xs font-bold text-slate-200 uppercase tracking-wide m-0">
            Model vs Observation
          </h3>
          {selectedFloat && selectedFloat.has_observations === false ? (
            <>
              <span className="subtle-tag" style={{ background: 'var(--field)', color: '#fbbf24', fontWeight: 600 }}>
                Pending Ingestion
              </span>
              <p className="helper text-xs text-slate-400 m-0">
                No observational telemetry ingested for this platform.
              </p>
              <div className="metric-placeholder flex justify-between text-xs py-1 border-b border-slate-800">
                <span>Difference</span>
                <span>No in-situ telemetry</span>
              </div>
              <div className="metric-placeholder flex justify-between text-xs py-1">
                <span>Model health</span>
                <span>Awaiting sensor feed</span>
              </div>
            </>
          ) : selectedFloat && activeCollocation ? (
            <>
              <span className="subtle-tag text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 font-bold inline-block">
                4D Collocation Active
              </span>
              <p className="helper text-[11px] text-slate-400 m-0">
                Live comparison between computer forecast model and real sensor readings at this coordinate.
              </p>
              <div className="metric-placeholder flex justify-between items-center text-xs py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Difference (Bias)</span>
                <strong data-testid="comparison-difference" style={{ color: tempSummary?.bias < 0 ? '#38bdf8' : '#fbbf24' }}>
                  {tempSummary?.bias !== null && tempSummary?.bias !== undefined
                    ? `${tempSummary.bias > 0 ? '+' : ''}${tempSummary.bias}°C (${tempSummary.prediction_tendency})`
                    : 'N/A'}
                </strong>
              </div>
              <div className="metric-placeholder flex justify-between items-center text-xs py-1.5">
                <span className="text-slate-400">Model Health</span>
                <strong
                  data-testid="comparison-health"
                  style={{
                    color: activeCollocation.model_health === 'EXCELLENT' || activeCollocation.model_health === 'GOOD' ? '#34d399' : '#fbbf24'
                  }}
                >
                  {activeCollocation.model_health} (RMSE {tempSummary?.rmse ?? 'N/A'}°C)
                </strong>
              </div>
            </>
          ) : (
            <>
              <span className="subtle-tag text-xs text-slate-500">Not available</span>
              <p className="helper text-xs text-slate-400">Select a sensor or probe a location with nearby observation data to assess model health.</p>
              <div className="metric-placeholder flex justify-between text-xs text-slate-500 py-1">
                <span>Difference</span>
                <span>Not computed</span>
              </div>
              <div className="metric-placeholder flex justify-between text-xs text-slate-500 py-1">
                <span>Model health</span>
                <span>Not assessed</span>
              </div>
            </>
          )}
        </section>

        {/* 5. 3D Difference Field & Anomaly Heatmap Section */}
        <section
          className="anomaly-heatmap-panel bg-slate-900/60 border border-slate-700/70 rounded-xl p-3.5 space-y-2.5"
          aria-labelledby="anomaly-heading"
          data-testid="anomaly-panel-section"
        >
          <div className="flex justify-between items-center">
            <h3 id="anomaly-heading" className="text-xs font-bold text-slate-200 uppercase tracking-wide m-0">
              3D Difference & Anomaly
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
              ANOMALY ENGINE
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              id="toggle-anomaly-layer"
              data-testid="anomaly-toggle"
              type="checkbox"
              checked={showAnomalyField}
              onChange={(e) => onToggleAnomalyField?.(e.target.checked)}
              className="accent-cyan-400"
            />
            <span className={showAnomalyField ? 'font-semibold text-cyan-300' : 'text-slate-300'}>
              Show 3D residual anomaly layer
            </span>
          </label>

          {showAnomalyField && (
            <div className="space-y-2 pt-1 border-t border-slate-800 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Variable:</span>
                <select
                  id="anomaly-variable-select"
                  data-testid="anomaly-variable-select"
                  value={anomalyVariable}
                  onChange={(e) => onChangeAnomalyVariable?.(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 rounded p-1 text-xs"
                >
                  <option value="temperature">Temperature (°C)</option>
                  <option value="salinity">Salinity (PSU)</option>
                </select>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Threshold:</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {anomalyThreshold} {unit}
                </span>
              </div>
              <input
                id="anomaly-threshold-slider"
                data-testid="anomaly-threshold-slider"
                type="range"
                min={anomalyVariable === 'temperature' ? '0.1' : '0.02'}
                max={anomalyVariable === 'temperature' ? '3.0' : '1.0'}
                step={anomalyVariable === 'temperature' ? '0.1' : '0.02'}
                value={anomalyThreshold}
                onChange={(e) => onChangeAnomalyThreshold?.(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
              />

              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-800">
                <span data-testid="anomaly-coverage-count" className="text-slate-400 text-[10px]">
                  Coverage: {anomalyData?.total_valid_pairs ?? 0} valid pairs ({anomalyData?.platform_count ?? 0} platforms)
                </span>
                <span
                  data-testid="anomaly-alert-count"
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    alerts.length > 0 ? 'bg-red-950/60 border border-red-500/40 text-red-400' : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400'
                  }`}
                >
                  {alerts.length} discrepancy alert{alerts.length === 1 ? '' : 's'}
                </span>
              </div>

              <p className="helper text-[10px] text-slate-400 m-0 leading-tight">
                Sparse observations: residuals shown only at directly measured locations. No interpolation beyond source collocation ({anomalyData?.support_radius_km ?? 55}km support). No-data regions exist.
              </p>

              {alerts.length > 0 ? (
                <div
                  data-testid="anomaly-alert-list"
                  className="space-y-1 max-h-36 overflow-y-auto mt-1"
                >
                  {alerts.slice(0, 10).map((pt, idx) => (
                    <div
                      key={`${pt.platform_id}-${pt.depth}-${idx}`}
                      data-testid="anomaly-alert-item"
                      onClick={() => onSelectAnomalyPoint?.(pt)}
                      className="p-1.5 rounded bg-red-950/20 border border-red-500/30 text-[10px] cursor-pointer hover:bg-red-950/40 transition"
                      title="Click to inspect source platform in ProfileModal"
                    >
                      <div className="flex justify-between items-center">
                        <strong className="text-slate-200">{pt.platform_id}</strong>
                        <span className={`font-mono font-bold ${pt.delta < 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
                          Δ = {pt.delta > 0 ? `+${pt.delta}` : pt.delta}{unit}
                        </span>
                      </div>
                      <div className="text-slate-400 flex justify-between text-[9.5px]">
                        <span>Model-observation discrepancy</span>
                        <span>{pt.depth}m</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 text-center m-0 pt-1">
                  No residuals exceed {anomalyThreshold} {unit}.
                </p>
              )}
            </div>
          )}
        </section>

        <details className="availability mt-2.5 text-xs text-slate-400">
          <summary className="cursor-pointer font-semibold text-slate-300 hover:text-white">
            What is available now?
          </summary>
          <p className="mt-1 leading-relaxed">
            Provides automated 3D difference field rendering, diverging residual palettes, configurable threshold alerts, sparse coverage reporting, and traceable observation inspection.
          </p>
        </details>
      </div>
    </aside>
  );
}
