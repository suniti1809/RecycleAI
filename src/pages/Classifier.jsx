import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUpload, apiFetch, fmtRupee, EWASTE_ICONS, CATEGORY_LABELS, resolveImageUrl } from '../api';
import { useToast } from '../context/ToastContext';
import ProductLifecycleModal from '../components/ProductLifecycleModal';

const CONDITIONS = [
  { id: 'good',  icon: '✅', label: 'Good / Working',    sub: 'Functional, minor wear' },
  { id: 'fair',  icon: '⚠️', label: 'Partially Working', sub: 'Minor faults / damaged ports' },
  { id: 'poor',  icon: '❌', label: 'Scrap / Dead',      sub: 'Non-functional / burnt / broken' },
];

export default function Classifier() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef();
  const photo1Ref = useRef();
  const photo2Ref = useRef();
  const videoRef = useRef();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [condition, setCondition] = useState('good');
  const [dragging, setDragging] = useState(false);

  const [classifying, setClassifying] = useState(false);
  const [result, setResult] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [advice, setAdvice] = useState(null);
  const [showLifecycleModal, setShowLifecycleModal] = useState(false);

  // Listing creation form state (Pre-filled after AI classification)
  const [showListingModal, setShowListingModal] = useState(false);
  const [listingTitle, setListingTitle] = useState('');
  const [listingCategory, setListingCategory] = useState('');
  const [listingDescription, setListingDescription] = useState('');
  const [listingPrice, setListingPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [listingWeight, setListingWeight] = useState('1.5');
  const [listingQuantity, setListingQuantity] = useState('1');
  const [listingAddress, setListingAddress] = useState('');
  const [listingCity, setListingCity] = useState('');
  const [submittingListing, setSubmittingListing] = useState(false);

  // Additional Required Media Slots (Phase 1 Requirement)
  // Slot 1 is the classification image (result.image_url / preview)
  const [photo1File, setPhoto1File] = useState(null);
  const [photo1Preview, setPhoto1Preview] = useState(null);

  const [photo2File, setPhoto2File] = useState(null);
  const [photo2Preview, setPhoto2Preview] = useState(null);

  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);

  const saveScanToSession = (customData = {}) => {
    try {
      const payload = {
        result: customData.result !== undefined ? customData.result : result,
        valuation: customData.valuation !== undefined ? customData.valuation : valuation,
        advice: customData.advice !== undefined ? customData.advice : advice,
        previewUrl: customData.previewUrl !== undefined ? customData.previewUrl : (result?.image_url || preview),
        condition: customData.condition !== undefined ? customData.condition : condition,
        listingTitle: customData.listingTitle !== undefined ? customData.listingTitle : listingTitle,
        listingCategory: customData.listingCategory !== undefined ? customData.listingCategory : listingCategory,
        listingPrice: customData.listingPrice !== undefined ? customData.listingPrice : listingPrice,
        listingDescription: customData.listingDescription !== undefined ? customData.listingDescription : listingDescription,
        listingWeight: customData.listingWeight !== undefined ? customData.listingWeight : listingWeight,
        listingQuantity: customData.listingQuantity !== undefined ? customData.listingQuantity : listingQuantity,
        listingAddress: customData.listingAddress !== undefined ? customData.listingAddress : listingAddress,
        listingCity: customData.listingCity !== undefined ? customData.listingCity : listingCity,
        isNegotiable: customData.isNegotiable !== undefined ? customData.isNegotiable : isNegotiable
      };
      if (payload.result) {
        sessionStorage.setItem('recycleai_saved_scan', JSON.stringify(payload));
      }
    } catch (e) {
      console.warn('SessionStorage save error:', e);
    }
  };

  const clearScan = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setValuation(null);
    setAdvice(null);
    setShowListingModal(false);
    setPhoto1File(null);
    setPhoto1Preview(null);
    setPhoto2File(null);
    setPhoto2Preview(null);
    setVideoFile(null);
    setVideoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
    if (photo1Ref.current) photo1Ref.current.value = '';
    if (photo2Ref.current) photo2Ref.current.value = '';
    if (videoRef.current) videoRef.current.value = '';
    try {
      sessionStorage.removeItem('recycleai_saved_scan');
    } catch (e) {}
  };

  // Restore saved scan on mount so navigating to map or another page doesn't wipe progress
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('recycleai_saved_scan');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.result) {
          setResult(saved.result);
          setValuation(saved.valuation || null);
          setAdvice(saved.advice || null);
          setCondition(saved.condition || 'good');
          if (saved.previewUrl) {
            setPreview(resolveImageUrl(saved.previewUrl));
          }
          if (saved.listingTitle) setListingTitle(saved.listingTitle);
          if (saved.listingCategory) setListingCategory(saved.listingCategory);
          if (saved.listingPrice) setListingPrice(saved.listingPrice);
          if (saved.listingDescription) setListingDescription(saved.listingDescription);
          if (saved.listingWeight) setListingWeight(saved.listingWeight);
          if (saved.listingQuantity) setListingQuantity(saved.listingQuantity);
          if (saved.listingAddress) setListingAddress(saved.listingAddress);
          if (saved.listingCity) setListingCity(saved.listingCity);
          if (typeof saved.isNegotiable === 'boolean') setIsNegotiable(saved.isNegotiable);
        }
      }
    } catch (e) {
      console.warn('Failed restoring saved scan:', e);
    }
  }, []);

  const loadFile = (f) => {
    if (!f || !f.type.startsWith('image/')) {
      showToast('Please select a valid JPG or PNG image', 'error');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setValuation(null);
    setAdvice(null);
    setShowListingModal(false);
    try {
      sessionStorage.removeItem('recycleai_saved_scan');
    } catch (e) {}
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  }, []);

  const handlePhoto1Change = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      showToast('Photo 1 must be in JPEG, PNG, or WebP format', 'error');
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      showToast('Photo 1 exceeds the 15MB size limit', 'error');
      return;
    }
    setPhoto1File(f);
    setPhoto1Preview(URL.createObjectURL(f));
    showToast('Additional Photo 1 loaded ✓', 'success');
  };

  const handlePhoto2Change = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      showToast('Photo 2 must be in JPEG, PNG, or WebP format', 'error');
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      showToast('Photo 2 exceeds the 15MB size limit', 'error');
      return;
    }
    setPhoto2File(f);
    setPhoto2Preview(URL.createObjectURL(f));
    showToast('Additional Photo 2 loaded ✓', 'success');
  };

  const handleVideoChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      showToast('Item Condition Video must be in MP4, WebM, or MOV format', 'error');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      showToast('Condition video exceeds the 50MB size limit', 'error');
      return;
    }
    setVideoFile(f);
    setVideoPreview(URL.createObjectURL(f));
    showToast('Condition video loaded ✓', 'success');
  };

  const classify = async () => {
    if (!file) return;
    setClassifying(true);
    setResult(null);
    setValuation(null);
    setAdvice(null);

    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('condition', condition);

      const data = await apiUpload('/classify/', fd);
      setResult(data);
      setValuation(data.valuation);
      setAdvice(data.advice);

      // Pre-fill listing form values
      const catLabel = CATEGORY_LABELS[data.class_name] || data.class_name?.replace(/_/g, ' ') || 'E-Waste Item';
      const initialTitle = `${condition.toUpperCase()} ${catLabel}`;
      const initialCat = data.class_name;
      const initialPrice = data.valuation?.estimated_value ? String(data.valuation.estimated_value) : '500';
      const initialDesc = `${condition.charAt(0).toUpperCase() + condition.slice(1)} condition ${catLabel}. Complete verified photos and condition video included. Ready for recycler collection.`;

      setListingTitle(initialTitle);
      setListingCategory(initialCat);
      setListingPrice(initialPrice);
      setListingDescription(initialDesc);

      saveScanToSession({
        result: data,
        valuation: data.valuation,
        advice: data.advice,
        previewUrl: data.image_url,
        condition,
        listingTitle: initialTitle,
        listingCategory: initialCat,
        listingPrice: initialPrice,
        listingDescription: initialDesc
      });

      showToast(`Identified: ${catLabel}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setClassifying(false);
    }
  };

  // Check completeness of 4 required media slots
  const hasClassificationImage = !!(result?.image_url || file);
  const hasPhoto1 = !!photo1File;
  const hasPhoto2 = !!photo2File;
  const hasVideo = !!videoFile;
  const uploadedCount = (hasClassificationImage ? 1 : 0) + (hasPhoto1 ? 1 : 0) + (hasPhoto2 ? 1 : 0) + (hasVideo ? 1 : 0);
  const isMediaComplete = uploadedCount === 4;

  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (!result) return;

    if (!isMediaComplete) {
      showToast('All 4 media items (AI image, 2 photos, and 1 condition video) are required before publishing!', 'error');
      return;
    }

    setSubmittingListing(true);

    try {
      const fd = new FormData();
      fd.append('title', listingTitle);
      fd.append('category', listingCategory);
      fd.append('detected_category', result.class_name);
      fd.append('confidence', result.confidence || 0);
      fd.append('condition', condition);
      fd.append('weight_kg', parseFloat(listingWeight) || 1.0);
      fd.append('quantity', parseInt(listingQuantity) || 1);
      fd.append('asking_price', parseFloat(listingPrice) || 0.0);
      fd.append('is_negotiable', isNegotiable);
      fd.append('pickup_address', listingAddress);
      fd.append('approx_location', listingCity || listingAddress.split(',').slice(-2).join(',').trim() || 'Prayagraj');
      fd.append('description', listingDescription);

      if (advice) {
        fd.append('ai_recommendations', JSON.stringify(advice));
        fd.append('safety_warnings', JSON.stringify(advice.safety_warnings || []));
      }

      // Slot 1: Classification image
      if (result.image_url) {
        fd.append('classification_image_url', result.image_url);
      }
      if (file) {
        fd.append('classification_image', file);
      }

      // Slot 2: Additional Photo 1
      if (photo1File) {
        fd.append('additional_photo_1', photo1File);
      }

      // Slot 3: Additional Photo 2
      if (photo2File) {
        fd.append('additional_photo_2', photo2File);
      }

      // Slot 4: Condition Video
      if (videoFile) {
        fd.append('condition_video', videoFile);
      }

      const res = await apiUpload('/listings', fd);

      showToast('Listing published with all 4 verified photos & video! 🎉', 'success');
      try {
        sessionStorage.removeItem('recycleai_saved_scan');
      } catch (e) {}
      setShowListingModal(false);
      navigate(`/marketplace`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingListing(false);
    }
  };

  const icon = result ? (EWASTE_ICONS[result.class_name] || '♻️') : '♻️';
  const confidence = result ? Math.round((result.confidence || 0) * 100) : 0;
  const categoryName = result ? (CATEGORY_LABELS[result.class_name] || result.class_name?.replace(/_/g, ' ')) : '';

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: 60 }}>
      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--green-dim)', borderRadius: 20, fontSize: 12, fontWeight: 700, color: 'var(--green-dark)', marginBottom: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
          ✨ Smart AI E-Waste Scanner & Price Estimator
        </div>
        <div className="page-title" style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>
          🔬 AI E-Waste Scanner & Price Estimator
        </div>
        <div className="page-sub" style={{ color: 'var(--text-muted)' }}>
          Upload or capture a photo — our system automatically identifies your electronic items, estimates fair scrap value, and suggests certified recyclers for doorstep pickup.
        </div>
      </div>

      {/* ── Two-Column Layout ── */}
      <div className="classifier-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Column: Upload & Settings */}
        <div>
          {/* Dropzone */}
          {!preview ? (
            <div
              className={`classifier-viewfinder${dragging ? ' drag-over' : ''}`}
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{ background: 'var(--surface)', border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: '40px 20px', textAlign: 'center', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 44, marginBottom: 12 }}>📸</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Drop Electronic Photo Here</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Click to browse or drag JPG / PNG file</div>
              <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--green-dim)', color: 'var(--green-dark)', padding: '4px 10px', borderRadius: 12 }}>
                ✓ High-Resolution Photo Upload
              </span>
            </div>
          ) : (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: 260, background: '#000' }}>
                <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                <span style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8 }}>
                  {result ? '✓ Item Scanned & Analyzed' : 'Ready to Scan'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button className="btn btn-secondary" style={{ flex: 1, padding: 8, fontSize: 13 }} onClick={() => fileRef.current.click()}>
                  🔄 Change Photo
                </button>
                <button className="btn btn-danger" style={{ padding: '8px 14px', fontSize: 13 }} onClick={clearScan}>
                  🗑 Clear
                </button>
              </div>
            </div>
          )}

          {/* Condition Selector */}
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Item Hardware Condition:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {CONDITIONS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCondition(c.id)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: 'var(--radius-sm)',
                    border: condition === c.id ? '2px solid var(--green)' : '1px solid var(--border)',
                    background: condition === c.id ? 'var(--green-dim)' : 'var(--surface)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ fontSize: 18 }}>{c.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: condition === c.id ? 'var(--green-dark)' : 'var(--text)', marginTop: 2 }}>{c.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Analyze / Scan Button */}
          {!result ? (
            <button
              className="btn btn-primary"
              onClick={classify}
              disabled={!file || classifying}
              style={{ width: '100%', padding: '14px', fontSize: 15, justifyContent: 'center', borderRadius: 'var(--radius)' }}
            >
              {classifying ? <><span className="spinner" /> Scanning Photo…</> : '⚡ Scan Item & Estimate Scrap Value →'}
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={clearScan}
              style={{ width: '100%', padding: '14px', fontSize: 15, justifyContent: 'center', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
            >
              🔄 Scan Another E-Waste Item
            </button>
          )}
        </div>

        {/* Right Column: AI Results & Actions */}
        <div>
          {!result && !classifying && (
            <div className="card" style={{ padding: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>💡 How the AI Scanner Works</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
                Simply upload a photo of your old or broken electronics. Our system instantly identifies the device category and estimates scrap market rates.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
                  <div key={catKey} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: 12, border: '1px solid var(--border)' }}>
                    <span>{EWASTE_ICONS[catKey] || '⚡'}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {classifying && (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔬</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Analyzing Item Photo…</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>Identifying electronic components, physical condition, and calculating scrap value…</p>
              <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden', maxWidth: 300, margin: '0 auto' }}>
                <div style={{ width: '70%', height: '100%', background: 'var(--green)', borderRadius: 3, animation: 'pulse 1s infinite' }} />
              </div>
            </div>
          )}

          {result && (
            <div className="card" style={{ padding: 24 }}>
              {/* Classification Banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 'var(--radius)', background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                    {icon}
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: result.low_confidence ? '#fef3c7' : 'var(--green-dim)', color: result.low_confidence ? '#92400e' : 'var(--green-dark)' }}>
                      {result.low_confidence ? '⚠️ Low Confidence' : '✅ Identified Item'}
                    </span>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
                      {categoryName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Category: {categoryName}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Match Accuracy</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--green)' }}>{confidence}%</div>
                </div>
              </div>

              {/* Valuation & Scrap Guidance */}
              {valuation && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Estimated Scrap Payout</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', marginTop: 2 }}>{fmtRupee(valuation.estimated_value)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Typical Benchmark Range</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>{fmtRupee(valuation.min_value)} – {fmtRupee(valuation.max_value)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Estimated CO₂e Offset</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue)', marginTop: 4 }}>+2.4 kg CO₂e</div>
                  </div>
                </div>
              )}

              {/* AI Recycling Advisor Recommendations */}
              {advice && (
                <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 20, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>🧠</span>
                    <h4 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>AI Recycling Advisor Protocols</h4>
                  </div>

                  {/* Safety Warnings Banner */}
                  {advice.safety_warnings && advice.safety_warnings.length > 0 && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#b91c1c', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        ⚠️ Mandatory Safety Protocols:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#7f1d1d', lineHeight: 1.5 }}>
                        {advice.safety_warnings.map((w, idx) => (
                          <li key={idx} style={{ marginBottom: 4 }}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Preparation Steps */}
                  {advice.preparation_steps && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Recommended Preparation:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {advice.preparation_steps.map((step, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text-dim)' }}>
                            <span style={{ color: 'var(--green)', fontWeight: 800 }}>✓</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Potential Materials Recoverable */}
                  {advice.recoverable_materials && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {advice.recoverable_materials.map((mat, idx) => (
                        <span key={idx} style={{ fontSize: 11, fontWeight: 600, background: 'var(--surface)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: 8, color: 'var(--text-muted)' }}>
                          {mat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Product Lifecycle & Circular Processing Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.14), rgba(56, 189, 248, 0.1))',
                borderRadius: 'var(--radius)',
                padding: '16px 20px',
                marginBottom: 20,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 30 }}>♻️</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                      What Happens to This Product? (Circular Lifecycle & Fate)
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Certified data wiping, hazardous depollution, precision dismantling & urban mining.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowLifecycleModal(true)}
                  style={{ fontWeight: 800, padding: '8px 16px', background: 'linear-gradient(135deg, var(--green), #059669)', border: 'none' }}
                >
                  🔍 View 5-Stage Circular Lifecycle →
                </button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowListingModal(true)}
                  style={{ justifyContent: 'center', padding: '14px', fontSize: 15 }}
                >
                  🛒 List on Marketplace & Get Bids →
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    saveScanToSession();
                    window.open(`/map?category=${result.class_name}`, '_blank');
                  }}
                  style={{ justifyContent: 'center', padding: '14px', fontSize: 15 }}
                  title="Opens Certified Recyclers Map in a new tab without losing your scanned item"
                >
                  🗺️ Find Verified Recyclers ↗
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Publish Marketplace Listing Modal with 4 Media Slots ── */}
      {showListingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ maxWidth: 640, width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: 26, borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
                  🛒 Publish E-Waste Listing
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Complete item details and upload all 4 required media items for buyer verification.
                </div>
              </div>
              <button onClick={() => setShowListingModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>
                ✕
              </button>
            </div>

            {/* ══════════════════════════════════════════════════════
                SECTION: ITEM PHOTOS & VIDEO (4 REQUIRED SLOTS)
            ══════════════════════════════════════════════════════ */}
            <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: 18, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📸 Item Photos & Video</span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: isMediaComplete ? 'var(--green-dim)' : '#fef3c7',
                    color: isMediaComplete ? 'var(--green-dark)' : '#b45309'
                  }}>
                    {isMediaComplete ? '✅ 4/4 Media Slots Complete' : `⚠️ ${uploadedCount}/4 Uploads Complete (All Required)`}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Photos: max 15MB • Video: max 50MB (max 60s)
                </span>
              </div>

              {/* 4 Media Slots Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {/* Slot 1: AI Classification Image */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 8, textAlign: 'center' }}>
                  <div style={{ width: '100%', height: 75, borderRadius: 6, background: '#000', overflow: 'hidden', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {preview ? (
                      <img src={preview} alt="AI scan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span>📷</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--green-dark)', lineHeight: 1.2 }}>
                    1. AI Image
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, marginTop: 2 }}>
                    ✓ Auto-Linked
                  </div>
                </div>

                {/* Slot 2: Additional Photo 1 */}
                <div style={{ background: 'var(--surface)', border: hasPhoto1 ? '1px solid var(--green)' : '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: 8, textAlign: 'center' }}>
                  <div
                    style={{ width: '100%', height: 75, borderRadius: 6, background: '#f1f5f9', overflow: 'hidden', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onClick={() => photo1Ref.current.click()}
                  >
                    {photo1Preview ? (
                      <img src={photo1Preview} alt="Angle 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 20 }}>📸</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>
                    2. Photo 1 (Angle)
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 10, padding: '2px 6px', marginTop: 4, width: '100%', justifyContent: 'center' }}
                    onClick={() => photo1Ref.current.click()}
                  >
                    {hasPhoto1 ? 'Replace' : '+ Upload'}
                  </button>
                  <input ref={photo1Ref} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhoto1Change} />
                </div>

                {/* Slot 3: Additional Photo 2 */}
                <div style={{ background: 'var(--surface)', border: hasPhoto2 ? '1px solid var(--green)' : '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: 8, textAlign: 'center' }}>
                  <div
                    style={{ width: '100%', height: 75, borderRadius: 6, background: '#f1f5f9', overflow: 'hidden', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onClick={() => photo2Ref.current.click()}
                  >
                    {photo2Preview ? (
                      <img src={photo2Preview} alt="Angle 2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 20 }}>📸</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>
                    3. Photo 2 (Angle)
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 10, padding: '2px 6px', marginTop: 4, width: '100%', justifyContent: 'center' }}
                    onClick={() => photo2Ref.current.click()}
                  >
                    {hasPhoto2 ? 'Replace' : '+ Upload'}
                  </button>
                  <input ref={photo2Ref} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhoto2Change} />
                </div>

                {/* Slot 4: Item Condition Video */}
                <div style={{ background: 'var(--surface)', border: hasVideo ? '1px solid var(--green)' : '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: 8, textAlign: 'center' }}>
                  <div
                    style={{ width: '100%', height: 75, borderRadius: 6, background: '#000', overflow: 'hidden', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onClick={() => videoRef.current.click()}
                  >
                    {videoPreview ? (
                      <video src={videoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 20 }}>🎥</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>
                    4. Item Video
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 10, padding: '2px 6px', marginTop: 4, width: '100%', justifyContent: 'center' }}
                    onClick={() => videoRef.current.click()}
                  >
                    {hasVideo ? 'Replace' : '+ Video'}
                  </button>
                  <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime" style={{ display: 'none' }} onChange={handleVideoChange} />
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateListing} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="field-label">Listing Title</label>
                <input className="auth-input" type="text" value={listingTitle} onChange={e => setListingTitle(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-label">E-Waste Category</label>
                  <select className="auth-input" value={listingCategory} onChange={e => setListingCategory(e.target.value)} required>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Asking Price (₹)</label>
                  <input className="auth-input" type="number" min="0" value={listingPrice} onChange={e => setListingPrice(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-label">Est. Weight (kg)</label>
                  <input className="auth-input" type="number" step="0.1" min="0.1" value={listingWeight} onChange={e => setListingWeight(e.target.value)} required />
                </div>
                <div>
                  <label className="field-label">Quantity</label>
                  <input className="auth-input" type="number" min="1" value={listingQuantity} onChange={e => setListingQuantity(e.target.value)} required />
                </div>
              </div>

              <div>
                <label className="field-label">Full Pickup Address (Private until deal accepted)</label>
                <input className="auth-input" type="text" placeholder="House/Flat No, Street, Landmark, City, PIN" value={listingAddress} onChange={e => setListingAddress(e.target.value)} required />
              </div>

              <div>
                <label className="field-label">City / Locality (Displayed publicly)</label>
                <input className="auth-input" type="text" placeholder="e.g. Civil Lines, Prayagraj" value={listingCity} onChange={e => setListingCity(e.target.value)} />
              </div>

              <div>
                <label className="field-label">Description / Condition Notes</label>
                <textarea className="auth-input" rows="2" value={listingDescription} onChange={e => setListingDescription(e.target.value)} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="neg" checked={isNegotiable} onChange={e => setIsNegotiable(e.target.checked)} />
                <label htmlFor="neg" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                  Allow price negotiations from buyers
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowListingModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, justifyContent: 'center' }}
                  disabled={submittingListing || !isMediaComplete}
                  title={!isMediaComplete ? 'Please upload all 4 required media slots before publishing' : 'Publish to Marketplace'}
                >
                  {submittingListing ? <><span className="spinner" /> Publishing…</> : isMediaComplete ? '🚀 Publish Listing Now' : `Upload Missing Media (${uploadedCount}/4)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) loadFile(e.target.files[0]); }}
      />

      {/* ── Product Lifecycle Modal ── */}
      <ProductLifecycleModal
        isOpen={showLifecycleModal}
        onClose={() => setShowLifecycleModal(false)}
        category={result?.class_name || listingCategory}
        itemName={listingTitle || result?.label || 'E-Waste Item'}
        weightKg={parseFloat(listingWeight) || 1.5}
        agreedPrice={valuation?.estimated_value || (listingPrice ? parseFloat(listingPrice) : null)}
      />
    </div>
  );
}
