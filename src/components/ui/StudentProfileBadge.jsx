export default function StudentProfileBadge({ student = {}, className = '' }) {
  const name = student.name || 'Unknown Student';
  const enrollment = student.enrollment_no || student.enrollment || 'N/A';
  const program = student.program || student.department || 'N/A';
  const batch = student.year || student.batch || 'N/A';
  const hostel = student.hostel || 'N/A';
  const room = student.room || 'N/A';
  const email = student.email || '';

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`rounded-3xl bg-gradient-to-br from-white to-[#f8fafd] border border-[#edf2f7] p-5 shadow-sm shadow-slate-200/50 ${className}`}
    >
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-sky-500/20 shrink-0">
          {initials || 'ST'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-[#0f172a] truncate">{name}</h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-600 border border-sky-100">
              Student
            </span>
          </div>
          <p className="text-xs text-[#64748b] font-mono mt-0.5 truncate">{enrollment}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#f1f5f9] text-xs">
        <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-[#e2e8f0]/60">
          <span className="text-[#94a3b8] block text-[10px] font-bold uppercase tracking-wider">Program</span>
          <span className="font-semibold text-[#334155]">{program}</span>
        </div>
        <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-[#e2e8f0]/60">
          <span className="text-[#94a3b8] block text-[10px] font-bold uppercase tracking-wider">Batch / Year</span>
          <span className="font-semibold text-[#334155]">{batch}</span>
        </div>
        <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-[#e2e8f0]/60">
          <span className="text-[#94a3b8] block text-[10px] font-bold uppercase tracking-wider">Hostel</span>
          <span className="font-semibold text-[#334155]">{hostel}</span>
        </div>
        <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-[#e2e8f0]/60">
          <span className="text-[#94a3b8] block text-[10px] font-bold uppercase tracking-wider">Room No.</span>
          <span className="font-semibold text-[#334155]">{room}</span>
        </div>
      </div>

      {email && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-[#64748b]">
          <span className="material-symbols-outlined text-[15px] text-[#94a3b8]">mail</span>
          <span className="truncate">{email}</span>
        </div>
      )}
    </div>
  );
}
