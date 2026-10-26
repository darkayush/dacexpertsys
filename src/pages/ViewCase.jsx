import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import StudentDetailsCard from '../components/StudentDetailsCard';
import PreviousOffencesTable from '../components/PreviousOffencesTable';
import IncidentDetailsCard from '../components/IncidentDetailsCard';
import EvidenceCard from '../components/EvidenceCard';
import CaseResolutionCard from '../components/CaseResolutionCard';
import TimelineCard from '../components/TimelineCard';
import StatusBadge from '../components/ui/StatusBadge';
import SeverityBadge from '../components/ui/SeverityBadge';
import { pageVariants, listVariants, itemVariants } from '../lib/motion';
import { getCases, getUsers } from '../services/api';

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

function formatTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function buildResolvedTimeline(caseRow) {
  const date = formatDate(caseRow.incident_date ?? caseRow.created_at);
  return [
    { title: 'Case Reported', date, state: 'completed', note: 'Case registered.' },
    { title: 'Investigation Started', date, state: 'completed', note: 'Investigation completed.' },
    { title: 'DAC Committee Review', date, state: 'completed', note: 'Committee review completed.' },
    { title: 'Decision Issued', date, state: 'completed', note: 'Resolution decision issued.' },
    { title: 'Resolved & Archival', date, state: 'completed', note: 'Case closed and recorded.' },
  ];
}

function NotFound({ token, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
        <span className="material-symbols-outlined text-[36px]">search_off</span>
      </div>
      <div>
        <p className="text-[#0f172a] text-lg font-bold">Resolved Case Not Found</p>
        <p className="text-[#64748b] text-sm mt-1">
          No resolved case with token <span className="font-mono font-semibold text-[#5c56e9]">#{token}</span> exists.
        </p>
      </div>
      <button
        onClick={onBack}
        className="mt-2 flex items-center gap-2 bg-[#5c56e9] hover:bg-[#4338ca] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Return to Dashboard
      </button>
    </div>
  );
}

