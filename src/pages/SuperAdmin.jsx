import { useState } from 'react';
import { useStore } from '../store.jsx';
import { useToast } from '../components/Toast.jsx';
import { Shield, ShieldCheck, ShieldAlert, UserX, UserCheck, Search, Building } from 'lucide-react';

export default function SuperAdmin() {
  const { users, companies, approveUser } = useStore();
  const toast = useToast();
  const [search, setSearch] = useState('');

  // Only manage users who are 'Admin' (Workplace owners)
  const allAdmins = users.filter(u => u.role === 'Admin' && u.id !== 'u_admin_master');
  
  const filteredAdmins = allAdmins.filter(u => 
    !search || 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getCompanyName = (cid) => companies.find(c => c.id === cid)?.name || 'Unknown';

  const handleStatusChange = async (uid, name, newVal) => {
    await approveUser(uid, newVal);
    const action = newVal === 1 ? 'Approved' : 'Restricted/Banned';
    toast.info(`${name} has been ${action}.`);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h2>Super Admin Console</h2>
          <p className="text-subtle text-sm mt-2">
            Centralized control over workplace registrations and administrative access.
          </p>
        </div>
        <div className="flex items-center gap-3">
            <div className="stat-card" style={{ padding: '0.5rem 1rem', border: '1px solid var(--primary-transparent)' }}>
                <span className="text-xs text-muted block">Global Admins</span>
                <span className="font-bold">{allAdmins.length}</span>
            </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                <Search size={18} className="text-muted" />
                <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Search for an administrator..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: 320, background: 'var(--bg-color)' }}
                />
            </div>
            <div className="flex gap-2">
                <span className="badge badge-info">Master Account</span>
            </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Admin Name</th>
                <th>Workplace</th>
                <th>Email</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map(adm => {
                const approved = adm.is_approved === 1;
                return (
                  <tr key={adm.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div style={{ 
                          width: 32, height: 32, borderRadius: 'var(--radius-md)', 
                          background: approved ? 'var(--success-transparent)' : 'var(--danger-transparent)',
                          color: approved ? 'var(--success)' : 'var(--danger)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {approved ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                        </div>
                        <span style={{ fontWeight: 600 }}>{adm.name}</span>
                      </div>
                    </td>
                    <td>
                        <div className="flex items-center gap-2 text-sm text-subtle">
                            <Building size={14} /> {getCompanyName(adm.company_id)}
                        </div>
                    </td>
                    <td className="text-muted text-sm">{adm.email}</td>
                    <td>
                      <span className={`badge ${approved ? 'badge-success' : 'badge-danger'}`}>
                        {approved ? 'Active' : 'Banned / Pending'}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        {approved ? (
                          <button 
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleStatusChange(adm.id, adm.name, 0)}
                          >
                            <UserX size={14} /> Ban Access
                          </button>
                        ) : (
                          <button 
                            className="btn btn-success btn-sm"
                            onClick={() => handleStatusChange(adm.id, adm.name, 1)}
                          >
                            <UserCheck size={14} /> Approve Access
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAdmins.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-muted">
                    No administrators found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
