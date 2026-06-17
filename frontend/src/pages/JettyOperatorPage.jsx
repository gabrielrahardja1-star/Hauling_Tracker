import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import ExportPanel from '../components/ExportPanel';
import AnalyticsPage from './AnalyticsPage';
import { useLang } from '../hooks/useLang';
import { useUnit } from '../hooks/useUnit';
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
  fmtWeight,
  toWITA,
  witaToday,
} from '../components/DesignSystem';
import { api } from '../lib/api';

const BARGE_INITIAL = { jetty: '', barge_name: '', tug_boat_name: '', loading_date: witaToday(), loading_qty_kg: '', stockpile_code: '' };

function BargePanel({ defaultJetty }) {
  const { t } = useLang();
  const { unit } = useUnit();
  const fw = (n) => fmtWeight(n, unit);
  const [form, setForm] = useState({ ...BARGE_INITIAL, jetty: defaultJetty || '' });
  const [loadings, setLoadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const fetchLoadings = useCallback(async () => {
    setLoading(true);
    try {
      setLoadings(await api.listBargeLoadings(form.jetty ? { jetty: form.jetty } : {}));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [form.jetty]);

  useEffect(() => { fetchLoadings(); }, [fetchLoadings]);

  function set(field, value) {
    setForm((f) => ({
      ...f,
      [field]: value,
      ...(field === 'jetty' ? { stockpile_code: '' } : {}),
    }));
    setError('');
    setSuccess(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(null);
    const qty = parseInt(form.loading_qty_kg, 10);
    if (!qty || qty <= 0) { setError(t('bargeQtyError')); return; }
    setSubmitting(true);
    try {
      const created = await api.createBargeLoading({ ...form, loading_qty_kg: qty });
      setSuccess(created);
      setForm((f) => ({ ...BARGE_INITIAL, jetty: f.jetty, loading_date: f.loading_date }));
      fetchLoadings();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const valid = form.jetty && form.barge_name.trim() && form.tug_boat_name.trim() && form.loading_date && parseInt(form.loading_qty_kg, 10) > 0;

  const totalQty = loadings.reduce((s, l) => s + Number(l.loading_qty_kg), 0);

  const historyPane = (
    <div className="card">
      <div className="between" style={{ marginBottom: 12 }}>
        <div className="section-label">{t('bargeHistory')}</div>
        <button type="button" onClick={fetchLoadings} className="btn btn-ghost btn-sm">
          <I.refresh width="16" height="16" />
        </button>
      </div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Spinner className="h-6 w-6" /></div>
      ) : loadings.length === 0 ? (
        <div className="muted" style={{ textAlign: 'center', padding: 16, fontSize: 14 }}>{t('bargeEmpty')}</div>
      ) : (
        <>
          {loadings.map((l) => (
            <div key={l.loading_id} className="between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{l.barge_name}</div>
                <div className="muted" style={{ fontSize: 12 }}>Tug: {l.tug_boat_name} · {JETTY[l.jetty]} · {String(l.loading_date).slice(0, 10)}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 15, textAlign: 'right' }}>
                {fw(l.loading_qty_kg)} <span className="muted" style={{ fontSize: 11 }}>{unit}</span>
              </div>
            </div>
          ))}
          <div className="between" style={{ paddingTop: 10, marginTop: 4 }}>
            <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{t('bargeTotal')}</span>
            <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 16 }}>{fw(totalQty)} {unit}</span>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="op-two-col">
      <div className="op-col-form stack" style={{ gap: 14 }}>
        {success && (
          <Banner title={t('bargeBannerTitle')}>
            {success.barge_name} / {success.tug_boat_name} — {fw(success.loading_qty_kg)} {unit} — {JETTY[success.jetty]}
          </Banner>
        )}
        <div className="card">
          <div className="section-label" style={{ marginBottom: 14 }}>{t('bargeAddSection')}</div>
          <form onSubmit={handleSubmit} className="stack" style={{ gap: 12 }}>
            <Field label={t('filterJetty')}>
              <select className="input" value={form.jetty} onChange={(e) => set('jetty', e.target.value)} required>
                <option value="">{t('bargePickJetty')}</option>
                <option value="hasnur">Hasnur</option>
                <option value="talenta">Talenta</option>
              </select>
            </Field>
            <Field label={t('bargeLoadingDate')}>
              <input type="date" className="input" value={form.loading_date} onChange={(e) => set('loading_date', e.target.value)} required />
            </Field>
            <Field label={t('bargeName')}>
              <input type="text" className="input" placeholder="TAMA 2238" value={form.barge_name} onChange={(e) => set('barge_name', e.target.value.toUpperCase())} required />
            </Field>
            <Field label={t('tugBoat')}>
              <input type="text" className="input" placeholder="PRIMA 3330" value={form.tug_boat_name} onChange={(e) => set('tug_boat_name', e.target.value.toUpperCase())} required />
            </Field>
            {form.jetty && (
              <Field label={t('bargeStockpileCode')}>
                <select className="input" value={form.stockpile_code} onChange={(e) => set('stockpile_code', e.target.value)}>
                  <option value="">— Pilih —</option>
                  {form.jetty === 'talenta' && <>
                    <option value="Line 1">Line 1</option>
                    <option value="Line 2">Line 2</option>
                    <option value="Line 3">Line 3</option>
                    <option value="Line 4">Line 4</option>
                    <option value="Stockroom 2">Stockroom 2</option>
                  </>}
                  {form.jetty === 'hasnur' && <>
                    <option value="Jetty R">Jetty R</option>
                    <option value="Jetty H/J">Jetty H/J</option>
                  </>}
                </select>
              </Field>
            )}
            <Field label={t('loadingQty')} hint="kg">
              <input type="text" inputMode="numeric" className="input num" placeholder="0" value={form.loading_qty_kg} onChange={(e) => set('loading_qty_kg', e.target.value.replace(/\D/g, ''))} required />
            </Field>
            {error && <div className="alert">{error}</div>}
            <button type="submit" className="btn btn-accent" disabled={submitting || !valid}>
              {submitting ? <Spinner className="h-5 w-5" /> : <><I.anchor width="18" height="18" /> {t('bargeSubmit')}</>}
            </button>
          </form>
        </div>
      </div>
      <div className="op-col-list">{historyPane}</div>
    </div>
  );
}

function scrollContentTop() {
  document.querySelector('.screen')?.scrollTo({ top: 0, behavior: 'smooth' });
}

export default function JettyOperatorPage() {
  const { t } = useLang();
  const { unit } = useUnit();
  const fw = (n) => fmtWeight(n, unit);
  const [tab, setTab] = useState('cp3');
  const [jettyFilter, setJettyFilter] = useState('');
  const [allTrips, setAllTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState(witaToday);
  const [dateTo, setDateTo] = useState(witaToday);
  const [rangeTrips, setRangeTrips] = useState([]);
  const [rangeLoading, setRangeLoading] = useState(false);

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

  const fetchRangeTrips = useCallback(async () => {
    setRangeLoading(true);
    try {
      const params = { date_from: dateFrom, date_to: dateTo };
      if (jettyFilter) params.jetty = jettyFilter;
      setRangeTrips(await api.listTrips(params));
    } catch {
      /* silent */
    } finally {
      setRangeLoading(false);
    }
  }, [dateFrom, dateTo, jettyFilter]);

  useEffect(() => { fetchRangeTrips(); }, [fetchRangeTrips]);

  function selectTrip(t) {
    setTrip(t);
    setSearchInput(t.no_lambung);
    setGrossJetty('');
    setTareJetty('');
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
    setTareJetty('');
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
      setSubmitError(t('cp3GrossError'));
      return;
    }

    const tareKg = parseInt(tareJetty, 10) || null;

    setSubmitting(true);
    try {
      const payload = { gross_jetty_kg: grossKg };
      if (tareKg) payload.tare_jetty_kg = tareKg;
      const updated = await api.submitCP3(trip.trip_id, payload);
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
    setTareJetty('');
    setSubmitError('');
  }

  const g = parseInt(grossJetty, 10) || 0;
  const tare = parseInt(tareJetty, 10) || 0;
  const nettoJettyPreview = tare > 0 ? g - tare : g;
  const preview = trip && g ? {
    netto_jetty: nettoJettyPreview,
    compare_gross: g - (trip.gross_site_kg || 0),
    deviasi: nettoJettyPreview - (trip.netto_site_kg || 0),
    compare_tare: tare > 0 ? tare - (trip.tare_site_kg || 0) : null,
  } : null;

  const displayTrips = jettyFilter ? allTrips.filter((t) => t.jetty_destination === jettyFilter) : allTrips;
  const incomingTrips = displayTrips.filter((t) => t.status === 'in_transit');
  const inTransitCount = incomingTrips.length;
  const titles = { cp3: t('tabTimbang'), trips: t('todayTitle'), barge: t('tabBarge'), export: t('tabEkspor'), analytics: t('tabAnalytics') };
  const tabs = [
    { key: 'cp3', label: t('tabTimbang'), icon: I.scale, badge: inTransitCount },
    { key: 'trips', label: t('tabTrip'), icon: I.list },
    { key: 'barge', label: t('tabBarge'), icon: I.anchor },
    { key: 'export', label: t('tabEkspor'), icon: I.download },
    { key: 'analytics', label: t('tabAnalytics'), icon: I.chart },
  ];

  const filterControl = (
    <select className="inline-edit" style={{ minWidth: 112 }} value={jettyFilter} onChange={(e) => setJettyFilter(e.target.value)}>
      <option value="">{t('analyticsAll')}</option>
      <option value="hasnur">Hasnur</option>
      <option value="talenta">Talenta</option>
    </select>
  );

  const sidebarNav = (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
        {t('tabNav') || 'Menu'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {tabs.map((s) => (
          <button key={s.key} type="button" onClick={() => setTab(s.key)} style={{
            width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            border: '1.5px solid', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
            borderColor: tab === s.key ? 'var(--accent)' : 'var(--border)',
            background: tab === s.key ? 'var(--accent-subtle, #f0fdf4)' : 'var(--surface)',
            color: tab === s.key ? 'var(--accent)' : 'var(--fg)', cursor: 'pointer',
          }}>
            <s.icon width="15" height="15" />
            {s.label}
            {s.badge > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>
                {s.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const cp3FormPane = (
    <div className="stack" style={{ gap: 14 }}>
      {/* date range header */}
      <div className="card" style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
          {new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Makassar', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}
        </div>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <input type="date" className="input" style={{ flex: 1, fontSize: 13 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>–</span>
          <input type="date" className="input" style={{ flex: 1, fontSize: 13 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {success && (
        <Banner
          title={t('cp3BannerTitle')}
          action={
            <button type="button" onClick={reset} className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>
              {t('cp3Done')}
            </button>
          }
        >
          {success.no_lambung} - {t('cp3NettoJetty')} {fw(success.netto_jetty_kg)} {unit} - {t('cp3Deviasi')} {fw(success.deviasi_kg)} {unit}
        </Banner>
      )}

      {!success && (
        <div className="card">
          <form onSubmit={handleSearch} className="row" style={{ gap: 10 }}>
            <input
              type="text"
              className="input num grow"
              placeholder={t('cp3SearchPlaceholder')}
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
            <div className="section-label">{t('cp3CompletedSection')}{JETTY[trip.jetty_destination]}</div>
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
                { label: t('cp3NettoJetty'), value: fw(trip.netto_jetty_kg) },
                { label: t('cp3Deviasi'), value: `${fw(trip.deviasi_kg)} ${unit}` },
                { label: t('cp3GrossJetty'), value: fw(trip.gross_jetty_kg) },
                { label: t('cp3JamMasukJetty'), value: toWITA(trip.cp3_timestamp) },
              ]}
            />
          </div>
          <button type="button" onClick={reset} className="btn btn-ghost">{t('cp3Close')}</button>
        </div>
      )}

      {trip && !success && trip.status === 'in_transit' && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="between">
            <div className="section-label">{t('cp3InTransitSection')}{JETTY[trip.jetty_destination]}</div>
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
                { label: t('cp3NettoSite'), value: fw(trip.netto_site_kg) },
                { label: t('cp3GrossSite'), value: fw(trip.gross_site_kg) },
                { label: t('cp3JamMasuk'), value: toWITA(trip.cp1_timestamp) },
                { label: t('cp3JamKeluar'), value: toWITA(trip.cp2_timestamp) },
              ]}
            />
          </div>

          <form onSubmit={handleSubmit} className="stack" style={{ gap: 16 }}>
            <Field label={`${t('cp3GrossLabel')} ${JETTY[trip.jetty_destination]}`} hint={t('cp3GrossHint')}>
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

            {trip && (
              <Field label={t('cp3TareLabel')} hint={t('cp3TareHint')}>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input num"
                  placeholder="0"
                  value={tareJetty}
                  onChange={(e) => {
                    setTareJetty(e.target.value.replace(/\D/g, ''));
                    setSubmitError('');
                  }}
                />
              </Field>
            )}

            {preview && (
              <div className="card" style={{ padding: 14 }}>
                <div className="between" style={{ marginBottom: 8 }}>
                  <span className="muted" style={{ fontSize: 13, fontWeight: 800 }}>{t('cp3NettoJetty')}</span>
                  <Weight value={preview.netto_jetty} accent />
                </div>
                <div className="between" style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span className="muted" style={{ fontSize: 13, fontWeight: 800 }}>{t('cp3DeviasVsSite')}</span>
                  <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 18, color: preview.deviasi < 0 ? 'var(--danger)' : 'var(--st-transit-fg)' }}>
                    {preview.deviasi > 0 ? '+' : ''}{fw(preview.deviasi)} {unit}
                  </span>
                </div>
                <div className="between" style={{ paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 8 }}>
                  <span className="muted" style={{ fontSize: 13, fontWeight: 800 }}>{t('cp3CompareGross')}</span>
                  <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 18 }}>{fw(preview.compare_gross)} {unit}</span>
                </div>
                {preview.compare_tare != null && (
                  <div className="between" style={{ paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 8 }}>
                    <span className="muted" style={{ fontSize: 13, fontWeight: 800 }}>{t('cp3CompareTare')}</span>
                    <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 18, color: preview.compare_tare !== 0 ? 'var(--danger)' : 'inherit' }}>
                      {preview.compare_tare > 0 ? '+' : ''}{fw(preview.compare_tare)} {unit}
                    </span>
                  </div>
                )}
              </div>
            )}

            {submitError && <div className="alert">{submitError}</div>}

            <div className="row" style={{ gap: 10 }}>
              <button type="button" onClick={reset} className="btn btn-ghost grow" style={{ width: 'auto' }}>
                {t('cp3Cancel')}
              </button>
              <button type="submit" className="btn btn-accent grow" style={{ width: 'auto' }} disabled={submitting || !(g > 0)}>
                {submitting ? <Spinner className="h-5 w-5" /> : <><I.scale width="20" height="20" /> {t('cp3Submit')}</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  const cp3ListPane = !trip && !success ? (
    <div className="stack" style={{ gap: 14 }}>
      <div className="section-label">{t('cp3QueueSection')}</div>
      <TripListCard
        title={t('cp3QueueTitle')}
        sub={`${inTransitCount} ${t('cp3QueueSub')}`}
        trips={incomingTrips}
        loading={tripsLoading}
        right={filterControl}
        onRefresh={fetchTrips}
        getTap={(tr) => () => selectTrip(tr)}
        cta={t('cp3Weigh')}
        empty="Tidak ada truk dalam perjalanan"
      />
      <div className="section-label" style={{ marginTop: 4 }}>Semua Trip — {dateFrom === dateTo ? dateFrom : `${dateFrom} s/d ${dateTo}`}</div>
      <TripListCard
        title="Riwayat Trip"
        sub={`${rangeTrips.length} trip`}
        trips={rangeTrips}
        loading={rangeLoading}
        onRefresh={fetchRangeTrips}
        getTap={(tr) => (tr.status === 'in_transit' ? () => selectTrip(tr) : null)}
        cta={t('cp3Weigh')}
      />
    </div>
  ) : null;

  return (
    <Layout
      title={titles[tab]}
      wide
      footer={<div className="op-bottom-tabs-only"><BottomTabs tabs={tabs} active={tab} onChange={setTab} /></div>}
    >
      <div className="op-layout">
        <div className="op-sidebar">{sidebarNav}</div>
        <div className="op-main">
          {tab === 'export' && <ExportPanel />}
          {tab === 'barge' && <BargePanel defaultJetty={jettyFilter} />}
          {tab === 'analytics' && <AnalyticsPage embedded />}
          {tab === 'trips' && (
            <TripListCard
              title={t('todayTitle')}
              sub={`${displayTrips.length} ${t('cp3TripsSub')} ${inTransitCount} ${t('cp3TripsInTransit')}`}
              trips={displayTrips}
              loading={tripsLoading}
              right={filterControl}
              onRefresh={fetchTrips}
              getTap={(tr) => (tr.status === 'in_transit' ? () => selectTrip(tr) : null)}
              cta={t('cp3Weigh')}
            />
          )}
          {tab === 'cp3' && (
            <div className="op-two-col">
              <div className="op-col-form">{cp3FormPane}</div>
              {cp3ListPane && <div className="op-col-list">{cp3ListPane}</div>}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
