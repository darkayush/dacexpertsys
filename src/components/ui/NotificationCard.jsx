import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotificationCard({
  notifications = [],
  viewAllTo = '/warden/notifications',
  onClear,
}) {
  const displayItems = notifications && notifications.length > 0
    ? notifications.slice(0, 3)
    : [
        {
          id: 'n1',
          title: 'Upcoming Case Review',
          subtitle: 'DAC Committee Hearing | Hall B',
          time: 'Today, 03:30 PM',
          status: 'urgent',
          type: 'hearing',
          elevated: true,
        },
        {
          id: 'n2',
          title: 'New Incident Reported',
          subtitle: 'Hostel GH Block B · Curfew Violation',
          time: '2 hours ago',
          status: 'pending',
          type: 'incident',
        },
        {
          id: 'n3',
          title: 'Case Escalated to DSW',
          subtitle: 'DAC-2026-00127 forwarded for decision',
          time: 'Yesterday',
          status: 'info',
          type: 'workflow',
        },
      ];

  return (
    <div className="bg-white rounded-[28px] p-6 border border-slate-100/90 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-extrabold text-[#1e1b4b]">Notifications</h3>
          <span className="h-5 px-2 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold flex items-center justify-center">
            {notifications?.length || 3}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onClear && (
            <button
              onClick={onClear}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Clear
            </button>
          )}
          {viewAllTo && (
            <Link
              to={viewAllTo}
              className="text-xs font-bold text-[#5c54eb] hover:text-indigo-800 transition-colors flex items-center gap-1"
            >
              <span>View all</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-3 flex-1 flex flex-col justify-center">
        {displayItems.map((item, idx) => {
          const isElevated = idx === 0 || item.elevated;
          return (
            <motion.div
              key={item.id || idx}
              whileHover={{ scale: 1.01 }}
              className={`p-4 rounded-2xl transition-all ${
                isElevated
                  ? 'bg-white shadow-[0_10px_25px_rgba(92,84,235,0.08)] border border-purple-100/80'
                  : 'bg-slate-50/60 hover:bg-purple-50/40 border border-slate-100/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#1e1b4b]">
                    {item.title}
                  </h4>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <span className="text-[10px] font-medium text-slate-400">
                  {item.time || 'Recent'}
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500 font-medium line-clamp-1">
                {item.subtitle || item.message}
              </p>

              {isElevated && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-[10px] font-bold text-[#5c54eb]">
                    <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                    Today
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                    {item.time || '11:00 AM'}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
