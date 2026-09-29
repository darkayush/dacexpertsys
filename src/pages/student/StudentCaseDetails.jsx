import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EvidenceCard from '../../components/EvidenceCard';
import TimelineCard from '../../components/TimelineCard';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
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
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
        <span className="material-symbols-outlined text-[36px]">search_off</span>
      </div>
      <div>
        <p className="text-[#0f172a] text-lg font-bold">Case Record Not Found</p>
        <p className="text-[#64748b] text-sm mt-1">No case with token #{token} exists in your records.</p>
      </div>
      <button
        onClick={onBack}
        className="mt-2 flex items-center gap-2 bg-[#5c56e9] hover:bg-[#4338ca] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Return to My Cases
      </button>
    </div>
  );
}

export default function StudentCaseDetails() {
  const { token } = useParams();
  const navigate = useNavigate();
  const hasLoggedResponseRef = useRef(false);
  const [cases, setCases] = useState([]);
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
          console.log('StudentCaseDetails API response:', { cases: casesResponse, users: usersResponse });
          hasLoggedResponseRef.current = true;
        }

        const usersById = Object.fromEntries(usersResponse.map((user) => [String(user.id), user]));

        const mappedCases = casesResponse.map((entry) => {
          const reporter = usersById[String(entry.reported_by)] ?? null;
          const resolver = usersById[String(entry.resolved_by)] ?? null;

          const isResolved = String(entry.status || '').toLowerCase() === 'resolved';
          const isReview = ['investigation', 'dac_review'].includes(String(entry.status || '').toLowerCase());

          return {
            token: String(entry.id),
            offenseType: toTitleCase(entry.offense_type) || 'N/A',
            severity: toTitleCase(entry.severity) || 'Low',
            status: toTitleCase(entry.status) || 'Pending',
            dateReported: formatDate(entry.incident_date ?? entry.created_at),
            time: formatTime(entry.created_at),
            location: entry.location || 'Campus Premises',
            reportedBy: reporter?.name || (entry.reported_by ? `Staff #${entry.reported_by}` : 'Hostel Authority'),
            description: entry.description || 'No description recorded.',
            penaltyPoints: entry.penalty_points ?? 0,
            evidence: [],
            timeline: [
              {
                title: 'Case Reported',
                date: formatDate(entry.incident_date ?? entry.created_at),
                state: 'completed',
                note: 'Reported to disciplinary authority.',
              },
              {
                title: 'Inquiry & Investigation',
                date: formatDate(entry.created_at),
                state: isReview || isResolved ? 'completed' : 'active',
                note: isReview || isResolved ? 'Investigation completed.' : 'Case currently under inquiry.',
              },
              {
                title: 'Decision & Resolution',
                date: isResolved ? formatDate(entry.created_at) : null,
                state: isResolved ? 'completed' : 'upcoming',
                note: isResolved ? 'Final disciplinary order issued.' : 'Awaiting committee ruling.',
              },
            ],
            finalDecision: isResolved
              ? {
                  resolvedBy: resolver?.name || (entry.resolved_by ? `Official #${entry.resolved_by}` : 'DAC Committee'),
                  role: resolver?.role ? toTitleCase(resolver.role) : 'DAC Authority',
                  date: formatDate(entry.created_at),
                  fine: '₹ 0',
                  penaltyPoints: `${entry.penalty_points ?? 0} pts`,
                  actionTaken: (entry.penalty_points ?? 0) > 0 ? 'Penalty Points Assigned' : 'Warning Issued',
                  remarks: entry.description || 'Case formally concluded.',
                }
              : null,
          };
        });

        if (mounted) setCases(mappedCases);
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.message || 'Failed to fetch case details.');
          setCases([]);
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

  const caseData = useMemo(
    () => cases.find((item) => item.token === token),
    [cases, token],
  );

  if (loading && !caseData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-3 border-[#5c56e9] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-[#64748b]">Loading case records...</p>
      </div>
    );
  }

  if (!loading && error) {
    return (
      <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
        Error: {error}
      </div>
    );
  }

  if (!caseData) {
    return <NotFound token={token} onBack={() => navigate('/student/cases')} />;
  }

  const summaryRows = [
    { label: 'Token ID', value: `#${caseData.token}`, icon: 'tag' },
    { label: 'Offense Type', value: caseData.offenseType, icon: 'gavel' },
    { label: 'Reported Date', value: caseData.dateReported, icon: 'calendar_today' },
    { label: 'Incident Time', value: caseData.time, icon: 'schedule' },
    { label: 'Location', value: caseData.location, icon: 'location_on' },
    { label: 'Reporting Authority', value: caseData.reportedBy, icon: 'person_pin' },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white rounded-2xl p-4 border border-[#edf2f7] shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/student/cases')}
            className="flex items-center gap-1.5 text-[#64748b] hover:text-[#5c56e9] transition-colors text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#f8fafc] border border-[#edf2f7]"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            My Cases
          </button>

          <span className="text-[#cbd5e1] font-mono">/</span>

          <span className="font-mono text-xs font-bold text-[#5c56e9] bg-[#5c56e9]/10 px-2.5 py-1 rounded-lg">
            #{caseData.token}
          </span>
          <span className="text-[#0f172a] text-sm font-bold truncate">
            {caseData.offenseType}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={caseData.status} />
          <SeverityBadge severity={caseData.severity} />
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Left column */}
        <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
          {/* Case Summary Card */}
          <div className="bg-white rounded-2xl border border-[#edf2f7] shadow-sm overflow-hidden p-6 transition-all hover:shadow-md">
            <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-[#edf2f7]">
              <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[18px]">summarize</span>
              </div>
              <div>
                <h3 className="font-bold text-[#0f172a] text-sm leading-tight">Case Record Overview</h3>
                <p className="text-[11px] text-[#94a3b8]">Report metadata and classification</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {summaryRows.map((row) => (
                <div key={row.label} className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#edf2f7] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-xs border border-[#edf2f7] flex items-center justify-center text-[#5c56e9] shrink-0">
                    <span className="material-symbols-outlined text-[16px]">{row.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-wider mb-0.5">{row.label}</p>
                    <p className="text-[#0f172a] text-xs font-semibold truncate">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Statement / Description */}
            <div className="mt-5 pt-4 border-t border-[#edf2f7]">
              <p className="text-[#94a3b8] text-xs font-bold uppercase tracking-wider mb-2">Recorded Statement & Description</p>
              <div className="text-[#334155] text-sm leading-relaxed bg-[#f8fafc] rounded-2xl border border-[#edf2f7] p-4 font-normal">
                {caseData.description}
              </div>
            </div>
          </div>

          <EvidenceCard files={caseData.evidence} />

          {caseData.finalDecision && (
            <div className="bg-white rounded-2xl border border-[#edf2f7] shadow-sm overflow-hidden p-6 transition-all hover:shadow-md">
              <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-[#edf2f7]">
                <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </div>
                <div>
                  <h3 className="font-bold text-[#0f172a] text-sm leading-tight">Official Decision & Ruling</h3>
                  <p className="text-[11px] text-[#94a3b8]">Binding disciplinary committee ruling</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { label: 'Resolved Authority', value: caseData.finalDecision.resolvedBy },
                  { label: 'Authority Role', value: caseData.finalDecision.role },
                  { label: 'Resolution Date', value: caseData.finalDecision.date },
                  { label: 'Assessed Fine', value: caseData.finalDecision.fine },
                  { label: 'Assigned DAC Points', value: caseData.finalDecision.penaltyPoints },
                  { label: 'Action Decision', value: caseData.finalDecision.actionTaken },
                ].map((row) => (
                  <div key={row.label} className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#edf2f7]">
                    <p className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-wider mb-0.5">{row.label}</p>
                    <p className="text-[#0f172a] text-xs font-semibold">{row.value}</p>
                  </div>
                ))}
              </div>

              {caseData.finalDecision.remarks && (
                <div className="mt-5 pt-4 border-t border-[#edf2f7]">
                  <p className="text-[#94a3b8] text-xs font-bold uppercase tracking-wider mb-2">Remarks</p>
                  <p className="text-[#334155] text-sm leading-relaxed bg-[#f8fafc] rounded-2xl border border-[#edf2f7] p-4 font-normal">
                    {caseData.finalDecision.remarks}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="w-full xl:w-[360px] xl:shrink-0 flex flex-col gap-6">
          <TimelineCard events={caseData.timeline} />
        </div>
      </div>
    </div>
  );
}
