import React from 'react';
import { fmtRupee } from '../api';

export const LIFECYCLE_DATA = {
  COMMUNICATION_DEVICE: {
    title: 'Smartphones, Tablets & Phones',
    icon: '📱',
    co2PerKg: 3.2,
    stages: [
      { step: 1, badge: 'Step 1: Collection', title: 'Doorstep Pickup & Safe Handover', desc: 'A verified recycler inspects your device, confirms the weight on a digital scale, and safely completes the doorstep handover.' },
      { step: 2, badge: 'Step 2: 100% Privacy', title: 'Permanent Data Erasure & Privacy Guarantee', desc: 'All personal photos, messages, passwords, and accounts are permanently wiped clean. SIM cards and memory cards are shredded. Zero risk of data leakage.' },
      { step: 3, badge: 'Step 3: Spare Parts', title: 'Saving & Reusing Working Parts', desc: 'Working screens, cameras, speakers, and healthy electronic chips are tested and saved to repair other devices, extending their lifespan.' },
      { step: 4, badge: 'Step 4: Metal Recovery', title: 'Extracting Valuable Metals (Gold & Copper)', desc: 'Inside circuit boards are safely processed to extract and purify precious metals like real Gold, Silver, and Copper instead of mining fresh earth.' },
      { step: 5, badge: 'Step 5: Clean Future', title: 'Recycling Battery Minerals for Electric Vehicles', desc: 'Battery minerals (Lithium & Cobalt) are refined to help manufacture clean batteries for electric vehicles and home solar storage.' }
    ],
    materials: ['Pure Gold', 'Silver', 'Copper', 'Lithium', 'Cobalt'],
    hazardsNeutralized: ['Battery Fire & Explosion Hazards', 'Toxic Chemicals', 'Soil & Water Pollution'],
    circularDestination: 'Extracted precious metals are returned to manufacturers to make new devices and electric vehicles.'
  },
  COMPUTER_SYSTEM: {
    title: 'Computers, Laptops & Circuit Boards',
    icon: '💻',
    co2PerKg: 2.8,
    stages: [
      { step: 1, badge: 'Step 1: Collection', title: 'Safe Pickup & Battery Disconnection', desc: 'Your computer details are recorded, and the battery is safely disconnected so it travels without any fire hazard.' },
      { step: 2, badge: 'Step 2: Drive Wipe', title: 'Complete Hard Drive Destruction', desc: 'All hard drives and storage disks are permanently erased and magnetically cleared. No one can ever recover your personal files.' },
      { step: 3, badge: 'Step 3: Spare Parts', title: 'Saving Reusable Computer Parts', desc: 'Working processors, memory sticks (RAM), and cooling fans are cleaned and saved for low-cost student and school computers.' },
      { step: 4, badge: 'Step 4: Metal Melting', title: 'Melting Circuit Boards for Pure Metals', desc: 'Green motherboards are melted in clean industrial furnaces to extract pure gold connector pins and heavy copper wire.' },
      { step: 5, badge: 'Step 5: Fresh Hardware', title: 'Recycling Metal Frames for New Appliances', desc: 'Aluminum and steel computer cases are melted down into fresh metal sheets to build brand new products.' }
    ],
    materials: ['Real Gold', 'Pure Copper', 'Silver', 'Aluminum Alloys', 'Steel'],
    hazardsNeutralized: ['Lead Solder Contamination', 'Harmful Dust', 'Corrosive Battery Acid'],
    circularDestination: 'Working parts are refurbished for education; non-working metal is melted into clean industrial metal bars.'
  },
  ENERGY_STORAGE: {
    title: 'Batteries, Inverters & Power Banks',
    icon: '🔋',
    co2PerKg: 3.8,
    stages: [
      { step: 1, badge: 'Step 1: Collection', title: 'Fire-Proof Pickup & Insulated Taping', desc: 'Battery terminals are wrapped in heat-resistant tape and placed in specialized fire-proof safety containers.' },
      { step: 2, badge: 'Step 2: Discharging', title: 'Safe Electric Discharge', desc: 'Batteries are submerged in neutral cooling baths to drain all leftover electric charge safely without sparking.' },
      { step: 3, badge: 'Step 3: Safe Crushing', title: 'Crushing in Spark-Proof Chambers', desc: 'Batteries are crushed in sealed, oxygen-free chambers to safely separate the outer casing from the inside materials.' },
      { step: 4, badge: 'Step 4: Mineral Extraction', title: 'Purifying Valuable Battery Minerals', desc: 'High-value raw materials like Lithium, Cobalt, and Nickel are separated and purified into clean battery powders.' },
      { step: 5, badge: 'Step 5: New Batteries', title: 'Powering Next-Gen Electric Scooters & Solar', desc: 'Purified battery materials are shipped directly to battery gigafactories to create new electric vehicle battery packs.' }
    ],
    materials: ['Lithium', 'Cobalt', 'Nickel', 'Copper Foil', 'Graphite'],
    hazardsNeutralized: ['Battery Explosion & Fires', 'Toxic Acid Gases', 'Groundwater Contamination'],
    circularDestination: 'Refined into raw battery minerals for electric scooters, cars, and home solar backup systems.'
  },
  DISPLAY_DEVICE: {
    title: 'Monitors, TVs & Screen Panels',
    icon: '🖥️',
    co2PerKg: 2.1,
    stages: [
      { step: 1, badge: 'Step 1: Collection', title: 'Cushioned Transport to Protect Glass', desc: 'TVs and monitors are packed upright with shock-absorbing padding so the glass never shatters during the ride.' },
      { step: 2, badge: 'Step 2: Toxin Capture', title: 'Safely Capturing Mercury Gas', desc: 'Harmful mercury lamps from older screens are removed in sealed rooms so no toxic vapor escapes into the air.' },
      { step: 3, badge: 'Step 3: Glass Sorting', title: 'Separating Clean Glass from Plastic', desc: 'Screen glass, plastic frames, and internal sheets are divided into dedicated clean recycling bins.' },
      { step: 4, badge: 'Step 4: Rare Minerals', title: 'Extracting Rare Screen Minerals', desc: 'Special minerals like Indium from the transparent screen coating are recovered and purified for reuse.' },
      { step: 5, badge: 'Step 5: Clean Reuse', title: 'Remelted into Home Insulation & Frames', desc: 'Clean melted glass is turned into building insulation, and metal backings become sturdy new appliance brackets.' }
    ],
    materials: ['Rare Screen Minerals', 'Copper Coils', 'Recycled Clean Glass', 'Extruded Aluminum'],
    hazardsNeutralized: ['Harmful Mercury Gas', 'Broken Leaded Glass', 'Chemical Contamination'],
    circularDestination: 'Remade into architectural insulation materials and clean aluminum structural brackets.'
  },
  STORAGE_DEVICE: {
    title: 'Hard Drives, SSDs & USB Storage',
    icon: '💾',
    co2PerKg: 2.5,
    stages: [
      { step: 1, badge: 'Step 1: Collection', title: 'Tamper-Proof Pickup & Tracking', desc: 'Storage drives are sealed in tamper-evident safety envelopes so your privacy is locked down from the moment you hand them over.' },
      { step: 2, badge: 'Step 2: Total Erasure', title: 'Permanent File Destruction', desc: 'Working drives are wiped to zero files, and dead or broken drives are crushed into tiny 2mm metal shreds. Nothing can ever be recovered.' },
      { step: 3, badge: 'Step 3: Super Magnets', title: 'Saving Rare-Earth Super Magnets', desc: 'Powerful neodymium magnets inside hard drives are extracted intact to power electric motors and wind generators.' },
      { step: 4, badge: 'Step 4: Metal Melting', title: 'Melting Aircraft-Grade Aluminum & Platinum', desc: 'Polished metal discs inside drives are melted to recover ultra-pure aluminum and precious platinum layers.' },
      { step: 5, badge: 'Step 5: Green Energy', title: 'Powering Clean Energy Turbines', desc: 'Saved magnets help build clean electric motors and wind turbines; aluminum is turned into lightweight engine parts.' }
    ],
    materials: ['Super-Strong Magnets', 'Aircraft-Grade Aluminum', 'Platinum Alloys', 'Gold Contacts'],
    hazardsNeutralized: ['Identity Theft & Stolen Photos', 'Toxic Smelting Smoke', 'Chemical Waste'],
    circularDestination: 'Magnets and aluminum are repurposed into clean energy generators and lightweight engineering.'
  },
  DEFAULT: {
    title: 'Home Appliances & Electronic Items',
    icon: '⚡',
    co2PerKg: 2.4,
    stages: [
      { step: 1, badge: 'Step 1: Collection', title: 'Doorstep Pickup & Digital Scale Weighing', desc: 'A certified collector checks your appliance, weighs it on a digital scale in front of you, and confirms the deal instantly.' },
      { step: 2, badge: 'Step 2: Safe Prep', title: 'Safe Draining of Liquids & Heavy Parts', desc: 'Old cooling fluids, heavy transformers, and large electric capacitors are safely drained and isolated.' },
      { step: 3, badge: 'Step 3: Clean Sorting', title: 'Sorting Metal from Plastic Casings', desc: 'Automated machinery uses powerful magnets to cleanly separate steel frames, copper motor coils, and plastic outer shells.' },
      { step: 4, badge: 'Step 4: Melting', title: 'Melting Copper Wire & Steel into Ingots', desc: 'Pure copper wires are stripped and melted into clean metal bars, saving 85% energy compared to mining fresh ore.' },
      { step: 5, badge: 'Step 5: Zero-Waste', title: 'Turned into Brand New Everyday Products', desc: 'Clean recycled plastic pellets and metals re-enter factories to make new household appliances and electrical wires.' }
    ],
    materials: ['Pure Copper Wire', 'Clean Recycled Plastic', 'Strong Steel', 'Cast Aluminum'],
    hazardsNeutralized: ['Trash Dump Overflow', 'Poisonous Burning Smoke', 'Microplastics in Water'],
    circularDestination: 'Turned directly into fresh electrical cables, durable hardware housings, and everyday household items.'
  }
};

