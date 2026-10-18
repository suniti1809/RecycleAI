import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, fmtRupee, fmtDate, statusBadge } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, total_value: 0, co2_saved: 0 });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/bookings/stats').catch(() => ({})),
      apiFetch('/bookings/').catch(() => ({ bookings: [] })),
    ]).then(([s, b]) => {
      setStats(s || {});
      setBookings((b.bookings || []).slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  const scrapRates = [
    { name: 'Smartphones & Tablets', rate: '₹150 – ₹1,200', tag: 'Gold & Rare Earths', icon: '📱' },
    { name: 'Laptops & MacBooks', rate: '₹400 – ₹3,500', tag: 'High Yield PCB', icon: '💻' },
    { name: 'Motherboards & PCBs', rate: '₹320 / kg', tag: 'Copper & Silver', icon: '🖲️' },
    { name: 'Lithium-Ion Batteries', rate: '₹180 / kg', tag: 'Cobalt Recovery', icon: '🔋' },
    { name: 'Cables & Adapters', rate: '₹220 / kg', tag: '99% Pure Copper', icon: '🔌' },
  ];

  const co2 = stats.co2_saved || 0;
  const treesSaved = (co2 / 21.7).toFixed(1); // average tree absorbs ~21.7 kg CO2/year

  return (
    <div className="dashboard-container" style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* ── Welcome Banner ── */}
      <div className="welcome-banner">
        <div>
          <div className="welcome-tag">
            <span className="welcome-dot" /> Verified Recycling Account
          </div>
          <div className="welcome-name">Hello, {user?.name?.split(' ')[0] || 'there'} 👋</div>
          <div className="welcome-sub">Turn your outdated electronics into instant cash & environmental impact.</div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/classifier')}>
            📸 Scan E-Waste with AI
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/bookings')}>
            📦 My Pickups
          </button>
        </div>
      </div>

      {/* ── Metric Stat Cards ── */}
      <div className="stat-cards-grid">
        <div className="stat-card">
          <div className="stat-card-icon">📦</div>
          <div className="stat-card-val">{loading ? '—' : stats.total || 0}</div>
          <div className="stat-card-lbl">Total Requests</div>
          <div className="stat-card-accent accent-green" />
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">🎉</div>
          <div className="stat-card-val green">{loading ? '—' : stats.completed || 0}</div>
          <div className="stat-card-lbl">Pickups Completed</div>
          <div className="stat-card-accent accent-green" />
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">💰</div>
          <div className="stat-card-val purple">{loading ? '—' : fmtRupee(stats.total_value || 0)}</div>
          <div className="stat-card-lbl">Total Cash Earned</div>
          <div className="stat-card-accent accent-purple" />
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">🌿</div>
          <div className="stat-card-val blue">{loading ? '—' : `${co2.toFixed(1)} kg`}</div>
          <div className="stat-card-lbl">CO₂ Emissions Saved</div>
          <div className="stat-card-accent accent-blue" />
        </div>
      </div>

      {/* ── Interactive Quick Action Hub ── */}
      <div className="dash-quick-actions">
        <div className="action-tile" onClick={() => navigate('/classifier')}>
          <div className="action-tile-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--green)' }}>
            🔬
          </div>
          <div className="action-tile-content">
            <h4>AI E-Waste Vision Scanner</h4>
            <p>Identify parts, check condition, and generate instant scrap valuation.</p>
            <span className="action-tile-link">Start Camera Scan →</span>
          </div>
        </div>

        <div className="action-tile" onClick={() => navigate('/bookings')}>
          <div className="action-tile-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--purple)' }}>
            🚚
          </div>
          <div className="action-tile-content">
            <h4>Doorstep Pickup Hub</h4>
            <p>View driver tracking, scheduled time slots, and pickup confirmations.</p>
            <span className="action-tile-link" style={{ color: 'var(--purple)' }}>View Pickup Status →</span>
          </div>
        </div>

        <div className="action-tile" onClick={() => {
          const el = document.getElementById('scrap-ticker');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}>
          <div className="action-tile-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--blue)' }}>
            ⚡
          </div>
          <div className="action-tile-content">
            <h4>Live Scrap Market Rates</h4>
            <p>Real-time commodity scrap pricing for precious metals and components.</p>
            <span className="action-tile-link" style={{ color: 'var(--blue)' }}>Check Rates Below ↓</span>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Content ── */}
      <div className="dash-main-split">
        {/* Left: Recent Activity & Scrap Ticker */}
        <div className="dash-col-left">
          {/* Recent Bookings */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-header-bar">
              <div className="card-heading-title">Recent Pickup Requests</div>
              <Link to="/bookings" className="card-heading-link">View All ({stats.total || 0}) →</Link>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <span className="spinner" style={{ borderTopColor: 'var(--green)' }} />
                <span style={{ marginLeft: 12 }}>Loading records…</span>
              </div>
            ) : bookings.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-icon">📦</div>
                <h3>No active recycling requests</h3>
                <p>Use the AI Classifier to snap a picture of old electronics and book a doorstep pickup.</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => navigate('/classifier')}>
                  📸 Scan Item Now
                </button>
              </div>
            ) : (
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>Item Type</th>
                    <th>Date</th>
                    <th>Est. Payout</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => {
                    const [cls, label] = statusBadge(b.status);
                    return (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 700 }}>{b.item_type?.replace(/_/g, ' ') || 'E-Waste'}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{fmtDate(b.created_at)}</td>
                        <td style={{ color: 'var(--green)', fontWeight: 800 }}>{fmtRupee(b.estimated_value)}</td>
                        <td><span className={`badge ${cls}`}>{label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Live Scrap Index Card */}
          <div id="scrap-ticker" className="card" style={{ marginTop: 24 }}>
            <div className="card-header-bar" style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="card-heading-title">📊 Live Scrap Commodity Index</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Updated daily against precious metal recovery indices</div>
              </div>
              <span className="badge badge-confirmed">Live Market</span>
            </div>

            <div className="scrap-ticker-list">
              {scrapRates.map((item, idx) => (
                <div key={idx} className="scrap-ticker-row">
                  <div className="scrap-ticker-icon">{item.icon}</div>
                  <div className="scrap-ticker-info">
                    <strong>{item.name}</strong>
                    <span>{item.tag}</span>
                  </div>
                  <div className="scrap-ticker-price">{item.rate}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Eco Impact & Trust Info */}
        <div className="dash-col-right">
          {/* Eco Impact Meter */}
          <div className="card eco-impact-card">
            <div className="eco-header">
              <span className="eco-badge">🌱 Environmental Score</span>
              <h3>Your Green Footprint</h3>
            </div>

            <div className="eco-meter-box">
              <div className="eco-stat-circle">
                <span className="eco-number">{co2.toFixed(1)}</span>
                <span className="eco-unit">kg CO₂</span>
              </div>
              <div className="eco-meter-details">
                <div className="eco-metric">
                  <span className="metric-icon">🌳</span>
                  <div>
                    <strong>{treesSaved} Trees</strong>
                    <span>Equivalent carbon offset</span>
                  </div>
                </div>
                <div className="eco-metric">
                  <span className="metric-icon">🛡️</span>
                  <div>
                    <strong>100% Zero Landfill</strong>
                    <span>Certified R2 extraction</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="eco-disclaimer">
              Every battery and circuit board recycled prevents heavy metals like Lead and Mercury from contaminating groundwater.
            </p>
          </div>

          {/* Data Security Guarantee */}
          <div className="card data-security-card" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>🔒</span>
              <h4 style={{ margin: 0, fontSize: 16, color: '#fff' }}>DoD Data Sanitization</h4>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}>
              All phones, laptops, and hard drives undergo strict magnetic and physical degaussing compliant with DoD 5220.22-M standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
