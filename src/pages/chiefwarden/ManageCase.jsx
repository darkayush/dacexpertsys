import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import DACLayout from '../../components/layout/DACLayout';
import StudentDetailsCard from '../../components/StudentDetailsCard';
import IncidentDetailsCard from '../../components/IncidentDetailsCard';
import EvidenceCard from '../../components/EvidenceCard';
import TimelineCard from '../../components/TimelineCard';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { pageVariants, listVariants, itemVariants } from '../../lib/motion';
import { getCases, getUsers } from '../../services/api';

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

function NotFound({ token, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
        <span className="material-symbols-outlined text-[36px]">search_off</span>
      </div>
      <div>
        <p className="text-[#0f172a] text-lg font-bold">Case Record Not Found</p>
        <p className="text-[#64748b] text-sm mt-1">
          No case with token <span className="font-mono font-semibold text-[#5c56e9]">#{token}</span> found in review queue.
        </p>
      </div>
      <button
        onClick={onBack}
        className="mt-2 flex items-center gap-2 bg-[#5c56e9] hover:bg-[#4338ca] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Return to Incoming Cases
      </button>
    </div>
  );
}

export default function ChiefWardenManageCase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const hasLoggedResponseRef = useRef(false);
  const [liveCaseData, setLiveCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const [casesResponse, usersResponse] = await Promise.all([getCases(), getUsers()]);

        if (!hasLoggedResponseRef.current) {
          console.log('Chief Warden ManageCase API response:', { cases: casesResponse, users: usersResponse });
          hasLoggedResponseRef.current = true;
        }

        const matched = casesResponse.find((entry) => String(entry.id) === String(id));
        if (!matched) {
          if (mounted) setLiveCaseData(null);
          return;
        }

        const usersById = Object.fromEntries(usersResponse.map((user) => [String(user.id), user]));
        const student = usersById[String(matched.student_id)] ?? {};
        const reporter = usersById[String(matched.reported_by)] ?? null;

        const severity = toTitleCase(matched.severity) || 'Medium';
        const status = toTitleCase(matched.status) || 'DAC Review';

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
            hostel: student.hostel || matched.hostel || 'Hostel',
            room: student.room || matched.room || 'N/A',
            penaltyPoints: student.total_points ?? matched.penalty_points ?? 0,
          },
          incident: {
            token: `#${matched.id}`,
            date: formatDate(matched.incident_date ?? matched.created_at),
            time: formatTime(matched.created_at),
            location: matched.location || 'Campus / Hostel',
            offenseType: toTitleCase(matched.offense_type) || 'N/A',
            reportedBy: reporter?.name || (matched.reported_by ? `User #${matched.reported_by}` : 'Hostel Authority'),
            description: matched.description || 'No description recorded.',
          },
          evidence: [],
          questionnaire: {
            intoxicated: /alcohol|substance|drug/i.test(matched.offense_type || ''),
            cooperated: true,
            repeated: (student.total_points || 0) > 0,
          },
          wardenNotes: matched.description ? `Forwarded by Warden: ${matched.description}` : 'Escalated without notes.',
          timeline: [
            { title: 'Case Registered', date: formatDate(matched.incident_date ?? matched.created_at), state: 'completed', note: 'Logged by warden.' },
            { title: 'Escalated to Chief Warden', date: formatDate(matched.created_at), state: 'active', note: 'Under Chief Warden review.' },
            { title: 'Forwarded to DSW / DAC', date: null, state: 'upcoming', note: 'Next tier escalation if required.' },
          ],
        };

        if (mounted) setLiveCaseData(mapped);
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.message || 'Failed to fetch case details.');
          setLiveCaseData(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [id]);

  const caseData = liveCaseData;

  const handleEscalateToDSW = () => {
    alert('Case successfully escalated to Dean of Student Welfare (DSW).');
    navigate('/chief-warden/incoming');
  };

  const handleIssueWarning = () => {
    alert('Chief Warden warning recorded and student sanctioned.');
    navigate('/chief-warden/incoming');
  };

  return (
    <DACLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/chief-warden/cases')}
              className="h-10 w-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              title="Return to Incoming Cases"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-[#1e1b4b]">
                  {caseData ? caseData.token : id}
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
          {loading && !caseData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="material-symbols-outlined animate-spin text-[32px] text-[#5c54eb]">
                progress_activity
              </span>
              <p className="text-xs font-semibold text-slate-400">Loading case records...</p>
            </div>
          ) : !caseData ? (
            <NotFound token={id} onBack={() => navigate('/chief-warden/cases')} />
          ) : (
            <div className="space-y-6">
              {/* 2-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left column */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <IncidentDetailsCard incident={caseData.incident} />
                  <EvidenceCard files={caseData.evidence} />

                  {/* Questionnaire */}
                  <div className="bg-white rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-xl bg-purple-50 text-[#5c54eb] flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[18px]">psychology</span>
                      </div>
                      <h3 className="font-extrabold text-[#1e1b4b] text-sm">Disciplinary Assessment</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Substance Suspected', value: caseData.questionnaire.intoxicated ? 'Yes' : 'No' },
                        { label: 'Student Cooperated', value: caseData.questionnaire.cooperated ? 'Yes' : 'No' },
                        { label: 'Repeat Offender', value: caseData.questionnaire.repeated ? 'Yes' : 'No' },
                      ].map(({ label, value }) => (
                        <div key={label} className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
                          <p className="text-[#1e1b4b] text-xs font-black">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chief Warden Review Remarks */}
                  <div className="bg-white rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-xl bg-purple-50 text-[#5c54eb] flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[18px]">rate_review</span>
                      </div>
                      <h3 className="font-extrabold text-[#1e1b4b] text-sm">Chief Warden Review &amp; Recommendation</h3>
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Add review findings, rationale for escalation, or recommended sanctions..."
                      className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#5c54eb] focus:bg-white focus:ring-4 focus:ring-purple-100 transition-all"
                    />
                  </div>

                  {/* Decision Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleEscalateToDSW}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#5c54eb] hover:bg-indigo-700 text-white text-xs font-bold rounded-full shadow-md shadow-purple-500/20 transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[18px]">gavel</span>
                      <span>Forward &amp; Escalate to DSW</span>
                    </button>
                    <button
                      onClick={handleIssueWarning}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-full shadow-md shadow-amber-500/20 transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[18px]">warning</span>
                      <span>Issue Hostel Warning</span>
                    </button>
                  </div>
                </div>

                {/* Right column */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <StudentDetailsCard student={caseData.student} />
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
