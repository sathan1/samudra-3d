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
  onLogout = null
}) {
  return (
    <header className="header flex flex-wrap items-center justify-between gap-4">
      <div className="brand flex items-center gap-3">
        <span className="brand-mark" aria-hidden="true">≈</span>
        <div>
          <span className="brand-name">SAMUDRA<span className="text-ocean">-3D</span></span>
          <p className="brand-subtitle">MoES / INCOIS Ocean Digital Twin Portal</p>
        </div>
      </div>
      <div className="header-actions flex flex-wrap items-center gap-2.5">
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
          data-testid="header-admin-users-btn"
          className="header-action-btn admin-users-btn"
          onClick={onOpenAdminUsers}
          title="View user directory and manage officer accounts"
        >
          <span aria-hidden="true">👥</span>
          <span>Users & Admin</span>
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
              title="View Officer Credentials and Operational Clearance"
            >
              <span
                className="avatar-chip"
                style={{ backgroundColor: currentUser.badge_color || '#00f5d4' }}
              >
                {currentUser.avatar_initials || 'IN'}
              </span>
              <span className="officer-name">{currentUser.display_name}</span>
              <span
                className="clearance-pill"
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
            title="Open MoES/INCOIS Operational Authentication Portal"
          >
            <span aria-hidden="true">⏣</span>
            <span>Officer Portal</span>
          </button>
        )}

        <span className="connection">
          <span className="status-dot" aria-hidden="true" />
          Live Data
        </span>
        <button className="theme-button" type="button" aria-pressed={theme === 'light'} onClick={onToggleTheme}>
          Light theme
        </button>
      </div>
    </header>
  );
}
