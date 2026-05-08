import { useState } from 'react';
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
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
};

function toWITA(ts) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('id-ID', WITA_OPTS).format(new Date(ts));
}

export default function JettyOperatorPage() {
  const [searchInput, setSearchInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [trip, setTrip] = useState(null);

  const [tare, setTare] = useState('');
  const [talenta, setTalenta] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [success, setSuccess] = useState(null);

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
                  Search another truck
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

        {/* Trip found — complete form */}
        {trip && !success && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-200">Trip Details</h2>
              <span className="badge badge-yellow">In Progress</span>
            </div>

            {/* Read-only pit info */}
            <div className="bg-slate-800/60 rounded-xl px-4 mb-5">
              <InfoRow label="Truck ID" value={trip.truck_id} mono />
              <InfoRow label="Jetty" value={trip.jetty_destination === 'hasnur' ? 'Hasnur' : 'Talenta'} />
              <InfoRow label="Coal Quality" value={trip.coal_quality === 'raw' ? 'Raw 原煤' : 'Clean 精煤'} />
              <InfoRow label="Gross Weight" value={`${trip.gross_weight_kg?.toLocaleString()} kg`} />
              <InfoRow label="Pit Time (WITA)" value={toWITA(trip.pit_timestamp)} />
            </div>

            {/* Editable fields */}
            <form onSubmit={handleComplete} className="space-y-4">
              <div>
                <label className="label">Tare Weight — kg (Pita Site)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="input-field"
                  placeholder="e.g. 18000"
                  value={tare}
                  onChange={(e) => { setTare(e.target.value); setCompleteError(''); }}
                  min={1}
                  required
                />
              </div>

              {trip.jetty_destination === 'talenta' && (
                <div>
                  <label className="label">Talenta's Reading — kg (Gross Talenta)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="input-field"
                    placeholder="e.g. 41500"
                    value={talenta}
                    onChange={(e) => { setTalenta(e.target.value); setCompleteError(''); }}
                    min={1}
                    required
                  />
                </div>
              )}

              {/* Live calculations preview */}
              {netPreview !== null && (
                <div className="rounded-xl bg-slate-800/60 px-4 py-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Net Weight</span>
                    <span className={`font-semibold ${netPreview < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {netPreview.toLocaleString()} kg
                    </span>
                  </div>
                  {deviPreview !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Deviation (Tare − Talenta)</span>
                      <span className={`font-semibold ${deviPreview < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        {deviPreview.toLocaleString()} kg
                      </span>
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
                <button type="button" onClick={resetSearch} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-success flex-2 flex-1" disabled={completing}>
                  {completing ? <Spinner className="h-5 w-5" /> : 'Clock Out (Keluar)'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