export default function ViewCase() {
  const { token } = useParams();
  const navigate = useNavigate();
  const hasLoggedResponseRef = useRef(false);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const [casesResponse, usersResponse] = await Promise.all([getCases(), getUsers()]);

        if (!hasLoggedResponseRef.current) {
          console.log('ViewCase API response:', { cases: casesResponse, users: usersResponse });
          hasLoggedResponseRef.current = true;
        }

        const matched = casesResponse.find((entry) => String(entry.id) === String(token));
        if (!matched || String(matched.status || '').toLowerCase() !== 'resolved') {
          if (mounted) setCaseData(null);
          return;
        }

        const usersById = Object.fromEntries(usersResponse.map((user) => [String(user.id), user]));
        const student = usersById[String(matched.student_id)] ?? {};
        const reporter = usersById[String(matched.reported_by)] ?? null;
        const resolver = usersById[String(matched.resolved_by)] ?? null;

        const previousOffences = casesResponse
          .filter((entry) => entry.student_id === matched.student_id && entry.id !== matched.id)
          .map((entry) => ({
            date: formatDate(entry.incident_date ?? entry.created_at),
            offenseType: toTitleCase(entry.offense_type) || 'N/A',
            severity: toTitleCase(entry.severity) || 'Low',
            penaltyPoints: entry.penalty_points ?? 0,
            status: toTitleCase(entry.status) || 'Pending',
          }));

        const severity = toTitleCase(matched.severity) || 'Low';
        const points = matched.penalty_points ?? 0;

        const mapped = {
          token: `#${matched.id}`,
          offenseType: toTitleCase(matched.offense_type) || 'N/A',
          severity,
          resolvedOn: formatDate(matched.created_at),
          student: {
            name: student.name || matched.student_name || 'Unknown Student',
            enrollment: student.enrollment_no || matched.enrollment_no || `ID-${matched.student_id}`,
            year: student.year ? `${student.year} Year` : 'N/A',
            department: student.program ? toTitleCase(student.program) : (matched.program ? toTitleCase(matched.program) : 'N/A'),
            email: student.email || 'N/A',
            contact: student.contact || 'N/A',
            hostel: student.hostel || matched.hostel || 'N/A',
            room: student.room || matched.room || 'N/A',
            penaltyPoints: student.total_points ?? points,
          },
          previousOffences,
          incident: {
            token: `#${matched.id}`,
            date: formatDate(matched.incident_date ?? matched.created_at),
            time: formatTime(matched.created_at),
            location: matched.location || 'N/A',
            offenseType: toTitleCase(matched.offense_type) || 'N/A',
            reportedBy: reporter?.name || (matched.reported_by ? `User #${matched.reported_by}` : 'System'),
            description: matched.description || 'No description available.',
          },
          evidence: [],
          resolution: {
            resolvedBy: resolver?.name || (matched.resolved_by ? `User #${matched.resolved_by}` : 'DAC Committee'),
            role: resolver?.role ? toTitleCase(resolver.role) : 'Disciplinary Board',
            date: formatDate(matched.created_at),
            fine: '₹ 0',
            penaltyPoints: `${points} pts`,
            actionTaken: points > 0 ? 'Sanction Enforced' : 'Official Warning',
            remarks: matched.description || 'Case resolved and sanctions recorded per university protocol.',
          },
          timeline: buildResolvedTimeline(matched),
        };

        if (mounted) setCaseData(mapped);
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.message || 'Failed to fetch resolved case details.');
          setCaseData(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-[#f5f7fc] font-sans antialiased text-[#1e293b]">
      <Sidebar />

      <main className="pt-16 md:pt-0 md:pl-20 xl:pl-64 flex flex-col min-h-screen transition-all">
        {/* Sticky Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-[#edf2f7] sticky top-0 z-20 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4 max-w-[1400px] mx-auto w-full">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1.5 text-[#64748b] hover:text-[#5c56e9] transition-colors text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#f8fafc] border border-[#edf2f7]"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Dashboard
              </button>

              <span className="text-[#cbd5e1] font-mono">/</span>

              <span className="font-mono text-xs font-bold text-[#5c56e9] bg-[#5c56e9]/10 px-2.5 py-1 rounded-lg">
                {caseData ? caseData.token : `#${token}`}
              </span>

              {caseData && (
                <>
                  <span className="text-[#cbd5e1] font-mono">/</span>
                  <span className="text-[#0f172a] text-sm font-bold truncate max-w-[200px]">
                    {caseData.student.name}
                  </span>
                </>
              )}
            </div>

            {caseData && (
              <div className="flex items-center gap-3">
                <StatusBadge status="Resolved" />
                <SeverityBadge severity={caseData.severity} />
              </div>
            )}
          </div>
        </header>

        {/* Page body */}
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-3 border-[#5c56e9] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-[#64748b]">Loading resolved case records...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              Error: {error}
            </div>
          ) : !caseData ? (
            <NotFound token={token} onBack={() => navigate('/dashboard')} />
          ) : (
            <motion.div
              variants={pageVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-6"
            >
              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col xl:flex-row gap-6 items-start"
              >
                {/* Left column */}
                <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
                  <motion.div variants={itemVariants}>
                    <CaseResolutionCard resolution={caseData.resolution} />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <StudentDetailsCard student={caseData.student} />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <IncidentDetailsCard incident={caseData.incident} />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <EvidenceCard files={caseData.evidence} />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <PreviousOffencesTable offences={caseData.previousOffences} />
                  </motion.div>
                </div>

                {/* Right column */}
                <div className="w-full xl:w-[360px] xl:shrink-0 flex flex-col gap-6">
                  <motion.div variants={itemVariants}>
                    <TimelineCard events={caseData.timeline} />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <div className="bg-white rounded-2xl border border-[#edf2f7] shadow-sm overflow-hidden p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-[18px]">verified</span>
                        </div>
                        <h3 className="font-bold text-[#0f172a] text-sm">Resolution Archive</h3>
                      </div>
                      <div className="divide-y divide-[#edf2f7]">
                        {[
                          { label: 'Case Outcome',      value: 'Resolved & Closed' },
                          { label: 'Closure Date',      value: caseData.resolvedOn },
                          { label: 'Points Assigned',   value: `${caseData.student.penaltyPoints} pts` },
                          { label: 'DAC Standing',      value: 'Official Record' },
                        ].map(({ label, value }) => (
                          <div key={label} className="py-2.5 flex items-center justify-between">
                            <span className="text-[#64748b] text-xs font-medium">{label}</span>
                            <span className="text-[#0f172a] text-xs font-bold">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