export function getLifecycleData(category) {
  if (!category) return LIFECYCLE_DATA.DEFAULT;
  const upper = category.toUpperCase();
  return LIFECYCLE_DATA[upper] || LIFECYCLE_DATA.DEFAULT;
}

export default function ProductLifecycleModal({ isOpen, onClose, category, itemName, weightKg = 1.0, agreedPrice = null }) {
  if (!isOpen) return null;

  const data = getLifecycleData(category);
  const weight = parseFloat(weightKg) || 1.0;
  const co2Saved = (weight * data.co2PerKg).toFixed(1);
  const treesEquiv = (co2Saved / 21.7).toFixed(1);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(10, 15, 26, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.25s ease'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: 780,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
          animation: 'scaleUp 0.25s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--green-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              border: '1px solid var(--border)'
            }}>
              {data.icon}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ♻️ Verified Recycling Process
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '2px 0 0 0' }}>
                What Happens to Your Item?
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ width: 34, height: 34, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}
          >
            ✕
          </button>
        </div>

        {/* ── Modal Body (Scrollable) ── */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Target Item Summary Banner */}
          <div style={{
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius)',
            padding: '14px 18px',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Item to be Recycled:</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
                {itemName || data.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                Type: <strong>{data.title}</strong> • Weight: <strong>{weight} kg</strong>
              </div>
            </div>

            {agreedPrice && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your Cash Payout:</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--green)' }}>{fmtRupee(agreedPrice)}</div>
              </div>
            )}
          </div>

          {/* Environmental Impact Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>🌿 Clean Air & Climate Impact</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--green)', marginTop: 4 }}>+{co2Saved} kg CO₂ Saved</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Saves carbon equal to planting ~{treesEquiv} tree saplings</div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>🛡️ Zero Garbage Dump Guarantee</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--blue)', marginTop: 4 }}>100% Zero-Landfill</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Never thrown into garbage dumps, soil, or rivers</div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>🔒 100% Private & Data Safe</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--purple)', marginTop: 4 }}>Permanently Erased</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>All photos, files & accounts destroyed forever</div>
            </div>
          </div>

          {/* ── 5-Stage Step-by-Step Recycling Lifecycle Journey ── */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🔄</span> Step-by-Step Recycling Journey:
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.stages.map((st) => (
                <div
                  key={st.step}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: 14,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--green-dim)',
                    border: '2px solid var(--green)',
                    color: 'var(--green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 13,
                    flexShrink: 0
                  }}>
                    {st.step}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 4, color: 'var(--green)' }}>
                        {st.badge}
                      </span>
                      <strong style={{ fontSize: 14, color: 'var(--text)' }}>{st.title}</strong>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {st.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Materials Salvaged & Hazards Neutralized */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--green)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                ⛏️ Recoverable Raw Materials:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.materials.map((m, i) => (
                  <span key={i} style={{ fontSize: 11, fontWeight: 600, background: 'var(--surface)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: 6, color: 'var(--text)' }}>
                    ✨ {m}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#ef4444', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                🛡️ Neutralized Environmental Hazards:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.hazardsNeutralized.map((h, i) => (
                  <span key={i} style={{ fontSize: 11, fontWeight: 600, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '4px 8px', borderRadius: 6, color: '#fca5a5' }}>
                    ✓ {h}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Final Circular Destination Footer */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(56, 189, 248, 0.1))',
            borderRadius: 'var(--radius)',
            padding: 16,
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <span style={{ fontSize: 24 }}>🌍</span>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
              <strong>Circular Destination:</strong> {data.circularDestination} All recycling operates strictly under <strong>CPCB / E-Waste Management Rules 2022</strong> guidelines.
            </div>
          </div>

        </div>

        {/* ── Modal Footer ── */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          background: 'var(--bg-subtle)'
        }}>
          <button
            className="btn btn-primary"
            onClick={onClose}
            style={{ fontWeight: 700 }}
          >
            Got It (Close)
          </button>
        </div>
      </div>
    </div>
  );
}
