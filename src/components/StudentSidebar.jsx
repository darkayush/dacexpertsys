import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/student/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/student/cases', label: 'My Cases', icon: 'folder_open' },
  { to: '/student/penalty-points', label: 'Penalty Points', icon: 'report' },
  { to: '/student/profile', label: 'Profile', icon: 'person' },
  { to: '/student/disciplinary-policy', label: 'Disciplinary Policy', icon: 'gavel' },
];

function SidebarContent({ onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const displayName = currentUser?.displayName || currentUser?.email || 'Student';
  const photoURL = currentUser?.photoURL || null;
  const email = currentUser?.email || '';
  const initials = displayName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col justify-between h-full">
      <div className="p-6 overflow-y-auto flex-1">
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-lg overflow-hidden flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="DAC Logo" className="w-10 h-10 object-contain" />
          </div>
          <div className="flex-1">
            <h1 className="text-[#0f172a] font-bold text-lg leading-tight">DAC System</h1>
            <p className="text-[#64748b] text-xs font-medium">Student</p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden text-[#64748b] hover:text-[#0f172a] transition-colors"
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          )}
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${isActive
                  ? 'bg-[#1f3a89]/10 text-[#1f3a89]'
                  : 'text-[#64748b] hover:bg-slate-50 hover:text-[#0f172a]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-[#1f3a89]' : 'text-[#64748b]'}`}>
                    {icon}
                  </span>
                  <span className="text-sm">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-6 border-t border-[#e2e8f0]">
        <div className="flex items-center gap-3">
          {photoURL ? (
            <img
              src={photoURL}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="h-10 w-10 rounded-full border-2 border-white shadow-sm shrink-0 object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-[#1f3a89] flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
          )}

          <div className="flex flex-col overflow-hidden flex-1">
            <p className="text-[#0f172a] text-sm font-semibold truncate">{displayName}</p>
            <p className="text-[#64748b] text-xs truncate">{email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="ml-auto text-[#64748b] hover:text-[#ef4444] transition-colors shrink-0"
            title="Logout"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#e2e8f0] flex items-center gap-3 px-4 h-14">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-[#64748b] hover:text-[#1f3a89] transition-colors"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-[26px]">menu</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="DAC Logo" className="w-7 h-7 object-contain" />
          </div>
          <span className="text-[#0f172a] font-bold text-base">DAC System</span>
        </div>
      </header>

      <aside className="hidden md:flex fixed top-0 left-0 w-64 h-screen bg-white border-r border-[#e2e8f0] flex-col z-30">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`md:hidden fixed top-0 left-0 h-screen w-72 bg-white border-r border-[#e2e8f0] z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>
    </>
  );
}
