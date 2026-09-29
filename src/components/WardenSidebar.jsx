import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/warden/dashboard', label: 'Dashboard', icon: 'grid_view' },
  { to: '/warden/register', label: 'Register Case', icon: 'edit_square' },
  { to: '/warden/cases', label: 'My Cases', icon: 'folder_open' },
  { to: '/warden/notifications', label: 'Notifications', icon: 'notifications' },
  { to: '/warden/profile', label: 'Profile', icon: 'person' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

function SidebarInner({ collapsed, setCollapsed, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, role, logout } = useAuth();

  const displayName = currentUser?.displayName || currentUser?.name || currentUser?.email || 'Warden';
  const email = currentUser?.email || '';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]);

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* ── Brand / Header ── */}
      <div className={`p-5 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} border-b border-[#edf2f7]`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 shrink-0">
            <span className="material-symbols-outlined text-[22px]">gavel</span>
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col overflow-hidden"
            >
              <h1 className="text-sm font-extrabold text-[#0f172a] leading-tight tracking-tight truncate">
                DAC System
              </h1>
              <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                Warden Portal
              </span>
            </motion.div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex h-7 w-7 rounded-xl hover:bg-slate-100 text-[#94a3b8] hover:text-[#0f172a] items-center justify-center transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="material-symbols-outlined text-[18px]">
            {collapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>

        {/* Mobile Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden text-[#94a3b8] hover:text-[#0f172a] p-1"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
      </div>

      {/* ── Nav Items ── */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25'
                  : 'text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]'
              } ${collapsed ? 'justify-center px-2' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`material-symbols-outlined text-[22px] transition-colors ${
                    isActive ? 'text-white' : 'text-[#94a3b8] group-hover:text-sky-500'
                  }`}
                >
                  {icon}
                </span>
                {!collapsed && <span className="truncate">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Bottom User Chip ── */}
      <div className="p-3 border-t border-[#edf2f7] bg-[#fcfdfe]">
        <div
          className={`flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-100/80 transition-colors ${
            collapsed ? 'justify-center p-1' : ''
          }`}
        >
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#0f172a] truncate">{displayName}</p>
              <p className="text-[10px] text-[#94a3b8] truncate capitalize">{role || 'Warden'}</p>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-xl hover:bg-rose-50 text-[#94a3b8] hover:text-rose-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WardenSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Bar with Hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md border-b border-[#edf2f7] z-30 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl hover:bg-slate-100 text-[#0f172a]"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>
          <span className="text-sm font-extrabold text-[#0f172a]">DAC System</span>
        </div>
        <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
          W
        </div>
      </div>

      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 left-0 h-screen border-r border-[#edf2f7] z-30 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <SidebarInner
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
      </aside>

      {/* Mobile Drawer Backdrop + Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="md:hidden fixed top-0 left-0 bottom-0 w-64 bg-white z-50 shadow-2xl"
            >
              <SidebarInner
                collapsed={false}
                setCollapsed={() => {}}
                onClose={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
