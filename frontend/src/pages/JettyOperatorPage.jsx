import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import ExportPanel from '../components/ExportPanel';
import {
  Banner,
  BottomTabs,
  DestChip,
  Field,
  I,
  InfoGrid,
  JETTY,
  QUALITY,
  StatusPill,
  TripListCard,
  Weight,
  elapsed,
  kg,
  toWITA,
} from '../components/DesignSystem';
import { api } from '../lib/api';

function scrollContentTop() {
  document.querySelector('.screen')?.scrollTo({ top: 0, behavior: 'smooth' });
}

export default function JettyOperatorPage() {
  const [tab, setTab] = useState('cp3');
  const [jettyFilter, setJettyFilter] = useState('');
  const [allTrips, setAllTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [trip, setTrip] = useState(null);

  const [grossJetty, setGrossJetty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);

  const fetchTrips = useCallback(async () => {
    setTripsLoading(true);
    try {
      setAllTrips(await api.getTodayTrips(jettyFilter));
    } catch {
      /* silent refresh failure */
    } finally {
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
    setGrossJetty('');
    setSubmitError('');
    setSuccess(null);
    scrollContentTop();
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSearchError('');
    setTrip(null);
    setSuccess(null);
    setGrossJetty('');
    setSearching(true);
    try {
      const t = await api.searchTrip(searchInput.trim().toUpperCase());
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
    if (!grossKg || grossKg <= 0) {
      setSubmitError('Berat bruto jetty harus lebih dari 0 kg.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await api.submitCP3(trip.trip_id, { gross_jetty_kg: grossKg });
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
    setTrip(null);
    setSuccess(null);
    setSearchInput('');
    setSearchError('');
    setGrossJetty('');
    setSubmitError('');
  }

  const g = parseInt(grossJetty, 10) || 0;
  const preview = trip && g ? {
    netto_jetty: g,
    compare_gross: g - (trip.gross_site_kg || 0),
    deviasi: g - (trip.netto_site_kg || 0),
  } : null;

  const displayTrips = jettyFilter ? allTrips.filter((t) => t.jetty_destination === jettyFilter) : allTrips;
  const inTransitCount = allTrips.filter((t) => t.status === 'in_transit').length;
  const titles = { cp3: 'Timbang Jetty', trips: 'Trip Hari Ini', export: 'Ekspor' };
  const tabs = [
    { key: 'cp3', label: 'Timbang', icon: I.scale, badge: inTransitCount },
    { key: 'trips', label: 'Trip', icon: I.list },
    { key: 'export', label: 'Ekspor', icon: I.download },
  ];

  const filterControl = (
    <select className="inline-edit" style={{ minWidth: 112 }} value={jettyFilter} onChange={(e) => setJettyFilter(e.target.value)}>
      <option value="">Semua</option>
      <option value="hasnur">Hasnur</option>
      <option value="talenta">Talenta</option>
    </select>
  );

  return (
    <Layout
      title={titles[tab]}
      footer={<BottomTabs tabs={tabs} active={tab} onChange={setTab} />}
    >
      {tab === 'export' && <ExportPanel />}

      {tab === 'trips' && (
        <TripListCard
          title="Trip Hari Ini"
          sub={`${displayTrips.length} truk - ${inTransitCount} perjalanan`}
          trips={displayTrips}
          loading={tripsLoading}
          right={filterControl}
          onRefresh={fetchTrips}
          getTap={(t) => (t.status === 'in_transit' ? () => selectTrip(t) : null)}
          cta="Timbang"
        />
      )}

      {tab === 'cp3' && (
        <div className="stack" style={{ gap: 14 }}>
          {success && (
            <Banner
              title="Timbang jetty selesai"
              action={
                <button type="button" onClick={reset} className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>
                  Selesai
                </button>
              }
            >
              {success.no_lambung} - Netto jetty {kg(success.netto_jetty_kg)} kg - Deviasi {kg(success.deviasi_kg)} kg
            </Banner>
          )}

          {!success && (
            <div className="card">
              <form onSubmit={handleSearch} className="row" style={{ gap: 10 }}>
                <input
                  type="text"
                  className="input num grow"
                  placeholder="Cari no. lambung"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value.toUpperCase());
                    setSearchError('');
                  }}
                />
                <button type="submit" className="btn btn-brand btn-sm" style={{ width: 54, padding: 0 }} disabled={searching || !searchInput.trim()}>
                  {searching ? <Spinner className="h-5 w-5" /> : <I.search width="20" height="20" />}
                </button>
              </form>
              {searchError && <div className="alert" style={{ marginTop: 12 }}>{searchError}</div>}
            </div>
          )}

          {trip && !success && trip.status === 'completed' && (
            <div className="stack" style={{ gap: 16 }}>
              <div className="between">
                <div className="section-label">Trip selesai - {JETTY[trip.jetty_destination]}</div>
                <StatusPill status="completed" />
              </div>
              <div className="card">
                <div className="between" style={{ marginBottom: 14 }}>
                  <div>
                    <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>
                      #{trip.no_tiket} - {QUALITY[trip.coal_quality]}
                    </div>
                    <div style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 22 }}>{trip.no_lambung}</div>
                  </div>
                  <DestChip dest={trip.jetty_destination} />
                </div>
                <InfoGrid
                  items={[
                    { label: 'Netto Jetty', value: kg(trip.netto_jetty_kg) },
                    { label: 'Deviasi', value: `${kg(trip.deviasi_kg)} kg` },
                    { label: 'Gross Jetty', value: kg(trip.gross_jetty_kg) },
                    { label: 'Jam Masuk Jetty', value: toWITA(trip.cp3_timestamp) },
                  ]}
                />
              </div>
              <button type="button" onClick={reset} className="btn btn-ghost">Tutup</button>
            </div>
          )}

          {trip && !success && trip.status === 'in_transit' && (
            <div className="stack" style={{ gap: 16 }}>
              <div className="between">
                <div className="section-label">Timbang ulang - {JETTY[trip.jetty_destination]}</div>
                <StatusPill status="in_transit" />
              </div>

              <div className="card">
                <div className="between" style={{ marginBottom: 14 }}>
                  <div>
                    <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>
                      #{trip.no_tiket} - {QUALITY[trip.coal_quality]} - {elapsed(trip.cp2_timestamp)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 22 }}>{trip.no_lambung}</div>
                  </div>
                  <DestChip dest={trip.jetty_destination} />
                </div>
                <InfoGrid
                  items={[
                    { label: 'Netto Site', value: kg(trip.netto_site_kg) },
                    { label: 'Gross Site', value: kg(trip.gross_site_kg) },
                    { label: 'Jam Masuk', value: toWITA(trip.cp1_timestamp) },
                    { label: 'Jam Keluar', value: toWITA(trip.cp2_timestamp) },
                  ]}
                />
              </div>

              <form onSubmit={handleSubmit} className="stack" style={{ gap: 16 }}>
                <Field label={`Berat Isi di ${JETTY[trip.jetty_destination]}`} hint="Bruto - kg">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="input num"
                    placeholder="0"
                    value={grossJetty}
                    onChange={(e) => {
                      setGrossJetty(e.target.value.replace(/\D/g, ''));
                      setSubmitError('');
                    }}
                    required
                  />
                </Field>

                {preview && (
                  <div className="card" style={{ padding: 14 }}>
                    <div className="between" style={{ marginBottom: 8 }}>
                      <span className="muted" style={{ fontSize: 13, fontWeight: 800 }}>Netto Jetty</span>
                      <Weight value={preview.netto_jetty} accent />
                    </div>
                    <div className="between" style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                      <span className="muted" style={{ fontSize: 13, fontWeight: 800 }}>Deviasi vs site</span>
                      <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 18, color: preview.deviasi < 0 ? 'var(--danger)' : 'var(--st-transit-fg)' }}>
                        {preview.deviasi > 0 ? '+' : ''}{kg(preview.deviasi)} kg
                      </span>
                    </div>
                    <div className="between" style={{ paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 8 }}>
                      <span className="muted" style={{ fontSize: 13, fontWeight: 800 }}>Compare Gross</span>
                      <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 18 }}>{kg(preview.compare_gross)} kg</span>
                    </div>
                  </div>
                )}

                {submitError && <div className="alert">{submitError}</div>}

                <div className="row" style={{ gap: 10 }}>
                  <button type="button" onClick={reset} className="btn btn-ghost grow" style={{ width: 'auto' }}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-accent grow" style={{ width: 'auto' }} disabled={submitting || !(g > 0)}>
                    {submitting ? <Spinner className="h-5 w-5" /> : <><I.scale width="20" height="20" /> Selesai</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {!trip && !success && (
            <>
              <div className="section-label">Truk dalam perjalanan ke jetty</div>
              <TripListCard
                title="Antrian Timbang"
                sub={`${inTransitCount} truk menuju jetty`}
                trips={displayTrips}
                loading={tripsLoading}
                right={filterControl}
                onRefresh={fetchTrips}
                getTap={(t) => (t.status === 'in_transit' ? () => selectTrip(t) : null)}
                cta="Timbang"
              />
            </>
          )}
        </div>
      )}
    </Layout>
  );
}
