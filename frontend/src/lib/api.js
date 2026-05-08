// All calls go through here. Token is read from localStorage via getToken().
// getToken() is injected at app startup via setAuthProvider().

let _getToken = () => localStorage.getItem('ht_token');

export function setAuthProvider(getToken) {
  _getToken = getToken;
}

const BASE = import.meta.env.VITE_API_URL;

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
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export const api = {
  // Trips
  createTrip:    (data)        => request('POST',  '/trips', data),
  getActiveTrip: (truck_id)    => request('GET',   `/trips/active?truck_id=${encodeURIComponent(truck_id)}`),
  completeTrip:  (id, data)    => request('PATCH', `/trips/${id}`, data),
  listTrips:     (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/trips${q ? `?${q}` : ''}`);
  },
  updateTrip: (id, data) => request('PATCH', `/trips/${id}`, data),

  async exportTrips(date, jetty) {
    const token = _getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}/trips/export?date=${date}&jetty=${jetty}`, { headers });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Export failed');
    }
    return res.blob();
  },

  // Auth / users
  createUser: (data) => request('POST',   '/auth/users', data),
  listUsers:  ()     => request('GET',    '/auth/users'),
  updateUser: (id, data) => request('PATCH', `/auth/users/${id}`, data),
  deleteUser: (id)   => request('DELETE', `/auth/users/${id}`),
};
