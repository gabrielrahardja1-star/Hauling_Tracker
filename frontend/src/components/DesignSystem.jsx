import { useEffect, useState } from 'react';
import Spinner from './Spinner';
import { useLang } from '../hooks/useLang';

const WITA_OPTS = { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hour12: false };

export function toWITA(ts) {
  if (!ts) return '-';
  return new Intl.DateTimeFormat('id-ID', WITA_OPTS).format(new Date(ts));
}

export function nowWITA() {
  return new Intl.DateTimeFormat('id-ID', WITA_OPTS).format(new Date());
}

export function elapsed(ts) {
  if (!ts) return '';
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} mnt lalu`;
  return `${Math.floor(mins / 60)} j ${mins % 60} m lalu`;
}

export function kg(n) {
  return n == null ? '-' : Number(n).toLocaleString('id-ID');
}

export function witaToday() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
}

export const STATUS = {
  pending: { cls: 'st-pending', label: 'Di Stockpile' },
  in_transit: { cls: 'st-transit', label: 'Perjalanan' },
  completed: { cls: 'st-done', label: 'Selesai' },
};

export const STATUS_SHORT = {
  pending: { cls: 'st-pending', label: 'Pending' },
  in_transit: { cls: 'st-transit', label: 'In Transit' },
  completed: { cls: 'st-done', label: 'Completed' },
};

export const JETTY = { hasnur: 'Hasnur', talenta: 'Talenta' };
export const QUALITY = { raw: 'Raw', clean: 'Clean' };
export const QUALITY_ID = { raw: 'Mentah', clean: 'Bersih' };

export const I = {
  truck: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14 17V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v11h2" />
      <path d="M14 9h4l3 3.5V17h-3" />
      <circle cx="7" cy="17.5" r="2" />
      <circle cx="17" cy="17.5" r="2" />
    </svg>
  ),
  arrowLeft: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  ),
  arrowIn: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  ),
  arrowOut: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 21V9" />
      <path d="m7 14 5-5 5 5" />
      <path d="M5 3h14" />
    </svg>
  ),
  scale: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3v18" />
      <path d="M6 7h12" />
      <path d="m6 7-3 7a3 3 0 0 0 6 0L6 7z" />
      <path d="m18 7-3 7a3 3 0 0 0 6 0l-3-7z" />
      <path d="M7 21h10" />
    </svg>
  ),
  anchor: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 8v13" />
      <path d="M5 12a7 7 0 0 0 14 0" />
      <path d="M5 12H3m18 0h-2" />
    </svg>
  ),
  list: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="3.5" cy="6" r="1" />
      <circle cx="3.5" cy="12" r="1" />
      <circle cx="3.5" cy="18" r="1" />
    </svg>
  ),
  download: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  ),
  search: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  check: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m5 13 4 4L19 7" />
    </svg>
  ),
  refresh: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  ),
  chevR: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  ),
  logout: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
  users: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  shield: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    </svg>
  ),
  close: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),
  expand: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  ),
  compress: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  ),
  warning: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  chart: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 3v18h18" />
      <path d="m7 16 4-4 4 4 4-4" />
    </svg>
  ),
  eye: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

export function LiveTime() {
  const [time, setTime] = useState(nowWITA());

  useEffect(() => {
    const id = setInterval(() => setTime(nowWITA()), 10000);
    return () => clearInterval(id);
  }, []);

  return <span>{time}</span>;
}

export function IconButton({ children, label, className = '', ...props }) {
  return (
    <button className={`ah-icon-btn ${className}`} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

export function SyncChip({ online = true, compact = false }) {
  if (compact) {
    return (
      <span className={`sync-dot ${online ? 'sync-online' : 'sync-offline'}`} title={online ? 'Tersinkron' : 'Offline'}>
        {online ? <I.check width="17" height="17" /> : <span />}
      </span>
    );
  }
  return (
    <span className={`sync-chip ${online ? 'sync-online' : 'sync-offline'}`}>
      <span className="dot" />
      {online ? 'Tersinkron' : 'Offline'}
    </span>
  );
}

const STATUS_CLS = { pending: 'st-pending', in_transit: 'st-transit', completed: 'st-done' };
const STATUS_KEY = { pending: 'statusPending', in_transit: 'statusInTransit', completed: 'statusCompleted' };
const STATUS_KEY_LONG = { pending: 'statusPendingLong', in_transit: 'statusInTransitLong', completed: 'statusCompletedLong' };

export function StatusPill({ status, short = false }) {
  const { t } = useLang();
  const cls = STATUS_CLS[status] || 'st-pending';
  const label = t((short ? STATUS_KEY : STATUS_KEY_LONG)[status] || status) || status;
  return (
    <span className={`status-pill ${cls}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

export function DestChip({ dest }) {
  return (
    <span className={`chip dest-${dest || 'unknown'}`}>
      <span className="dot" />
      {JETTY[dest] || dest || '-'}
    </span>
  );
}

