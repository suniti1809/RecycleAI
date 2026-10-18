import { useState, useEffect } from 'react';
import { apiFetch, fmtRupee, fmtDate } from '../api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useToast } from '../context/ToastContext';

// Fix Leaflet's default marker icon broken paths in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Derive stable demo coords from booking id (India-centred)
const getCoords = (id) => ({
  lat: 20.5937 + (Math.sin(id * 1.7) * 3),
  lng: 78.9629 + (Math.cos(id * 1.3) * 3),
});

export default function RecyclerDashboard() {
  const { showToast } = useToast();
  const [jobs, setJobs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [actioning, setActioning] = useState(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/bookings/all?status=pending');
      setJobs(data.bookings || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const updateStatus = async (id, status) => {
    setActioning(id);
    try {
      await apiFetch(`/bookings/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      showToast(`Job marked as ${status}`, 'success');
      fetchJobs();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActioning(null);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="page-header">
        <div className="page-title">🔔 Pending Pickup Jobs</div>
        <div className="page-sub">Available e-waste collection requests in your area</div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="spinner" style={{ borderTopColor: 'var(--purple)' }} />
            <span style={{ marginLeft: 12 }}>Loading pending jobs…</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No pending jobs</h3>
            <p>Check back later for new e-waste pickup requests.</p>
          </div>
        ) : (
          <>
            {/* ── Map: show all pending job pickup locations ── */}
            <div style={{ height: 350, borderBottom: '1px solid var(--border)' }}>
              <MapContainer
                center={[20.5937, 78.9629]}
                zoom={5}
                style={{ height: '100%', width: '100%', background: 'var(--surface-2)' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                />
                {jobs.map(j => {
                  const { lat, lng } = getCoords(j.id);
                  return (
                    <Marker key={j.id} position={[lat, lng]}>
                      <Popup>
                        <div style={{ color: '#000', minWidth: 160, lineHeight: 1.6 }}>
                          {/* item_name is the correct Sequelize field */}
                          <strong>📦 {j.item_name?.replace(/_/g, ' ')}</strong><br />
                          {/* pickup_address is the correct Sequelize field */}
                          📍 {j.pickup_address}<br />
                          💰 {fmtRupee(j.estimated_value)}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* ── Jobs Table ── */}
            <table className="bookings-table" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '28%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Condition</th>
                  <th>Address</th>
                  <th>Pickup Date</th>
                  <th>Est. Value</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id}>
                    <td style={{ fontWeight: 700 }}>
                      {/* item_name is the correct Sequelize field */}
                      {j.item_name?.replace(/_/g, ' ') || 'E-Waste'}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {/* item_condition is the correct Sequelize field */}
                        {j.item_condition || '—'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {/* pickup_address is the correct Sequelize field */}
                      {j.pickup_address || '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {j.pickup_date ? fmtDate(j.pickup_date) : '—'}
                    </td>
                    <td style={{ color: 'var(--purple)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {fmtRupee(j.estimated_value)}
                    </td>
                    <td>
                      <button
                        className="btn btn-purple btn-sm"
                        disabled={actioning === j.id}
                        onClick={() => updateStatus(j.id, 'confirmed')}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {actioning === j.id ? <span className="spinner" /> : '✅ Accept'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
