import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { I, IconButton } from '../components/DesignSystem';
import { api } from '../lib/api';

const ACTION_LABELS = {
  cp1_entry: 'CP1 — Truck arrived at site',
  cp2_entry: 'CP2 — Truck departed site',
  cp3_entry: 'CP3 — Truck arrived at jetty',
  edit_trip: 'Trip edited',
};

function fmt(ts) {
  if (!ts) return '-';
  return new Date(new Date(ts).getTime() + 8 * 60 * 60 * 1000)
    .toISOString().replace('T', ' ').slice(0, 16) + ' WITA';
}

export default function ChangelogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.listAudit({ limit: 200 }).then(setLogs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Changelog" kicker="Audit Log">
      <div className="card flush">
        <div className="list-head">
          <div>
            <div className="lh-title">Changelog</div>
            <div className="lh-sub">{logs.length} entries</div>
          </div>
          <IconButton label="Refresh" onClick={() => {
            setLoading(true);
            api.listAudit({ limit: 200 }).then(setLogs).catch(() => {}).finally(() => setLoading(false));
          }}>
            <I.refresh width="18" height="18" />
          </IconButton>
        </div>

        {loading ? (
          <div className="empty-state"><Spinner className="h-8 w-8" /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state">No audit entries yet.</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="trip-row"
              style={{ cursor: 'pointer' }}
              onClick={() => setExpanded(expanded === log.id ? null : log.id)}
            >
              <div className="tr-top">
                <div>
                  <div className="tr-lambung" style={{ fontSize: 14 }}>
                    {ACTION_LABELS[log.action] ?? log.action}
                    {log.record_id && (
                      <span className="muted" style={{ fontWeight: 400, marginLeft: 8 }}>
                        #{log.record_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  <div className="tr-sub">{log.user_email} &middot; {fmt(log.created_at)}</div>
                </div>
                <I.arrowLeft
                  width="14" height="14"
                  style={{
                    transform: expanded === log.id ? 'rotate(-90deg)' : 'rotate(180deg)',
                    transition: '.2s',
                    color: 'var(--muted)',
                  }}
                />
              </div>
              {expanded === log.id && (
                <div style={{ padding: '8px 0', fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div className="section-label" style={{ marginBottom: 4 }}>Before</div>
                    <pre style={{ background: 'var(--surface-2)', padding: 8, borderRadius: 6, overflow: 'auto', maxHeight: 200, fontSize: 11 }}>
                      {log.old_data ? JSON.stringify(JSON.parse(log.old_data), null, 2) : 'null'}
                    </pre>
                  </div>
                  <div>
                    <div className="section-label" style={{ marginBottom: 4 }}>After</div>
                    <pre style={{ background: 'var(--surface-2)', padding: 8, borderRadius: 6, overflow: 'auto', maxHeight: 200, fontSize: 11 }}>
                      {log.new_data ? JSON.stringify(JSON.parse(log.new_data), null, 2) : 'null'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
