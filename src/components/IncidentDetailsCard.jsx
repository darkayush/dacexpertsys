export default function IncidentDetailsCard({ incident }) {
  const fields = [
    { label: 'Token ID',     value: incident.token,       icon: 'tag'             },
    { label: 'Date',         value: incident.date,        icon: 'calendar_today'  },
    { label: 'Time',         value: incident.time,        icon: 'schedule'        },
    { label: 'Location',     value: incident.location,    icon: 'location_on'     },
    { label: 'Offense Type', value: incident.offenseType, icon: 'gavel'           },
    { label: 'Reported By',  value: incident.reportedBy,  icon: 'person_pin'      },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#edf2f7] shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-[#edf2f7] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">report</span>
          </div>
          <div>
            <h3 className="font-bold text-[#0f172a] text-sm leading-tight">Incident Details</h3>
            <p className="text-[11px] text-[#94a3b8]">Reported event metadata & facts</p>
          </div>
        </div>
        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#f1f5f9] text-[#475569]">
          {incident.token}
        </span>
      </div>

      <div className="p-6 flex flex-col gap-6">
        {/* Meta grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {fields.map(({ label, value, icon }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-[#f8fafc] border border-[#edf2f7]">
              <div className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center shrink-0 border border-[#edf2f7]">
                <span className="material-symbols-outlined text-[#5c56e9] text-[16px]">{icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-[#0f172a] text-xs font-semibold truncate">{value || 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div>
          <p className="text-[#94a3b8] text-xs font-bold uppercase tracking-wider mb-2">Incident Narrative & Statement</p>
          <div className="text-[#334155] text-sm leading-relaxed bg-[#f8fafc] rounded-2xl border border-[#edf2f7] p-4 font-normal">
            {incident.description || 'No description recorded.'}
          </div>
        </div>
      </div>
    </div>
  );
}
