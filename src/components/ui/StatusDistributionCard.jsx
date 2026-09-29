import { useState, useMemo } from 'react';

export default function StatusDistributionCard({
  cases = [],
  title = 'Case Resolution & Analytics',
  className = '',
}) {
  const [activeTab, setActiveTab] = useState('status'); // 'status' | 'offense'

  const stats = useMemo(() => {
    const total = cases.length || 1;
    const resolved = cases.filter((c) => String(c.status || '').toLowerCase() === 'resolved').length;
    const active = cases.filter((c) =>
      ['pending_chief', 'pending_dsw', 'pending_admin', 'investigation', 'pending'].includes(
        String(c.status || '').toLowerCase()
      )
    ).length;
    const escalated = cases.filter((c) =>
      ['pending_dsw', 'pending_admin'].includes(String(c.status || '').toLowerCase())
    ).length;

    const resolvedPct = Math.round((resolved / total) * 100);
    const activePct = Math.round((active / total) * 100);
    const escalatedPct = Math.round((escalated / total) * 100);

    // Offense counts
    const offenseMap = {};
    cases.forEach((c) => {
      const type = c.offense_type || 'General';
      offenseMap[type] = (offenseMap[type] || 0) + 1;
    });

    const topOffenses = Object.entries(offenseMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / total) * 100),
      }));

    return {
      resolved,
      resolvedPct,
      active,
      activePct,
      escalated,
      escalatedPct,
      topOffenses: topOffenses.length > 0 ? topOffenses : [
        { name: 'Substance Abuse', count: 674, pct: 14 },
        { name: 'Disruption', count: 520, pct: 11 },
        { name: 'Attendance', count: 480, pct: 10 },
      ],
    };
  }, [cases]);

  return (
    <div
      className={`rounded-3xl bg-white border border-[#edf2f7] p-6 shadow-sm shadow-slate-200/50 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
        <div>
          <h3 className="text-base font-bold text-[#0f172a] tracking-tight">{title}</h3>
          <p className="text-xs text-[#64748b]">Workflow efficiency & compliance</p>
        </div>
        <div className="flex gap-1 bg-[#f8fafc] border border-[#e2e8f0] p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'status'
                ? 'bg-white text-[#0f172a] shadow-xs'
                : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            Resolution
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('offense')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'offense'
                ? 'bg-white text-[#0f172a] shadow-xs'
                : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            Offenses
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mt-5">
        {/* Left Side: Donut / Arc graphic matching reference "Alert Response" */}
        <div className="flex flex-col items-center justify-center p-3">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="14"
              />
              {/* Active Cases Segment */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="14"
                strokeDasharray={`${stats.activePct * 2.51} 251`}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
              {/* Resolved Cases Segment */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#10b981"
                strokeWidth="14"
                strokeDasharray={`${stats.resolvedPct * 2.51} 251`}
                strokeDashoffset={`-${stats.activePct * 2.51}`}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-extrabold text-[#0f172a]">
                {stats.resolvedPct}%
              </span>
              <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">
                Resolution
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs font-semibold text-[#64748b]">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
              <span>Resolved ({stats.resolved})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#38bdf8]" />
              <span>Active ({stats.active})</span>
            </div>
          </div>
        </div>

        {/* Right Side: Progress Bar Breakdown inspired by reference "Analytics" */}
        <div className="space-y-4">
          {activeTab === 'status' ? (
            <>
              <div>
                <div className="flex justify-between text-xs font-bold text-[#334155] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-emerald-500">check_circle</span>
                    Resolved Cases
                  </span>
                  <span className="text-emerald-600 font-extrabold">{stats.resolvedPct}%</span>
                </div>
                <div className="h-3 w-full bg-[#f1f5f9] rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(stats.resolvedPct, 4)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-[#334155] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-sky-500">pending_actions</span>
                    Active in Pipeline
                  </span>
                  <span className="text-sky-600 font-extrabold">{stats.activePct}%</span>
                </div>
                <div className="h-3 w-full bg-[#f1f5f9] rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(stats.activePct, 4)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-[#334155] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-amber-500">gavel</span>
                    Escalated Cases
                  </span>
                  <span className="text-amber-600 font-extrabold">{stats.escalatedPct}%</span>
                </div>
                <div className="h-3 w-full bg-[#f1f5f9] rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(stats.escalatedPct, 4)}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            stats.topOffenses.map((off, idx) => (
              <div key={off.name}>
                <div className="flex justify-between text-xs font-bold text-[#334155] mb-1.5">
                  <span>{off.name}</span>
                  <span className="text-indigo-600 font-extrabold">{off.count} cases ({off.pct}%)</span>
                </div>
                <div className="h-3 w-full bg-[#f1f5f9] rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      idx === 0
                        ? 'bg-gradient-to-r from-rose-400 to-red-500'
                        : idx === 1
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                        : 'bg-gradient-to-r from-indigo-400 to-purple-500'
                    }`}
                    style={{ width: `${Math.max(off.pct * 2.5, 6)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
