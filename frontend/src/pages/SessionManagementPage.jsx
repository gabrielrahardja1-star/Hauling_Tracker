import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { I, IconButton, toWITA, fmtWeight } from '../components/DesignSystem';
import { api } from '../lib/api';
import { useUnit } from '../hooks/useUnit';

function LockButton({ locked, lockedAt, label, onToggle, loading }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={loading}
      title={locked ? `Locked ${toWITA(lockedAt) ?? ''}` : `Lock ${label}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
        cursor: loading ? 'default' : 'pointer', border: '1.5px solid',
        borderColor: locked ? 'var(--brand)' : 'var(--border)',
        background: locked ? 'var(--brand-subtle, #eff6ff)' : 'var(--surface)',
        color: locked ? 'var(--brand)' : 'var(--muted)',
        minWidth: 90,
      }}
    >
      {loading
        ? <Spinner className="h-3 w-3" />
        : <I.shield width="13" height="13" />
      }
      {locked ? 'Locked' : 'Unlocked'}
    </button>
  );
}

function SessionRow({ session, onUpdate }) {
  const { unit } = useUnit();
  const [siteBusy, setSiteBusy] = useState(false);
  const [jettyBusy, setJettyBusy] = useState(false);
  const [endBusy, setEndBusy] = useState(false);
  const [error, setError] = useState('');

  async function toggleSite() {
    setSiteBusy(true);
    setError('');
    try {
      onUpdate(await api.lockSessionSite(session.session_id));
    } catch (e) {
      setError(e.message);
    } finally {
      setSiteBusy(false);
    }
  }

  async function toggleJetty() {
    setJettyBusy(true);
    setError('');
    try {
      onUpdate(await api.lockSessionJetty(session.session_id));
    } catch (e) {
      setError(e.message);
    } finally {
      setJettyBusy(false);
    }
  }

  async function handleEnd() {
    if (!confirm(`End session for ${session.session_date}?`)) return;
    setEndBusy(true);
    setError('');
    try {
      onUpdate(await api.endSession(session.session_id));
    } catch (e) {
      setError(e.message);
    } finally {
      setEndBusy(false);
    }
  }

  const isActive = session.status === 'active';
  const netto = Number(session.total_netto_kg) || 0;

  return (
    <tr>
      <td style={{ fontFamily: 'var(--font-num)', fontWeight: 700 }}>{session.session_date}</td>
      <td>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          color: isActive ? 'var(--accent)' : 'var(--muted)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
            background: isActive ? 'var(--accent)' : 'var(--muted)',
          }} />
          {isActive ? 'Active' : 'Ended'}
        </span>
      </td>
      <td style={{ textAlign: 'right', fontFamily: 'var(--font-num)' }}>
        {session.trip_count ?? 0}
      </td>
      <td style={{ textAlign: 'right', fontFamily: 'var(--font-num)', fontWeight: 700 }}>
        {netto > 0 ? `${(netto / 1000).toFixed(2)} t` : '—'}
      </td>
      <td>
        <LockButton
          locked={session.site_locked}
          lockedAt={session.site_locked_at}
          label="Site"
          onToggle={toggleSite}
          loading={siteBusy}
        />
      </td>
      <td>
        <LockButton
          locked={session.jetty_locked}
          lockedAt={session.jetty_locked_at}
          label="Jetty"
          onToggle={toggleJetty}
          loading={jettyBusy}
        />
      </td>
      <td>
        {isActive && (
          <button
            type="button"
            onClick={handleEnd}
            disabled={endBusy}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 12, padding: '4px 10px' }}
          >
            {endBusy ? <Spinner className="h-3 w-3" /> : 'End Session'}
          </button>
        )}
        {!isActive && session.ended_at && (
          <span className="muted" style={{ fontSize: 12 }}>{toWITA(session.ended_at)}</span>
        )}
      </td>
      {error && (
        <td colSpan={2}>
          <span className="alert" style={{ fontSize: 12, padding: '2px 8px' }}>{error}</span>
        </td>
      )}
    </tr>
  );
}

export default function SessionManagementPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      setSessions(await api.listSessions());
    } catch {
      /* keep calm */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  function handleUpdate(updated) {
    setSessions((prev) => prev.map((s) => s.session_id === updated.session_id ? { ...s, ...updated } : s));
  }

  return (
    <Layout title="Session Management" kicker="Admin" wide>
      <div className="admin-actions">
        <a href="/admin" className="btn btn-ghost">
          <I.arrowIn width="16" height="16" style={{ transform: 'rotate(180deg)' }} />
          Back to Admin
        </a>
        <IconButton className="icon-muted" label="Refresh" onClick={fetchSessions} style={{ marginLeft: 'auto' }}>
          <I.refresh width="18" height="18" />
        </IconButton>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--surface-2, #f8fafc)' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          <strong style={{ color: 'var(--fg)' }}>Site lock</strong> prevents operators from recording CP2 (truck departure) for trips in a session.&nbsp;
          <strong style={{ color: 'var(--fg)' }}>Jetty lock</strong> prevents operators from recording CP3 (jetty arrival). Both locks apply to operator edits only — admin can still edit trips directly.
        </div>
      </div>

      <div className="card flush">
        <div className="list-head">
          <div>
            <div className="lh-title">Sessions</div>
            <div className="lh-sub">{sessions.length} sessions</div>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><Spinner className="h-8 w-8" /></div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">No sessions yet</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Trips</th>
                  <th style={{ textAlign: 'right' }}>Total Netto</th>
                  <th>Site Lock</th>
                  <th>Jetty Lock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <SessionRow key={s.session_id} session={s} onUpdate={handleUpdate} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
