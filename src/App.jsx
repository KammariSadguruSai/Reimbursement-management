import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store.jsx';
import Auth from './pages/Auth.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Expenses from './pages/Expenses.jsx';
import Approvals from './pages/Approvals.jsx';
import Team from './pages/Team.jsx';
import Settings from './pages/Settings.jsx';
import SuperAdmin from './pages/SuperAdmin.jsx';
import History from './pages/History.jsx';

function App() {
  const { currentUser, dbState, companies } = useStore();

  // Show a professional loading screen while the cloud DB initializes
  if (dbState === 'syncing' && companies.length === 0) {
    return (
      <div className="auth-page flex-col gap-4">
        <div style={{
          width: 50, height: 50, borderRadius: '50%',
          border: '3px solid var(--border)', borderTopColor: 'var(--primary)',
          animation: 'spin 0.8s linear infinite'
        }} />
        <div className="text-center">
            <h3 className="mb-2">Initializing Experience</h3>
            <p className="text-xs text-subtle text-muted uppercase tracking-widest">Synchronizing with Cloud Edge...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isSuperAdmin = currentUser?.id === 'u_admin_master';

  if (!currentUser) {
    return (
      <Routes>
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        
        {/* Expenses: Only Employees can submit their own expenses */}
        {currentUser.role === 'Employee' && (
          <Route path="/expenses" element={<Expenses />} />
        )}

        {/* Approvals: Admin and Manager */}
        {['Admin', 'Manager'].includes(currentUser.role) && (
          <Route path="/approvals" element={<Approvals />} />
        )}

        {/* Team: Admin and Manager (Manager sees org data, but can't edit) */}
        {['Admin', 'Manager'].includes(currentUser.role) && (
          <Route path="/team" element={<Team />} />
        )}

        {/* Settings: Admin Only */}
        {currentUser.role === 'Admin' && (
          <Route path="/settings" element={<Settings />} />
        )}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
