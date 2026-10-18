import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch, fmtRupee, fmtDate, statusBadge, resolveImageUrl, EWASTE_ICONS, CATEGORY_LABELS } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MediaGallery from '../components/MediaGallery';

export default function NegotiationThread() {
  const { id } = useParams(); // offer_id
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [counterPrice, setCounterPrice] = useState('');
  const [messageText, setMessageText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actioning, setActioning] = useState(false);

  const fetchThread = async () => {
    try {
      const res = await apiFetch(`/offers/${id}/thread`);
      setData(res);
      if (res.offer) {
        setCounterPrice(String(res.offer.offered_price || ''));
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThread();
    const interval = setInterval(fetchThread, 8000); // Polling for live updates
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.offer?.messages]);

  const handleSendCounter = async (e) => {
    e.preventDefault();
    if (!counterPrice || parseFloat(counterPrice) <= 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }

    if (data?.is_seller && data?.counter_offers_used >= 3) {
      showToast('Maximum 3 seller counter-offers reached! You can accept or reject.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`/offers/${id}/counter`, {
        method: 'POST',
        body: JSON.stringify({
          proposed_price: parseFloat(counterPrice),
          message: messageText
        })
      });

      showToast('Counter-offer sent!', 'success');
      setMessageText('');
      fetchThread();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async () => {
    if (!window.confirm('Accept this offer to finalize the deal?')) return;
    setActioning(true);
    try {
      await apiFetch(`/offers/${id}/accept`, { method: 'POST' });
      showToast('Deal accepted! Pickup handover code generated. 🎉', 'success');
      navigate('/bookings');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActioning(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Decline this offer?')) return;
    setActioning(true);
    try {
      await apiFetch(`/offers/${id}/reject`, { method: 'POST' });
      showToast('Offer declined', 'info');
      fetchThread();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActioning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        <span className="spinner" />
        <div style={{ marginTop: 12 }}>Loading negotiation thread…</div>
      </div>
    );
  }

  if (!data?.offer) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <h3>Negotiation not found</h3>
        <button className="btn btn-secondary" style={{ marginTop: 14 }} onClick={() => navigate(-1)}>
          ← Go Back
        </button>
      </div>
    );
  }

  const { offer, is_seller, counter_offers_used, max_counter_offers } = data;
  const listing = offer.listing;
  const isClosed = ['accepted', 'rejected', 'closed'].includes(offer.status);
  const sellerLimitReached = is_seller && counter_offers_used >= max_counter_offers;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', maxWidth: 840, margin: '0 auto', paddingBottom: 60 }}>
      {/* ── Top Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
          ← Back to Offers
        </button>
        <span className={`badge ${statusBadge(offer.status)[0]}`}>
          {statusBadge(offer.status)[1]}
        </span>
      </div>

      {/* ── Deal Context Card ── */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Listing Target:</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
              {listing?.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Seller Asking: <strong>{fmtRupee(listing?.asking_price)}</strong> • Current Bid: <strong style={{ color: 'var(--green)' }}>{fmtRupee(offer.offered_price)}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Partner:</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {is_seller ? `Buyer: ${offer.buyer?.name}` : `Seller: ${listing?.seller?.name}`}
            </div>
          </div>
        </div>

        {/* Counter Limits Bar */}
        <div className="counter-pills-bar" style={{ marginTop: 14 }}>
          <span>⚖️ Negotiation Limit:</span>
          <span>Seller counter-offers used: <strong>{counter_offers_used} / {max_counter_offers}</strong></span>
          {sellerLimitReached && (
            <span style={{ color: 'var(--red)', marginLeft: 'auto', fontWeight: 700 }}>
              ⚠️ Maximum seller counters reached
            </span>
          )}
        </div>
      </div>

      {/* ── Verified Listing Media Gallery (AI Image, Photos & Video) ── */}
      <MediaGallery
        media={data.snapshot_media || listing?.media || []}
        category={listing?.category}
        title={listing?.title}
        confidence={listing?.confidence}
      />

      {/* ── Message Thread ── */}
      <div className="card" style={{ padding: 20 }}>
        <div className="negotiation-thread">
          {/* Initial Proposal Bubble */}
          <div className="chat-bubble buyer">
            <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 2 }}>
              {offer.buyer?.name} (Initial Offer)
            </div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>
              Offered {fmtRupee(offer.offered_price)} for {offer.quantity} unit
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              🚚 {offer.pickup_proposal}
            </div>
            {offer.initial_message && (
              <div style={{ fontSize: 13, marginTop: 6, fontStyle: 'italic' }}>
                "{offer.initial_message}"
              </div>
            )}
            <div style={{ fontSize: 10, opacity: 0.7, textAlign: 'right', marginTop: 4 }}>
              {fmtDate(offer.createdAt)}
            </div>
          </div>

          {/* Sequential Messages */}
          {(offer.messages || []).map(m => {
            const isMe = m.sender_id === user?.id;
            const bubbleRoleClass = m.sender_role === 'seller' ? 'seller' : 'buyer';

            return (
              <div key={m.id} className={`chat-bubble ${bubbleRoleClass}`}>
                <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{m.sender?.name || (m.sender_role === 'seller' ? 'Seller' : 'Buyer')}</span>
                  {m.is_counter_offer && <span style={{ fontWeight: 800 }}>⚡ Counter-Offer</span>}
                </div>
                {m.proposed_price && (
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>
                    New Proposed Price: {fmtRupee(m.proposed_price)}
                  </div>
                )}
                <div style={{ fontSize: 13 }}>{m.message}</div>
                <div style={{ fontSize: 10, opacity: 0.7, textAlign: 'right', marginTop: 4 }}>
                  {fmtDate(m.createdAt)}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Counter Form / Actions */}
        {!isClosed ? (
          <div>
            <form onSubmit={handleSendCounter} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: 10, alignItems: 'center' }}>
                <div>
                  <label className="field-label">Proposed Price (₹)</label>
                  <input
                    className="auth-input"
                    type="number"
                    min="1"
                    value={counterPrice}
                    onChange={e => setCounterPrice(e.target.value)}
                    disabled={sellerLimitReached || submitting}
                    placeholder="New price"
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Counter Message</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    disabled={sellerLimitReached || submitting}
                    placeholder="Explain your price reasoning..."
                  />
                </div>
                <div style={{ paddingTop: 20 }}>
                  <button
                    type="submit"
                    className="btn btn-secondary"
                    disabled={sellerLimitReached || submitting}
                    style={{ whiteSpace: 'nowrap', height: 42 }}
                  >
                    {submitting ? <span className="spinner" /> : '💬 Send Counter'}
                  </button>
                </div>
              </div>
            </form>

            {/* Accept / Reject Buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
                disabled={actioning}
                onClick={handleAccept}
              >
                {actioning ? <span className="spinner" /> : `✅ Accept Deal at ${fmtRupee(offer.offered_price)}`}
              </button>
              <button
                className="btn btn-danger"
                style={{ padding: '12px 20px' }}
                disabled={actioning}
                onClick={handleReject}
              >
                Decline
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
            This negotiation is concluded ({offer.status}).
          </div>
        )}
      </div>
    </div>
  );
}
