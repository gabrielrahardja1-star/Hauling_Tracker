import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LangProvider } from './hooks/useLang';
import { UnitProvider } from './hooks/useUnit';
import { setAuthProvider } from './lib/api';
import LoginPage from './pages/LoginPage';
import StockpileOperatorPage from './pages/StockpileOperatorPage';
import JettyOperatorPage from './pages/JettyOperatorPage';
import AdminPage from './pages/AdminPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SessionManagementPage from './pages/SessionManagementPage';
import Spinner from './components/Spinner';

const ROLE_HOME = {
  stockpile_operator: '/stockpile',
  jetty_operator:     '/jetty',
  admin:              '/admin',
  analytics:          '/analytics',
};

function RoleRoute({ roles, children }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-shell" data-direction="b" data-theme="light" data-density="regular">
        <div className="app-viewport" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Spinner className="h-10 w-10" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(role)) return <Navigate to={ROLE_HOME[role] ?? '/login'} replace />;
  return children;
}

function AuthRedirect() {
  const { user, role } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[role] ?? '/login'} replace />;
}

// Inner component so it can call useAuth after provider is mounted
function AppRoutes() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthProvider(getToken);
  }, [getToken]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/stockpile" element={
        <RoleRoute roles={['stockpile_operator', 'admin']}>
          <StockpileOperatorPage />
        </RoleRoute>
      } />
      <Route path="/jetty" element={
        <RoleRoute roles={['jetty_operator', 'admin']}>
          <JettyOperatorPage />
        </RoleRoute>
      } />
      <Route path="/admin" element={
        <RoleRoute roles={['admin']}>
          <AdminPage />
        </RoleRoute>
      } />
      <Route path="/analytics" element={
        <RoleRoute roles={['stockpile_operator', 'jetty_operator', 'analytics', 'admin']}>
          <AnalyticsPage />
        </RoleRoute>
      } />
      <Route path="/sessions" element={
        <RoleRoute roles={['admin']}>
          <SessionManagementPage />
        </RoleRoute>
      } />
      <Route path="*" element={<AuthRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <UnitProvider>
      <LangProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </LangProvider>
    </UnitProvider>
  );
}
