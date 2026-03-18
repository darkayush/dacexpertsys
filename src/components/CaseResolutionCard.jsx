export default function CaseResolutionCard({ resolution }) {
  const fields = [
    { label: 'Resolved By',    value: resolution.resolvedBy  },
    { label: 'Role',           value: resolution.role        },
    { label: 'Resolution Date',value: resolution.date        },
    { label: 'Fine',           value: resolution.fine        },
    { label: 'Penalty Points', value: resolution.penaltyPoints },
    { label: 'Action Taken',   value: resolution.actionTaken },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
        <span className="material-symbols-outlined text-[#1f3a89] text-[18px]">verified</span>
        <h3 className="font-semibold text-[#0f172a] text-sm">Case Resolution</h3>
        <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Resolved
        </span>
      </div>

      <div className="p-6 flex flex-col gap-6">
        {/* Meta grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-[#0f172a] text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>

        {/* Remarks */}
        <div>
          <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-2">Remarks</p>
          <p className="text-[#334155] text-sm leading-6 bg-slate-50 rounded-lg border border-[#e2e8f0] px-4 py-3">
            {resolution.remarks}
          </p>
        </div>
      </div>
    </div>
  );
}
