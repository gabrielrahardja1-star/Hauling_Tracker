import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { api } from '../lib/api';

const STATUS_STYLE = {
  pending:    { badge: 'badge-yellow', label: 'Pending' },
  in_transit: { badge: 'badge-blue',   label: 'In Transit' },
  completed:  { badge: 'badge-green',  label: 'Completed' },
};

const WITA_OPTS = { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hour12: false };
function toWITA(ts) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('id-ID', WITA_OPTS).format(new Date(ts));
}

function elapsed(ts) {
  if (!ts) return '';
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
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

export default function JettyOperatorPage() {
  const [jettyFilter, setJettyFilter] = useState('');
  const [allTrips, setAllTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [trip, setTrip] = useState(null);

  const [grossJetty, setGrossJetty] = useState('');
  const [tareJetty, setTareJetty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);

  const fetchTrips = useCallback(async () => {
    setTripsLoading(true);
    try {
      setAllTrips(await api.getTodayTrips(jettyFilter));
    } catch { /* silent */ } finally {
      setTripsLoading(false);
    }
  }, [jettyFilter]);

  useEffect(() => {
    fetchTrips();
    const interval = setInterval(fetchTrips, 30000);
    return () => clearInterval(interval);
  }, [fetchTrips]);

  function selectTrip(t) {
    setTrip(t);
    setSearchInput(t.no_lambung);
    setGrossJetty(''); setTareJetty('');
    setSubmitError(''); setSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSearchError(''); setTrip(null); setSuccess(null);
    setGrossJetty(''); setTareJetty('');
    setSearching(true);
    try {
      const t = await api.searchTrip(searchInput.trim().toUpperCase(), 'in_transit');
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
    const grossKg = parseInt(grossJetty, 10);
    const tareKg  = parseInt(tareJetty, 10);
    if (!grossKg || grossKg <= 0) return setSubmitError('Gross jetty weight must be a positive number');
    if (!tareKg  || tareKg  <= 0) return setSubmitError('Tare jetty weight must be a positive number');

    setSubmitting(true);
    try {
      const updated = await api.submitCP3(trip.trip_id, { gross_jetty_kg: grossKg, tare_jetty_kg: tareKg });
      setSuccess(updated);
      setTrip(null);
      fetchTrips();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setTrip(null); setSuccess(null);
    setSearchInput(''); setSearchError('');
    setGrossJetty(''); setTareJetty(''); setSubmitError('');
  }

  const g  = parseInt(grossJetty, 10) || 0;
  const tr = parseInt(tareJetty,  10) || 0;
  const preview = trip && g && tr ? {
    netto_jetty:   g - tr,
    compare_gross: g  - (trip.gross_site_kg || 0),
    compare_tare:  tr - trip.tare_site_kg,
    deviasi:       (g - tr) - (trip.netto_site_kg || 0),
  } : null;

  const jettyLabel = trip?.jetty_destination === 'hasnur' ? 'HBM' : 'Talenta';

  // Filtered list for display
  const displayTrips = jettyFilter
    ? allTrips.filter((t) => t.jetty_destination === jettyFilter)
    : allTrips;
  const inTransitCount = allTrips.filter((t) => t.status === 'in_transit').length;

  return (
    <Layout title="Jetty — CP3">
      <div className="space-y-5">

        {/* Success */}
        {success && (
          <div className="card border-emerald-700/50 bg-emerald-900/20">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-emerald-300">CP3 recorded — trip completed!</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-slate-300">Truck: <span className="font-mono font-bold">{success.no_lambung}</span></p>
                  <p className="text-sm text-slate-300">Netto Jetty: <span className="font-bold text-emerald-400">{success.netto_jetty_kg?.toLocaleString()} kg</span></p>
                  <p className="text-sm text-slate-300">Deviasi: <span className={`font-bold ${success.deviasi_kg < 0 ? 'text-red-400' : 'text-blue-400'}`}>{success.deviasi_kg?.toLocaleString()} kg</span></p>
                </div>
                <button onClick={reset} className="btn-secondary mt-4 w-full text-sm py-3">Done</button>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        {!success && (
          <div className="card">
            <h2 className="text-base font-semibold text-slate-200 mb-4">Find Truck</h2>
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

        {/* CP3 form */}
        {trip && !success && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-200">CP3 — Jetty Weighing</h2>
              <span className="badge badge-blue">In Transit</span>
            </div>
            <div className="bg-slate-800/60 rounded-xl px-4 mb-5">
              <InfoRow label="Ticket #" value={`#${trip.no_tiket}`} />
              <InfoRow label="Truck ID" value={trip.no_lambung} mono />
              <InfoRow label="Jetty" value={trip.jetty_destination === 'hasnur' ? 'Hasnur' : 'Talenta'} />
              <InfoRow label="Coal Quality" value={trip.coal_quality === 'raw' ? 'Raw 原煤' : 'Clean 精煤'} />
              <InfoRow label="Tare Site (CP1)" value={`${trip.tare_site_kg?.toLocaleString()} kg`} />
              <InfoRow label="Gross Site (CP2)" value={`${trip.gross_site_kg?.toLocaleString()} kg`} />
              <InfoRow label="Netto Site" value={`${trip.netto_site_kg?.toLocaleString()} kg`} />
              <InfoRow label="CP1 Time" value={toWITA(trip.cp1_timestamp)} />
              <InfoRow label="CP2 Time" value={toWITA(trip.cp2_timestamp)} />
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Gross {jettyLabel} — kg</label>
                <input type="number" inputMode="numeric" className="input-field" placeholder="e.g. 42000"
                  value={grossJetty} onChange={(e) => { setGrossJetty(e.target.value); setSubmitError(''); }} min={1} required />
              </div>
              <div>
                <label className="label">Tare {jettyLabel} — kg</label>
                <input type="number" inputMode="numeric" className="input-field" placeholder="e.g. 18000"
                  value={tareJetty} onChange={(e) => { setTareJetty(e.target.value); setSubmitError(''); }} min={1} required />
              </div>
              {preview && (
                <div className="rounded-xl bg-slate-800/60 px-4 py-3 space-y-2">
                  {[
                    { label: 'Netto Jetty',   value: preview.netto_jetty,   color: preview.netto_jetty > 0 ? 'text-emerald-400' : 'text-red-400' },
                    { label: 'Compare Gross', value: preview.compare_gross, color: 'text-slate-300' },
                    { label: 'Compare Tare',  value: preview.compare_tare,  color: 'text-slate-300' },
                    { label: 'Deviasi',       value: preview.deviasi,       color: preview.deviasi < 0 ? 'text-red-400' : 'text-blue-400' },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between text-sm">
                      <span className="text-slate-400">{row.label}</span>
                      <span className={`font-semibold ${row.color}`}>{row.value.toLocaleString()} kg</span>
                    </div>
                  ))}
                </div>
              )}
              {submitError && (
                <div className="rounded-xl bg-red-900/40 border border-red-700/50 text-red-300 text-sm px-4 py-3">{submitError}</div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={reset} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-success flex-1" disabled={submitting}>
                  {submitting ? <Spinner className="h-5 w-5" /> : 'Complete — CP3'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* All today's trips */}
        {!trip && !success && (
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-200">Today's Trips</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {displayTrips.length} trucks · {inTransitCount} in transit · refreshes every 30s
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded-lg px-2 py-1.5"
                  value={jettyFilter} onChange={(e) => setJettyFilter(e.target.value)}>
                  <option value="">All Jettys</option>
                  <option value="hasnur">Hasnur</option>
                  <option value="talenta">Talenta</option>
                </select>
                <button onClick={fetchTrips} className="text-slate-400 hover:text-white transition-colors p-1" title="Refresh">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {tripsLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : displayTrips.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No trips today yet</div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {displayTrips.map((t) => {
                  const s = STATUS_STYLE[t.status] ?? { badge: 'badge-gray', label: t.status };
                  const canSelect = t.status === 'in_transit';
                  return canSelect ? (
                    <button key={t.trip_id} onClick={() => selectTrip(t)}
                      className="w-full text-left px-4 py-3.5 hover:bg-slate-800/40 transition-colors active:bg-slate-700/40">
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
                        <span className="text-xs text-slate-400">{t.netto_site_kg?.toLocaleString()} kg netto · tap to record CP3 →</span>
                        <span className="text-xs text-slate-500">{elapsed(t.cp2_timestamp)}</span>
                      </div>
                    </button>
                  ) : (
                    <div key={t.trip_id} className="px-4 py-3.5">
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
                          {t.status === 'pending'
                            ? `Tare ${t.tare_site_kg?.toLocaleString()} kg`
                            : `Netto site ${t.netto_site_kg?.toLocaleString()} kg · Netto jetty ${t.netto_jetty_kg?.toLocaleString()} kg`}
                        </span>
                        <span className="text-xs text-slate-500">{toWITA(t.cp1_timestamp)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}
