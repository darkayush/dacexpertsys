import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { loginWithEmail, loginWithGoogle } from './firebase/auth';

// ── SVG Icons ────────────────────────────────────────────────────────────────
const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="14" viewBox="0 0 20 16" fill="none">
    <rect x="0.5" y="0.5" width="19" height="15" rx="1.5" stroke="#94A3B8" strokeWidth="1.5" />
    <path d="M1 1L10 9L19 1" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="18" viewBox="0 0 14 18" fill="none">
    <rect x="0.75" y="7.75" width="12.5" height="9.5" rx="1.25" stroke="#94A3B8" strokeWidth="1.5" />
    <path d="M3.5 7.5V5C3.5 2.79086 5.29086 1 7.5 1V1C9.70914 1 11.5 2.79086 11.5 5V7.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="7.5" cy="13" r="1.25" fill="#94A3B8" />
  </svg>
);

const EyeIcon = ({ open }) => open ? (
  <svg xmlns="http://www.w3.org/2000/svg" width="19" height="13" viewBox="0 0 20 14" fill="none">
    <path d="M1 7C1 7 4 1 10 1C16 1 19 7 19 7C19 7 16 13 10 13C4 13 1 7 1 7Z" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="10" cy="7" r="2.5" stroke="#94A3B8" strokeWidth="1.5" />
  </svg>
) : (
  <svg xmlns="http://www.w3.org/2000/svg" width="19" height="13" viewBox="0 0 20 14" fill="none">
    <path d="M1 7C1 7 4 1 10 1C16 1 19 7 19 7C19 7 16 13 10 13C4 13 1 7 1 7Z" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="10" cy="7" r="2.5" stroke="#94A3B8" strokeWidth="1.5" />
    <path d="M3 3L17 11" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const DACLogoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 23" fill="none" className="w-full h-full">
    <path d="M3 22L14 2L25 22" stroke="#1f3a89" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 16H21" stroke="#1f3a89" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// ── Assets ───────────────────────────────────────────────────────────────────
const campusImage = './bg.png';
const dacEmblem = 'http://localhost:3845/assets/49c8ea20f9d122fa96ed5a1c712fd1c6563ba023.svg';

const ROLES = ['Warden', 'DSW', 'Admin', 'Students', 'DAC Committee'];

// ── Component ─────────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  const toFirebaseError = (code) => {
    switch (code) {
      case 'auth/user-not-found': return 'No account found with this email.';
      case 'auth/wrong-password': return 'Incorrect password. Please try again.';
      case 'auth/invalid-email': return 'Invalid email address.';
      case 'auth/too-many-requests': return 'Too many attempts. Try again later.';
      case 'auth/invalid-credential': return 'Invalid email or password.';
      default: return 'Sign-in failed. Please try again.';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate('/dashboard');
    } catch (err) {
      setAuthError(toFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setAuthError(toFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen font-inter relative flex items-center justify-center overflow-hidden"
      style={{
        background: campusImage
          ? `url(${campusImage}) center/cover no-repeat`
          : 'linear-gradient(135deg, #1f3a89 0%, #3b6fd4 60%, #7eb8f7 100%)',
      }}
    >
      {/* Subtle scrim */}
      <div className="absolute inset-0 bg-black/10" />

      {/* ── Floating Login Card ── */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[640px] bg-white/20 backdrop-blur-md rounded-2xl shadow-2xl p-8 mx-auto my-8"
      >
        {/* ── Logo + Title ── */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-[80px] h-[80px] rounded-full bg-white border border-[#e2e8f0] shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src="./logo.png"
              alt="DAC emblem"
              className="object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div>
            <p className="text-[#1f3a89] text-xl font-extrabold uppercase">DAC Expert System</p>
            <p className="text-black text-sm leading-tight mt-0.5 text-center">Disciplinary Action Committee</p>
          </div>
        </div>

        {/* ── Heading ── */}
        <h1 className="text-[#0f172a] text-lg font-bold leading-tight mb-1">Login</h1>``
        <p className="text-black text-xs leading-5 mb-6">Sign in to access the DAC Expert System</p>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#334155] text-sm font-semibold">Email</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <MailIcon />
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-white border border-[#dde1ea] rounded-xl pl-10 pr-3 py-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#1f3a89] focus:ring-2 focus:ring-[#1f3a89]/20 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#334155] text-sm font-semibold">Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <LockIcon />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-white border border-[#dde1ea] rounded-xl pl-10 pr-10 py-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#1f3a89] focus:ring-2 focus:ring-[#1f3a89]/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {/* Error banner */}
          {authError && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <span className="material-symbols-outlined text-[17px] shrink-0">error</span>
              {authError}
            </div>
          )}

          {/* Submit */}
          <button
            id="sign-in-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-[#1f3a89] text-white text-base font-bold py-3 rounded-xl hover:bg-[#162d6b] active:bg-[#112260] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-[#1f3a89]/30 mt-1"
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {loading ? 'Signing In…' : 'Login'}
          </button>
        </form>

        {/* ── Role pills ── */}
        {/* <div className="mt-5">
          <p className="text-[#64748b] text-sm text-center mb-3">Login as:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(role === r ? '' : r)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${role === r
                    ? 'bg-[#1f3a89] text-white border-[#1f3a89] shadow-sm'
                    : 'bg-white text-[#334155] border-[#dde1ea] hover:border-[#1f3a89] hover:text-[#1f3a89]'
                  }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div> */}

        {/* ── Forgot password ── */}
        {/* <div className="flex justify-center mt-4">
          <a href="#" className="text-[#1f3a89] text-sm font-medium hover:underline">
            Forgot password?
          </a>
        </div> */}

        {/* ── Divider ── */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[#e2e8f0]" />
          <span className="text-xs text-black font-medium">or continue with</span>
          <div className="flex-1 h-px bg-[#e2e8f0]" />
        </div>

        {/* ── Google Sign-In ── */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border border-[#dde1ea] rounded-xl py-2.5 text-sm font-medium text-[#0f172a] hover:bg-[#f8fafc] transition-colors disabled:opacity-60 shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
          </svg>
          Sign in with Google
        </button>

        {/* ── Footer note ── */}
        <p className="text-black text-xs text-center leading-4 mt-5">
          By signing in, you agree to the University's{' '}
          <a href="#" className="underline hover:text-[#64748b] transition-colors">Privacy Policy</a>
          {' '}and{' '}
          <a href="#" className="underline hover:text-[#64748b] transition-colors">Terms of Service</a>.
        </p>
      </motion.div>
    </div>
  );
}
