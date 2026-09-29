import React from 'react';

/**
 * BottomControlBar - Professional Floating Scientific Dock
 * Houses the primary Ocean Variable Selector and Continuous Forecast Timeline.
 * Adheres to Master Prompt §2, §26, §28.
 */
export default function BottomControlBar({
  selectedVariable,
  onSelectVariable,
  timeIndex,
  onSelectTime,
  isPlaying,
  onTogglePlay,
  onStepBack,
  onStepForward,
  playbackSpeed,
  onChangeSpeed,
  availableTimes = [],
  availableVariables = [],
  currentTimeTimestamp,
  isTransitioningDataset = false,
  isDatasetReady = true,
  datasetTransitionError = null,
  showCurrents: _showCurrents,
  onToggleCurrents: _onToggleCurrents,
  showObservations,
  onToggleObservations,
  showAnomalies,
  onToggleAnomalies
}) {
  const variables = [
    { id: 'temperature', label: 'TEMP', unit: '°C', desc: 'Sea Water Potential Temperature' },
    { id: 'salinity', label: 'SALINITY', unit: 'PSU', desc: 'Practical Salinity' },
    { id: 'currents', label: 'CURRENTS', unit: 'm/s', desc: 'Horizontal Velocity Vector Field' }
  ];

  const isBlocked = isTransitioningDataset || !isDatasetReady || Boolean(datasetTransitionError);

  const isVarSupported = (varId) => {
    if (isBlocked) return false;
    if (!availableVariables || availableVariables.length === 0) return true;
    const lower = availableVariables.map((v) => v.toLowerCase());
    if (varId === 'temperature') {
      return lower.some((v) => ['temperature', 'thetao', 'temp', 'sst', 'votemper'].includes(v));
    }
    if (varId === 'salinity') {
      return lower.some((v) => ['salinity', 'so', 'salt', 'vosaline'].includes(v));
    }
    if (varId === 'currents') {
      return lower.some((v) => ['currents', 'uo', 'vo', 'u', 'v', 'vozocrtx', 'vomecrty'].includes(v));
    }
    return lower.includes(varId.toLowerCase());
  };

  // Map available times to clean Day labels (e.g. "Jan 01", "Jan 02")
  const displayDays = availableTimes && availableTimes.length > 0
    ? availableTimes.map((t, idx) => {
        try {
          const d = new Date(t);
          return {
            index: idx,
            label: isNaN(d.getTime()) ? `T+${idx}` : d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
            iso: t
          };
        } catch {
          return { index: idx, label: `Day ${idx + 1}`, iso: t };
        }
      })
    : [{ index: 0, label: 'Step 1', iso: null }];

  return (
    <div className="bottom-control-dock glassmorphic-panel" role="region" aria-label="Variable and Timeline Controls">
      {/* Top Row: Variable and Layer Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Ocean Variables">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mr-1">
            VARIABLE:
          </span>
          {variables.map((v) => {
            const isActive = selectedVariable === v.id;
            const supported = isVarSupported(v.id);
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                disabled={!supported || isBlocked}
                title={supported ? `${v.desc} (${v.unit})` : `${v.label} is not available in the active dataset`}
                className={`variable-tab-btn ${isActive ? 'active' : ''} ${!supported || isBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (supported && !isBlocked) onSelectVariable(v.id);
                }}
              >
                <span className="font-bold">{v.label}</span>
                <span className="text-[10px] opacity-75 ml-1">({v.unit})</span>
                {!supported && <span className="text-[9px] ml-1 text-slate-500 font-mono">[N/A]</span>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`layer-toggle-btn ${showObservations ? 'active' : ''}`}
            onClick={onToggleObservations}
            title="Toggle Argo, Gliders and Buoys fleet overlay"
          >
            <span className="dot" aria-hidden="true" />
            <span>OBSERVATIONS</span>
          </button>
          <button
            type="button"
            className={`layer-toggle-btn ${showAnomalies ? 'active' : ''}`}
            onClick={onToggleAnomalies}
            title="Toggle Model vs Observation Anomaly Residual Field"
          >
            <span className="dot anomaly" aria-hidden="true" />
            <span>ANOMALIES</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Scientific Timeline Scrub Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="timeline-ctrl-btn"
            onClick={onStepBack}
            disabled={isBlocked}
            aria-label="Previous Forecast Step"
            title="Step Back"
          >
            &lsaquo;
          </button>
          <button
            type="button"
            className="timeline-play-btn"
            onClick={onTogglePlay}
            disabled={isBlocked}
            aria-label={isPlaying ? 'Pause Forecast Animation' : 'Play Forecast Animation'}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <button
            type="button"
            className="timeline-ctrl-btn"
            onClick={onStepForward}
            disabled={isBlocked}
            aria-label="Next Forecast Step"
            title="Step Forward"
          >
            &rsaquo;
          </button>
        </div>

        {/* Timeline Day Markers */}
        <div className="flex-1 flex items-center justify-between gap-1 overflow-x-auto px-2">
          {displayDays.map((d) => {
            const isCurrent = timeIndex === d.index;
            return (
              <button
                key={d.index}
                type="button"
                className={`timeline-step-chip ${isCurrent ? 'active' : ''}`}
                disabled={isBlocked}
                onClick={() => {
                  if (!isBlocked) onSelectTime(d.index);
                }}
              >
                <span className="step-indicator" />
                <span className="step-label font-mono">{d.label}</span>
              </button>
            );
          })}
        </div>

        {/* Playback Speed & Current Timestamp */}
        <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-1 bg-slate-900/60 px-2 py-1 rounded border border-slate-700/60">
            <span className="text-[10px] text-slate-500">SPEED:</span>
            {[0.5, 1.0, 2.0].map((s) => (
              <button
                key={s}
                type="button"
                className={`speed-chip ${playbackSpeed === s ? 'active' : ''}`}
                disabled={isBlocked}
                onClick={() => onChangeSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>

          <div className="current-timestamp-badge font-mono text-sky-300 bg-sky-950/60 px-2.5 py-1 rounded border border-sky-800/60" data-testid="current-time-badge">
            {datasetTransitionError ? (
              <span className="text-rose-400 font-bold">DATASET ERROR</span>
            ) : isBlocked ? (
              <span className="text-amber-400">SYNCING DATASET...</span>
            ) : availableTimes && availableTimes[timeIndex] ? (
              availableTimes[timeIndex].includes('T') ? availableTimes[timeIndex].replace('T', ' ').slice(0, 16) + ' UTC' : availableTimes[timeIndex]
            ) : currentTimeTimestamp ? (
              currentTimeTimestamp.includes('T') ? currentTimeTimestamp.replace('T', ' ').slice(0, 16) + ' UTC' : currentTimeTimestamp
            ) : (
              'Active Simulation'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
