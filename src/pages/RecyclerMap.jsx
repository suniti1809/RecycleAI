import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap as useLeafletMap } from 'react-leaflet';
import L from 'leaflet';
import { APIProvider, Map as GoogleMap, AdvancedMarker, InfoWindow, useMap as useGoogleMap, useApiLoadingStatus, APILoadingStatus } from '@vis.gl/react-google-maps';
import { apiFetch, EWASTE_ICONS, CATEGORY_LABELS } from '../api';
import { useToast } from '../context/ToastContext';

// Fix Leaflet marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Verified RecycleAI Green Marker for Leaflet
const verifiedIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:36px;height:36px;border-radius:50%;
    background:#059669;
    border:3px solid #ffffff;
    box-shadow:0 0 0 4px rgba(5,150,105,0.3), 0 4px 12px rgba(0,0,0,0.25);
    display:flex;align-items:center;justify-content:center;
    font-size:16px;
  ">♻️</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

// User location marker for Leaflet
const userLocIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:22px;height:22px;border-radius:50%;
    background:#0284c7;
    border:3px solid #ffffff;
    box-shadow:0 0 0 5px rgba(2,132,199,0.3), 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

function LeafletMapFlyTo({ center }) {
  const map = useLeafletMap();
  useEffect(() => {
    if (center) map.flyTo(center, 12, { duration: 1.2 });
  }, [center, map]);
  return null;
}

function GoogleMapFlyTo({ center }) {
  const map = useGoogleMap();
  useEffect(() => {
    if (map && center) {
      map.panTo({ lat: center[0], lng: center[1] });
    }
  }, [center, map]);
  return null;
}

function GoogleMapsStatusWatchdog({ onAuthFailure }) {
  const status = useApiLoadingStatus();
  useEffect(() => {
    if (status === APILoadingStatus.AUTH_FAILURE || status === APILoadingStatus.FAILED) {
      onAuthFailure(status);
    }
  }, [status, onAuthFailure]);
  return null;
}

