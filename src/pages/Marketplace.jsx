import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, fmtRupee, fmtDate, resolveImageUrl, EWASTE_ICONS, CATEGORY_LABELS } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MediaGallery from '../components/MediaGallery';

export default function Marketplace() {
  const { user, isRecycler } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState('all');
  const [condition, setCondition] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  // Offer modal state
  const [selectedListing, setSelectedListing] = useState(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerQuantity, setOfferQuantity] = useState('1');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerPickup, setOfferPickup] = useState('Can pick up within 48 hours via doorstep vehicle');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.append('category', category);
      if (condition !== 'all') params.append('condition', condition);
      if (search) params.append('search', search);
      if (sort) params.append('sort', sort);

      const data = await apiFetch(`/listings?${params.toString()}`);
      setListings(data.listings || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [category, condition, sort]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchListings();
  };

  const openOfferModal = (listing) => {
    if (listing.seller_id === user?.id) {
      showToast('This is your own listing! View received offers from your dashboard.', 'info');
      navigate('/my-listings');
      return;
    }
    setSelectedListing(listing);
    setOfferPrice(listing.asking_price ? String(listing.asking_price) : '500');
    setOfferQuantity(String(listing.quantity || 1));
    setOfferMessage('');
  };

  const submitOffer = async (e) => {
    e.preventDefault();
    if (!selectedListing) return;
    setSubmittingOffer(true);

    try {
      await apiFetch('/offers', {
        method: 'POST',
        body: JSON.stringify({
          listing_id: selectedListing.id,
          offered_price: parseFloat(offerPrice),
          quantity: parseInt(offerQuantity),
          pickup_proposal: offerPickup,
          message: offerMessage
        })
      });

      showToast('Offer submitted to seller! You will be notified when they respond.', 'success');
      setSelectedListing(null);
      fetchListings();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingOffer(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: 60 }}>
      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="page-title" style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>
              🛒 E-Waste Circular Marketplace
            </div>
            <div className="page-sub" style={{ color: 'var(--text-muted)' }}>
              Browse verified electronic scrap, inspect condition photos & video, and connect with certified buyers & sellers.
            </div>
          </div>
          {!isRecycler && (
            <button className="btn btn-primary" onClick={() => navigate('/classifier')}>
              📸 Scan & Sell E-Waste →
            </button>
          )}
        </div>
      </div>

      {/* ── Role Mode Banner (Clear Buyer vs Seller Separation) ── */}
      <div style={{
        background: isRecycler ? 'var(--secondary-surface)' : 'var(--muted-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '14px 18px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 24 }}>{isRecycler ? '🚚' : '👤'}</div>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: 14 }}>
              {isRecycler ? 'Recycler / Buyer Mode Active' : 'Household Seller Mode Active'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {isRecycler
                ? 'You are browsing as a commercial scrap collector. Submit cash purchase offers to claim items for collection!'
                : 'You are browsing as an e-waste seller. Bidding is reserved for certified recyclers. Click any item to inspect its photos and AI predictions.'}
            </div>
          </div>
        </div>
        {!isRecycler ? (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/classifier')}>
            📸 Scan & Sell E-Waste →
          </button>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--primary)', color: '#fff', padding: '4px 10px', borderRadius: 12 }}>
            ✓ Verified Buyer Account
          </span>
        )}
      </div>
      <div className="card" style={{ padding: 18, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            className="auth-input"
            type="text"
            placeholder="🔍 Search items, brands, materials, or locations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 240 }}
          />
          <button type="submit" className="btn btn-secondary" style={{ padding: '0 20px' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Category Filter */}
            <select
              className="auth-input"
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }}
            >
              <option value="all">⚡ All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{EWASTE_ICONS[k] || ''} {v}</option>
              ))}
            </select>

            {/* Condition Filter */}
            <select
              className="auth-input"
              value={condition}
              onChange={e => setCondition(e.target.value)}
              style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }}
            >
              <option value="all">📦 All Conditions</option>
              <option value="good">✅ Good / Working</option>
              <option value="fair">⚠️ Partially Working</option>
              <option value="poor">❌ Scrap / Dead</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sort by:</span>
            <select
              className="auth-input"
              value={sort}
              onChange={e => setSort(e.target.value)}
              style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }}
            >
              <option value="newest">🕒 Newest Listed</option>
              <option value="price_asc">💰 Price: Low to High</option>
              <option value="price_desc">💎 Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Listings Grid ── */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="spinner" />
          <div style={{ marginTop: 12 }}>Loading marketplace inventory…</div>
        </div>
      ) : listings.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>📦</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>No listings match your filters</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>Try resetting your category or search keywords.</p>
          <button className="btn btn-secondary" onClick={() => { setCategory('all'); setCondition('all'); setSearch(''); }}>
            🔄 Reset Filters
          </button>
        </div>
      ) : (
        <div className="marketplace-grid">
          {listings.map(item => {
            const isOwner = user?.id === item.seller_id;
            const imgUrl = resolveImageUrl(item.image_url);
            const icon = EWASTE_ICONS[item.detected_category] || EWASTE_ICONS[item.category] || '♻️';
            const mediaCount = (item.media || []).length;
            const hasVideo = (item.media || []).some(m => m.media_type === 'condition_video');

            return (
              <div key={item.id} className="listing-card">
                <div className="listing-thumb-wrap" onClick={() => openOfferModal(item)} style={{ cursor: 'pointer' }}>
                  {imgUrl ? (
                    <img src={imgUrl} alt={item.title} className="listing-thumb" />
                  ) : (
                    <div className="listing-thumb-placeholder">{icon}</div>
                  )}

                  {/* AI Confidence Badge */}
                  {item.confidence > 0 && (
                    <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(5,150,105,0.92)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8, backdropFilter: 'blur(4px)' }}>
                      ✓ AI Verified ({Math.round(item.confidence * 100)}%)
                    </span>
                  )}

                  {/* Condition Pill */}
                  <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(15,23,42,0.85)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8, textTransform: 'capitalize' }}>
                    {item.condition}
                  </span>

                  {/* Media Count Pill */}
                  <span style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
                    📸 {mediaCount} {mediaCount === 1 ? 'photo' : 'media items'} {hasVideo ? '• 🎥 Video' : ''}
                  </span>
                </div>

                <div className="listing-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>{icon}</span>
                    <span>{CATEGORY_LABELS[item.category] || item.category?.replace(/_/g, ' ')}</span>
                  </div>

                  <h4 className="listing-title" onClick={() => openOfferModal(item)} style={{ cursor: 'pointer' }}>
                    {item.title}
                  </h4>

                  <div className="listing-meta">
                    <span>📍 {item.approx_location || 'Prayagraj'}</span>
                    <span>•</span>
                    <span>⚖️ {item.weight_kg} kg</span>
                  </div>

                  <div className="listing-price-row">
                    <div>
                      <div className="listing-price">{fmtRupee(item.asking_price)}</div>
                      {item.is_negotiable && (
                        <div style={{ fontSize: 11, color: 'var(--green-dark)', fontWeight: 600 }}>Negotiable</div>
                      )}
                    </div>

                    {isOwner ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate('/my-listings')}
                      >
                        Manage ({item.total_offers || 0} bids)
                      </button>
                    ) : isRecycler ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => openOfferModal(item)}
                      >
                        💼 Make Cash Offer →
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openOfferModal(item)}
                      >
                        🔍 Inspect Media
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Buyer Offer & Media Inspection Modal ── */}
      {selectedListing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ maxWidth: 680, width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: 26, borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
                  {isRecycler ? '💼 Make Purchase Offer & Inspect Media' : '📦 E-Waste Item Details & Media Gallery'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {isRecycler
                    ? 'Inspect item photos and verified condition video before submitting your purchase offer.'
                    : 'Inspect complete item photos, condition video, and verified hardware specifications.'}
                </div>
              </div>
              <button onClick={() => setSelectedListing(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>
                ✕
              </button>
            </div>

            {/* Target Item Details */}
            <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: 16 }}>{selectedListing.title}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--green)' }}>{fmtRupee(selectedListing.asking_price)}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Category: <strong>{CATEGORY_LABELS[selectedListing.category] || selectedListing.category}</strong> • Qty: {selectedListing.quantity} • Weight: {selectedListing.weight_kg}kg • Location: 📍 {selectedListing.approx_location}
              </div>
              {selectedListing.description && (
                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 8, fontStyle: 'italic' }}>
                  "{selectedListing.description}"
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════
                BUYER COMPLETE MEDIA GALLERY (ALL 4 SLOTS)
            ══════════════════════════════════════════════════════ */}
            <MediaGallery
              media={selectedListing.media || []}
              category={selectedListing.category}
              title={selectedListing.title}
              confidence={selectedListing.confidence}
            />

            {/* Purchase Offer Form — ONLY RENDERED FOR VERIFIED RECYCLERS / BUYERS */}
            {isRecycler ? (
              <form onSubmit={submitOffer} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>💼</span> Submit Your Purchase Offer (Buyer / Recycler Only)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="field-label">Your Bid Price (₹)</label>
                    <input
                      className="auth-input"
                      type="number"
                      min="1"
                      value={offerPrice}
                      onChange={e => setOfferPrice(e.target.value)}
                      placeholder="Enter offered price"
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">Quantity to Purchase</label>
                    <input
                      className="auth-input"
                      type="number"
                      min="1"
                      max={selectedListing.quantity}
                      value={offerQuantity}
                      onChange={e => setOfferQuantity(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">Pickup & Logistics Proposal</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={offerPickup}
                    onChange={e => setOfferPickup(e.target.value)}
                    placeholder="e.g. Doorstep pickup tomorrow 11 AM via van"
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Negotiation Message to Seller</label>
                  <textarea
                    className="auth-input"
                    rows="2"
                    value={offerMessage}
                    onChange={e => setOfferMessage(e.target.value)}
                    placeholder="Note to seller regarding component valuation, prompt payment, or pickup schedule..."
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSelectedListing(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={submittingOffer}>
                    {submittingOffer ? <><span className="spinner" /> Submitting…</> : '🚀 Send Offer to Seller'}
                  </button>
                </div>
              </form>
            ) : (
              /* Seller View Mode: Clear role separation, no offer bidding form */
              <div style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '16px 18px',
                marginTop: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ fontSize: 24, lineHeight: 1 }}>🔒</div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: 14 }}>
                      Purchase Bidding is Reserved for Commercial Recyclers & Buyers
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                      You are logged in with a <strong>Household Seller Account</strong>. As a seller, you list electronic scrap to receive cash bids from registered recyclers. Sellers cannot place purchase bids on other listings.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedListing(null)}
                  >
                    Close Preview
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedListing(null);
                      navigate('/classifier');
                    }}
                  >
                    📸 Sell Your Own E-Waste
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
