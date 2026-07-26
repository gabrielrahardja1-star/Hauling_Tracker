// Pushes each captured weighing to the main Hauling_Tracker backend so an
// operator there can pull it into CP1 (tare) / CP2 (gross) instead of typing
// it. Fire-and-forget from the station's point of view: weighing and printing
// must keep working even if the backend/network is unreachable — this is a
// convenience sync, not a dependency of the local weighing flow.
//
// Weighing #1 for a truck = tare (empty, on arrival); weighing #2 = gross
// (loaded, before departure) — the same physical sequence the main app's
// CP1/CP2 already represent, so weighingNumber maps directly to reading_type.

const READING_TYPE_BY_WEIGHING_NUMBER = { 1: 'tare', 2: 'gross' };
const TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 3000;

export function createBackendSync({ backendUrl, stationKey }) {
  const enabled = !!(backendUrl && stationKey);
  let last = { ok: null, at: null, error: null };

  async function postOnce(payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${backendUrl.replace(/\/$/, '')}/station/readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-station-key': stationKey },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Backend returned ${res.status}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  // Not awaited by callers — logs + records status, retries once on failure.
  async function push({ noPolisi, weightKg, weighingNumber, at }) {
    if (!enabled) return;
    const reading_type = READING_TYPE_BY_WEIGHING_NUMBER[weighingNumber];
    if (!reading_type) return; // only weighings #1/#2 map to tare/gross

    const payload = {
      no_lambung: noPolisi,
      weight_kg: weightKg,
      reading_type,
      measured_at: at instanceof Date ? at.toISOString() : new Date(at).toISOString(),
    };

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await postOnce(payload);
        last = { ok: true, at: new Date().toISOString(), error: null };
        return;
      } catch (err) {
        if (attempt === 2) {
          last = { ok: false, at: new Date().toISOString(), error: err.message };
          console.error(`[backendSync] failed to push ${noPolisi} ${reading_type}: ${err.message}`);
        } else {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }
  }

  return { enabled, push, status: () => last };
}
