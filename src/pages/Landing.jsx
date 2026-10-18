import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';


/* ── Shared hero left panel ── */
function HeroPanel({ forRecycler = false }) {
  return (
    <section className="hero-panel animate-fade-in">
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 540 }}>
        {/* Brand Name on Left Hero Side - High Contrast */}
        <div className="hero-brand-header">
          <div className="hero-brand-icon" style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            background: forRecycler
              ? 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'
              : 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            boxShadow: forRecycler ? '0 6px 22px rgba(139, 92, 246, 0.5)' : '0 6px 22px rgba(16, 185, 129, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {forRecycler ? '🚚' : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" />
                <path d="M11 19h8.2a1.8 1.8 0 0 0 1.57-.881 1.785 1.785 0 0 0 .004-1.784L16.8 9.5" />
                <path d="M11 5h2a1.8 1.8 0 0 1 1.57.881l4.03 6.919" />
                <path d="m11 2-4 4 4 4" />
                <path d="m16 14 4 4-4 4" />
                <path d="m5 10 4-4" />
              </svg>
            )}
          </div>
          <div className="hero-brand-text">
            <div style={{ fontSize: 25, fontWeight: 900, lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: 2, letterSpacing: '-0.5px' }}>
              <span style={{ color: '#FFFFFF' }}>Recycle</span>
              <span style={{ color: '#10B981', textShadow: '0 0 16px rgba(16, 185, 129, 0.6)' }}>AI</span>
            </div>
            <span className="hero-brand-tagline" style={{ color: forRecycler ? 'var(--purple-light)' : 'var(--primary)', fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 3 }}>
              {forRecycler ? 'Recycler Partner Portal' : 'Smart Circular E-Waste'}
            </span>
          </div>
        </div>

        <div className="hero-badge">
          <span className="badge-dot" />
          {forRecycler ? '♻️ Recycler Partner Network' : '✨ AI-Powered E-Waste Revolution'}
        </div>

        <h1 className="hero-title">
          {forRecycler ? (
            <>Empower Your <span className="purple">Recycling Fleet</span></>
          ) : (
            <>Turn E-Waste Into <span className="green">Instant Value</span></>
          )}
        </h1>

        <p className="hero-desc">
          {forRecycler
            ? 'Connect directly with local households & businesses. Claim e-waste pickup jobs, track batch yields, and maximize your scrap recovery profits.'
            : 'Point your camera at old phones, motherboards, or appliances. Our vision AI identifies recyclable components, estimates cash value, and dispatches doorstep pickup in minutes.'}
        </p>

        <div className="feature-pills" style={{ animationDelay: '0.1s' }}>
          {forRecycler ? (
            <>
              <div className="feature-pill"><span className="pill-dot green" />🗺️ Live Area Pickup Jobs</div>
              <div className="feature-pill"><span className="pill-dot white" />⚖️ Verified Scrap Weight Tracking</div>
              <div className="feature-pill"><span className="pill-dot purple" />💸 Instant Recycler Settlements</div>
            </>
          ) : (
            <>
              <div className="feature-pill"><span className="pill-dot green" />📸 98%+ Accuracy AI Vision Model</div>
              <div className="feature-pill"><span className="pill-dot white" />⚡ Live Market Price Valuation</div>
              <div className="feature-pill"><span className="pill-dot purple" />🚚 Free Doorstep Pickup & Cash</div>
            </>
          )}
        </div>

        <div className="hero-stats" style={{ animationDelay: '0.2s' }}>
          <div className="stat-item">
            <div className="stat-val green">1,500+</div>
            <div className="stat-lbl">Pickups Completed</div>
          </div>
          <div className="stat-item">
            <div className="stat-val white">₹4.8L+</div>
            <div className="stat-lbl">Paid to Sellers</div>
          </div>
          <div className="stat-item">
            <div className="stat-val purple">3.4 Tons</div>
            <div className="stat-lbl">CO₂ Prevented</div>
          </div>
        </div>

        <a href="#how-it-works" className="hero-scroll-hint">
          <span>Explore features & scrap rates below</span>
          <span className="scroll-arrow">↓</span>
        </a>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   USER LOGIN / REGISTER