export default function RecyclerMap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get('category') || 'all';

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  // Default to leaflet so map opens reliably without crashing if Google Cloud billing is inactive
  const [mapEngine, setMapEngine] = useState('leaflet');
  const [googleMapsError, setGoogleMapsError] = useState(null);

  const { showToast } = useToast();
  const [recyclers, setRecyclers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [selectedRadius, setSelectedRadius] = useState(50);
  const [userLocation, setUserLocation] = useState([25.4358, 81.8463]); // Default Prayagraj coordinates
  const [locationName, setLocationName] = useState('Prayagraj, UP');
  const [activeRecycler, setActiveRecycler] = useState(null);

  const handleGoogleMapsFailure = (statusOrErr) => {
    console.warn('[Google Maps Failure]:', statusOrErr);
    setGoogleMapsError('Google Maps API key requires active Google Cloud billing (REQUEST_DENIED).');
    setMapEngine('leaflet');
    showToast('Switched to OpenStreetMap automatically (Google Maps requires billing).', 'info');
  };

  const fetchNearbyRecyclers = async (lat, lng) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        lat: lat || userLocation[0],
        lng: lng || userLocation[1],
        radius: selectedRadius,
      });
      if (selectedCategory !== 'all') q.append('category', selectedCategory);

      const data = await apiFetch(`/recyclers/nearby?${q.toString()}`);
      setRecyclers(data.recyclers || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNearbyRecyclers(userLocation[0], userLocation[1]);
  }, [selectedCategory, selectedRadius]);

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'info');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setLocationName('Your Current GPS Location');
        showToast('Located your coordinates! Updated nearby facilities.', 'success');
        fetchNearbyRecyclers(coords[0], coords[1]);
      },
      (err) => {
        showToast('Location permission denied or unavailable. Using manual area.', 'info');
      }
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: 60 }}>
      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="page-title" style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>
              🗺️ Certified Recycler Discovery & Facility Map
            </div>
            <div className="page-sub" style={{ color: 'var(--text-muted)' }}>
              Find certified e-waste recovery centers matching your specific component category with verified credentials.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {initialCat !== 'all' && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (window.opener) {
                    window.close();
                  } else {
                    navigate('/classifier');
                  }
                }}
                style={{ fontWeight: 700 }}
              >
                ← Back to Scanned Item
              </button>
            )}
            <button className="btn btn-primary" onClick={requestGeolocation}>
              📍 Use My GPS Location
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Filter by E-Waste Material:</span>
            <select
              className="auth-input"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }}
            >
              <option value="all">⚡ All Accepted Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{EWASTE_ICONS[k] || ''} {v}</option>
              ))}
            </select>
          </div>

          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Search Radius:</span>
            <select
              className="auth-input"
              value={selectedRadius}
              onChange={e => setSelectedRadius(Number(e.target.value))}
              style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }}
            >
              <option value={15}>15 km</option>
              <option value={30}>30 km</option>
              <option value={50}>50 km</option>
              <option value={100}>100 km</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Map Engine Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-subtle)', padding: 3, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => {
                if (!googleMapsApiKey) {
                  showToast('Google Maps API key not found in .env', 'info');
                  return;
                }
                setMapEngine('google');
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: mapEngine === 'google' ? 'var(--primary)' : 'transparent',
                color: mapEngine === 'google' ? '#fff' : 'var(--text-muted)',
                transition: 'var(--transition)'
              }}
            >
              🗺️ Google Maps
            </button>
            <button
              type="button"
              onClick={() => setMapEngine('leaflet')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: mapEngine === 'leaflet' ? 'var(--primary)' : 'transparent',
                color: mapEngine === 'leaflet' ? '#fff' : 'var(--text-muted)',
                transition: 'var(--transition)'
              }}
            >
              🌐 OpenStreetMap
            </button>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Showing <strong>{recyclers.length}</strong> certified facilities around <strong>{locationName}</strong>
          </div>
        </div>
      </div>

      {/* ── Map & Recycler List Split Screen ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, alignItems: 'start' }}>
        {/* Left: Interactive Map Container */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: 560, position: 'relative' }}>
          {/* Active Engine Badge */}
          <div style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            background: 'rgba(15,23,42,0.85)',
            backdropFilter: 'blur(4px)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: mapEngine === 'google' ? '#22c55e' : '#38bdf8' }} />
            {mapEngine === 'google' ? 'Google Maps JS SDK Active' : 'OpenStreetMap Active'}
          </div>

          {mapEngine === 'google' && googleMapsApiKey ? (
            <APIProvider apiKey={googleMapsApiKey}>
              <GoogleMap
                mapId="DEMO_MAP_ID"
                defaultCenter={{ lat: userLocation[0], lng: userLocation[1] }}
                center={{ lat: userLocation[0], lng: userLocation[1] }}
                defaultZoom={11}
                gestureHandling="greedy"
                disableDefaultUI={false}
                internalUsageAttributionIds={["gmp_git_agentskills_v1"]}
                style={{ width: '100%', height: '100%' }}
              >
                <GoogleMapFlyTo center={userLocation} />

                {/* User Location Marker */}
                <AdvancedMarker
                  position={{ lat: userLocation[0], lng: userLocation[1] }}
                  title="Your Location"
                >
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#0284c7',
                    border: '3px solid #ffffff',
                    boxShadow: '0 0 0 5px rgba(2,132,199,0.3), 0 2px 8px rgba(0,0,0,0.3)'
                  }} />
                </AdvancedMarker>

                {/* Recycler Facility Markers */}
                {recyclers.map(r => {
                  if (!r.latitude || !r.longitude) return null;
                  const isSelected = activeRecycler?.id === r.id;
                  return (
                    <AdvancedMarker
                      key={r.id}
                      position={{ lat: Number(r.latitude), lng: Number(r.longitude) }}
                      title={r.business_name}
                      onClick={() => setActiveRecycler(r)}
                    >
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: isSelected ? '#15803d' : '#059669',
                        border: '3px solid #ffffff',
                        boxShadow: isSelected ? '0 0 0 6px rgba(21,128,61,0.4), 0 4px 12px rgba(0,0,0,0.3)' : '0 0 0 4px rgba(5,150,105,0.3), 0 4px 12px rgba(0,0,0,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        cursor: 'pointer',
                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.2s ease'
                      }}>
                        ♻️
                      </div>
                    </AdvancedMarker>
                  );
                })}

                {/* InfoWindow for Active Recycler */}
                {activeRecycler && activeRecycler.latitude && activeRecycler.longitude && (
                  <InfoWindow
                    position={{ lat: Number(activeRecycler.latitude), lng: Number(activeRecycler.longitude) }}
                    onCloseClick={() => setActiveRecycler(null)}
                  >
                    <div style={{ padding: 4, minWidth: 200, lineHeight: 1.5, color: '#0f172a' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 6 }}>
                        VERIFIED RECYCLEAI FACILITY
                      </span>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginTop: 4 }}>
                        {activeRecycler.business_name}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        📍 {activeRecycler.facility_address}
                      </div>
                      <div style={{ fontSize: 12, color: '#059669', fontWeight: 700, marginTop: 4 }}>
                        Distance: {activeRecycler.distance_km} km away
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${activeRecycler.latitude},${activeRecycler.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'inline-block', marginTop: 8, fontSize: 12, fontWeight: 700, color: '#059669', textDecoration: 'underline' }}
                      >
                        🧭 Get Directions on Google Maps →
                      </a>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </APIProvider>
          ) : (
            <MapContainer
              center={userLocation}
              zoom={11}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <LeafletMapFlyTo center={userLocation} />

              {/* User Location Marker & Radius Circle */}
              <Marker position={userLocation} icon={userLocIcon}>
                <Popup>
                  <strong>📍 You Are Here</strong><br />
                  {locationName}
                </Popup>
              </Marker>
              <Circle
                center={userLocation}
                radius={selectedRadius * 1000}
                pathOptions={{ color: '#059669', fillColor: '#059669', fillOpacity: 0.05, weight: 1.5, dashArray: '4, 4' }}
              />

              {/* Recycler Facility Markers */}
              {recyclers.map(r => {
                if (!r.latitude || !r.longitude) return null;
                return (
                  <Marker
                    key={r.id}
                    position={[r.latitude, r.longitude]}
                    icon={verifiedIcon}
                    eventHandlers={{
                      click: () => setActiveRecycler(r)
                    }}
                  >
                    <Popup>
                      <div style={{ padding: 4, minWidth: 200, lineHeight: 1.5 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 6 }}>
                          VERIFIED RECYCLEAI FACILITY
                        </span>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginTop: 4 }}>
                          {r.business_name}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          📍 {r.facility_address}
                        </div>
                        <div style={{ fontSize: 12, color: '#059669', fontWeight: 700, marginTop: 4 }}>
                          Distance: {r.distance_km} km away
                        </div>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-block', marginTop: 8, fontSize: 12, fontWeight: 700, color: '#059669', textDecoration: 'underline' }}
                        >
                          🧭 Get Directions on Google Maps →
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </div>

        {/* Right: Recycler Facility Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 560, overflowY: 'auto' }}>
          {recyclers.map(r => {
            const isSelected = activeRecycler?.id === r.id;
            return (
              <div
                key={r.id}
                onClick={() => setActiveRecycler(r)}
                className="card"
                style={{
                  padding: 16,
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--secondary-surface)' : 'var(--surface)',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 6 }}>
                        ✅ Verified RecycleAI Recycler
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>License: {r.license_number}</span>
                    </div>
                    <h4 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                      {r.business_name}
                    </h4>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>
                      {r.distance_km} km
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Radius: {r.service_radius_km}km</div>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                  📍 {r.facility_address}
                </div>

                {/* Accepted Category Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
                  {(r.accepted_categories || []).map((catKey, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: selectedCategory === catKey ? 'var(--green)' : 'var(--bg-subtle)',
                        color: selectedCategory === catKey ? '#fff' : 'var(--text-muted)',
                        fontWeight: 600
                      }}
                    >
                      {EWASTE_ICONS[catKey] || ''} {CATEGORY_LABELS[catKey] || catKey}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12 }}>
                  <div style={{ color: 'var(--text-muted)' }}>
                    📞 {r.contact_phone || 'Contact available upon deal'}
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--green)', fontWeight: 700 }}
                  >
                    Directions →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
