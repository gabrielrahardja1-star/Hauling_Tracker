import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { BottomTabs, I, JETTY, kg, toWITA, witaToday } from '../components/DesignSystem';
import { api } from '../lib/api';
import { useLang } from '../hooks/useLang';

function subtractDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function tonnes(kg) {
  if (kg == null) return '-';
  return (Number(kg) / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function JettyBalanceCard({ label, hauled, barged, hauledLabel = 'Hauled' }) {
  const balance = (hauled ?? 0) - (barged ?? 0);
  return (
    <div className="card" style={{ flex: 1, minWidth: 0 }}>
      <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="between">
          <span className="muted" style={{ fontSize: 12 }}>{hauledLabel}</span>
          <span style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 13 }}>{tonnes(hauled)} t</span>
        </div>
        <div className="between">
          <span className="muted" style={{ fontSize: 12 }}>Barged</span>
          <span style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 13 }}>{tonnes(barged)} t</span>
        </div>
        <div className="between" style={{ paddingTop: 6, borderTop: '1px solid var(--border)', marginTop: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 800 }}>Balance</span>
          <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 15, color: balance < 0 ? 'var(--danger)' : 'var(--accent)' }}>
            {tonnes(balance)} t
          </span>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ from, to, jetty }) {
  const { t } = useLang();
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div className="muted" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{t('analyticsHauled')}</div>
          <div style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 20, marginTop: 4 }}>{tonnes(hauling.total_netto_kg)}</div>
          <div className="muted" style={{ fontSize: 11 }}>{t('analyticsTonnes')} · {hauling.total_trips} {t('analyticsTripsCount')}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div className="muted" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{t('analyticsBarged')}</div>
          <div style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 20, marginTop: 4 }}>{tonnes(barge.total_qty_kg)}</div>
          <div className="muted" style={{ fontSize: 11 }}>{t('analyticsTonnes')} · {barge.total_loadings} {t('analyticsLoadings')}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--accent-subtle, #f0fdf4)' }}>
          <div className="muted" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{t('analyticsBalance')}</div>
          <div style={{ fontFamily: 'var(--font-num)', fontWeight: 800, fontSize: 20, marginTop: 4, color: balance.total_kg < 0 ? 'var(--danger)' : 'var(--accent)' }}>
            {tonnes(balance.total_kg)}
          </div>
          <div className="muted" style={{ fontSize: 11 }}>{t('analyticsTonnes')}</div>
        </div>
      </div>

      {/* Per-jetty breakdown */}
      <div className="section-label">{t('analyticsPerJetty')}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <JettyBalanceCard
          label={`Talenta (${t('analyticsNettoSite')})`}
          hauledLabel={t('analyticsNettoSite')}
          hauled={hauling.by_jetty.talenta?.netto_kg}
          barged={barge.by_jetty.talenta?.qty_kg}
        />
        <JettyBalanceCard
          label={`Talenta (${t('analyticsNettoJetty')})`}
          hauledLabel={t('analyticsNettoJetty')}
          hauled={hauling.by_jetty.talenta?.netto_jetty_kg}
          barged={barge.by_jetty.talenta?.qty_kg}
        />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <JettyBalanceCard
          label="Hasnur"
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
                  <th style={{ padding: '6px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--muted)' }}>{t('analyticsNet')}</th>
                </tr>
              </thead>
              <tbody>
                {hauling.by_date.map((d) => (
                  <tr key={d.date} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 14px', fontFamily: 'var(--font-num)' }}>{d.date}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)' }}>{d.trips}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)', fontWeight: 700 }}>{tonnes(d.netto_kg)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)' }}>
                  <td style={{ padding: '8px 14px', fontWeight: 800 }}>{t('analyticsTotal')}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)', fontWeight: 800 }}>{hauling.total_trips}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)', fontWeight: 800 }}>{tonnes(hauling.total_netto_kg)}</td>
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
              <div style={{ fontWeight: 700, fontSize: 13 }}>Deviasi &gt; 0.5%</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {devCount} dari {deviation.eligible} pengiriman dengan data jetty
              </div>
            </div>
            {devCount > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm no-print"
                onClick={() => window.print()}
                title="Print"
              >
                <I.download width="15" height="15" /> Print
              </button>
            )}
          </div>
          <div className="print-only" style={{ display: 'none', padding: '8px 14px 4px' }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Laporan Deviasi &gt; 0.5%</div>
            <div style={{ fontSize: 12, color: '#666' }}>
              Periode: {from} s/d {to}{jetty ? ` · Jetty: ${jetty}` : ''} · {devCount} dari {deviation.eligible} pengiriman
            </div>
          </div>
          {devCount === 0 ? (
            <div className="muted" style={{ padding: '12px 14px', fontSize: 13 }}>Tidak ada pelanggaran.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '6px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 700 }}>Truk</th>
                    <th style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 700 }}>Netto Site</th>
                    <th style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 700 }}>Netto Jetty</th>
                    <th style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 700 }}>Deviasi</th>
                  </tr>
                </thead>
                <tbody>
                  {deviation.breaches.map((t) => (
                    <tr key={t.trip_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 14px' }}>
                        <div style={{ fontWeight: 700 }}>{t.no_lambung}</div>
                        <div className="muted" style={{ fontSize: 11 }}>#{t.no_tiket} · {t.date} · {JETTY[t.jetty_destination]}</div>
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)' }}>{kg(t.netto_site_kg)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)' }}>{kg(t.netto_jetty_kg)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, color: 'var(--danger)' }}>
                          {t.deviation_pct}%
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
          <div style={{ padding: '12px 14px 8px' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>SLA Transit &gt; 4 jam (CP2→CP3)</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {sla2Count} dari {sla_cp2_cp3.eligible} pengiriman dengan data jetty
            </div>
          </div>
          {sla2Count === 0 ? (
            <div className="muted" style={{ padding: '12px 14px', fontSize: 13 }}>
              {sla_cp2_cp3.eligible === 0
                ? 'Belum ada data jetty (CP3). Akan terisi saat pengiriman selesai dicatat di jetty.'
                : 'Tidak ada pelanggaran.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '6px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 700 }}>Truk</th>
                    <th style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 700 }}>Keluar Site</th>
                    <th style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 700 }}>Tiba Jetty</th>
                    <th style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 700 }}>Durasi</th>
                  </tr>
                </thead>
                <tbody>
                  {sla_cp2_cp3.breaches.map((t) => (
                    <tr key={t.trip_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 14px' }}>
                        <div style={{ fontWeight: 700 }}>{t.no_lambung}</div>
                        <div className="muted" style={{ fontSize: 11 }}>#{t.no_tiket} · {t.date} · {JETTY[t.jetty_destination]}</div>
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)' }}>{toWITA(t.cp2_timestamp)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-num)' }}>{toWITA(t.cp3_timestamp)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, color: '#b45309' }}>
                          {t.hours_cp2_cp3} jam
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

