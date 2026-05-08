import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';

const ROLE_HOME = {
  stockpile_operator: '/stockpile',
  jetty_operator:     '/jetty',
  admin:              '/admin',
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-900/50">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l1.5 1.5M17 11h2l2 4v2h-1.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Hauling Tracker</h1>
          <p className="text-slate-400 text-sm mt-1">Coal trip management system</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input type="text" className="input-field" placeholder="username"
                value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input-field" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>

            {error && (
              <div className="rounded-xl bg-red-900/40 border border-red-700/50 text-red-300 text-sm px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? <Spinner className="h-5 w-5" /> : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
