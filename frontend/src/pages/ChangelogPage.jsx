import { useState, useEffect, useMemo, Fragment } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { I, IconButton } from '../components/DesignSystem';
import { api } from '../lib/api';

const ACTION_META = {
  cp1_entry:   { label: 'CP1 — Arrived at site',  cls: 'badge-blue' },
  cp2_entry:   { label: 'CP2 — Departed site',    cls: 'badge-yellow' },
  cp3_entry:   { label: 'CP3 — Arrived at jetty', cls: 'badge-green' },
  edit_trip:   { label: 'Trip edited',             cls: 'badge-gray' },
  delete_trip: { label: 'Trip deleted',            cls: 'badge-red' },
};

const FILTER_OPTIONS = [
  { value: 'all',         label: 'All' },
  { value: 'cp1_entry',  label: 'CP1' },
  { value: 'cp2_entry',  label: 'CP2' },
  { value: 'cp3_entry',  label: 'CP3' },
  { value: 'edit_trip',  label: 'Edited' },
  { value: 'delete_trip', label: 'Deleted' },
];

function auditFmt(ts) {
  if (!ts) return '-';
  return new Date(new Date(ts).getTime() + 8 * 60 * 60 * 1000)
    .toISOString().replace('T', ' ').slice(0, 16) + ' WITA';
}

function auditTruck(log) {
  const d = log.new_data ?? log.old_data;
  return d?.no_lambung ?? '—';
}

function auditWeight(log) {
  const d = log.new_data ?? log.old_data;
  if (!d) return null;
  const kgVal = log.action === 'cp3_entry' ? d.netto_jetty_kg
              : log.action === 'cp2_entry' ? d.netto_site_kg
              : log.action === 'cp1_entry' ? d.tare_site_kg
              : null;
  return kgVal != null ? (kgVal / 1000).toFixed(2) + ' t' : null;
}

const AUDIT_SKIP = new Set(['trip_id', 'created_at', 'updated_at']);

function AuditDiff({ old_data, new_data }) {
  if (!old_data || !new_data) return <p className="audit-empty">No diff available.</p>;
  const changed = Object.keys(new_data).filter(
    k => !AUDIT_SKIP.has(k) && JSON.stringify(new_data[k]) !== JSON.stringify(old_data[k])
  );
  if (changed.length === 0) return <p className="audit-empty">No fields changed.</p>;
  return (
    <table className="audit-diff-table">
      <thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead>
      <tbody>
        {changed.map(k => (
          <tr key={k}>
            <td className="adf-field">{k}</td>
            <td className="adf-before">{String(old_data[k] ?? '—')}</td>
            <td className="adf-after">{String(new_data[k] ?? '—')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AuditSummary({ data, action }) {
  if (!data) return null;
  const t = (kg) => kg != null ? (kg / 1000).toFixed(2) + ' t' : null;
  const rows =
    action === 'cp1_entry' ? [
      ['Truck', data.no_lambung], ['Ticket', data.no_tiket], ['Driver', data.driver_name],
      ['Gross', t(data.gross_site_kg)], ['Tare', t(data.tare_site_kg)],
    ] : action === 'cp2_entry' ? [
      ['Truck', data.no_lambung], ['Gross', t(data.gross_site_kg)],
      ['Tare', t(data.tare_site_kg)], ['Netto', t(data.netto_site_kg)],
    ] : action === 'cp3_entry' ? [
      ['Truck', data.no_lambung], ['Netto Site', t(data.netto_site_kg)],
      ['Netto Jetty', t(data.netto_jetty_kg)], ['Deviasi', t(data.deviasi_kg)],
    ] : action === 'delete_trip' ? [
      ['Truck', data.no_lambung], ['Ticket', data.no_tiket], ['Status', data.status],
    ] : [];
  return (
    <div className="audit-summary">
      {rows.filter(([, v]) => v != null).map(([label, value]) => (
        <div key={label} className="audit-summary-item">
          <span className="section-label" style={{ fontSize: 10 }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ChangelogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showFilter, setShowFilter] = useState(false);

  function load() {
    setLoading(true);
    api.listAudit({ limit: 200 }).then(setLogs).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(load, []);

  const filtered = useMemo(
    () => filter === 'all' ? logs : logs.filter(l => l.action === filter),
    [logs, filter]
  );

  return (
    <Layout title="Changelog" kicker="Audit Log">
      <div className="card flush">
        <div className="list-head">
          <div>
            <div className="lh-title">Changelog</div>
            <div className="lh-sub">{filtered.length} entries</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <IconButton label="Filter" onClick={() => setShowFilter(v => !v)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              </IconButton>
              {showFilter && (
                <div className="audit-filter-dropdown">
                  {FILTER_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      className={`audit-filter-opt${filter === o.value ? ' active' : ''}`}
                      onClick={() => { setFilter(o.value); setShowFilter(false); }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <IconButton label="Refresh" onClick={load}>
              <I.refresh width="18" height="18" />
            </IconButton>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><Spinner className="h-8 w-8" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No audit entries.</div>
        ) : (
          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th style={{ width: 28 }}></th>
                  <th>Action</th>
                  <th>Truck</th>
                  <th>Weight</th>
                  <th>User</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const meta = ACTION_META[log.action] ?? { label: log.action, cls: 'badge-gray' };
                  const isOpen = expanded === log.id;
                  return (
                    <Fragment key={log.id}>
                      <tr
                        className={`audit-row${isOpen ? ' open' : ''}`}
                        onClick={() => setExpanded(isOpen ? null : log.id)}
                      >
                        <td className="audit-chev">
                          <I.arrowLeft width="12" height="12" style={{ transform: isOpen ? 'rotate(-90deg)' : 'rotate(180deg)', transition: '.18s', color: 'var(--muted)' }} />
                        </td>
                        <td><span className={`audit-badge ${meta.cls}`}>{meta.label}</span></td>
                        <td className="audit-truck">{auditTruck(log)}</td>
                        <td className="audit-weight">{auditWeight(log) ?? '—'}</td>
                        <td className="audit-user">{log.user_email}</td>
                        <td className="audit-time">{auditFmt(log.created_at)}</td>
                      </tr>
                      {isOpen && (
                        <tr className="audit-detail">
                          <td colSpan={6}>
                            {log.action === 'edit_trip'
                              ? <AuditDiff old_data={log.old_data} new_data={log.new_data} />
                              : <AuditSummary data={log.new_data ?? log.old_data} action={log.action} />
                            }
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
