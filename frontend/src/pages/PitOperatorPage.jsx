import { useState } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { api } from '../lib/api';

const INITIAL = {
  truck_id: '',
  jetty_destination: '',
  coal_quality: '',
  weather: '',
  gross_weight_kg: '',
};

export default function PitOperatorPage() {
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
    setSuccess(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(null);

    const payload = {
      ...form,
      gross_weight_kg: parseInt(form.gross_weight_kg, 10),
    };

    if (!payload.gross_weight_kg || payload.gross_weight_kg <= 0) {
      return setError('Gross weight must be a positive number');
    }

    setLoading(true);
    try {
      const trip = await api.createTrip(payload);
      setSuccess(trip);
      setForm(INITIAL);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Pit Entry">
      <div className="space-y-5">
        {/* Success banner */}
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
              <div>
                <p className="font-semibold text-emerald-300">Trip created!</p>
                <p className="text-sm text-slate-300 mt-0.5">
                  Truck <span className="font-mono font-bold">{success.truck_id}</span> →{' '}
                  {success.jetty_destination === 'hasnur' ? 'Hasnur' : 'Talenta'}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-mono">{success.trip_id}</p>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <h2 className="text-base font-semibold text-slate-200 mb-5">New Trip</h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Truck ID */}
            <div>
              <label className="label">Truck ID (No. Lambung)</label>
              <input
                type="text"
                className="input-field uppercase"
                placeholder="e.g. B 1234 ABC"
                value={form.truck_id}
                onChange={(e) => set('truck_id', e.target.value.toUpperCase())}
                required
              />
            </div>

            {/* Jetty destination */}
            <div>
              <label className="label">Jetty Destination</label>
              <div className="grid grid-cols-2 gap-3">
                {['hasnur', 'talenta'].map((j) => (
                  <button
                    type="button"
                    key={j}
                    onClick={() => set('jetty_destination', j)}
                    className={`py-3.5 rounded-xl border text-sm font-semibold transition-all ${
                      form.jetty_destination === j
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                        : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {j === 'hasnur' ? 'Hasnur' : 'Talenta'}
                  </button>
                ))}
              </div>
            </div>

            {/* Coal quality */}
            <div>
              <label className="label">Coal Quality (媒质)</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'raw', label: 'Raw 原煤' },
                  { value: 'clean', label: 'Clean 精煤' },
                ].map((q) => (
                  <button
                    type="button"
                    key={q.value}
                    onClick={() => set('coal_quality', q.value)}
                    className={`py-3.5 rounded-xl border text-sm font-semibold transition-all ${
                      form.coal_quality === q.value
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                        : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Weather */}
            <div>
              <label className="label">Weather (Cuaca)</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Cerah, Hujan, Berawan"
                value={form.weather}
                onChange={(e) => set('weather', e.target.value)}
                required
              />
            </div>

            {/* Gross weight */}
            <div>
              <label className="label">Gross Weight — kg (Total Berat Kotor)</label>
              <input
                type="number"
                inputMode="numeric"
                className="input-field"
                placeholder="e.g. 42000"
                value={form.gross_weight_kg}
                onChange={(e) => set('gross_weight_kg', e.target.value)}
                min={1}
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-900/40 border border-red-700/50 text-red-300 text-sm px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-success w-full mt-2"
              disabled={loading || !form.jetty_destination || !form.coal_quality}
            >
              {loading ? <Spinner className="h-5 w-5" /> : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Clock In (Masuk Pit)
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
