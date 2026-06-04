import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import ExportPanel from '../components/ExportPanel';
import AnalyticsPage from './AnalyticsPage';
import { useLang } from '../hooks/useLang';
import {
  Banner,
  BottomTabs,
  DestChip,
  Field,
  I,
  InfoGrid,
  JETTY,
  QUALITY,
  Segmented,
  StatusPill,
  TripListCard,
  Weight,
  kg,
  toWITA,
} from '../components/DesignSystem';
import { api } from '../lib/api';

const CP1_INITIAL = { no_lambung: '', jetty_destination: '', coal_quality: '', cuaca_mmi: '', tare_site_kg: '' };

function scrollContentTop() {
  document.querySelector('.screen')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function TodayList({ trips, loading, onRefresh, onSelectPending }) {
  const { t } = useLang();
  return (
    <TripListCard
      title={t('todayTitle')}
      sub={`${trips.length} ${t('todaySub')}`}
      trips={trips}
      loading={loading}
      onRefresh={onRefresh}
      getTap={onSelectPending ? (tr) => (tr.status === 'pending' ? () => onSelectPending(tr) : null) : null}
      cta={t('todayCta')}
    />
  );
}

function CP1Form({ onSuccess }) {
  const { t } = useLang();
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
    setError('');
    setSuccess(null);
    const tare = parseInt(form.tare_site_kg, 10);
    if (!tare || tare <= 0) {
      setError(t('cp1TareError'));
      return;
    }

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

  const valid = form.no_lambung.trim() && form.jetty_destination && form.coal_quality && form.cuaca_mmi && parseInt(form.tare_site_kg, 10) > 0;

  return (
    <div className="stack" style={{ gap: 14 }}>
      {success && (
        <Banner title={t('cp1BannerTitle')}>
          Tiket #{success.no_tiket} - {success.no_lambung} - Tara {kg(success.tare_site_kg)} kg
        </Banner>
      )}

      <form onSubmit={handleSubmit} className="stack" style={{ gap: 16 }}>
        <Field label={t('cp1NoLambung')}>
          <input
            type="text"
            className="input num"
            placeholder="KB 0000"
            value={form.no_lambung}
            onChange={(e) => set('no_lambung', e.target.value.toUpperCase())}
            required
          />
        </Field>

        <Field label={t('cp1JettyDest')}>
          <Segmented
            value={form.jetty_destination}
            onChange={(value) => set('jetty_destination', value)}
            options={[
              { value: 'hasnur', label: 'Hasnur' },
              { value: 'talenta', label: 'Talenta' },
            ]}
          />
        </Field>

        <Field label={t('cp1CoalQuality')}>
          <Segmented
            value={form.coal_quality}
            onChange={(value) => set('coal_quality', value)}
            options={[
              { value: 'raw', label: t('coalRaw'), sub: t('coalRawSub') },
              { value: 'clean', label: t('coalClean'), sub: t('coalCleanSub') },
            ]}
          />
        </Field>

        <Field label={t('cp1Weather')}>
          <Segmented
            value={form.cuaca_mmi}
            onChange={(value) => set('cuaca_mmi', value)}
            options={[
              { value: 'Cerah', label: t('weatherCerah') },
              { value: 'Berawan', label: t('weatherBerawan') },
              { value: 'Hujan', label: t('weatherHujan') },
            ]}
          />
        </Field>

        <Field label={t('cp1TareLabel')} hint={t('cp1TareHint')}>
          <input
            type="text"
            inputMode="numeric"
            className="input num"
            placeholder="0"
            value={form.tare_site_kg}
            onChange={(e) => set('tare_site_kg', e.target.value.replace(/\D/g, ''))}
            required
          />
        </Field>

        {error && <div className="alert">{error}</div>}

        <button type="submit" className="btn btn-accent" disabled={loading || !valid}>
          {loading ? (
            <Spinner className="h-5 w-5" />
          ) : (
            <>
              <I.arrowIn width="22" height="22" />
              {t('cp1Submit')}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function CP2Form({ onSuccess, pendingTrips, tripsLoading }) {
  const { t } = useLang();
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
    setGross('');
    setSubmitError('');
    setSuccess(null);
    setSearchError('');
    scrollContentTop();
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSearchError('');
    setTrip(null);
    setSuccess(null);
    setGross('');
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
    if (!grossKg || grossKg <= 0) {
      setSubmitError(t('cp2GrossError'));
      return;
    }

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
    setSearchInput('');
    setSearchError('');
    setTrip(null);
    setGross('');
    setSubmitError('');
    setSuccess(null);
  }

  const grossKg = parseInt(gross, 10) || 0;
  const netPreview = trip && grossKg ? grossKg - trip.tare_site_kg : null;

  return (
    <div className="stack" style={{ gap: 14 }}>
      {success && (
        <Banner
          title={t('cp2BannerTitle')}
          action={
            <button type="button" onClick={reset} className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>
              {t('cp2Done')}
            </button>
          }
        >
          {success.no_lambung} - Netto {kg(success.netto_site_kg)} kg
        </Banner>
      )}

      {!success && (
        <div className="card">
          <form onSubmit={handleSearch} className="row" style={{ gap: 10 }}>
            <input
              type="text"
              className="input num grow"
              placeholder={t('cp2SearchPlaceholder')}
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

      {trip && !success && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="between">
            <div className="section-label">{t('cp2DetailTitle')}</div>
            <StatusPill status="pending" />
          </div>

          <div className="card">
            <div className="between" style={{ marginBottom: 14 }}>
              <div>
                <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>
                  #{trip.no_tiket} - {QUALITY[trip.coal_quality]} - {JETTY[trip.jetty_destination]}
                </div>
                <div style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 22 }}>{trip.no_lambung}</div>
              </div>
              <DestChip dest={trip.jetty_destination} />
            </div>
            <InfoGrid
              items={[
                { label: t('cp2TareSiteLabel'), value: kg(trip.tare_site_kg) },
                { label: t('cp2JamMasukLabel'), value: toWITA(trip.cp1_timestamp) },
              ]}
            />
          </div>

          <form onSubmit={handleSubmit} className="stack" style={{ gap: 16 }}>
            <Field label={t('cp2GrossLabel')} hint={t('cp2GrossHint')}>
              <input
                type="text"
                inputMode="numeric"
                className="input num"
                placeholder="0"
                value={gross}
                onChange={(e) => {
                  setGross(e.target.value.replace(/\D/g, ''));
                  setSubmitError('');
                }}
                required
              />
            </Field>

            {netPreview !== null && (
              <div className="card" style={{ padding: '14px 16px' }}>
                <div className="between">
                  <span className="muted" style={{ fontSize: 13, fontWeight: 800 }}>{t('cp2NettoLabel')}</span>
                  <Weight value={netPreview} accent={netPreview > 0} />
                </div>
              </div>
            )}

            {submitError && <div className="alert">{submitError}</div>}

            <div className="row" style={{ gap: 10 }}>
              <button type="button" onClick={reset} className="btn btn-ghost grow" style={{ width: 'auto' }}>
                {t('cp2Cancel')}
              </button>
              <button type="submit" className="btn btn-accent grow" style={{ width: 'auto' }} disabled={submitting || !(netPreview > 0)}>
                {submitting ? <Spinner className="h-5 w-5" /> : <><I.arrowOut width="20" height="20" /> {t('cp2Submit')}</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {!trip && !success && (
        <>
          <div className="section-label">{t('cp2PickPrompt')}</div>
          <TripListCard
            title={t('cp2WaitingTitle')}
            sub={`${pendingTrips.length} ${t('cp2WaitingSub')}`}
            trips={pendingTrips}
            loading={tripsLoading}
            getTap={(t) => () => selectTrip(t)}
            cta="Catat keluar"
          />
        </>
      )}
    </div>
  );
}

export default function StockpileOperatorPage() {
  const { t } = useLang();
  const [tab, setTab] = useState('cp1');
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    setTripsLoading(true);
    try {
      setTrips(await api.getTodayTrips());
    } catch {
      /* keep the operator screen calm on transient refresh failures */
    } finally {
      setTripsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
    const interval = setInterval(fetchTrips, 30000);
    return () => clearInterval(interval);
  }, [fetchTrips]);

  const pendingTrips = trips.filter((tr) => tr.status === 'pending');
  const titles = { cp1: t('tabMasuk'), cp2: t('tabKeluar'), trips: t('todayTitle'), export: t('tabEkspor'), analytics: t('tabAnalytics') };
  const tabs = [
    { key: 'cp1', label: t('tabMasuk'), icon: I.arrowIn },
    { key: 'cp2', label: t('tabKeluar'), icon: I.arrowOut, badge: pendingTrips.length },
    { key: 'trips', label: t('tabTrip'), icon: I.list },
    { key: 'export', label: t('tabEkspor'), icon: I.download },
    { key: 'analytics', label: t('tabAnalytics'), icon: I.chart },
  ];

  return (
    <Layout
      title={titles[tab]}
      footer={<BottomTabs tabs={tabs} active={tab} onChange={setTab} />}
    >
      {tab === 'cp1' && (
        <>
          <CP1Form onSuccess={fetchTrips} />
          <TodayList trips={trips} loading={tripsLoading} onRefresh={fetchTrips} />
        </>
      )}
      {tab === 'cp2' && (
        <CP2Form onSuccess={fetchTrips} pendingTrips={pendingTrips} tripsLoading={tripsLoading} />
      )}
      {tab === 'trips' && (
        <TodayList trips={trips} loading={tripsLoading} onRefresh={fetchTrips} />
      )}
      {tab === 'export' && <ExportPanel />}
      {tab === 'analytics' && <AnalyticsPage embedded />}
    </Layout>
  );
}
