import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { api } from '../lib/api';

const WITA_OPTS = {
  timeZone: 'Asia/Makassar',
  hour: '2-digit', minute: '2-digit',
  hour12: false,
};

function toWITA(ts) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('id-ID', WITA_OPTS).format(new Date(ts));
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// ─── Inline Edit Cell ────────────────────────────────────────────────────────
function EditCell({ value, type = 'text', options, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');

  function commit() {
    setEditing(false);
    if (val !== (value ?? '')) onSave(type === 'number' ? parseInt(val, 10) : val);
  }

  if (options) {
    return editing ? (
      <select
        className="bg-slate-700 text-slate-100 rounded-lg px-2 py-1 text-xs border border-blue-500 w-full"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { commit(); }}
        autoFocus
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ) : (
      <span
        className="cursor-pointer hover:bg-slate-700/60 rounded px-1 py-0.5 transition-colors text-xs"
        onDoubleClick={() => { setVal(value ?? ''); setEditing(true); }}
        title="Double-click to edit"
      >
        {options.find((o) => o.value === value)?.label ?? value ?? '—'}
      </span>
    );
  }

  return editing ? (
    <input
      type={type}
      className="bg-slate-700 text-slate-100 rounded-lg px-2 py-1 text-xs border border-blue-500 w-full min-w-[80px]"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      autoFocus
    />
  ) : (
    <span
      className="cursor-pointer hover:bg-slate-700/60 rounded px-1 py-0.5 transition-colors text-xs whitespace-nowrap"
      onDoubleClick={() => { setVal(value ?? ''); setEditing(true); }}
      title="Double-click to edit"
    >
      {value != null ? (type === 'number' ? Number(value).toLocaleString() : value) : '—'}
    </span>
  );
}

