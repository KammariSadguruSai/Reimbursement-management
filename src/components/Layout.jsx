import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';
import {
  LayoutDashboard, Receipt, CheckSquare,
  Users, Settings as SettingsIcon, LogOut
} from 'lucide-react';

export default function Layout() {
  const { currentUser, logout, companies, isSyncing } = useStore();
  const navigate = useNavigate();

  const company = companies.find(c => c.id === currentUser.company_id);

  const handleLogout = () => { logout(); navigate('/'); };

  const navItems = [
    { to: '/',          icon: <LayoutDashboard size={18} />, label: 'Dashboard',   end: true,  roles: null },
    { to: '/expenses',  icon: <Receipt size={18} />,         label: 'My Expenses', end: false, roles: ['Employee'] },
    { to: '/approvals', icon: <CheckSquare size={18} />,     label: 'Approvals',     end: false, roles: ['Admin', 'Manager'] },
    { to: '/team',      icon: <Users size={18} />,           label: 'Team',          end: false, roles: ['Admin', 'Manager'] },
    { to: '/settings',  icon: <SettingsIcon size={18} />,    label: 'Settings',      end: false, roles: ['Admin'] },
  ].filter(item => !item.roles || item.roles.includes(currentUser.role));

  const initials = currentUser.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app-container">
      {/* ── Sidebar ── */}
      <nav className="sidebar">
        {/* Brand */}
        <div style={{ padding: '0 1.5rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Receipt size={18} style={{ color: 'white' }} />
            </div>
            <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>ExpenseFlow</span>
          </div>
          <p className="text-xs text-muted">{company?.name}</p>
        </div>

        {/* Nav links */}
        <div style={{ flex: 1, padding: '0.75rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' active' : ''}`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* User card */}
        <div style={{ padding: '1rem 1rem 0', borderTop: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem', borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-tertiary)', marginBottom: '0.75rem'
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
              color: 'white', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0
            }}>
              {initials}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.name}
              </p>
              <span className={`badge ${currentUser.role === 'Admin' ? 'badge-danger' : currentUser.role === 'Manager' ? 'badge-info' : 'badge-success'}`}
                style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                {currentUser.role}
              </span>
            </div>
          </div>
          <button
            id="btn-logout"
            onClick={handleLogout}
            className="btn btn-secondary btn-sm w-full"
            style={{ marginBottom: '0.75rem', justifyContent: 'center', gap: '0.5rem' }}
          >
            <LogOut size={15} /> Logout
          </button>

          {/* Database Info */}
          <div className="flex items-center justify-between text-xs text-muted" style={{ padding: '0 0.5rem' }}>
            <div className="flex items-center gap-2">
              <div style={{ 
                width: 6, height: 6, borderRadius: '50%', 
                backgroundColor: isSyncing ? 'var(--warning)' : 'var(--success)',
                boxShadow: isSyncing ? '0 0 8px var(--warning)' : 'none'
              }}></div>
              <span>{isSyncing ? 'Syncing to DB…' : 'Database Persistent'}</span>
            </div>
            <span>v1.0.4</span>
          </div>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
