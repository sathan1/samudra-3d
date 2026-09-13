import React, { useState } from 'react';
import { loginUser } from '../services/api';

export default function LoginPage({ onLoginSuccess, onNavigate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please provide both username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await loginUser({ username: username.trim(), password: password.trim() });
      if (res && res.access_token) {
        if (onLoginSuccess) {
          onLoginSuccess(res.user, res.access_token);
        }
        if (onNavigate) {
          onNavigate('/app');
        } else if (typeof window !== 'undefined') {
          window.location.pathname = '/app';
        }
      } else {
        setErrorMsg('Authentication did not return a valid session token.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid credentials or account is disabled.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    if (onNavigate) {
      onNavigate('/app');
    } else if (typeof window !== 'undefined') {
      window.location.pathname = '/app';
    }
  };

  return (
    <div
      className="login-page-container"
      data-testid="login-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#080e18',
        color: '#f8fafc',
        padding: '24px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden'
        }}
      >
        {/* Institutional Header Banner */}
        <div
          style={{
            padding: '24px 28px 20px 28px',
            backgroundColor: '#131e33',
            borderBottom: '1px solid #1e293b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '24px', color: '#38bdf8' }}>?</span>
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em', color: '#f8fafc' }}>
                SAMUDRA<span style={{ color: '#38bdf8' }}>-3D</span>
              </h1>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Operational Ocean Information System
              </p>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
            Ministry of Earth Sciences (MoES) / INCOIS Digital Twin Portal. Authorized access for oceanographers, naval officers, and administrators.
          </p>
        </div>

        {/* Login Form */}
        <div style={{ padding: '28px' }}>
          {errorMsg && (
            <div
              data-testid="login-error-msg"
              role="alert"
              style={{
                marginBottom: '18px',
                padding: '12px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #ef4444',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#fca5a5',
                lineHeight: 1.4
              }}
            >
              <strong>Authentication Error:</strong> {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label
                htmlFor="login-username"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}
              >
                Username or Official Email
              </label>
              <input
                id="login-username"
                data-testid="login-username-input"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or officer username"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#080e18',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#f8fafc',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}
              >
                Password
              </label>
              <input
                id="login-password"
                data-testid="login-password-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#080e18',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#f8fafc',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              data-testid="login-submit-btn"
              disabled={isLoading}
              style={{
                marginTop: '6px',
                padding: '11px',
                backgroundColor: '#0284c7',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#ffffff',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'background-color 0.15s ease'
              }}
            >
              {isLoading ? 'Verifying Credentials...' : 'Sign In to Portal'}
            </button>
          </form>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #1e293b', textAlign: 'center' }}>
            <button
              type="button"
              data-testid="guest-continue-btn"
              onClick={handleContinueAsGuest}
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Continue to Ocean Map as Public Viewer ?
            </button>
          </div>
        </div>

        {/* Institutional Footer */}
        <div
          style={{
            padding: '14px 28px',
            backgroundColor: '#0a101f',
            borderTop: '1px solid #1e293b',
            fontSize: '11px',
            color: '#64748b',
            lineHeight: 1.4,
            textAlign: 'center'
          }}
        >
          <span>Authorized MoES/INCOIS personnel only. Access attempts are audited in persistent database security logs.</span>
        </div>
      </div>
    </div>
  );
}
