import { useAuth } from '../hooks/useAuth';

const ROLE_LABELS = {
  pit_operator: 'Pit Operator',
  jetty_operator: 'Jetty Operator',
  admin: 'Admin',
};

export default function Layout({ children, title }) {
  const { user, role, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Hauling Tracker</p>
            <h1 className="text-lg font-bold text-white leading-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">{user?.email}</p>
              <p className="text-xs font-medium text-blue-400">{ROLE_LABELS[role] ?? role}</p>
            </div>
            <button onClick={signOut} className="text-xs text-slate-400 hover:text-red-400 transition-colors px-2 py-1">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
