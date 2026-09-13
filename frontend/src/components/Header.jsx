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
  onNavigate = null
}) {
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <header className="header flex flex-wrap items-center justify-between gap-4">
      <div className="brand flex items-center gap-3">
        <span className="brand-mark" aria-hidden="true">≈</span>
        <div>
          <span className="brand-name">SAMUDRA<span className="text-ocean">-3D</span></span>
          <p className="brand-subtitle">MoES / INCOIS Operational Ocean Digital Twin</p>
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
            onClick={() => onNavigate ? onNavigate('/login') : onOpenLogin?.()}
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
