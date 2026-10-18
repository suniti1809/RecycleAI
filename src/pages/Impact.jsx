import { useState, useEffect } from 'react';
import { apiFetch, fmtRupee, CATEGORY_LABELS, EWASTE_ICONS } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Impact() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/impact')
      .then(res => setData(res))
      .catch(err => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        <span className="spinner" />
        <div style={{ marginTop: 12 }}>Loading environmental impact metrics…</div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const personal = data?.personal_impact;
  const categories = data?.category_breakdown || {};

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: 60 }}>
      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--green-dim)', borderRadius: 20, fontSize: 12, fontWeight: 700, color: 'var(--green-dark)', marginBottom: 8 }}>
          🌿 EPA / UNEP Circular Economy Metrics
        </div>
        <div className="page-title" style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>
          Environmental & Climate Impact Dashboard
        </div>
        <div className="page-sub" style={{ color: 'var(--text-muted)' }}>
          Real-time metrics computed strictly from verified, completed e-waste recycling transactions.
        </div>
      </div>

      {/* ── Global Platform Metrics Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--green)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚖️</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)' }}>
            {metrics.total_weight_diverted_kg || 0} <span style={{ fontSize: 16, fontWeight: 600 }}>kg</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Total E-Waste Diverted from Landfills</div>
        </div>

        <div className="card" style={{ padding: 20, borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🌿</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#0284c7' }}>
            {metrics.total_co2_avoided_kg || 0} <span style={{ fontSize: 16, fontWeight: 600 }}>kg</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>CO₂e Emissions Avoided</div>
        </div>

        <div className="card" style={{ padding: 20, borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🌳</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#16a34a' }}>
            {metrics.trees_planted_equivalent || 0}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Tree-Years Carbon Offset Equivalent</div>
        </div>

        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--green-dark)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>💰</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--green-dark)' }}>
            {fmtRupee(metrics.total_payout_generated_inr || 0)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Circulated Value to Sellers</div>
        </div>
      </div>

      {/* ── User Personal Impact Section ── */}
      {personal && (
        <div className="card" style={{ padding: 24, marginBottom: 24, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 24 }}>🎖️</span>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                Your Personal Recycling Contribution ({user?.name})
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Every kilogram of electronic waste you recycle diverts toxic heavy metals and saves precious minerals.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginTop: 16 }}>
            <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Deals Completed</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', marginTop: 2 }}>{personal.completed_deals}</div>
            </div>
            <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Weight Diverted</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)', marginTop: 2 }}>{personal.weight_diverted_kg} kg</div>
            </div>
            <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Earnings</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--green)', marginTop: 2 }}>{fmtRupee(personal.total_value_inr)}</div>
            </div>
            <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>CO₂ Offset</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--info)', marginTop: 2 }}>{personal.co2_emissions_avoided_kg} kg</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Category Breakdown ── */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 14 }}>
          📊 Diverted E-Waste by Material Category
        </h3>
        {Object.keys(categories).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
            No material categorization recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(categories).map(([catKey, weight]) => {
              const maxW = Math.max(...Object.values(categories), 1);
              const pct = Math.round((weight / maxW) * 100);

              return (
                <div key={catKey}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text)' }}>
                      {EWASTE_ICONS[catKey] || '⚡'} {CATEGORY_LABELS[catKey] || catKey.replace(/_/g, ' ')}
                    </span>
                    <span style={{ color: 'var(--green)' }}>{weight.toFixed(1)} kg</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--green)', borderRadius: 4, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          ℹ️ {metrics.carbon_factor_note}
        </div>
      </div>
    </div>
  );
}
