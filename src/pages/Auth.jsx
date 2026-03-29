import { useState, useEffect } from 'react';
import { useStore } from '../store.jsx';
import { useToast } from '../components/Toast.jsx';
import { LogIn, Coins, KeyRound, ArrowLeft, Info, RefreshCw, Building2, UserPlus } from 'lucide-react';

export default function Auth() {
  const [mode, setMode]       = useState('login'); // login | signup | forgot
  const { login, signup, forgotPassword, clearDatabase } = useStore();
  const toast                 = useToast();
  const [loading, setLoading] = useState(false);

  // Form states
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,        setName]        = useState('');
  const [companyName, setCompanyName] = useState('');
  const [currency,    setCurrency]    = useState('USD');
  const [currencies,  setCurrencies]  = useState([]);
  const [loadingCurr, setLoadingCurr] = useState(false);

  useEffect(() => {
    if (mode === 'signup' && currencies.length === 0) {
      setLoadingCurr(true);
      fetch('https://restcountries.com/v3.1/all?fields=name,currencies')
        .then(r => r.json())
        .then(data => {
          const map = new Map();
          data.forEach(c => {
            if (!c.currencies || !c.name?.common) return;
            const codes = Object.keys(c.currencies);
            if (!codes.length) return;
            const code = codes[0];
            const obj  = c.currencies[code];
            if (!obj?.name) return;
            map.set(code, `${code} – ${obj.name} (${c.name.common})`);
          });
          const arr = [...map].map(([code, label]) => ({ code, label }))
                              .sort((a, b) => a.code.localeCompare(b.code));
          setCurrencies(arr);
          const usd = arr.find(x => x.code === 'USD');
          setCurrency(usd ? 'USD' : arr[0]?.code || 'USD');
        })
        .catch(() => {
          const fallback = [
            { code: 'USD', label: 'USD – US Dollar' },
            { code: 'EUR', label: 'EUR – Euro' },
            { code: 'GBP', label: 'GBP – British Pound' },
            { code: 'INR', label: 'INR – Indian Rupee' },
            { code: 'JPY', label: 'JPY – Japanese Yen' },
          ];
          setCurrencies(fallback);
          setCurrency('USD');
        })
        .finally(() => setLoadingCurr(false));
    }
  }, [mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (mode === 'login') {
      const r = login(email, password);
      if (!r.success) { 
        toast.error(r.error); 
        setLoading(false); 
      }
    } else if (mode === 'signup') {
      const r = signup(name, email, password, companyName, currency);
      if (!r.success) { 
        toast.error(r.error); 
        setLoading(false); 
      } else {
        toast.success('Workspace created! Welcome to ExpenseFlow.');
      }
    } else if (mode === 'forgot') {
      const r = forgotPassword(email);
      if (r.success) {
        toast.info(`Recovery info: Your password is "${r.password}". Log in now.`);
        setMode('login');
      } else {
        toast.error(r.error);
      }
      setLoading(false);
    }
  };

  const isLogin  = mode === 'login';
  const isForgot = mode === 'forgot';
  const isSignup = mode === 'signup';

  return (
    <div className="auth-page">
      <div className="glass-panel auth-card">
        {/* Brand */}
        <div className="text-center mb-6">
          <div style={{
            width: 52, height: 52, margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Coins size={26} color="white" />
          </div>
          <h2 style={{ color: 'var(--primary)', marginBottom: '0.25rem' }}>ExpenseFlow</h2>
          <p className="text-subtle text-sm">
            {isSignup ? 'Create your company workspace' : isForgot ? 'Password recovery' : 'Sign in to your workspace'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isSignup && (
            <>
              <div className="form-group mb-0">
                <label className="form-label">
                  <Building2 size={12} style={{ display:'inline', marginRight:'0.25rem' }} />
                  Company Name
                </label>
                <input className="form-input" type="text" required autoFocus
                  value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder="Acme Corporation" />
              </div>

              <div className="form-group mb-0">
                <label className="form-label">Base Currency</label>
                {loadingCurr ? (
                  <div className="form-input text-muted text-xs">Loading currencies…</div>
                ) : (
                  <select className="form-select" value={currency} onChange={e => setCurrency(e.target.value)} required>
                    {currencies.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                )}
              </div>

              <div className="form-group mb-0">
                <label className="form-label">Your Full Name</label>
                <input className="form-input" type="text" required
                  value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" />
              </div>
            </>
          )}

          <div className="form-group mb-0">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" required autoFocus={!isSignup}
              value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
              autoComplete="email" />
          </div>

          {!isForgot && (
            <div className="form-group mb-0">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label mb-0">Password</label>
                {isLogin && (
                  <span className="auth-link text-xs" onClick={() => setMode('forgot')}>
                    Forgot?
                  </span>
                )}
              </div>
              <input className="form-input" type="password" required
                value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                autoComplete={isLogin ? 'current-password' : 'new-password'} />
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '0.5rem' }} disabled={loading}>
            {isLogin && <><LogIn size={17} /> {loading ? 'Signing in…' : 'Sign In'}</>}
            {isSignup && <><UserPlus size={17} /> {loading ? 'Creating…' : 'Create Workspace'}</>}
            {isForgot && <><KeyRound size={17} /> {loading ? 'Checking…' : 'Send Recovery Info'}</>}
          </button>
        </form>

        {isLogin && (
          <div className="mt-8 text-center">
             <button 
                onClick={() => setMode('signup')}
                className="auth-link text-sm font-medium"
              >
                No workplace? Create one
              </button>
          </div>
        )}

        <div className="text-center mt-6 text-sm">
          {!isLogin && (
            <span className="auth-link flex items-center justify-center gap-1" onClick={() => setMode('login')}>
              <ArrowLeft size={14} /> Back to Sign in
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
