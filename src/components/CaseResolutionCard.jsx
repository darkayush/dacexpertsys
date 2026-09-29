export default function CaseResolutionCard({ resolution }) {
  const fields = [
    { label: 'Resolved By',    value: resolution.resolvedBy,   icon: 'badge' },
    { label: 'Role Authority', value: resolution.role,         icon: 'security' },
    { label: 'Resolution Date',value: resolution.date,         icon: 'event_available' },
    { label: 'Assessed Fine',  value: resolution.fine,         icon: 'payments' },
    { label: 'Penalty Points', value: resolution.penaltyPoints,icon: 'speed' },
    { label: 'Action Taken',   value: resolution.actionTaken,  icon: 'assignment_turned_in' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#edf2f7] shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-[#edf2f7] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">verified</span>
          </div>
          <div>
            <h3 className="font-bold text-[#0f172a] text-sm leading-tight">Official Case Resolution</h3>
            <p className="text-[11px] text-[#94a3b8]">Binding disciplinary ruling & sanctions</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Resolved
        </span>
      </div>

      <div className="p-6 flex flex-col gap-6">
        {/* Meta grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {fields.map(({ label, value, icon }) => (
            <div key={label} className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#edf2f7] flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white shadow-xs border border-[#edf2f7] flex items-center justify-center text-[#5c56e9] shrink-0">
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-[#0f172a] text-xs font-semibold truncate">{value || 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Remarks */}
        {resolution.remarks && (
          <div>
            <p className="text-[#94a3b8] text-xs font-bold uppercase tracking-wider mb-2">Committee Remarks & Summary</p>
            <p className="text-[#334155] text-sm leading-relaxed bg-[#f8fafc] rounded-2xl border border-[#edf2f7] p-4 font-normal">
              {resolution.remarks}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
