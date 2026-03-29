import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';
import {
  LayoutDashboard, Receipt, CheckSquare,
  Users, Settings as SettingsIcon, LogOut, Shield, Clock
} from 'lucide-react';

export default function Layout() {
  const { currentUser, logout, companies, expenses, isSyncing } = useStore();
  const navigate = useNavigate();
  const isSuperAdmin = currentUser?.id === 'u_admin_master';

  const company = companies.find(c => c.id === currentUser.company_id);

  const handleLogout = () => { logout(); navigate('/'); };

  const navItems = [
    { to: '/',          icon: <LayoutDashboard size={18} />, label: 'Dashboard',   end: true,  roles: null },
    { to: '/expenses',  icon: <Receipt size={18} />,         label: 'My Expenses', end: false, roles: ['Employee'] },
    { to: '/approvals', icon: <CheckSquare size={18} />,     label: 'Approvals',     end: false, roles: ['Admin', 'Manager'] },
    { to: '/history',   icon: <Clock size={18} />,           label: 'History',       end: false, roles: null },
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
      {/* ── Mobile Header ── */}
      <div className="mobile-top-bar">
        <div className="flex items-center gap-2">
          <div style={{
            width: 28, height: 28, borderRadius: '6px',
            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Receipt size={14} style={{ color: 'white' }} />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{company?.name}</span>
        </div>
        <div className="flex items-center gap-3">
            <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--bg-tertiary)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', fontWeight: 700, border: '1px solid var(--border)'
            }}>
            {initials}
            </div>
            <button 
                onClick={handleLogout}
                className="btn btn-icon btn-secondary"
                style={{ width: 28, height: 28, padding: 0, minHeight: 'unset' }}
            >
                <LogOut size={14} className="text-danger" />
            </button>
        </div>
      </div>

      {/* ── Desktop Sidebar ── */}
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
              <span className="flex-1">{item.label}</span>
              {item.label === 'Approvals' && (() => {
                const count = expenses.filter(e => 
                  e.status === 'Pending' && e.current_approver_id === currentUser.id
                ).length;
                return count > 0 ? (
                  <span className="badge badge-danger" style={{ 
                    fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px' 
                  }}>
                    {count}
                  </span>
                ) : null;
              })()}
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
        </div>

        <div className="sidebar-footer" style={{ padding: '0 1rem 1rem' }}>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold px-1 mb-2">
            <div className="flex items-center gap-2">
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                backgroundColor: isSyncing ? '#fbbf24' : '#10b981',
                boxShadow: !isSyncing ? '0 0 8px #10b981' : 'none'
              }} />
              <span>{isSyncing ? 'Syncing...' : 'Cloud Sync'}</span>
            </div>
            <span>v1.0.6</span>
          </div>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* ── Mobile Navigation ── */}
      <nav className="mobile-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
          >
            <div style={{ position: 'relative' }}>
              {item.icon}
              {item.label === 'Approvals' && (() => {
                const count = expenses.filter(e => 
                  e.status === 'Pending' && e.current_approver_id === currentUser.id
                ).length;
                return count > 0 ? (
                  <div style={{
                    position: 'absolute', top: -5, right: -10,
                    background: 'var(--danger)', color: 'white',
                    fontSize: '0.6rem', padding: '1px 4px', borderRadius: '10px',
                    fontWeight: 700, minWidth: 16, textAlign: 'center'
                  }}>
                    {count}
                  </div>
                ) : null;
              })()}
            </div>
            <span>{item.label}</span>
          </NavLink>
        ))}
        {/* Simple logout trigger for mobile too? Maybe just in top bar? */}
      </nav>
    </div>
  );
}
