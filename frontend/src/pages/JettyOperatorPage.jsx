import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { api } from '../lib/api';

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

const WITA_OPTS = {
  timeZone: 'Asia/Makassar',
  hour: '2-digit', minute: '2-digit',
  hour12: false,
};

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

export default function JettyOperatorPage() {
  const [jettyFilter, setJettyFilter] = useState('');
  const [incoming, setIncoming] = useState([]);
  const [incomingLoading, setIncomingLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [trip, setTrip] = useState(null);

  const [tare, setTare] = useState('');
  const [talenta, setTalenta] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [success, setSuccess] = useState(null);

  const fetchIncoming = useCallback(async () => {
    setIncomingLoading(true);
    try {
      const data = await api.getIncomingTrips(jettyFilter);
      setIncoming(data);
    } catch {
      // silently fail — not critical
    } finally {
      setIncomingLoading(false);
    }
  }, [jettyFilter]);

  useEffect(() => {
    fetchIncoming();
    const interval = setInterval(fetchIncoming, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchIncoming]);

  function selectIncoming(t) {
    setTrip(t);
    setSearchInput(t.truck_id);
    setTare('');
    setTalenta('');
    setCompleteError('');
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSearchError('');
    setTrip(null);
    setSuccess(null);
    setTare('');
    setTalenta('');
    setSearching(true);
    try {
      const t = await api.getActiveTrip(searchInput.trim().toUpperCase());
      setTrip(t);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleComplete(e) {
    e.preventDefault();
    setCompleteError('');

    const tareKg = parseInt(tare, 10);
    if (!tareKg || tareKg <= 0) return setCompleteError('Tare weight must be a positive number');

    const payload = { tare_weight_kg: tareKg };

    if (trip.jetty_destination === 'talenta') {
      const talentaKg = parseInt(talenta, 10);
      if (!talentaKg || talentaKg <= 0) return setCompleteError("Talenta's reading is required for Talenta destination");
      payload.talenta_weight_kg = talentaKg;
    }

    setCompleting(true);
    try {
      const updated = await api.completeTrip(trip.trip_id, payload);
      setSuccess(updated);
      setTrip(null);
      fetchIncoming();
    } catch (err) {
      setCompleteError(err.message);
    } finally {
      setCompleting(false);
    }
  }

  function resetSearch() {
    setTrip(null);
    setSuccess(null);
    setSearchInput('');
    setSearchError('');
    setTare('');
    setTalenta('');
    setCompleteError('');
  }

  const netPreview = trip && tare ? trip.gross_weight_kg - parseInt(tare || 0, 10) : null;
  const deviPreview =
    trip?.jetty_destination === 'talenta' && tare && talenta
      ? parseInt(tare, 10) - parseInt(talenta, 10)
      : null;

  return (
    <Layout title="Jetty Exit">
      <div className="space-y-5">

        {/* Success */}
        {success && (
          <div className="card border-emerald-700/50 bg-emerald-900/20">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-emerald-300">Trip completed!</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-slate-300">Truck: <span className="font-mono font-bold">{success.truck_id}</span></p>
                  <p className="text-sm text-slate-300">Net weight: <span className="font-bold">{success.net_weight_kg?.toLocaleString()} kg</span></p>
                  {success.deviation_kg != null && (
                    <p className="text-sm text-slate-300">Deviation: <span className={`font-bold ${success.deviation_kg < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{success.deviation_kg?.toLocaleString()} kg</span></p>
                  )}
                </div>
                <button onClick={resetSearch} className="btn-secondary mt-4 w-full text-sm py-3">
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        {!success && (
          <div className="card">
            <h2 className="text-base font-semibold text-slate-200 mb-4">Find Truck</h2>
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="text"
                className="input-field flex-1 uppercase"
                placeholder="Enter Truck ID..."
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value.toUpperCase()); setSearchError(''); }}
              />
              <button type="submit" className="btn-primary px-5 shrink-0" disabled={searching || !searchInput.trim()}>
                {searching ? <Spinner className="h-5 w-5" /> : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                  </svg>
                )}
              </button>
            </form>
            {searchError && (
              <div className="mt-3 rounded-xl bg-red-900/40 border border-red-700/50 text-red-300 text-sm px-4 py-3">
                {searchError}
              </div>
            )}
          </div>
        )}

        {/* Trip details — complete form */}
        {trip && !success && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-200">Trip Details</h2>
              <span className="badge badge-yellow">In Progress</span>
            </div>
            <div className="bg-slate-800/60 rounded-xl px-4 mb-5">
              <InfoRow label="Truck ID" value={trip.truck_id} mono />
              <InfoRow label="Jetty" value={trip.jetty_destination === 'hasnur' ? 'Hasnur' : 'Talenta'} />
              <InfoRow label="Coal Quality" value={trip.coal_quality === 'raw' ? 'Raw 原煤' : 'Clean 精煤'} />
              <InfoRow label="Gross Weight" value={`${trip.gross_weight_kg?.toLocaleString()} kg`} />
              <InfoRow label="Pit Time (WITA)" value={toWITA(trip.pit_timestamp)} />
            </div>
            <form onSubmit={handleComplete} className="space-y-4">
              <div>
                <label className="label">Tare Weight — kg</label>
                <input type="number" inputMode="numeric" className="input-field" placeholder="e.g. 18000"
                  value={tare} onChange={(e) => { setTare(e.target.value); setCompleteError(''); }} min={1} required />
              </div>
              {trip.jetty_destination === 'talenta' && (
                <div>
                  <label className="label">Talenta's Reading — kg</label>
                  <input type="number" inputMode="numeric" className="input-field" placeholder="e.g. 41500"
                    value={talenta} onChange={(e) => { setTalenta(e.target.value); setCompleteError(''); }} min={1} required />
                </div>
              )}
              {netPreview !== null && (
                <div className="rounded-xl bg-slate-800/60 px-4 py-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Net Weight</span>
                    <span className={`font-semibold ${netPreview < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{netPreview.toLocaleString()} kg</span>
                  </div>
                  {deviPreview !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Deviation</span>
                      <span className={`font-semibold ${deviPreview < 0 ? 'text-red-400' : 'text-blue-400'}`}>{deviPreview.toLocaleString()} kg</span>
                    </div>
                  )}
                </div>
              )}
              {completeError && (
                <div className="rounded-xl bg-red-900/40 border border-red-700/50 text-red-300 text-sm px-4 py-3">
                  {completeError}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={resetSearch} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-success flex-1" disabled={completing}>
                  {completing ? <Spinner className="h-5 w-5" /> : 'Clock Out (Keluar)'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Incoming vehicles */}
        {!trip && !success && (
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-200">Incoming Vehicles</h2>
                <p className="text-xs text-slate-500 mt-0.5">Refreshes every 30s</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded-lg px-2 py-1.5"
                  value={jettyFilter}
                  onChange={(e) => setJettyFilter(e.target.value)}
                >
                  <option value="">All Jettys</option>
                  <option value="hasnur">Hasnur</option>
                  <option value="talenta">Talenta</option>
                </select>
                <button onClick={fetchIncoming} className="text-slate-400 hover:text-white transition-colors p-1" title="Refresh">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {incomingLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : incoming.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No incoming vehicles</div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {incoming.map((t) => (
                  <button
                    key={t.trip_id}
                    onClick={() => selectIncoming(t)}
                    className="w-full text-left px-4 py-3.5 hover:bg-slate-800/40 transition-colors active:bg-slate-700/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-100">{t.truck_id}</span>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${t.jetty_destination === 'hasnur' ? 'badge-blue' : 'badge-green'}`}>
                          {t.jetty_destination === 'hasnur' ? 'Hasnur' : 'Talenta'}
                        </span>
                        <span className="badge badge-gray">{t.coal_quality === 'raw' ? 'Raw' : 'Clean'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-slate-400">{t.gross_weight_kg?.toLocaleString()} kg gross</span>
                      <span className="text-xs text-slate-500">{elapsed(t.pit_timestamp)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
