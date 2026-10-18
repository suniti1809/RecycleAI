import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, fmtDate } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Notifications() {
  const { isRecycler } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'deals' | 'pickups'

  const fetchNotifications = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await apiFetch('/notifications');
      setNotifications(data.notifications || []);
    } catch (err) {
      if (!isBackground) showToast(err.message, 'error');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(false);
    // Real-time polling every 4 seconds to immediately show bids and deals
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (n) => {
    try {
      if (!n.is_read) {
        await apiFetch(`/notifications/${n.id}/read`, { method: 'PUT' });
        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
      }
      if (n.link) {
        let targetLink = n.link;
        if (targetLink.startsWith('/transactions')) targetLink = '/bookings';
        if (isRecycler && targetLink.startsWith('/my-listings')) targetLink = '/my-offers';
        if (isRecycler && targetLink.startsWith('/listings')) targetLink = '/marketplace';
        navigate(targetLink);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      showToast('All notifications marked as read', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'deals') {
      return ['offer', 'counter_offer', 'deal_accepted'].includes(n.type);
    }
    if (filter === 'pickups') {
      return ['pickup', 'completed'].includes(n.type);
    }
    return true;
  });

  const dealCount = notifications.filter(n => ['offer', 'counter_offer', 'deal_accepted'].includes(n.type)).length;
  const pickupCount = notifications.filter(n => ['pickup', 'completed'].includes(n.type)).length;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', maxWidth: 820, margin: '0 auto', paddingBottom: 60 }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="page-title" style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>
              🔔 Notifications & Deals Activity
            </div>
            <div className="page-sub" style={{ color: 'var(--text-muted)' }}>
              Live alerts for submitted bids, price counter-offers, accepted deals, and doorstep pickups.
            </div>
          </div>
          {notifications.some(n => !n.is_read) && (
            <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
              ✓ Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('all')}
        >
          All ({notifications.length})
        </button>
        <button
          className={`btn btn-sm ${filter === 'deals' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('deals')}
        >
          🤝 Deals & Bids ({dealCount})
        </button>
        <button
          className={`btn btn-sm ${filter === 'pickups' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('pickups')}
        >
          🚚 Pickups ({pickupCount})
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && notifications.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="spinner" />
            <div style={{ marginTop: 12 }}>Loading notifications…</div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔔</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
              {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications yet`}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto' }}>
              {isRecycler
                ? 'When you submit purchase bids on scrap listings or sellers accept your offers, live notifications will appear here.'
                : 'When buyers submit cash offers for your electronic scrap or schedule pickups, alerts will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredNotifications.map(n => {
              const isDealType = ['offer', 'counter_offer', 'deal_accepted'].includes(n.type);
              const isAccepted = n.type === 'deal_accepted';

              return (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border)',
                    background: n.is_read
                      ? (isAccepted ? 'rgba(16, 185, 129, 0.04)' : 'var(--surface)')
                      : (isAccepted ? 'rgba(16, 185, 129, 0.14)' : 'var(--green-dim)'),
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 24, marginTop: 2, flexShrink: 0 }}>
                      {n.type === 'offer' && '🎯'}
                      {n.type === 'counter_offer' && '⚡'}
                      {n.type === 'deal_accepted' && '🎉'}
                      {n.type === 'pickup' && '🚚'}
                      {n.type === 'completed' && '✅'}
                      {!['offer', 'counter_offer', 'deal_accepted', 'pickup', 'completed'].includes(n.type) && '🔔'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
                          {n.title}
                        </span>
                        {isAccepted && (
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'var(--green)', color: '#fff' }}>
                            DEAL CONFIRMED
                          </span>
                        )}
                        {n.type === 'offer' && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                            BID ACTIVE
                          </span>
                        )}
                        {n.type === 'counter_offer' && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--yellow-dim, rgba(234,179,8,0.15))', color: 'var(--yellow, #eab308)', border: '1px solid var(--border)' }}>
                            COUNTER-OFFER
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                          {fmtDate(n.createdAt)}
                        </span>
                      </div>

                      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <button
                      className={`btn btn-sm ${isAccepted ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n);
                      }}
                    >
                      {n.type === 'deal_accepted' ? '🤝 View Deal →' :
                       n.type === 'pickup' ? '🚚 Pickup Details →' :
                       isDealType ? '💬 Open Thread →' :
                       'View →'}
                    </button>

                    {!n.is_read && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
