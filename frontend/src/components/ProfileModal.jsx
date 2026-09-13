import { useState, useMemo, useEffect, useRef } from 'react';
import {
  cleanProfileData,
  createProfileScales,
  generateProfileSvgPaths,
  generateAxisTicks,
  computeIsopycnalContours,
  computePotentialDensity,
  generateModelOverlaySvgPath
} from '../utils/profileCharts.js';
import { formatFloatCoordinates, formatFloatDate } from '../utils/argoProfiles.js';
import { fetchProfileCollocation } from '../services/api.js';

/**
 * ProfileModal - Interactive Oceanographic Sensor Profile Inspector
 * Authority: Master Handbook physical pp. 4, 6, 9-11, 13; roadmap p. 10 (SIH26067)
 */
export default function ProfileModal({ selectedFloat = null, onSelectFloat = null, collocation = null }) {
  const [activeTab, setActiveTab] = useState('temperature'); // 'temperature' | 'salinity' | 'ts'
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [showModelOverlay, setShowModelOverlay] = useState(false);
  const [fetchedCollocation, setFetchedCollocation] = useState(null);
  const closeBtnRef = useRef(null);

  // Fetch collocation data when float is selected
  useEffect(() => {
    let ignore = false;
    if (selectedFloat) {
      fetchProfileCollocation(selectedFloat.id)
        .then((data) => {
          if (!ignore && data) {
            setFetchedCollocation(data);
          }
        })
        .catch((err) => {
          console.warn('Collocation fetch note:', err.message);
        });
    }
    return () => {
      ignore = true;
    };
  }, [selectedFloat]);

  const activeCollocation = selectedFloat ? (collocation || fetchedCollocation) : null;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedFloat) {
        onSelectFloat?.(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFloat, onSelectFloat]);

  // Clean data for Temperature
  const tempData = useMemo(() => {
    if (!selectedFloat) return null;
    return cleanProfileData(
      selectedFloat.depths,
      selectedFloat.temperature,
      selectedFloat.qc_flags
    );
  }, [selectedFloat]);

  // Collocated model levels
  const currentModelLevels = useMemo(() => {
    if (!activeCollocation) return [];
    return activeTab === 'temperature'
      ? activeCollocation.temperature_levels || []
      : activeCollocation.salinity_levels || [];
  }, [activeCollocation, activeTab]);

  const currentSummary = useMemo(() => {
    if (!activeCollocation) return null;
    return activeTab === 'temperature'
      ? activeCollocation.temperature
      : activeCollocation.salinity;
  }, [activeCollocation, activeTab]);

  // Clean data for Salinity
  const salData = useMemo(() => {
    if (!selectedFloat) return null;
    return cleanProfileData(
      selectedFloat.depths,
      selectedFloat.salinity,
      selectedFloat.qc_flags
    );
  }, [selectedFloat]);

  if (!selectedFloat) {
    return (
      <section className="profile-placeholder" aria-labelledby="profile-heading" data-testid="profile-placeholder">
        <span className="profile-symbol" aria-hidden="true">⌖</span>
        <h3 id="profile-heading">No sensor selected</h3>
        <p className="helper">Click an Argo float marker on the 3D globe or choose from the sidebar dropdown to view vertical depth curves.</p>
        <button type="button" disabled aria-describedby="profile-help">
          View depth profile
        </button>
        <p className="helper" id="profile-help">Profile inspection is ready. Select an active sensor to view depth profiles and T-S diagram.</p>
      </section>
    );
  }

  const wmoId = selectedFloat.wmo_id || selectedFloat.metadata?.wmo_id || selectedFloat.id;
  const dataCentre = selectedFloat.metadata?.data_centre || 'Not supplied';
  const cycleNumber = selectedFloat.metadata?.cycle_number ?? 'N/A';
  const sourceMode = selectedFloat.source_mode || 'SYNTHETIC';
  const qc = selectedFloat.qc_summary || { pass_rate_pct: 100, good: 0, total: 0 };

  // Chart configuration
  const chartWidth = 440;
  const chartHeight = 280;
  const padding = { top: 20, right: 25, bottom: 35, left: 55 };

  return (
    <section
      className="profile-modal-container"
      aria-labelledby="profile-heading"
      data-testid="profile-modal-container"
      style={{
        background: 'var(--panel)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        padding: '12px',
        marginTop: '8px'
      }}
    >
      <div data-testid="profile-details">
        {/* 1. Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="subtle-tag" style={{ background: 'var(--field)', color: 'var(--accent)', fontWeight: 600, fontSize: '10px' }}>
                {selectedFloat.platform_type === 'argo' ? 'ARGO FLOAT' : 'GLIDER TRANSECT'}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--muted)', background: 'var(--field)', padding: '1px 5px', borderRadius: '3px' }}>
                {sourceMode}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  color: qc.pass_rate_pct >= 90 ? 'var(--accent)' : '#f43f5e',
                  background: 'var(--field)',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  fontWeight: 600
                }}
                data-testid="qc-badge"
              >
                {qc.pass_rate_pct}% Pass ({qc.good ?? qc.total}/{qc.total} levels)
              </span>
            </div>
            <h3 id="profile-heading" style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px', color: 'var(--text)' }} data-testid="profile-title">
              {selectedFloat.name || `Float ${wmoId}`}
            </h3>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={() => onSelectFloat?.(null)}
            aria-label="Close profile inspector"
            style={{
              padding: '3px 7px',
              fontSize: '11px',
              cursor: 'pointer',
              background: 'var(--field)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text)'
            }}
            data-testid="deselect-float-btn"
            className="close-profile-btn"
          >
            ✕ Close
          </button>
        </div>

        {/* 2. Sensor Metadata Summary Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', fontSize: '10px', marginBottom: '8px' }}>
          <div style={{ background: 'var(--field)', padding: '4px 6px', borderRadius: '4px' }}>
            <span style={{ color: 'var(--muted)', display: 'block' }}>WMO ID</span>
            <strong data-testid="wmo-number-val">{wmoId}</strong>
          </div>
          <div style={{ background: 'var(--field)', padding: '4px 6px', borderRadius: '4px' }}>
            <span style={{ color: 'var(--muted)', display: 'block' }}>Position</span>
            <strong data-testid="float-coords-val">{formatFloatCoordinates(selectedFloat.lat, selectedFloat.lon)}</strong>
          </div>
        <div style={{ background: 'var(--field)', padding: '4px 6px', borderRadius: '4px' }}>
          <span style={{ color: 'var(--muted)', display: 'block' }}>Cycle / DAC</span>
          <span>#{cycleNumber} ({dataCentre})</span>
        </div>
        <div style={{ background: 'var(--field)', padding: '4px 6px', borderRadius: '4px' }}>
          <span style={{ color: 'var(--muted)', display: 'block' }}>Timestamp</span>
          <span style={{ fontFamily: 'monospace' }}>{formatFloatDate(selectedFloat.timestamp)}</span>
        </div>
      </div>

      {/* 3. Variable Switching Tabs */}
      <div
        role="tablist"
        aria-label="Profile Views"
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '4px',
          marginBottom: '8px'
        }}
      >
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === 'temperature'}
          onClick={() => { setActiveTab('temperature'); setHoveredPoint(null); }}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            cursor: 'pointer',
            borderRadius: '4px',
            border: 'none',
            background: activeTab === 'temperature' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'temperature' ? '#fff' : 'var(--text)',
            fontWeight: activeTab === 'temperature' ? 600 : 400
          }}
          data-testid="tab-temperature"
        >
          Temperature (°C)
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === 'salinity'}
          onClick={() => { setActiveTab('salinity'); setHoveredPoint(null); }}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            cursor: 'pointer',
            borderRadius: '4px',
            border: 'none',
            background: activeTab === 'salinity' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'salinity' ? '#fff' : 'var(--text)',
            fontWeight: activeTab === 'salinity' ? 600 : 400
          }}
          data-testid="tab-salinity"
        >
          Salinity (PSU)
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === 'ts'}
          onClick={() => { setActiveTab('ts'); setHoveredPoint(null); }}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            cursor: 'pointer',
            borderRadius: '4px',
            border: 'none',
            background: activeTab === 'ts' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'ts' ? '#fff' : 'var(--text)',
            fontWeight: activeTab === 'ts' ? 600 : 400
          }}
          data-testid="tab-ts"
        >
          T-S Diagram (σ<sub>θ</sub>)
        </button>
      </div>

      {/* 4. Chart Visualization Viewport */}
      <div
        style={{
          position: 'relative',
          background: 'rgba(15, 23, 42, 0.65)',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          overflow: 'hidden'
        }}
        data-testid="chart-viewport"
      >
        {activeTab === 'temperature' && tempData && (
          <VerticalDepthSvgChart
            data={tempData}
            unit="°C"
            paramName="Potential Temperature"
            color="#38bdf8"
            chartWidth={chartWidth}
            chartHeight={chartHeight}
            padding={padding}
            hoveredPoint={hoveredPoint}
            onHoverPoint={setHoveredPoint}
            modelLevels={showModelOverlay ? currentModelLevels : []}
            showModelOverlay={showModelOverlay}
          />
        )}

        {activeTab === 'salinity' && salData && (
          <VerticalDepthSvgChart
            data={salData}
            unit="PSU"
            paramName="Practical Salinity"
            color="#34d399"
            chartWidth={chartWidth}
            chartHeight={chartHeight}
            padding={padding}
            hoveredPoint={hoveredPoint}
            onHoverPoint={setHoveredPoint}
            modelLevels={showModelOverlay ? currentModelLevels : []}
            showModelOverlay={showModelOverlay}
          />
        )}

        {activeTab === 'ts' && (
          <TSDiagramSvgChart
            depths={selectedFloat.depths}
            temperatures={selectedFloat.temperature}
            salinities={selectedFloat.salinity}
            qcFlags={selectedFloat.qc_flags}
            chartWidth={chartWidth}
            chartHeight={chartHeight}
            padding={padding}
            hoveredPoint={hoveredPoint}
            onHoverPoint={setHoveredPoint}
          />
        )}
      </div>

      {/* 5. Tooltip Readout */}
      <div
        style={{
          minHeight: '22px',
          marginTop: '6px',
          fontSize: '11px',
          fontFamily: 'Consolas, monospace',
          color: 'var(--muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
        data-testid="chart-tooltip"
      >
        {hoveredPoint ? (() => {
          const matchedModel = showModelOverlay && currentModelLevels.find(m => Math.abs(m.depth - hoveredPoint.depth) < 1.0);
          return (
            <span>
              Depth: <strong style={{ color: 'var(--text)' }}>{hoveredPoint.depth}m</strong> · Obs:{' '}
              <strong style={{ color: hoveredPoint.color || 'var(--accent)' }}>
                {hoveredPoint.value} {hoveredPoint.unit}
              </strong>
              {matchedModel && matchedModel.model_value !== null ? (
                <>
                  {' '}· Model: <strong style={{ color: '#ec4899' }}>{matchedModel.model_value} {hoveredPoint.unit}</strong>
                  {' '}· Δ: <strong style={{ color: matchedModel.delta < 0 ? '#38bdf8' : '#fbbf24' }}>
                    {matchedModel.delta > 0 ? `+${matchedModel.delta}` : matchedModel.delta} {hoveredPoint.unit}
                  </strong>
                </>
              ) : null}
              {' '}· QC:{' '}
              <span style={{ color: hoveredPoint.isGood ? 'var(--accent)' : '#f43f5e', fontWeight: 600 }}>
                {hoveredPoint.isGood ? `Good (Flag ${hoveredPoint.qcFlag})` : `Bad (Flag ${hoveredPoint.qcFlag})`}
              </span>
            </span>
          );
        })() : (
          <span>Hover over curve data points to inspect physical depth observations.</span>
        )}
        <span style={{ fontSize: '10px' }}>{selectedFloat.depths?.length || 0} levels</span>
      </div>

      {/* 6. Model Comparison Section (Phase 13 Collocation) */}
      <div
        style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid var(--border)',
          fontSize: '11px'
        }}
        data-testid="model-contract-section"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              id="toggle-model-overlay"
              data-testid="model-overlay-toggle"
              type="checkbox"
              checked={showModelOverlay}
              onChange={(e) => setShowModelOverlay(e.target.checked)}
            />
            <span style={{ fontWeight: showModelOverlay ? 600 : 400 }}>Overlay co-located ROMS model profile</span>
          </label>
          <span
            style={{
              padding: '1px 5px',
              borderRadius: '3px',
              background: 'var(--field)',
              color: 'var(--accent)',
              fontSize: '10px',
              fontWeight: 600
            }}
            data-testid="phase13-tag"
          >
            Model Collocation Contract
          </span>
        </div>
        {showModelOverlay && currentSummary && (
          <div
            style={{
              marginTop: '6px',
              padding: '4px 8px',
              background: 'rgba(236, 72, 153, 0.12)',
              border: '1px solid rgba(236, 72, 153, 0.35)',
              borderRadius: '4px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              alignItems: 'center',
              fontSize: '10px',
              fontFamily: 'Consolas, monospace'
            }}
            data-testid="collocation-metrics-badge"
          >
            <span>
              Bias: <strong style={{ color: currentSummary.bias < 0 ? '#38bdf8' : '#fbbf24' }}>
                {currentSummary.bias > 0 ? `+${currentSummary.bias}` : currentSummary.bias}{currentSummary.unit}
              </strong> ({currentSummary.prediction_tendency})
            </span>
            <span>
              MAE: <strong>{currentSummary.mae}{currentSummary.unit}</strong>
            </span>
            <span>
              RMSE: <strong>{currentSummary.rmse}{currentSummary.unit}</strong>
            </span>
            <span style={{ color: 'var(--muted)' }}>
              ({currentSummary.valid_pairs}/{currentSummary.total_levels} levels matched)
            </span>
          </div>
        )}
        <p className="helper" style={{ margin: '4px 0 0 0', fontSize: '10px' }}>
          {showModelOverlay
            ? 'Dashed line indicates 3D trilinear spatially and bounding temporally collocated ROMS numerical model profile.'
            : 'Check overlay to compare in-situ physical measurements with co-located ROMS numerical simulation.'}
        </p>
      </div>
      </div>
    </section>
  );
}

