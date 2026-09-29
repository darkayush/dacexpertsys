import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DACLayout from '../../components/layout/DACLayout';
import EmptyState from '../../components/ui/EmptyState';
import { getNotifications, markNotificationRead } from '../../services/api';

function formatTimestamp(value) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function WardenNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // Ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.is_read);
      await Promise.all(unread.map((n) => markNotificationRead(n.id)));
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Ignore
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.is_read);
    return notifications;
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DACLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-[#1e1b4b] tracking-tight">
                Disciplinary Alerts
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-[#5c54eb] text-xs font-bold border border-purple-100">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Live notifications for case escalations, hearings, and student filings
            </p>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition-colors"
              >
                Mark all as read
              </button>
            )}

            <div className="flex items-center bg-white p-1 rounded-full border border-slate-200 shadow-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  filter === 'all'
                    ? 'bg-[#5c54eb] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  filter === 'unread'
                    ? 'bg-[#5c54eb] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Unread
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Container */}
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] min-h-[400px]">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <span className="material-symbols-outlined animate-spin text-[32px] text-[#5c54eb] mb-2">
                progress_activity
              </span>
              <p className="text-xs font-semibold">Loading notifications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon="notifications_off"
                title="All Caught Up"
                description={
                  filter === 'unread'
                    ? 'No unread notifications at this time.'
                    : 'No notifications found in your disciplinary log.'
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.is_read && handleMarkAsRead(item.id)}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${
                    !item.is_read
                      ? 'bg-purple-50/40 border-purple-100/80 shadow-xs'
                      : 'bg-slate-50/50 border-slate-100 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`h-10 w-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs ${
                        !item.is_read ? 'bg-[#5c54eb]' : 'bg-slate-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        notifications
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-[#1e1b4b]">
                          {item.title}
                        </h4>
                        {!item.is_read && (
                          <span className="h-2 w-2 rounded-full bg-[#5c54eb] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                        {item.message}
                      </p>
                      <span className="text-[10px] font-semibold text-slate-400 mt-2 block">
                        {formatTimestamp(item.created_at)}
                      </span>
                    </div>
                  </div>

                  {item.case_id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/warden/cases/${item.case_id}`);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#5c54eb] text-slate-600 hover:text-white border border-slate-200 text-xs font-bold transition-all shadow-xs shrink-0"
                    >
                      View Case
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </DACLayout>
  );
}
