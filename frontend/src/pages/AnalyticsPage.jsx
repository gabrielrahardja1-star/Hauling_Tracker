import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { BottomTabs, I, JETTY, kg, toWITA, witaToday } from '../components/DesignSystem';
import { api } from '../lib/api';
import { useLang } from '../hooks/useLang';
import { useUnit } from '../hooks/useUnit';

function subtractDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function formatWeight(kgValue, unit) {
  if (kgValue == null) return '-';
  const n = unit === 'kg'
    ? Number(kgValue)
    : Number(kgValue) / 1000;
  return n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BreachBadge({ count, label, color }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: color === 'red' ? 'var(--danger-bg, #fff1f1)' : 'var(--warn-bg, #fffbeb)',
      border: `1px solid ${color === 'red' ? 'var(--danger, #e53e3e)' : '#f59e0b'}`,
      borderRadius: 8, padding: '4px 10px',
    }}>
      <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 18, color: color === 'red' ? 'var(--danger, #e53e3e)' : '#b45309' }}>{count}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: color === 'red' ? 'var(--danger, #e53e3e)' : '#b45309' }}>{label}</span>
    </div>
  );
}

function JettyBalanceCard({ label, hauled, barged, hauledLabel = 'Netto Site' }) {
  const { t } = useLang();
  const { unit } = useUnit();
  const balance = (hauled ?? 0) - (barged ?? 0);
  return (
    <div className="card" style={{ flex: 1, minWidth: 0 }}>
      <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="between">
          <span className="muted" style={{ fontSize: 12 }}>{hauledLabel}</span>
          <span style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 13 }}>{formatWeight(hauled, unit)} {unit}</span>
        </div>
        <div className="between">
          <span className="muted" style={{ fontSize: 12 }}>{t('analyticsBarged')}</span>
          <span style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 13 }}>{formatWeight(barged, unit)} {unit}</span>
        </div>
        <div className="between" style={{ paddingTop: 6, borderTop: '1px solid var(--border)', marginTop: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 800 }}>{t('analyticsBalance')}</span>
          <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 15, color: balance < 0 ? 'var(--danger)' : 'var(--accent)' }}>
            {formatWeight(balance, unit)} {unit}
          </span>
        </div>
      </div>
    </div>
  );
}

function TalentaCard({ nettoSiteKg, nettoJettyKg, bargedKg }) {
  const { t } = useLang();
  const { unit } = useUnit();
  const siteBalance = (nettoSiteKg ?? 0) - (bargedKg ?? 0);
  const jettyBalance = (nettoJettyKg ?? 0) - (bargedKg ?? 0);

  function SubBox({ titleKey, valueKg, balance }) {
    return (
      <div style={{ flex: 1, minWidth: 0, background: 'var(--bg, #f8f9fa)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)' }}>
        <div className="muted" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
          {t(titleKey)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="between">
            <span className="muted" style={{ fontSize: 11 }}>{t(titleKey)}</span>
            <span style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 12 }}>{formatWeight(valueKg, unit)} {unit}</span>
          </div>
          <div className="between">
            <span className="muted" style={{ fontSize: 11 }}>{t('analyticsBarged')}</span>
            <span style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 12 }}>{formatWeight(bargedKg, unit)} {unit}</span>
          </div>
          <div className="between" style={{ paddingTop: 4, borderTop: '1px solid var(--border)', marginTop: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 800 }}>{t('analyticsBalance')}</span>
            <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 13, color: balance < 0 ? 'var(--danger)' : 'var(--accent)' }}>
              {formatWeight(balance, unit)} {unit}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ flex: 1, minWidth: 0 }}>
      <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Talenta
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SubBox titleKey="analyticsNettoSite" valueKg={nettoSiteKg} balance={siteBalance} />
        <SubBox titleKey="analyticsNettoJetty" valueKg={nettoJettyKg} balance={jettyBalance} />
      </div>
    </div>
  );
}