/**
 * Vertical Depth Profile SVG Chart Component
 * Inverted Depth on Y (0m at top down to maxDepth at bottom), Measurement on X
 */
function VerticalDepthSvgChart({
  data,
  unit,
  paramName,
  color,
  chartWidth,
  chartHeight,
  padding,
  hoveredPoint,
  onHoverPoint,
  modelLevels = [],
  showModelOverlay = false
}) {
  const { minVal, maxVal, maxDepth, points, hasGaps } = data;

  const scales = useMemo(() => {
    return createProfileScales({
      minVal,
      maxVal,
      maxDepth,
      width: chartWidth,
      height: chartHeight,
      padding
    });
  }, [minVal, maxVal, maxDepth, chartWidth, chartHeight, padding]);

  const { pathSegments, pointCoords } = useMemo(() => {
    return generateProfileSvgPaths(points, scales.valueToX, scales.depthToY);
  }, [points, scales]);

  const { pathSegments: modelSegments, modelCoords } = useMemo(() => {
    return generateModelOverlaySvgPath(modelLevels, scales.valueToX, scales.depthToY);
  }, [modelLevels, scales]);

  const depthTicks = useMemo(() => generateAxisTicks(0, maxDepth, 5), [maxDepth]);
  const valTicks = useMemo(() => generateAxisTicks(minVal, maxVal, 5), [minVal, maxVal]);

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      data-testid="vertical-depth-svg"
    >
      {/* Grid Lines */}
      {depthTicks.map((d, i) => (
        <line
          key={`d-grid-${i}`}
          x1={padding.left}
          y1={scales.depthToY(d)}
          x2={chartWidth - padding.right}
          y2={scales.depthToY(d)}
          stroke="rgba(148, 163, 184, 0.15)"
          strokeDasharray="2,2"
        />
      ))}
      {valTicks.map((v, i) => (
        <line
          key={`v-grid-${i}`}
          x1={scales.valueToX(v)}
          y1={padding.top}
          x2={scales.valueToX(v)}
          y2={chartHeight - padding.bottom}
          stroke="rgba(148, 163, 184, 0.15)"
          strokeDasharray="2,2"
        />
      ))}

      {/* Y-Axis: Inverted Depth */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={chartHeight - padding.bottom}
        stroke="var(--border)"
        strokeWidth="1.5"
      />
      <text
        x={12}
        y={chartHeight / 2}
        transform={`rotate(-90 12 ${chartHeight / 2})`}
        fill="var(--muted)"
        fontSize="10"
        textAnchor="middle"
        fontFamily="sans-serif"
        data-testid="y-axis-label"
      >
        Depth (m) ↓
      </text>
      {depthTicks.map((d, i) => (
        <g key={`d-tick-${i}`}>
          <line
            x1={padding.left - 4}
            y1={scales.depthToY(d)}
            x2={padding.left}
            y2={scales.depthToY(d)}
            stroke="var(--border)"
          />
          <text
            x={padding.left - 7}
            y={scales.depthToY(d) + 3}
            fill="var(--muted)"
            fontSize="9"
            textAnchor="end"
            fontFamily="monospace"
          >
            {Math.round(d)}
          </text>
        </g>
      ))}

      {/* X-Axis: Parameter Value */}
      <line
        x1={padding.left}
        y1={chartHeight - padding.bottom}
        x2={chartWidth - padding.right}
        y2={chartHeight - padding.bottom}
        stroke="var(--border)"
        strokeWidth="1.5"
      />
      <text
        x={padding.left + scales.plotWidth / 2}
        y={chartHeight - 8}
        fill="var(--muted)"
        fontSize="10"
        textAnchor="middle"
        fontFamily="sans-serif"
        data-testid="x-axis-label"
      >
        {paramName} ({unit}) →
      </text>
      {valTicks.map((v, i) => (
        <g key={`v-tick-${i}`}>
          <line
            x1={scales.valueToX(v)}
            y1={chartHeight - padding.bottom}
            x2={scales.valueToX(v)}
            y2={chartHeight - padding.bottom + 4}
            stroke="var(--border)"
          />
          <text
            x={scales.valueToX(v)}
            y={chartHeight - padding.bottom + 14}
            fill="var(--muted)"
            fontSize="9"
            textAnchor="middle"
            fontFamily="monospace"
          >
            {v.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Profile Curve Line Segments (Discontinuous on Gaps) */}
      {pathSegments.map((d, i) => (
        <path
          key={`seg-${i}`}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          data-testid="profile-curve-path"
        />
      ))}

      {/* Co-located Model Curve (Dashed Magenta) */}
      {showModelOverlay && modelSegments.map((d, i) => (
        <path
          key={`mod-seg-${i}`}
          d={d}
          fill="none"
          stroke="#ec4899"
          strokeWidth="2.0"
          strokeDasharray="4,4"
          strokeLinecap="round"
          strokeLinejoin="round"
          data-testid="model-curve-path"
        />
      ))}

      {/* Co-located Model Points */}
      {showModelOverlay && modelCoords.map((pt, i) => (
        <circle
          key={`mod-pt-${i}`}
          cx={pt.x}
          cy={pt.y}
          r={2.5}
          fill="#ec4899"
          stroke="#0f172a"
          strokeWidth={1.2}
          data-testid="model-point"
        />
      ))}

      {/* Observation Points */}
      {pointCoords.map((pt, i) => {
        const isBad = !pt.isGood;
        const ptColor = isBad ? '#f43f5e' : color;
        const isHovered = hoveredPoint && hoveredPoint.depth === pt.depth;

        return (
          <g key={`pt-${i}`}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={isHovered ? 6 : isBad ? 4.5 : 3.5}
              fill={isBad ? '#f43f5e' : '#0f172a'}
              stroke={ptColor}
              strokeWidth={isHovered ? 2.5 : 1.8}
              style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
              onMouseEnter={() => onHoverPoint?.({ ...pt, unit, color: ptColor })}
              onMouseLeave={() => onHoverPoint?.(null)}
              data-testid={isBad ? 'qc-outlier-point' : 'profile-point'}
            />
            {isBad && (
              <text
                x={pt.x + 6}
                y={pt.y + 3}
                fill="#f43f5e"
                fontSize="8"
                fontWeight="bold"
                fontFamily="monospace"
              >
                QC Alert
              </text>
            )}
          </g>
        );
      })}

      {/* Active Hover Crosshairs */}
      {hoveredPoint && (
        <g pointerEvents="none">
          <line
            x1={padding.left}
            y1={hoveredPoint.y}
            x2={chartWidth - padding.right}
            y2={hoveredPoint.y}
            stroke="rgba(245, 158, 11, 0.6)"
            strokeDasharray="3,3"
          />
          <line
            x1={hoveredPoint.x}
            y1={padding.top}
            x2={hoveredPoint.x}
            y2={chartHeight - padding.bottom}
            stroke="rgba(245, 158, 11, 0.6)"
            strokeDasharray="3,3"
          />
        </g>
      )}

      {/* QC Gap Notification Banner */}
      {hasGaps && (
        <g transform={`translate(${padding.left + 10}, ${padding.top + 10})`}>
          <rect width="180" height="18" rx="3" fill="rgba(244, 63, 94, 0.15)" stroke="#f43f5e" strokeWidth="0.8" />
          <text x="6" y="12" fill="#f43f5e" fontSize="9" fontWeight="600" fontFamily="sans-serif">
            ⚠ QC Flag Discontinuity (Gap Rendered)
          </text>
        </g>
      )}
    </svg>
  );
}

/**
 * Temperature-Salinity (T-S) Diagram with UNESCO Equation of State Isopycnals
 */
function TSDiagramSvgChart({
  depths = [],
  temperatures = [],
  salinities = [],
  qcFlags = [],
  chartWidth,
  chartHeight,
  padding,
  hoveredPoint: _hoveredPoint,
  onHoverPoint
}) {
  // Combine points
  const points = useMemo(() => {
    const pts = [];
    const n = Math.min(depths.length, temperatures.length, salinities.length);
    for (let i = 0; i < n; i++) {
      const d = depths[i];
      const t = temperatures[i];
      const s = salinities[i];
      const qc = qcFlags[i] ?? 1;
      if (d != null && t != null && s != null && !isNaN(d) && !isNaN(t) && !isNaN(s)) {
        pts.push({
          depth: d,
          temperature: t,
          salinity: s,
          qcFlag: qc,
          isGood: qc === 1 || qc === 2,
          density: computePotentialDensity(s, t)
        });
      }
    }
    pts.sort((a, b) => a.depth - b.depth);
    return pts;
  }, [depths, temperatures, salinities, qcFlags]);

  const salBounds = useMemo(() => {
    if (!points.length) return [32.0, 37.0];
    const sals = points.map((p) => p.salinity);
    const sMin = Math.floor(Math.min(...sals) * 2) / 2 - 0.5;
    const sMax = Math.ceil(Math.max(...sals) * 2) / 2 + 0.5;
    return [Math.max(30.0, sMin), Math.min(38.0, sMax)];
  }, [points]);

  const tempBounds = useMemo(() => {
    if (!points.length) return [0.0, 30.0];
    const temps = points.map((p) => p.temperature);
    const tMin = Math.floor(Math.min(...temps)) - 1;
    const tMax = Math.ceil(Math.max(...temps)) + 1;
    return [Math.max(-1.0, tMin), Math.min(35.0, tMax)];
  }, [points]);

  const isopycnals = useMemo(() => {
    return computeIsopycnalContours(salBounds, tempBounds, [22, 23, 24, 25, 26, 27, 28]);
  }, [salBounds, tempBounds]);

  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  const salToX = (s) => {
    const ratio = (s - salBounds[0]) / (salBounds[1] - salBounds[0]);
    return padding.left + Math.max(0, Math.min(1, ratio)) * plotWidth;
  };

  const tempToY = (t) => {
    // Normal Cartesian Y: warm temperature at top, cold at bottom
    const ratio = (t - tempBounds[0]) / (tempBounds[1] - tempBounds[0]);
    return chartHeight - padding.bottom - Math.max(0, Math.min(1, ratio)) * plotHeight;
  };

  const salTicks = useMemo(() => generateAxisTicks(salBounds[0], salBounds[1], 5), [salBounds]);
  const tempTicks = useMemo(() => generateAxisTicks(tempBounds[0], tempBounds[1], 5), [tempBounds]);

  // Connect T-S points into trajectory
  const tsPathD = useMemo(() => {
    const valid = points.filter((p) => p.isGood);
    if (valid.length < 2) return '';
    const toX = (s) => padding.left + Math.max(0, Math.min(1, (s - salBounds[0]) / (salBounds[1] - salBounds[0]))) * (chartWidth - padding.left - padding.right);
    const toY = (t) => chartHeight - padding.bottom - Math.max(0, Math.min(1, (t - tempBounds[0]) / (tempBounds[1] - tempBounds[0]))) * (chartHeight - padding.top - padding.bottom);
    return valid.reduce(
      (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${toX(p.salinity).toFixed(1)} ${toY(p.temperature).toFixed(1)}`,
      ''
    );
  }, [points, salBounds, tempBounds, chartWidth, chartHeight, padding]);

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      data-testid="ts-diagram-svg"
    >
      {/* Background Isopycnal Contours (sigma_theta) */}
      {isopycnals.map((iso, i) => {
        const d = iso.points.reduce((acc, pt, idx) => {
          const x = salToX(pt[0]);
          const y = tempToY(pt[1]);
          return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        }, '');

        const labelPt = iso.points[Math.floor(iso.points.length * 0.75)];
        return (
          <g key={`iso-${i}`} opacity="0.65">
            <path
              d={d}
              fill="none"
              stroke="rgba(148, 163, 184, 0.35)"
              strokeWidth="1"
              strokeDasharray="3,3"
              data-testid="isopycnal-path"
            />
            {labelPt && (
              <text
                x={salToX(labelPt[0]) + 2}
                y={tempToY(labelPt[1]) - 2}
                fill="rgba(148, 163, 184, 0.7)"
                fontSize="8"
                fontFamily="monospace"
                data-testid="isopycnal-label"
              >
                σθ = {iso.sigma}
              </text>
            )}
          </g>
        );
      })}

      {/* Axes */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={chartHeight - padding.bottom}
        stroke="var(--border)"
        strokeWidth="1.5"
      />
      <text
        x={12}
        y={chartHeight / 2}
        transform={`rotate(-90 12 ${chartHeight / 2})`}
        fill="var(--muted)"
        fontSize="10"
        textAnchor="middle"
        fontFamily="sans-serif"
      >
        Potential Temp (°C) ↑
      </text>
      {tempTicks.map((t, i) => (
        <g key={`t-tick-${i}`}>
          <line
            x1={padding.left - 4}
            y1={tempToY(t)}
            x2={padding.left}
            y2={tempToY(t)}
            stroke="var(--border)"
          />
          <text
            x={padding.left - 7}
            y={tempToY(t) + 3}
            fill="var(--muted)"
            fontSize="9"
            textAnchor="end"
            fontFamily="monospace"
          >
            {t.toFixed(1)}
          </text>
        </g>
      ))}

      <line
        x1={padding.left}
        y1={chartHeight - padding.bottom}
        x2={chartWidth - padding.right}
        y2={chartHeight - padding.bottom}
        stroke="var(--border)"
        strokeWidth="1.5"
      />
      <text
        x={padding.left + plotWidth / 2}
        y={chartHeight - 8}
        fill="var(--muted)"
        fontSize="10"
        textAnchor="middle"
        fontFamily="sans-serif"
      >
        Practical Salinity (PSU) →
      </text>
      {salTicks.map((s, i) => (
        <g key={`s-tick-${i}`}>
          <line
            x1={salToX(s)}
            y1={chartHeight - padding.bottom}
            x2={salToX(s)}
            y2={chartHeight - padding.bottom + 4}
            stroke="var(--border)"
          />
          <text
            x={salToX(s)}
            y={chartHeight - padding.bottom + 14}
            fill="var(--muted)"
            fontSize="9"
            textAnchor="middle"
            fontFamily="monospace"
          >
            {s.toFixed(1)}
          </text>
        </g>
      ))}

      {/* T-S Trajectory Line */}
      {tsPathD && (
        <path
          d={tsPathD}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          data-testid="ts-path"
        />
      )}

      {/* Observation Points colored by depth */}
      {points.map((pt, i) => {
        const x = salToX(pt.salinity);
        const y = tempToY(pt.temperature);
        const isBad = !pt.isGood;
        const color = isBad ? '#f43f5e' : pt.depth <= 100 ? '#f59e0b' : pt.depth <= 500 ? '#38bdf8' : '#818cf8';

        return (
          <circle
            key={`ts-pt-${i}`}
            cx={x}
            cy={y}
            r={isBad ? 4.5 : 3.5}
            fill={isBad ? '#f43f5e' : color}
            stroke="#0f172a"
            strokeWidth="1.2"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() =>
              onHoverPoint?.({
                depth: pt.depth,
                value: `${pt.temperature}°C / ${pt.salinity} PSU (σθ=${pt.density.toFixed(2)} kg/m³)`,
                unit: '',
                isGood: pt.isGood,
                qcFlag: pt.qcFlag,
                color
              })
            }
            onMouseLeave={() => onHoverPoint?.(null)}
            data-testid="ts-data-point"
          />
        );
      })}
    </svg>
  );
}