// ─── User Management Modal ────────────────────────────────────────────────────
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
      setNewEmail(''); setNewPass('');
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

  const ROLE_LABELS = { stockpile_operator: 'Stockpile Operator', jetty_operator: 'Jetty Operator', admin: 'Admin' };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="font-semibold text-white">User Management</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5 flex-1">
          {/* Create user form */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-300">Create New User</h3>
            <input type="email" className="input-field text-sm" placeholder="Email" value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)} />
            <input type="password" className="input-field text-sm" placeholder="Password" value={newPass}
              onChange={(e) => setNewPass(e.target.value)} />
            <select className="input-field text-sm" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              <option value="stockpile_operator">Stockpile Operator</option>
              <option value="jetty_operator">Jetty Operator</option>
              <option value="admin">Admin</option>
            </select>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button onClick={createUser} disabled={creating || !newEmail || !newPass} className="btn-primary w-full text-sm py-3">
              {creating ? <Spinner className="h-4 w-4" /> : 'Create User'}
            </button>
          </div>

          {/* Users list */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-3">Existing Users</h3>
            {loading ? <div className="flex justify-center py-4"><Spinner /></div> : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-100">{u.email}</p>
                      <p className="text-xs text-slate-400">{ROLE_LABELS[u.role] ?? u.role ?? 'No role'}</p>
                    </div>
                    <button onClick={() => deleteUser(u.user_id)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [filters, setFilters] = useState({ date: today(), jetty: '', status: '' });
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [tab, setTab] = useState('trips'); // 'trips' | 'users'

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.date) params.date = filters.date;
      if (filters.jetty) params.jetty = filters.jetty;
      if (filters.status) params.status = filters.status;
      const data = await api.listTrips(params);
      setTrips(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

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
      setTrips((prev) => prev.map((t) => t.trip_id === tripId ? updated : t));
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  }

  const JETTY_OPTS = [{ value: 'hasnur', label: 'Hasnur' }, { value: 'talenta', label: 'Talenta' }];
  const QUALITY_OPTS = [{ value: 'raw', label: 'Raw 原煤' }, { value: 'clean', label: 'Clean 精煤' }];
  const STATUS_OPTS = [{ value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }];

  const totals = trips.reduce(
    (acc, t) => ({
      gross: acc.gross + (t.gross_weight_kg || 0),
      tare: acc.tare + (t.tare_weight_kg || 0),
      net: acc.net + (t.net_weight_kg || 0),
    }),
    { gross: 0, tare: 0, net: 0 }
  );

  return (
    <Layout title="Admin Dashboard">
      {showUsers && <UserModal onClose={() => setShowUsers(false)} />}

      <div className="space-y-4">
        {/* Action bar */}
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => setShowUsers(true)} className="btn-secondary text-sm py-2.5 px-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
            </svg>
            Users
          </button>
          <button
            onClick={handleExport}
            disabled={exportLoading || !filters.date || !filters.jetty}
            className="btn-primary text-sm py-2.5 px-4 ml-auto"
          >
            {exportLoading ? <Spinner className="h-4 w-4" /> : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            Export .xlsx
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Filters</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="label text-xs">Date</label>
              <input
                type="date"
                className="input-field text-sm py-2.5"
                value={filters.date}
                onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="label text-xs">Jetty</label>
              <select
                className="input-field text-sm py-2.5"
                value={filters.jetty}
                onChange={(e) => setFilters((f) => ({ ...f, jetty: e.target.value }))}
              >
                <option value="">All Jettys</option>
                <option value="hasnur">Hasnur</option>
                <option value="talenta">Talenta</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Status</label>
              <select
                className="input-field text-sm py-2.5"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">All Statuses</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Totals */}
        {trips.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Gross (MMI)', value: totals.gross },
              { label: 'Tare (MMI)', value: totals.tare },
              { label: 'Net (MMI)', value: totals.net },
            ].map((s) => (
              <div key={s.label} className="card py-3 text-center">
                <p className="text-xs text-slate-400">{s.label}</p>
                <p className="text-sm font-bold text-white mt-0.5">{s.value.toLocaleString()}</p>
                <p className="text-xs text-slate-500">kg</p>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              Trips
              <span className="ml-2 text-xs text-slate-500 font-normal">{trips.length} records</span>
            </h3>
            <button onClick={fetchTrips} className="text-slate-400 hover:text-white transition-colors" title="Refresh">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
          ) : trips.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No trips found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50 bg-slate-800/40">
                    {['Truck', 'Jetty', 'Quality', 'Status', 'Gross', 'Pit Tare', 'Pit Net', 'Tare', 'Net', 'Deviation', 'Weather', 'Pit In', 'Jetty Out'].map((h) => (
                      <th key={h} className="text-left text-slate-400 font-medium px-3 py-2.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trips.map((t) => (
                    <tr key={t.trip_id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono font-medium text-slate-200">
                        <EditCell value={t.truck_id} onSave={(v) => handleFieldUpdate(t.trip_id, 'truck_id', v)} />
                      </td>
                      <td className="px-3 py-2.5">
                        <EditCell value={t.jetty_destination} options={JETTY_OPTS} onSave={(v) => handleFieldUpdate(t.trip_id, 'jetty_destination', v)} />
                      </td>
                      <td className="px-3 py-2.5">
                        <EditCell value={t.coal_quality} options={QUALITY_OPTS} onSave={(v) => handleFieldUpdate(t.trip_id, 'coal_quality', v)} />
                      </td>
                      <td className="px-3 py-2.5">
                        <EditCell value={t.status} options={STATUS_OPTS} onSave={(v) => handleFieldUpdate(t.trip_id, 'status', v)} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <EditCell value={t.gross_weight_kg} type="number" onSave={(v) => handleFieldUpdate(t.trip_id, 'gross_weight_kg', v)} />
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-400">
                        <EditCell value={t.pit_tare_weight_kg} type="number" onSave={(v) => handleFieldUpdate(t.trip_id, 'pit_tare_weight_kg', v)} />
                      </td>
                      <td className="px-3 py-2.5 text-right text-blue-400">
                        {t.pit_net_weight_kg != null
                          ? <EditCell value={t.pit_net_weight_kg} type="number" onSave={(v) => handleFieldUpdate(t.trip_id, 'pit_net_weight_kg', v)} />
                          : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <EditCell value={t.tare_weight_kg} type="number" onSave={(v) => handleFieldUpdate(t.trip_id, 'tare_weight_kg', v)} />
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-emerald-400">
                        <EditCell value={t.net_weight_kg} type="number" onSave={(v) => handleFieldUpdate(t.trip_id, 'net_weight_kg', v)} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {t.jetty_destination === 'talenta'
                          ? <EditCell value={t.deviation_kg} type="number" onSave={(v) => handleFieldUpdate(t.trip_id, 'deviation_kg', v)} />
                          : <span className="text-slate-600">—</span>
                        }
                      </td>
                      <td className="px-3 py-2.5">
                        <EditCell value={t.weather} onSave={(v) => handleFieldUpdate(t.trip_id, 'weather', v)} />
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{toWITA(t.pit_timestamp)}</td>
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{toWITA(t.jetty_timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-600 text-center pb-4">
          Double-click any cell to edit inline
        </p>
      </div>
    </Layout>
  );
}
