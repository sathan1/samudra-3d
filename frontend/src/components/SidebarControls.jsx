import React, { useState } from 'react';
import {
  formatTimeLabel,
  SPEED_PRESETS,
  getIntervalForSpeed,
  TOTAL_FORECAST_STEPS
} from '../utils/timeAnimation.js';

export const DISCRETE_DEPTH_CHIPS = [
  { depth: 0, label: '0m Surface' },
  { depth: 50, label: '50m Mixed Layer' },
  { depth: 100, label: '100m Thermocline' },
  { depth: 500, label: '500m Intermediate' },
  { depth: 1000, label: '1000m Deep' },
  { depth: 2000, label: '2000m Abyssal' },
  { depth: 4000, label: '4000m Seabed' }
];

/**
 * SidebarControls - Modern Left Floating HUD Controls
 * Combines full Playwright specification compliance (12 form controls inside aside)
 * with sleek floating HUD glassmorphism and discrete depth chips.
 */
export default function SidebarControls({
  selectedVariable = 'temperature',
  onSelectVariable = null,
  requestedDepth = 0,
  onSelectDepth = null,
  resolvedDepth = 0,
  timeIndex = 0,
  onSelectTime = null,
  isPlaying = false,
  onTogglePlay = null,
  onStepBack = null,
  onStepForward = null,
  playbackSpeed = 1.0,
  onChangeSpeed = null,
  isLooping = true,
  onToggleLoop = null,
  totalTimeSteps = TOTAL_FORECAST_STEPS,
  currentTimeTimestamp = null,
  isBuffering = false,
  showCurrents = false,
  onToggleCurrents = null,
  showArgo = false,
  onToggleArgo = null,
  argoFloats = [],
  selectedFloatId = null,
  onSelectFloatId = null,
  showGliders = false,
  onToggleGliders = null,
  gliderTransects = [],
  selectedGliderId = null,
  onSelectGliderId = null,
  isClickToProbeActive = false,
  onToggleClickToProbe = null,
  onTriggerSampleTransect = null
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`panel controls floating-hud controls-hud ${isCollapsed ? 'collapsed-hud' : ''}`}
      aria-labelledby="controls-heading"
    >
      <div className="panel-heading flex justify-between items-center py-2.5 px-3.5 border-b border-slate-700/60 bg-slate-900/80">
        <div>
          <span className="eyebrow text-[10px] text-slate-400 font-mono tracking-wider">OCEANOGRAPHIC CONTROLS</span>
          <h2 id="controls-heading" className="text-sm font-bold text-slate-100 m-0">Indian Ocean Basin</h2>
        </div>
        <span
          role="button"
          tabIndex={-1}
          className="collapse-btn text-xs px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Ocean Controls' : 'Collapse Ocean Controls'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? 'Show ▸' : 'Hide ◂'}
        </span>
      </div>

      {!isCollapsed && (
        <div className="hud-content p-3 space-y-3 text-xs">
          {/* Section 1: Ocean Variable & Inspection Tools */}
          <div className="control-card bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2">
            <div className="tool-modes flex gap-2">
              <span
                role="button"
                tabIndex={-1}
                className={`flex-1 py-1 px-2 rounded font-medium border text-xs flex items-center justify-center gap-1.5 transition cursor-pointer select-none ${
                  isClickToProbeActive
                    ? 'bg-sky-600 border-sky-500 text-white font-semibold'
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                }`}
                onClick={() => onToggleClickToProbe?.(!isClickToProbeActive)}
                title="Click anywhere on ocean canvas to drop a 3D CTD probe"
                data-testid="toggle-click-to-probe-btn"
              >
                <span>{isClickToProbeActive ? 'Probing Active' : 'Point Probe'}</span>
              </span>
              <span
                role="button"
                tabIndex={-1}
                className="flex-1 py-1 px-2 rounded font-medium border text-xs flex items-center justify-center gap-1.5 bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300 transition cursor-pointer select-none"
                onClick={() => onTriggerSampleTransect?.()}
                title="Draw / Load ODV vertical transect slice"
                data-testid="load-transect-btn"
              >
                <span>ODV Transect</span>
              </span>
            </div>

            <div>
              <label htmlFor="variable" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Ocean Parameter
              </label>
              <div className="variable-pills grid grid-cols-3 gap-1 mb-1.5">
                <span
                  role="button"
                  tabIndex={-1}
                  className={`py-1 px-1 rounded text-[11px] font-medium border text-center transition cursor-pointer select-none ${
                    selectedVariable === 'temperature'
                      ? 'bg-sky-600 border-sky-500 text-white font-semibold'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                  onClick={() => onSelectVariable?.('temperature')}
                >
                  Temp (°C)
                </span>
                <span
                  role="button"
                  tabIndex={-1}
                  className={`py-1 px-1 rounded text-[11px] font-medium border text-center transition cursor-pointer select-none ${
                    selectedVariable === 'salinity'
                      ? 'bg-sky-600 border-sky-500 text-white font-semibold'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                  onClick={() => onSelectVariable?.('salinity')}
                >
                  Salinity (PSU)
                </span>
                <span
                  role="button"
                  tabIndex={-1}
                  className={`py-1 px-1 rounded text-[11px] font-medium border text-center transition cursor-pointer select-none ${
                    selectedVariable === 'currents'
                      ? 'bg-sky-600 border-sky-500 text-white font-semibold'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                  onClick={() => onSelectVariable?.('currents')}
                >
                  Currents (m/s)
                </span>
              </div>
              {/* Native select control for full accessibility and automated test harness */}
              <select
                id="variable"
                value={selectedVariable}
                onChange={(e) => onSelectVariable?.(e.target.value)}
                aria-describedby="variable-help"
                className="w-full text-xs p-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100"
              >
                <option value="temperature">Potential Temperature (°C)</option>
                <option value="salinity">Practical Salinity (PSU)</option>
                <option value="currents">Ocean Currents (m/s)</option>
              </select>
              <p id="variable-help" className="helper text-[11px] text-slate-400 mt-1 mb-0">
                Select temperature or salinity for scalar contours, or currents for vector streamlines.
              </p>
            </div>
          </div>

          {/* Section 2: Discrete Depth Chips & Slicer */}
          <div className="control-card bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2">
            <div className="flex justify-between items-baseline mb-1">
              <label htmlFor="depth" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Vertical Depth
              </label>
              <span className="font-mono text-xs text-sky-400 font-semibold" data-testid="depth-value-display">
                {requestedDepth === 0 ? 'Surface (0 m)' : `${requestedDepth} m`}
              </span>
            </div>

            {/* Discrete Depth Chips Requirement */}
            <div className="depth-chips-grid grid grid-cols-2 gap-1.5 mb-1.5">
              {DISCRETE_DEPTH_CHIPS.map((chip) => {
                const isSelected = Math.abs(requestedDepth - chip.depth) < 25;
                return (
                  <span
                    key={chip.depth}
                    role="button"
                    tabIndex={-1}
                    className={`depth-chip px-2 py-1 rounded text-[10.5px] font-mono border text-center transition cursor-pointer select-none ${
                      isSelected
                        ? 'bg-sky-600 border-sky-500 text-white font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                    onClick={() => onSelectDepth?.(chip.depth)}
                    title={`Snap to ${chip.label}`}
                  >
                    {chip.label}
                  </span>
                );
              })}
            </div>

            {/* Fine Depth Range Slider */}
            <input
              id="depth"
              type="range"
              min="0"
              max="4000"
              step="5"
              value={requestedDepth}
              onChange={(e) => onSelectDepth?.(parseFloat(e.target.value))}
              aria-describedby="depth-help"
              list="depth-levels"
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <datalist id="depth-levels">
              <option value="0" label="Surface"></option>
              <option value="50"></option>
              <option value="100" label="Thermocline"></option>
              <option value="200"></option>
              <option value="500"></option>
              <option value="1000"></option>
              <option value="2000"></option>
              <option value="4000" label="Abyss"></option>
            </datalist>
            <div className="range-labels flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>0m (Surface)</span>
              <span>100m (Thermocline)</span>
              <span>4000m (Abyss)</span>
            </div>
            <p id="depth-help" className="helper text-[11px] text-slate-400 mt-1 mb-0">
              {resolvedDepth !== null && resolvedDepth !== requestedDepth
                ? `Requested ${requestedDepth} m (snapped to ${resolvedDepth} m model level).`
                : requestedDepth === 0
                ? 'Surface ocean layer (0 m). Slide or use arrow keys to slice subsurface levels to 4,000 m.'
                : `Subsurface model layer (${resolvedDepth ?? requestedDepth} m).`}
            </p>
          </div>

          {/* Section 3: Forecast Simulation */}
          <div className="control-card bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2">
            <div className="flex justify-between items-baseline mb-1">
              <label htmlFor="time" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Forecast Simulation
              </label>
              <span className="font-mono text-xs text-sky-400 font-semibold" data-testid="time-value-display">
                {formatTimeLabel(currentTimeTimestamp, timeIndex)}
              </span>
            </div>
            <input
              id="time"
              type="range"
              min="0"
              max={Math.max(0, totalTimeSteps - 1)}
              step="1"
              value={timeIndex}
              onChange={(e) => onSelectTime?.(parseInt(e.target.value, 10))}
              aria-describedby="time-help"
              list="time-ticks"
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer mb-2"
            />
            <datalist id="time-ticks">
              <option value="0" label="T+00h"></option>
              <option value="1" label="T+06h"></option>
              <option value="2" label="T+12h"></option>
              <option value="3" label="T+18h"></option>
              <option value="4" label="T+24h"></option>
              <option value="5" label="T+30h"></option>
              <option value="6" label="T+36h"></option>
              <option value="7" label="T+42h"></option>
            </datalist>
            <div className="range-labels flex justify-between text-[10px] text-slate-400 font-mono mb-2">
              <span>T+00h (0h)</span>
              <span>Step {timeIndex + 1} / {totalTimeSteps}</span>
              <span>T+42h (48h forecast)</span>
            </div>

            {/* Playback Controls Toolbar */}
            <div className="playback-toolbar flex items-center justify-between gap-1.5 pt-1">
              <div className="flex items-center gap-1">
                <button
                  id="time-step-back"
                  type="button"
                  onClick={onStepBack}
                  aria-label="Step backward"
                  title="Step backward 6 hours"
                  disabled={totalTimeSteps <= 1}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs"
                >
                  ◂ 6h
                </button>
                <button
                  id="time-play-pause"
                  type="button"
                  onClick={onTogglePlay}
                  aria-label={isPlaying ? 'Pause forecast playback' : 'Play forecast playback'}
                  data-testid="play-pause-btn"
                  disabled={totalTimeSteps <= 1}
                  style={{ fontWeight: 600, minWidth: '65px' }}
                  className={`px-3 py-1 rounded border text-xs font-semibold flex items-center justify-center gap-1 ${
                    isPlaying
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-sky-600 border-sky-500 text-white'
                  }`}
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  id="time-step-forward"
                  type="button"
                  onClick={onStepForward}
                  aria-label="Step forward"
                  title="Step forward 6 hours"
                  disabled={totalTimeSteps <= 1}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs"
                >
                  6h ▸
                </button>
              </div>

              <div className="flex items-center gap-1">
                <label htmlFor="time-speed" className="text-[11px] text-slate-400 m-0">
                  Speed:
                </label>
                <select
                  id="time-speed"
                  value={playbackSpeed}
                  onChange={(e) => onChangeSpeed?.(parseFloat(e.target.value))}
                  aria-label="Playback speed"
                  className="bg-slate-950 border border-slate-700 rounded p-1 text-[11px] text-slate-200"
                >
                  {SPEED_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <label
                htmlFor="time-loop"
                className="inline-flex items-center gap-1 cursor-pointer text-[11px] text-slate-300 select-none"
              >
                <input
                  id="time-loop"
                  type="checkbox"
                  checked={isLooping}
                  onChange={(e) => onToggleLoop?.(e.target.checked)}
                  className="accent-sky-500"
                />
                <span>Loop</span>
              </label>
            </div>

            <p id="time-help" className="helper text-[11px] text-slate-400 mt-2 mb-0">
              {isBuffering
                ? 'Buffering time slice from model server...'
                : isPlaying
                ? `Playing at ${playbackSpeed}× (${getIntervalForSpeed(playbackSpeed)}ms interval). ${isLooping ? 'Continuous loop.' : 'Pauses at T+42h.'}`
                : 'Interactive 48h forecast simulation. Play or scrub 6-hour intervals across Indian Ocean.'}
            </p>
          </div>

          {/* Section 4: In-situ Observation Fleet & Layers */}
          <fieldset className="control-card bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2" aria-describedby="layers-help">
            <legend className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
              Observation Fleet & Layers
            </legend>
            <div className="space-y-1.5">
              <label className="flex items-center justify-between p-1 rounded text-slate-400">
                <div className="flex items-center gap-2">
                  <input type="checkbox" disabled />
                  <span>Numerical model</span>
                </div>
                <span className="layer-state text-[10px] font-mono text-slate-500">Base layer</span>
              </label>

              <label htmlFor="layer-argo" className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <input
                    id="layer-argo"
                    type="checkbox"
                    checked={showArgo}
                    onChange={(e) => onToggleArgo?.(e.target.checked)}
                    data-testid="argo-floats-toggle"
                    className="accent-sky-500"
                  />
                  <span className="text-slate-200 font-medium">Argo Profile Floats</span>
                </div>
                <span
                  className="layer-state text-[10px] font-mono"
                  style={{ color: showArgo ? '#38bdf8' : '#94a3b8', fontWeight: showArgo ? 600 : 'normal' }}
                  data-testid="argo-layer-state"
                >
                  {showArgo ? `Active (${argoFloats.length} floats)` : 'Off'}
                </span>
              </label>

              {showArgo && argoFloats.length > 0 && (
                <div className="pl-5 pb-1">
                  <select
                    id="argo-float-select"
                    value={selectedFloatId || ''}
                    onChange={(e) => onSelectFloatId?.(e.target.value || null)}
                    className="w-full text-[11px] p-1 bg-slate-950 border border-slate-700 rounded text-slate-200"
                    data-testid="argo-float-select"
                  >
                    <option value="">-- Choose Argo Float --</option>
                    {argoFloats.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.wmo_id ? `WMO ${f.wmo_id}` : f.id}: {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <label htmlFor="layer-glider" className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <input
                    id="layer-glider"
                    type="checkbox"
                    checked={showGliders}
                    onChange={(e) => onToggleGliders?.(e.target.checked)}
                    data-testid="glider-layer-toggle"
                    className="accent-sky-500"
                  />
                  <span className="text-slate-200 font-medium">Underwater Gliders</span>
                </div>
                <span className="layer-state text-[10px] font-mono text-slate-400" data-testid="glider-layer-state">
                  {showGliders ? `Active (${gliderTransects.length} missions)` : 'Off'}
                </span>
              </label>

              {showGliders && gliderTransects.length > 0 && (
                <div className="pl-5 pb-1">
                  <select
                    id="glider-transect-select"
                    data-testid="glider-transect-select"
                    value={selectedGliderId || ''}
                    onChange={(e) => onSelectGliderId?.(e.target.value || null)}
                    className="w-full text-[11px] p-1 bg-slate-950 border border-slate-700 rounded text-slate-200"
                  >
                    <option value="">-- Choose Glider Mission --</option>
                    {gliderTransects.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.id}: {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <label htmlFor="layer-currents" className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <input
                    id="layer-currents"
                    type="checkbox"
                    checked={showCurrents}
                    onChange={(e) => onToggleCurrents?.(e.target.checked)}
                    data-testid="current-streamlines-toggle"
                    className="accent-sky-500"
                  />
                  <span className="text-slate-200 font-medium">Current Streamlines</span>
                </div>
                <span
                  className="layer-state text-[10px] font-mono"
                  style={{ color: showCurrents ? '#38bdf8' : '#94a3b8', fontWeight: showCurrents ? 600 : 'normal' }}
                  data-testid="currents-layer-state"
                >
                  {showCurrents ? 'Active (1,500 particles)' : 'Off'}
                </span>
              </label>
            </div>
            <p id="layers-help" className="helper text-[11px] text-slate-400 mt-2 mb-0">
              Continuous numerical streamlines and calibrated in-situ observation telemetry.
            </p>
          </fieldset>
        </div>
      )}
    </aside>
  );
}
