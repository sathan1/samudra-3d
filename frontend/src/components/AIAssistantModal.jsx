import React, { useState, useEffect, useRef } from 'react';
import { queryAssistant, fetchAssistantPresets } from '../services/api.js';

export default function AIAssistantModal({
  isOpen = false,
  onClose = null,
  context = {}
}) {
  const [presets, setPresets] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  const inputRef = useRef(null);

  // Load preset queries on mount
  useEffect(() => {
    let ignore = false;
    fetchAssistantPresets()
      .then((data) => {
        if (!ignore && data?.presets) {
          setPresets(data.presets);
        }
      })
      .catch((err) => {
        console.warn('Could not load assistant presets:', err);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (qText) => {
    const queryToRun = (qText || inputQuery).trim();
    if (!queryToRun || loading) return;

    setLoading(true);
    setError(null);

    try {
      const data = await queryAssistant(queryToRun, {
        selected_platform_id: context.selectedFloat?.id || null,
        selected_variable: context.selectedVariable || 'temperature',
        selected_depth: context.requestedDepth || 0,
        time_idx: context.timeIndex || 0
      });
      setResponse(data);
      if (qText) {
        setInputQuery(qText);
      }
    } catch (err) {
      setError(err.message || 'Failed to query AI Ocean Assistant.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentPlatformId = context.selectedFloat?.id || 'None';
  const currentVar = context.selectedVariable || 'temperature';
  const currentDepth = context.requestedDepth || 0;

  return (
    <div
      className="assistant-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      data-testid="assistant-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="assistant-modal-container bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200"
        data-testid="assistant-modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <span className="text-xl" aria-hidden="true">✧</span>
            <div>
              <h2 id="assistant-modal-title" className="text-sm font-semibold text-white m-0">
                SAMUDRA-3D AI Ocean Assistant
              </h2>
              <span className="text-[10px] text-cyan-400 font-mono">
                Grounded Deterministic Ocean Engine · MoES-INCOIS
              </span>
            </div>
          </div>
          <button
            type="button"
            data-testid="assistant-close-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label="Close AI Assistant"
          >
            ✕
          </button>
        </div>

        {/* Live Context Banner */}
        <div className="px-5 py-2 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Workspace Context:</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-emerald-300">
            {currentVar === 'temperature' ? 'Temperature (°C)' : 'Salinity (PSU)'}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-cyan-300">
            {currentDepth === 0 ? 'Surface (0m)' : `${currentDepth}m Depth`}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-amber-300">
            Platform: {currentPlatformId}
          </span>
        </div>

        {/* Presets Chips Bar */}
        <div className="px-5 py-2.5 border-b border-slate-800/60 flex flex-wrap items-center gap-1.5 bg-slate-900/80">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Presets:</span>
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              data-testid="assistant-preset-chip"
              onClick={() => handleSubmit(p.query_text)}
              disabled={loading}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-700 hover:border-cyan-700 text-slate-300 transition cursor-pointer disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Body / Answer Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-200 text-xs flex items-start gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs animate-pulse">Evaluating grounded model fields & in-situ CTD profiles...</p>
            </div>
          ) : response ? (
            <div className="space-y-4">
              {/* Answer Markdown Card */}
              <div
                data-testid="assistant-answer-text"
                className="prose prose-invert max-w-none text-slate-200 text-xs sm:text-sm leading-relaxed p-4 rounded-lg bg-slate-950/60 border border-slate-800 whitespace-pre-wrap font-sans"
              >
                {response.answer_markdown}
              </div>

              {/* Supporting Metrics Grid */}
              {response.supporting_metrics?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Verified Grounded Metrics
                  </h4>
                  <div
                    data-testid="assistant-metrics-grid"
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                  >
                    {response.supporting_metrics.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 flex flex-col justify-between"
                      >
                        <span className="text-[10px] text-slate-400 font-medium truncate">{m.label}</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <strong className="text-sm font-mono text-cyan-300">{m.value}</strong>
                          {m.unit && <span className="text-[10px] text-slate-400">{m.unit}</span>}
                        </div>
                        {m.hint && <span className="text-[9px] text-slate-500 mt-0.5">{m.hint}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grounded Scope Banner */}
              {response.grounded_scope && (
                <div className="p-2.5 rounded bg-slate-950/30 border border-slate-800/80 text-[10px] text-slate-400 flex flex-wrap justify-between items-center gap-2">
                  <span>Provenance: {response.grounded_scope.dataset}</span>
                  <span>Support: {response.grounded_scope.support_radius_km} km radius</span>
                  <span>Evaluated: {response.grounded_scope.platforms_evaluated} platform(s)</span>
                  <span className="font-mono text-slate-500">{response.latency_ms}ms</span>
                </div>
              )}

              {/* Suggested Questions */}
              {response.suggestions?.length > 0 && (
                <div className="pt-1">
                  <span className="text-[11px] text-slate-400 font-medium block mb-1.5">Suggested Inquiries:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {response.suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSubmit(s)}
                        className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 space-y-2">
              <span className="text-3xl block" aria-hidden="true">🌊</span>
              <h3 className="text-sm font-semibold text-slate-200">Grounded Scientific Ocean Assistant</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Ask about maximum model residuals, active observation network coverage, simulated domain extremes, or selected sensor platform details.
              </p>
            </div>
          )}
        </div>

        {/* Input Query Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="p-3 border-t border-slate-800 bg-slate-950/70 flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            id="assistant-input"
            data-testid="assistant-input"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask a grounded oceanographic question (e.g. Largest discrepancy?)"
            className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            disabled={loading}
          />
          <button
            type="submit"
            data-testid="assistant-submit"
            disabled={loading || !inputQuery.trim()}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold tracking-wide transition flex items-center gap-1 cursor-pointer"
          >
            {loading ? 'Evaluating...' : 'Query ↵'}
          </button>
        </form>

        {/* Footer Disclaimer */}
        <div className="px-5 py-1.5 bg-slate-950 border-t border-slate-800/40 text-[9px] text-slate-500 flex justify-between">
          <span>Deterministic analysis grounded in ROMS + In-situ CTD</span>
          <span>No unverified predictions or hazard claims</span>
        </div>
      </div>
    </div>
  );
}
