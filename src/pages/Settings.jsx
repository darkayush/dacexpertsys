import { useState } from 'react';
import { motion } from 'framer-motion';
import DACLayout from '../components/layout/DACLayout';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/api';

export default function Settings() {
  const { currentUser, role } = useAuth();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const set = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.currentPassword) nextErrors.currentPassword = 'Current password is required';
    if (!form.newPassword) nextErrors.newPassword = 'New password is required';
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Confirm password is required';

    if (form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword) {
      nextErrors.confirmPassword = 'New password and confirm password must match';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      await changePassword(form.currentPassword, form.newPassword);
      setSuccessMessage('Password changed successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DACLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-[#1e1b4b] tracking-tight">
            Settings &amp; Security
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Manage your credentials, authentication preferences, and notification defaults
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Account Summary Card */}
          <div className="md:col-span-5 bg-white rounded-[32px] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-5">
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
              <div className="h-12 w-12 rounded-2xl bg-purple-50 text-[#5c54eb] flex items-center justify-center font-bold text-lg">
                {(currentUser?.name || currentUser?.displayName || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1e1b4b]">
                  {currentUser?.name || currentUser?.displayName || 'User Account'}
                </h3>
                <p className="text-xs text-slate-400 font-medium truncate max-w-[160px]">
                  {currentUser?.email}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-50/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Assigned Role
                </span>
                <span className="text-xs font-bold text-[#1e1b4b] mt-0.5 block capitalize">
                  {role?.replace(/_/g, ' ') || 'Officer'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Authentication Type
                </span>
                <span className="text-xs font-bold text-[#1e1b4b] mt-0.5 block">
                  Institutional SSO &amp; Password
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Security Level
                </span>
                <span className="text-xs font-bold text-emerald-600 mt-0.5 block flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Authenticated Session
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Password Change Form */}
          <div className="md:col-span-7 bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-[#1e1b4b]">
                Change Password
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Ensure your account uses a secure password of at least 8 characters
              </p>
            </div>

            {successMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  value={form.currentPassword}
                  onChange={set('currentPassword')}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5c54eb] focus:bg-white focus:ring-4 focus:ring-purple-100 transition-all"
                />
                {errors.currentPassword && (
                  <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.currentPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={set('newPassword')}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5c54eb] focus:bg-white focus:ring-4 focus:ring-purple-100 transition-all"
                />
                {errors.newPassword && (
                  <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.newPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5c54eb] focus:bg-white focus:ring-4 focus:ring-purple-100 transition-all"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-full bg-[#5c54eb] hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-all disabled:opacity-50 active:scale-95"
                >
                  {loading ? 'Updating Password...' : 'Save Password Changes'}
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </DACLayout>
  );
}
