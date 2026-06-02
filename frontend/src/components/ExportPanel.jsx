import { useState, useEffect, useCallback } from 'react';
import Spinner from './Spinner';
import { Field, I, StatCard, StatusPill, kg, toWITA, witaToday } from './DesignSystem';
import { api } from '../lib/api';

export default function ExportPanel() {
  const [date, setDate] = useState(witaToday());
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
      const today = witaToday();
      setTrips(date === today ? all.filter((t) => t.jetty_destination === jetty || !jetty) : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [date, jetty]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

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
    tare: acc.tare + (t.tare_site_kg || 0),
    gross_site: acc.gross_site + (t.gross_site_kg || 0),
    netto_site: acc.netto_site + (t.netto_site_kg || 0),
    netto_jetty: acc.netto_jetty + (t.netto_jetty_kg || 0),
  }), { tare: 0, gross_site: 0, netto_site: 0, netto_jetty: 0 });

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="card stack" style={{ gap: 14 }}>
        <div className="filter-grid">
          <Field label="Tanggal">
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Jetty">
            <select className="input" value={jetty} onChange={(e) => setJetty(e.target.value)}>
              <option value="hasnur">Hasnur</option>
              <option value="talenta">Talenta</option>
            </select>
          </Field>
        </div>

        <button onClick={handleExport} disabled={exporting} className="btn btn-brand">
          {exporting ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <>
              <I.download width="20" height="20" />
              Unduh Excel
            </>
          )}
        </button>
      </div>

      {trips.length > 0 && (
        <div className="totals-grid">
          <StatCard label="Tare Site" value={totals.tare} />
          <StatCard label="Gross Site" value={totals.gross_site} />
          <StatCard label="Netto Site" value={totals.netto_site} accent />
          <StatCard label="Netto Jetty" value={totals.netto_jetty} accent />
        </div>
      )}

      <div className="card flush">
        <div className="list-head">
          <div>
            <div className="lh-title">{jetty === 'hasnur' ? 'Hasnur' : 'Talenta'} - {date}</div>
            <div className="lh-sub">{trips.length} truk</div>
          </div>
          <button onClick={fetchTrips} className="ah-icon-btn icon-muted" aria-label="Segarkan" title="Segarkan">
            <I.refresh width="18" height="18" />
          </button>
        </div>

        {loading ? (
          <div className="empty-state"><Spinner /></div>
        ) : error ? (
          <div className="empty-state" style={{ color: 'var(--danger)' }}>{error}</div>
        ) : trips.length === 0 ? (
          <div className="empty-state">Tidak ada trip untuk pilihan ini</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {['#', 'Truck', 'Status', 'Tare', 'Gross Site', 'Netto Site', 'Gross Jetty', 'Netto Jetty', 'Deviasi', 'Masuk', 'Keluar', 'Jetty'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.trip_id}>
                    <td>{t.no_tiket}</td>
                    <td style={{ fontWeight: 800 }}>{t.no_lambung}</td>
                    <td><StatusPill status={t.status} short /></td>
                    <td style={{ textAlign: 'right' }}>{kg(t.tare_site_kg)}</td>
                    <td style={{ textAlign: 'right' }}>{kg(t.gross_site_kg)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--st-done-fg)' }}>{kg(t.netto_site_kg)}</td>
                    <td style={{ textAlign: 'right' }}>{kg(t.gross_jetty_kg)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--brand)' }}>{kg(t.netto_jetty_kg)}</td>
                    <td style={{ textAlign: 'right', color: t.deviasi_kg < 0 ? 'var(--danger)' : 'var(--text)' }}>{kg(t.deviasi_kg)}</td>
                    <td>{toWITA(t.cp1_timestamp)}</td>
                    <td>{toWITA(t.cp2_timestamp)}</td>
                    <td>{toWITA(t.cp3_timestamp)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ fontWeight: 800 }}>TOTAL</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{kg(totals.tare)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{kg(totals.gross_site)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--st-done-fg)' }}>{kg(totals.netto_site)}</td>
                  <td />
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--brand)' }}>{kg(totals.netto_jetty)}</td>
                  <td colSpan={4} />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
