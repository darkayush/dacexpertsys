import { Link } from 'react-router-dom';

export default function AnalyticsCard({
  stats = { total: 5001, active: 1221, resolved: 3780 },
  onTakeAction,
}) {
  const resolvedPct = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
  const activePct = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Upper Dual Gauge Section */}
      <div className="bg-white rounded-[28px] p-5 border border-slate-100/90 shadow-[0_8px_30px_rgb(0,0,0,0.03)] grid grid-cols-2 gap-3">
        {/* Gauge 1: Resolved Cases */}
        <div className="flex flex-col items-center text-center p-2 rounded-2xl bg-slate-50/50">
          <div className="relative h-16 w-16 flex items-center justify-center mb-2">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#5c54eb]"
                strokeDasharray={`${resolvedPct}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-black text-[#1e1b4b]">
              {resolvedPct}%
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Resolution Rate
          </span>
          <h5 className="text-xs font-extrabold text-[#1e1b4b] mt-0.5">
            {stats.resolved.toLocaleString()} Resolved
          </h5>
        </div>

        {/* Gauge 2: Active Inquiries */}
        <div className="flex flex-col items-center text-center p-2 rounded-2xl bg-slate-50/50">
          <div className="relative h-16 w-16 flex items-center justify-center mb-2">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#f43f5e]"
                strokeDasharray={`${activePct}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-black text-[#1e1b4b]">
              {activePct}%
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Active Review
          </span>
          <h5 className="text-xs font-extrabold text-[#1e1b4b] mt-0.5">
            {stats.active.toLocaleString()} Inquiries
          </h5>
        </div>
      </div>

      {/* Lower Committee Hearing Card */}
      <div className="bg-white rounded-[28px] p-5 border border-slate-100/90 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between flex-1">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#5c54eb]" />
              <h4 className="text-xs font-extrabold text-[#1e1b4b]">Committee Session</h4>
            </div>
            <span className="text-[11px] font-bold text-purple-600">Today, 4:00 PM</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Disciplinary review with Chief Warden & Student Council, Conference Room 102.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 pt-2 border-t border-slate-100">
          <Link
            to="/warden/cases"
            className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-center text-xs font-bold transition-colors"
          >
            Review Files
          </Link>
          <Link
            to="/warden/cases"
            className="flex-1 py-2 rounded-xl bg-[#5c54eb] hover:bg-indigo-700 text-white text-center text-xs font-bold transition-colors shadow-xs"
          >
            Attend Hearing
          </Link>
        </div>
      </div>
    </div>
  );
}
