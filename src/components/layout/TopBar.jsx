import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../NotificationBell';

export default function TopBar({
  onMobileMenuToggle,
  searchValue = '',
  onSearchChange,
  primaryAction,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, role, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const displayName = currentUser?.name || currentUser?.displayName || currentUser?.email || 'Officer';
  const roleDisplay = (role || 'warden').replace(/_/g, ' ').toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getPrimaryRegisterLink = () => {
    if (role === 'warden') return '/warden/register';
    if (role === 'chief_warden') return '/chief-warden/register';
    return '/register-case';
  };

  return (
    <header className="w-full pt-4 pb-2 px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 select-none">
      {/* Left: Mobile trigger & Navigation Tabs */}
      <div className="flex items-center justify-between w-full md:w-auto gap-4">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="md:hidden h-10 w-10 rounded-2xl bg-white text-slate-700 flex items-center justify-center shadow-xs border border-slate-200"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        {/* Minimal Navigation Context Tabs inspired by reference */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            to={role === 'student' ? '/student/dashboard' : role === 'chief_warden' ? '/chief-warden/dashboard' : '/warden/dashboard'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#1e1b4b] bg-white shadow-xs border border-slate-100"
          >
            <span className="material-symbols-outlined text-[16px] text-[#5c54eb]">dashboard</span>
            <span>Dashboard</span>
          </Link>

          <Link
            to="/settings"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">account_tree</span>
            <span>Workflows</span>
          </Link>
        </div>
      </div>

      {/* Center: Large Global Command Search Bar */}
      <div className="w-full md:max-w-md lg:max-w-lg relative">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
          search
        </span>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          placeholder="Search cases, students or commands..."
          className="w-full pl-10 pr-12 py-2 sm:py-2.5 bg-white border border-slate-200/80 rounded-full text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5c54eb] focus:ring-4 focus:ring-purple-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all"
        />
        <kbd className="hidden sm:inline-flex items-center absolute right-3.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-400">
          ⌘K
        </kbd>
      </div>

      {/* Right Controls: Notifications, Action Button & Profile */}
      <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end">
        {/* Notification Bell */}
        <NotificationBell />

        {/* Primary Action Button */}
        {role !== 'student' && (
          primaryAction ? (
            primaryAction
          ) : (
            <Link
              to={getPrimaryRegisterLink()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1e1b4b] hover:bg-black text-white text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span className="hidden sm:inline">Register Case</span>
            </Link>
          )
        )}

        {/* Profile Avatar Chip & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#5c54eb] to-indigo-500 text-white flex items-center justify-center text-xs font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-extrabold text-[#1e1b4b] leading-tight max-w-[90px] truncate">
                {displayName}
              </p>
              <p className="text-[9px] font-bold text-purple-600 leading-none">
                {roleDisplay}
              </p>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-[14px]">
              expand_more
            </span>
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-[#1e1b4b] truncate">{displayName}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
              </div>
              <Link
                to={role === 'student' ? '/student/profile' : role === 'chief_warden' ? '/chief-warden/profile' : '/warden/profile'}
                onClick={() => setProfileDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                Profile
              </Link>
              <Link
                to="/settings"
                onClick={() => setProfileDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-slate-400">settings</span>
                Settings
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
