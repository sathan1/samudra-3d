import React, { useState, useEffect } from 'react';
import { loginUser, fetchAuthPersonas } from '../services/api';

const DEFAULT_PERSONAS = [
  {
    id: 'chief_oceanographer',
    label: 'Chief Oceanographer',
    name: 'Dr. M. Ravichandran',
    username: 'chief.oceanographer',
    password: 'Samudra#Command2026!',
    role: 'CHIEF_OCEANOGRAPHER',
    clearance: 'LEVEL-3 COMMAND',
    badgeColor: '#00f5d4',
    desc: 'Executive Scientific Authority & Model Validation'
  },
  {
    id: 'naval_operations',
    label: 'Naval Operations',
    name: 'Commander K. Varma',
    username: 'cmdr.varma',
    password: 'Naval#OpsTactical2026!',
    role: 'NAVAL_OPERATIONS',
    clearance: 'LEVEL-2 TACTICAL',
    badgeColor: '#f59e0b',
    desc: 'Tactical SAR Currents & Platform Fleet Surveillance'
  },
  {
    id: 'research_observer',
    label: 'Marine Researcher',
    name: 'Dr. Priya Nair',
    username: 'priya.nair',
    password: 'Research#Argo2026!',
    role: 'RESEARCH_OBSERVER',
    clearance: 'LEVEL-1 RESEARCH',
    badgeColor: '#10b981',
    desc: 'Deep CTD Water Column Analysis & T-S Profiles'
  }
];

