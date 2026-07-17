import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import {
  Field,
  I,
  IconButton,
  StatCard,
  SortTh,
  StatusPill,
  kg,
  fmtWeight,
  toWITA,
  witaToday,
} from '../components/DesignSystem';
import { api } from '../lib/api';
import { useSortFilter } from '../lib/useSortFilter';
import { useLang } from '../hooks/useLang';
import { useUnit } from '../hooks/useUnit';

function subtractDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function EditCell({ value, type = 'text', options, onSave, locked = false }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');
  const { unit } = useUnit();

  function commit(nextValue = val) {
    setEditing(false);
    if (String(nextValue) !== String(value ?? '')) {
      if (type === 'number') {
        onSave(parseInt(nextValue, 10));
      } else if (type === 'datetime-local') {
        onSave(nextValue);
      } else {
        onSave(nextValue);
      }
    }
  }

  useEffect(() => {
    if (!editing) {
      if (type === 'datetime-local' && value) {
        const dt = new Date(value);
        const localStr = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setVal(localStr);
      } else {
        setVal(value ?? '');
      }
    }
  }, [value, editing, type]);

  if (options) {
    if (locked) return <span>{options.find((o) => o.value === value)?.label ?? value ?? '-'}</span>;
    return editing ? (
      <select
        className="inline-edit"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => commit()}
        autoFocus
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ) : (
      <span className="editable-cell" onDoubleClick={() => { setVal(value ?? ''); setEditing(true); }} title="Edit">
        {options.find((o) => o.value === value)?.label ?? value ?? '-'}
      </span>
    );
  }

  if (locked) {
    if (type === 'datetime-local' && value) {
      return <span>{toWITA(value)}</span>;
    }
    return <span>{value != null ? (type === 'number' ? fmtWeight(value, unit) : value) : '-'}</span>;
  }

  return editing ? (
    <input
      type={type}
      className="inline-edit"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setEditing(false);
      }}
      autoFocus
    />
  ) : (
    <span className="editable-cell" onDoubleClick={() => {
      if (type === 'datetime-local' && value) {
        const dt = new Date(value);
        const localStr = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setVal(localStr);
      } else {
        setVal(value ?? '');
      }
      setEditing(true);
    }} title="Edit">
      {value != null ? (type === 'datetime-local' ? toWITA(value) : type === 'number' ? fmtWeight(value, unit) : value) : '-'}
    </span>
  );
}

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

function ChangelogModal({ onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    api.listAudit({ limit: 200 }).then(setLogs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => filter === 'all' ? logs : logs.filter(l => l.action === filter),
    [logs, filter]
  );

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) { setShowFilter(false); } }}>
      <div className="modal-panel" style={{ maxWidth: 900 }}>
        <div className="modal-head">
          <div>
            <div className="section-label">Audit</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>Changelog</div>
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
            <IconButton label="Tutup" onClick={onClose}>
              <I.close width="18" height="18" />
            </IconButton>
          </div>
        </div>
        <div className="modal-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="empty-state"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>No audit entries.</div>
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
      </div>
    </div>
  );
}

