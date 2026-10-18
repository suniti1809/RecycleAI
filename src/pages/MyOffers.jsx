import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, fmtRupee, fmtDate, statusBadge, resolveImageUrl, EWASTE_ICONS } from '../api';
import { useToast } from '../context/ToastContext';

export default function MyOffers() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/offers/my');
      setOffers(data.offers || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: 60 }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="page-title" style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>
              💼 My Submitted Bids & Purchase Offers
            </div>
            <div className="page-sub" style={{ color: 'var(--text-muted)' }}>
              Track active price negotiations, review seller counter-offers, and proceed to pickup scheduling once accepted.
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/marketplace')}>
            🛒 Browse Marketplace
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="spinner" />
            <div style={{ marginTop: 12 }}>Loading your offers…</div>
          </div>
        ) : offers.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💼</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>No offers submitted yet</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
              Browse the marketplace to find available electronic scrap and submit purchase offers to sellers.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/marketplace')}>
              Browse Available E-Waste
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>E-Waste Item</th>
                  <th>Seller</th>
                  <th>Offered Price</th>
                  <th>Submitted Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {offers.map(o => {
                  const [badgeCls, badgeLbl] = statusBadge(o.status);
                  const listing = o.listing;
                  const imgUrl = resolveImageUrl(listing?.image_url);

                  return (
                    <tr key={o.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 42, height: 42, borderRadius: 8, background: 'var(--bg-subtle)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {imgUrl ? (
                              <img src={imgUrl} alt="item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span>{EWASTE_ICONS[listing?.category] || '♻️'}</span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                              {listing?.title || 'E-Waste Item'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              Asking: {fmtRupee(listing?.asking_price)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {listing?.seller?.name || 'Seller'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          ⭐ {listing?.seller?.rating || 5.0}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>
                          {fmtRupee(o.offered_price)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Qty: {o.quantity} unit
                        </div>
                      </td>

                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {fmtDate(o.createdAt)}
                      </td>

                      <td>
                        <span className={`badge ${badgeCls}`}>{badgeLbl}</span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate(`/negotiations/${o.id}`)}
                          >
                            💬 Negotiate
                          </button>
                          {o.status === 'accepted' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => navigate(`/bookings`)}
                            >
                              🚚 View Pickup
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
        )}
      </div>
    </div>
  );
}
