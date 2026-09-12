import React from 'react';

export default function Header({
  theme,
  onToggleTheme,
  onOpenAssistant,
  onOpenLogin,
  currentUser = null,
  onLogout = null
}) {
  return (
    <header className="header flex flex-wrap items-center justify-between gap-4">
      <div className="brand flex items-center gap-3">
        <span className="brand-mark" aria-hidden="true">≈</span>
        <div>
          <span className="brand-name">SAMUDRA<span className="text-ocean">-3D</span></span>
          <p className="brand-subtitle">4D Ocean Digital Twin & Intelligence</p>
        </div>
      </div>
      <div className="header-actions flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="open-assistant-btn"
          className="hud-button flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50 hover:text-white font-medium text-xs cursor-pointer"
          onClick={onOpenAssistant}
          title="Open Grounded AI Ocean Assistant (Alt+A)"
        >
          <span aria-hidden="true">✧</span>
          <span>AI Ocean Assistant</span>
        </button>

        {currentUser ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="open-login-btn"
              className="hud-button flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/40 text-white font-medium text-xs cursor-pointer hover:border-cyan-400"
              onClick={onOpenLogin}
              title="View Officer Credentials and Operational Clearance"
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-950"
                style={{ backgroundColor: currentUser.badge_color || '#00f5d4' }}
              >
                {currentUser.avatar_initials || 'IN'}
              </span>
              <span>{currentUser.display_name}</span>
              <span
                className="px-1.5 py-0.2 rounded text-[9px] font-mono tracking-wider font-semibold border"
                style={{
                  color: currentUser.badge_color || '#00f5d4',
                  borderColor: `${currentUser.badge_color || '#00f5d4'}44`
                }}
              >
                {currentUser.clearance?.replace('LEVEL-', 'L-') || 'L-3'}
              </span>
            </button>
            <button
              type="button"
              data-testid="header-signout-btn"
              className="hud-button px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 hover:bg-red-900/40 hover:text-white font-medium text-xs cursor-pointer"
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
            className="hud-button flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 font-medium text-xs cursor-pointer"
            onClick={onOpenLogin}
            title="Open MoES/INCOIS Operational Authentication Portal"
          >
            <span aria-hidden="true">⏣</span>
            <span>Officer Portal</span>
          </button>
        )}

        <span className="connection">
          <span className="status-dot" aria-hidden="true" />
          Data connected
        </span>
        <button className="theme-button" type="button" aria-pressed={theme === 'light'} onClick={onToggleTheme}>
          Light theme
        </button>
      </div>
    </header>
  );
}
