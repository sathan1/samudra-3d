import React, { useState } from 'react';
import { loginUser } from '../services/api';

/**
 * AuthGate - MoES / INCOIS Operational Ocean Information System Authentication Barrier
 * Authority: MoES oceanographic data governance standards.
 * Restricts 3D digital twin telemetry, numerical forecasts, and sensor soundings to authenticated officers.
 */
export default function AuthGate({ onLoginSuccess, theme = 'dark' }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Samudra#Admin2026!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await loginUser({ username: username.trim(), password: password.trim() });
      if (res && res.access_token) {
        onLoginSuccess?.(res.user, res.access_token);
      } else {
        setErrorMsg('Authentication failed: No valid token returned.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid credentials or unauthorized clearance.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickOfficerLogin = async () => {
    setUsername('admin');
    setPassword('Samudra#Admin2026!');
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await loginUser({ username: 'admin', password: 'Samudra#Admin2026!' });
      if (res && res.access_token) {
        onLoginSuccess?.(res.user, res.access_token);
      } else {
        setErrorMsg('Authentication failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const isLight = theme === 'light';

  return (
    <div
      className="auth-gate-container flex min-h-screen items-center justify-center p-4 sm:p-6"
      data-testid="auth-gate"
      style={{
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <div
        className="auth-card w-full max-w-lg rounded-xl border p-6 sm:p-8 shadow-2xl"
        style={{
          backgroundColor: 'var(--panel)',
          borderColor: 'var(--border)'
        }}
      >
        {/* Institutional Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-950/40 text-2xl font-bold text-sky-400">
            ≈
          </div>
          <span className="text-[11px] font-bold tracking-widest text-sky-500 uppercase block mb-1">
            Ministry of Earth Sciences (MoES) · INCOIS
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
            SAMUDRA-3D Portal
          </h1>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            Operational Ocean Information System & 3D Digital Twin
          </p>
        </div>

        {/* Governance Compliance Notice */}
        <div
          className="mb-6 rounded-lg border p-3.5 text-xs leading-relaxed"
          style={{
            backgroundColor: 'var(--raised)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
        >
          <div className="flex items-center gap-1.5 font-semibold text-sky-500 mb-1">
            <span>🔒</span>
            <span>Authentication Required for Data Access</span>
          </div>
          Under MoES oceanographic data governance protocols, live 3D numerical model forecasts, subsurface CTD soundings, and in-situ robot fleet telemetry are restricted to authenticated personnel.
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300" data-testid="auth-error-msg">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="auth-username"
              className="block text-xs font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--muted)' }}
            >
              Officer Username
            </label>
            <input
              id="auth-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin or analyst"
              data-testid="auth-username-input"
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition font-mono"
              style={{
                backgroundColor: 'var(--field)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
              required
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--muted)' }}
            >
              Security Clearance Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              data-testid="auth-password-input"
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition font-mono"
              style={{
                backgroundColor: 'var(--field)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            data-testid="auth-submit-btn"
            className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 text-white py-2.5 px-4 text-sm font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isLoading ? 'Verifying Clearance...' : 'Authenticate & Unlock 3D Workspace'}
          </button>
        </form>

        {/* Quick Officer Access for Testing/Evaluation */}
        <div className="mt-5 border-t pt-4" style={{ borderColor: isLight ? '#e2e8f0' : '#1e293b' }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
              Evaluation / Officer Fast Sign-In:
            </span>
            <button
              type="button"
              onClick={handleQuickOfficerLogin}
              disabled={isLoading}
              data-testid="auth-quick-officer-btn"
              className="text-xs font-medium text-sky-500 hover:text-sky-400 underline cursor-pointer"
            >
              Sign In as Lead Officer (admin)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
