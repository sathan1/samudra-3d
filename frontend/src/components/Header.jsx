import React from 'react';

export default function Header({
  theme,
  onToggleTheme,
  onOpenAssistant,
  onOpenSources,
  onOpenLogin,
  onOpenRegisterSensor = null,
  onOpenAdminUsers = null,
  currentUser = null,
  onLogout = null,
  onNavigate = null,
  viewMode = 'globe',
  onViewModeChange = null,
  onApplyPreset = null
}) {
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <header className="header flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
      <div className="brand flex items-center gap-3">
        <span className="brand-mark" aria-hidden="true">≈</span>
        <div>
          <span className="brand-name font-bold tracking-wide">SAMUDRA<span className="text-ocean">-3D</span></span>
          <p className="brand-subtitle text-[11px] text-slate-400 m-0">MoES / INCOIS Operational Ocean Digital Twin</p>
        </div>
      </div>

      {/* Middle Center: View Mode Toggle & Operational Presets */}
      <div className="header-center flex flex-wrap items-center gap-3">
        {/* View Mode Toggle */}
        <div className="view-mode-toggle flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 shadow-sm">
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${viewMode === 'globe' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => onViewModeChange?.('globe')}
            title="Switch to Global 3D Earth Globe View"
            data-testid="viewmode-globe-btn"
          >
            <span aria-hidden="true">🌍</span>
            <span>Global Globe</span>
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${viewMode === 'block' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => onViewModeChange?.('block')}
            title="Switch to Regional 3D Ocean Volume Block (Northern Indian Ocean 0-25°N, 65-95°E)"
            data-testid="viewmode-block-btn"
          >
            <span aria-hidden="true">📦</span>
            <span>3D Ocean Volume Block</span>
          </button>
        </div>

        {/* Operational Presets */}
        <div className="operational-presets flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mr-1 hidden sm:inline">Scenarios:</span>
          <button
            type="button"
            className="preset-btn px-2 py-0.5 text-xs font-medium rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-200 flex items-center gap-1 transition"
            onClick={() => onApplyPreset?.('cyclone')}
            title="Tropical Cyclone & Heat Potential (TCHP) Scenario"
            data-testid="preset-cyclone-btn"
          >
            <span aria-hidden="true">🌀</span>
            <span>Cyclone / TCHP</span>
          </button>
          <button
            type="button"
            className="preset-btn px-2 py-0.5 text-xs font-medium rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-200 flex items-center gap-1 transition"
            onClick={() => onApplyPreset?.('sar')}
            title="Search & Rescue Maritime Currents Drift Scenario"
            data-testid="preset-sar-btn"
          >
            <span aria-hidden="true">🚢</span>
            <span>Search & Rescue</span>
          </button>
          <button
            type="button"
            className="preset-btn px-2 py-0.5 text-xs font-medium rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-200 flex items-center gap-1 transition"
            onClick={() => onApplyPreset?.('fishery')}
            title="Fishery & Mixed Layer Depth (MLD) Upwelling Scenario"
            data-testid="preset-fishery-btn"
          >
            <span aria-hidden="true">🐟</span>
            <span>Fishery / MLD</span>
          </button>
        </div>
      </div>
      <div className="header-actions flex flex-wrap items-center gap-2.5">
        {isAdmin && (
          <button
            type="button"
            data-testid="header-admin-portal-btn"
            className="header-action-btn admin-portal-btn"
            onClick={() => onNavigate ? onNavigate('/admin') : onOpenAdminUsers?.()}
            title="Open SAMUDRA-3D Administration & User Directory"
            style={{ backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 600 }}
          >
            <span aria-hidden="true">⚙️</span>
            <span>Admin Portal</span>
          </button>
        )}

        <button
          type="button"
          data-testid="header-register-sensor-btn"
          className="header-action-btn register-sensor-btn"
          onClick={onOpenRegisterSensor}
          title="Register a new ocean sensor platform (Argo float, Glider, Moored buoy)"
        >
          <span aria-hidden="true">🛰️</span>
          <span>Register Sensor</span>
        </button>

        <button
          type="button"
          data-testid="open-assistant-btn"
          className="header-action-btn assistant-btn"
          onClick={onOpenAssistant}
          title="Open Grounded AI Ocean Assistant (Alt+A)"
        >
          <span aria-hidden="true">✧</span>
          <span>AI Ocean Assistant</span>
        </button>

        <button
          type="button"
          className="header-secondary-action"
          onClick={onOpenSources}
          title="Browse the official data sources used by SAMUDRA-3D"
        >
          Data sources
        </button>

        {currentUser ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="open-login-btn"
              className="officer-badge-btn"
              onClick={onOpenLogin}
              title="View Officer Profile & Active Clearance"
            >
              <span
                className="avatar-chip"
                style={{ backgroundColor: currentUser.badge_color || '#0284c7' }}
              >
                {currentUser.avatar_initials || (currentUser.display_name ? currentUser.display_name.charAt(0) : 'IN')}
              </span>
              <span className="officer-name">{currentUser.display_name}</span>
              <span
                className="clearance-pill"
                style={{
                  color: '#38bdf8',
                  borderColor: 'rgba(56, 189, 248, 0.4)'
                }}
              >
                {currentUser.role}
              </span>
            </button>
            <button
              type="button"
              data-testid="header-signout-btn"
              className="signout-btn"
              onClick={onLogout}
              title="Sign Out to Public Viewer Mode"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="open-login-btn"
            className="officer-login-btn"
            onClick={onOpenLogin}
            title="Sign in with MoES/INCOIS Officer Credentials"
          >
            <span aria-hidden="true">🔒</span>
            <span>Sign In</span>
          </button>
        )}

        <span className="connection">
          <span className="status-dot" aria-hidden="true" />
          Connected
        </span>
        <button className="theme-button" type="button" aria-pressed={theme === 'light'} onClick={onToggleTheme}>
          Light theme
        </button>
      </div>
    </header>
  );
}