function OverviewTab({ from, to, jetty }) {
  const { t } = useLang();
  const { unit } = useUnit();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (from)  params.from  = from;
      if (to)    params.to    = to;
      if (jetty) params.jetty = jetty;
      setData(await api.getAnalyticsOverview(params));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [from, to, jetty]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner className="h-8 w-8" /></div>;
  if (error)   return <div className="alert">{error}</div>;
  if (!data)   return null;

  const { hauling, barge, balance } = data;

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* Top stat cards */}
      <div className="analytics-stat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div className="muted" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{t('analyticsHauled')}</div>
          <div style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 20, marginTop: 4 }}>{formatWeight(hauling.total_netto_kg, unit)}</div>
          <div className="muted" style={{ fontSize: 11 }}>{unit} · {hauling.total_trips} {t('analyticsTripsCount')}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div className="muted" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{t('analyticsBarged')}</div>
          <div style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 20, marginTop: 4 }}>{formatWeight(barge.total_qty_kg, unit)}</div>
          <div className="muted" style={{ fontSize: 11 }}>{unit} · {barge.total_loadings} {t('analyticsLoadings')}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--accent-subtle, #f0fdf4)' }}>
          <div className="muted" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{t('analyticsBalance')}</div>
          <div style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 20, marginTop: 4, color: balance.total_kg < 0 ? 'var(--danger)' : 'var(--accent)' }}>
            {formatWeight(balance.total_kg, unit)}
          </div>
          <div className="muted" style={{ fontSize: 11 }}>{unit}</div>
        </div>
      </div>

      {/* Per-jetty breakdown */}
      <div className="section-label">{t('analyticsPerJetty')}</div>
      <div className="analytics-jetty-row" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <TalentaCard
          nettoSiteKg={hauling.by_jetty.talenta?.netto_kg}
          nettoJettyKg={hauling.by_jetty.talenta?.netto_jetty_kg}
          bargedKg={barge.by_jetty.talenta?.qty_kg}
        />
        <JettyBalanceCard
          label="Hasnur"
          hauledLabel={t('analyticsNettoSite')}
          hauled={hauling.by_jetty.hasnur?.netto_kg}
          barged={barge.by_jetty.hasnur?.qty_kg}
        />
      </div>

      {/* Daily table */}
      {hauling.by_date.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 8px', fontWeight: 700, fontSize: 13 }}>{t('analyticsDaily')}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '6px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)' }}>{t('analyticsDate')}</th>
                  <th style={{ padding: '6px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--muted)' }}>{t('analyticsTrips')}</th>
                  <th style={{ padding: '6px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--muted)' }}>{t('analyticsNet')} ({unit})</th>
                </tr>
              </thead>
              <tbody>
                {hauling.by_date.map((d) => (
                  <tr key={d.date} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 14px', fontFamily: 'var(--font-num)' }}>{d.date}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)' }}>{d.trips}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)', fontWeight: 700 }}>{formatWeight(d.netto_kg, unit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)' }}>
                  <td style={{ padding: '8px 14px', fontWeight: 800 }}>{t('analyticsTotal')}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)', fontWeight: 800 }}>{hauling.total_trips}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)', fontWeight: 800 }}>{formatWeight(hauling.total_netto_kg, unit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MonitoringTab({ from, to, jetty }) {
  const { t } = useLang();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [section, setSection] = useState('deviation');
  const [exportingExcel, setExportingExcel] = useState(false);

  async function handleExportExcel() {
    setExportingExcel(true);
    try {
      const params = {};
      if (from)  params.from  = from;
      if (to)    params.to    = to;
      if (jetty) params.jetty = jetty;
      const blob = await api.exportMonitoring(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monitoring_${from || 'all'}_${to || 'all'}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExportingExcel(false);
    }
  }

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (from)  params.from  = from;
      if (to)    params.to    = to;
      if (jetty) params.jetty = jetty;
      setData(await api.getAnalyticsMonitoring(params));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [from, to, jetty]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner className="h-8 w-8" /></div>;
  if (error)   return <div className="alert">{error}</div>;
  if (!data)   return null;

  const { deviation, sla_cp2_cp3 } = data;
  const devCount   = deviation.breaches.length;
  const sla2Count  = sla_cp2_cp3.breaches.length;
  const totalBreaches = devCount + sla2Count;

  const sections = [
    { key: 'deviation', label: t('monitoringDeviation'),   count: devCount },
    { key: 'sla2',      label: t('monitoringSLATransit'), count: sla2Count },
  ];

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* Summary badges */}
      <div className="card">
        <div className="between" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{t('monitoringTitle')}</div>
          <button type="button" onClick={fetch} className="btn btn-ghost btn-sm"><I.refresh width="15" height="15" /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <BreachBadge count={devCount}  label={t('monitoringDeviationLabel')} color="red" />
          <BreachBadge count={sla2Count} label={t('monitoringSLALabel')} color="warn" />
        </div>
        {totalBreaches === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, color: 'var(--accent)' }}>
            <I.check width="16" height="16" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t('monitoringNoViolations')}</span>
          </div>
        )}
      </div>

      {/* Section picker */}
      <div style={{ display: 'flex', gap: 6 }}>
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSection(s.key)}
            style={{
              flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: '1.5px solid',
              borderColor: section === s.key ? 'var(--accent)' : 'var(--border)',
              background: section === s.key ? 'var(--accent-subtle, #f0fdf4)' : 'var(--surface)',
              color: section === s.key ? 'var(--accent)' : 'var(--fg)',
              cursor: 'pointer', textAlign: 'center',
            }}
          >
            {s.label}
            {s.count > 0 && (
              <span style={{ marginLeft: 4, background: section === s.key ? 'var(--accent)' : 'var(--danger)', color: '#fff', borderRadius: 10, padding: '1px 5px', fontSize: 10 }}>
                {s.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Deviation list */}
      {section === 'deviation' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 8px' }} className="between">
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{t('monitoringDeviationTitle')}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {devCount} {t('monitoringDari')} {deviation.eligible} {t('monitoringEligible')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {devCount > 0 && (
                <button type="button" className="btn btn-ghost btn-sm no-print" onClick={() => window.print()} title={t('monitoringPrint')}>
                  <I.download width="15" height="15" /> {t('monitoringPrint')}
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleExportExcel} disabled={exportingExcel} title={t('monitoringExcel')}>
                <I.download width="15" height="15" /> {t('monitoringExcel')}
              </button>
            </div>
          </div>
          <div className="print-only" style={{ display: 'none', padding: '8px 14px 4px' }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{t('monitoringDeviationTitle')}</div>
            <div style={{ fontSize: 12, color: '#666' }}>
              {t('monitoringPeriod')}: {from} — {to}{jetty ? ` · Jetty: ${jetty}` : ''} · {devCount} {t('monitoringDari')} {deviation.eligible}
            </div>
          </div>
          {devCount === 0 ? (
            <div className="muted" style={{ padding: '12px 14px', fontSize: 13 }}>{t('monitoringNoData')}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '6px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 700 }}>{t('monitoringTruck')}</th>
                    <th style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 700 }}>{t('monitoringNettoSite')}</th>
                    <th style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 700 }}>{t('monitoringNettoJetty')}</th>
                    <th style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 700 }}>{t('monitoringDevLabel')}</th>
                  </tr>
                </thead>
                <tbody>
                  {deviation.breaches.map((br) => (
                    <tr key={br.trip_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 14px' }}>
                        <div style={{ fontWeight: 700 }}>{br.no_lambung}</div>
                        <div className="muted" style={{ fontSize: 11 }}>#{br.no_tiket} · {br.date} · {JETTY[br.jetty_destination]}</div>
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)' }}>{kg(br.netto_site_kg)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)' }}>{kg(br.netto_jetty_kg)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, color: 'var(--danger)' }}>
                          {br.deviation_pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SLA CP2→CP3 */}
      {section === 'sla2' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 8px' }} className="between">
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{t('monitoringSLATitle')}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {sla2Count} {t('monitoringDari')} {sla_cp2_cp3.eligible} {t('monitoringEligible')}
              </div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleExportExcel} disabled={exportingExcel} title={t('monitoringExcel')}>
              <I.download width="15" height="15" /> {t('monitoringExcel')}
            </button>
          </div>
          {sla2Count === 0 ? (
            <div className="muted" style={{ padding: '12px 14px', fontSize: 13 }}>
              {sla_cp2_cp3.eligible === 0 ? t('monitoringNoJettyData') : t('monitoringNoData')}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '6px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 700 }}>{t('monitoringTruck')}</th>
                    <th style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 700 }}>{t('monitoringKeluar')}</th>
                    <th style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 700 }}>{t('monitoringTiba')}</th>
                    <th style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 700 }}>{t('monitoringDuration')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sla_cp2_cp3.breaches.map((br) => (
                    <tr key={br.trip_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 14px' }}>
                        <div style={{ fontWeight: 700 }}>{br.no_lambung}</div>
                        <div className="muted" style={{ fontSize: 11 }}>#{br.no_tiket} · {br.date} · {JETTY[br.jetty_destination]}</div>
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)' }}>{toWITA(br.cp2_timestamp)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)' }}>{toWITA(br.cp3_timestamp)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, color: '#b45309' }}>
                          {br.hours_cp2_cp3} {t('monitoringJam')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TruckHistoryTab({ defaultFrom, defaultTo }) {
  const { t } = useLang();
  const { unit } = useUnit();
  const [truck, setTruck] = useState('');
  const [from, setFrom] = useState(defaultFrom || '');
  const [to, setTo] = useState(defaultTo || '');
  const [trips, setTrips] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!truck.trim()) return;
    setLoading(true);
    setError('');
    setTrips(null);
    try {
      const params = { no_lambung: truck.trim().toUpperCase() };
      if (from) params.from = from;
      if (to)   params.to   = to;
      setTrips(await api.getTruckHistory(params));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = { no_lambung: truck.trim().toUpperCase() };
      if (from) params.from = from;
      if (to)   params.to   = to;
      const blob = await api.exportTruckHistory(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `truck_${truck.trim().toUpperCase()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  const totalTrips   = trips?.length ?? 0;
  const completedTrips = trips?.filter((r) => r.status === 'completed') ?? [];
  const overTolerance  = completedTrips.filter((r) => r.deviation_pct != null && r.deviation_pct > 0.5).length;

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="card stack" style={{ gap: 12 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            className="input num grow"
            placeholder={t('truckHistoryPlaceholder')}
            value={truck}
            onChange={(e) => setTruck(e.target.value.toUpperCase())}
          />
          <button type="submit" className="btn btn-brand btn-sm" style={{ width: 54, padding: 0 }} disabled={loading || !truck.trim()}>
            {loading ? <Spinner className="h-5 w-5" /> : <I.search width="20" height="20" />}
          </button>
        </form>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 110 }}>
            <div className="muted" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{t('analyticsFrom')}</div>
            <input type="date" className="input" style={{ fontSize: 13 }} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 110 }}>
            <div className="muted" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{t('analyticsTo')}</div>
            <input type="date" className="input" style={{ fontSize: 13 }} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {error && <div className="alert">{error}</div>}
      </div>

      {trips === null && !loading && (
        <div className="muted" style={{ textAlign: 'center', padding: 24, fontSize: 13 }}>{t('truckHistoryPrompt')}</div>
      )}

      {trips !== null && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, fontFamily: 'var(--font-num)' }}>{truck.trim().toUpperCase()}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {totalTrips} trips · {overTolerance} {t('monitoringDeviationLabel')}
              </div>
            </div>
            {trips.length > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleExport} disabled={exporting}>
                <I.download width="15" height="15" /> {t('monitoringExcel')}
              </button>
            )}
          </div>

          {trips.length === 0 ? (
            <div className="muted" style={{ textAlign: 'center', padding: 24, fontSize: 13 }}>{t('truckHistoryEmpty')}</div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '6px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 700 }}>{t('truckHistoryDate')}</th>
                      <th style={{ padding: '6px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 700 }}>{t('truckHistoryJetty')}</th>
                      <th style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 700 }}>{t('analyticsNettoSite')}</th>
                      <th style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 700 }}>{t('analyticsNettoJetty')}</th>
                      <th style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 700 }}>{t('truckHistoryDeviasi')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((r) => {
                      const over = r.deviation_pct != null && r.deviation_pct > 0.5;
                      return (
                        <tr key={r.trip_id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 14px' }}>
                            <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700 }}>{r.date}</div>
                            <div className="muted" style={{ fontSize: 11 }}>#{r.no_tiket}</div>
                          </td>
                          <td style={{ padding: '8px 14px', fontSize: 12 }}>{JETTY[r.jetty_destination]}</td>
                          <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)' }}>
                            {formatWeight(r.netto_site_kg, unit)} {unit}
                          </td>
                          <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)' }}>
                            {r.netto_jetty_kg != null ? `${formatWeight(r.netto_jetty_kg, unit)} ${unit}` : '-'}
                          </td>
                          <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                            {r.deviation_pct != null ? (
                              <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, color: over ? 'var(--danger)' : 'var(--accent)' }}>
                                {r.deviation_pct}%
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage({ embedded = false }) {
  const { t } = useLang();
  const today = witaToday();
  const [tab, setTab]     = useState('overview');
  const [from, setFrom]   = useState(subtractDays(today, 30));
  const [to, setTo]       = useState(today);
  const [jetty, setJetty] = useState('');

  const titles = { overview: t('analyticsOverview'), monitoring: t('analyticsMonitoring'), trucks: t('truckHistoryTitle') };
  const tabs = [
    { key: 'overview',   label: t('analyticsOverview'),   icon: I.chart },
    { key: 'monitoring', label: t('analyticsMonitoring'), icon: I.warning },
    { key: 'trucks',     label: t('truckHistoryTitle'),   icon: I.search },
  ];

  const filterFields = (
    <>
      <div style={{ flex: 1, minWidth: 110 }}>
        <div className="muted" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{t('analyticsFrom')}</div>
        <input type="date" className="input" style={{ fontSize: 13 }} value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div style={{ flex: 1, minWidth: 110 }}>
        <div className="muted" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{t('analyticsTo')}</div>
        <input type="date" className="input" style={{ fontSize: 13 }} value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div style={{ flex: 1, minWidth: 100 }}>
        <div className="muted" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{t('analyticsJetty')}</div>
        <select className="input" style={{ fontSize: 13 }} value={jetty} onChange={(e) => setJetty(e.target.value)}>
          <option value="">{t('analyticsAll')}</option>
          <option value="hasnur">Hasnur</option>
          <option value="talenta">Talenta</option>
        </select>
      </div>
    </>
  );

  const sidebarFilters = (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
        {t('analyticsFilters') || 'Filters'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filterFields}
      </div>
    </div>
  );

  const tabNav = (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
        {t('analyticsView') || 'View'}
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
          </button>
        ))}
      </div>
    </div>
  );

  const mobileFilters = (
    <div className="analytics-filters-mobile card" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {tab !== 'trucks' && filterFields}
      </div>
    </div>
  );

  const content = (
    <div className="stack" style={{ gap: 14 }}>
      {!embedded && tab !== 'trucks' && mobileFilters}
      {embedded && (
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {tab !== 'trucks' && filterFields}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(titles).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setTab(key)} style={{
                  padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: '1.5px solid',
                  borderColor: tab === key ? 'var(--accent)' : 'var(--border)',
                  background: tab === key ? 'var(--accent-subtle, #f0fdf4)' : 'var(--surface)',
                  color: tab === key ? 'var(--accent)' : 'var(--fg)', cursor: 'pointer',
                }}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
      {tab === 'overview'   && <OverviewTab      from={from} to={to} jetty={jetty} />}
      {tab === 'monitoring' && <MonitoringTab   from={from} to={to} jetty={jetty} />}
      {tab === 'trucks'     && <TruckHistoryTab defaultFrom={from} defaultTo={to} />}
    </div>
  );

  if (embedded) return content;

  return (
    <Layout
      title={titles[tab]}
      wide
      footer={<BottomTabs tabs={tabs} active={tab} onChange={setTab} />}
    >
      <div className="analytics-layout">
        <div className="analytics-sidebar">
          {tabNav}
          {tab !== 'trucks' && sidebarFilters}
        </div>
        <div className="analytics-main">
          {content}
        </div>
      </div>
    </Layout>
  );
}
