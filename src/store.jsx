import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const StoreContext = createContext();

// ─── Constants ──────────────────────────────────────────────────────────────
const PREFIX = 'expense_flow_v1_';

// ─── Advanced Persistent JSON Database Layer ──────────────────────────────────
// Using a robust singleton to ensure data consistency
const db = {
  save: (key, data) => {
    try {
      localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('DB STORAGE ERROR:', e);
      return false;
    }
  },
  load: (key, fallback) => {
    try {
      const val = localStorage.getItem(`${PREFIX}${key}`);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  },
  clear: () => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(PREFIX)) localStorage.removeItem(k);
    });
    window.location.reload();
  }
};

const generateId = (prefix = 'id') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const DEFAULT_COMPANY_ID = 'co_master_1';
const DEFAULT_COMPANY = { 
  id: DEFAULT_COMPANY_ID, 
  name: 'ExpenseFlow Org', 
  default_currency: 'USD' 
};

const DEFAULT_ADMIN = { 
  id: 'u_admin_master', 
  name: 'System Admin', 
  email:    import.meta.env.VITE_ADMIN_EMAIL    || 'admin@expenseflow.com', 
  password: import.meta.env.VITE_ADMIN_PASSWORD || 'admin', 
  role: 'Admin', 
  company_id: DEFAULT_COMPANY_ID, 
  manager_id: null 
};

const DEFAULT_RULE = {
  company_id: DEFAULT_COMPANY_ID,
  sequence: [],
  type: 'standard',
  percentage: 60,
  specific_approver_id: null,
  requiresManagerApproval: true
};

// ─── Approval routing logic ──────────────────────────────────────────────────
function resolveFirstApprover(expense, submitterUser, allUsers, rule) {
  // If the rule requires manager approval AND employee has a manager, start there
  if (rule?.requiresManagerApproval && submitterUser.manager_id) {
    const mgr = allUsers.find(u => u.id === submitterUser.manager_id);
    if (mgr) return { current_approver_id: mgr.id, sequence_step: -1 };
  }
  // Otherwise start at formal sequence step 0
  if (rule?.sequence?.length > 0) {
    return { current_approver_id: rule.sequence[0], sequence_step: 0 };
  }
  // Fallback: find any Admin
  const admin = allUsers.find(u => u.role === 'Admin' && u.company_id === submitterUser.company_id);
  return { current_approver_id: admin?.id || null, sequence_step: 0 };
}

