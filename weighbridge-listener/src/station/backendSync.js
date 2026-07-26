// Pushes each captured weighing directly into a REAL Hauling_Tracker trip —
// weighing #1 creates the trip (CP1, tare); weighing #2 completes it (CP2,
// gross). No operator step in the main app is required. Fire-and-forget from
// the station's point of view: weighing and printing must keep working even
// if the backend/network is unreachable — this is a convenience sync, not a
// dependency of the local weighing flow.

const TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 3000;

export function createBackendSync({ backendUrl, stationKey }) {
  const enabled = !!(backendUrl && stationKey);
  const base = enabled ? backendUrl.replace(/\/$/, '') : null;
  let last = { ok: null, at: null, error: null };

  async function call(method, path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${base}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-station-key': stationKey },
        body: body != null ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Backend returned ${res.status}`);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function withRetry(fn, label) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await fn();
        last = { ok: true, at: new Date().toISOString(), error: null };
        return result;
      } catch (err) {
        if (attempt === 2) {
          last = { ok: false, at: new Date().toISOString(), error: err.message };
          console.error(`[backendSync] ${label} failed: ${err.message}`);
          return null;
        }
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  // Weighing #1 — create the real trip (CP1). Returns the trip (with
  // trip_id) on success, or null if the push ultimately failed.
  async function pushCP1({ noPolisi, jettyDestination, coalQuality, cuacaMmi, weightKg, at }) {
    if (!enabled) return null;
    return withRetry(() => call('POST', '/station/trips', {
      no_lambung: noPolisi,
      jetty_destination: jettyDestination,
      coal_quality: coalQuality,
      cuaca_mmi: cuacaMmi,
      tare_site_kg: weightKg,
      measured_at: at instanceof Date ? at.toISOString() : new Date(at).toISOString(),
    }), `create trip ${noPolisi}`);
  }

  // Weighing #2 — complete the trip (CP2). Needs the trip_id from pushCP1;
  // looks it up by plate if the station lost track of it (e.g. app restart
  // between weighing #1 and #2, or the CP1 push response was never recorded).
  async function pushCP2({ noPolisi, weightKg, tripId }) {
    if (!enabled) return null;
    let id = tripId;
    if (!id) {
      const found = await withRetry(
        () => call('GET', `/station/trips/lookup?no_lambung=${encodeURIComponent(noPolisi)}`),
        `lookup trip ${noPolisi}`
      );
      id = found?.trip_id;
    }
    if (!id) {
      last = { ok: false, at: new Date().toISOString(), error: `no trip found on backend for ${noPolisi} — was weighing #1 pushed?` };
      console.error(`[backendSync] ${last.error}`);
      return null;
    }
    return withRetry(() => call('PATCH', `/station/trips/${id}/cp2`, { gross_site_kg: weightKg }), `complete trip ${noPolisi}`);
  }

  return { enabled, pushCP1, pushCP2, status: () => last };
}
