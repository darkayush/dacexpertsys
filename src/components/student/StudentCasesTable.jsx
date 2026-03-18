export default function StudentCasesTable({ cases, onViewCase }) {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto min-w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-[#e2e8f0]">
              {['Token ID', 'Offense Type', 'Severity', 'Status', 'Date Reported', 'Action'].map((label) => (
                <th
                  key={label}
                  className={`px-6 py-4 text-xs font-semibold text-[#64748b] uppercase tracking-wider ${label === 'Action' ? 'text-right' : 'text-left'}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#e2e8f0] bg-white">
            {cases.map((row) => (
              <tr key={row.token} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-6 py-4">
                  <span className="font-mono text-sm text-[#64748b]">#{row.token}</span>
                </td>

                <td className="px-6 py-4">
                  <span className="text-sm text-[#0f172a]">{row.offenseType}</span>
                </td>

                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.severityClass}`}>
                    {row.severity}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${row.statusDot}`} />
                    <span className="text-sm text-[#0f172a]">{row.status}</span>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <span className="text-sm text-[#64748b]">{row.dateReported}</span>
                </td>

                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onViewCase(row.token)}
                    className="font-medium text-sm transition-colors text-[#1f3a89] hover:text-[#3b5dc9]"
                  >
                    View Case
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
