import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store.jsx';
import { useToast } from '../components/Toast.jsx';
import { Plus, Upload, X, FileText, RefreshCw, Eye } from 'lucide-react';

const CATEGORIES = ['Travel', 'Meals', 'Accommodation', 'Office Supplies', 'Utilities', 'Entertainment', 'Training', 'Medical', 'Other'];

const statusBadge = (status) => {
  const map = { Pending: 'badge-warning', Approved: 'badge-success', Rejected: 'badge-danger' };
  return <span className={`badge ${map[status] || 'badge-info'}`}>{status}</span>;
};

// ─── OCR Scanner ─────────────────────────────────────────────────────────────

function OCRScanner({ onExtracted }) {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [statusText, setStatusText] = useState('');
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setScanning(true);
    setProgress(10);
    setStatusText('Loading OCR engine…');

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(20 + Math.round(m.progress * 70));
            setStatusText(`Recognizing text… ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      setProgress(20);
      setStatusText('Scanning receipt…');
      const result = await worker.recognize(file);
      await worker.terminate();

      setProgress(100);
      setStatusText('Done!');

      const text = result.data.text;
      const lowerText = text.toLowerCase();

      // Better Amount Extraction
      const amounts = text.match(/(\d{1,4}[.,]\d{2})/g) || [];
      const parsedAmounts = amounts.map(a => parseFloat(a.replace(',', ''))).filter(n => !isNaN(n));
      const maxAmount = parsedAmounts.length > 0 ? Math.max(...parsedAmounts) : '';
      
      const kwordAmountMatch = 
        text.match(/(?:total|amount|paid|sum|due|net)[^\d]*\$?\s*(\d[\d,]*\.?\d{0,2})/i);
      
      const finalAmount = kwordAmountMatch ? kwordAmountMatch[1].replace(',', '') : (maxAmount ? maxAmount.toString() : '');

      // Better Date Extraction
      const dateMatch =
        text.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/) ||
        text.match(/\b(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/) ||
        text.match(/\b(\w{3,9} \d{1,2},? \d{4})\b/i);

      // Auto-Category Detection
      let detectedCategory = CATEGORIES[0]; // Default
      if (lowerText.includes('restaurant') || lowerText.includes('food') || lowerText.includes('meal') || lowerText.includes('cafe') || lowerText.includes('dine')) detectedCategory = 'Meals';
      else if (lowerText.includes('hotel') || lowerText.includes('inn') || lowerText.includes('stay') || lowerText.includes('room')) detectedCategory = 'Accommodation';
      else if (lowerText.includes('uber') || lowerText.includes('taxi') || lowerText.includes('flight') || lowerText.includes('air') || lowerText.includes('train')) detectedCategory = 'Travel';
      else if (lowerText.includes('staples') || lowerText.includes('office') || lowerText.includes('paper') || lowerText.includes('ink')) detectedCategory = 'Office Supplies';
      else if (lowerText.includes('doctor') || lowerText.includes('pharmacy') || lowerText.includes('hospital') || lowerText.includes('medical')) detectedCategory = 'Medical';

      // Merchant Name Heuristic
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3 && !/[0-9]/.test(l[0]));
      const merchantName = lines.length > 0 ? lines[0].slice(0, 50) : '';

      onExtracted({
        amount:       finalAmount,
        expense_date: dateMatch   ? (dateMatch[1] || dateMatch[0]) : new Date().toISOString().slice(0, 10),
        description:  merchantName || text.slice(0, 80).replace(/\n/g, ' ').trim(),
        category:     detectedCategory,
        ocr_raw:      text
      });

      setTimeout(() => { setScanning(false); setStatusText(''); setProgress(0); }, 800);
    } catch (err) {
      console.error('OCR error', err);
      setStatusText('OCR failed – fill in manually.');
      setScanning(false);
    }
  };

  return (
    <div>
      <div
        className={`scanner-box ${scanning ? 'scanning' : ''}`}
        onClick={() => !scanning && fileRef.current?.click()}
        title="Click to upload a receipt image for OCR"
      >
        {preview ? (
          <img src={preview} alt="Receipt preview" className="receipt-preview" style={{ maxHeight: 180 }} />
        ) : (
          <>
            <Upload size={36} style={{ color: 'var(--primary)' }} />
            <p className="text-subtle text-sm">Click or drop a receipt image to auto-fill fields via OCR</p>
            <p className="text-xs text-muted">JPG, PNG, WEBP supported</p>
          </>
        )}
        {scanning && (
          <p className="text-sm" style={{ color: 'var(--primary)', marginTop: '0.5rem' }}>
            <RefreshCw size={14} style={{ display: 'inline', marginRight: '0.25rem', animation: 'spin 1s linear infinite' }} />
            {statusText}
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
      </div>
      {scanning && (
        <div className="progress-bar mt-2">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── Expense Detail Modal ─────────────────────────────────────────────────────

function ExpenseDetailModal({ expense, onClose }) {
  const { users } = useStore();
  const submitter = users.find(u => u.id === expense.user_id);
  const currentApprover = users.find(u => u.id === expense.current_approver_id);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3>Expense Detail</h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted">Description</p>
              <p style={{ fontWeight: 600 }}>{expense.description}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Category</p>
              <p><span className="badge badge-info">{expense.category}</span></p>
            </div>
            <div>
              <p className="text-xs text-muted">Amount</p>
              <p style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)' }}>
                {expense.currency} {Number(expense.amount).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Date</p>
              <p>{expense.expense_date ? new Date(expense.expense_date).toLocaleDateString() : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Status</p>
              {(() => { const map = { Pending: 'badge-warning', Approved: 'badge-success', Rejected: 'badge-danger' }; return <span className={`badge ${map[expense.status] || 'badge-info'}`}>{expense.status}</span>; })()}
            </div>
            {currentApprover && expense.status === 'Pending' && (
              <div>
                <p className="text-xs text-muted">Awaiting Approval From</p>
                <p style={{ fontWeight: 500 }}>{currentApprover.name}</p>
              </div>
            )}
          </div>

          {expense.notes && (
            <div className="mb-4 p-3 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <p className="text-xs text-muted mb-1">Notes</p>
              <p className="text-sm">{expense.notes}</p>
            </div>
          )}

          {expense.approval_history?.length > 0 && (
            <div>
              <p className="text-sm text-subtle mb-2" style={{ fontWeight: 600 }}>Approval Trail</p>
              {expense.approval_history.map((h, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded mb-2"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-light)' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    backgroundColor: h.action === 'Approved' ? 'var(--success-transparent)' : 'var(--danger-transparent)',
                    color: h.action === 'Approved' ? 'var(--success)' : 'var(--danger)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700
                  }}>
                    {h.action === 'Approved' ? '✓' : '✗'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span style={{ fontWeight: 500 }}>{h.approver_name || users.find(u => u.id === h.approver_id)?.name || 'Unknown'}</span>
                      <span className="text-xs text-muted">{h.date ? new Date(h.date).toLocaleDateString() : ''}</span>
                    </div>
                    <span className={`text-xs ${h.action === 'Approved' ? 'text-success' : 'text-danger'}`}>{h.action}</span>
                    {h.comments && <p className="text-xs text-subtle mt-1">{h.comments}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Submit Expense Modal ─────────────────────────────────────────────────────

function ExpenseModal({ onClose }) {
  const { submitExpense, companies, currentUser } = useStore();
  const toast   = useToast();
  const company = companies.find(c => c.id === currentUser.company_id);

  const [form, setForm] = useState({
    description:  '',
    category:     CATEGORIES[0],
    amount:       '',
    currency:     company?.default_currency || 'USD',
    expense_date: new Date().toISOString().slice(0, 10),
    notes:        ''
  });
  const [error, setError]           = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleOCR = extracted => {
    if (extracted.amount || extracted.description) {
      toast.info('Receipt scanned – fields auto-filled!');
    }
    setForm(f => ({
      ...f,
      amount:       extracted.amount || f.amount,
      description:  extracted.description || f.description,
      expense_date: extracted.expense_date || f.expense_date,
      category:     extracted.category || f.category
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    setSubmitting(true);
    const result = submitExpense(form);
    if (result.success) {
      toast.success('Expense submitted and sent for approval!');
      onClose();
    } else {
      setError(result.error || 'Failed to submit.');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h3>Submit New Expense</h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <OCRScanner onExtracted={handleOCR} />

          {error && (
            <div className="mt-4 p-3 rounded" style={{ backgroundColor: 'var(--danger-transparent)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="form-group mb-0">
                <label className="form-label">Amount *</label>
                <input className="form-input" type="number" step="0.01" min="0.01" required
                  value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">Currency *</label>
                <select className="form-select" value={form.currency} onChange={e => set('currency', e.target.value)} required>
                  <option value="USD">USD – US Dollar</option>
                  <option value="EUR">EUR – Euro</option>
                  <option value="GBP">GBP – British Pound</option>
                  <option value="INR">INR – Indian Rupee</option>
                  <option value="JPY">JPY – Japanese Yen</option>
                  <option value="CAD">CAD – Canadian Dollar</option>
                  <option value="AUD">AUD – Australian Dollar</option>
                  <option value="SGD">SGD – Singapore Dollar</option>
                  <option value="AED">AED – Dirham</option>
                  <option value="CNY">CNY – Yuan</option>
                </select>
              </div>
            </div>

            <div className="form-group mt-4 mb-0">
              <label className="form-label">Category *</label>
              <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group mt-4 mb-0">
              <label className="form-label">Description *</label>
              <input className="form-input" type="text" required
                value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Brief description (e.g. Dinner with client)" />
            </div>

            <div className="form-group mt-4 mb-0">
              <label className="form-label">Date *</label>
              <input className="form-input" type="date" required
                value={form.expense_date} onChange={e => set('expense_date', e.target.value)} />
            </div>

            <div className="form-group mt-4 mb-0">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={2}
                value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Additional context…" />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Expenses() {
  const { expenses, currentUser } = useStore();
  const [showModal, setShowModal]   = useState(false);
  const [filter, setFilter]         = useState('All');
  const [detailExp, setDetailExp]   = useState(null);

  const myExpenses = expenses
    .filter(e => e.user_id === currentUser.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const filtered = filter === 'All' ? myExpenses : myExpenses.filter(e => e.status === filter);

  const counts = {
    All:      myExpenses.length,
    Pending:  myExpenses.filter(e => e.status === 'Pending').length,
    Approved: myExpenses.filter(e => e.status === 'Approved').length,
    Rejected: myExpenses.filter(e => e.status === 'Rejected').length
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>My Expenses</h2>
          <p className="text-subtle text-sm mt-2">Submit and track your expense claims</p>
        </div>
        <button className="btn btn-primary" id="btn-new-expense" onClick={() => setShowModal(true)}>
          <Plus size={18} /> New Expense
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {['All', 'Pending', 'Approved', 'Rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
          >
            {f}
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: '50%',
              backgroundColor: filter === f ? 'rgba(255,255,255,0.2)' : 'var(--bg-color)',
              fontSize: '0.7rem', fontWeight: 700
            }}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="text-center" style={{ padding: '3rem' }}>
            <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', opacity: 0.4 }} />
            <p className="text-muted">
              {filter === 'All'
                ? 'No expenses yet – submit your first one!'
                : `No ${filter.toLowerCase()} expenses.`}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Awaiting</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(exp => (
                  <tr key={exp.id} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 500 }}>{exp.description}</td>
                    <td><span className="badge badge-info">{exp.category}</span></td>
                    <td style={{ fontWeight: 600 }}>
                      {exp.currency} {Number(exp.amount).toFixed(2)}
                    </td>
                    <td className="text-subtle text-sm">
                      {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : '—'}
                    </td>
                    <td>{statusBadge(exp.status)}</td>
                    <td className="text-subtle text-sm">
                      {exp.status === 'Pending' && exp.current_approver_id
                        ? <span style={{ color: 'var(--warning)' }}>Awaiting review</span>
                        : '—'}
                    </td>
                    <td>
                      <button
                        className="btn btn-icon btn-secondary"
                        title="View detail"
                        onClick={() => setDetailExp(exp)}
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <ExpenseModal onClose={() => setShowModal(false)} />}
      {detailExp && <ExpenseDetailModal expense={detailExp} onClose={() => setDetailExp(null)} />}
    </div>
  );
}
