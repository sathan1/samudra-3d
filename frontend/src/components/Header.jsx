import React from 'react';
import { PRECISION_OCEAN_PLACES } from '../utils/graticules.js';

export const PRECISION_OCEAN_SECTORS = [
  {
    group: 'Macro Basin (Level 1)',
    options: PRECISION_OCEAN_PLACES.filter((p) => p.level === 1).map((p) => ({
      id: p.id,
      name: `${p.name} [${p.tag}]`,
      lat: p.lat,
      lon: p.lon,
      dist: p.peakDist || 210,
      level: 'Macro'
    }))
  },
  {
    group: 'Regional Sub-Basin (Level 2)',
    options: PRECISION_OCEAN_PLACES.filter((p) => p.level === 2).map((p) => ({
      id: p.id,
      name: `${p.name} [${p.tag}]`,
      lat: p.lat,
      lon: p.lon,
      dist: p.peakDist || 160,
      level: 'Sub-Basin'
    }))
  },
  {
    group: 'Coastal Maritime Zone (Level 3)',
    options: PRECISION_OCEAN_PLACES.filter((p) => p.level === 3).map((p) => ({
      id: p.id,
      name: `${p.name} [${p.tag}]`,
      lat: p.lat,
      lon: p.lon,
      dist: p.peakDist || 130,
      level: 'Coastal'
    }))
  },
  {
    group: 'Local Maritime Sector / Harbor / PFZ (Level 4)',
    options: PRECISION_OCEAN_PLACES.filter((p) => p.level === 4).map((p) => ({
      id: p.id,
      name: `${p.name} [${p.tag}]`,
      lat: p.lat,
      lon: p.lon,
      dist: p.peakDist || 114,
      level: 'Local Sector'
    }))
  }
];

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
  onApplyPreset = null,
  onOpenComparison = null,
  activeDataset = null,
  onOpenDatasetsModal = null,
  onOpenFishermanModal = null,
  onOpenCycloneModal = null,
  onOpenInDepthAnalysis = null,
  onSelectRegion = null,
  selectedSectorId = 'macro-nio'
}) {
  const isAdmin = currentUser?.role === 'ADMIN';
  const isReal = activeDataset?.source_mode === 'REAL_LOCAL';

  return (
    <header className="header flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
      
      {/* Brand & Provenance Mode Badge */}
      <div className="brand flex items-center gap-3">
        <span className="brand-mark" aria-hidden="true">≈</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="brand-name font-bold tracking-wide">SAMUDRA<span className="text-ocean">-3D</span></span>
            {isReal ? (
              <button
                type="button"
                onClick={onOpenDatasetsModal}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 border border-emerald-500/70 text-emerald-300 hover:bg-emerald-900 transition"
                title="Active Source: Real Copernicus Marine GLORYS12V1 (~8.3 km grid). Click to manage datasets."
                data-testid="dataset-badge-real"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>REAL • COPERNICUS GLORYS (~8.3 km)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenDatasetsModal}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/90 border border-amber-500/70 text-amber-300 hover:bg-amber-900 transition"
                title="Active Source: Synthetic ROMS Baseline. Click to switch to Real Copernicus GLORYS12V1."
                data-testid="dataset-badge-synthetic"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>SYNTHETIC • ROMS (~55 km)</span>
              </button>
            )}
            <span
              className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-950/80 border border-sky-600/50 text-sky-300"
              title="Real In-situ Fleet: 387 Authentic Argo GDAC Profiles, IMOS Ningaloo Underwater Glider, OceanSITES & INCOIS Moored Buoys"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>387 REAL ARGO • GLIDERS • BUOYS</span>
            </span>
          </div>
          <p className="brand-subtitle text-[11px] text-slate-400 m-0">MoES / INCOIS Operational Ocean Digital Twin</p>
        </div>
      </div>

      {/* Middle Center: View Mode Toggle, Hierarchical Precision Sector Zoom & Presets */}
      <div className="header-center flex flex-wrap items-center gap-2.5">
        
        {/* View Mode Toggle */}
        <div className="view-mode-toggle flex items-center bg-slate-900 border border-slate-700 rounded p-0.5">
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded transition flex items-center gap-1.5 ${viewMode === 'globe' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => onViewModeChange?.('globe')}
            title="Switch to Global 3D Earth Globe View"
            data-testid="viewmode-globe-btn"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path strokeWidth="2" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
            <span>Global Globe</span>
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded transition flex items-center gap-1.5 ${viewMode === 'block' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => onViewModeChange?.('block')}
            title="Switch to Regional 3D Ocean Volume Block (Northern Indian Ocean 0-25°N, 65-95°E)"
            data-testid="viewmode-block-btn"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            <span>3D Ocean Volume Block</span>
          </button>
        </div>

        {/* Hierarchical Precision Ocean Sector Dropdown */}
        <div className="precision-zoom flex items-center bg-slate-900 border border-slate-700 rounded px-2 py-0.5">
          <span className="text-[10px] text-slate-400 uppercase font-mono mr-1.5 hidden xl:inline">Precision Zoom:</span>
          <select
            value={selectedSectorId}
            onChange={(e) => {
              const found = PRECISION_OCEAN_SECTORS.flatMap(g => g.options).find(o => o.id === e.target.value);
              if (found && onSelectRegion) onSelectRegion(found);
            }}
            className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer py-1 max-w-[200px]"
            title="Hierarchical Ocean Zoom: Macro Basin -> Sub-Basin -> Coastal Zone -> Local Maritime Sector / PFZ"
            data-testid="precision-sector-dropdown"
          >
            {PRECISION_OCEAN_SECTORS.map(group => (
              <optgroup key={group.group} label={group.group} className="bg-slate-900 text-slate-400">
                {group.options.map(opt => (
                  <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">
                    {opt.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Operational Scenarios & Specialized Modals */}
        <div className="operational-presets flex items-center gap-1 bg-slate-900 border border-slate-800 rounded px-2 py-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mr-1 hidden sm:inline">Scenarios:</span>
          <button
            type="button"
            className="preset-btn px-2 py-0.5 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
            onClick={() => {
              onApplyPreset?.('cyclone');
              if (onOpenCycloneModal) onOpenCycloneModal();
            }}
            title="Open Tropical Cyclone & Heat Potential (TCHP) Intelligence"
            data-testid="preset-cyclone-btn"
          >
            🌀 Cyclone / TCHP
          </button>
          <button
            type="button"
            className="preset-btn px-2 py-0.5 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
            onClick={() => onApplyPreset?.('sar')}
            title="Search & Rescue Maritime Currents Drift Scenario"
            data-testid="preset-sar-btn"
          >
            🚢 Search & Rescue
          </button>
          <button
            type="button"
            className="preset-btn px-2 py-0.5 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
            onClick={() => {
              onApplyPreset?.('fishery');
              if (onOpenFishermanModal) onOpenFishermanModal();
            }}
            title="Open Fisherman Mode & Potential Fishing Zone (PFZ) Advisory"
            data-testid="preset-fishery-btn"
          >
            🐟 Fishery / PFZ
          </button>
        </div>
      </div>

      {/* Header Actions */}
      <div className="header-actions flex flex-wrap items-center gap-2">
        {isAdmin && (
          <button
            type="button"
            data-testid="header-admin-portal-btn"
            className="header-action-btn admin-portal-btn"
            onClick={() => onNavigate ? onNavigate('/admin') : onOpenAdminUsers?.()}
            title="Open SAMUDRA-3D Administration & User Directory"
            style={{ backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 600 }}
          >
            <span>Admin Portal</span>
          </button>
        )}

        <button
          type="button"
          data-testid="header-datasets-btn"
          className="header-action-btn datasets-btn"
          onClick={onOpenDatasetsModal}
          title="Open Ocean Dataset Manager & Download Volume Estimator"
          style={{
            backgroundColor: isReal ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            border: isReal ? '1px solid #10b981' : '1px solid #f59e0b',
            color: isReal ? '#34d399' : '#fbbf24',
            fontWeight: 600
          }}
        >
          <span>📁 Datasets</span>
        </button>

        <button
          type="button"
          data-testid="header-register-sensor-btn"
          className="header-action-btn register-sensor-btn"
          onClick={onOpenRegisterSensor}
          title="Register a new ocean sensor platform (Argo float, Glider, Moored buoy)"
        >
          <span>Register Sensor</span>
        </button>

        <button
          type="button"
          data-testid="open-assistant-btn"
          className="header-action-btn assistant-btn"
          onClick={onOpenAssistant}
          title="Open Grounded AI Ocean Assistant (Alt+A)"
        >
          <span>AI Ocean Assistant</span>
        </button>

        <button
          type="button"
          data-testid="header-compare-btn"
          className="header-action-btn compare-btn"
          onClick={onOpenComparison}
          title="Open Model Prediction vs Observation Comparison Suite"
          style={{
            backgroundColor: 'rgba(2, 132, 199, 0.15)',
            border: '1px solid #0284c7',
            color: '#38bdf8',
            fontWeight: 600
          }}
        >
          <span>📊 Compare Prediction vs Obs</span>
        </button>

        <button
          type="button"
          data-testid="header-in-depth-btn"
          className="header-action-btn in-depth-btn"
          onClick={onOpenInDepthAnalysis}
          title="Open In-Depth Ocean Physical & Acoustic Analysis Engine (EOS-80, Mackenzie SVP, SOFAR Channel Axis, N² Stability)"
          style={{
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid #6366f1',
            color: '#a5b4fc',
            fontWeight: 600
          }}
        >
          <span>🌊 In-Depth Physics</span>
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
