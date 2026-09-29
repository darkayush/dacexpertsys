import StatusBadge from './ui/StatusBadge';
import SeverityBadge from './ui/SeverityBadge';

export default function PreviousOffencesTable({ offences = [] }) {
  return (
    <div className="bg-white rounded-2xl border border-[#edf2f7] shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-[#edf2f7] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">history</span>
          </div>
          <div>
            <h3 className="font-bold text-[#0f172a] text-sm leading-tight">Previous Offences & Disciplinary Record</h3>
            <p className="text-[11px] text-[#94a3b8]">Historical violations linked to this student</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f1f5f9] text-[#475569]">
          {offences.length} {offences.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {offences.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
            <span className="material-symbols-outlined text-[24px]">verified</span>
          </div>
          <p className="text-[#0f172a] text-sm font-bold">Clean Disciplinary History</p>
          <p className="text-[#64748b] text-xs">No prior offences found for this student.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#edf2f7]">
                {['Date', 'Offense Type', 'Severity', 'Points', 'Status'].map((h) => (
                  <th key={h} className="px-6 py-3.5 text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2f7]">
              {offences.map((row, i) => (
                <tr key={i} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-[#64748b]">{row.date}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-[#0f172a]">{row.offenseType}</span>
                  </td>
                  <td className="px-6 py-4">
                    <SeverityBadge severity={row.severity} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-[#0f172a]">{row.penaltyPoints}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
