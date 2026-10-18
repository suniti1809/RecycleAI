import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { isRecycler } = useAuth();

  // Auto-close sidebar on mobile whenever the route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — gets .open class on mobile when toggled */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Mobile top bar */}
      <header className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation menu"
        >
          <span style={{ fontSize: '20px', lineHeight: 1 }}>☰</span>
        </button>

        <div className="mobile-brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
            border: '1.5px solid rgba(255, 255, 255, 0.35)',
            boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" />
              <path d="M11 19h8.2a1.8 1.8 0 0 0 1.57-.881 1.785 1.785 0 0 0 .004-1.784L16.8 9.5" />
              <path d="M11 5h2a1.8 1.8 0 0 1 1.57.881l4.03 6.919" />
              <path d="m11 2-4 4 4 4" />
              <path d="m16 14 4 4-4 4" />
              <path d="m5 10 4-4" />
            </svg>
          </div>
          <span className="mobile-brand-name" style={{ fontSize: 16, fontWeight: 900, display: 'flex', gap: 2 }}>
            <span style={{ color: '#FFFFFF' }}>Recycle</span>
            <span style={{ color: '#10B981', textShadow: '0 0 10px rgba(16, 185, 129, 0.5)' }}>AI</span>
          </span>
        </div>

        <div className="mobile-role-pill">
          {isRecycler ? (
            <span className="badge badge-recycler">🚚 Buyer</span>
          ) : (
            <span className="badge badge-seller">👤 Seller</span>
          )}
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

