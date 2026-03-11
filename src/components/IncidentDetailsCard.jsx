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
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
        <span className="material-symbols-outlined text-[#1f3a89] text-[18px]">report</span>
        <h3 className="font-semibold text-[#0f172a] text-sm">Incident Details</h3>
      </div>

      <div className="p-6 flex flex-col gap-6">
        {/* Meta grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          {fields.map(({ label, value, icon }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#eef2fb] flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[#1f3a89] text-[16px]">{icon}</span>
              </div>
              <div>
                <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-[#0f172a] text-sm font-medium">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div>
          <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-2">Description</p>
          <p className="text-[#334155] text-sm leading-6 bg-slate-50 rounded-lg border border-[#e2e8f0] px-4 py-3">
            {incident.description}
          </p>
        </div>
      </div>
    </div>
  );
}