══════════════════════════════════════════════ */
function UserAuthPanel() {
  const [mode, setMode] = useState('login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', address: '' });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: form.email, password: form.password, role: 'user' }),
        });
        if (data.user.role !== 'user') {
          setError('This is a User portal. Recyclers must use the Recycler Portal.');
          setLoading(false);
          return;
        }
        login(data.token, data.user);
        showToast(`Welcome back, ${data.user.name}! 👋`, 'success');
        navigate('/dashboard');
      } else {
        const data = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ ...form, role: 'user' }),
        });
        login(data.token, data.user);
        showToast('Account created! Welcome to Recycle AI 🎉', 'success');
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-panel animate-slide-up">
      <div className="auth-box">
        {/* Logo - High Contrast */}
        <div className="auth-logo">
          <div className="logo-icon-box" style={{
            width: 46,
            height: 46,
            borderRadius: 13,
            background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 4px 18px rgba(16, 185, 129, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
              <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" />
              <path d="M11 19h8.2a1.8 1.8 0 0 0 1.57-.881 1.785 1.785 0 0 0 .004-1.784L16.8 9.5" />
              <path d="M11 5h2a1.8 1.8 0 0 1 1.57.881l4.03 6.919" />
              <path d="m11 2-4 4 4 4" />
              <path d="m16 14 4 4-4 4" />
              <path d="m5 10 4-4" />
            </svg>
          </div>
          <div>
            <div className="logo-title" style={{ fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 2, letterSpacing: '-0.4px' }}>
              <span style={{ color: '#FFFFFF' }}>Recycle</span>
              <span style={{ color: '#10B981', textShadow: '0 0 12px rgba(16, 185, 129, 0.5)' }}>AI</span>
            </div>
            <div className="logo-sub">User & Seller Portal</div>
          </div>
        </div>

        <h2 className="auth-heading">{mode === 'login' ? 'Sign In to Recycle 🌿' : 'Create Account 🚀'}</h2>
        <p className="auth-sub">
          {mode === 'login' ? 'Get AI estimates and schedule doorstep pickups.' : 'Join thousands turning old tech into instant rewards.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div>
                <div className="field-label">Full Name</div>
                <div className="input-wrap">
                  <input className="auth-input" type="text" placeholder="e.g. Alex Sharma" value={form.name} onChange={set('name')} required />
                  <span className="input-icon">👤</span>
                </div>
              </div>
              <div>
                <div className="field-label">Phone Number</div>
                <div className="input-wrap">
                  <input className="auth-input" type="tel" placeholder="9876543210" value={form.phone} onChange={set('phone')} />
                  <span className="input-icon">📞</span>
                </div>
              </div>
            </>
          )}

          <div>
            <div className="field-label">Email Address</div>
            <div className="input-wrap">
              <input className="auth-input" type="email" placeholder="name@example.com" value={form.email} onChange={set('email')} required autoComplete="email" />
              <span className="input-icon">✉️</span>
            </div>
          </div>

          <div>
            <div className="field-label">Password</div>
            <div className="input-wrap">
              <input className="auth-input" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={set('password')} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              <span className="input-icon" onClick={() => setShowPass(p => !p)} style={{ cursor: 'pointer' }}>{showPass ? '🙈' : '👁️'}</span>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <div className="field-label">Pickup Address / City</div>
              <div className="input-wrap">
                <input className="auth-input" type="text" placeholder="e.g. Indiranagar, Bengaluru" value={form.address} onChange={set('address')} />
                <span className="input-icon">📍</span>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="form-row">
              <label className="remember-label">
                <input type="checkbox" /> Remember me
              </label>
              <a href="#how-it-works" className="forgot-link">How It Works</a>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}

          <button type="submit" className="btn-signin" disabled={loading}>
            {loading ? <span className="spinner" /> : '🌿'}
            {loading ? 'Processing…' : (mode === 'login' ? 'Sign In' : 'Create Free Account')}
          </button>
        </form>

        <div className="auth-toggle-row" style={{ marginTop: 16 }}>
          {mode === 'login'
            ? <>New to Recycle AI? <a onClick={() => { setMode('register'); setError(''); }}>Create an account</a></>
            : <>Already registered? <a onClick={() => { setMode('login'); setError(''); }}>Sign in here</a></>}
        </div>

        <div className="auth-divider" style={{ margin: '20px 0' }}>or</div>

        <Link to="/recycler-portal">
          <button className="btn-recycler-portal">
            🚚 Go to Recycler & Collector Portal →
          </button>
        </Link>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   RECYCLER LOGIN / REGISTER
══════════════════════════════════════════════ */
function RecyclerAuthPanel() {
  const [mode, setMode] = useState('login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', address: '' });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: form.email, password: form.password, role: 'recycler' }),
        });
        if (data.user.role !== 'recycler') {
          setError('This is a Recycler portal. Regular users must use the User Portal.');
          setLoading(false);
          return;
        }
        login(data.token, data.user);
        showToast(`Welcome, ${data.user.name}! 🚚`, 'success');
        navigate('/recycler');
      } else {
        const data = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ ...form, role: 'recycler' }),
        });
        login(data.token, data.user);
        showToast('Recycler partner account created! 🎉', 'success');
        navigate('/recycler');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-panel animate-slide-up">
      <div className="auth-box">
        <div className="auth-logo">
          <div className="logo-icon-box" style={{
            width: 46,
            height: 46,
            borderRadius: 13,
            background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 4px 18px rgba(139, 92, 246, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            color: '#FFFFFF'
          }}>🚚</div>
          <div>
            <div className="logo-title" style={{ fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 2, letterSpacing: '-0.4px' }}>
              <span style={{ color: '#FFFFFF' }}>Recycle</span>
              <span style={{ color: '#A78BFA', textShadow: '0 0 12px rgba(167, 139, 250, 0.5)' }}>AI</span>
            </div>
            <div className="logo-sub">Certified Partner Network</div>
          </div>
        </div>

        <div style={{
          background: 'var(--muted-surface)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '10px 14px',
          fontSize: 13, color: 'var(--text)', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'flex-start'
        }}>
          <span>🔒</span>
          <span><strong>Recycler Portal</strong>: Access bulk pickup assignments & batch inventory. <Link to="/" style={{ color: 'var(--primary)', fontWeight: 700 }}>← User Portal</Link></span>
        </div>

        <h2 className="auth-heading">{mode === 'login' ? 'Recycler Sign In 🚚' : 'Join as Partner 📈'}</h2>
        <p className="auth-sub">
          {mode === 'login' ? 'Log in to view available pickups in your zone.' : 'Register your certified recycling business.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div>
                <div className="field-label">Company / Collector Name</div>
                <div className="input-wrap">
                  <input className="auth-input" type="text" placeholder="e.g. EcoGreen Recyclers LLP" value={form.name} onChange={set('name')} required />
                  <span className="input-icon">🏢</span>
                </div>
              </div>
              <div>
                <div className="field-label">Contact Phone</div>
                <div className="input-wrap">
                  <input className="auth-input" type="tel" placeholder="9876543210" value={form.phone} onChange={set('phone')} />
                  <span className="input-icon">📞</span>
                </div>
              </div>
            </>
          )}

          <div>
            <div className="field-label">Work Email</div>
            <div className="input-wrap">
              <input className="auth-input" type="email" placeholder="recycler@enterprise.com" value={form.email} onChange={set('email')} required />
              <span className="input-icon">✉️</span>
            </div>
          </div>

          <div>
            <div className="field-label">Password</div>
            <div className="input-wrap">
              <input className="auth-input" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={set('password')} required />
              <span className="input-icon" onClick={() => setShowPass(p => !p)} style={{ cursor: 'pointer' }}>{showPass ? '🙈' : '👁️'}</span>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <div className="field-label">Service Operational Zone</div>
              <div className="input-wrap">
                <input className="auth-input" type="text" placeholder="e.g. North Zone / Bengaluru Metro" value={form.address} onChange={set('address')} />
                <span className="input-icon">📍</span>
              </div>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}

          <button type="submit" className="btn-signin"
            style={{ background: 'var(--purple)', color: '#FFFFFF', boxShadow: '0 4px 14px var(--purple-glow)' }}
            disabled={loading}>
            {loading ? <span className="spinner" /> : '🚚'}
            {loading ? 'Please wait…' : (mode === 'login' ? 'Access Partner Portal' : 'Register Partner Account')}
          </button>
        </form>

        <div className="auth-toggle-row" style={{ marginTop: 16 }}>
          {mode === 'login'
            ? <>New recycler? <a onClick={() => { setMode('register'); setError(''); }} style={{ color: 'var(--primary)' }}>Apply here</a></>
            : <>Already approved? <a onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--primary)' }}>Sign in</a></>}
        </div>

        <div className="auth-divider" style={{ margin: '20px 0' }}>or</div>

        <Link to="/">
          <button className="btn-recycler-portal">
            👤 Switch to User / Seller Portal →
          </button>
        </Link>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   RICH LANDING SECTIONS (BELOW THE HERO)
