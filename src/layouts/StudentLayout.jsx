import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import { useAuth } from '../context/AuthContext';

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    icon: 'gavel',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    title: 'Case update',
    body: 'Case #2024-012 moved to Investigation.',
    time: '12 min ago',
    read: false,
  },
  {
    id: 2,
    icon: 'event',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'DAC hearing scheduled',
    body: 'A hearing is scheduled for Case #2024-012.',
    time: '1 hr ago',
    read: false,
  },
  {
    id: 3,
    icon: 'check_circle',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    title: 'Case resolved',
    body: 'Case #2024-009 was marked as resolved.',
    time: 'Yesterday',
    read: true,
  },
];

export default function StudentLayout() {
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const displayName = currentUser?.displayName || 'Student';
  const avatarInitials = displayName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    function handleClick(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = () => setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  const markRead = (id) => setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));

  return (
    <div className="min-h-screen bg-[#f9f9fb] font-sans antialiased">
      <StudentSidebar />

      <main className="pt-14 md:pt-0 md:pl-64 flex flex-col min-h-screen bg-[#f9f9fb]">
        <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-20 px-4 md:px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#0f172a] tracking-tight">Student Portal</h2>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] text-[20px]">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search cases"
                className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#1f3a89]/20 w-64 placeholder:text-[#64748b]/70 text-[#0f172a] transition-shadow outline-none"
              />
            </div>

            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((value) => !value)}
                className={`relative p-1.5 rounded-lg transition-colors ${notifOpen ? 'text-[#1f3a89] bg-[#1f3a89]/10' : 'text-[#64748b] hover:text-[#1f3a89] hover:bg-slate-100'}`}
                aria-label="Notifications"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-[#ef4444] border-2 border-white flex items-center justify-center">
                    <span className="text-white text-[9px] font-bold leading-none">{unreadCount}</span>
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#e2e8f0] rounded-xl shadow-xl z-50 overflow-hidden origin-top-right">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0]">
                    <div className="flex items-center gap-2">
                      <span className="text-[#0f172a] font-semibold text-sm">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="bg-[#ef4444] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[#1f3a89] text-xs font-medium hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[360px] overflow-y-auto divide-y divide-[#f1f5f9]">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => markRead(item.id)}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors ${item.read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/60 hover:bg-blue-50'}`}
                      >
                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${item.iconBg}`}>
                          <span className={`material-symbols-outlined text-[16px] ${item.iconColor}`}>{item.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug ${item.read ? 'text-[#0f172a] font-medium' : 'text-[#0f172a] font-semibold'}`}>
                            {item.title}
                          </p>
                          <p className="text-xs text-[#64748b] mt-0.5 leading-snug">{item.body}</p>
                          <p className="text-[10px] text-[#94a3b8] mt-1">{item.time}</p>
                        </div>
                        {!item.read && <span className="h-2 w-2 rounded-full bg-[#1f3a89] shrink-0 mt-1.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-9 w-9 rounded-full bg-[#1f3a89] flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
              <span className="text-white text-xs font-bold">{avatarInitials}</span>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-[1400px] mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