function UserModal({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState('stockpile_operator');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function createUser() {
    setError('');
    setCreating(true);
    try {
      const u = await api.createUser({ email: newEmail, password: newPass, role: newRole });
      setUsers((prev) => [...prev, u]);
      setNewEmail('');
      setNewPass('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    await api.deleteUser(id).catch(() => {});
    setUsers((prev) => prev.filter((u) => u.user_id !== id));
  }

  const ROLE_LABELS = {
    stockpile_operator:  'Site Operator',
    jetty_operator:      'Jetty Operator',
    admin:               'Admin',
    analytics:           'Analytics',
    site_jetty_operator: 'Site & Jetty',
    supervisor:          'Supervisor',
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="modal-head">
          <div>
            <div className="section-label">Admin</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>User Management</div>
          </div>
          <IconButton label="Tutup" onClick={onClose}>
            <I.close width="18" height="18" />
          </IconButton>
        </div>
        <div className="modal-body">
          <div className="card stack" style={{ gap: 12 }}>
            <div className="section-label">Create User</div>
            <Field label="Username">
              <input type="text" className="input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </Field>
            <Field label="Password">
              <input type="password" className="input" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
            </Field>
            <Field label="Role">
              <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="stockpile_operator">Site Operator</option>
                <option value="jetty_operator">Jetty Operator</option>
                <option value="admin">Admin</option>
                <option value="analytics">Analytics</option>
                <option value="site_jetty_operator">Site &amp; Jetty</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </Field>
            {error && <div className="alert">{error}</div>}
            <button onClick={createUser} disabled={creating || !newEmail || !newPass} className="btn btn-brand">
              {creating ? <Spinner className="h-4 w-4" /> : 'Create User'}
            </button>
          </div>

          <div className="card flush">
            <div className="list-head">
              <div>
                <div className="lh-title">Existing Users</div>
                <div className="lh-sub">{users.length} accounts</div>
              </div>
            </div>
            {loading ? (
              <div className="empty-state"><Spinner /></div>
            ) : (
              users.map((u) => (
                <div key={u.user_id} className="trip-row">
                  <div className="tr-top">
                    <div>
                      <div className="tr-lambung" style={{ fontSize: 15 }}>{u.email}</div>
                      <div className="tr-sub">{ROLE_LABELS[u.role] ?? u.role}</div>
                    </div>
                    <button onClick={() => deleteUser(u.user_id)} className="btn btn-danger btn-sm" style={{ width: 'auto', padding: '0 12px' }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { t } = useLang();
  const { unit } = useUnit();
  const fw = (n) => fmtWeight(n, unit);
  const today = witaToday();
  const [filters, setFilters] = useState({ from: today, to: today, jetty: '', status: '' });
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [bargeDayTotal, setBargeDayTotal] = useState(0);
  const [cumulativeBargeTotal, setCumulativeBargeTotal] = useState(0);
  const [cumulativeNettoJetty, setCumulativeNettoJetty] = useState(0);
  const [tableFullscreen, setTableFullscreen] = useState(false);

  const SEARCH_FIELDS = useMemo(() => ['no_lambung', 'no_tiket', 'jetty_destination', 'coal_quality', 'status', 'cuaca_mmi'], []);
  const { result: displayTrips, sortKey, sortDir, toggleSort, search, setSearch } = useSortFilter(trips, SEARCH_FIELDS);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.from)   params.date_from = filters.from;
      if (filters.to)     params.date_to   = filters.to;
      if (filters.jetty)  params.jetty     = filters.jetty;
      if (filters.status) params.status    = filters.status;
      setTrips(await api.listTrips(params));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const jetty = filters.jetty;
    const from  = filters.from;
    const to    = filters.to;

    const dayBargeParams  = { ...(jetty && { jetty }), ...(from && { from }), ...(to && { to }) };
    const cumBargeParams  = { ...(jetty && { jetty }), ...(to && { to }) };
    const cumTripParams   = { status: 'completed', ...(jetty && { jetty }), ...(to && { date_to: to }) };

    Promise.all([
      api.listBargeLoadings(dayBargeParams),
      api.listBargeLoadings(cumBargeParams),
      api.listTrips(cumTripParams),
    ]).then(([dayRows, cumBargeRows, tripRows]) => {
      setBargeDayTotal(dayRows.reduce((s, r) => s + (Number(r.loading_qty_kg) || 0), 0));
      setCumulativeBargeTotal(cumBargeRows.reduce((s, r) => s + (Number(r.loading_qty_kg) || 0), 0));
      setCumulativeNettoJetty(tripRows.reduce((s, r) => s + (Number(r.netto_site_kg) || 0), 0));
    }).catch(() => {});
  }, [filters.from, filters.to, filters.jetty]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  async function handleExport() {
    if (!filters.from || !filters.to) {
      alert('Please select a date range to export');
      return;
    }
    setExportLoading(true);
    try {
      const blob = await api.exportTrips(filters.from, filters.to, filters.jetty);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trips_${filters.from}_${filters.to}_${filters.jetty || 'all'}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  }

  async function handleFieldUpdate(tripId, field, value) {
    try {
      let updateValue = value;
      if (field.endsWith('_timestamp') && value) {
        const localDate = new Date(`${value}:00`);
        updateValue = localDate.toISOString();
      }
      const updated = await api.updateTrip(tripId, { [field]: updateValue });
      setTrips((prev) => prev.map((t) => (t.trip_id === tripId ? updated : t)));
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  }

  async function handleLockToggle(tripId) {
    try {
      const updated = await api.lockTrip(tripId);
      setTrips((prev) => prev.map((t) => (t.trip_id === tripId ? updated : t)));
    } catch (err) {
      alert(`Lock failed: ${err.message}`);
    }
  }

  async function handleDeleteTrip(tripId, noLambung, noTiket) {
    if (!confirm(`Delete trip #${noTiket} (${noLambung})? This cannot be undone.`)) return;
    try {
      await api.deleteTrip(tripId);
      setTrips((prev) => prev.filter((t) => t.trip_id !== tripId));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  const [showAddTrip, setShowAddTrip] = useState(false);
  const [addForm, setAddForm] = useState({ no_lambung: '', jetty_destination: 'hasnur', coal_quality: 'raw', cuaca_mmi: '', tare_site_kg: '' });
  const [addLoading, setAddLoading] = useState(false);

  async function handleAddTrip(e) {
    e.preventDefault();
    setAddLoading(true);
    try {
      const trip = await api.createTrip({
        ...addForm,
        tare_site_kg: parseInt(addForm.tare_site_kg, 10),
      });
      setTrips((prev) => [trip, ...prev]);
      setAddForm({ no_lambung: '', jetty_destination: 'hasnur', coal_quality: 'raw', cuaca_mmi: '', tare_site_kg: '' });
      setShowAddTrip(false);
    } catch (err) {
      alert(`Add trip failed: ${err.message}`);
    } finally {
      setAddLoading(false);
    }
  }

  const JETTY_OPTS = [{ value: 'hasnur', label: 'Hasnur' }, { value: 'talenta', label: 'Talenta' }];
  const QUALITY_OPTS = [{ value: 'raw', label: 'Raw' }, { value: 'clean', label: 'Clean' }, { value: 'premium', label: 'Premium' }, { value: 'standard', label: 'Standard' }];
  const STATUS_OPTS = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'arrived_jetty', label: 'Arrived at Jetty' },
    { value: 'completed', label: 'Completed' },
  ];

  const totals = trips.reduce((acc, t) => ({
    grossSite: acc.grossSite + (t.gross_site_kg || 0),
    nettoSite: acc.nettoSite + (t.netto_site_kg || 0),
    grossJetty: acc.grossJetty + (t.gross_jetty_kg || 0),
    nettoJetty: acc.nettoJetty + (t.netto_jetty_kg || 0),
  }), { grossSite: 0, nettoSite: 0, grossJetty: 0, nettoJetty: 0 });

  return (
    <Layout title="Admin Dashboard" kicker="MergeCoal" wide>
      {showUsers && <UserModal onClose={() => setShowUsers(false)} />}
      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}

      <div className="admin-actions">
        <button onClick={() => setShowUsers(true)} className="btn btn-ghost">
          <I.users width="18" height="18" />
          {t('navUsers')}
        </button>
        <button onClick={() => setShowChangelog(true)} className="btn btn-ghost">
          <I.refresh width="18" height="18" />
          Changelog
        </button>
        <a href="/sessions" className="btn btn-ghost">
          <I.shield width="18" height="18" />
          Sessions
        </a>
        <a href="/analytics" className="btn btn-ghost">
          <I.chart width="18" height="18" />
          {t('navAnalytics')}
        </a>
        <a href="/stockpile" className="btn btn-ghost">
          <I.truck width="18" height="18" />
          {t('navStockpile')}
        </a>
        <a href="/jetty" className="btn btn-ghost">
          <I.anchor width="18" height="18" />
          {t('navJetty')}
        </a>
        <button onClick={handleExport} disabled={exportLoading || !filters.from || !filters.to} className="btn btn-brand" style={{ marginLeft: 'auto' }}>
          {exportLoading ? <Spinner className="h-4 w-4" /> : <I.download width="18" height="18" />}
          {t('navExport')}
        </button>
      </div>

      <div className="card stack" style={{ gap: 12 }}>
        <div className="section-label">{t('filters')}</div>
        <div className="filter-grid">
          <Field label={t('analyticsFrom')}>
            <input type="date" className="input" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
          </Field>
          <Field label={t('analyticsTo')}>
            <input type="date" className="input" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
          </Field>
          <Field label={t('filterJetty')}>
            <select className="input" value={filters.jetty} onChange={(e) => setFilters((f) => ({ ...f, jetty: e.target.value }))}>
              <option value="">{t('allJettys')}</option>
              <option value="hasnur">Hasnur</option>
              <option value="talenta">Talenta</option>
            </select>
          </Field>
          <Field label={t('filterStatus')}>
            <select className="input" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="">{t('allStatuses')}</option>
              <option value="pending">{t('statusPending')}</option>
              <option value="in_transit">{t('statusInTransit')}</option>
              <option value="completed">{t('statusCompleted')}</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="card stack" style={{ gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="section-label">Add Trip</div>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowAddTrip((v) => !v)}>
            {showAddTrip ? 'Cancel' : '+ Add Trip'}
          </button>
        </div>
        {showAddTrip && (
          <form onSubmit={handleAddTrip} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <Field label="Truck No.">
              <input className="input" required value={addForm.no_lambung} onChange={(e) => setAddForm((f) => ({ ...f, no_lambung: e.target.value }))} placeholder="e.g. B1234XY" />
            </Field>
            <Field label="Jetty">
              <select className="input" value={addForm.jetty_destination} onChange={(e) => setAddForm((f) => ({ ...f, jetty_destination: e.target.value }))}>
                <option value="hasnur">Hasnur</option>
                <option value="talenta">Talenta</option>
              </select>
            </Field>
            <Field label="Coal Quality">
              <select className="input" value={addForm.coal_quality} onChange={(e) => setAddForm((f) => ({ ...f, coal_quality: e.target.value }))}>
                <option value="raw">Raw</option>
                <option value="clean">Clean</option>
                <option value="premium">Premium</option>
                <option value="standard">Standard</option>
              </select>
            </Field>
            <Field label="Cuaca MMI">
              <input className="input" required value={addForm.cuaca_mmi} onChange={(e) => setAddForm((f) => ({ ...f, cuaca_mmi: e.target.value }))} placeholder="e.g. Cerah" />
            </Field>
            <Field label="Tare Site (kg)">
              <input className="input" type="number" required min="1" value={addForm.tare_site_kg} onChange={(e) => setAddForm((f) => ({ ...f, tare_site_kg: e.target.value }))} placeholder="e.g. 18000" />
            </Field>
            <Field label=" ">
              <button type="submit" className="btn btn-brand" disabled={addLoading} style={{ width: '100%' }}>
                {addLoading ? <Spinner className="h-4 w-4" /> : 'Add Trip'}
              </button>
            </Field>
          </form>
        )}
      </div>

      <div className="totals-grid">
        <StatCard label={t('grossSite')} value={totals.grossSite} />
        <StatCard label={t('nettoSite')} value={totals.nettoSite} accent />
        <StatCard label={t('grossJetty')} value={totals.grossJetty} />
        <StatCard label={t('nettoJetty')} value={totals.nettoJetty} accent />
        <StatCard label={t('bargeLoading')} value={bargeDayTotal} />
        <StatCard label={t('endingCoalBalance')} value={cumulativeNettoJetty - cumulativeBargeTotal} accent />
      </div>

      <div className={tableFullscreen ? 'table-fullscreen-overlay' : 'card flush'}>
        <div className="list-head">
          <div>
            <div className="lh-title">{t('trips')}</div>
            <div className="lh-sub">{displayTrips.length} {t('of')} {trips.length} {t('records')}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="input"
              style={{ width: 200, height: 32, fontSize: 13 }}
              placeholder={t('searchTrucks')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <IconButton className="icon-muted" label={t('refresh')} onClick={fetchTrips}>
              <I.refresh width="18" height="18" />
            </IconButton>
            <IconButton className="icon-muted" label={exportLoading ? 'Exporting…' : t('navExport')} onClick={handleExport} disabled={exportLoading || !filters.from || !filters.to}>
              {exportLoading ? <Spinner className="h-4 w-4" /> : <I.download width="18" height="18" />}
            </IconButton>
            <IconButton className="icon-muted" label={tableFullscreen ? t('exitFullscreen') : t('fullscreen')} onClick={() => setTableFullscreen((v) => !v)}>
              {tableFullscreen ? <I.compress width="18" height="18" /> : <I.expand width="18" height="18" />}
            </IconButton>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><Spinner className="h-8 w-8" /></div>
        ) : trips.length === 0 ? (
          <div className="empty-state">{t('noTrips')}</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {[
                    { label: t('colNo'),         key: 'no_tiket' },
                    { label: t('colTruck'),      key: 'no_lambung' },
                    { label: t('colJetty'),      key: 'jetty_destination' },
                    { label: t('colStatus'),     key: 'status' },
                    { label: t('colCoal'),       key: 'coal_quality' },
                    { label: t('colWeather'),    key: 'cuaca_mmi' },
                    { label: t('colTareSite'),   key: 'tare_site_kg' },
                    { label: t('colGrossSite'),  key: 'gross_site_kg' },
                    { label: t('colNettoSite'),  key: 'netto_site_kg' },
                    { label: t('colCP1'),        key: 'cp1_timestamp' },
                    { label: t('colGrossJetty'), key: 'gross_jetty_kg' },
                    { label: t('colTareJetty'),  key: 'tare_jetty_kg' },
                    { label: t('colNettoJetty'), key: 'netto_jetty_kg' },
                    { label: t('colCompGross'),  key: 'compare_gross_kg' },
                    { label: t('colDeviasi'),    key: 'deviasi_kg' },
                    { label: t('colAdjustment'), key: 'adjustment_kg' },
                    { label: t('colCP2'),        key: 'cp2_timestamp' },
                    { label: t('colCP3'),        key: 'cp3_timestamp' },
                  ].map(({ label, key }) => (
                    <SortTh key={key} label={label} sortKey={key} active={sortKey === key} dir={sortDir} onSort={toggleSort} />
                  ))}
                  <th style={{ textAlign: 'center', width: 48 }}>Lock</th>
                  <th style={{ textAlign: 'center', width: 48 }}>Del</th>
                </tr>
              </thead>
              <tbody>
                {displayTrips.map((t) => {
                  const locked = !!t.is_locked;
                  return (
                  <tr key={t.trip_id} className={locked ? 'trip-row--locked' : ''}>
                    <td><EditCell value={t.no_tiket} type="number" locked={locked} onSave={(v) => handleFieldUpdate(t.trip_id, 'no_tiket', v)} /></td>
                    <td style={{ fontWeight: 800 }}><EditCell value={t.no_lambung} locked={locked} onSave={(v) => handleFieldUpdate(t.trip_id, 'no_lambung', v)} /></td>
                    <td><EditCell value={t.jetty_destination} options={JETTY_OPTS} locked={locked} onSave={(v) => handleFieldUpdate(t.trip_id, 'jetty_destination', v)} /></td>
                    <td>
                      <span onDoubleClick={() => {}}>
                        <StatusPill status={t.status} short />
                      </span>
                      <div style={{ marginTop: 4 }}>
                        <EditCell value={t.status} options={STATUS_OPTS} locked={locked} onSave={(v) => handleFieldUpdate(t.trip_id, 'status', v)} />
                      </div>
                    </td>
                    <td><EditCell value={t.coal_quality} options={QUALITY_OPTS} locked={locked} onSave={(v) => handleFieldUpdate(t.trip_id, 'coal_quality', v)} /></td>
                    <td><EditCell value={t.cuaca_mmi} locked={locked} onSave={(v) => handleFieldUpdate(t.trip_id, 'cuaca_mmi', v)} /></td>
                    <td style={{ textAlign: 'right' }}><EditCell value={t.tare_site_kg} type="number" locked={locked} onSave={(v) => handleFieldUpdate(t.trip_id, 'tare_site_kg', v)} /></td>
                    <td style={{ textAlign: 'right' }}><EditCell value={t.gross_site_kg} type="number" locked={locked} onSave={(v) => handleFieldUpdate(t.trip_id, 'gross_site_kg', v)} /></td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--st-done-fg)' }}><EditCell value={t.netto_site_kg} type="number" locked={locked} onSave={(v) => handleFieldUpdate(t.trip_id, 'netto_site_kg', v)} /></td>
                    <td><EditCell value={t.cp1_timestamp} type="datetime-local" locked={locked} onSave={(v) => handleFieldUpdate(t.trip_id, 'cp1_timestamp', v)} /></td>
                    <td style={{ textAlign: 'right' }}><EditCell value={t.gross_jetty_kg} type="number" locked={locked} onSave={(v) => handleFieldUpdate(t.trip_id, 'gross_jetty_kg', v)} /></td>
                    <td style={{ textAlign: 'right' }}><EditCell value={t.tare_jetty_kg} type="number" locked={locked} onSave={(v) => handleFieldUpdate(t.trip_id, 'tare_jetty_kg', v)} /></td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--brand)' }}>{fw(t.netto_jetty_kg)}</td>
                    <td style={{ textAlign: 'right' }}>{fw(t.compare_gross_kg)}</td>
                    <td style={{ textAlign: 'right', color: t.deviasi_kg < 0 ? 'var(--danger)' : 'var(--text)' }}>{fw(t.deviasi_kg)}</td>
                    <td style={{ textAlign: 'right' }}><EditCell value={t.adjustment_kg ?? 0} type="number" locked={locked} onSave={(v) => handleFieldUpdate(t.trip_id, 'adjustment_kg', v)} /></td>
                    <td><EditCell value={t.cp2_timestamp} type="datetime-local" locked={locked} onSave={(v) => handleFieldUpdate(t.trip_id, 'cp2_timestamp', v)} /></td>
                    <td><EditCell value={t.cp3_timestamp} type="datetime-local" locked={locked} onSave={(v) => handleFieldUpdate(t.trip_id, 'cp3_timestamp', v)} /></td>
                    <td style={{ textAlign: 'center' }}>
                      <IconButton
                        label={locked ? 'Unlock trip' : 'Lock trip'}
                        onClick={() => handleLockToggle(t.trip_id)}
                        style={{ color: locked ? 'var(--brand)' : 'var(--text-muted)' }}
                      >
                        <I.shield width="16" height="16" />
                      </IconButton>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <IconButton
                        label="Delete trip"
                        onClick={() => handleDeleteTrip(t.trip_id, t.no_lambung, t.no_tiket)}
                        style={{ color: locked ? 'var(--text-muted)' : 'var(--danger)' }}
                        disabled={locked}
                      >
                        <I.close width="16" height="16" />
                      </IconButton>
                    </td>
                  </tr>
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
