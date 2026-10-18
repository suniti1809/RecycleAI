import React, { useState, useEffect } from 'react';
import { apiFetch, fmtRupee, fmtDate, statusBadge, resolveImageUrl, EWASTE_ICONS } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MediaGallery from '../components/MediaGallery';
import ProductLifecycleModal from '../components/ProductLifecycleModal';

export default function Bookings() {
  const { user, isRecycler } = useAuth();
  const { showToast } = useToast();

  const [transactions, setTransactions] = useState([]);
  const [legacyBookings, setLegacyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('deals'); // 'deals' or 'legacy'

  // Schedule pickup modal
  const [schedulingTx, setSchedulingTx] = useState(null);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupSlot, setPickupSlot] = useState('Morning (10:00 AM - 1:00 PM)');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  // Handover Confirmation modal (for recycler / buyer)
  const [verifyingTx, setVerifyingTx] = useState(null);
  const [verifiedWeight, setVerifiedWeight] = useState('');
  const [submittingConfirm, setSubmittingConfirm] = useState(false);
  const [lifecycleItem, setLifecycleItem] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txData, bkData] = await Promise.all([
        apiFetch('/transactions').catch(() => ({ transactions: [] })),
        apiFetch('/bookings/').catch(() => ({ bookings: [] }))
      ]);
      setTransactions(txData.transactions || []);
      setLegacyBookings(bkData.bookings || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSchedulePickup = async (e) => {
    e.preventDefault();
    if (!schedulingTx || !pickupDate) return;
    setSubmittingSchedule(true);
    try {
      await apiFetch(`/transactions/${schedulingTx.id}/schedule-pickup`, {
        method: 'POST',
        body: JSON.stringify({
          pickup_date: pickupDate,
          pickup_time_slot: pickupSlot
        })
      });
      showToast('Pickup scheduled successfully! 🚚', 'success');
      setSchedulingTx(null);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const handleConfirmHandover = async (e) => {
    e.preventDefault();
    if (!verifyingTx) return;
    setSubmittingConfirm(true);
    try {
      const res = await apiFetch(`/transactions/${verifyingTx.id}/verify-handover`, {
        method: 'POST',
        body: JSON.stringify({
          verified_weight_kg: verifiedWeight ? parseFloat(verifiedWeight) : null
        })
      });
      showToast(`Pickup confirmed! Saved ${res.co2_saved_kg} kg CO₂! 🎉`, 'success');
      setVerifyingTx(null);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingConfirm(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: 60 }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="page-title" style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>
          📦 Pickups, Deals & Handover
        </div>
        <div className="page-sub" style={{ color: 'var(--text-muted)' }}>
          Coordinate doorstep collections, schedule pickup windows, and track eco-friendly physical handovers.
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          className={`btn ${activeTab === 'deals' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('deals')}
        >
          🤝 Marketplace Deals & Pickups ({transactions.length})
        </button>
        <button
          className={`btn ${activeTab === 'legacy' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('legacy')}
        >
          📦 Direct Collection Requests ({legacyBookings.length})
        </button>
      </div>

      {/* ── Marketplace Deals Tab ── */}
      {activeTab === 'deals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <span className="spinner" />
              <div style={{ marginTop: 12 }}>Loading transactions…</div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="card" style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤝</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>No active deals yet</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                When an offer is accepted on a marketplace listing, the transaction appears here for pickup coordination.
              </p>
            </div>
          ) : (
            transactions.map(t => {
              const [stCls, stLbl] = statusBadge(t.status);
              const isSeller = user?.id === t.seller_id;
              const partner = isSeller ? t.buyer : t.seller;
              const imgUrl = resolveImageUrl(t.listing?.image_url);

              return (
                <div key={t.id} className="card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div style={{ width: 52, height: 52, borderRadius: 'var(--radius)', background: 'var(--bg-subtle)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {imgUrl ? (
                          <img src={imgUrl} alt="item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: 24 }}>{EWASTE_ICONS[t.listing?.category] || '♻️'}</span>
                        )}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`badge ${stCls}`}>{stLbl}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Deal #{t.id}</span>
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                          {t.listing?.title || 'E-Waste Item'}
                        </h3>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                          Partner: <strong>{partner?.name || 'Partner'}</strong> ({isSeller ? 'Buyer/Recycler' : 'Seller'})
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Agreed Deal Value</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--green)' }}>{fmtRupee(t.agreed_price)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Qty: {t.agreed_quantity} unit • Weight: {t.agreed_weight_kg}kg</div>
                    </div>
                  </div>

                  {/* Pickup Logistics & Handover Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 18 }}>
                    <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>📍 Authorized Pickup Address:</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
                        {t.authorized_pickup_address || t.listing?.pickup_address || 'Address provided to authorized parties'}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>🚚 Scheduled Time Window:</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        {t.pickup_date ? `${fmtDate(t.pickup_date)} (${t.pickup_time_slot || 'Standard hours'})` : '⏳ Awaiting pickup scheduling'}
                      </div>
                      {t.status !== 'completed' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ marginTop: 8 }}
                          onClick={() => { setSchedulingTx(t); setPickupDate(t.pickup_date || ''); }}
                        >
                          📅 {t.pickup_date ? 'Reschedule Window' : 'Schedule Pickup Window'}
                        </button>
                      )}
                    </div>

                    {/* Handover & Fulfillment Panel */}
                    <div style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                        🚚 Doorstep Pickup & Handover
                      </div>
                      {t.status === 'completed' ? (
                        <div style={{ background: 'var(--primary-dim, rgba(16,185,129,0.12))', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            ✅ Handover Completed & Verified
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                            Scale Weight: {t.verified_weight_kg || t.agreed_weight_kg} kg • Saved {t.co2_saved_kg || 0} kg CO₂e
                          </div>
                        </div>
                      ) : isSeller ? (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          Doorstep collection is scheduled. Your recycler partner will arrive at your address and confirm receipt upon pickup.
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                            Ready to collect? Confirm physical receipt from the seller to complete the deal.
                          </div>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => { setVerifyingTx(t); setVerifiedWeight(String(t.agreed_weight_kg || '')); }}
                          >
                            📦 Confirm Pickup & Complete Deal →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Deal Media Gallery (AI Image, Photos & Video) ── */}
                  <div style={{ marginTop: 20 }}>
                    <MediaGallery
                      media={t.listing?.media || []}
                      category={t.listing?.category}
                      title={t.listing?.title}
                      confidence={t.listing?.confidence}
                    />
                  </div>

                  {/* ── Product Circular Lifecycle Tracker ── */}
                  <div style={{
                    marginTop: 18,
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(56, 189, 248, 0.08))',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>♻️</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>
                          What Happens to This Product? (Circular Lifecycle)
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {t.status === 'completed'
                            ? 'Pickup completed. Track certified data wiping, component harvesting, and urban mining stages.'
                            : 'Track certified recycling protocols and material recovery steps after collection.'}
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setLifecycleItem({
                        category: t.listing?.category,
                        itemName: t.listing?.title,
                        weightKg: t.verified_weight_kg || t.agreed_weight_kg || 1,
                        agreedPrice: t.agreed_price
                      })}
                      style={{ fontWeight: 700 }}
                    >
                      🌱 View Circular Journey →
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Legacy Bookings Tab ── */}
      {activeTab === 'legacy' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {legacyBookings.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
              No direct collection requests.
            </div>
          ) : (
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Item Category</th>
                  <th>Pickup Address</th>
                  <th>Pickup Date</th>
                  <th>Estimated Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {legacyBookings.map(b => {
                  const [bCls, bLbl] = statusBadge(b.status);
                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 700 }}>{b.item_name?.replace(/_/g, ' ')}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{b.pickup_address}</td>
                      <td style={{ fontSize: 13 }}>{fmtDate(b.pickup_date)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--green)' }}>{fmtRupee(b.estimated_value)}</td>
                      <td><span className={`badge ${bCls}`}>{bLbl}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Schedule Pickup Modal ── */}
      {schedulingTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ maxWidth: 440, width: '100%', padding: 24, borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>
              📅 Schedule Doorstep Collection
            </h3>
            <form onSubmit={handleSchedulePickup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="field-label">Preferred Pickup Date</label>
                <input
                  className="auth-input"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={pickupDate}
                  onChange={e => setPickupDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label">Pickup Time Slot</label>
                <select className="auth-input" value={pickupSlot} onChange={e => setPickupSlot(e.target.value)}>
                  <option value="Morning (9:00 AM - 12:00 PM)">Morning (9:00 AM - 12:00 PM)</option>
                  <option value="Afternoon (1:00 PM - 4:00 PM)">Afternoon (1:00 PM - 4:00 PM)</option>
                  <option value="Evening (4:00 PM - 7:00 PM)">Evening (4:00 PM - 7:00 PM)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSchedulingTx(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={submittingSchedule}>
                  {submittingSchedule ? <span className="spinner" /> : 'Confirm Window'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Doorstep Handover Modal (for Recycler) ── */}
      {verifyingTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ maxWidth: 440, width: '100%', padding: 24, borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
              📦 Confirm Doorstep Handover
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Confirm collection of "{verifyingTx.listing?.title}" from seller and record verified scale weight.
            </p>

            <form onSubmit={handleConfirmHandover} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="field-label">Actual Verified Scale Weight (kg)</label>
                <input
                  className="auth-input"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={verifiedWeight}
                  onChange={e => setVerifiedWeight(e.target.value)}
                  placeholder="e.g. 1.8"
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setVerifyingTx(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={submittingConfirm}>
                  {submittingConfirm ? <span className="spinner" /> : '✅ Confirm & Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Product Lifecycle Modal ── */}
      <ProductLifecycleModal
        isOpen={!!lifecycleItem}
        onClose={() => setLifecycleItem(null)}
        category={lifecycleItem?.category}
        itemName={lifecycleItem?.itemName}
        weightKg={lifecycleItem?.weightKg}
        agreedPrice={lifecycleItem?.agreedPrice}
      />
    </div>
  );
}
