export default function StudentDetailsCard({ student }) {
  const rows = [
    { label: 'Enrollment No.',   value: student.enrollment },
    { label: 'Year',             value: student.year },
    { label: 'Department',       value: student.department },
    { label: 'Email',            value: student.email },
    { label: 'Contact',          value: student.contact },
    { label: 'Hostel',           value: student.hostel },
    { label: 'Room No.',         value: student.room },
  ];

  const initials = (student.name || 'Student')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-[#edf2f7] shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-[#edf2f7] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#5c56e9]/10 text-[#5c56e9] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
          <div>
            <h3 className="font-bold text-[#0f172a] text-sm leading-tight">Student Information</h3>
            <p className="text-[11px] text-[#94a3b8]">Verified student profile & history</p>
          </div>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f1f5f9] text-[#475569]">
          {student.department || 'Enrolled'}
        </span>
      </div>

      <div className="p-6">
        {/* Avatar + name row */}
        <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-[#f8fafc] border border-[#edf2f7]">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#5c56e9] to-[#3b82f6] flex items-center justify-center text-white text-base font-bold shadow-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[#0f172a] font-bold text-base leading-tight truncate">{student.name}</p>
            <p className="text-[#64748b] text-xs mt-1 font-mono font-medium">{student.enrollment}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#64748b]">
                <span className="material-symbols-outlined text-[13px] text-[#94a3b8]">home</span>
                Hostel: {student.hostel || 'N/A'} (Rm {student.room || 'N/A'})
              </span>
            </div>
          </div>
        </div>

        {/* Detail rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {rows.map(({ label, value }) => (
            <div key={label} className="p-2.5 rounded-lg bg-white border border-[#edf2f7]">
              <p className="text-[#94a3b8] text-[11px] font-semibold uppercase tracking-wider mb-0.5">{label}</p>
              <p className="text-[#0f172a] text-sm font-medium truncate">{value || 'N/A'}</p>
            </div>
          ))}
        </div>

        {/* Penalty points */}
        <div className="mt-6 pt-5 border-t border-[#edf2f7] flex items-center justify-between">
          <div>
            <p className="text-[#94a3b8] text-xs font-semibold uppercase tracking-wider mb-0.5">Disciplinary Standing</p>
            <div className="flex items-baseline gap-2">
              <p className="text-[#0f172a] text-2xl font-black leading-none">{student.penaltyPoints ?? 0}</p>
              <span className="text-xs font-medium text-[#64748b]">Cumulative DAC points</span>
            </div>
          </div>
          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
            (student.penaltyPoints ?? 0) >= 70
              ? 'bg-red-50 text-red-600 border border-red-200'
              : (student.penaltyPoints ?? 0) >= 30
              ? 'bg-amber-50 text-amber-600 border border-amber-200'
              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
          }`}>
            <span className="material-symbols-outlined text-[20px]">
              {(student.penaltyPoints ?? 0) >= 70 ? 'report' : (student.penaltyPoints ?? 0) >= 30 ? 'warning' : 'verified_user'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