function resolveNextApprover(expense, approvingUser, allApprovals, rule) {
  const type = rule?.type || 'standard';
  const sequence = rule?.sequence || [];

  if ((type === 'specific' || type === 'hybrid') && rule.specific_approver_id && approvingUser.id === rule.specific_approver_id) {
    return { next_approver_id: null, next_step: expense.sequence_step, final_status: 'Approved' };
  }

  if (type === 'percentage' || type === 'hybrid') {
    const totalApprovers = sequence.length;
    const approvedCount = allApprovals.filter(h => h.action === 'Approved').length + 1;
    const pct = totalApprovers > 0 ? (approvedCount / totalApprovers) * 100 : 100;
    if (pct >= (rule.percentage || 60)) return { next_approver_id: null, next_step: expense.sequence_step, final_status: 'Approved' };
  }

  if (expense.sequence_step === -1) {
    if (sequence.length > 0) return { next_approver_id: sequence[0], next_step: 0, final_status: 'Pending' };
    return { next_approver_id: null, next_step: 0, final_status: 'Approved' };
  }

  const nextStep = (expense.sequence_step || 0) + 1;
  if (nextStep < sequence.length) return { next_approver_id: sequence[nextStep], next_step: nextStep, final_status: 'Pending' };
  return { next_approver_id: null, next_step: nextStep, final_status: 'Approved' };
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function StoreProvider({ children }) {
  // Database initialization
  const [currentUser,  setCurrentUser]  = useState(() => db.load('user', null));
  const [users,        setUsers]        = useState(() => db.load('users', [DEFAULT_ADMIN]));
  const [companies,    setCompanies]    = useState(() => db.load('companies', [DEFAULT_COMPANY]));
  const [expenses,     setExpenses]     = useState(() => db.load('expenses', []));
  const [approvalRules, setApprovalRules] = useState(() => db.load('rules', [DEFAULT_RULE]));
  const [fxCache,      setFxCache]      = useState({});
  const [isSyncing,    setIsSyncing]    = useState(false);

  // ── Unified Database Synchronization ──
  useEffect(() => {
    setIsSyncing(true);
    db.save('user',      currentUser);
    db.save('users',     users);
    db.save('companies', companies);
    db.save('expenses',  expenses);
    db.save('rules',     approvalRules);
    
    // Artificial latency for "Database Sync" effect
    const t = setTimeout(() => setIsSyncing(false), 300);
    return () => clearTimeout(t);
  }, [currentUser, users, companies, expenses, approvalRules]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = (email, password) => {
    const user = users.find(u => u.email?.toLowerCase() === email?.toLowerCase() && u.password === password);
    if (!user) return { success: false, error: 'Invalid email or password.' };
    setCurrentUser(user);
    return { success: true };
  };

  const logout = () => setCurrentUser(null);

  const signup = (name, email, password, companyName, currency) => {
    if (users.some(u => u.email?.toLowerCase() === email?.toLowerCase()))
      return { success: false, error: 'An account with this email already exists.' };

    const companyId = generateId('co');
    const userId   = generateId('u');

    const newCompany = { id: companyId, name: companyName, default_currency: currency || 'USD' };
    const newUser    = { id: userId, name, email, password, role: 'Admin', company_id: companyId, manager_id: null };
    const newRule    = {
      company_id: companyId,
      sequence: [],
      type: 'standard',
      percentage: 60,
      specific_approver_id: null,
      requiresManagerApproval: true // Default to true based on prompt emphasis
    };

    setCompanies(p => [...p, newCompany]);
    setUsers(p => [...p, newUser]);
    setApprovalRules(p => [...p, newRule]);
    setCurrentUser(newUser);

    return { success: true };
  };

  const forgotPassword = (email) => {
    const user = users.find(u => u.email?.toLowerCase() === email?.toLowerCase());
    if (!user) return { success: false, error: 'No account found with this email.' };
    return { success: true, password: user.password };
  };

  // ── User management ───────────────────────────────────────────────────────
  const createUser = (userData) => {
    if (users.some(u => u.email?.toLowerCase() === userData.email?.toLowerCase()))
      return { success: false, error: 'Email already in use.' };
    const newUser = {
      ...userData,
      id: generateId('u'),
      company_id: currentUser.company_id
    };
    setUsers(p => [...p, newUser]);
    return { success: true, user: newUser };
  };

  const updateUser = (userId, updates) => {
    setUsers(p => p.map(u => u.id === userId ? { ...u, ...updates } : u));
    if (currentUser?.id === userId) setCurrentUser(p => ({ ...p, ...updates }));
  };

  // ── Expense submission ────────────────────────────────────────────────────
  const submitExpense = (expenseData) => {
    const submitter = users.find(u => u.id === currentUser.id) || currentUser;
    const rule = approvalRules.find(r => r.company_id === currentUser.company_id);
    const { current_approver_id, sequence_step } = resolveFirstApprover(expenseData, submitter, users, rule);

    const newExpense = {
      ...expenseData,
      id: generateId('exp'),
      user_id: currentUser.id,
      company_id: currentUser.company_id,
      status: 'Pending',
      approval_history: [],
      current_approver_id,
      sequence_step,
      created_at: new Date().toISOString()
    };

    setExpenses(p => [...p, newExpense]);
    return { success: true };
  };

  // ── Approve expense ───────────────────────────────────────────────────────
  const approveExpense = (expenseId, comments = '') => {
    setExpenses(p => p.map(expense => {
      if (expense.id !== expenseId) return expense;
      const rule = approvalRules.find(r => r.company_id === expense.company_id);
      const newHistoryEntry = {
        approver_id: currentUser.id,
        approver_name: currentUser.name,
        action: 'Approved',
        comments,
        date: new Date().toISOString()
      };
      const allApprovals = [...expense.approval_history, newHistoryEntry];
      
      if (currentUser.role === 'Admin') {
        return { ...expense, status: 'Approved', current_approver_id: null, approval_history: allApprovals };
      }

      const { next_approver_id, next_step, final_status } = resolveNextApprover(expense, currentUser, allApprovals, rule);
      return {
        ...expense,
        status: final_status,
        current_approver_id: next_approver_id,
        sequence_step: next_step,
        approval_history: allApprovals
      };
    }));
  };

  const rejectExpense = (expenseId, comments = '') => {
    setExpenses(p => p.map(expense => {
      if (expense.id !== expenseId) return expense;
      return {
        ...expense,
        status: 'Rejected',
        current_approver_id: null,
        approval_history: [
          ...expense.approval_history,
          {
            approver_id: currentUser.id,
            approver_name: currentUser.name,
            action: 'Rejected',
            comments,
            date: new Date().toISOString()
          }
        ]
      };
    }));
  };

  const updateRule = (companyId, updates) => {
    setApprovalRules(p => p.map(r => r.company_id === companyId ? { ...r, ...updates } : r));
  };

  const convertCurrency = useCallback(async (amount, fromCurrency, toCurrency) => {
    if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return Number(amount);
    const base = fromCurrency.toUpperCase();
    const to   = toCurrency.toUpperCase();
    const cached = fxCache[base];
    const now = Date.now();
    if (cached && now - cached.fetchedAt < 3600000 && cached.rates[to]) {
      return Number(amount) * cached.rates[to];
    }
    try {
      const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
      const data = await res.json();
      setFxCache(p => ({ ...p, [base]: { rates: data.rates, fetchedAt: now } }));
      return Number(amount) * (data.rates[to] || 1);
    } catch {
      return Number(amount);
    }
  }, [fxCache]);

  return (
    <StoreContext.Provider value={{
      currentUser, users, companies, expenses, approvalRules, fxCache, isSyncing,
      login, logout, signup, forgotPassword,
      createUser, updateUser,
      submitExpense, approveExpense, rejectExpense,
      updateRule,
      convertCurrency,
      clearDatabase: db.clear
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);
