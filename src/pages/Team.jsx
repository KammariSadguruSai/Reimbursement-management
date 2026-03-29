import { useState } from 'react';
import { useStore } from '../store.jsx';
import { useToast } from '../components/Toast.jsx';
import { UserPlus, X, Edit2, Check, ShieldAlert, User, Shield } from 'lucide-react';

const ROLES = ['Employee', 'Manager', 'Admin'];

const ROLE_COLORS = {
  Admin:    { badge: 'badge-danger',  icon: <ShieldAlert size={14} /> },
  Manager:  { badge: 'badge-info',    icon: <Shield size={14} /> },
  Employee: { badge: 'badge-success', icon: <User size={14} /> }
};

// ─── Add / Edit User Modal ────────────────────────────────────────────────────

function UserModal({ onClose, editUser }) {
  const { createUser, updateUser, users, currentUser } = useStore();
  const toast = useToast();

  const [form, setForm] = useState({
    name:       editUser?.name       || '',
    email:      editUser?.email      || '',
    password:   '',
    role:       editUser?.role       || 'Employee',
    manager_id: editUser?.manager_id || ''
  });
  const [error, setError] = useState('');

  const managers = users.filter(u =>
    u.company_id === currentUser.company_id &&
    ['Manager', 'Admin'].includes(u.role) &&
    u.id !== editUser?.id
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (editUser) {
      updateUser(editUser.id, {
        role:       form.role,
        manager_id: form.manager_id || null
      });
      toast.success(`${editUser.name}'s role updated to ${form.role}.`);
      onClose();
    } else {
      if (!form.password) { setError('Password is required.'); return; }
      const result = await createUser({
        name:       form.name,
        email:      form.email,
        password:   form.password,
        role:       form.role,
        manager_id: form.manager_id || null
      });
      if (result.success) {
        toast.success(`${form.name} added as ${form.role}.`);
        onClose();
      } else setError(result.error);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>{editUser ? `Edit ${editUser.name}` : 'Add Team Member'}</h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div className="mb-4 p-3 rounded" style={{ backgroundColor: 'var(--danger-transparent)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            {!editUser && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" type="text" required
                    value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Doe" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" required
                    value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@company.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Password *</label>
                  <input className="form-input" type="password" required
                    value={form.password} onChange={e => set('password', e.target.value)} placeholder="Set a password" />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Role *</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <div
                    key={r}
                    onClick={() => set('role', r)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${form.role === r ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: form.role === r ? 'var(--primary-transparent)' : 'var(--bg-tertiary)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'var(--transition)'
                    }}
                  >
                    <div style={{ color: form.role === r ? 'var(--primary)' : 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', justifyContent: 'center' }}>
                      {ROLE_COLORS[r].icon}
                    </div>
                    <p className="text-sm" style={{ fontWeight: form.role === r ? 700 : 400 }}>{r}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Reports To (Manager)</label>
              <select className="form-select" value={form.manager_id} onChange={e => set('manager_id', e.target.value)}>
                <option value="">— None / Direct to Admin —</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                {editUser ? <><Check size={16} /> Save Changes</> : <><UserPlus size={16} /> Add Member</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Team Page ───────────────────────────────────────────────────────────

export default function Team() {
  const { users, currentUser, expenses } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser]   = useState(null);
  const [search, setSearch]       = useState('');

  const teamMembers = users
    .filter(u => u.company_id === currentUser.company_id)
    .filter(u =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    );

  const getManager = (id) => users.find(u => u.id === id)?.name || '—';

  const getExpenseCount = (userId) => expenses.filter(e => e.user_id === userId).length;

  const openEdit = (u) => { setEditUser(u); setShowModal(true); };
  const openAdd  = ()  => { setEditUser(null); setShowModal(true); };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Team</h2>
          <p className="text-subtle text-sm mt-2">
            Manage employees, roles, and reporting relationships
          </p>
        </div>
        {currentUser.role === 'Admin' && (
          <button className="btn btn-primary" id="btn-add-member" onClick={openAdd}>
            <UserPlus size={18} /> Add Member
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          className="form-input"
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {ROLES.map(r => {
          const count = teamMembers.filter(u => u.role === r).length;
          return (
            <div key={r} className="stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                {ROLE_COLORS[r].icon}
              </div>
              <div>
                <div className="stat-value" style={{ fontSize: '1.5rem' }}>{count}</div>
                <div className="stat-label">{r}{count !== 1 ? 's' : ''}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="card">
        {teamMembers.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: '2rem' }}>No members found.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Reports To</th>
                  <th>Expenses</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: `linear-gradient(135deg, var(--primary), var(--primary-hover))`,
                          color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.9rem', flexShrink: 0
                        }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600 }}>{u.name}</p>
                          {u.id === currentUser.id && (
                            <span className="text-xs" style={{ color: 'var(--primary)' }}>You</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-subtle">{u.email}</td>
                    <td>
                      <span className={`badge ${ROLE_COLORS[u.role]?.badge || 'badge-info'}`} style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                        {ROLE_COLORS[u.role]?.icon} {u.role}
                      </span>
                    </td>
                    <td className="text-subtle">{u.manager_id ? getManager(u.manager_id) : '—'}</td>
                    <td>
                      <span className="badge badge-info">{getExpenseCount(u.id)}</span>
                    </td>
                    <td>
                      {currentUser.role === 'Admin' ? (
                        <button
                          className="btn btn-icon btn-secondary"
                          onClick={() => openEdit(u)}
                          title="Edit role / manager"
                        >
                          <Edit2 size={15} />
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <UserModal
          editUser={editUser}
          onClose={() => { setShowModal(false); setEditUser(null); }}
        />
      )}
    </div>
  );
}
