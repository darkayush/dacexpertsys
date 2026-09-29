import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getNotifications, markNotificationRead } from '../services/api';
import { useAuth } from '../context/AuthContext';

function getCasePathByRole(role, caseId) {
  const normalized = String(role || '').toLowerCase();
  if (normalized === 'warden') return `/warden/cases/${caseId}`;
  if (normalized === 'chief_warden') return `/chief-warden/cases/${caseId}`;
  if (normalized === 'student') return `/student/cases/${caseId}`;
  return `/cases/${caseId}`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const containerRef = useRef(null);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications],
  );

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError('');
      const payload = await getNotifications();
      setNotifications(payload || []);
    } catch (fetchError) {
      setError(fetchError?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(fetchItems, 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = async (item) => {
    try {
      if (!item.is_read) {
        await markNotificationRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
        );
      }
      setOpen(false);
      if (item.case_id) {
        navigate(getCasePathByRole(role, item.case_id));
      }
    } catch (clickError) {
      console.error(clickError);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.is_read);
      await Promise.all(unread.map((n) => markNotificationRead(n.id)));
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative h-10 w-10 rounded-2xl bg-white border border-[#e2e8f0] text-[#64748b] hover:text-[#0f172a] hover:border-sky-300 flex items-center justify-center transition-all shadow-xs"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 border-2 border-white text-white text-[10px] font-extrabold flex items-center justify-center px-1 shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white border border-[#edf2f7] shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#f1f5f9] flex items-center justify-between bg-[#fcfdfe]">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[#0f172a]">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-600 border border-sky-100">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-[#f8fafc]">
              {loading && notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#94a3b8]">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <span className="material-symbols-outlined text-[32px] text-[#cbd5e1] block mb-1">
                    notifications_off
                  </span>
                  <p className="text-xs font-semibold text-[#64748b]">No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-4 flex gap-3 cursor-pointer transition-colors ${
                      item.is_read ? 'hover:bg-[#f8fafc]' : 'bg-sky-50/40 hover:bg-sky-50/70'
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        item.type === 'escalation'
                          ? 'bg-rose-100 text-rose-600'
                          : item.type === 'approval'
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-sky-100 text-sky-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {item.type === 'escalation'
                          ? 'warning'
                          : item.type === 'approval'
                          ? 'check_circle'
                          : 'assignment'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#0f172a] truncate">
                        {item.title || 'Case Update'}
                      </p>
                      <p className="text-[11px] text-[#64748b] line-clamp-2 mt-0.5">
                        {item.message || item.body || 'You have an update on a case.'}
                      </p>
                      <span className="text-[10px] text-[#94a3b8] mt-1 block">
                        {new Date(item.created_at || Date.now()).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {!item.is_read && (
                      <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0 self-center" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 border-t border-[#f1f5f9] bg-[#fcfdfe] text-center">
              <span className="text-[11px] font-semibold text-[#94a3b8]">
                Real-time incident alerts
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
