import React, { useState, useEffect } from 'react';
import ProfileModal from './ProfileModal.jsx';
import { fetchProfileCollocation } from '../services/api.js';

export default function ComparisonPanel({
  selectedFloat = null,
  onSelectFloat = null,
  collocation = null,
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

  return (
    <aside className="panel inspection" aria-labelledby="inspection-heading">
      <div className="panel-heading">
        <span className="eyebrow">INSPECT & COMPARE</span>
        <h2 id="inspection-heading">Sensor inspection</h2>
      </div>

      <ProfileModal
        selectedFloat={selectedFloat}
        onSelectFloat={onSelectFloat}
        collocation={activeCollocation}
      />

      {/* Model vs Observation (Phase 13 Collocation) */}
      <section className="comparison" aria-labelledby="comparison-heading" data-testid="model-comparison-summary">
        <h3 id="comparison-heading">Model vs observation</h3>
        {selectedFloat && activeCollocation ? (
          <>
            <span className="subtle-tag" style={{ background: 'var(--field)', color: 'var(--accent)', fontWeight: 600 }}>
              4D Collocation Active
            </span>
            <p className="helper" style={{ margin: '4px 0 6px 0' }}>
              Trilinear spatial and bounding temporal collocation against the packaged ROMS-style demonstration field.
            </p>
            <div className="metric-placeholder" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Difference</span>
              <strong data-testid="comparison-difference" style={{ color: tempSummary?.bias < 0 ? '#38bdf8' : '#fbbf24' }}>
                {tempSummary?.bias !== null && tempSummary?.bias !== undefined
                  ? `${tempSummary.bias > 0 ? '+' : ''}${tempSummary.bias}°C (${tempSummary.prediction_tendency})`
                  : 'N/A'}
              </strong>
            </div>
            <div className="metric-placeholder" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <span>Model health</span>
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
            <span className="subtle-tag">Not available</span>
            <p className="helper">Comparison requires a model field and a matching sensor profile.</p>
            <div className="metric-placeholder">
              <span>Difference</span>
              <span>Not computed</span>
            </div>
            <div className="metric-placeholder">
              <span>Model health</span>
              <span>Not assessed</span>
            </div>
          </>
        )}
      </section>

      {/* Phase 14: 3D Difference Field & Anomaly Heatmap Section */}
      <section className="anomaly-heatmap-panel" aria-labelledby="anomaly-heading" data-testid="anomaly-panel-section" style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h3 id="anomaly-heading" style={{ margin: 0, fontSize: '13px' }}>3D Difference & Anomaly</h3>
          <span className="subtle-tag" style={{ background: 'var(--field)', color: '#00f5d4', fontWeight: 600, fontSize: '10px' }}>
            ANOMALY ENGINE
          </span>
        </div>

        {/* Toggle 3D Anomaly Layer */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px', fontSize: '12px' }}>
          <input
            id="toggle-anomaly-layer"
            data-testid="anomaly-toggle"
            type="checkbox"
            checked={showAnomalyField}
            onChange={(e) => onToggleAnomalyField?.(e.target.checked)}
          />
          <span style={{ fontWeight: showAnomalyField ? 600 : 400 }}>Show 3D residual anomaly layer</span>
        </label>

        {showAnomalyField && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            {/* Variable Selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
              <span>Variable</span>
              <select
                id="anomaly-variable-select"
                data-testid="anomaly-variable-select"
                value={anomalyVariable}
                onChange={(e) => onChangeAnomalyVariable?.(e.target.value)}
                style={{
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '11px'
                }}
              >
                <option value="temperature">Temperature (°C)</option>
                <option value="salinity">Salinity (PSU)</option>
              </select>
            </div>

            {/* Threshold Slider */}
            <div style={{ fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <span>Alert threshold (|Δ|)</span>
                <strong style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>
                  ≥ {anomalyThreshold} {unit}
                </strong>
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
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Coverage and Alert Counts */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
              <span data-testid="anomaly-coverage-count" style={{ color: 'var(--muted)', fontSize: '10px' }}>
                Coverage: {anomalyData?.total_valid_pairs ?? 0} valid pairs ({anomalyData?.platform_count ?? 0} platforms)
              </span>
              <span
                data-testid="anomaly-alert-count"
                style={{
                  padding: '1px 6px',
                  borderRadius: '3px',
                  background: alerts.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: alerts.length > 0 ? '#ef4444' : '#10b981',
                  fontWeight: 600,
                  fontSize: '10px'
                }}
              >
                {alerts.length} discrepancy alert{alerts.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Sparse Observations Policy & Disclaimer */}
            <p className="helper" style={{ margin: 0, fontSize: '10px', color: 'var(--muted)', lineHeight: '1.3' }}>
              Sparse observations: residuals shown only at directly measured locations. No interpolation beyond source collocation ({anomalyData?.support_radius_km ?? 55}km support). No-data regions exist.
            </p>

            {/* Alert List with Click-to-Trace */}
            {alerts.length > 0 ? (
              <div
                data-testid="anomaly-alert-list"
                style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  marginTop: '4px'
                }}
              >
                {alerts.slice(0, 10).map((pt, idx) => (
                  <div
                    key={`${pt.platform_id}-${pt.depth}-${idx}`}
                    data-testid="anomaly-alert-item"
                    onClick={() => onSelectAnomalyPoint?.(pt)}
                    style={{
                      padding: '4px 6px',
                      borderRadius: '4px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      fontSize: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1px'
                    }}
                    title="Click to inspect source platform in ProfileModal"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--text)' }}>{pt.platform_id}</strong>
                      <span style={{ color: pt.delta < 0 ? '#38bdf8' : '#fbbf24', fontFamily: 'monospace', fontWeight: 600 }}>
                        Δ = {pt.delta > 0 ? `+${pt.delta}` : pt.delta}{unit}
                      </span>
                    </div>
                    <div style={{ color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Model-observation discrepancy</span>
                      <span>{pt.depth}m</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: 'var(--muted)', textAlign: 'center' }}>
                No residuals exceed {anomalyThreshold} {unit}.
              </p>
            )}
          </div>
        )}
      </section>

      <details className="availability" style={{ marginTop: '10px' }}>
        <summary>What is available now?</summary>
        <p>Provides automated 3D difference field rendering, diverging residual palettes, configurable threshold alerts, sparse coverage reporting, and traceable observation inspection.</p>
      </details>
    </aside>
  );
}