══════════════════════════════════════════════ */

function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      icon: '📸',
      title: 'Snap & Detect',
      desc: 'Point your camera or upload any photo of old tech. Our smart AI identifies components, casing, and condition in under 2 seconds.'
    },
    {
      num: '02',
      icon: '💎',
      title: 'Instant Fair Valuation',
      desc: 'Get an algorithmic scrap quote calculated against live commodities pricing for gold, copper, aluminum, and rare earth materials.'
    },
    {
      num: '03',
      icon: '🚚',
      title: 'Free Pickup & Payout',
      desc: 'Choose a convenient 2-hour doorstep pickup window. Certified recyclers collect the item and transfer money instantly to your UPI or bank.'
    }
  ];

  return (
    <section className="rich-section" id="how-it-works">
      <div className="section-badge">How It Works</div>
      <h2 className="section-title">Recycle Old Electronics in <span className="green">3 Easy Steps</span></h2>
      <p className="section-subtitle">No negotiating with local scrap vendors. Everything is verified, automated, and eco-certified.</p>

      <div className="steps-grid">
        {steps.map((s, idx) => (
          <div key={idx} className="step-card">
            <div className="step-num">{s.num}</div>
            <div className="step-icon-box">{s.icon}</div>
            <h3 className="step-card-title">{s.title}</h3>
            <p className="step-card-desc">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AcceptedItemsSection() {
  const items = [
    { name: 'Smartphones & Tablets', rate: '₹150 – ₹1,200/unit', icon: '📱', tag: 'High Rare Earths' },
    { name: 'Laptops & MacBooks', rate: '₹400 – ₹3,500/unit', icon: '💻', tag: 'Gold & RAM recovery' },
    { name: 'Motherboards & PCBs', rate: '₹320/kg', icon: '🖲️', tag: 'High Grade Circuit' },
    { name: 'Lithium-Ion Batteries', rate: '₹180/kg', icon: '🔋', tag: 'Eco Hazard Safe' },
    { name: 'Copper Cables & Chargers', rate: '₹220/kg', icon: '🔌', tag: '99% Pure Copper' },
    { name: 'Monitors & TVs', rate: '₹250 – ₹1,800/unit', icon: '🖥️', tag: 'Glass & Metals' },
  ];

  return (
    <section className="rich-section" id="scrap-rates">
      <div className="section-badge">
        Market Rates
      </div>
      <h2 className="section-title">Accepted E-Waste & <span className="purple">Live Scrap Quotes</span></h2>
      <p className="section-subtitle">Fair, transparent payouts driven by actual precious metal extraction yield.</p>

      <div className="items-grid">
        {items.map((item, idx) => (
          <div key={idx} className="item-card">
            <div className="item-icon-wrap">{item.icon}</div>
            <div className="item-details">
              <span className="item-tag">{item.tag}</span>
              <h4 className="item-name">{item.name}</h4>
              <div className="item-rate">{item.rate}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LiveAIDemoSection() {
  return (
    <section className="rich-section" id="ai-demo">
      <div className="section-badge">Vision AI Technology</div>
      <h2 className="section-title">Advanced <span className="green">Component Recognition AI</span></h2>
      <p className="section-subtitle">Real-time object detection identifies microchips, battery types, and precious metals on sight.</p>

      <div className="ai-demo-card">
        <div className="ai-demo-visual">
          <div className="ai-scanner-box">
            <div className="scanner-line" />
            <div className="ai-detection-tag">
              <span className="dot" /> Lithium-Ion Battery Pack • 98.6% Confidence
            </div>
            <div className="scanner-graphic">
              🔋 ⚡ 💾
            </div>
          </div>
        </div>

        <div className="ai-demo-info">
          <div className="ai-metric-badge">🟢 Real-Time Extraction Summary</div>
          <h3 className="ai-demo-heading">Detected: Lenovo ThinkPad Battery (45N1001)</h3>
          
          <div className="ai-yield-list">
            <div className="yield-row">
              <span>Estimated Lithium Yield</span>
              <strong>14.2g (Pure)</strong>
            </div>
            <div className="yield-row">
              <span>Cobalt & Copper Recovery</span>
              <strong>38.6g</strong>
            </div>
            <div className="yield-row">
              <span>Carbon Offset Credit</span>
              <strong className="green">+4.1 kg CO₂ Saved</strong>
            </div>
            <div className="yield-row total">
              <span>Instant Payout Value</span>
              <strong className="green">₹340.00</strong>
            </div>
          </div>

          <div className="ai-cta-row">
            <a href="#top" className="ai-cta-btn">Scan Your Device Now →</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBadgesSection() {
  const badges = [
    { title: '100% Zero-Landfill', desc: 'All collected parts are channeled to R2-certified and ISO-14001 e-waste refineries.', icon: '🌱' },
    { title: 'DoD Data Wipe Guarantee', desc: 'Compliant storage sanitization protocols ensure no personal data remains on your hard drives.', icon: '🛡️' },
    { title: 'Government Authorized', desc: 'Fully compliant with Central Pollution Control Board (CPCB) E-Waste Management Rules.', icon: '📜' },
    { title: 'Direct Instant UPI', desc: 'Receive your money into your account the exact moment the item is weighed at your door.', icon: '⚡' },
  ];

  return (
    <section className="rich-section" id="trust">
      <div className="trust-grid">
        {badges.map((b, idx) => (
          <div key={idx} className="trust-card">
            <div className="trust-icon">{b.icon}</div>
            <h4 className="trust-title">{b.title}</h4>
            <p className="trust-desc">{b.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="footer-logo">
            <span style={{ fontSize: 24 }}>♻️</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Recycle AI</span>
          </div>
          <p className="footer-tagline">AI-Powered E-Waste Sorting, Fair Valuation & Doorstep Scrap Collection Platform.</p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h5>Navigation</h5>
            <a href="#how-it-works">How It Works</a>
            <a href="#scrap-rates">Scrap Rates</a>
            <a href="#ai-demo">Vision AI</a>
          </div>
          <div className="footer-col">
            <h5>Portals</h5>
            <Link to="/">User & Seller Portal</Link>
            <Link to="/recycler-portal">Recycler Partner Portal</Link>
          </div>
          <div className="footer-col">
            <h5>Compliance</h5>
            <span>CPCB Certified</span>
            <span>Zero-Landfill Mission</span>
            <span>ISO 14001 Partner</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Recycle AI Inc. Built for a sustainable circular economy.</span>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════
   EXPORTED PAGES (HERO SPLIT + RICH SECTIONS)
══════════════════════════════════════════════ */
export function UserLanding() {
  return (
    <div id="top" className="landing-page-container">
      {/* Top Split-Screen Hero & Auth */}
      <div className="landing-wrap">
        <HeroPanel forRecycler={false} />
        <UserAuthPanel />
      </div>

      {/* Rich Scrollable SaaS Sections */}
      <HowItWorksSection />
      <AcceptedItemsSection />
      <LiveAIDemoSection />
      <TrustBadgesSection />
      <LandingFooter />
    </div>
  );
}

export function RecyclerLanding() {
  return (
    <div id="top" className="landing-page-container">
      {/* Top Split-Screen Hero & Auth for Recyclers */}
      <div className="landing-wrap">
        <HeroPanel forRecycler={true} />
        <RecyclerAuthPanel />
      </div>

      {/* Rich Scrollable SaaS Sections */}
      <HowItWorksSection />
      <AcceptedItemsSection />
      <LiveAIDemoSection />
      <TrustBadgesSection />
      <LandingFooter />
    </div>
  );
}
