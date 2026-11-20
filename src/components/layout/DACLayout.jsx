import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../NotificationBell';
import GlobalSearch from './GlobalSearch';
import { toggleAssistant } from '../../lib/assistant';

const NAV_ITEMS = {
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: 'home' },
    { to: '/admin-settings/users', label: 'User Directory', icon: 'group' },
    { to: '/admin-settings/rules-weights', label: 'Rules & Policies', icon: 'description' },
    { to: '/admin-settings/system', label: 'System Config', icon: 'tune' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ],
  dsw: [
    { to: '/dsw-dashboard', label: 'Dashboard', icon: 'home' },
    { to: '/dashboard', label: 'Case Roster', icon: 'folder_open' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ],
  chief_warden: [
    { to: '/chief-warden/dashboard', label: 'Dashboard', icon: 'home' },
    { to: '/chief-warden/register', label: 'Register Case', icon: 'edit_square' },
    { to: '/chief-warden/cases', label: 'Review Cases', icon: 'folder_open' },
    { to: '/chief-warden/notifications', label: 'Notifications', icon: 'notifications' },
    { to: '/chief-warden/profile', label: 'Profile', icon: 'person' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ],
  warden: [
    { to: '/warden/dashboard', label: 'Dashboard', icon: 'home' },
    { to: '/warden/register', label: 'Register Case', icon: 'edit_square' },
    { to: '/warden/cases', label: 'My Cases', icon: 'folder_open' },
    { to: '/warden/notifications', label: 'Notifications', icon: 'notifications' },
    { to: '/warden/profile', label: 'Profile', icon: 'person' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ],
  student: [
    { to: '/student/dashboard', label: 'Dashboard', icon: 'home' },
    { to: '/student/cases', label: 'My Cases', icon: 'folder_open' },
    { to: '/student/disciplinary-policy', label: 'DAC Policy', icon: 'policy' },
    { to: '/student/profile', label: 'Profile', icon: 'person' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ],
};

const REGISTER_LINKS = {
  warden: '/warden/register',
  chief_warden: '/chief-warden/register',
};

// Roles that get the top-bar "Ask AI" button. Only wardens and chief wardens register cases.
const STAFF_ROLES = ['warden', 'chief_warden', 'dsw', 'admin'];

function Sidebar({ role, onNavigate }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const items = NAV_ITEMS[role] || NAV_ITEMS.warden;
  const name = currentUser?.name || 'User';

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside className="h-full w-[min(15rem,85vw)] bg-[#231f52] text-white flex flex-col">
      <div className="flex items-center gap-3 px-5 h-[72px]">
        <span className="material-symbols-outlined text-[30px] text-indigo-200">verified_user</span>
        <div className="leading-tight">
          <p className="text-base font-semibold">DAC Portal</p>
          <p className="text-[11px] text-indigo-200/80">Disciplinary Action Committee</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-[#3d3793] text-white font-medium' : 'text-indigo-100/80 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Campus building illustration, fading in from the top */}
      <svg aria-hidden="true" viewBox="0 0 240 160" className="w-full" preserveAspectRatio="xMidYMax meet">
        <defs>
          <linearGradient id="campus-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.13" />
          </linearGradient>
          <linearGradient id="campus-side" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.07" />
          </linearGradient>
        </defs>
        {/* Main block: roof slab, front facade and receding side */}
        <rect x="16" y="32" width="100" height="7" fill="url(#campus-fade)" />
        <rect x="20" y="39" width="92" height="105" fill="url(#campus-fade)" />
        <path d="M112,39 L156,50 L156,144 L112,144 Z" fill="url(#campus-side)" />
        <path d="M116,32 L160,44 L156,50 L112,39 Z" fill="url(#campus-side)" />
        <g fill="#231f52" fillOpacity="0.55">
          <rect x="30" y="48" width="8" height="8" rx="1" /><rect x="43" y="48" width="8" height="8" rx="1" /><rect x="56" y="48" width="8" height="8" rx="1" /><rect x="69" y="48" width="8" height="8" rx="1" /><rect x="82" y="48" width="8" height="8" rx="1" /><rect x="95" y="48" width="8" height="8" rx="1" /><rect x="30" y="61" width="8" height="8" rx="1" /><rect x="43" y="61" width="8" height="8" rx="1" /><rect x="56" y="61" width="8" height="8" rx="1" /><rect x="69" y="61" width="8" height="8" rx="1" /><rect x="82" y="61" width="8" height="8" rx="1" /><rect x="95" y="61" width="8" height="8" rx="1" /><rect x="30" y="74" width="8" height="8" rx="1" /><rect x="43" y="74" width="8" height="8" rx="1" /><rect x="56" y="74" width="8" height="8" rx="1" /><rect x="69" y="74" width="8" height="8" rx="1" /><rect x="82" y="74" width="8" height="8" rx="1" /><rect x="95" y="74" width="8" height="8" rx="1" /><rect x="30" y="87" width="8" height="8" rx="1" /><rect x="43" y="87" width="8" height="8" rx="1" /><rect x="56" y="87" width="8" height="8" rx="1" /><rect x="69" y="87" width="8" height="8" rx="1" /><rect x="82" y="87" width="8" height="8" rx="1" /><rect x="95" y="87" width="8" height="8" rx="1" /><rect x="30" y="100" width="8" height="8" rx="1" /><rect x="43" y="100" width="8" height="8" rx="1" /><rect x="56" y="100" width="8" height="8" rx="1" /><rect x="69" y="100" width="8" height="8" rx="1" /><rect x="82" y="100" width="8" height="8" rx="1" /><rect x="95" y="100" width="8" height="8" rx="1" /><rect x="30" y="113" width="8" height="8" rx="1" /><rect x="43" y="113" width="8" height="8" rx="1" /><rect x="56" y="113" width="8" height="8" rx="1" /><rect x="69" y="113" width="8" height="8" rx="1" /><rect x="82" y="113" width="8" height="8" rx="1" /><rect x="95" y="113" width="8" height="8" rx="1" />
        </g>
        <g fill="#231f52" fillOpacity="0.45">
          <path d="M124,58 l7,1.4 v7 l-7,-1.4 Z" /><path d="M135,60 l7,1.4 v7 l-7,-1.4 Z" /><path d="M146,62 l7,1.4 v7 l-7,-1.4 Z" /><path d="M124,70 l7,1.4 v7 l-7,-1.4 Z" /><path d="M135,72 l7,1.4 v7 l-7,-1.4 Z" /><path d="M146,74 l7,1.4 v7 l-7,-1.4 Z" /><path d="M124,82 l7,1.4 v7 l-7,-1.4 Z" /><path d="M135,84 l7,1.4 v7 l-7,-1.4 Z" /><path d="M146,86 l7,1.4 v7 l-7,-1.4 Z" /><path d="M124,94 l7,1.4 v7 l-7,-1.4 Z" /><path d="M135,96 l7,1.4 v7 l-7,-1.4 Z" /><path d="M146,98 l7,1.4 v7 l-7,-1.4 Z" /><path d="M124,106 l7,1.4 v7 l-7,-1.4 Z" /><path d="M135,108 l7,1.4 v7 l-7,-1.4 Z" /><path d="M146,110 l7,1.4 v7 l-7,-1.4 Z" /><path d="M124,118 l7,1.4 v7 l-7,-1.4 Z" /><path d="M135,120 l7,1.4 v7 l-7,-1.4 Z" /><path d="M146,122 l7,1.4 v7 l-7,-1.4 Z" />
        </g>
        {/* Entrance canopy */}
        <rect x="44" y="128" width="40" height="3" fill="url(#campus-fade)" />
        <rect x="52" y="131" width="24" height="13" fill="#231f52" fillOpacity="0.5" />
        {/* Lamp post */}
        <rect x="170" y="104" width="2" height="40" fill="url(#campus-fade)" />
        <rect x="166" y="101" width="10" height="3" rx="1.5" fill="url(#campus-fade)" />
        {/* Trees */}
        <g fill="url(#campus-fade)">
          <circle cx="196" cy="116" r="15" />
          <circle cx="214" cy="110" r="18" />
          <circle cx="230" cy="120" r="13" />
          <rect x="195" y="124" width="3" height="20" />
          <rect x="213" y="122" width="3" height="22" />
          <rect x="229" y="128" width="3" height="16" />
        </g>
        {/* Low hedge and ground */}
        <rect x="120" y="138" width="120" height="6" rx="3" fill="url(#campus-side)" />
        <rect x="0" y="144" width="240" height="16" fill="#ffffff" fillOpacity="0.06" />
      </svg>

      <div ref={menuRef} className="relative border-t border-white/10 p-3">
        {menuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white text-slate-700 rounded-lg shadow-lg border border-slate-200 py-1 text-sm">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-400">settings</span>
              Settings
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-rose-600"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Log out
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 text-left"
        >
          <span className="h-9 w-9 shrink-0 rounded-full bg-[#4f46c8] flex items-center justify-center text-sm font-semibold">
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium truncate">{name}</span>
            <span className="block text-[11px] text-indigo-200/80 truncate">{currentUser?.email}</span>
          </span>
          <span className="material-symbols-outlined text-[18px] text-indigo-200">expand_more</span>
        </button>
      </div>
    </aside>
  );
}

/**
 * App shell for every signed-in page: dark role-aware sidebar and a top bar
 * with search, notifications, "Register Case" and "Ask AI" (staff only).
 *
 * Search: the same global search (students, cases, offences) is available on every page and
 * never changes the route by itself; see GlobalSearch. Pages that also filter a list in place
 * (CaseList) pass `searchValue`/`onSearchChange` so the typed text drives their list too.
 */
export default function DACLayout({ children, searchValue, onSearchChange }) {
  const { role } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isStaff = STAFF_ROLES.includes(role);
  const registerLink = REGISTER_LINKS[role];

  return (
    <div className="min-h-screen bg-[#f6f6fa] text-slate-800 font-sans antialiased">
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30">
        <Sidebar role={role} />
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true">
          <Sidebar role={role} onNavigate={() => setMobileOpen(false)} />
          <button type="button" aria-label="Close menu" className="flex-1 bg-black/30" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 bg-[#f6f6fa]/90 backdrop-blur border-b border-slate-200/70">
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-8 h-16 sm:h-[72px]">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="lg:hidden h-10 w-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <div className="flex-1 min-w-0 max-w-3xl">
              <GlobalSearch
                role={role}
                value={searchValue}
                onChange={onSearchChange}
                placeholder={role === 'student' ? 'Search your cases...' : 'Search by case ID, student, or offence...'}
              />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
              <NotificationBell />
              {isStaff && (
                <>
                  {registerLink && (
                    <Link
                      to={registerLink}
                      aria-label="Register Case"
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 h-10 w-10 sm:w-auto sm:px-4 rounded-lg bg-[#231f52] hover:bg-[#2f2a6b] text-white text-sm font-medium transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">add</span>
                      <span className="hidden sm:inline">Register Case</span>
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={toggleAssistant}
                    aria-label="Ask AI"
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 h-10 w-10 sm:w-auto sm:px-4 rounded-lg border border-[#3d3793]/40 bg-white text-[#3d3793] hover:bg-indigo-50 text-sm font-medium transition-colors"
                  >
                    <span className="hidden sm:inline">Ask AI</span>
                    <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="px-3 sm:px-8 py-4 sm:py-8 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</main>
      </div>
    </div>
  );
}
