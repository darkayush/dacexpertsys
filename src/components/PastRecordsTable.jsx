import StatusBadge from './ui/StatusBadge';
import EmptyState from './ui/EmptyState';

export default function PastRecordsTable({
  title = 'Past Disciplinary Records',
  records = [],
  loading = false,
  error = '',
  onViewAll,
  className = '',
}) {
  return (
    <div className={`bg-white rounded-3xl border border-[#edf2f7] shadow-sm shadow-slate-200/50 overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
        <div>
          <h3 className="text-base font-bold text-[#0f172a]">{title}</h3>
          <p className="text-xs text-[#64748b]">Recent institutional precedents & historical decisions</p>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-sky-600 hover:text-sky-700 hover:bg-sky-50 transition-colors"
          >
            <span>View All Records</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-[#94a3b8]">
          <span className="h-4 w-4 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin inline-block mr-2" />
          Loading disciplinary records...
        </div>
      ) : error ? (
        <div className="p-6 text-sm text-rose-600 bg-rose-50/50">Error: {error}</div>
      ) : records.length === 0 ? (
        <EmptyState
          icon="history"
          title="No disciplinary records found"
          description="There are no past records matching this view."
          className="border-none shadow-none py-8"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#fcfdfe] border-b border-[#f1f5f9]">
                {['Token ID', 'Student Name', 'Offense', 'Status', 'Incident Date'].map((heading) => (
                  <th key={heading} className="px-6 py-3.5 text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f8fafc]">
              {records.map((row) => (
                <tr key={row.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-6 py-3.5">
                    <span className="font-mono text-xs font-semibold text-[#64748b] bg-[#f8fafc] px-2 py-1 rounded-lg border border-[#e2e8f0]/60">
                      {row.token}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-sm font-bold text-[#0f172a]">{row.studentName}</td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-[#334155]">
                      {row.offense}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-6 py-3.5 text-xs text-[#64748b] font-medium">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
