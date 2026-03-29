import { useState, useEffect } from 'react';
import { useStore } from '../store.jsx';
import { Receipt, Clock, CheckCircle, XCircle, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const statusBadge = (status) => {
  const map = { Pending: 'badge-warning', Approved: 'badge-success', Rejected: 'badge-danger' };
  return <span className={`badge ${map[status] || 'badge-info'}`}>{status}</span>;
};

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className="stat-card" style={{ borderLeft: `3px solid ${color}` }}>
      <div style={{ color, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {icon}
        <span className="text-xs" style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-label" style={{ marginTop: '0.25rem' }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { currentUser, expenses, users, companies, convertCurrency, approvalRules } = useStore();
  const [convertedTotals, setConvertedTotals] = useState({});

  const company     = companies.find(c => c.id === currentUser.company_id);
  const baseCurrency = company?.default_currency || 'USD';

  const myExpenses       = expenses.filter(e => e.user_id === currentUser.id);
  const companyExpenses  = expenses.filter(e => e.company_id === currentUser.company_id);
  
  // Organization-wide view for Admin/Manager
  const visibleExpenses  = currentUser.role === 'Employee' ? myExpenses : companyExpenses;

  const pendingForMe     = companyExpenses.filter(
    e => e.status === 'Pending' &&
         (e.current_approver_id === currentUser.id || currentUser.role === 'Admin')
  );

  // Convert approved expense totals to base currency
  useEffect(() => {
    const approved = myExpenses.filter(e => e.status === 'Approved');
    if (!approved.length) return;

    Promise.all(
      approved.map(e => convertCurrency(e.amount, e.currency, baseCurrency))
    ).then(amounts => {
      const total = amounts.reduce((s, a) => s + a, 0);
      setConvertedTotals({ myApprovedTotal: total });
    });
  }, [expenses]);

  const companyUsers = users.filter(u => u.company_id === currentUser.company_id);
  const rule         = approvalRules.find(r => r.company_id === currentUser.company_id);

  const isEmployee = currentUser.role === 'Employee';

  const stats = isEmployee ? [
    {
      label: 'Total Submitted',
      value: myExpenses.length,
      icon: <Receipt size={18} />,
      color: 'var(--primary)',
      sub: 'all time'
    },
    {
      label: 'Pending Approval',
      value: myExpenses.filter(e => e.status === 'Pending').length,
      icon: <Clock size={18} />,
      color: 'var(--warning)',
      sub: 'awaiting review'
    },
    {
      label: 'Approved',
      value: myExpenses.filter(e => e.status === 'Approved').length,
      icon: <CheckCircle size={18} />,
      color: 'var(--success)',
      sub: convertedTotals.myApprovedTotal != null
        ? `${baseCurrency} ${convertedTotals.myApprovedTotal.toFixed(2)} total`
        : 'calculating…'
    },
    {
      label: 'Rejected',
      value: myExpenses.filter(e => e.status === 'Rejected').length,
      icon: <XCircle size={18} />,
      color: 'var(--danger)',
      sub: 'need re-submission'
    },
  ] : [
    {
      label: currentUser.role === 'Admin' ? 'Total Company Expenses' : 'Team Expenses',
      value: visibleExpenses.length,
      icon: <Receipt size={18} />,
      color: 'var(--primary)',
      sub: currentUser.role === 'Admin' ? 'across all employees' : 'your reports'
    },
    {
      label: 'Pending My Approval',
      value: pendingForMe.length,
      icon: <AlertCircle size={18} />,
      color: 'var(--warning)',
      sub: pendingForMe.length > 0 ? 'action required' : 'all clear'
    },
    {
      label: isEmployee ? 'Approved' : 'Company Approved',
      value: visibleExpenses.filter(e => e.status === 'Approved').length,
      icon: <CheckCircle size={18} />,
      color: 'var(--success)',
      sub: isEmployee 
        ? (convertedTotals.myApprovedTotal != null 
          ? `${baseCurrency} ${convertedTotals.myApprovedTotal.toFixed(2)} total`
          : 'calculating…')
        : 'organization-wide'
    },
    {
      label: 'Organization Members',
      value: companyUsers.length,
      icon: <Users size={18} />,
      color: 'var(--primary)',
      sub: `${companyUsers.filter(u => u.role === 'Manager').length} managers`
    },
  ];

  const recentExpenses = (isEmployee ? myExpenses : companyExpenses)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            {currentUser.name.split(' ')[0]} 👋
          </h2>
          <p className="text-subtle text-sm mt-2">
            <span className="badge badge-info" style={{ marginRight: '0.5rem' }}>{currentUser.role}</span>
            {company?.name} · {baseCurrency}
          </p>
        </div>
        {pendingForMe.length > 0 && currentUser.role !== 'Employee' && (
          <div style={{
            background: 'var(--warning-transparent)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--warning)'
          }}>
            <AlertCircle size={18} />
            <strong>{pendingForMe.length}</strong> expense{pendingForMe.length > 1 ? 's' : ''} awaiting your approval
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* Approval Rule Summary (Admin/Manager) */}
      {!isEmployee && rule && (
        <div className="card mb-6" style={{ borderLeft: '3px solid var(--primary)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="mb-1">Active Approval Rule</h3>
              <p className="text-subtle text-sm">
                Type: <strong style={{ color: 'var(--primary)' }}>{rule.type}</strong>
                {rule.type === 'percentage' || rule.type === 'hybrid'
                  ? ` · ${rule.percentage}% approval required`
                  : ''}
                {(rule.type === 'specific' || rule.type === 'hybrid') && rule.specific_approver_id
                  ? ` · Auto-approved by ${users.find(u => u.id === rule.specific_approver_id)?.name || 'N/A'}`
                  : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {rule.sequence?.map((uid, i) => {
                const u = users.find(x => x.id === uid);
                return (
                  <div key={uid} className="flex items-center gap-1">
                    {i > 0 && <span className="text-muted">→</span>}
                    <span className="badge badge-info">{u?.name || '?'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent expenses table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3>Recent {currentUser.role === 'Admin' ? 'Company' : 'Team'} Expenses</h3>
          <span className="text-muted text-sm">
            {isEmployee ? 'Your expenses' : currentUser.role === 'Admin' ? 'Organization-wide' : 'Direct reports'}
          </span>
        </div>
        {recentExpenses.length === 0 ? (
          <div className="text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
            <Receipt size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <p>No expenses yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {!isEmployee && <th>Employee</th>}
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentExpenses.map(exp => {
                  const submitter = users.find(u => u.id === exp.user_id);
                  return (
                    <tr key={exp.id}>
                      {!isEmployee && <td style={{ fontWeight: 500 }}>{submitter?.name || '—'}</td>}
                      <td>{exp.description}</td>
                      <td><span className="badge badge-info">{exp.category}</span></td>
                      <td style={{ fontWeight: 600 }}>
                        {exp.currency} {Number(exp.amount).toFixed(2)}
                      </td>
                      <td className="text-subtle text-sm">
                        {exp.expense_date ? format(new Date(exp.expense_date), 'dd MMM yyyy') : '—'}
                      </td>
                      <td>{statusBadge(exp.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
