import { useState, useEffect } from 'react';
import { apiFetch, fmtRupee, fmtDate, statusBadge, Auth } from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function RecyclerMyJobs() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [jobs, setJobs]     = useState([]);
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);
  const [accessError, setAccessError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setAccessError(false);
    try {
      const [jobsData, statsData] = await Promise.all([
        apiFetch('/bookings/all?status=my_jobs'),
        apiFetch('/bookings/recycler-stats').catch(() => null),
      ]);
      setJobs(jobsData.bookings || []);
      setStats(statsData);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('recycler access')) {
        setAccessError(true);
        showToast('Recycler account login is required to access Active Pickups.', 'error');
      } else {
        showToast(err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id, status) => {
    setActioning(id);
    try {
      await apiFetch(`/bookings/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      showToast(`Job marked as ${status}`, 'success');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActioning(null);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="page-header">
        <div className="page-title">🚚 My Pickups</div>
        <div className="page-sub">Manage your accepted and completed jobs</div>
      </div>

      {/* ── Recycler Access Warning Banner ── */}
      {accessError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius)',
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <strong style={{ color: '#ef4444' }}>⚠️ Recycler Portal Login Required:</strong>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              Your current session is authenticated as a Seller/User account or has expired. Please log in through the Recycler Portal to access active pickups.
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              Auth.clear();
              window.location.href = '/recycler-portal';
            }}
            style={{ fontWeight: 700 }}
          >
            🚚 Login to Recycler Portal →
          </button>
        </div>
      )}

      {/* ── Earnings Stats Cards ── */}
      <div className="stat-cards-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-icon">📋</div>
          <div className="stat-card-val">{loading ? '—' : stats?.total_jobs ?? 0}</div>
          <div className="stat-card-lbl">Total Jobs Taken</div>
          <div className="stat-card-accent accent-green" />
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">🎉</div>
          <div className="stat-card-val green">{loading ? '—' : stats?.completed_jobs ?? 0}</div>
          <div className="stat-card-lbl">Completed Jobs</div>
          <div className="stat-card-accent accent-green" />
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">📦</div>
          <div className="stat-card-val purple">
            {loading ? '—' : fmtRupee(stats?.total_earnings ?? 0)}
          </div>
          <div className="stat-card-lbl">Total Scrap Procured</div>
          <div className="stat-card-accent accent-purple" />
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">⏳</div>
          <div className="stat-card-val blue">
            {loading ? '—' : fmtRupee(stats?.pending_payout ?? 0)}
          </div>
          <div className="stat-card-lbl">Pending Pickups Value</div>
          <div className="stat-card-accent accent-blue" />
        </div>
      </div>

      {/* ── Jobs Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="spinner" style={{ borderTopColor: 'var(--purple)' }} />
            <span style={{ marginLeft: 12 }}>Loading my jobs…</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🚚</div>
            <h3>No active jobs</h3>
            <p>Accept new pickup requests from the Pending Jobs tab.</p>
          </div>
        ) : (
          <table className="bookings-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Item</th>
                <th style={{ width: '28%' }}>Address</th>
                <th style={{ width: '14%' }}>Pickup Date</th>
                <th style={{ width: '14%' }}>Value</th>
                <th style={{ width: '10%' }}>Status</th>
                <th style={{ width: '12%' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => {
                const [cls, label] = statusBadge(j.status);
                return (
                  <tr key={j.id}>
                    <td style={{ fontWeight: 700 }}>
                      {/* item_name is the correct Sequelize field */}
                      {j.item_name?.replace(/_/g, ' ') || 'E-Waste'}
                    </td>
                    <td style={{
                      color: 'var(--text-muted)', fontSize: 13,
                      maxWidth: 0, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {/* pickup_address is the correct Sequelize field */}
                      {j.pickup_address || '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {j.pickup_date ? fmtDate(j.pickup_date) : '—'}
                    </td>
                    <td style={{ color: 'var(--purple)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {fmtRupee(j.estimated_value)}
                    </td>
                    <td>
                      <span className={`badge ${cls}`}>{label}</span>
                    </td>
                    <td>
                      {j.status === 'confirmed' && (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={actioning === j.id}
                          onClick={() => updateStatus(j.id, 'picked_up')}
                        >
                          {actioning === j.id ? <span className="spinner" /> : '🚚 Pick Up'}
                        </button>
                      )}
                      {j.status === 'picked_up' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={actioning === j.id}
                          onClick={() => updateStatus(j.id, 'completed')}
                        >
                          {actioning === j.id ? <span className="spinner" /> : '🎉 Complete'}
                        </button>
                      )}
                      {j.status === 'completed' && (
                        <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>
                          ✅ Done
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
