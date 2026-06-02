let _getToken = () => localStorage.getItem('ht_token');

export function setAuthProvider(getToken) {
  _getToken = getToken;
}

const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

async function readJson(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`API returned ${res.status || 'a'} non-JSON response. Is the backend running?`);
  }
}

async function request(method, path, body) {
  const token = _getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const json = await readJson(res);
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status}). Is the backend running?`);
  return json;
}

export const api = {
  // Trips — CP1
  createTrip: (data) => request('POST', '/trips', data),

  // Trips — CP2
  submitCP2: (id, data) => request('PATCH', `/trips/${id}/cp2`, data),

  // Trips — CP3
  submitCP3: (id, data) => request('PATCH', `/trips/${id}/cp3`, data),

  // Search today's trip by truck ID (optionally filter by status)
  searchTrip: (no_lambung, status) => {
    const params = new URLSearchParams({ no_lambung });
    if (status) params.set('status', status);
    return request('GET', `/trips/search?${params}`);
  },

  // All trips today (stockpile + jetty operators)
  getTodayTrips: (jetty) =>
    request('GET', `/trips/today${jetty ? `?jetty=${jetty}` : ''}`),

  // Jetty operator: all in_transit trips today
  getIncomingTrips: (jetty) =>
    request('GET', `/trips/incoming${jetty ? `?jetty=${jetty}` : ''}`),

  // Admin: list trips with filters
  listTrips: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/trips${q ? `?${q}` : ''}`);
  },

  // Admin: free-form edit
  updateTrip: (id, data) => request('PATCH', `/trips/${id}`, data),

  // Admin: Excel export
  async exportTrips(date, jetty) {
    const token = _getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}/trips/export?date=${date}&jetty=${jetty}`, { headers });
    if (!res.ok) {
      const json = await readJson(res).catch(() => ({}));
      throw new Error(json.error || 'Export failed');
    }
    return res.blob();
  },

  // Auth / users
  createUser: (data)     => request('POST',   '/auth/users', data),
  listUsers:  ()         => request('GET',    '/auth/users'),
  updateUser: (id, data) => request('PATCH',  `/auth/users/${id}`, data),
  deleteUser: (id)       => request('DELETE', `/auth/users/${id}`),
};
