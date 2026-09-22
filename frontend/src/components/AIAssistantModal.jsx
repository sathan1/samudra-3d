import React, { useState, useEffect, useRef } from 'react';
import { queryAssistant, fetchAssistantPresets } from '../services/api.js';
import MarkdownRenderer from './MarkdownRenderer.jsx';

export default function AIAssistantModal({
  isOpen = false,
  onClose = null,
  context = {},
  onNavigate = null
}) {
  const [presets, setPresets] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState(null);
  const [messages, setMessages] = useState(() => [{
    id: 'msg-init',
    role: 'assistant',
    content: (
      "### 🤖 SAMUDRA-3D AI Ocean Copilot\n\n" +
      "I am your interactive oceanographic assistant with **complete conceptual knowledge of this webpage and its underlying data**:\n\n" +
      "- **Active Context Awareness:** I continuously observe your active variable, depth slice, forecast timestamp, and selected platform.\n" +
      "- **Interactive Webpage Navigation:** Ask me to *\"switch to salinity\"*, *\"go to 100m depth\"*, *\"open model comparison\"*, or *\"inspect ARGO_2902145\"* and I will navigate for you!\n" +
      "- **Rigorous Scientific Grounding:** Queries are validated directly against the 4D ROMS numerical model and INCOIS in-situ sensor records (Argo CTD & gliders).\n\n" +
      "> **Tip:** Click **⚙️ AI Settings** above to connect your free Google Gemini API key or OpenAI key for unrestricted frontier reasoning."
    ),
    metrics: [
      { label: "Status", value: "Copilot Active" },
      { label: "Grounding", value: "ROMS + In-situ CTD" },
      { label: "Basin", value: "Indian Ocean" }
    ],
    suggestions: [
      "What is on my screen?",
      "What is the largest model-observation discrepancy?",
      "Summarize observation coverage",
      "What are the simulated domain extremes?"
    ],
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    engineMode: 'Built-in Copilot'
  }]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('samudra_ai_key') || '');
  const [apiProvider, setApiProvider] = useState(() => localStorage.getItem('samudra_ai_provider') || 'gemini');
  const [showKey, setShowKey] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

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

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else {
          onClose?.();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSettingsOpen, onClose]);

  const saveSettings = (e) => {
    e?.preventDefault();
    localStorage.setItem('samudra_ai_key', apiKey.trim());
    localStorage.setItem('samudra_ai_provider', apiProvider);
    setIsSettingsOpen(false);
    setActionNotice('API Key and Provider settings saved successfully!');
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleClearChat = () => {
    const resetMsg = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: "### 🧹 Chat History Cleared\n\nHow can I help you explore SAMUDRA-3D's oceanographic fields or navigate the observatory?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        "What is on my screen?",
        "What is the largest model-observation discrepancy?",
        "Summarize observation coverage"
      ],
      engineMode: apiKey ? (apiProvider === 'openai' ? 'OpenAI GPT-4o' : 'Gemini 1.5 Flash') : 'Built-in Copilot'
    };
    setMessages([resetMsg]);
  };

  const executeNavigation = (action) => {
    if (!action) return;
    onNavigate?.(action);
    setActionNotice(`Applied Navigation: ${action.type.replace(/_/g, ' ')}`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleSubmit = async (qText) => {
    const queryToRun = (qText || inputQuery).trim();
    if (!queryToRun || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: queryToRun,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);
    setError(null);

    // Prepare conversation history for LLM
    const historyPayload = messages.slice(-6).map((m) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : ''
    }));

    try {
      const data = await queryAssistant(
        queryToRun,
        {
          selected_platform_id: context.selectedFloat?.id || null,
          selected_variable: context.selectedVariable || 'temperature',
          selected_depth: context.requestedDepth || 0,
          time_idx: context.timeIndex || 0
        },
        {
          apiKey: apiKey.trim() || null,
          apiProvider,
          conversationHistory: historyPayload
        }
      );

      const assistantMsg = {
        id: `assist-${Date.now()}`,
        role: 'assistant',
        content: data.answer_markdown,
        metrics: data.supporting_metrics,
        suggestions: data.suggestions,
        action: data.navigation_action,
        groundedScope: data.grounded_scope,
        engineMode: data.engine_mode,
        latency: data.latency_ms,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If response includes navigation action, execute it via onNavigate
      if (data.navigation_action && onNavigate) {
        executeNavigation(data.navigation_action);
      }
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `### ⚠️ Inquiry Execution Error\n\n${err.message || 'Failed to query AI Ocean Assistant.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
      setError(err.message || 'Failed to query AI Ocean Assistant.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentPlatformId = context.selectedFloat?.id || 'None';
  const currentVar = context.selectedVariable || 'temperature';
  const currentDepth = context.requestedDepth || 0;
  const currentTimeIdx = context.timeIndex || 0;

  // Most recent assistant message for data-testid backward-compatibility
  const latestAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <div
      className="assistant-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md transition-all duration-200"
      data-testid="assistant-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`assistant-modal-container bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200 transition-all ${
          isMaximized ? 'w-[98vw] h-[95vh] max-w-none' : 'w-full max-w-3xl h-[85vh] max-h-[850px]'
        }`}
        data-testid="assistant-modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-modal-title"
      >
        {/* 1. Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 text-lg shadow-inner" aria-hidden="true">
              🤖
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="assistant-modal-title" className="text-sm sm:text-base font-bold text-white m-0 tracking-tight">
                  SAMUDRA-3D AI Ocean Assistant
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">
                  {apiKey ? (apiProvider === 'openai' ? 'OpenAI GPT-4o' : 'Google Gemini') : 'Grounded Copilot'}
                </span>
              </div>
              <p className="text-[11px] text-cyan-400 font-mono m-0 mt-0.5">
                Full Webpage & Navigation Knowledge · MoES-INCOIS Grounded
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* AI Settings Toggle */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                isSettingsOpen
                  ? 'bg-cyan-950 border-cyan-600 text-cyan-300'
                  : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Configure Gemini or OpenAI API Key"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">AI Settings</span>
            </button>

            {/* Clear Chat */}
            <button
              type="button"
              onClick={handleClearChat}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer text-xs"
              title="Clear Conversation History"
            >
              🧹
            </button>

            {/* Maximize Toggle */}
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer text-xs"
              title={isMaximized ? 'Restore window' : 'Maximize window'}
            >
              {isMaximized ? '🗗' : '⛶'}
            </button>

            {/* Close Button */}
            <button
              type="button"
              data-testid="assistant-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/40 transition cursor-pointer text-xs ml-1"
              aria-label="Close AI Assistant"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 2. API Key Configuration Drawer / Panel */}
        {isSettingsOpen && (
          <div className="p-4 bg-slate-950 border-b border-cyan-900/60 animate-in slide-in-from-top-2 duration-150">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider m-0 flex items-center gap-1.5">
                  <span>🔑</span>
                  <span>AI Engine & API Key Configuration</span>
                </h4>
                <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                  Connect live frontier AI models (Google Gemini or OpenAI) to enable open-ended reasoning over ocean fields.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveSettings} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    AI Provider
                  </label>
                  <select
                    value={apiProvider}
                    onChange={(e) => setApiProvider(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="gemini">Google Gemini (Gemini 1.5 Flash)</option>
                    <option value="openai">OpenAI (GPT-4o-mini)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      {apiProvider === 'openai' ? 'OpenAI API Key' : 'Google Gemini API Key'}
                    </label>
                    {apiProvider === 'gemini' && (
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        Get free Gemini key ↗
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={apiProvider === 'openai' ? 'sk-...' : 'AIzaSy...'}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 pr-16 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                    >
                      {showKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${apiKey ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span>
                    {apiKey
                      ? `Key configured for ${apiProvider === 'openai' ? 'OpenAI' : 'Gemini'} (stored in localStorage)`
                      : 'No external key set. Using built-in offline scientific copilot.'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {apiKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setApiKey('');
                        localStorage.removeItem('samudra_ai_key');
                        setActionNotice('API Key removed.');
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-red-950 hover:text-red-300 border border-slate-700 text-[11px] transition"
                    >
                      Clear Key
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow transition cursor-pointer"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* 3. Action Notification Banner */}
        {actionNotice && (
          <div className="px-5 py-2 bg-cyan-950/80 border-b border-cyan-800 text-xs text-cyan-200 flex items-center justify-between animate-in fade-in duration-150">
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span>{actionNotice}</span>
            </span>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="text-cyan-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* 4. Live Workspace Context Ribbon */}
        <div className="px-5 py-2 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium text-[11px]">Workspace Context:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 font-mono text-[11px] text-emerald-300">
              {currentVar === 'temperature' ? 'Potential Temp (°C)' : 'Practical Salinity (PSU)'}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 font-mono text-[11px] text-cyan-300">
              {currentDepth === 0 ? 'Surface (0m)' : `${currentDepth}m Depth`}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 font-mono text-[11px] text-amber-300">
              Platform: {currentPlatformId}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 font-mono text-[11px] text-purple-300">
              Step {currentTimeIdx + 1}/8 (T+{String(currentTimeIdx * 6).padStart(2, '0')}h)
            </span>
          </div>

          <div className="text-[10px] text-slate-500 font-mono">
            ROMS 4D Hydrodynamics
          </div>
        </div>

        {/* 5. Presets Inquiries Bar */}
        <div className="px-5 py-2 border-b border-slate-800/60 flex flex-wrap items-center gap-1.5 bg-slate-900/80">
          <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
            <span>⚡</span>
            <span>Presets:</span>
          </span>
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              data-testid="assistant-preset-chip"
              onClick={() => handleSubmit(p.query_text)}
              disabled={loading}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-700 hover:border-cyan-700 text-slate-300 transition cursor-pointer disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleSubmit("What is on my screen right now?")}
            disabled={loading}
            className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-purple-950 hover:text-purple-300 border border-slate-700 hover:border-purple-700 text-slate-300 transition cursor-pointer disabled:opacity-50"
          >
            🖥️ Explain Screen
          </button>
        </div>

        {/* 6. Multi-turn Conversational Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-sm bg-slate-900/50">
          {messages.map((msg, mIdx) => {
            const isUser = msg.role === 'user';
            const isLatestAssistant = !isUser && msg.id === latestAssistantMsg?.id;

            return (
              <div
                key={msg.id || mIdx}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 text-sm shrink-0 mt-0.5 select-none shadow">
                    🤖
                  </div>
                )}

                <div className={`max-w-[88%] sm:max-w-[82%] space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Chat Message Bubble */}
                  <div
                    data-testid={isLatestAssistant ? 'assistant-answer-text' : undefined}
                    className={`p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed shadow-lg ${
                      isUser
                        ? 'bg-sky-600 text-white border-sky-500 rounded-br-sm'
                        : 'bg-slate-950/80 text-slate-200 border-slate-800 rounded-bl-sm'
                    }`}
                  >
                    {isUser ? (
                      <p className="m-0 whitespace-pre-wrap font-medium">{msg.content}</p>
                    ) : (
                      <MarkdownRenderer
                        content={msg.content}
                        onActionClick={executeNavigation}
                      />
                    )}
                  </div>

                  {/* Navigation Action Pill (If Assistant Triggered Navigation) */}
                  {!isUser && msg.action && (
                    <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-800 flex items-center justify-between gap-2 shadow-sm text-xs">
                      <div className="flex items-center gap-1.5 text-cyan-300">
                        <span>🚀</span>
                        <span className="font-semibold">Action Triggered:</span>
                        <span className="font-mono text-[11px] text-cyan-200">
                          {msg.action.type.replace(/_/g, ' ')} {msg.action.value ? `(${msg.action.value})` : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => executeNavigation(msg.action)}
                        className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] tracking-wide transition cursor-pointer"
                      >
                        Re-apply Action ↵
                      </button>
                    </div>
                  )}

                  {/* Supporting Grounded Metrics Grid */}
                  {!isUser && msg.metrics && msg.metrics.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Verified Grounded Metrics
                      </span>
                      <div
                        data-testid={isLatestAssistant ? 'assistant-metrics-grid' : undefined}
                        className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                      >
                        {msg.metrics.map((m, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/90 flex flex-col justify-between"
                          >
                            <span className="text-[10px] text-slate-400 font-medium truncate">{m.label}</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <strong className="text-sm font-mono text-cyan-300">{m.value}</strong>
                              {m.unit && <span className="text-[10px] text-slate-400">{m.unit}</span>}
                            </div>
                            {m.hint && <span className="text-[9px] text-slate-500 mt-0.5">{m.hint}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up Suggestions Chips */}
                  {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] text-slate-400 font-medium block mb-1">Suggested Inquiries:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggestions.map((s, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSubmit(s)}
                            disabled={loading}
                            className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-cyan-600 transition cursor-pointer disabled:opacity-50"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Meta timestamp & engine */}
                  <div className={`flex items-center gap-2 text-[9px] text-slate-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span>{msg.timestamp}</span>
                    {!isUser && msg.engineMode && (
                      <>
                        <span>·</span>
                        <span className="font-mono text-cyan-500/80">{msg.engineMode}</span>
                      </>
                    )}
                    {!isUser && msg.latency && (
                      <>
                        <span>·</span>
                        <span className="font-mono">{msg.latency}ms</span>
                      </>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-600/30 text-sky-200 border border-sky-500/40 text-sm shrink-0 mt-0.5 select-none shadow">
                    👤
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing / Loading Spinner */}
          {loading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 text-sm shrink-0 select-none shadow">
                🤖
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
                <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="animate-pulse">
                  {apiKey ? `Evaluating query via ${apiProvider === 'openai' ? 'OpenAI' : 'Gemini'}...` : 'Evaluating grounded model fields & in-situ CTD profiles...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 7. Input Query Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="p-3 sm:p-3.5 border-t border-slate-800 bg-slate-950/80 flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            id="assistant-input"
            data-testid="assistant-input"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask anything or request navigation (e.g. 'Switch to Salinity', 'Largest discrepancy?', 'Explain screen')"
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition shadow-inner"
            disabled={loading}
          />
          <button
            type="submit"
            data-testid="assistant-submit"
            disabled={loading || !inputQuery.trim()}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold tracking-wide transition flex items-center gap-1.5 cursor-pointer shadow-lg disabled:cursor-not-allowed"
          >
            <span>{loading ? 'Thinking...' : 'Send'}</span>
            <span>↵</span>
          </button>
        </form>

        {/* 8. Institutional Policy Disclaimer Footer */}
        <div className="px-5 py-2 bg-slate-950 border-t border-slate-800/40 text-[9px] text-slate-500 flex flex-wrap justify-between items-center gap-2">
          <span>Grounded Ocean Analysis · INCOIS ROMS + In-Situ CTD Network</span>
          <span className="font-mono">
            {apiKey ? `AI: ${apiProvider === 'openai' ? 'OpenAI GPT-4o' : 'Google Gemini 1.5 Flash'}` : 'AI: Built-in Scientific Copilot'}
          </span>
        </div>
      </div>
    </div>
  );
}
