import React, { useState, useEffect, useCallback } from 'react';
import { fetchAllUsers, createUserAdmin, deleteUser } from '../services/api';

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'System Administrator', clearance: 'ADMINISTRATOR', color: '#0284c7' },
  { value: 'OPERATOR', label: 'Duty Forecaster / Operator', clearance: 'OPERATIONAL', color: '#059669' },
  { value: 'RESEARCHER', label: 'Marine Research Scientist', clearance: 'SCIENTIFIC', color: '#7c3aed' },
  { value: 'VIEWER', label: 'Public / Academic Observer', clearance: 'VIEW-ONLY', color: '#64748b' }
];

export default function AdminUsersModal({
  isOpen = false,
  onClose = null,
  currentUser = null,
  onLoginSuccess: _onLoginSuccess = null
}) {
  const [activeTab, setActiveTab] = useState('directory');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState({ message: '', isError: false });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('RESEARCHER');
  const [clearance, setClearance] = useState('SCIENTIFIC');
  const [organization, setOrganization] = useState('MoES / INCOIS Ocean Observations');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllUsers();
      if (data?.users) {
        setUsers(data.users);
      }
    } catch (err) {
      setActionStatus({ message: err.message || 'Failed to load user directory.', isError: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      let ignore = false;
      void Promise.resolve().then(() => {
        if (!ignore) {
          loadUsers();
          setActionStatus({ message: '', isError: false });
        }
      });
      return () => {
        ignore = true;
      };
    }
  }, [isOpen, loadUsers]);

  if (!isOpen) return null;

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    const found = ROLE_OPTIONS.find((r) => r.value === selectedRole);
    if (found) {
      setClearance(found.clearance);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !fullName.trim()) {
      setActionStatus({ message: 'Full Name, Username, and Password are required.', isError: true });
      return;
    }

    setLoading(true);
    setActionStatus({ message: 'Registering authorized user in database...', isError: false });

    try {
      const res = await createUserAdmin({
        username: username.trim(),
        password: password.trim(),
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        role,
        clearance,
        organization: organization.trim() || 'MoES / INCOIS'
      });

      setActionStatus({
        message: `Account for ${res.user.display_name} created successfully!`,
        isError: false
      });

      setUsername('');
      setPassword('');
      setFullName('');
      setEmail('');
      await loadUsers();
      setActiveTab('directory');
    } catch (err) {
      setActionStatus({ message: err.message || 'Registration failed.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, targetUsername) => {
    if (!window.confirm(`Are you sure you want to delete user "${targetUsername}"?`)) return;

    setLoading(true);
    try {
      await deleteUser(userId);
      setActionStatus({ message: `User "${targetUsername}" deleted from database.`, isError: false });
      await loadUsers();
    } catch (err) {
      setActionStatus({ message: err.message || 'Deletion failed.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-modal-overlay"
      data-testid="admin-users-modal-overlay"
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
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '20px'
      }}
    >
      <div
        className="admin-modal-card"
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1e293b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>👥</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#f8fafc' }}>
                User Directory & Access Management
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                MoES / INCOIS Security Registry · SQLite Database
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px 12px',
              fontSize: '13px'
            }}
          >
            ✕ Close
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #1e293b',
            backgroundColor: '#0b1329',
            padding: '0 24px'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            style={{
              padding: '12px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'directory' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'directory' ? '#38bdf8' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            User Directory ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            style={{
              padding: '12px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'create' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'create' ? '#38bdf8' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            + Register New Officer
          </button>
        </div>

        {actionStatus.message && (
          <div
            style={{
              margin: '14px 24px 0 24px',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              backgroundColor: actionStatus.isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${actionStatus.isError ? '#ef4444' : '#10b981'}`,
              color: actionStatus.isError ? '#fca5a5' : '#6ee7b7'
            }}
          >
            {actionStatus.message}
          </div>
        )}

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'directory' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
                  Registered officers and scientific analysts with authorized operational access.
                </p>
                <button
                  type="button"
                  onClick={loadUsers}
                  disabled={loading}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                    cursor: 'pointer'
                  }}
                >
                  {loading ? 'Refreshing...' : '↻ Refresh List'}
                </button>
              </div>

              <div style={{ border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                      <th style={{ padding: '10px 12px' }}>Officer</th>
                      <th style={{ padding: '10px 12px' }}>Username</th>
                      <th style={{ padding: '10px 12px' }}>Role</th>
                      <th style={{ padding: '10px 12px' }}>Clearance</th>
                      <th style={{ padding: '10px 12px' }}>Organization</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isCurrent = currentUser?.username === u.username;
                      const isRoot = u.user_id === 'MOES-ADM-000' || u.user_id === 'MOES-DIR-001';
                      return (
                        <tr
                          key={u.user_id}
                          style={{
                            borderBottom: '1px solid #1e293b',
                            backgroundColor: isCurrent ? 'rgba(56, 189, 248, 0.08)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                backgroundColor: u.badge_color || '#38bdf8',
                                color: '#0f172a',
                                display: 'grid',
                                placeItems: 'center',
                                fontWeight: 700,
                                fontSize: '11px'
                              }}
                            >
                              {u.avatar_initials || 'OF'}
                            </span>
                            <div>
                              <strong style={{ color: '#f8fafc', display: 'block' }}>{u.display_name}</strong>
                              {isCurrent && (
                                <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 600 }}>
                                  (Active Session)
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#94a3b8' }}>
                            {u.username}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: `${u.badge_color || '#38bdf8'}22`,
                                color: u.badge_color || '#38bdf8',
                                border: `1px solid ${u.badge_color || '#38bdf8'}44`
                              }}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>
                            {u.clearance}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#94a3b8', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.organization}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              {!isRoot && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.user_id, u.username)}
                                  disabled={loading}
                                  title="Delete user record"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #ef4444',
                                    borderRadius: '4px',
                                    color: '#f87171',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateUser} style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                  Full Officer Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Commander Rajesh Sharma"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#f8fafc'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Username *
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. rajesh.sharma"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      color: '#f8fafc'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Password *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Secret passphrase"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      color: '#f8fafc'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Assigned Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      color: '#f8fafc'
                    }}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Clearance Level
                  </label>
                  <input
                    type="text"
                    value={clearance}
                    disabled
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      backgroundColor: '#182337',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#94a3b8'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                  Affiliated Organization
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Ministry of Earth Sciences / INCOIS"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#f8fafc'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                  Official Email (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. officer@incois.gov.in"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#f8fafc'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('directory')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: '#0284c7',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {loading ? 'Creating...' : 'Create Officer Account'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
