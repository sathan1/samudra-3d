import React, { useState } from 'react';
import { loginUser } from '../services/api';

/**
 * AuthGate - MoES / INCOIS Operational Ocean Information System Authentication Gate
 * Single streamlined login for all users (officers, admins, scientists, analysts).
 * Inputs start empty with zero auto-loaded credentials or unnecessary descriptions.
 */
export default function AuthGate({ onLoginSuccess, theme = 'dark', onToggleTheme = null }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
        setErrorMsg('Authentication failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="auth-gate-container relative flex min-h-screen w-full items-center justify-center p-4 sm:p-6"
      data-testid="auth-gate"
      style={{
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      {onToggleTheme && (
        <button
          type="button"
          onClick={onToggleTheme}
          data-testid="auth-theme-toggle-btn"
          className="absolute top-4 right-4 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm hover:opacity-80"
          style={{
            backgroundColor: 'var(--panel)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      )}
      <div
        className="auth-card w-full max-w-md rounded-xl border p-6 sm:p-8 shadow-2xl"
        style={{
          backgroundColor: 'var(--panel)',
          borderColor: 'var(--border)'
        }}
      >
        {/* Institutional Branding */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-950/40 text-xl font-bold text-sky-400">
            ≈
          </div>
          <span className="text-[11px] font-bold tracking-widest text-sky-500 uppercase block mb-1">
            Ministry of Earth Sciences · INCOIS
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            SAMUDRA-3D
          </h1>
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
              Username
            </label>
            <input
              id="auth-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              data-testid="auth-username-input"
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition"
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
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              data-testid="auth-password-input"
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition"
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
            {isLoading ? 'Logging In...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