export default function AnalyticsPage({ embedded = false }) {
  const { t } = useLang();
  const today = witaToday();
  const [tab, setTab]     = useState('overview');
  const [from, setFrom]   = useState(subtractDays(today, 30));
  const [to, setTo]       = useState(today);
  const [jetty, setJetty] = useState('');

  const titles = { overview: t('analyticsOverview'), monitoring: t('analyticsMonitoring') };
  const tabs = [
    { key: 'overview',   label: t('analyticsOverview'),   icon: I.chart },
    { key: 'monitoring', label: t('analyticsMonitoring'), icon: I.warning },
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

  const filters = (
    <div className="card" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {filterFields}
      </div>
    </div>
  );

  const content = (
    <div className="stack" style={{ gap: 14 }}>
      {!embedded && filters}
      {embedded && (
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {filterFields}
            <div style={{ display: 'flex', gap: 6 }}>
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
      {tab === 'overview'   && <OverviewTab   from={from} to={to} jetty={jetty} />}
      {tab === 'monitoring' && <MonitoringTab from={from} to={to} jetty={jetty} />}
    </div>
  );

  if (embedded) return content;

  return (
    <Layout
      title={titles[tab]}
      footer={<BottomTabs tabs={tabs} active={tab} onChange={setTab} />}
    >
      {content}
    </Layout>
  );
}
