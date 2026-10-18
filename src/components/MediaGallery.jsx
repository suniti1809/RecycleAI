import React, { useState } from 'react';
import { resolveImageUrl, EWASTE_ICONS, CATEGORY_LABELS } from '../api';

export default function MediaGallery({ media = [], category = 'ELECTRONIC_COMPONENT', title = 'E-Waste Item', confidence = null }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'photos', 'video'
  const [failedImages, setFailedImages] = useState({});

  // Organize slots
  const classificationImage = media.find(m => m.media_type === 'classification_image');
  const photo1 = media.find(m => m.media_type === 'additional_photo_1');
  const photo2 = media.find(m => m.media_type === 'additional_photo_2');
  const video = media.find(m => m.media_type === 'condition_video');

  const photos = [
    { item: classificationImage, label: '📸 Original Item Photo', type: 'classification_image', isAI: true },
    { item: photo1, label: '📸 Side / Alternate Angle', type: 'additional_photo_1' },
    { item: photo2, label: '📸 Ports / Serial Label Angle', type: 'additional_photo_2' }
  ];

  const catIcon = EWASTE_ICONS[category] || '📦';

  return (
    <div className="media-gallery-container" style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: 18, marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📦 Verified Item Photos & Video</span>
            <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--green-dim)', color: 'var(--green-dark)', padding: '2px 8px', borderRadius: 12 }}>
              {media.length}/4 Media Uploads
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Inspect item condition, physical angles, and verified test video before bidding
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('all')}
          >
            All Media
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'photos' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('photos')}
          >
            Photos ({photos.filter(p => p.item).length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'video' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('video')}
          >
            Video {video ? '✓' : ''}
          </button>
        </div>
      </div>

      {/* Grid of Media Items */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {/* Photo Slots */}
        {(activeTab === 'all' || activeTab === 'photos') && photos.map((p, idx) => {
          const rawUrl = p.item ? (p.item.storage_key || p.item.url) : null;
          const url = rawUrl ? resolveImageUrl(rawUrl) : null;
          const isFailed = failedImages[idx];

          return (
            <div
              key={idx}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{
                  position: 'relative',
                  height: 140,
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: url && !isFailed ? 'pointer' : 'default',
                  overflow: 'hidden'
                }}
                onClick={() => url && !isFailed && setSelectedPhoto(url)}
              >
                {url && !isFailed ? (
                  <>
                    <img
                      src={url}
                      alt={p.label}
                      onError={() => setFailedImages(prev => ({ ...prev, [idx]: true }))}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s ease' }}
                    />
                    <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, backdropFilter: 'blur(3px)' }}>
                      🔍 Zoom
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 12 }}>
                    <div style={{ fontSize: 32, marginBottom: 4 }}>{catIcon}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                      {p.item ? 'Photo Ready' : 'Photo Missing'}
                    </div>
                    {p.item && (
                      <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>✓ Verified Upload</span>
                    )}
                  </div>
                )}

                {p.isAI && (
                  <span style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(5,150,105,0.95)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 4 }}>
                    ✓ Verified Item Photo
                  </span>
                )}
              </div>

              <div style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--text)', borderTop: '1px solid var(--border)' }}>
                {p.label}
              </div>
            </div>
          );
        })}

        {/* Video Slot */}
        {(activeTab === 'all' || activeTab === 'video') && (
          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gridColumn: activeTab === 'video' ? '1 / -1' : 'span 1'
            }}
          >
            <div style={{ position: 'relative', minHeight: 140, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {video ? (
                <video
                  src={resolveImageUrl(video.storage_key || video.url)}
                  controls
                  preload="metadata"
                  style={{ width: '100%', height: 140, objectFit: 'contain', background: '#000' }}
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 14 }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>📹</div>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>Condition Video Missing</div>
                </div>
              )}
            </div>

            <div style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--text)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>🎥 Item Condition Video</span>
              {video && <span style={{ color: 'var(--green)', fontSize: 11, fontWeight: 700 }}>✓ Verified</span>}
            </div>
          </div>
        )}
      </div>

      {/* Enlarged Photo Modal */}
      {selectedPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: 20
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{
                position: 'absolute',
                top: -40,
                right: 0,
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 28,
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
            <img
              src={selectedPhoto}
              alt="Enlarged view"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 'var(--radius)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
