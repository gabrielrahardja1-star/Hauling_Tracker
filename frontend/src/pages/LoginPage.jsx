import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Field } from '../components/DesignSystem';
import Spinner from '../components/Spinner';

const ROLE_HOME = {
  stockpile_operator: '/stockpile',
  jetty_operator: '/jetty',
  admin: '/admin',
};

export default function LoginPage() {
  const { signIn } = useAuth();
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
            <Field label="Nama Pengguna">
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
            <Field label="Kata Sandi">
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
              {loading ? <Spinner className="h-5 w-5" /> : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
