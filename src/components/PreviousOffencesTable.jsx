const severityStyles = {
  Critical: 'bg-red-100 text-red-800',
  High:     'bg-orange-100 text-orange-800',
  Medium:   'bg-yellow-100 text-yellow-800',
  Low:      'bg-slate-100 text-slate-700',
};

const statusDots = {
  Resolved:    'bg-green-500',
  Pending:     'bg-yellow-500',
  Investigation: 'bg-blue-500',
  Dismissed:   'bg-slate-400',
};

export default function PreviousOffencesTable({ offences }) {
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#1f3a89] text-[18px]">history</span>
          <h3 className="font-semibold text-[#0f172a] text-sm">Previous Offences</h3>
        </div>
        <span className="text-xs text-[#64748b] font-medium">{offences.length} record{offences.length !== 1 ? 's' : ''}</span>
      </div>

      {offences.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
          <span className="material-symbols-outlined text-[40px] text-[#cbd5e1]">check_circle</span>
          <p className="text-[#0f172a] text-sm font-semibold">No Prior Offences</p>
          <p className="text-[#64748b] text-xs">This student has no previous disciplinary records.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-[#e2e8f0]">
                {['Date', 'Offense Type', 'Severity', 'Penalty Points', 'Status'].map((h) => (
                  <th key={h} className="px-6 py-3.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {offences.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#64748b]">{row.date}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-[#0f172a]">{row.offenseType}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityStyles[row.severity] ?? 'bg-slate-100 text-slate-700'}`}>
                      {row.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-[#0f172a]">{row.penaltyPoints}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDots[row.status] ?? 'bg-slate-400'}`} />
                      <span className="text-sm text-[#0f172a]">{row.status}</span>
                    </div>
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
