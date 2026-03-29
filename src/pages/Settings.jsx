import { useState } from 'react';
import { useStore } from '../store.jsx';
import { useToast } from '../components/Toast.jsx';
import { Save, Plus, Trash2, ArrowUp, ArrowDown, Info } from 'lucide-react';

const RULE_TYPES = [
  {
    val:   'standard',
    label: 'Standard Sequential',
    desc:  'Each approver must approve in order. All must approve.'
  },
  {
    val:   'percentage',
    label: 'Percentage',
    desc:  'Expense approved once X% of the approvers have approved.'
  },
  {
    val:   'specific',
    label: 'Specific Approver',
    desc:  'Expense auto-approved as soon as a designated approver approves, regardless of order.'
  },
  {
    val:   'hybrid',
    label: 'Hybrid (Percentage OR Specific)',
    desc:  'Approved if the percentage threshold is met OR the specific approver approves — whichever comes first.'
  }
];

export default function Settings() {
  const { currentUser, users, companies, approvalRules, updateRule } = useStore();
  const toast = useToast();

  const company = companies.find(c => c.id === currentUser.company_id);
  const storedRule = approvalRules.find(r => r.company_id === currentUser.company_id);

  // Local state (controlled form)
  const [ruleType,    setRuleType]    = useState(storedRule?.type               || 'standard');
  const [sequence,    setSequence]    = useState(storedRule?.sequence            || []);
  const [percentage,  setPercentage]  = useState(storedRule?.percentage         ?? 60);
  const [specificId,  setSpecificId]  = useState(storedRule?.specific_approver_id || '');
  const [reqManager,  setReqManager]  = useState(storedRule?.requiresManagerApproval ?? true);
  const [saved,       setSaved]       = useState(false);

  const potentialApprovers = users.filter(
    u => u.company_id === currentUser.company_id && ['Manager', 'Admin'].includes(u.role)
  );

  const getUserName = (id) => users.find(u => u.id === id)?.name || id;
  const getUserRole = (id) => users.find(u => u.id === id)?.role || '';

  const addToSequence = (userId) => {
    if (userId && !sequence.includes(userId)) setSequence(s => [...s, userId]);
  };

  const removeStep = (uid) => setSequence(s => s.filter(id => id !== uid));

  const moveUp   = (i) => {
    const a = [...sequence];
    [a[i - 1], a[i]] = [a[i], a[i - 1]];
    setSequence(a);
  };
  const moveDown = (i) => {
    const a = [...sequence];
    [a[i], a[i + 1]] = [a[i + 1], a[i]];
    setSequence(a);
  };

  const handleSave = () => {
    updateRule(currentUser.company_id, {
      type:                 ruleType,
      sequence,
      percentage:           Number(percentage),
      specific_approver_id: specificId || null,
      requiresManagerApproval: reqManager
    });
    toast.success('Approval rules saved successfully.');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p className="text-subtle text-sm mt-2">
            Configure approval workflows for <strong>{company?.name}</strong>
          </p>
        </div>
        <button className="btn btn-primary" id="btn-save-settings" onClick={handleSave}>
          <Save size={18} /> {saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>

      {saved && (
        <div className="mb-6 p-3 rounded" style={{ backgroundColor: 'var(--success-transparent)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)' }}>
          ✓ Approval rules saved successfully.
        </div>
      )}

      {/* Workflow Pre-requisites */}
      <div className="card mb-6" style={{ borderLeft: '4px solid var(--primary)' }}>
        <h3 className="mb-2">Workflow Pre-requisites</h3>
        <p className="text-subtle text-sm mb-4">Initial steps before entering the formal approval sequence.</p>
        <label className="flex items-center gap-3 p-3 rounded cursor-pointer" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
          <input 
            type="checkbox" 
            checked={reqManager} 
            onChange={e => setReqManager(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
          />
          <div>
            <p style={{ fontWeight: 600 }}>Require Direct Manager Approval First</p>
            <p className="text-xs text-muted">If checked, expenses will first be routed to the employee's assigned manager.</p>
          </div>
        </label>
      </div>

      {/* Company Info */}
      <div className="card mb-6">
        <h3 className="mb-4">Company Information</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="stat-card">
            <p className="text-xs text-muted mb-1">Company Name</p>
            <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{company?.name}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted mb-1">Base Currency</p>
            <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{company?.default_currency}</p>
            <p className="text-xs text-muted mt-1">All expenses are compared in this currency</p>
          </div>
        </div>
      </div>

      {/* Approval Rule Type */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h3>Approval Rule Type</h3>
          <span title="How the system decides when an expense is approved">
            <Info size={16} style={{ color: 'var(--text-muted)' }} />
          </span>
        </div>
        <p className="text-subtle text-sm mb-4">
          Choose how expense approval is determined across your configured sequence.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {RULE_TYPES.map(rt => (
            <div
              key={rt.val}
              onClick={() => setRuleType(rt.val)}
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${ruleType === rt.val ? 'var(--primary)' : 'var(--border)'}`,
                backgroundColor: ruleType === rt.val ? 'var(--primary-transparent)' : 'var(--bg-tertiary)',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              <p style={{ fontWeight: 600, marginBottom: '0.35rem', color: ruleType === rt.val ? 'var(--primary)' : 'var(--text-primary)' }}>
                {rt.label}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{rt.desc}</p>
            </div>
          ))}
        </div>

        {/* Percentage config */}
        {(ruleType === 'percentage' || ruleType === 'hybrid') && (
          <div className="card mb-4" style={{ backgroundColor: 'var(--bg-tertiary)', border: 'none' }}>
            <label className="form-label">Required Approval Percentage</label>
            <div className="flex items-center gap-4">
              <input
                type="range" min={10} max={100} step={5}
                value={percentage}
                onChange={e => setPercentage(e.target.value)}
                style={{ flex: 1, accentColor: 'var(--primary)' }}
              />
              <div style={{
                minWidth: 68, padding: '0.5rem 1rem',
                backgroundColor: 'var(--primary-transparent)',
                color: 'var(--primary)', fontWeight: 700, borderRadius: 'var(--radius-md)',
                textAlign: 'center'
              }}>
                {percentage}%
              </div>
            </div>
            <p className="text-xs text-muted mt-2">
              Expense is approved once {percentage}% of approvers in the sequence have approved.
            </p>
          </div>
        )}

        {/* Specific approver config */}
        {(ruleType === 'specific' || ruleType === 'hybrid') && (
          <div className="card mb-4" style={{ backgroundColor: 'var(--bg-tertiary)', border: 'none' }}>
            <label className="form-label">Designated Auto-Approver</label>
            <select className="form-select" style={{ maxWidth: 400 }}
              value={specificId} onChange={e => setSpecificId(e.target.value)}>
              <option value="">— Select a specific approver —</option>
              {potentialApprovers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
            <p className="text-xs text-muted mt-2">
              Approving by this person will immediately mark the expense as Approved.
            </p>
          </div>
        )}
      </div>

      {/* Approval Sequence */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="mb-1">Approval Sequence</h3>
            <p className="text-subtle text-sm">
              Define the order in which approvers receive the expense.
              Employees with a Manager set will first go through their manager, then follow this sequence.
            </p>
          </div>
        </div>

        {/* Add approver row */}
        <div className="flex items-center gap-3 mb-4 p-3 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px dashed var(--border)' }}>
          <select className="form-select" style={{ flex: 1 }} id="seq-select">
            <option value="">Select approver to add…</option>
            {potentialApprovers
              .filter(u => !sequence.includes(u.id))
              .map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
          <button
            className="btn btn-primary btn-sm"
            style={{ whiteSpace: 'nowrap' }}
            onClick={() => {
              const sel = document.getElementById('seq-select');
              if (sel.value) { addToSequence(sel.value); sel.value = ''; }
            }}
          >
            <Plus size={16} /> Add to Sequence
          </button>
        </div>

        {sequence.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>No approval sequence defined.</p>
            <p className="text-sm mt-1">Expenses will require only the employee's direct manager (if set), or any Admin.</p>
          </div>
        ) : (
          <div>
            {/* Header row */}
            <div className="flex items-center gap-3 px-3 mb-2">
              <span style={{ width: 28 }}></span>
              <span className="text-xs text-muted flex-1">Approver</span>
              <span className="text-xs text-muted" style={{ width: 80, textAlign: 'center' }}>Role</span>
              <span style={{ width: 100 }}></span>
            </div>
            {sequence.map((uid, idx) => (
              <div
                key={uid}
                className="flex items-center gap-3 p-3 rounded mb-2"
                style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                  color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.8rem', flexShrink: 0
                }}>
                  {idx + 1}
                </div>
                <span className="flex-1" style={{ fontWeight: 600 }}>
                  {getUserName(uid)}
                </span>
                <span style={{ width: 80, textAlign: 'center' }}>
                  <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{getUserRole(uid)}</span>
                </span>
                <div className="flex items-center gap-1" style={{ width: 100, justifyContent: 'flex-end' }}>
                  <button className="btn btn-icon btn-secondary" onClick={() => moveUp(idx)} disabled={idx === 0} title="Move up">
                    <ArrowUp size={13} />
                  </button>
                  <button className="btn btn-icon btn-secondary" onClick={() => moveDown(idx)} disabled={idx === sequence.length - 1} title="Move down">
                    <ArrowDown size={13} />
                  </button>
                  <button className="btn btn-icon btn-outline-danger" onClick={() => removeStep(uid)} title="Remove">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
