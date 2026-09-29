import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DACLayout from '../components/layout/DACLayout';
import StudentDetailsCard from '../components/StudentDetailsCard';
import PreviousOffencesTable from '../components/PreviousOffencesTable';
import IncidentDetailsCard from '../components/IncidentDetailsCard';
import EvidenceCard from '../components/EvidenceCard';
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

function buildTimeline(status) {
  const normalized = String(status || '').toLowerCase();
  return [
    { title: 'Case Reported', date: null, state: 'completed', note: 'Case registered in system with incident report.' },
    { title: 'Investigation Started', date: null, state: ['investigation', 'dac_review', 'resolved'].includes(normalized) ? 'completed' : 'upcoming', note: null },
    { title: 'DAC Committee Review', date: null, state: ['dac_review', 'resolved'].includes(normalized) ? 'completed' : 'upcoming', note: null },
    { title: 'Formal Decision Issued', date: null, state: normalized === 'resolved' ? 'completed' : 'upcoming', note: null },
    { title: 'Case Closed & Resolved', date: null, state: normalized === 'resolved' ? 'completed' : 'upcoming', note: null },
  ];
}

function NotFound({ token, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
        <span className="material-symbols-outlined text-[36px]">search_off</span>
      </div>
      <div>
        <p className="text-[#0f172a] text-lg font-bold">Case Record Not Found</p>
        <p className="text-[#64748b] text-sm mt-1">No case with token <span className="font-mono font-semibold text-[#5c56e9]">#{token}</span> exists in the database.</p>
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

export default function ManageCase() {
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
          console.log('ManageCase API response:', { cases: casesResponse, users: usersResponse });
          hasLoggedResponseRef.current = true;
        }

        const matched = casesResponse.find((entry) => String(entry.id) === String(token));
        if (!matched) {
          if (mounted) setCaseData(null);
          return;
        }

        const usersById = Object.fromEntries(usersResponse.map((user) => [String(user.id), user]));
        const student = usersById[String(matched.student_id)] ?? {};
        const reporter = usersById[String(matched.reported_by)] ?? null;

        const previousOffences = casesResponse
          .filter((entry) => entry.student_id === matched.student_id && entry.id !== matched.id)
          .map((entry) => ({
            date: formatDate(entry.incident_date ?? entry.created_at),
            offenseType: toTitleCase(entry.offense_type) || 'N/A',
            severity: toTitleCase(entry.severity) || 'Low',
            penaltyPoints: entry.penalty_points ?? 0,
            status: toTitleCase(entry.status) || 'Pending',
          }));

        const status = toTitleCase(matched.status) || 'Pending';
        const severity = toTitleCase(matched.severity) || 'Low';

        const mapped = {
          token: `#${matched.id}`,
          status,
          severity,
          student: {
            name: student.name || matched.student_name || 'Unknown Student',
            enrollment: student.enrollment_no || matched.enrollment_no || `ID-${matched.student_id}`,
            year: student.year ? `${student.year} Year` : 'N/A',
            department: student.program ? toTitleCase(student.program) : (matched.program ? toTitleCase(matched.program) : 'N/A'),
            email: student.email || 'N/A',
            contact: student.contact || 'N/A',
            hostel: student.hostel || matched.hostel || 'N/A',
            room: student.room || matched.room_no || 'N/A',
            penaltyPoints: student.total_points ?? matched.penalty_points ?? 0,
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
          timeline: buildTimeline(matched.status),
        };

        if (mounted) setCaseData(mapped);
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.message || 'Failed to fetch case details.');
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
    <DACLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="h-10 w-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              title="Return to Dashboard"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-[#1e1b4b]">
                  {caseData ? caseData.token : `#${token}`}
                </h2>
                {caseData && (
                  <>
                    <StatusBadge status={caseData.status} />
                    <SeverityBadge severity={caseData.severity} />
                  </>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {caseData ? (
                  <>
                    Student: <span className="font-bold text-slate-700">{caseData.student.name}</span> ({caseData.student.enrollment}) · Incident: {caseData.incident.date}
                  </>
                ) : 'Loading inquiry details...'}
              </p>
            </div>
          </div>
        </div>

        {/* Page body */}
        <div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="material-symbols-outlined animate-spin text-[32px] text-[#5c54eb]">
                progress_activity
              </span>
              <p className="text-xs font-semibold text-slate-400">Loading case records...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              Error: {error}
            </div>
          ) : !caseData ? (
            <NotFound token={token} onBack={() => navigate('/dashboard')} />
          ) : (
            <div className="space-y-6">
              {/* 2-Column Editorial Grid: Left (Incident & Evidence) vs Right (Student & Actions) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left column */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <IncidentDetailsCard incident={caseData.incident} />
                  <EvidenceCard files={caseData.evidence} />
                  <PreviousOffencesTable offences={caseData.previousOffences} />
                </div>

                {/* Right column */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <StudentDetailsCard student={caseData.student} />

                  {/* Actions card */}
                  <div className="bg-white rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-xl bg-purple-50 text-[#5c54eb] flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[18px]">bolt</span>
                      </div>
                      <h3 className="font-extrabold text-[#1e1b4b] text-sm">Administrative Actions</h3>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={() => alert('Decision recorded.')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full text-xs font-bold bg-[#5c54eb] hover:bg-indigo-700 text-white shadow-md shadow-purple-500/20 transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Approve Resolution</span>
                      </button>
                      <button
                        onClick={() => alert('Escalated to DAC panel.')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">gavel</span>
                        <span>Refer to DAC Hearing</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-white rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[18px]">payments</span>
                      </div>
                      <h3 className="font-extrabold text-[#1e1b4b] text-sm">Disciplinary Assessment</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {[
                        { label: 'Offense Category', value: caseData.incident.offenseType },
                        { label: 'Severity Class', value: caseData.severity },
                        { label: 'Assessed Fine', value: '₹ 2,500' },
                        { label: 'Assessed Penalty', value: `${caseData.student.penaltyPoints} pts` },
                      ].map(({ label, value }) => (
                        <div key={label} className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-500 text-xs font-medium">{label}</span>
                          <span className="text-[#1e1b4b] text-xs font-extrabold">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom: Large Timeline Card */}
              <div>
                <TimelineCard events={caseData.timeline} />
              </div>
            </div>
          )}
        </div>
      </div>
    </DACLayout>
  );
}
