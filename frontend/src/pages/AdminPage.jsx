import { useState, useEffect, useCallback, useMemo } from 'react';
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
  toWITA,
  witaToday,
} from '../components/DesignSystem';
import { api } from '../lib/api';
import { useSortFilter } from '../lib/useSortFilter';

function EditCell({ value, type = 'text', options, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');

  function commit(nextValue = val) {
    setEditing(false);
    if (String(nextValue) !== String(value ?? '')) {
      onSave(type === 'number' ? parseInt(nextValue, 10) : nextValue);
    }
  }

  useEffect(() => {
    if (!editing) setVal(value ?? '');
  }, [value, editing]);

  if (options) {
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
    <span className="editable-cell" onDoubleClick={() => { setVal(value ?? ''); setEditing(true); }} title="Edit">
      {value != null ? (type === 'number' ? kg(value) : value) : '-'}
    </span>
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
    stockpile_operator: 'Stockpile Operator',
    jetty_operator: 'Jetty Operator',
    admin: 'Admin',
    analytics: 'Analytics',
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
                <option value="stockpile_operator">Stockpile Operator</option>
                <option value="jetty_operator">Jetty Operator</option>
                <option value="admin">Admin</option>
                <option value="analytics">Analytics</option>
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
  const [filters, setFilters] = useState({ date: witaToday(), jetty: '', status: '' });
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
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
      if (filters.date) params.date = filters.date;
      if (filters.jetty) params.jetty = filters.jetty;
      if (filters.status) params.status = filters.status;
      setTrips(await api.listTrips(params));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const jetty = filters.jetty;
    const date  = filters.date;

    const dayBargeParams  = { ...(jetty && { jetty }), ...(date && { from: date, to: date }) };
    const cumBargeParams  = { ...(jetty && { jetty }), ...(date && { to: date }) };
    const cumTripParams   = { status: 'completed', ...(jetty && { jetty }), ...(date && { date_to: date }) };

    Promise.all([
      api.listBargeLoadings(dayBargeParams),
      api.listBargeLoadings(cumBargeParams),
      api.listTrips(cumTripParams),
    ]).then(([dayRows, cumBargeRows, tripRows]) => {
      setBargeDayTotal(dayRows.reduce((s, r) => s + (Number(r.loading_qty_kg) || 0), 0));
      setCumulativeBargeTotal(cumBargeRows.reduce((s, r) => s + (Number(r.loading_qty_kg) || 0), 0));
      setCumulativeNettoJetty(tripRows.reduce((s, r) => s + (Number(r.netto_site_kg) || 0), 0));
    }).catch(() => {});
  }, [filters.date, filters.jetty]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  async function handleExport() {
    if (!filters.date || !filters.jetty) {
      alert('Please select both a date and a jetty to export');
      return;
    }
    setExportLoading(true);
    try {
      const blob = await api.exportTrips(filters.date, filters.jetty);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trips_${filters.date}_${filters.jetty}.xlsx`;
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
      const updated = await api.updateTrip(tripId, { [field]: value });
      setTrips((prev) => prev.map((t) => (t.trip_id === tripId ? updated : t)));
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  }

  const JETTY_OPTS = [{ value: 'hasnur', label: 'Hasnur' }, { value: 'talenta', label: 'Talenta' }];
  const QUALITY_OPTS = [{ value: 'raw', label: 'Raw' }, { value: 'clean', label: 'Clean' }];
  const STATUS_OPTS = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_transit', label: 'In Transit' },
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

      <div className="admin-actions">
        <button onClick={() => setShowUsers(true)} className="btn btn-ghost">
          <I.users width="18" height="18" />
          Users
        </button>
        <a href="/analytics" className="btn btn-ghost">
          <I.chart width="18" height="18" />
          Analytics
        </a>
        <a href="/stockpile" className="btn btn-ghost">
          <I.truck width="18" height="18" />
          Stockpile
        </a>
        <a href="/jetty" className="btn btn-ghost">
          <I.anchor width="18" height="18" />
          Jetty
        </a>
        <button onClick={handleExport} disabled={exportLoading || !filters.date || !filters.jetty} className="btn btn-brand" style={{ marginLeft: 'auto' }}>
          {exportLoading ? <Spinner className="h-4 w-4" /> : <I.download width="18" height="18" />}
          Export .xlsx
        </button>
      </div>

      <div className="card stack" style={{ gap: 12 }}>
        <div className="section-label">Filters</div>
        <div className="filter-grid">
          <Field label="Date">
            <input type="date" className="input" value={filters.date} onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))} />
          </Field>
          <Field label="Jetty">
            <select className="input" value={filters.jetty} onChange={(e) => setFilters((f) => ({ ...f, jetty: e.target.value }))}>
              <option value="">All Jettys</option>
              <option value="hasnur">Hasnur</option>
              <option value="talenta">Talenta</option>
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_transit">In Transit</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="totals-grid">
        <StatCard label="Gross Site" value={totals.grossSite} />
        <StatCard label="Netto Site" value={totals.nettoSite} accent />
        <StatCard label="Gross Jetty" value={totals.grossJetty} />
        <StatCard label="Netto Jetty" value={totals.nettoJetty} accent />
        <StatCard label="Barge Loading" value={bargeDayTotal} />
        <StatCard label="Ending Coal Balance" value={cumulativeNettoJetty - cumulativeBargeTotal} accent />
      </div>

      <div className={tableFullscreen ? 'table-fullscreen-overlay' : 'card flush'}>
        <div className="list-head">
          <div>
            <div className="lh-title">Trips</div>
            <div className="lh-sub">{displayTrips.length} of {trips.length} records</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="input"
              style={{ width: 200, height: 32, fontSize: 13 }}
              placeholder="Search truck, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <IconButton className="icon-muted" label="Segarkan" onClick={fetchTrips}>
              <I.refresh width="18" height="18" />
            </IconButton>
            <IconButton className="icon-muted" label={tableFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={() => setTableFullscreen((v) => !v)}>
              {tableFullscreen ? <I.compress width="18" height="18" /> : <I.expand width="18" height="18" />}
            </IconButton>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><Spinner className="h-8 w-8" /></div>
        ) : trips.length === 0 ? (
          <div className="empty-state">No trips found</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {[
                    { label: '#',          key: 'no_tiket' },
                    { label: 'Truck',      key: 'no_lambung' },
                    { label: 'Jetty',      key: 'jetty_destination' },
                    { label: 'Status',     key: 'status' },
                    { label: 'Coal',       key: 'coal_quality' },
                    { label: 'Cuaca',      key: 'cuaca_mmi' },
                    { label: 'Tare Site',  key: 'tare_site_kg' },
                    { label: 'Gross Site', key: 'gross_site_kg' },
                    { label: 'Netto Site', key: 'netto_site_kg' },
                    { label: 'CP1',        key: 'cp1_timestamp' },
                    { label: 'Gross Jetty',key: 'gross_jetty_kg' },
                    { label: 'Netto Jetty',key: 'netto_jetty_kg' },
                    { label: 'Comp.Gross', key: 'compare_gross_kg' },
                    { label: 'Deviasi',    key: 'deviasi_kg' },
                    { label: 'Adjustment', key: 'adjustment_kg' },
                    { label: 'CP2',        key: 'cp2_timestamp' },
                    { label: 'CP3',        key: 'cp3_timestamp' },
                  ].map(({ label, key }) => (
                    <SortTh key={key} label={label} sortKey={key} active={sortKey === key} dir={sortDir} onSort={toggleSort} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayTrips.map((t) => (
                  <tr key={t.trip_id}>
                    <td><EditCell value={t.no_tiket} type="number" onSave={(v) => handleFieldUpdate(t.trip_id, 'no_tiket', v)} /></td>
                    <td style={{ fontWeight: 800 }}><EditCell value={t.no_lambung} onSave={(v) => handleFieldUpdate(t.trip_id, 'no_lambung', v)} /></td>
                    <td><EditCell value={t.jetty_destination} options={JETTY_OPTS} onSave={(v) => handleFieldUpdate(t.trip_id, 'jetty_destination', v)} /></td>
                    <td>
                      <span onDoubleClick={() => {}}>
                        <StatusPill status={t.status} short />
                      </span>
                      <div style={{ marginTop: 4 }}>
                        <EditCell value={t.status} options={STATUS_OPTS} onSave={(v) => handleFieldUpdate(t.trip_id, 'status', v)} />
                      </div>
                    </td>
                    <td><EditCell value={t.coal_quality} options={QUALITY_OPTS} onSave={(v) => handleFieldUpdate(t.trip_id, 'coal_quality', v)} /></td>
                    <td><EditCell value={t.cuaca_mmi} onSave={(v) => handleFieldUpdate(t.trip_id, 'cuaca_mmi', v)} /></td>
                    <td style={{ textAlign: 'right' }}><EditCell value={t.tare_site_kg} type="number" onSave={(v) => handleFieldUpdate(t.trip_id, 'tare_site_kg', v)} /></td>
                    <td style={{ textAlign: 'right' }}><EditCell value={t.gross_site_kg} type="number" onSave={(v) => handleFieldUpdate(t.trip_id, 'gross_site_kg', v)} /></td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--st-done-fg)' }}><EditCell value={t.netto_site_kg} type="number" onSave={(v) => handleFieldUpdate(t.trip_id, 'netto_site_kg', v)} /></td>
                    <td>{toWITA(t.cp1_timestamp)}</td>
                    <td style={{ textAlign: 'right' }}><EditCell value={t.gross_jetty_kg} type="number" onSave={(v) => handleFieldUpdate(t.trip_id, 'gross_jetty_kg', v)} /></td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--brand)' }}>{kg(t.netto_jetty_kg)}</td>
                    <td style={{ textAlign: 'right' }}>{kg(t.compare_gross_kg)}</td>
                    <td style={{ textAlign: 'right', color: t.deviasi_kg < 0 ? 'var(--danger)' : 'var(--text)' }}>{kg(t.deviasi_kg)}</td>
                    <td style={{ textAlign: 'right' }}><EditCell value={t.adjustment_kg ?? 0} type="number" onSave={(v) => handleFieldUpdate(t.trip_id, 'adjustment_kg', v)} /></td>
                    <td>{toWITA(t.cp2_timestamp)}</td>
                    <td>{toWITA(t.cp3_timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
