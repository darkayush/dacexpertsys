import { useNavigate } from 'react-router-dom';
import StudentSummaryCards from '../../components/student/StudentSummaryCards';
import StudentCasesTable from '../../components/student/StudentCasesTable';
import {
  PENALTY_THRESHOLDS,
  STUDENT_RECENT_ACTIVITY,
  STUDENT_SUMMARY,
  STUDENT_CASES,
} from './studentData';

export default function StudentDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-[#0f172a]">Summary</h3>
        <StudentSummaryCards summary={STUDENT_SUMMARY} />
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-[#0f172a]">My Cases</h3>
        <StudentCasesTable
          cases={STUDENT_CASES}
          onViewCase={(token) => navigate(`/student/cases/${token}`)}
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-[#0f172a]">Penalty Points Summary</h3>
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1f3a89] text-[18px]">policy</span>
            <h3 className="font-semibold text-[#0f172a] text-sm">Threshold Details</h3>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg border border-[#e2e8f0] p-4">
              <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-1">Total Penalty Points</p>
              <p className="text-[#0f172a] text-2xl font-bold leading-none">{STUDENT_SUMMARY.totalPenaltyPoints}</p>
            </div>
            <div className="bg-slate-50 rounded-lg border border-[#e2e8f0] p-4">
              <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-1">Warning Threshold</p>
              <p className="text-[#0f172a] text-2xl font-bold leading-none">{PENALTY_THRESHOLDS.warning}</p>
            </div>
            <div className="bg-slate-50 rounded-lg border border-[#e2e8f0] p-4">
              <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-1">Placement Ban Threshold</p>
              <p className="text-[#0f172a] text-2xl font-bold leading-none">{PENALTY_THRESHOLDS.placementBan}</p>
            </div>
            <div className="bg-slate-50 rounded-lg border border-[#e2e8f0] p-4">
              <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-1">Expulsion Threshold</p>
              <p className="text-[#0f172a] text-2xl font-bold leading-none">{PENALTY_THRESHOLDS.expulsion}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-[#0f172a]">Recent Activity</h3>
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1f3a89] text-[18px]">history</span>
            <h3 className="font-semibold text-[#0f172a] text-sm">Case Updates</h3>
          </div>
          <div className="p-6">
            <ul className="flex flex-col gap-3">
              {STUDENT_RECENT_ACTIVITY.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-[#334155]">
                  <span className="h-1.5 w-1.5 mt-2 rounded-full bg-[#1f3a89] shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
