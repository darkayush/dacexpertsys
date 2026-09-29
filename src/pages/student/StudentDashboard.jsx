import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GreetingCard from '../../components/ui/GreetingCard';
import StudentCard from '../../components/ui/StudentCard';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import PromoAssistantCard from '../../components/ui/PromoAssistantCard';
import EmptyState from '../../components/ui/EmptyState';
import { getCases } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function toTitleCase(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const hasLoggedResponseRef = useRef(false);
  const [cases, setCases] = useState([]);
  const [summary, setSummary] = useState({
    totalCases: 0,
    activeCases: 0,
    resolvedCases: 0,
    totalPenaltyPoints: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const casesResponse = await getCases();

        if (!hasLoggedResponseRef.current) {
          console.log('StudentDashboard API response:', { cases: casesResponse });
          hasLoggedResponseRef.current = true;
        }

        const mappedCases = casesResponse.map((entry) => ({
          id: entry.id,
          token: entry.external_case_id || `#${entry.id}`,
          offenseType: toTitleCase(entry.offense_type) || 'N/A',
          severity: toTitleCase(entry.severity) || 'Low',
          status: toTitleCase(entry.status) || 'Pending',
          penaltyPoints: entry.penalty_points || 0,
          dateReported: formatDate(entry.incident_date ?? entry.created_at),
        }));

        const totalCases = casesResponse.length;
        const activeCases = casesResponse.filter((entry) =>
          ['pending_chief', 'pending_dsw', 'pending_admin', 'investigation', 'pending'].includes(
            String(entry.status || '').toLowerCase()
          )
        ).length;
        const resolvedCases = casesResponse.filter(
          (entry) => String(entry.status || '').toLowerCase() === 'resolved'
        ).length;
        const totalPenaltyPoints = casesResponse.reduce(
          (sum, entry) => sum + Number(entry.penalty_points || 0),
          0
        );

        if (mounted) {
          setCases(mappedCases);
          setSummary({ totalCases, activeCases, resolvedCases, totalPenaltyPoints });
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.message || 'Failed to fetch student records.');
          setCases([]);
          setSummary({ totalCases: 0, activeCases: 0, resolvedCases: 0, totalPenaltyPoints: 0 });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 select-none">
      
      {/* ── ROW 1: Greeting & Profile Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-5 flex flex-col justify-center">
          <GreetingCard
            role="Student"
            name={currentUser?.name}
            subtitle="Transparent access to your institutional disciplinary status, inquiry records, and committee policies."
            activeCount={summary.activeCases}
            totalCount={summary.totalCases}
          />
        </div>

        {/* Student Profile Card */}
        <div className="lg:col-span-7">
          <StudentCard
            student={currentUser}
            previousPoints={summary.totalPenaltyPoints}
            caseCount={summary.totalCases}
          />
        </div>
      </div>

      {/* ── Fair Hearing Guidance Banner ── */}
      <div className="p-5 rounded-[26px] bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white border border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#5c54eb] text-white flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[20px]">balance</span>
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-[#1e1b4b]">
              Student Rights &amp; Fair Hearing Guarantee
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Every student is entitled to present evidence and appeal committee decisions under University DAC Code.
            </p>
          </div>
        </div>

        <Link
          to="/student/disciplinary-policy"
          className="px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-[#5c54eb] text-xs font-bold border border-purple-200 transition-colors shrink-0 shadow-xs"
        >
          View Full Policy &rarr;
        </Link>
      </div>

      {/* ── ROW 2: Case Records & Assistant ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Cases Table / Card */}
        <div className="lg:col-span-8 bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#1e1b4b]">
                  My Disciplinary Inquiries
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Chronological record of reported campus incidents
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                {cases.length} Records
              </span>
            </div>

            {cases.length === 0 ? (
              <EmptyState
                icon="verified"
                title="Clean Disciplinary Record"
                description="You currently have zero active or past disciplinary inquiries on file."
              />
            ) : (
              <div className="space-y-3">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-100 hover:border-purple-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-purple-50 text-[#5c54eb] flex items-center justify-center font-bold text-xs shrink-0">
                        #
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#1e1b4b]">
                            {c.token}
                          </span>
                          <span className="text-xs font-bold text-slate-600">
                            · {c.offenseType}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Reported on {c.dateReported} · Points: {c.penaltyPoints}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <StatusBadge status={c.status} />
                      <SeverityBadge severity={c.severity} />
                      <Link
                        to={`/student/cases/${c.token}`}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#5c54eb] text-slate-600 hover:text-white border border-slate-200 text-xs font-bold transition-all shadow-xs"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Assistant Card */}
        <div className="lg:col-span-4">
          <PromoAssistantCard />
        </div>
      </div>

    </div>
  );
}
