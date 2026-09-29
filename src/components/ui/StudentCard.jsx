export default function StudentCard({
  student,
  previousPoints = 0,
  caseCount = 0,
  onClear,
}) {
  if (!student) return null;

  const name = student.name || 'Student';
  const enrollment = student.enrollment_no || student.enrollment || 'N/A';
  const program = student.program || student.department || 'N/A';
  const batch = student.batch || student.year || '2024';
  const hostel = student.hostel || 'Hostel Block';
  const room = student.room_no || student.room || 'N/A';

  return (
    <div className="bg-white rounded-[26px] p-6 border border-purple-100 shadow-[0_8px_30px_rgba(92,84,235,0.06)] relative overflow-hidden">
      {/* Top Banner Accent */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#5c54eb] via-indigo-500 to-purple-400" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Student Avatar & Identity */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#5c54eb] to-indigo-400 text-white flex items-center justify-center text-xl font-extrabold shadow-md shadow-purple-500/20 shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-[#1e1b4b]">{name}</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-[#5c54eb] text-xs font-bold border border-purple-100">
                Verified Student
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 mt-0.5">
              Enrollment No: <span className="text-slate-700">{enrollment}</span>
            </p>
          </div>
        </div>

        {/* Previous History Badge (Informational Only) */}
        <div className="flex items-center gap-2 sm:self-center">
          <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Cumulative Points
            </span>
            <span className={`text-base font-black ${previousPoints > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {previousPoints} pts
            </span>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Past Records
            </span>
            <span className="text-base font-black text-slate-700">
              {caseCount} Cases
            </span>
          </div>

          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors ml-1"
              title="Clear selection"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Student Details */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
        <div className="p-3 rounded-2xl bg-[#fafafa]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Academic Program
          </span>
          <span className="text-xs font-bold text-[#1e1b4b] mt-0.5 block truncate">
            {program}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#fafafa]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Batch / Year
          </span>
          <span className="text-xs font-bold text-[#1e1b4b] mt-0.5 block">
            {batch}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#fafafa]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Hostel Block
          </span>
          <span className="text-xs font-bold text-[#1e1b4b] mt-0.5 block truncate">
            {hostel}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#fafafa]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Room Number
          </span>
          <span className="text-xs font-bold text-[#1e1b4b] mt-0.5 block">
            {room}
          </span>
        </div>
      </div>
    </div>
  );
}
