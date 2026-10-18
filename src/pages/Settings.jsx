import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../api';

export default function Settings() {
  const { user, isRecycler, updateUser } = useAuth();
  const { showToast } = useToast();
  const { theme, setTheme, themes } = useTheme();

  // Active Tab: 'security' | 'profile' | 'theme'
  const [activeTab, setActiveTab] = useState('security');

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Profile Edit Form State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Direct Reset Modal State
  const [showResetCard, setShowResetCard] = useState(false);
  const [resetEmail, setResetEmail] = useState(user?.email || '');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [resetErr, setResetErr] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setResetEmail(user.email || '');
    }
  }, [user]);

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'Empty', color: 'var(--text-dim)' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 25, label: 'Weak', color: 'var(--red)' };
    if (score === 3) return { score: 60, label: 'Good', color: 'var(--yellow)' };
    if (score === 4) return { score: 85, label: 'Strong', color: 'var(--green)' };
    return { score: 100, label: 'Very Secure', color: 'var(--green-light)' };
  };

  const strength = getPasswordStrength(newPassword);

  // Handle Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!currentPassword) {
      setPassError('Please enter your current password');
      return;
    }
    if (newPassword.length < 4) {
      setPassError('New password must be at least 4 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match. Please verify confirmation.');
      return;
    }

    setPassLoading(true);
    try {
      const res = await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const msg = res.message || 'Password updated successfully! 🎉';
      setPassSuccess(msg);
      showToast(msg, 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPassError(err.message || 'Failed to update password');
      showToast(err.message || 'Password update failed', 'error');
    } finally {
      setPassLoading(false);
    }
  };

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim()) {
      setProfileError('Name cannot be empty');
      return;
    }

    setProfileLoading(true);
    try {
      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, phone, address })
      });
      if (res.user) {
        updateUser(res.user);
      }
      const msg = res.message || 'Profile details updated successfully!';
      setProfileSuccess(msg);
      showToast(msg, 'success');
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile');
      showToast(err.message || 'Profile update failed', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  // Direct reset for convenience if current password forgotten
  const handleDirectReset = async (e) => {
    e.preventDefault();
    setResetErr('');
    setResetMsg('');
    if (!resetNewPass || resetNewPass.length < 4) {
      setResetErr('New password must be at least 4 characters');
      return;
    }
    setResetLoading(true);
    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail, newPassword: resetNewPass })
      });
      const msg = res.message || 'Password has been reset successfully!';
      setResetMsg(msg);
      showToast(msg, 'success');
      setResetNewPass('');
      setShowResetCard(false);
    } catch (err) {
      setResetErr(err.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const isBuyerRole = isRecycler;

  return (
    <div className="page-container" style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 16px 80px' }}>
      
      {/* ── Page Header with Distinct Role Identity ── */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        padding: '24px 28px',
        marginBottom: 24,
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: isBuyerRole ? 'var(--purple)' : 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              boxShadow: '0 4px 14px var(--primary-glow)'
            }}>
              {isBuyerRole ? '🚚' : '👤'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
                  {isBuyerRole ? 'Commercial Buyer & Recycler Settings' : 'Household Seller Account Settings'}
                </h1>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: isBuyerRole ? 'var(--purple-dim)' : 'var(--primary-dim)',
                  color: isBuyerRole ? 'var(--purple-light)' : 'var(--primary)',
                  border: '1px solid var(--border)'
                }}>
                  {isBuyerRole ? '🚚 Verified Buyer / Recycler' : '👤 Verified Household Seller'}
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
                {isBuyerRole
                  ? 'Manage your commercial facility profile, bidding security credentials, and commercial password.'
                  : 'Manage your personal e-waste seller profile, pickup address, and dedicated seller password.'}
              </p>
            </div>
          </div>

          {/* Quick Account Tag */}
          <div style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Active Account ID</span>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{user?.email || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '1px solid var(--border)',
        marginBottom: 24,
        paddingBottom: 2
      }}>
        <button
          onClick={() => setActiveTab('security')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            color: activeTab === 'security' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'security' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'var(--transition)'
          }}
        >
          <span>🔒</span>
          <span>Password & Security</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            color: activeTab === 'profile' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'profile' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'var(--transition)'
          }}
        >
          <span>👤</span>
          <span>Profile & Contact</span>
        </button>

        <button
          onClick={() => setActiveTab('theme')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            color: activeTab === 'theme' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'theme' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'var(--transition)'
          }}
        >
          <span>🎨</span>
          <span>Appearance & Theme</span>
        </button>
      </div>

      {/* ════════════════════════════════════════════════
          TAB 1: SECURITY & PASSWORD SETTINGS
      ════════════════════════════════════════════════ */}
      {activeTab === 'security' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          
          {/* Main Password Change Card */}
          <div style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            padding: '24px 28px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🔑</span> Set & Change Password
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                Update the password for this {isBuyerRole ? 'Commercial Buyer' : 'Household Seller'} account.
              </p>
            </div>

            {passSuccess && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid var(--green)',
                color: 'var(--green-dark)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 16,
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span>✅</span> {passSuccess}
              </div>
            )}

            {passError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--red)',
                color: 'var(--red)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 16,
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span>⚠️</span> {passError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit}>
              {/* Current Password */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  Current Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter existing password"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 42px 11px 14px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text)',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 16,
                      color: 'var(--text-muted)'
                    }}
                  >
                    {showCurrent ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 4 characters"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 42px 11px 14px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text)',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 16,
                      color: 'var(--text-muted)'
                    }}
                  >
                    {showNew ? '🙈' : '👁️'}
                  </button>
                </div>

                {/* Strength Meter Bar */}
                {newPassword && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-dim)' }}>Password Strength</span>
                      <span style={{ fontWeight: 700, color: strength.color }}>{strength.label}</span>
                    </div>
                    <div style={{ height: 4, width: '100%', background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${strength.score}%`,
                        background: strength.color,
                        transition: 'all 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  Confirm New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 42px 11px 14px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text)',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 16,
                      color: 'var(--text-muted)'
                    }}
                  >
                    {showConfirm ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={passLoading}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: isBuyerRole ? 'var(--purple)' : 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: passLoading ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: passLoading ? 0.7 : 1,
                  transition: 'var(--transition)'
                }}
              >
                {passLoading ? 'Updating Password...' : `Update ${isBuyerRole ? 'Buyer' : 'Seller'} Password`}
              </button>
            </form>
          </div>

          {/* Account Security Info & Direct Reset Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              padding: '24px 28px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                🛡️ Account Security Policy
              </h3>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                <li>Your password is encrypted using high-iteration salted bcrypt.</li>
                <li>{isBuyerRole ? 'Commercial Buyer accounts' : 'Household Seller accounts'} require passwords of at least 4 characters.</li>
                <li>Changing your password here does not log out your current session.</li>
                <li>If you ever switch roles between User and Buyer, remember that each role possesses its own independent login and password credentials.</li>
              </ul>
            </div>

            {/* Direct Reset Section */}
            <div style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              padding: '24px 28px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                🔄 Forgot Current Password?
              </h3>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                You can directly set a new password for your registered email (<strong>{user?.email}</strong>) without typing the old password.
              </p>

              {!showResetCard ? (
                <button
                  type="button"
                  onClick={() => setShowResetCard(true)}
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text)',
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Direct Password Reset
                </button>
              ) : (
                <form onSubmit={handleDirectReset} style={{ marginTop: 12 }}>
                  {resetMsg && (
                    <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--green-dark)', borderRadius: 6, fontSize: 12, marginBottom: 10 }}>
                      {resetMsg}
                    </div>
                  )}
                  {resetErr && (
                    <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)', borderRadius: 6, fontSize: 12, marginBottom: 10 }}>
                      {resetErr}
                    </div>
                  )}
                  <input
                    type="password"
                    value={resetNewPass}
                    onChange={(e) => setResetNewPass(e.target.value)}
                    placeholder="Enter new direct password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 13,
                      marginBottom: 10,
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--green)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {resetLoading ? 'Resetting...' : 'Confirm Reset'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetCard(false)}
                      style={{
                        padding: '8px 14px',
                        background: 'none',
                        border: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB 2: PROFILE & CONTACT DETAILS
      ════════════════════════════════════════════════ */}
      {activeTab === 'profile' && (
        <div style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          padding: '24px 28px',
          boxShadow: 'var(--shadow-sm)',
          maxWidth: 680
        }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>👤</span> {isBuyerRole ? 'Commercial Facility & Contact Details' : 'Household Seller Profile'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Update your registered name, contact number, and default pickup / facility address.
            </p>
          </div>

          {profileSuccess && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid var(--green)',
              color: 'var(--green-dark)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 600
            }}>
              ✅ {profileSuccess}
            </div>
          )}

          {profileError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--red)',
              color: 'var(--red)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 600
            }}>
              ⚠️ {profileError}
            </div>
          )}

          <form onSubmit={handleProfileSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Full Name / Business Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text)',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Email Address (Login Identity)
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)',
                  fontSize: 14,
                  cursor: 'not-allowed',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>
                Email is tied to your account authentication and cannot be edited directly.
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text)',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                {isBuyerRole ? 'Processing Facility / Depot Address' : 'Pickup Address'}
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="Enter address details"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text)',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              style={{
                padding: '12px 24px',
                background: isBuyerRole ? 'var(--purple)' : 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                fontWeight: 700,
                cursor: profileLoading ? 'not-allowed' : 'pointer',
                opacity: profileLoading ? 0.7 : 1,
                transition: 'var(--transition)'
              }}
            >
              {profileLoading ? 'Saving Profile...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB 3: THEME & APPEARANCE
      ════════════════════════════════════════════════ */}
      {activeTab === 'theme' && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '28px 32px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              🎨 Theme & Visual Appearance
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              Personalize your interface aesthetic. Your chosen theme is saved locally across all sessions.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {themes.map(t => {
              const isSelected = theme === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    showToast(`Theme switched to ${t.name}! ✨`, 'info');
                  }}
                  style={{
                    padding: 20,
                    borderRadius: 16,
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--primary-dim)' : 'var(--surface-2)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? 'var(--shadow-glow)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 28 }}>{t.emoji}</div>
                    {isSelected ? (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: 'var(--primary)',
                        background: 'var(--surface)',
                        padding: '3px 9px',
                        borderRadius: 12,
                        border: '1px solid var(--border)'
                      }}>
                        ✓ Active
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Select</span>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      {t.desc}
                    </div>
                  </div>

                  {/* Mini palette preview strip */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: t.bg, border: '1px solid var(--border)' }} title="Canvas Background" />
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: t.surface, border: '1px solid var(--border)' }} title="Card Surface" />
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: t.accent }} title="Primary Accent" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
