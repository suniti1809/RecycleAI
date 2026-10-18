import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../api';

export default function Sidebar({ onClose }) {
  const { user, logout, isRecycler } = useAuth();
  const { showToast } = useToast();
  const { theme, setTheme, themes } = useTheme();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);


  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchUnread = () => {
      apiFetch('/notifications').then(data => {
        if (mounted && data) setUnreadCount(data.unread_count || 0);
      }).catch(() => { });
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000); // Check every 15s
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'info');
    navigate('/');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    if (passForm.newPassword !== passForm.confirmPassword) {
      setPassError('New passwords do not match');
      return;
    }
    if (passForm.newPassword.length < 4) {
      setPassError('New password must be at least 4 characters');
      return;
    }
    setPassLoading(true);
    try {
      const data = await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passForm.currentPassword,
          newPassword: passForm.newPassword
        })
      });
      showToast(data.message || 'Password changed successfully! 🎉', 'success');
      setShowPasswordModal(false);
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPassError(err.message || 'Failed to update password');
    } finally {
      setPassLoading(false);
    }
  };

  const userLinks = [
    { to: '/dashboard', icon: '🏠', label: 'Seller Dashboard' },
    { to: '/classifier', icon: '🔬', label: 'AI Vision Scanner' },
    { to: '/marketplace', icon: '🛒', label: 'Marketplace' },
    { to: '/my-listings', icon: '📋', label: 'My Listings' },
    { to: '/bookings', icon: '📦', label: 'Pickups & Deals' },
    { to: '/map', icon: '🗺️', label: 'Recycler Map' },
    { to: '/impact', icon: '🌿', label: 'Impact Dashboard' },
    { to: '/notifications', icon: '🔔', label: 'Notifications', badge: unreadCount },
    { to: '/settings', icon: '⚙️', label: 'Seller Settings' },
  ];

  const recyclerLinks = [
    { to: '/recycler', icon: '🏠', label: 'Buyer Dashboard' },
    { to: '/marketplace', icon: '🛒', label: 'Browse E-Waste' },
    { to: '/my-offers', icon: '💼', label: 'My Offers & Bids' },
    { to: '/bookings', icon: '🤝', label: 'Deals & Pickups' },
    { to: '/recycler/my-jobs', icon: '🚚', label: 'Active Pickups' },
    { to: '/map', icon: '🗺️', label: 'Recycler Facilities' },
    { to: '/impact', icon: '🌿', label: 'Impact Analytics' },
    { to: '/notifications', icon: '🔔', label: 'Notifications', badge: unreadCount },
    { to: '/settings', icon: '⚙️', label: 'Buyer Settings' },
  ];

  const links = isRecycler ? recyclerLinks : userLinks;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
      {/* Logo Row - High Contrast & Elevated */}
      <div className="sidebar-logo" style={{ background: 'var(--surface-2)', padding: '18px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sidebar-logo-icon" style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
            border: '2px solid rgba(255, 255, 255, 0.35)',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.45), 0 0 0 2px rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
              <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" />
              <path d="M11 19h8.2a1.8 1.8 0 0 0 1.57-.881 1.785 1.785 0 0 0 .004-1.784L16.8 9.5" />
              <path d="M11 5h2a1.8 1.8 0 0 1 1.57.881l4.03 6.919" />
              <path d="m11 2-4 4 4 4" />
              <path d="m16 14 4 4-4 4" />
              <path d="m5 10 4-4" />
            </svg>
          </div>
          <div>
            <div className="sidebar-logo-title" style={{ fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 2, letterSpacing: '-0.4px' }}>
              <span style={{ color: '#FFFFFF' }}>Recycle</span>
              <span style={{ color: '#10B981', textShadow: '0 0 14px rgba(16, 185, 129, 0.6)' }}>AI</span>
            </div>
            <div className="sidebar-logo-sub" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.2px' }}>Circular E-Waste Market</div>
          </div>
        </div>

        {/* Mobile close button (hidden on desktop) */}
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      {/* User Info & Role Card */}
      <div className="sidebar-user" style={{ padding: '16px 18px', background: 'var(--muted-surface)', borderBottom: '1px solid var(--border)' }}>
        <div className={`sidebar-avatar ${isRecycler ? 'recycler' : ''}`} style={{ background: isRecycler ? 'var(--purple)' : 'var(--primary)', color: '#fff' }}>
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700, color: 'var(--text)' }}>
            {user?.name || 'User'}
          </div>
          <div className="sidebar-user-role" style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {isRecycler
              ? <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple-light)', background: 'var(--purple-dim)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 12 }}>🚚 Buyer Account</span>
              : <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-dim)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 12 }}>👤 Seller Account</span>}
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="sidebar-nav" style={{ padding: '14px 10px', flex: 1, overflowY: 'auto' }}>
        <div className="nav-section-label" style={{ padding: '0 10px 8px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.8px' }}>
          {isRecycler ? 'Recycler Hub' : 'Seller Portal'}
        </div>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/dashboard' || link.to === '/recycler'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 4 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="nav-icon" style={{ fontSize: 18 }}>{link.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{link.label}</span>
            </div>
            {link.badge > 0 && (
              <span style={{ background: 'var(--red)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 10 }}>
                {link.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout (Theme switcher removed from sidebar) */}
      <div className="sidebar-bottom" style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
        <button
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'center', padding: '10px', borderRadius: 'var(--radius-sm)' }}
          onClick={handleLogout}
        >
          <span style={{ marginRight: 6 }}>🚪</span> Logout
        </button>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 420,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 16px 40px rgba(30, 41, 59, 0.12)',
              padding: 24,
              borderRadius: 20
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                🔑 Change Password
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.4 }}>
              Update password for <strong style={{ color: 'var(--text)' }}>{user?.email}</strong> ({isRecycler ? 'Buyer / Recycler' : 'Seller'}). You can set distinct passwords for each account!
            </div>

            {passError && (
              <div style={{ padding: '10px 12px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 8, color: '#f43f5e', fontSize: 13, marginBottom: 14 }}>
                ⚠️ {passError}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6 }}>
                  Current Password
                </label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Enter current password"
                  value={passForm.currentPassword}
                  onChange={e => setPassForm(f => ({ ...f, currentPassword: e.target.value }))}
                  required
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6 }}>
                  New Password
                </label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="At least 4 characters"
                  value={passForm.newPassword}
                  onChange={e => setPassForm(f => ({ ...f, newPassword: e.target.value }))}
                  required
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6 }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Repeat new password"
                  value={passForm.confirmPassword}
                  onChange={e => setPassForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={passLoading}
                >
                  {passLoading ? 'Saving…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

