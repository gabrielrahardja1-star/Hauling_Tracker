import { useAuth } from '../hooks/useAuth';
import { useLang } from '../hooks/useLang';
import { I, IconButton, LiveTime, SyncChip } from './DesignSystem';

const ROLE_HOME = {
  admin: '/admin',
  analytics: '/analytics',
  stockpile_operator: '/stockpile',
  jetty_operator: '/jetty',
};

export default function Layout({ children, title, kicker, footer, wide = false }) {
  const { role, signOut } = useAuth();
  const { lang, setLang, t } = useLang();
  const home = ROLE_HOME[role];
  const isHome = home && window.location.pathname === home;

  const roleLabel = {
    stockpile_operator: t('roleStockpile'),
    jetty_operator: t('roleJetty'),
    admin: t('roleAdmin'),
    analytics: t('roleAnalytics'),
  }[role] || 'Hauling Tracker';

  return (
    <div className="app-shell" data-direction="b" data-theme="light" data-density="regular">
      <div className={`app-viewport ${wide ? 'app-viewport-wide' : ''}`}>
        <header className="appheader">
          <div className="row grow" style={{ gap: 12, minWidth: 0 }}>
            <img className="ah-logo" src="/assets/mergecoal-mark.png" alt="MergeCoal" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="ah-kicker">{kicker || roleLabel}</div>
              <div className="ah-title">{title}</div>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div className="hidden sm:block muted" style={{ fontSize: 13, fontWeight: 700 }}>
              <LiveTime />
            </div>
            <SyncChip online compact />
            <button
              onClick={() => setLang(lang === 'id' ? 'zh' : 'id')}
              style={{
                padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                border: '1.5px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text)', cursor: 'pointer', letterSpacing: 0.5,
              }}
              title={lang === 'id' ? '切换到中文' : 'Ganti ke Indonesia'}
            >
              {lang === 'id' ? '中' : 'ID'}
            </button>
            {home && !isHome && (
              <IconButton label={t('backToHome')} onClick={() => window.location.href = home}>
                <I.arrowLeft width="18" height="18" />
              </IconButton>
            )}
            <IconButton label={t('signOut')} onClick={signOut}>
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
