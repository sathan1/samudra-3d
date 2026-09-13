import React, { useState } from 'react';
import { loginUser } from '../services/api';

export default function LoginModal({
  isOpen = false,
  onClose = null,
  currentUser = null,
  onLoginSuccess = null,
  onLogout = null
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setIsError(true);
      setStatusMsg('Please provide both username and password.');
      return;
    }

    setIsLoading(true);
    setStatusMsg('Authenticating credentials with MoES / INCOIS database...');
    setIsError(false);

    try {
      const res = await loginUser({ username: username.trim(), password: password.trim() });
      setStatusMsg(`Authentication successful. Role: ${res.user.role}.`);
      setIsError(false);
      if (onLoginSuccess) {
        onLoginSuccess(res.user, res.access_token);
      }
      setTimeout(() => {
        onClose?.();
      }, 600);
    } catch (err) {
      setIsError(true);
      setStatusMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      if (onLogout) await onLogout();
      setStatusMsg('Signed out successfully.');
      setIsError(false);
      setTimeout(() => {
        onClose?.();
      }, 400);
    } catch (err) {
      setStatusMsg(err.message || 'Sign out encountered an issue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="login-modal-overlay"
      data-testid="login-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(8, 14, 24, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '20px'
      }}
    >
      <div
        className="login-modal-card"
        data-testid="login-modal-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.8)',
          padding: '24px',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              {currentUser ? 'Active Officer Session' : 'Officer Sign In'}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#94a3b8' }}>
              Ministry of Earth Sciences (MoES) / INCOIS Security Registry
            </p>
          </div>
          <button
            type="button"
            data-testid="login-close-btn"
            onClick={onClose}
            aria-label="Close authentication modal"
            style={{
              background: 'transparent',
              border: '1px solid #334155',
              borderRadius: '4px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '12px'
            }}
          >
            ?
          </button>
        </div>

        {currentUser ? (
          <div>
            <div style={{ backgroundColor: '#1e293b', padding: '14px', borderRadius: '6px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{currentUser.display_name}</div>
              <div style={{ fontSize: '11px', color: '#38bdf8', fontFamily: 'monospace', marginTop: '2px' }}>{currentUser.username}</div>
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', fontWeight: 600 }}>
                  ROLE: {currentUser.role}
                </span>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' }}>
                  {currentUser.organization}
                </span>
              </div>
            </div>
            <button
              type="button"
              data-testid="login-signout-btn"
              onClick={handleSignOut}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '9px',
                backgroundColor: '#1e293b',
                border: '1px solid #ef4444',
                borderRadius: '6px',
                color: '#f87171',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Sign Out to Public Viewer Mode
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label htmlFor="modal-officer-id" style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                Username
              </label>
              <input
                id="modal-officer-id"
                data-testid="login-officer-input"
                type="text"
                autoComplete="username"
                placeholder="e.g. admin or officer username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  backgroundColor: '#080e18',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '8px 10px',
                  fontSize: '12px',
                  color: '#f8fafc',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label htmlFor="modal-officer-pass" style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                Password
              </label>
              <input
                id="modal-officer-pass"
                data-testid="login-passphrase-input"
                type="password"
                autoComplete="current-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  backgroundColor: '#080e18',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '8px 10px',
                  fontSize: '12px',
                  color: '#f8fafc',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              data-testid="login-submit-btn"
              disabled={isLoading}
              style={{
                marginTop: '4px',
                padding: '9px',
                backgroundColor: '#0284c7',
                border: 'none',
                borderRadius: '4px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? 'Verifying...' : 'Sign In'}
            </button>
          </form>
        )}

        {statusMsg && (
          <div
            data-testid="login-status-msg"
            style={{
              marginTop: '12px',
              padding: '8px 10px',
              borderRadius: '4px',
              backgroundColor: isError ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              border: `1px solid ${isError ? '#ef4444' : '#10b981'}`,
              color: isError ? '#fca5a5' : '#34d399',
              fontSize: '11px',
              lineHeight: 1.4
            }}
          >
            {statusMsg}
          </div>
        )}

        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e293b', fontSize: '10px', color: '#64748b', textAlign: 'center' }}>
          Authorized Ministry of Earth Sciences / INCOIS personnel only.
        </div>
      </div>
    </div>
  );
}
