/* ============================================================
   api.js — Central fetch wrapper, Supabase resolver & formatters
============================================================ */

export const SERVER_BASE = import.meta.env.VITE_SERVER_BASE || 'http://127.0.0.1:5000';
export const API_BASE = import.meta.env.VITE_API_BASE || `${SERVER_BASE}/api`;

// ── Token/User helpers ──
export const Auth = {
  getToken: () => localStorage.getItem('ra_token'),
  setToken: (t) => localStorage.setItem('ra_token', t),
  getUser: () => { try { return JSON.parse(localStorage.getItem('ra_user')); } catch { return null; } },
  setUser: (u) => localStorage.setItem('ra_user', JSON.stringify(u)),
  clear: () => { localStorage.removeItem('ra_token'); localStorage.removeItem('ra_user'); },
  isLoggedIn: () => !!localStorage.getItem('ra_token'),
  isRecycler: () => { const u = Auth.getUser(); return u && u.role === 'recycler'; },
};

// ── Core fetch wrapper ──
export async function apiFetch(path, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (networkErr) {
    console.error(`[apiFetch Error]: Could not reach ${API_BASE}${path}`, networkErr);
    throw new Error(`Backend server is offline (Port 5000). Please start backend server: 'cd trail/backend && npm start'`);
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !path.startsWith('/auth/')) {
    Auth.clear();
    window.location.href = '/';
    throw new Error('Session expired. Please login again.');
  }

  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

// ── Multipart upload ──
export async function apiUpload(path, formData) {
  const token = Auth.getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData });
  } catch (networkErr) {
    console.error(`[apiUpload Error]: Could not reach ${API_BASE}${path}`, networkErr);
    throw new Error(`Backend server is offline (Port 5000). Please start backend server: 'cd trail/backend && npm start'`);
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    Auth.clear();
    window.location.href = '/';
    throw new Error('Session expired.');
  }

  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Image URL Resolver (Handles both Supabase Cloud URLs & Local Uploads) ──
export function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url; // Cloud/Supabase URL
  }
  if (url.startsWith('/uploads/')) {
    return `${SERVER_BASE}${url}`;
  }
  return `${SERVER_BASE}/uploads/${url}`;
}

// ── Formatters ──
export function fmtRupee(n) {
  if (n === undefined || n === null || isNaN(n)) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN');
}

export function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

export function statusBadge(status) {
  const map = {
    active: ['badge-confirmed', '🟢 Active'],
    paused: ['badge-pending', '⏸️ Paused'],
    deal_pending: ['badge-picked', '🤝 Deal Pending'],
    deal_accepted: ['badge-confirmed', '🤝 Deal Accepted'],
    pickup_scheduled: ['badge-picked', '🚚 Pickup Scheduled'],
    picked_up: ['badge-picked', '📦 Picked Up'],
    completed: ['badge-completed', '🎉 Completed'],
    sold: ['badge-completed', '🎉 Sold'],
    pending: ['badge-pending', '⏳ Pending'],
    countered: ['badge-picked', '💬 Countered'],
    accepted: ['badge-confirmed', '✅ Accepted'],
    rejected: ['badge-cancelled', '✖ Rejected'],
    cancelled: ['badge-cancelled', '✖ Cancelled'],
    closed: ['badge-cancelled', '✖ Closed'],
  };
  return map[status] || ['badge-pending', status];
}

export const EWASTE_ICONS = {
  ENERGY_STORAGE: '🔋',
  COMPUTER_SYSTEM: '💻',
  DISPLAY_DEVICE: '🖥️',
  COMMUNICATION_DEVICE: '📱',
  STORAGE_DEVICE: '💾',
  ELECTRONIC_COMPONENT: '⚡',
  AUDIO_DEVICE: '🎧',
  KITCHEN_APPLIANCE: '🍳',
  LARGE_HOME_APPLIANCE: '🏠',
  TOOLS_DEVICE: '🔧',
  MEDICAL_DEVICE: '🏥',
  SMART_SENSOR_DEVICE: '📡',
  INPUT_DEVICE: '⌨️',
};

export const CATEGORY_LABELS = {
  ENERGY_STORAGE: 'Batteries & Energy Storage',
  COMPUTER_SYSTEM: 'Computers & Laptops',
  DISPLAY_DEVICE: 'Monitors & Displays',
  COMMUNICATION_DEVICE: 'Smartphones & Telecom',
  STORAGE_DEVICE: 'Hard Drives & Storage',
  ELECTRONIC_COMPONENT: 'PCBs & Circuit Boards',
  AUDIO_DEVICE: 'Audio & Speakers',
  KITCHEN_APPLIANCE: 'Kitchen Appliances',
  LARGE_HOME_APPLIANCE: 'Large Home Appliances',
  TOOLS_DEVICE: 'Power Tools & Equipment',
  MEDICAL_DEVICE: 'Medical Electronics',
  SMART_SENSOR_DEVICE: 'Smart Sensors & IoT',
  INPUT_DEVICE: 'Keyboards, Mice & Peripherals',
};
