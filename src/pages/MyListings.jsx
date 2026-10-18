import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, apiUpload, fmtRupee, fmtDate, resolveImageUrl, statusBadge, EWASTE_ICONS, CATEGORY_LABELS } from '../api';
import { useToast } from '../context/ToastContext';
import MediaGallery from '../components/MediaGallery';
import ProductLifecycleModal from '../components/ProductLifecycleModal';

export default function MyListings() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeListingId, setActiveListingId] = useState(null); // Which listing's offers are expanded
  const [actioningOffer, setActioningOffer] = useState(null);
  const [mediaModalListing, setMediaModalListing] = useState(null);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [lifecycleModalItem, setLifecycleModalItem] = useState(null);

  const fetchMyListings = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/listings/my');
      setListings(data.listings || []);
      if (data.listings && data.listings.length > 0 && !activeListingId) {
        setActiveListingId(data.listings[0].id);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyListings();
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await apiFetch(`/listings/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      showToast(`Listing status updated to ${status}`, 'success');
      fetchMyListings();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAcceptOffer = async (offerId) => {
    if (!window.confirm('Accept this buyer offer? Competing offers will be closed and a deal transaction created.')) return;
    setActioningOffer(offerId);
    try {
      const res = await apiFetch(`/offers/${offerId}/accept`, { method: 'POST' });
      showToast('Deal accepted! Pickup handover code generated. 🎉', 'success');
      navigate(`/bookings`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActioningOffer(null);
    }
  };

  const handleRejectOffer = async (offerId) => {
    if (!window.confirm('Decline this offer?')) return;
    setActioningOffer(offerId);
    try {
      await apiFetch(`/offers/${offerId}/reject`, { method: 'POST' });
      showToast('Offer rejected', 'info');
      fetchMyListings();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActioningOffer(null);
    }
  };

  const handleUploadSlot = async (listingId, mediaType, file) => {
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (mediaType === 'condition_video') {
      if (!isVideo) {
        showToast('Condition video must be an MP4, WebM, or MOV video file', 'error');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        showToast('Condition video exceeds 50MB limit', 'error');
        return;
      }
    } else {
      if (!isImage) {
        showToast('Photos must be in JPEG, PNG, or WebP format', 'error');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        showToast('Photo exceeds 15MB limit', 'error');
        return;
      }
    }

    setUploadingSlot(mediaType);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('media_type', mediaType);

      const res = await apiUpload(`/listings/${listingId}/media`, fd);
      showToast(res.message || 'Media uploaded successfully!', 'success');
      await fetchMyListings();
      if (mediaModalListing) {
        const updated = await apiFetch(`/listings/${listingId}`);
        if (updated && updated.listing) {
          setMediaModalListing(updated.listing);
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploadingSlot(null);
    }
  };

  const activeListing = listings.find(l => l.id === activeListingId);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: 60 }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="page-title" style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>
              📋 My E-Waste Listings & Offer Comparison
            </div>
            <div className="page-sub" style={{ color: 'var(--text-muted)' }}>
              Compare buyer bids side-by-side, counter-offer up to 3 times, or accept the best deal for doorstep pickup.
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/classifier')}>
            ➕ Create New Listing
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="spinner" />
          <div style={{ marginTop: 12 }}>Loading your listings…</div>
        </div>
      ) : listings.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>No listings published yet</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
            Take or upload an item photo to get an instant AI price estimate and create your listing!
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/classifier')}>
            📸 Scan & Value E-Waste
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
          {/* Left: Listings Selector Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Your Inventory ({listings.length})
            </div>
            {listings.map(l => {
              const isSelected = l.id === activeListingId;
              const [statusCls, statusLbl] = statusBadge(l.status);
              const offerCount = (l.offers || []).length;
              const imgUrl = resolveImageUrl(l.image_url);

              return (
                <div
                  key={l.id}
                  onClick={() => setActiveListingId(l.id)}
                  style={{
                    background: isSelected ? 'var(--green-dim)' : 'var(--surface)',
                    border: isSelected ? '2px solid var(--green)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: 14,
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {imgUrl ? (
                        <img src={imgUrl} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 20 }}>{EWASTE_ICONS[l.category] || '♻️'}</span>
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 12 }}>
                        <span style={{ fontWeight: 800, color: 'var(--green)' }}>{fmtRupee(l.asking_price)}</span>
                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                        <span style={{ color: 'var(--text-muted)' }}>{offerCount} {offerCount === 1 ? 'bid' : 'bids'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Active Listing Details & Offer Comparison Table */}
          {activeListing && (
            <div className="card" style={{ padding: 24 }}>
              {/* Active Listing Top Bar */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, paddingBottom: 18, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge ${statusBadge(activeListing.status)[0]}`}>
                      {statusBadge(activeListing.status)[1]}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Listed {fmtDate(activeListing.createdAt)}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 6 }}>
                    {activeListing.title}
                  </h3>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    Category: <strong>{CATEGORY_LABELS[activeListing.category] || activeListing.category}</strong> • Weight: <strong>{activeListing.weight_kg}kg</strong> • Asking: <strong style={{ color: 'var(--green)' }}>{fmtRupee(activeListing.asking_price)}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ background: 'linear-gradient(135deg, var(--green), #059669)', border: 'none', fontWeight: 700 }}
                    onClick={() => setLifecycleModalItem(activeListing)}
                    title="Learn what happens to this product during circular recycling"
                  >
                    ♻️ What Happens to This Item?
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setMediaModalListing(activeListing)}>
                    📸 Manage / Upload Media ({activeListing.media?.length || 0}/4)
                  </button>
                  {activeListing.status === 'active' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange(activeListing.id, 'paused')}>
                      ⏸️ Pause Listing
                    </button>
                  )}
                  {activeListing.status === 'paused' && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange(activeListing.id, 'active')}>
                      ▶️ Resume Listing
                    </button>
                  )}
                  {activeListing.status !== 'sold' && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange(activeListing.id, 'cancelled')}>
                      Cancel Listing
                    </button>
                  )}
                </div>
              </div>

              {/* Media Incomplete Banner */}
              {activeListing.media_complete === false && (
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: 14, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#92400e', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      ⚠️ Media Incomplete ({activeListing.media?.length || 0}/4 Slots Uploaded)
                    </div>
                    <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>
                      Buyers cannot submit offers until 1 AI image, 2 physical photos, and 1 condition video are uploaded.
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setMediaModalListing(activeListing)}>
                    📸 Upload Missing Media Now
                  </button>
                </div>
              )}

              {/* Verified Listing Media Gallery */}
              <div style={{ marginBottom: 20 }}>
                <MediaGallery
                  media={activeListing.media || []}
                  category={activeListing.category}
                  title={activeListing.title}
                  confidence={activeListing.confidence}
                />
              </div>

              {/* Product Lifecycle & Circular Processing Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(56, 189, 248, 0.08))',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '16px 20px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28 }}>🔄</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
                      Product Lifecycle & Circular Journey
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Learn what happens to your {activeListing.title || 'device'} after handover (Certified data wipe, precious metal recovery, zero-landfill smelting).
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setLifecycleModalItem(activeListing)}
                  style={{ fontWeight: 700 }}
                >
                  🔍 View Product Lifecycle →
                </button>
              </div>

              {/* Offer Comparison Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h4 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
                    🤝 Received Buyer Offers ({activeListing.offers?.length || 0})
                  </h4>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Max 3 counter-offers per buyer enforced
                  </span>
                </div>

                {(!activeListing.offers || activeListing.offers.length === 0) ? (
                  <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius)', padding: 36, textAlign: 'center', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>No buyer offers submitted yet</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                      Verified recyclers browsing the marketplace will submit cash offers here.
                    </div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="bookings-table">
                      <thead>
                        <tr>
                          <th>Buyer / Recycler</th>
                          <th>Offered Price</th>
                          <th>Pickup Proposal</th>
                          <th>Counter Status</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeListing.offers.map(offer => {
                          const [stCls, stLbl] = statusBadge(offer.status);
                          const isEligible = ['pending', 'countered'].includes(offer.status) && activeListing.status !== 'sold';

                          return (
                            <tr key={offer.id}>
                              <td>
                                <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                                  {offer.buyer?.name || 'Recycler Partner'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginTop: 2 }}>
                                  {offer.buyer?.verified && (
                                    <span style={{ color: 'var(--green-dark)', fontWeight: 700 }}>✅ Verified</span>
                                  )}
                                  <span style={{ color: 'var(--text-muted)' }}>⭐ {offer.buyer?.rating || 5.0}</span>
                                </div>
                              </td>

                              <td>
                                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>
                                  {fmtRupee(offer.offered_price)}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  Qty: {offer.quantity} unit
                                </div>
                              </td>

                              <td style={{ fontSize: 12, color: 'var(--text-dim)', maxWidth: 200 }}>
                                {offer.pickup_proposal || 'Doorstep collection'}
                              </td>

                              <td>
                                <span style={{ fontSize: 12, fontWeight: 700, color: offer.seller_counter_count >= 3 ? 'var(--red)' : 'var(--text-dim)' }}>
                                  Used: {offer.seller_counter_count}/3
                                </span>
                              </td>

                              <td>
                                <span className={`badge ${stCls}`}>{stLbl}</span>
                              </td>

                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: 6 }}>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => navigate(`/negotiations/${offer.id}`)}
                                    title="View negotiation thread"
                                  >
                                    💬 Negotiate
                                  </button>

                                  {isEligible && (
                                    <>
                                      <button
                                        className="btn btn-primary btn-sm"
                                        disabled={actioningOffer === offer.id}
                                        onClick={() => handleAcceptOffer(offer.id)}
                                      >
                                        {actioningOffer === offer.id ? <span className="spinner" /> : '✅ Accept'}
                                      </button>
                                      <button
                                        className="btn btn-danger btn-sm"
                                        disabled={actioningOffer === offer.id}
                                        onClick={() => handleRejectOffer(offer.id)}
                                      >
                                        ✕
                                      </button>
                                    </>
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
          )}
        </div>
      )}

      {/* ── Media Management Modal (Upload Missing / Replace Slots) ── */}
      {mediaModalListing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24, borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                  📸 Item Photos & Video Slots
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {mediaModalListing.title} • All 4 slots required for active buyer offers
                </div>
              </div>
              <button
                onClick={() => setMediaModalListing(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Slots Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { type: 'classification_image', label: '1. AI Classification Image', isVideo: false, accept: 'image/jpeg,image/png,image/webp' },
                { type: 'additional_photo_1', label: '2. Additional Photo 1', isVideo: false, accept: 'image/jpeg,image/png,image/webp' },
                { type: 'additional_photo_2', label: '3. Additional Photo 2', isVideo: false, accept: 'image/jpeg,image/png,image/webp' },
                { type: 'condition_video', label: '4. Item Condition Video', isVideo: true, accept: 'video/mp4,video/webm,video/quicktime' }
              ].map(slot => {
                const existing = (mediaModalListing.media || []).find(m => m.media_type === slot.type);
                const isUploading = uploadingSlot === slot.type;
                const fileUrl = existing ? resolveImageUrl(existing.storage_key) : null;

                return (
                  <div
                    key={slot.type}
                    style={{
                      background: 'var(--bg-subtle)',
                      border: existing ? '1.5px solid var(--green)' : '1.5px dashed var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: 14,
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ width: '100%', height: 110, borderRadius: 'var(--radius-sm)', background: '#000', overflow: 'hidden', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {fileUrl ? (
                        slot.isVideo ? (
                          <video src={fileUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <img src={fileUrl} alt={slot.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: 28 }}>
                          {slot.isVideo ? '🎥' : '📸'}
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                      {slot.label}
                    </div>

                    <div style={{ fontSize: 11, color: existing ? 'var(--green-dark)' : '#b45309', fontWeight: 600, marginBottom: 8 }}>
                      {existing ? `✓ Uploaded (v${existing.version || 1})` : '⚠️ Missing (Required)'}
                    </div>

                    <label
                      className={`btn ${existing ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                      style={{ width: '100%', justifyContent: 'center', cursor: isUploading ? 'not-allowed' : 'pointer' }}
                    >
                      {isUploading ? <><span className="spinner" /> Uploading…</> : existing ? '🔄 Replace' : '+ Upload'}
                      <input
                        type="file"
                        accept={slot.accept}
                        style={{ display: 'none' }}
                        disabled={isUploading}
                        onChange={(e) => {
                          if (e.target.files[0]) {
                            handleUploadSlot(mediaModalListing.id, slot.type, e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setMediaModalListing(null)}>
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Product Lifecycle Modal ── */}
      <ProductLifecycleModal
        isOpen={!!lifecycleModalItem}
        onClose={() => setLifecycleModalItem(null)}
        category={lifecycleModalItem?.category}
        itemName={lifecycleModalItem?.title}
        weightKg={lifecycleModalItem?.weight_kg || 1}
        agreedPrice={lifecycleModalItem?.asking_price}
      />
    </div>
  );
}
