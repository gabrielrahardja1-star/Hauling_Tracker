import { useState, useEffect, useCallback } from 'react';
import Spinner from './Spinner';
import { api } from '../lib/api';

const WITA_OPTS = { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hour12: false };
function toWITA(ts) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('id-ID', WITA_OPTS).format(new Date(ts));
}
function witaToday() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
}

const STATUS_STYLE = {
  pending:    { cls: 'text-yellow-400', label: 'Jam Masuk' },
  in_transit: { cls: 'text-blue-400',   label: 'Jam Keluar' },
  completed:  { cls: 'text-emerald-400',label: 'Selesai' },
};

export default function ExportPanel() {
  const [date, setDate]   = useState(witaToday());
  const [jetty, setJetty] = useState('hasnur');
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const all = await api.getTodayTrips(jetty);
      // filter by selected date client-side (getTodayTrips only returns today;
      // for past dates we use the export endpoint which requires completed status,
      // so just show today's live data when date = today, else show empty)
      const today = witaToday();
      setTrips(date === today ? all.filter((t) => t.jetty_destination === jetty || !jetty) : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [date, jetty]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await api.exportTrips(date, jetty);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trips_${date}_${jetty}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  const totals = trips.reduce((acc, t) => ({
    tare:       acc.tare       + (t.tare_site_kg    || 0),
    gross_site: acc.gross_site + (t.gross_site_kg   || 0),
    netto_site: acc.netto_site + (t.netto_site_kg   || 0),
    netto_jetty:acc.netto_jetty+ (t.netto_jetty_kg  || 0),
  }), { tare: 0, gross_site: 0, netto_site: 0, netto_jetty: 0 });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Date</label>
            <input type="date" className="input-field text-sm py-2.5" value={date}
              onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">Jetty</label>
            <select className="input-field text-sm py-2.5" value={jetty}
              onChange={(e) => setJetty(e.target.value)}>
              <option value="hasnur">Hasnur</option>
              <option value="talenta">Talenta</option>
            </select>
          </div>
        </div>

        <button onClick={handleExport} disabled={exporting}
          className="btn-primary w-full text-sm py-3">
          {exporting ? <Spinner className="h-4 w-4" /> : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Excel (.xlsx)
            </>
          )}
        </button>
      </div>

      {/* Totals */}
      {trips.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Tare Site',   value: totals.tare },
            { label: 'Gross Site',  value: totals.gross_site },
            { label: 'Netto Site',  value: totals.netto_site },
            { label: 'Netto Jetty', value: totals.netto_jetty },
          ].map((s) => (
            <div key={s.label} className="card py-3 text-center">
              <p className="text-xs text-slate-400">{s.label}</p>
              <p className="text-sm font-bold text-white mt-0.5">{s.value.toLocaleString()}</p>
              <p className="text-xs text-slate-500">kg</p>
            </div>
          ))}
        </div>
      )}

      {/* Trip table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              {jetty === 'hasnur' ? 'Hasnur' : 'Talenta'} · {date}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{trips.length} trucks</p>
          </div>
          <button onClick={fetchTrips} className="text-slate-400 hover:text-white transition-colors p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : error ? (
          <div className="text-center py-8 text-red-400 text-sm">{error}</div>
        ) : trips.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No trips found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-800/40">
                  {['#', 'Truck', 'Status', 'Tare Site', 'Gross Site', 'Netto Site', 'Gross Jetty', 'Tare Jetty', 'Netto Jetty', 'Deviasi', 'Jam Masuk', 'Jam Keluar', 'Jam Masuk Jetty'].map((h) => (
                    <th key={h} className="text-left text-slate-400 font-medium px-3 py-2.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => {
                  const s = STATUS_STYLE[t.status] ?? { cls: 'text-slate-400', label: t.status };
                  return (
                    <tr key={t.trip_id} className="border-b border-slate-800/60">
                      <td className="px-3 py-2.5 text-slate-400">{t.no_tiket}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-100 whitespace-nowrap">{t.no_lambung}</td>
                      <td className={`px-3 py-2.5 font-medium whitespace-nowrap ${s.cls}`}>{s.label}</td>
                      <td className="px-3 py-2.5 text-right">{t.tare_site_kg?.toLocaleString() ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right">{t.gross_site_kg?.toLocaleString() ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-emerald-400">{t.netto_site_kg?.toLocaleString() ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right">{t.gross_jetty_kg?.toLocaleString() ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right">{t.tare_jetty_kg?.toLocaleString() ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-blue-400">{t.netto_jetty_kg?.toLocaleString() ?? '—'}</td>
                      <td className={`px-3 py-2.5 text-right font-medium ${t.deviasi_kg != null ? (t.deviasi_kg < 0 ? 'text-red-400' : 'text-slate-300') : ''}`}>
                        {t.deviasi_kg?.toLocaleString() ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{toWITA(t.cp1_timestamp)}</td>
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{toWITA(t.cp2_timestamp)}</td>
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{toWITA(t.cp3_timestamp)}</td>
                    </tr>
                  );
                })}
                {/* Totals */}
                <tr className="border-t border-slate-600 bg-slate-800/40 font-bold">
                  <td className="px-3 py-2.5 text-slate-300" colSpan={3}>TOTAL</td>
                  <td className="px-3 py-2.5 text-right text-slate-200">{totals.tare.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-slate-200">{totals.gross_site.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-400">{totals.netto_site.toLocaleString()}</td>
                  <td className="px-3 py-2.5" colSpan={2}></td>
                  <td className="px-3 py-2.5 text-right text-blue-400">{totals.netto_jetty.toLocaleString()}</td>
                  <td className="px-3 py-2.5" colSpan={4}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