export function Weight({ value, unit = 'kg', size, accent }) {
  return (
    <div className={`weight ${size === 'lg' ? 'lg' : ''} ${accent ? 'accent' : ''}`}>
      <span className="num">{kg(value)}</span>
      <span className="unit">{unit}</span>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label className="field-label">
        {label}
        {hint && <span className="hint">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className={`segmented cols-${options.length}`}>
      {options.map((o) => (
        <button key={o.value} type="button" className="seg-btn" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          <span>{o.label}</span>
          {o.sub && <span className="seg-sub">{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}

export function Banner({ title, children, action }) {
  return (
    <div className="banner">
      <span className="b-ico">
        <I.check width="20" height="20" />
      </span>
      <div className="grow">
        <div className="b-title">{title}</div>
        {children && <div className="b-text">{children}</div>}
        {action}
      </div>
    </div>
  );
}

export function InfoGrid({ items }) {
  return (
    <div className="info-grid">
      {items.map((item) => (
        <div className="info-cell" key={item.label}>
          <div className="k">{item.label}</div>
          <div className={`v ${item.text ? 'txt' : ''}`}>{item.value ?? '-'}</div>
        </div>
      ))}
    </div>
  );
}

export function TripRow({ trip, onTap, cta, time = 'cp1' }) {
  const { t } = useLang();
  const tappable = !!onTap;
  const El = tappable ? 'button' : 'div';
  const timeValue = time === 'cp2' ? trip.cp2_timestamp : time === 'cp3' ? trip.cp3_timestamp : trip.cp1_timestamp;

  return (
    <El className={`trip-row ${tappable ? 'tappable' : ''}`} onClick={onTap}>
      <div className="tr-top">
        <div className="tr-id">
          <span className="tr-ticket">#{trip.no_tiket}</span>
          <span className="tr-lambung">{trip.no_lambung}</span>
        </div>
        <div className="row chip-row">
          <DestChip dest={trip.jetty_destination} />
          <StatusPill status={trip.status} />
        </div>
      </div>
      <div className="tr-meta">
        <span className="tr-sub">
          {trip.status === 'pending' ? (
            <>
              {t('tripTara')} <b>{kg(trip.tare_site_kg)}</b> kg
            </>
          ) : trip.status === 'in_transit' ? (
            <>
              {t('tripNettoSite')} <b>{kg(trip.netto_site_kg)}</b> kg
            </>
          ) : (
            <>
              {t('tripNetto')} <b>{kg(trip.netto_jetty_kg)}</b> kg, {t('tripDev')} {kg(trip.deviasi_kg)}
            </>
          )}
        </span>
        {tappable ? (
          <span className="tr-cta">
            {cta} <I.chevR width="13" height="13" />
          </span>
        ) : (
          <span className="tr-time">{toWITA(timeValue)}</span>
        )}
      </div>
    </El>
  );
}

export function TripListCard({ title, sub, trips, loading, getTap, cta, onRefresh, right, empty = 'Belum ada trip hari ini' }) {
  return (
    <div className="card flush">
      <div className="list-head">
        <div>
          <div className="lh-title">{title}</div>
          {sub && <div className="lh-sub">{sub}</div>}
        </div>
        <div className="row" style={{ gap: 6 }}>
          {right}
          {onRefresh && (
            <IconButton className="icon-muted" label="Segarkan" onClick={onRefresh}>
              <I.refresh width="18" height="18" />
            </IconButton>
          )}
        </div>
      </div>
      {loading ? (
        <div className="empty-state">
          <Spinner />
        </div>
      ) : trips.length === 0 ? (
        <div className="empty-state">{empty}</div>
      ) : (
        trips.map((trip) => <TripRow key={trip.trip_id} trip={trip} onTap={getTap ? getTap(trip) : null} cta={cta} />)
      )}
    </div>
  );
}

export function BottomTabs({ tabs, active, onChange }) {
  return (
    <nav className="tabbar" aria-label="Page tabs">
      {tabs.map((tab) => {
        const badge = typeof tab.badge === 'function' ? tab.badge() : tab.badge;
        const Icon = tab.icon;
        return (
          <button key={tab.key} type="button" className={`tab ${active === tab.key ? 'active' : ''}`} onClick={() => onChange(tab.key)}>
            {badge > 0 && <span className="tab-badge">{badge}</span>}
            <Icon width="24" height="24" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function StatCard({ label, value, unit = 'kg', accent }) {
  return (
    <div className="card stat-card">
      <div className="k">{label}</div>
      <div className={`v ${accent ? 'accent' : ''}`}>{kg(value)}</div>
      {unit && <div className="unit">{unit}</div>}
    </div>
  );
}

export function SortTh({ label, sortKey, active, dir, onSort, style }) {
  return (
    <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }} onClick={() => onSort(sortKey)}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <span style={{ opacity: active ? 1 : 0.25, fontSize: 10 }}>
          {active && dir === 'desc' ? '▼' : '▲'}
        </span>
      </span>
    </th>
  );
}
