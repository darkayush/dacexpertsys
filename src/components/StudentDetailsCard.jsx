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

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
        <span className="material-symbols-outlined text-[#1f3a89] text-[18px]">person</span>
        <h3 className="font-semibold text-[#0f172a] text-sm">Student Details</h3>
      </div>

      <div className="p-6">
        {/* Avatar + name row */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold shrink-0">
            {student.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[#0f172a] font-semibold text-base leading-tight">{student.name}</p>
            <p className="text-[#64748b] text-xs mt-0.5">{student.enrollment}</p>
          </div>
        </div>

        {/* Detail rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {rows.map(({ label, value }) => (
            <div key={label}>
              <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-[#0f172a] text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>

        {/* Penalty points */}
        <div className="mt-6 pt-5 border-t border-[#e2e8f0] flex items-center justify-between">
          <div>
            <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-0.5">Penalty Points</p>
            <p className="text-[#0f172a] text-2xl font-bold leading-none">{student.penaltyPoints}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-[#fff7ed] border border-[#fed7aa] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-orange-400 text-[18px]">report</span>
          </div>
        </div>
      </div>
    </div>
  );
}
