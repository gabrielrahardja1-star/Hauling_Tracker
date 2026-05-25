import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import ExportPanel from '../components/ExportPanel';
import { api } from '../lib/api';

const WITA_OPTS = { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hour12: false };
function toWITA(ts) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('id-ID', WITA_OPTS).format(new Date(ts));
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-medium text-slate-100 text-right ml-4 ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
      </span>
    </div>
  );
}

const STATUS_STYLE = {
  pending:    { badge: 'badge-yellow', label: 'Pending' },
  in_transit: { badge: 'badge-blue',   label: 'In Transit' },
  completed:  { badge: 'badge-green',  label: 'Completed' },
};

// ── Today's Trips List ────────────────────────────────────────────────────────

function TodayList({ trips, loading, onRefresh, onSelectPending }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-200">Today's Trips</h2>
          <p className="text-xs text-slate-500 mt-0.5">{trips.length} trucks · refreshes every 30s</p>
        </div>
        <button onClick={onRefresh} className="text-slate-400 hover:text-white transition-colors p-1" title="Refresh">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : trips.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">No trips today yet</div>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {trips.map((t) => {
            const s = STATUS_STYLE[t.status] ?? { badge: 'badge-gray', label: t.status };
            const isPending = t.status === 'pending';
            const El = isPending && onSelectPending ? 'button' : 'div';
            return (
              <El
                key={t.trip_id}
                onClick={isPending && onSelectPending ? () => onSelectPending(t) : undefined}
                className={`w-full text-left px-4 py-3.5 transition-colors ${
                  isPending && onSelectPending
                    ? 'hover:bg-slate-800/40 active:bg-slate-700/40 cursor-pointer'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">#{t.no_tiket}</span>
                    <span className="font-mono font-bold text-slate-100">{t.no_lambung}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${t.jetty_destination === 'hasnur' ? 'badge-blue' : 'badge-green'}`}>
                      {t.jetty_destination === 'hasnur' ? 'Hasnur' : 'Talenta'}
                    </span>
                    <span className={`badge ${s.badge}`}>{s.label}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-slate-400">
                    Tare {t.tare_site_kg?.toLocaleString()} kg
                    {t.netto_site_kg != null && ` · Netto ${t.netto_site_kg.toLocaleString()} kg`}
                  </span>
                  <span className="text-xs text-slate-500">{toWITA(t.cp1_timestamp)}</span>
                </div>
                {isPending && onSelectPending && (
                  <p className="text-xs text-blue-400 mt-1">Tap to record Jam Keluar →</p>
                )}
              </El>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CP1: Truck Arrival ────────────────────────────────────────────────────────

const CP1_INITIAL = { no_lambung: '', jetty_destination: '', coal_quality: '', cuaca_mmi: '', tare_site_kg: '' };

function CP1Form({ onSuccess }) {
  const [form, setForm] = useState(CP1_INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess(null);
    const tare = parseInt(form.tare_site_kg, 10);
    if (!tare || tare <= 0) return setError('Tare weight must be a positive number');

    setLoading(true);
    try {
      const trip = await api.createTrip({
        ...form,
        no_lambung: form.no_lambung.trim().toUpperCase(),
        tare_site_kg: tare,
      });
      setSuccess(trip);
      setForm(CP1_INITIAL);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      {success && (
        <div className="mb-4 rounded-xl bg-emerald-900/20 border border-emerald-700/50 px-4 py-3">
          <p className="font-semibold text-emerald-300 text-sm">Jam Masuk recorded — Ticket #{success.no_tiket}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {success.no_lambung} · Tare {success.tare_site_kg?.toLocaleString()} kg
          </p>
        </div>
      )}

      <h2 className="text-base font-semibold text-slate-200 mb-5">Jam Masuk — Truck Arrival</h2>
      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className="label">Truck ID (No. Lambung)</label>
          <input type="text" className="input-field uppercase" placeholder="e.g. B 1234 ABC"
            value={form.no_lambung}
            onChange={(e) => set('no_lambung', e.target.value.toUpperCase())} required />
        </div>

        <div>
          <label className="label">Jetty Destination</label>
          <div className="grid grid-cols-2 gap-3">
            {['hasnur', 'talenta'].map((j) => (
              <button type="button" key={j} onClick={() => set('jetty_destination', j)}
                className={`py-3.5 rounded-xl border text-sm font-semibold transition-all ${
                  form.jetty_destination === j
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500'
                }`}>
                {j === 'hasnur' ? 'Hasnur' : 'Talenta'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Coal Quality (媒质)</label>
          <div className="grid grid-cols-2 gap-3">
            {[{ value: 'raw', label: 'Raw 原煤' }, { value: 'clean', label: 'Clean 精煤' }].map((q) => (
              <button type="button" key={q.value} onClick={() => set('coal_quality', q.value)}
                className={`py-3.5 rounded-xl border text-sm font-semibold transition-all ${
                  form.coal_quality === q.value
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500'
                }`}>
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Weather (Cuaca MMI)</label>
          <input type="text" className="input-field" placeholder="e.g. Cerah, Hujan, Berawan"
            value={form.cuaca_mmi} onChange={(e) => set('cuaca_mmi', e.target.value)} required />
        </div>

        <div>
          <label className="label">Tare Weight — kg (Berat Tara)</label>
          <input type="number" inputMode="numeric" className="input-field" placeholder="e.g. 18000"
            value={form.tare_site_kg} onChange={(e) => set('tare_site_kg', e.target.value)} min={1} required />
        </div>

        {error && (
          <div className="rounded-xl bg-red-900/40 border border-red-700/50 text-red-300 text-sm px-4 py-3">{error}</div>
        )}

        <button type="submit" className="btn-success w-full mt-2"
          disabled={loading || !form.jetty_destination || !form.coal_quality}>
          {loading ? <Spinner className="h-5 w-5" /> : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Jam Masuk — Truck Arrived
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// ── CP2: Truck Departure ──────────────────────────────────────────────────────

function CP2Form({ onSuccess, pendingTrips, tripsLoading }) {
  const [searchInput, setSearchInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [trip, setTrip] = useState(null);
  const [gross, setGross] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);

  function selectTrip(t) {
    setTrip(t);
    setSearchInput(t.no_lambung);
    setGross(''); setSubmitError(''); setSuccess(null); setSearchError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSearchError(''); setTrip(null); setSuccess(null); setGross('');
    setSearching(true);
    try {
      const t = await api.searchTrip(searchInput.trim().toUpperCase(), 'pending');
      setTrip(t);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    const grossKg = parseInt(gross, 10);
    if (!grossKg || grossKg <= 0) return setSubmitError('Gross weight must be a positive number');

    setSubmitting(true);
    try {
      const updated = await api.submitCP2(trip.trip_id, { gross_site_kg: grossKg });
      setSuccess(updated);
      setTrip(null);
      onSuccess();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSearchInput(''); setSearchError(''); setTrip(null);
    setGross(''); setSubmitError(''); setSuccess(null);
  }

  const netPreview = trip && gross ? parseInt(gross, 10) - trip.tare_site_kg : null;

  return (
    <div className="space-y-4">
      {success && (
        <div className="card border-emerald-700/50 bg-emerald-900/20">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-emerald-300">Jam Keluar recorded — truck departed!</p>
              <p className="text-sm text-slate-300 mt-1">
                {success.no_lambung} · Netto <span className="font-bold text-emerald-400">{success.netto_site_kg?.toLocaleString()} kg</span>
              </p>
              <button onClick={reset} className="btn-secondary mt-3 w-full text-sm py-2.5">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      {!success && (
        <div className="card">
          <h2 className="text-base font-semibold text-slate-200 mb-4">Jam Keluar — Truck Departure</h2>
          <form onSubmit={handleSearch} className="flex gap-3">
            <input type="text" className="input-field flex-1 uppercase" placeholder="Enter Truck ID..."
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value.toUpperCase()); setSearchError(''); }} />
            <button type="submit" className="btn-primary px-5 shrink-0" disabled={searching || !searchInput.trim()}>
              {searching ? <Spinner className="h-5 w-5" /> : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
              )}
            </button>
          </form>
          {searchError && (
            <div className="mt-3 rounded-xl bg-red-900/40 border border-red-700/50 text-red-300 text-sm px-4 py-3">{searchError}</div>
          )}
        </div>
      )}

      {/* Complete form */}
      {trip && !success && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-200">Trip Details</h2>
            <span className="badge badge-yellow">Pending</span>
          </div>
          <div className="bg-slate-800/60 rounded-xl px-4 mb-5">
            <InfoRow label="Ticket #" value={`#${trip.no_tiket}`} />
            <InfoRow label="Truck ID" value={trip.no_lambung} mono />
            <InfoRow label="Jetty" value={trip.jetty_destination === 'hasnur' ? 'Hasnur' : 'Talenta'} />
            <InfoRow label="Coal Quality" value={trip.coal_quality === 'raw' ? 'Raw 原煤' : 'Clean 精煤'} />
            <InfoRow label="Tare (Site)" value={`${trip.tare_site_kg?.toLocaleString()} kg`} />
            <InfoRow label="Jam Masuk (WITA)" value={toWITA(trip.cp1_timestamp)} />
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Gross Weight — kg (Berat Kotor)</label>
              <input type="number" inputMode="numeric" className="input-field" placeholder="e.g. 42000"
                value={gross} onChange={(e) => { setGross(e.target.value); setSubmitError(''); }} min={1} required />
            </div>
            {netPreview !== null && (
              <div className="rounded-xl bg-slate-800/60 px-4 py-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Netto Site</span>
                  <span className={`font-semibold ${netPreview <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {netPreview.toLocaleString()} kg
                  </span>
                </div>
              </div>
            )}
            {submitError && (
              <div className="rounded-xl bg-red-900/40 border border-red-700/50 text-red-300 text-sm px-4 py-3">{submitError}</div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={reset} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-success flex-1" disabled={submitting}>
                {submitting ? <Spinner className="h-5 w-5" /> : 'Jam Keluar — Departed'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending trucks list — tap to select */}
      {!trip && !success && (
        <TodayList
          trips={pendingTrips}
          loading={tripsLoading}
          onRefresh={() => {}}
          onSelectPending={selectTrip}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StockpileOperatorPage() {
  const [tab, setTab] = useState('cp1');
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    setTripsLoading(true);
    try {
      setTrips(await api.getTodayTrips());
    } catch { /* silent */ } finally {
      setTripsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
    const interval = setInterval(fetchTrips, 30000);
    return () => clearInterval(interval);
  }, [fetchTrips]);

  const pendingTrips = trips.filter((t) => t.status === 'pending');

  return (
    <Layout title={tab === 'cp1' ? 'Jam Masuk' : tab === 'cp2' ? 'Jam Keluar' : 'Export'}>
      <div className="space-y-4">
        {/* Tab switcher */}
        <div className="grid grid-cols-3 gap-2 bg-slate-900 rounded-xl p-1">
          {[
            { key: 'cp1', label: 'Jam Masuk' },
            { key: 'cp2', label: `Jam Keluar${pendingTrips.length ? ` (${pendingTrips.length})` : ''}` },
            { key: 'export', label: 'Export' },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'cp1' && (
          <>
            <CP1Form onSuccess={fetchTrips} />
            <TodayList trips={trips} loading={tripsLoading} onRefresh={fetchTrips} onSelectPending={null} />
          </>
        )}
        {tab === 'cp2' && (
          <CP2Form onSuccess={fetchTrips} pendingTrips={pendingTrips} tripsLoading={tripsLoading} />
        )}
        {tab === 'export' && <ExportPanel />}
      </div>
    </Layout>
  );
}
