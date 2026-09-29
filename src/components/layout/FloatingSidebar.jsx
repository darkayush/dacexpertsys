import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

export default function FloatingSidebar({ mobileOpen, onMobileClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, role, logout } = useAuth();
  const [expanded, setExpanded] = useState(false);

  // Role-aware navigation items
  const getNavItems = () => {
    switch (role) {
      case 'chief_warden':
        return [
          { to: '/chief-warden/dashboard', label: 'Dashboard', icon: 'grid_view' },
          { to: '/chief-warden/register', label: 'Register Case', icon: 'edit_square' },
          { to: '/chief-warden/cases', label: 'Review Cases', icon: 'folder_open' },
          { to: '/chief-warden/notifications', label: 'Notifications', icon: 'notifications' },
          { to: '/chief-warden/profile', label: 'Profile', icon: 'person' },
          { to: '/settings', label: 'Settings', icon: 'settings' },
        ];
      case 'dsw':
        return [
          { to: '/dsw-dashboard', label: 'Dashboard', icon: 'grid_view' },
          { to: '/dashboard', label: 'Case Roster', icon: 'folder_open' },
          { to: '/reports', label: 'Reports', icon: 'bar_chart' },
          { to: '/settings', label: 'Settings', icon: 'settings' },
        ];
      case 'admin':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: 'grid_view' },
          { to: '/admin-settings/users', label: 'User Directory', icon: 'group' },
          { to: '/admin-settings/rules-weights', label: 'Policy Rules', icon: 'rule' },
          { to: '/reports', label: 'Analytics', icon: 'analytics' },
          { to: '/settings', label: 'Settings', icon: 'settings' },
        ];
      case 'student':
        return [
          { to: '/student/dashboard', label: 'Dashboard', icon: 'grid_view' },
          { to: '/student/cases', label: 'My Inquiries', icon: 'folder_open' },
          { to: '/student/disciplinary-policy', label: 'DAC Policy', icon: 'policy' },
          { to: '/student/profile', label: 'Profile', icon: 'person' },
          { to: '/settings', label: 'Settings', icon: 'settings' },
        ];
      case 'warden':
      default:
        return [
          { to: '/warden/dashboard', label: 'Dashboard', icon: 'grid_view' },
          { to: '/warden/register', label: 'Register Case', icon: 'edit_square' },
          { to: '/warden/cases', label: 'My Cases', icon: 'folder_open' },
          { to: '/warden/notifications', label: 'Notifications', icon: 'notifications' },
          { to: '/warden/profile', label: 'Profile', icon: 'person' },
          { to: '/settings', label: 'Settings', icon: 'settings' },
        ];
    }
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const sidebarContent = (
    <div
      className={`h-[94vh] my-[3vh] ml-3 sm:ml-4 rounded-[32px] bg-[#5c54eb] text-white shadow-[0_16px_40px_rgba(92,84,235,0.35)] flex flex-col justify-between py-6 px-3 transition-all duration-300 z-40 select-none ${
        expanded ? 'w-56' : 'w-[72px]'
      }`}
    >
      {/* Top: Logo & Toggle */}
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-between w-full px-1 mb-6">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0">
              <span className="material-symbols-outlined text-[24px]">gavel</span>
            </div>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="overflow-hidden"
              >
                <h2 className="text-sm font-black tracking-tight leading-none text-white">
                  DAC Expert
                </h2>
                <span className="text-[10px] text-white/70 font-bold uppercase tracking-wider">
                  {role?.replace(/_/g, ' ') || 'Portal'}
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="w-full space-y-2 mt-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={!expanded ? item.label : undefined}
              className={({ isActive }) =>
                `group relative flex items-center gap-3.5 px-3 py-3 rounded-2xl transition-all ${
                  isActive
                    ? 'bg-white text-[#5c54eb] shadow-[0_8px_20px_rgba(0,0,0,0.12)] font-black'
                    : 'text-white/75 hover:text-white hover:bg-white/10 font-bold'
                } ${!expanded ? 'justify-center' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`material-symbols-outlined text-[22px] shrink-0 transition-transform ${isActive ? 'scale-105' : 'group-hover:scale-110'}`}>
                    {item.icon}
                  </span>
                  {expanded && (
                    <span className="text-xs tracking-tight truncate">
                      {item.label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom: Collapse button & Logout */}
      <div className="flex flex-col items-center w-full space-y-2 pt-4 border-t border-white/15">
        {/* Expand / Collapse toggle */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          title={expanded ? 'Collapse navigation' : 'Expand navigation'}
          className={`hidden md:flex items-center gap-3 w-full py-2.5 px-3 rounded-2xl text-white/70 hover:text-white hover:bg-white/10 transition-colors ${
            !expanded ? 'justify-center' : ''
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {expanded ? 'keyboard_double_arrow_left' : 'keyboard_double_arrow_right'}
          </span>
          {expanded && <span className="text-xs font-bold">Collapse</span>}
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          title="Sign out"
          className={`flex items-center gap-3 w-full py-2.5 px-3 rounded-2xl text-rose-200 hover:text-white hover:bg-rose-500/25 transition-colors ${
            !expanded ? 'justify-center' : ''
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          {expanded && <span className="text-xs font-bold">Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Floating Sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 bottom-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 my-4 ml-4"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
