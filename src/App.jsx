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

function App() {
  const { currentUser } = useStore();
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
        
        {/* Expenses: Everyone can submit their own expenses */}
        <Route path="/expenses" element={<Expenses />} />

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
