import {
  formatTimeLabel,
  SPEED_PRESETS,
  getIntervalForSpeed,
  TOTAL_FORECAST_STEPS
} from '../utils/timeAnimation.js';

/**
 * SidebarControls - Ocean Configuration Sidebar
 * Phase 6 enables variable selection (Temperature / Salinity).
 * Phase 7 enables depth slicing (0m to 4,000m).
 * Phase 8 enables 48h forecast time animation playback controls.
 * Overlay layers and AI Assistant remain reserved for Phases 9-15.
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
  onSelectGliderId = null
}) {
  return (
    <aside className="panel controls" aria-labelledby="controls-heading">
      <div className="panel-heading">
        <span className="eyebrow">CONFIGURE VIEW</span>
        <h2 id="controls-heading">Ocean controls</h2>
      </div>

      <details className="quick-start" open>
        <summary>New here? Follow these three steps</summary>
        <ol>
          <li>Choose temperature or salinity.</li>
          <li>Set the depth and forecast time.</li>
          <li>Turn on an observation layer, then select a marker on the globe.</li>
        </ol>
      </details>

      <div className="control-group">
        <label htmlFor="variable">Ocean variable</label>
        <select
          id="variable"
          value={selectedVariable}
          onChange={(e) => onSelectVariable?.(e.target.value)}
          aria-describedby="variable-help"
        >
          <option value="temperature">Potential Temperature (°C)</option>
          <option value="salinity">Practical Salinity (PSU)</option>
        </select>
        <p id="variable-help" className="helper">
          {selectedVariable === 'salinity'
            ? 'cmocean haline palette active (Practical Salinity Scale, PSU).'
            : 'cmocean thermal palette active (Potential Temperature, °C).'}
        </p>
      </div>

      <div className="control-group">
        <div className="flex justify-between items-baseline mb-1">
          <label htmlFor="depth">Depth slice</label>
          <span className="font-mono text-xs text-[var(--accent)] font-semibold" data-testid="depth-value-display">
            {requestedDepth === 0 ? 'Surface (0 m)' : `${requestedDepth} m`}
          </span>
        </div>
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
        <div className="range-labels">
          <span>Surface (0 m)</span>
          <span>4,000 m</span>
        </div>
        <p id="depth-help" className="helper">
          {resolvedDepth !== null && resolvedDepth !== requestedDepth
            ? `Requested ${requestedDepth} m (snapped to ${resolvedDepth} m model level).`
            : requestedDepth === 0
            ? 'Surface ocean layer (0 m). Slide or use arrow keys to slice subsurface levels to 4,000 m.'
            : `Subsurface model layer (${resolvedDepth ?? requestedDepth} m).`}
        </p>
      </div>

      <div className="control-group">
        <div className="flex justify-between items-baseline mb-1">
          <label htmlFor="time">Forecast time</label>
          <span className="font-mono text-xs text-[var(--accent)] font-semibold" data-testid="time-value-display">
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
        <div className="range-labels">
          <span>T+00h (0h)</span>
          <span>T+42h (48h forecast)</span>
        </div>

        <div className="time-controls" style={{ marginTop: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              id="time-step-back"
              type="button"
              onClick={onStepBack}
              aria-label="Step backward"
              title="Step backward 6 hours"
              disabled={totalTimeSteps <= 1}
            >
              ⏮
            </button>
            <button
              id="time-play-pause"
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pause forecast playback' : 'Play forecast playback'}
              data-testid="play-pause-btn"
              disabled={totalTimeSteps <= 1}
              style={{ fontWeight: 600, minWidth: '65px' }}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              id="time-step-forward"
              type="button"
              onClick={onStepForward}
              aria-label="Step forward"
              title="Step forward 6 hours"
              disabled={totalTimeSteps <= 1}
            >
              ⏭
            </button>
          </div>

          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <label htmlFor="time-speed" style={{ fontSize: '11px', width: 'auto', fontWeight: 'normal' }}>Speed:</label>
            <select
              id="time-speed"
              value={playbackSpeed}
              onChange={(e) => onChangeSpeed?.(parseFloat(e.target.value))}
              aria-label="Playback speed"
              style={{ width: 'auto', margin: 0, padding: '4px 6px', fontSize: '11px' }}
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
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px', width: 'auto', fontWeight: 'normal', userSelect: 'none' }}
          >
            <input
              id="time-loop"
              type="checkbox"
              checked={isLooping}
              onChange={(e) => onToggleLoop?.(e.target.checked)}
              style={{ margin: 0, width: '13px', height: '13px' }}
            />
            <span>Loop</span>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '6px', borderTop: '1px solid var(--border)', fontSize: '10px', fontFamily: 'Consolas, monospace', color: 'var(--muted)' }}>
          <span style={{ padding: '2px 4px', borderRadius: '4px', background: 'var(--field)', color: 'var(--accent)', fontWeight: 600 }}>
            FORECAST PLAYBACK (SIMULATION)
          </span>
          <span>Step {timeIndex + 1} / {totalTimeSteps}</span>
        </div>

        <p id="time-help" className="helper" style={{ marginTop: '8px' }}>
          {isBuffering
            ? 'Buffering time slice from model server...'
            : isPlaying
            ? `Playing at ${playbackSpeed}× (${getIntervalForSpeed(playbackSpeed)}ms interval). ${isLooping ? 'Continuous loop.' : 'Pauses at T+42h.'}`
            : 'Interactive 48h forecast simulation. Play or scrub 6-hour intervals across Indian Ocean.'}
        </p>
      </div>

      <fieldset className="control-group layers" aria-describedby="layers-help">
        <legend>Overlay layers</legend>
        <label>
          <input type="checkbox" disabled />
          <span>Numerical model</span>
          <span className="layer-state">Base layer</span>
        </label>
        <label htmlFor="layer-argo" style={{ cursor: 'pointer' }}>
          <input
            id="layer-argo"
            type="checkbox"
            checked={showArgo}
            onChange={(e) => onToggleArgo?.(e.target.checked)}
            aria-describedby="layers-help"
            data-testid="argo-floats-toggle"
          />
          <span>Argo floats</span>
          <span
            className="layer-state"
            style={{ color: showArgo ? 'var(--accent)' : 'var(--muted)', fontWeight: showArgo ? 600 : 'normal' }}
            data-testid="argo-layer-state"
          >
            {showArgo ? `Active (${argoFloats.length} floats)` : 'Off'}
          </span>
        </label>
        {showArgo && argoFloats.length > 0 && (
          <div style={{ marginTop: '6px', marginBottom: '8px', padding: '6px 8px', background: 'var(--field)', borderRadius: '4px' }}>
            <label htmlFor="argo-float-select" style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
              Select float (keyboard):
            </label>
            <select
              id="argo-float-select"
              value={selectedFloatId || ''}
              onChange={(e) => onSelectFloatId?.(e.target.value || null)}
              style={{ width: '100%', fontSize: '11px', padding: '3px 6px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '3px' }}
              data-testid="argo-float-select"
            >
              <option value="">-- No float selected --</option>
              {argoFloats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.wmo_id ? `WMO ${f.wmo_id}` : f.id}: {f.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <label htmlFor="layer-glider" style={{ cursor: 'pointer' }}>
          <input
            id="layer-glider"
            type="checkbox"
            checked={showGliders}
            onChange={(e) => onToggleGliders?.(e.target.checked)}
            aria-describedby="layers-help"
            data-testid="glider-layer-toggle"
          />
          <span>Underwater gliders</span>
          <span className="layer-state" data-testid="glider-layer-state">
            {showGliders ? `Active (${gliderTransects.length} missions)` : 'Off'}
          </span>
        </label>
        {showGliders && gliderTransects.length > 0 && (
          <div style={{ padding: '4px 0 8px 16px', fontSize: '11px' }}>
            <label htmlFor="glider-transect-select" style={{ display: 'block', color: 'var(--muted)', marginBottom: '2px' }}>
              Select glider (keyboard):
            </label>
            <select
              id="glider-transect-select"
              data-testid="glider-transect-select"
              value={selectedGliderId || ''}
              onChange={(e) => onSelectGliderId?.(e.target.value || null)}
              style={{
                width: '100%',
                padding: '3px 6px',
                fontSize: '11px',
                background: 'var(--field)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '4px'
              }}
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
        <label htmlFor="layer-currents" style={{ cursor: 'pointer' }}>
          <input
            id="layer-currents"
            type="checkbox"
            checked={showCurrents}
            onChange={(e) => onToggleCurrents?.(e.target.checked)}
            aria-describedby="layers-help"
            data-testid="current-streamlines-toggle"
          />
          <span>Current streamlines</span>
          <span
            className="layer-state"
            style={{ color: showCurrents ? 'var(--accent)' : 'var(--muted)', fontWeight: showCurrents ? 600 : 'normal' }}
            data-testid="currents-layer-state"
          >
            {showCurrents ? 'Active (1,500 particles)' : 'Off'}
          </span>
        </label>
        <p id="layers-help" className="helper">
          Model current streamlines and packaged sample observation markers for this interactive demo.
        </p>
      </fieldset>
    </aside>
  );
}
