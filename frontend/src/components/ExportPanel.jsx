import { useState } from 'react';
import Spinner from './Spinner';
import { api } from '../lib/api';

function today() {
  // WITA date
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
}

export default function ExportPanel() {
  const [date, setDate]   = useState(today());
  const [jetty, setJetty] = useState('hasnur');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState(false);

  async function handleExport() {
    setError(''); setDone(false);
    setLoading(true);
    try {
      const blob = await api.exportTrips(date, jetty);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trips_${date}_${jetty}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-1">Export to Excel</h2>
        <p className="text-xs text-slate-500">Downloads completed trips for the selected date and jetty.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            className="input-field"
            value={date}
            onChange={(e) => { setDate(e.target.value); setDone(false); }}
          />
        </div>

        <div>
          <label className="label">Jetty</label>
          <div className="grid grid-cols-2 gap-3">
            {['hasnur', 'talenta'].map((j) => (
              <button
                type="button"
                key={j}
                onClick={() => { setJetty(j); setDone(false); }}
                className={`py-3.5 rounded-xl border text-sm font-semibold transition-all ${
                  jetty === j
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500'
                }`}
              >
                {j === 'hasnur' ? 'Hasnur' : 'Talenta'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-900/40 border border-red-700/50 text-red-300 text-sm px-4 py-3">{error}</div>
      )}

      {done && (
        <div className="rounded-xl bg-emerald-900/20 border border-emerald-700/50 text-emerald-300 text-sm px-4 py-3">
          Downloaded — trips_{date}_{jetty}.xlsx
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={loading || !date}
        className="btn-primary w-full"
      >
        {loading ? <Spinner className="h-5 w-5" /> : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download .xlsx
          </>
        )}
      </button>
    </div>
  );
}
