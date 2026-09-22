import React, { useState, useRef, useEffect } from 'react';
import { PRECISION_OCEAN_PLACES } from '../utils/graticules.js';

/**
 * Header - Professional Scientific Workstation Top Bar
 * Adheres to Master Prompt §2, §3, §24.
 * 
 * Top-left: SAMUDRA-3D / Ocean Intelligence Platform
 * Center: Global Search Box + Clean Primary Navigation (EXPLORE, OBSERVATIONS, ANALYSIS, DATA, OPERATIONS)
 * Right: User Session, Institutional Clearance, and Administration
 */
export default function Header({
  currentUser = null,
  activeDataset = null,
  viewMode: _viewMode = 'globe',
  onViewModeChange = null,
  onOpenAssistant = null,
  onOpenSources = null,
  onOpenDatasetsModal = null,
  onOpenObservationDrawer = null,
  onOpenComparison = null,
  onOpenFishermanModal = null,
  onOpenCycloneModal = null,
  onOpenInDepthAnalysis = null,
  onSelectRegion = null,
  onNavigate = null,
  onLogout = null
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenu, setActiveMenu] = useState(null); // 'EXPLORE' | 'OBSERVATIONS' | 'ANALYSIS' | 'DATA' | 'OPERATIONS' | 'USER' | null
  const [searchResults, setSearchResults] = useState([]);
  const menuRef = useRef(null);

  const isAdmin = currentUser?.role === 'ADMIN';
  const isReal = activeDataset?.source_mode === 'REAL_LOCAL';

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Search Handler (supports place name, lat/lon coords, and WMO ID)
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    const q = val.toLowerCase().trim();

    // 1. Check if coordinate query (e.g. "13.25, 80.31" or "13.25 80.31")
    const coordMatch = q.match(/^([-+]?\d*\.?\d+)[,\s]+([-+]?\d*\.?\d+)$/);
    const results = [];

    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        results.push({
          id: `coord-${lat}-${lon}`,
          name: `Coordinate: ${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E`,
          lat,
          lon,
          dist: 110,
          type: 'coordinate'
        });
      }
    }

    // 2. Check places from graticules
    for (const p of PRECISION_OCEAN_PLACES) {
      if (p.name.toLowerCase().includes(q) || (p.tag && p.tag.toLowerCase().includes(q))) {
        results.push({
          id: p.id,
          name: `${p.name} [${p.tag || 'Sector'}]`,
          lat: p.lat,
          lon: p.lon,
          dist: p.peakDist || 140,
          type: 'place'
        });
      }
    }

    setSearchResults(results.slice(0, 6));
  };

  const handleSelectSearchResult = (res) => {
    if (onSelectRegion) {
      onSelectRegion(res);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const toggleMenu = (menuName) => {
    setActiveMenu((prev) => (prev === menuName ? null : menuName));
  };

  return (
    <header className="header scientific-header glassmorphic-panel" ref={menuRef}>
      {/* 1. Left: Brand & Institution */}
      <div className="brand flex items-center gap-3">
        <span className="brand-mark text-ocean-bright font-mono text-xl" aria-hidden="true">≈</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="brand-name font-bold tracking-wider text-sm text-white">
              SAMUDRA<span className="text-ocean-bright">-3D</span>
            </span>
            <span className="badge-platform-title text-[9px] font-mono uppercase bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
              Workstation
            </span>
          </div>
          <p className="brand-subtitle text-[10px] text-slate-400 m-0 font-sans">
            MoES / INCOIS Ocean Intelligence
          </p>
        </div>
      </div>

      {/* 2. Global Search Box */}
      <div className="search-container relative max-w-xs w-full hidden md:block">
        <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-full px-3 py-1 text-xs text-white focus-within:border-sky-400 transition">
          <span className="text-slate-400 mr-2" aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder="Search location, lat,lon or WMO..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="bg-transparent border-none outline-none text-xs w-full text-slate-200 placeholder-slate-500"
            aria-label="Search ocean location or coordinates"
          />
        </div>

        {searchResults.length > 0 && (
          <div className="search-results-dropdown glassmorphic-panel absolute left-0 right-0 top-full mt-1.5 z-50 rounded-lg shadow-2xl p-1 max-h-60 overflow-y-auto">
            {searchResults.map((r) => (
              <button
                key={r.id}
                type="button"
                className="w-full text-left px-3 py-1.5 rounded text-xs text-slate-200 hover:bg-sky-950/80 hover:text-sky-300 font-mono flex items-center justify-between transition"
                onClick={() => handleSelectSearchResult(r)}
              >
                <span>{r.name}</span>
                <span className="text-[10px] text-slate-500">{r.lat.toFixed(1)}°, {r.lon.toFixed(1)}°</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Center: Primary Navigation */}
      <nav className="primary-nav flex items-center gap-1" aria-label="Main Navigation">
        {/* EXPLORE */}
        <div className="nav-item relative">
          <button
            type="button"
            className={`nav-link-btn ${activeMenu === 'EXPLORE' ? 'active' : ''}`}
            onClick={() => toggleMenu('EXPLORE')}
            aria-expanded={activeMenu === 'EXPLORE'}
          >
            EXPLORE ▾
          </button>
          {activeMenu === 'EXPLORE' && (
            <div className="nav-dropdown-menu glassmorphic-panel">
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  onViewModeChange?.('globe');
                  setActiveMenu(null);
                }}
              >
                <span className="icon">🌍</span>
                <div>
                  <div className="title">Global 3D Earth Globe</div>
                  <div className="desc">Photorealistic solid Earth with depth raycasting</div>
                </div>
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  onViewModeChange?.('block');
                  setActiveMenu(null);
                }}
              >
                <span className="icon">📦</span>
                <div>
                  <div className="title">3D Ocean Volume Block</div>
                  <div className="desc">Regional vertical depth curtains & ODV slices</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* OBSERVATIONS */}
        <div className="nav-item">
          <button
            type="button"
            className="nav-link-btn"
            onClick={() => {
              onOpenObservationDrawer && onOpenObservationDrawer();
              setActiveMenu(null);
            }}
          >
            OBSERVATIONS
          </button>
        </div>

        {/* ANALYSIS */}
        <div className="nav-item relative">
          <button
            type="button"
            className={`nav-link-btn ${activeMenu === 'ANALYSIS' ? 'active' : ''}`}
            onClick={() => toggleMenu('ANALYSIS')}
            aria-expanded={activeMenu === 'ANALYSIS'}
          >
            ANALYSIS ▾
          </button>
          {activeMenu === 'ANALYSIS' && (
            <div className="nav-dropdown-menu glassmorphic-panel">
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  onOpenComparison && onOpenComparison();
                  setActiveMenu(null);
                }}
              >
                <span className="icon">⚖️</span>
                <div>
                  <div className="title">Model vs Observation</div>
                  <div className="desc">Trilinear collocation, Bias, MAE, RMSE, Pearson R</div>
                </div>
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  onOpenInDepthAnalysis && onOpenInDepthAnalysis();
                  setActiveMenu(null);
                }}
              >
                <span className="icon">🔬</span>
                <div>
                  <div className="title">Deep Ocean Physics & Acoustics</div>
                  <div className="desc">EOS-80, SOFAR channel, Mackenzie sound speed</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* DATA */}
        <div className="nav-item relative">
          <button
            type="button"
            className={`nav-link-btn ${activeMenu === 'DATA' ? 'active' : ''}`}
            onClick={() => toggleMenu('DATA')}
            aria-expanded={activeMenu === 'DATA'}
          >
            DATA ▾
          </button>
          {activeMenu === 'DATA' && (
            <div className="nav-dropdown-menu glassmorphic-panel">
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  onOpenDatasetsModal && onOpenDatasetsModal();
                  setActiveMenu(null);
                }}
              >
                <span className="icon">📁</span>
                <div>
                  <div className="title">Dataset Registry & Downloads</div>
                  <div className="desc">Manage Copernicus GLORYS and subset volume estimator</div>
                </div>
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  onOpenSources && onOpenSources();
                  setActiveMenu(null);
                }}
              >
                <span className="icon">📜</span>
                <div>
                  <div className="title">Data Sources & Provenance</div>
                  <div className="desc">View official CF-1.8 NetCDF4 specifications</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* OPERATIONS */}
        <div className="nav-item relative">
          <button
            type="button"
            className={`nav-link-btn ${activeMenu === 'OPERATIONS' ? 'active' : ''}`}
            onClick={() => toggleMenu('OPERATIONS')}
            aria-expanded={activeMenu === 'OPERATIONS'}
          >
            OPERATIONS ▾
          </button>
          {activeMenu === 'OPERATIONS' && (
            <div className="nav-dropdown-menu glassmorphic-panel">
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  onOpenFishermanModal && onOpenFishermanModal();
                  setActiveMenu(null);
                }}
              >
                <span className="icon">🐟</span>
                <div>
                  <div className="title">Fisherman View</div>
                  <div className="desc">SST, currents, coastal harbors, and PFZ status</div>
                </div>
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  onOpenCycloneModal && onOpenCycloneModal();
                  setActiveMenu(null);
                }}
              >
                <span className="icon">🌀</span>
                <div>
                  <div className="title">Cyclone & Marine Conditions</div>
                  <div className="desc">TCHP, D26, MLD, and atmospheric track correlation</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* 4. Right: AI Assistant Trigger & User Session */}
      <div className="header-right flex items-center gap-3">
        {/* Source Badge */}
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenDatasetsModal}
          className={`source-badge-pill ${isReal ? 'real' : 'synthetic'} hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase cursor-pointer hover:opacity-90 transition`}
          title={`Active dataset: ${activeDataset?.name || 'Copernicus GLORYS12V1'} (Click to manage datasets)`}
        >
          <span className="dot" aria-hidden="true" />
          <span>{isReal ? 'REAL • COPERNICUS GLORYS12V1 (~8.3 km)' : 'SYNTHETIC • DEVELOPMENT'}</span>
        </div>

        {/* AI Assistant Button */}
        <button
          type="button"
          className="ai-assistant-header-btn flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-950/80 border border-sky-600/60 text-sky-300 hover:bg-sky-900 transition"
          onClick={onOpenAssistant}
          title="Ask SAMUDRA Scientific AI Assistant (Alt+A)"
        >
          <span className="sparkle" aria-hidden="true">✦</span>
          <span>Ask SAMUDRA</span>
        </button>

        {/* User Session & Menu */}
        <div className="user-menu relative">
          <button
            type="button"
            className="user-profile-btn flex items-center gap-2 p-1 rounded-full hover:bg-slate-800/80 transition"
            onClick={() => toggleMenu('USER')}
            aria-label="User account and clearance"
          >
            <span
              className="user-avatar-circle flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white shadow"
              style={{ backgroundColor: currentUser?.badge_color || '#0284c7' }}
            >
              {currentUser?.avatar_initials || (currentUser?.username ? currentUser.username.slice(0, 2).toUpperCase() : 'US')}
            </span>
          </button>

          {activeMenu === 'USER' && (
            <div className="user-dropdown-menu glassmorphic-panel absolute right-0 mt-2 w-56 rounded-lg p-2 shadow-2xl z-50">
              <div className="user-info-card p-2 border-b border-slate-700/60 mb-2">
                <div className="font-bold text-xs text-white">
                  {currentUser?.full_name || currentUser?.username || 'Researcher'}
                </div>
                <div className="text-[10px] font-mono text-sky-400 mt-0.5">
                  {currentUser?.clearance_level || 'LEVEL-1 RESEARCH'}
                </div>
                <div className="text-[10px] text-slate-400">
                  Role: {currentUser?.role || 'VIEWER'}
                </div>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  className="dropdown-link-btn w-full text-left px-2 py-1.5 text-xs text-slate-200 hover:bg-sky-950/60 rounded flex items-center gap-2"
                  onClick={() => {
                    onNavigate?.('/admin');
                    setActiveMenu(null);
                  }}
                >
                  <span>⚙️</span>
                  <span>Administration Portal</span>
                </button>
              )}

              <button
                type="button"
                className="dropdown-link-btn w-full text-left px-2 py-1.5 text-xs text-rose-300 hover:bg-rose-950/60 rounded flex items-center gap-2 mt-1"
                onClick={() => {
                  onLogout && onLogout();
                  setActiveMenu(null);
                }}
              >
                <span>🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
