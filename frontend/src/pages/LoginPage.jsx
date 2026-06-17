import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLang } from '../hooks/useLang';
import { Field } from '../components/DesignSystem';
import Spinner from '../components/Spinner';

const ROLE_HOME = {
  stockpile_operator:  '/stockpile',
  jetty_operator:      '/jetty',
  admin:               '/admin',
  analytics:           '/analytics',
  site_jetty_operator: '/stockpile',
  supervisor:          '/stockpile',
};

export default function LoginPage() {
  const { signIn } = useAuth();
  const { lang, setLang, t } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await signIn(email, password);
      navigate(ROLE_HOME[user.role] ?? '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell" data-direction="b" data-theme="light" data-density="regular">
      <div className="app-viewport">
        <div className="login-wrap">
          <div className="stack" style={{ gap: 14, alignItems: 'flex-start' }}>
            <img className="login-logo" src="/assets/mergecoal-logo.png" alt="MergeCoal" />
            <div className="brand-sub">Hauling batubara Tambang ke Jetty</div>
          </div>

          <form onSubmit={handleSubmit} className="stack" style={{ gap: 14 }}>
            <Field label={t('loginEmail')}>
              <input
                type="text"
                className="input"
                placeholder="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </Field>
            <Field label={t('loginPassword')}>
              <input
                type="password"
                className="input"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </Field>

            {error && <div className="alert">{error}</div>}

            <button type="submit" className="btn btn-brand" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <Spinner className="h-5 w-5" /> : t('loginButton')}
            </button>
          </form>

          <button
            onClick={() => setLang(lang === 'id' ? 'zh' : 'id')}
            style={{
              marginTop: 16, padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              border: '1.5px solid var(--border)', background: 'transparent',
              color: 'var(--text-3)', cursor: 'pointer',
            }}
          >
            {lang === 'id' ? '切换到中文' : 'Ganti ke Indonesia'}
          </button>
        </div>
      </div>
    </div>
  );
}
