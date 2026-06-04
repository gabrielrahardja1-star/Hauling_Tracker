import { useAuth } from '../hooks/useAuth';
import { I, IconButton, LiveTime, SyncChip } from './DesignSystem';

const ROLE_LABELS = {
  stockpile_operator: 'Operator Stockpile',
  jetty_operator: 'Operator Jetty',
  admin: 'Admin',
};

const ROLE_HOME = {
  admin: '/admin',
  analytics: '/analytics',
  stockpile_operator: '/stockpile',
  jetty_operator: '/jetty',
};

export default function Layout({ children, title, kicker, footer, wide = false }) {
  const { role, signOut } = useAuth();
  const home = ROLE_HOME[role];
  const isHome = home && window.location.pathname === home;

  return (
    <div className="app-shell" data-direction="b" data-theme="light" data-density="regular">
      <div className={`app-viewport ${wide ? 'app-viewport-wide' : ''}`}>
        <header className="appheader">
          <div className="row grow" style={{ gap: 12, minWidth: 0 }}>
            <img className="ah-logo" src="/assets/mergecoal-mark.png" alt="MergeCoal" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="ah-kicker">{kicker || ROLE_LABELS[role] || 'Hauling Tracker'}</div>
              <div className="ah-title">{title}</div>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div className="hidden sm:block muted" style={{ fontSize: 13, fontWeight: 700 }}>
              <LiveTime />
            </div>
            <SyncChip online compact />
            {home && !isHome && (
              <IconButton label="Kembali ke Home" onClick={() => window.location.href = home}>
                <I.arrowLeft width="18" height="18" />
              </IconButton>
            )}
            <IconButton label="Keluar" onClick={signOut}>
              <I.logout width="18" height="18" />
            </IconButton>
          </div>
        </header>

        <main className={`screen ${wide ? 'screen-wide' : ''}`}>
          {children}
        </main>

        {footer}
      </div>
    </div>
  );
}
