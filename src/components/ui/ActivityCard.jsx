import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import SeverityBadge from './SeverityBadge';

export default function ActivityCard({
  cases = [],
  title = 'Recent Case Activity',
  totalCount = 0,
  page = 0,
  pageSize = 5,
  totalPages = 1,
  onPrevPage,
  onNextPage,
  viewAllTo = '/warden/cases',
}) {
  const getProgressPercentage = (status = '') => {
    const s = String(status).toLowerCase();
    if (s.includes('resolve')) return 100;
    if (s.includes('admin')) return 80;
    if (s.includes('dsw')) return 60;
    if (s.includes('chief')) return 40;
    if (s.includes('investigat') || s.includes('warden')) return 20;
    return 10;
  };

  return (
    <div className="bg-white rounded-[28px] p-6 border border-slate-100/90 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-extrabold text-[#1e1b4b]">{title}</h3>
            <div className="flex items-center -space-x-2">
              <div className="h-6 w-6 rounded-full bg-purple-100 border border-white text-purple-700 text-[10px] font-bold flex items-center justify-center">
                W1
              </div>
              <div className="h-6 w-6 rounded-full bg-indigo-100 border border-white text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                CW
              </div>
              <div className="h-6 w-6 rounded-full bg-sky-100 border border-white text-sky-700 text-[10px] font-bold flex items-center justify-center">
                DS
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">
              Showing {cases.length} of {totalCount || cases.length}
            </span>
            {viewAllTo && (
              <Link
                to={viewAllTo}
                className="text-xs font-bold text-[#5c54eb] hover:text-indigo-800 transition-colors ml-2"
              >
                View full roster &rarr;
              </Link>
            )}
          </div>
        </div>

        {/* Task-style Case Rows */}
        <div className="space-y-3">
          {cases.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-medium">
              No recent cases recorded.
            </div>
          ) : (
            cases.map((item) => {
              const progress = getProgressPercentage(item.status || item.rawStatus);
              const linkTo = item.id ? `/warden/cases/${item.id}` : '#';

              return (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-[#fbfbfe] hover:bg-white border border-slate-100/80 hover:border-purple-100 hover:shadow-[0_4px_16px_rgba(92,84,235,0.06)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* Left: Case ID & Student */}
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="h-9 w-9 rounded-xl bg-purple-50 group-hover:bg-[#5c54eb] text-[#5c54eb] group-hover:text-white flex items-center justify-center text-xs font-extrabold transition-colors shrink-0">
                      {item.initials || 'CA'}
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-[#1e1b4b] truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          ({item.token || `#${item.id}`})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium truncate">
                        {item.dept || 'Academic Inmate'} · {item.date}
                      </p>
                    </div>
                  </div>

                  {/* Center: Offense & Progress Bar */}
                  <div className="flex-1 max-w-xs flex flex-col justify-center">
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                      <span className="text-slate-600 truncate">{item.offense}</span>
                      <span className="text-[#5c54eb] font-extrabold">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#5c54eb] to-indigo-400 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Right: Badges & Action */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <StatusBadge status={item.status} />
                    {item.severity && <SeverityBadge severity={item.severity} />}

                    <Link
                      to={linkTo}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 group-hover:bg-[#5c54eb] text-slate-600 group-hover:text-white text-xs font-bold transition-all shadow-xs"
                    >
                      {item.action || 'View'}
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            onClick={onPrevPage}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            Previous
          </button>
          <span className="text-xs font-bold text-slate-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={onNextPage}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