export default function LoginModal({
  isOpen = false,
  onClose = null,
  currentUser = null,
  onLoginSuccess = null,
  onLogout = null
}) {
  const [officerId, setOfficerId] = useState('chief.oceanographer');
  const [passphrase, setPassphrase] = useState('Samudra#Command2026!');
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [personas, setPersonas] = useState(DEFAULT_PERSONAS);

  useEffect(() => {
    let isMounted = true;
    async function loadPersonas() {
      try {
        const res = await fetchAuthPersonas();
        if (isMounted && res?.personas?.length) {
          setPersonas(res.personas.map(p => ({
            id: p.id,
            label: p.label,
            name: p.description.split('.')[0],
            username: p.username,
            password: p.default_password,
            role: p.role,
            clearance: p.clearance,
            badgeColor: p.badge_color,
            desc: p.description
          })));
        }
      } catch {
        // Use default fallback personas
      }
    }
    if (isOpen) {
      loadPersonas();
    }
    return () => { isMounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPersona = async (p, autoSubmit = false) => {
    setOfficerId(p.username);
    setPassphrase(p.password);
    setStatusMsg('');
    setIsError(false);

    if (autoSubmit) {
      await performLogin(p.username, p.password);
    }
  };

  const performLogin = async (username, password) => {
    setIsLoading(true);
    setStatusMsg('Handshake initialized: Authenticating credentials with MoES/INCOIS registry...');
    setIsError(false);

    try {
      const res = await loginUser({ username, password });
      setStatusMsg(`Authentication successful. Clearance ${res.user.clearance} granted for ${res.user.display_name}.`);
      setIsError(false);
      if (onLoginSuccess) {
        onLoginSuccess(res.user, res.access_token);
      }
      setTimeout(() => {
        onClose?.();
      }, 700);
    } catch (err) {
      setIsError(true);
      setStatusMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!officerId.trim() || !passphrase.trim()) {
      setIsError(true);
      setStatusMsg('Please provide both Officer ID and Cryptographic Passphrase.');
      return;
    }
    await performLogin(officerId, passphrase);
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      if (onLogout) await onLogout();
      setStatusMsg('Session terminated. Switched to public observation mode.');
      setIsError(false);
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
        backgroundColor: 'rgba(2, 6, 18, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '20px'
      }}
    >
      <div
        className="login-modal-card"
        data-testid="login-modal-card"
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'linear-gradient(145deg, rgba(8, 26, 48, 0.9), rgba(4, 14, 28, 0.95))',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(0, 245, 212, 0.22)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 35px -5px rgba(0, 245, 212, 0.15)',
          borderRadius: '20px',
          padding: '30px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
        }}
      >
        {/* Glow Accent at Top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #00f5d4, #38bdf8, transparent)',
            opacity: 0.8
          }}
        />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: currentUser ? '#10b981' : '#00f5d4',
                  boxShadow: currentUser ? '0 0 10px #10b981' : '0 0 10px #00f5d4'
                }}
              />
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'Consolas, monospace',
                  letterSpacing: '0.14em',
                  color: currentUser ? '#10b981' : '#00f5d4',
                  textTransform: 'uppercase',
                  fontWeight: 600
                }}
              >
                OPERATIONAL COMMAND PORTAL // MOES-INCOIS
              </span>
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#f1f7fa'
              }}
            >
              {currentUser ? 'Active Officer Session' : 'MoES / INCOIS Officer Access'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#8da6b8', lineHeight: 1.5 }}>
              4D Oceanographic Digital Twin command terminal. Authenticate credentials for operational mission control.
            </p>
          </div>

          <button
            type="button"
            data-testid="login-close-btn"
            onClick={onClose}
            aria-label="Close authentication portal"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'grid',
              placeItems: 'center',
              color: '#8da6b8',
              cursor: 'pointer',
              padding: 0,
              fontSize: '16px',
              transition: 'all 0.3s ease'
            }}
          >
            ✕
          </button>
        </div>

        {/* If Already Authenticated: Show Profile & Sign-Out */}
        {currentUser ? (
          <div
            style={{
              background: 'rgba(0, 245, 212, 0.05)',
              border: '1px solid rgba(0, 245, 212, 0.2)',
              borderRadius: '12px',
              padding: '18px',
              marginBottom: '18px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(0, 245, 212, 0.3), rgba(56, 189, 248, 0.4))',
                  border: '1.5px solid #00f5d4',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: '16px',
                  color: '#ffffff'
                }}
              >
                {currentUser.avatar_initials || 'IN'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#f8fafc' }}>
                  {currentUser.display_name}
                </div>
                <div style={{ fontSize: '12px', color: '#38bdf8', fontFamily: 'Consolas, monospace' }}>
                  {currentUser.organization}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: 'rgba(0, 245, 212, 0.15)',
                  border: '1px solid rgba(0, 245, 212, 0.4)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#00f5d4',
                  fontFamily: 'Consolas, monospace'
                }}
              >
                {currentUser.clearance}
              </span>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#38bdf8',
                  fontFamily: 'Consolas, monospace'
                }}
              >
                ROLE: {currentUser.role}
              </span>
            </div>

            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '16px' }}>
              <strong>Capabilities:</strong> {currentUser.capabilities?.join(', ') || 'Standard clearance'}
            </div>

            <button
              type="button"
              data-testid="login-signout-btn"
              onClick={handleSignOut}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Sign Out / Switch Officer Mode ⎋
            </button>
          </div>
        ) : (
          <>
            {/* Quick Persona Switcher Chips */}
            <div style={{ marginBottom: '18px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '8px'
                }}
              >
                Quick Operational Persona Switcher:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {personas.map((p) => {
                  const isSelected = officerId === p.username;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      data-testid={`persona-chip-${p.id}`}
                      onClick={() => handleSelectPersona(p, true)}
                      title={`Click to authenticate instantly as ${p.label}`}
                      style={{
                        padding: '8px 6px',
                        borderRadius: '8px',
                        background: isSelected
                          ? 'rgba(0, 245, 212, 0.15)'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: isSelected
                          ? `1px solid ${p.badgeColor}`
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        color: isSelected ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: 600,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ color: p.badgeColor, fontWeight: 700, fontSize: '10px' }}>
                        {p.clearance.replace('LEVEL-', 'L-')}
                      </div>
                      <div style={{ marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Security Telemetry Badge */}
            <div
              style={{
                background: 'rgba(0, 245, 212, 0.05)',
                border: '1px solid rgba(0, 245, 212, 0.12)',
                borderRadius: '10px',
                padding: '9px 12px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                fontFamily: 'Consolas, monospace',
                color: '#a5bbc7'
              }}
            >
              <span>AIR-GAPPED: <strong style={{ color: '#00f5d4' }}>OFFLINE AUTH ACTIVE</strong></span>
              <span>CIPHER: <strong style={{ color: '#38bdf8' }}>PBKDF2-SHA256</strong></span>
            </div>

            {/* Form Container */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label
                  htmlFor="officer-id"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#e5eef2',
                    marginBottom: '6px'
                  }}
                >
                  Officer Username / Identifier
                </label>
                <input
                  id="officer-id"
                  data-testid="login-officer-input"
                  type="text"
                  placeholder="e.g. chief.oceanographer"
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(4, 16, 32, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    fontSize: '13px',
                    color: '#f1f7fa',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="officer-passphrase"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#e5eef2',
                    marginBottom: '6px'
                  }}
                >
                  Cryptographic Passphrase
                </label>
                <input
                  id="officer-passphrase"
                  data-testid="login-passphrase-input"
                  type="password"
                  placeholder="••••••••••••••••"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(4, 16, 32, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    fontSize: '13px',
                    color: '#f1f7fa',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s ease'
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
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(0, 245, 212, 0.3), rgba(56, 189, 248, 0.4))',
                  border: '1px solid rgba(0, 245, 212, 0.6)',
                  color: '#f1f7fa',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 24px -6px rgba(0, 245, 212, 0.35)',
                  transition: 'all 0.3s ease'
                }}
              >
                {isLoading ? 'Verifying Handshake...' : 'Authenticate Session ➔'}
              </button>
            </form>
          </>
        )}

        {/* Status Message */}
        {statusMsg && (
          <div
            data-testid="login-status-msg"
            style={{
              marginTop: '14px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: isError ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0, 245, 212, 0.1)',
              border: isError ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(0, 245, 212, 0.3)',
              fontSize: '11px',
              color: isError ? '#fca5a5' : '#00f5d4',
              fontFamily: 'Consolas, monospace',
              lineHeight: 1.5
            }}
          >
            {statusMsg}
          </div>
        )}

        {/* Footer info */}
        <div
          style={{
            marginTop: '18px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
            color: '#6e8898'
          }}
        >
          <span>MINISTRY OF EARTH SCIENCES (MoES)</span>
          <span>INCOIS OCEAN DATA SERVICES</span>
        </div>
      </div>
    </div>
  );
}
