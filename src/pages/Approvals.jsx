import { useState, useEffect } from 'react';
import { useStore } from '../store.jsx';
import { useToast } from '../components/Toast.jsx';
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';

const statusBadge = (status) => {
  const map = { Pending: 'badge-warning', Approved: 'badge-success', Rejected: 'badge-danger' };
  return <span className={`badge ${map[status] || 'badge-info'}`}>{status}</span>;
};

// ─── Approval Modal ───────────────────────────────────────────────────────────

function ApprovalModal({ expense, onClose }) {
  const { approveExpense, rejectExpense, reopenExpense, users, companies, convertCurrency, currentUser } = useStore();
  const toast = useToast();
  const [comments, setComments]   = useState('');
  const [converted, setConverted] = useState(null);
  const [convertedCurrency, setCC] = useState('');

  const submitter       = users.find(u => u.id === expense.user_id);
  const company         = companies.find(c => c.id === expense.company_id);
  const baseCurrency    = company?.default_currency || 'USD';

  useEffect(() => {
    if (expense.currency !== baseCurrency) {
      setCC(baseCurrency);
      convertCurrency(expense.amount, expense.currency, baseCurrency)
        .then(val => setConverted(val));
    }
  }, []);

  const handleAction = (type) => {
    if (type === 'approve') {
      approveExpense(expense.id, comments);
      toast.success('Expense approved successfully.');
    } else {
      rejectExpense(expense.id, comments);
      toast.error('Expense rejected.');
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h3>Review Expense {currentUser.role === 'Admin' && expense.current_approver_id !== currentUser.id && <span className="text-danger ml-2" style={{ fontSize: '0.8rem' }}>(Administrator Override)</span>}</h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Expense Summary card */}
          <div className="card mb-4" style={{ backgroundColor: 'var(--bg-tertiary)', border: 'none' }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted mb-1">Submitted By</p>
                <p style={{ fontWeight: 600 }}>{submitter?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Category</p>
                <p><span className="badge badge-info">{expense.category}</span></p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Amount (Submitted)</p>
                <p style={{ fontWeight: 700, fontSize: '1.4rem', color: 'var(--primary)' }}>
                  {expense.currency} {Number(expense.amount).toFixed(2)}
                </p>
                {converted !== null && (
                  <p className="text-xs text-muted">
                    ≈ {convertedCurrency} {converted.toFixed(2)} (company currency)
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Date</p>
                <p>{expense.expense_date ? new Date(expense.expense_date).toLocaleDateString() : '—'}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-muted mb-1">Description</p>
              <p>{expense.description}</p>
            </div>
            {expense.notes && (
              <div className="mt-3">
                <p className="text-xs text-muted mb-1">Notes</p>
                <p className="text-sm">{expense.notes}</p>
              </div>
            )}
          </div>

          {/* Approval history */}
          {expense.approval_history?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm" style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Approval Trail
              </p>
              {expense.approval_history.map((h, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded mb-2"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-light)' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    backgroundColor: h.action === 'Approved' ? 'var(--success-transparent)' : 'var(--danger-transparent)',
                    color: h.action === 'Approved' ? 'var(--success)' : 'var(--danger)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                  }}>
                    {h.action === 'Approved' ? '✓' : '✗'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span style={{ fontWeight: 500 }}>{h.approver_name || '—'}</span>
                      <span className="text-xs text-muted">{h.date ? new Date(h.date).toLocaleDateString() : '—'}</span>
                    </div>
                    <span className={`text-xs ${h.action === 'Approved' ? 'text-success' : 'text-danger'}`}>
                      {h.action}
                    </span>
                    {h.comments && <p className="text-xs text-subtle mt-1">"{h.comments}"</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comments field */}
          <div className="form-group mb-0">
            <label className="form-label">Comments (optional)</label>
            <textarea className="form-textarea" rows={3}
              value={comments} onChange={e => setComments(e.target.value)}
              placeholder="Add a note or reason for your decision…" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-outline-danger" onClick={() => handleAction('reject')}>
            <XCircle size={16} /> Reject
          </button>
          <button className="btn btn-success" onClick={() => handleAction('approve')}>
            <CheckCircle size={16} /> Approve
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Approvals Page ──────────────────────────────────────────────────────

export default function Approvals() {
  const { expenses, currentUser, users, companies, reopenExpense } = useStore();
  const toast = useToast();
  const [selected, setSelected] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('All');

  const company = companies.find(c => c.id === currentUser.company_id);

  // Expenses pending in this company
  const pendingApprovals = expenses.filter(e =>
    e.company_id === currentUser.company_id &&
    e.status === 'Pending'
  ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // History visibility: Admin/Manager see all org history, Employee isn't on this page
  const processedHistory = expenses.filter(e =>
    e.company_id === currentUser.company_id &&
    e.status !== 'Pending' &&
    (currentUser.role === 'Admin' || currentUser.role === 'Manager')
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const filteredHistory = historyFilter === 'All'
    ? processedHistory
    : processedHistory.filter(e => e.status === historyFilter);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Approvals</h2>
          <p className="text-subtle text-sm mt-2">Review and action pending expense claims</p>
        </div>
        {pendingApprovals.length > 0 && (
          <div style={{
            background: 'var(--warning-transparent)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.6rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            color: 'var(--warning)', fontWeight: 600
          }}>
            <AlertCircle size={16} />
            {pendingApprovals.length} pending
          </div>
        )}
      </div>

      {/* Pending Actions */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} style={{ color: 'var(--warning)' }} />
          <h3>Pending My Action</h3>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="text-center" style={{ padding: '2.5rem', color: 'var(--text-muted)' }}>
            <CheckCircle size={40} style={{ margin: '0 auto 1rem', color: 'var(--success)', opacity: 0.5 }} />
            <p>You're all caught up — no pending approvals.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount ({company?.default_currency})</th>
                  <th>Date</th>
                  <th>Step</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.map(exp => {
                  const submitter = users.find(u => u.id === exp.user_id);
                  const approver = users.find(u => u.id === exp.current_approver_id);
                  const isManagerStep = exp.sequence_step === -1;
                  const canAction = exp.current_approver_id === currentUser.id || currentUser.role === 'Admin';

                  return (
                    <tr key={exp.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%',
                            background: 'var(--primary-transparent)', color: 'var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.8rem', fontWeight: 700
                          }}>
                            {submitter?.name?.charAt(0) || '?'}
                          </div>
                          <span style={{ fontWeight: 500 }}>{submitter?.name || '—'}</span>
                        </div>
                      </td>
                      <td>{exp.description}</td>
                      <td><span className="badge badge-info">{exp.category}</span></td>
                      <td style={{ fontWeight: 600 }}>
                        {exp.currency} {Number(exp.amount).toFixed(2)}
                      </td>
                    <td className="text-subtle text-sm">
                      {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                        {isManagerStep ? 'Direct Manager' : `Step ${(exp.sequence_step || 0) + 1}`}
                      </span>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Awaiting: {approver?.name || 'Admin'}
                      </div>
                    </td>
                    <td>
                      <button 
                        className={`btn btn-sm ${canAction ? 'btn-primary' : 'btn-secondary'}`} 
                        onClick={() => setSelected(exp)}
                      >
                        {canAction ? 'Review' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>

    {/* History */}
    {processedHistory.length > 0 && (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3>Processed History</h3>
          <div className="flex gap-2">
            {['All', 'Approved', 'Rejected'].map(f => (
              <button key={f} onClick={() => setHistoryFilter(f)}
                className={`btn btn-sm ${historyFilter === f ? 'btn-primary' : 'btn-secondary'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Final Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map(exp => {
                const submitter = users.find(u => u.id === exp.user_id);
                return (
                  <tr key={exp.id}>
                    <td style={{ fontWeight: 500 }}>{submitter?.name || '—'}</td>
                    <td>{exp.description}</td>
                    <td>{exp.currency} {Number(exp.amount).toFixed(2)}</td>
                    <td className="text-subtle text-sm">
                      {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : '—'}
                    </td>
                      <td>
                        <div className="flex items-center gap-2">
                           {statusBadge(exp.status)}
                           {(currentUser.role === 'Admin' || currentUser.role === 'Manager') && (
                             <button 
                               title="Correct status / Reopen"
                               className="btn btn-icon btn-secondary btn-sm"
                               onClick={() => {
                                 reopenExpense(exp.id);
                                 toast.info('Status reset to Pending for correction.');
                               }}
                             >
                                <RefreshCw size={12} />
                             </button>
                           )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && <ApprovalModal expense={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
