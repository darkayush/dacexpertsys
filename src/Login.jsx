import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { loginWithCredentials, loginWithGoogle } from './services/api';
import { useAuth } from './context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef(null);
  const googleInitializedRef = useRef(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleRoleRedirect = (role) => {
    const normalizedRole = String(role || '').toLowerCase();

    if (normalizedRole === 'student') {
      navigate('/student-dashboard');
      return;
    }
    if (normalizedRole === 'warden') {
      navigate('/warden-dashboard');
      return;
    }
    if (normalizedRole === 'chief_warden') {
      navigate('/chief-dashboard');
      return;
    }
    if (normalizedRole === 'dsw') {
      navigate('/dsw-dashboard');
      return;
    }
    if (normalizedRole === 'admin') {
      navigate('/admin-dashboard');
      return;
    }

    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      const payload = await loginWithCredentials(email, password);
      login(payload);
      handleRoleRedirect(payload?.user?.role);
    } catch (err) {
      setAuthError(err?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId || googleInitializedRef.current) return;

    const loadScript = () =>
      new Promise((resolve, reject) => {
        if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
        document.body.appendChild(script);
      });

    loadScript()
      .then(() => {
        if (!window.google || googleInitializedRef.current) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            try {
              setAuthError('');
              setGoogleLoading(true);
              const payload = await loginWithGoogle(response.credential);
              login(payload);
              handleRoleRedirect(payload?.user?.role);
            } catch (err) {
              setAuthError(err?.message || 'Google login failed');
            } finally {
              setGoogleLoading(false);
            }
          },
        });

        if (googleButtonRef.current) {
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
            shape: 'pill',
          });
        }

        googleInitializedRef.current = true;
      })
      .catch((err) => {
        setAuthError(err?.message || 'Google login failed');
      });
  }, [googleClientId, login]);

  return (
    <div className="min-h-screen w-screen bg-[#f0f2fb] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans antialiased text-slate-800">
      {/* Outer Rounded Container Canvas inspired by reference */}
      <div className="w-full max-w-5xl bg-white rounded-[36px] shadow-[0_20px_60px_rgba(92,84,235,0.08)] border border-white overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* ── LEFT PANEL: Lavender / Violet SaaS Hero ── */}
        <div className="lg:col-span-6 bg-gradient-to-br from-[#f8f9ff] via-[#ede9fe]/40 to-[#f3f0ff] p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-indigo-100/60">
          {/* Abstract soft decorative purple shapes */}
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-[#5c54eb]/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-purple-400/15 blur-3xl pointer-events-none" />
          
          {/* University Identity Header */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-[#5c54eb] text-white flex items-center justify-center shadow-md shadow-purple-500/25">
                <span className="material-symbols-outlined text-[26px]">gavel</span>
              </div>
              <div>
                <h2 className="text-base font-black text-[#1e1b4b] leading-tight">
                  DAC Expert System
                </h2>
                <span className="text-xs font-bold text-[#5c54eb] uppercase tracking-wider">
                  BML Munjal University
                </span>
              </div>
            </div>
          </div>

          {/* Whimsical SVG illustration & Hero Copy */}
          <div className="relative z-10 my-8">
            <div className="w-48 h-48 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-full h-full text-[#5c54eb]" viewBox="0 0 200 200" fill="none">
                <circle cx="100" cy="100" r="80" fill="#ede9fe" />
                <rect x="55" y="60" width="90" height="95" rx="16" fill="white" stroke="#5c54eb" strokeWidth="4" />
                <path d="M75 90H125" stroke="#5c54eb" strokeWidth="4" strokeLinecap="round" />
                <path d="M75 110H115" stroke="#5c54eb" strokeWidth="4" strokeLinecap="round" />
                <path d="M75 130H100" stroke="#5c54eb" strokeWidth="4" strokeLinecap="round" />
                <circle cx="140" cy="70" r="14" fill="#5c54eb" />
                <path d="M136 70L139 73L145 67" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#1e1b4b] tracking-tight leading-tight text-center">
              Streamline Disciplinary Actions Across Campus.
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-slate-500 font-medium text-center max-w-sm mx-auto leading-relaxed">
              Institutional incident tracking, multi-tier committee escalations, and policy retrieval in one unified workspace.
            </p>
          </div>

          {/* Footer note */}
          <div className="relative z-10 pt-4 border-t border-indigo-100/60 flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span>&copy; {new Date().getFullYear()} BMU</span>
            <span className="text-[#5c54eb]">Enterprise Disciplinary Portal</span>
          </div>
        </div>

        {/* ── RIGHT PANEL: Large Rounded Login Card ── */}
        <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-6">
              <span className="px-3 py-1 rounded-full bg-purple-50 text-[#5c54eb] text-xs font-bold border border-purple-100 inline-block mb-3">
                Secure Sign-in
              </span>
              <h2 className="text-2xl font-black text-[#1e1b4b] tracking-tight">
                Welcome back
              </h2>
              <p className="mt-1 text-xs text-slate-400 font-medium">
                Enter your university credentials to access the DAC system
              </p>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-5 p-3.5 rounded-2xl bg-[#ffe4e6] border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2.5"
                >
                  <span className="material-symbols-outlined text-[18px] text-rose-600">error</span>
                  <span>{authError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@bmu.edu.in"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5c54eb] focus:bg-white focus:ring-4 focus:ring-purple-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-bold text-[#5c54eb] hover:text-indigo-800 transition-colors"
                  >
                    {showPassword ? 'Hide password' : 'Show password'}
                  </button>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5c54eb] focus:bg-white focus:ring-4 focus:ring-purple-100 transition-all"
                  />
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-[#5c54eb] hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-purple-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 mt-2"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    progress_activity
                  </span>
                ) : (
                  <>
                    <span>Sign in to Workspace</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">
                OR
              </span>
            </div>

            {/* Google Sign In Container */}
            <div className="w-full flex justify-center">
              {googleClientId ? (
                <div ref={googleButtonRef} className="w-full flex justify-center" />
              ) : (
                <p className="text-[11px] text-center text-slate-400">
                  Google SSO not configured in environment
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}