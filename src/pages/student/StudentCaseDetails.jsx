import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EvidenceCard from '../../components/EvidenceCard';
import TimelineCard from '../../components/TimelineCard';
import { STUDENT_CASES } from './studentData';

function NotFound({ token, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <span className="material-symbols-outlined text-[60px] text-[#cbd5e1]">search_off</span>
      <p className="text-[#0f172a] text-lg font-semibold">Case not found</p>
      <p className="text-[#64748b] text-sm">No case with token #{token} exists.</p>
      <button
        onClick={onBack}
        className="mt-2 flex items-center gap-2 bg-[#1f3a89] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#162d6b] transition-colors shadow-sm"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Back to My Cases
      </button>
    </div>
  );
}

export default function StudentCaseDetails() {
  const { token } = useParams();
  const navigate = useNavigate();

  const caseData = useMemo(
    () => STUDENT_CASES.find((item) => item.token === token),
    [token],
  );

  if (!caseData) {
    return <NotFound token={token} onBack={() => navigate('/student/cases')} />;
  }

  const summaryRows = [
    { label: 'Token ID', value: `#${caseData.token}` },
    { label: 'Offense Type', value: caseData.offenseType },
    { label: 'Severity', value: caseData.severity },
    { label: 'Status', value: caseData.status },
    { label: 'Reported Date', value: caseData.dateReported },
    { label: 'Location', value: caseData.location },
  ];

  const incidentRows = [
    { label: 'Reported By', value: caseData.reportedBy },
    { label: 'Date', value: caseData.dateReported },
    { label: 'Time', value: caseData.time },
    { label: 'Location', value: caseData.location },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate('/student/cases')}
          className="flex items-center gap-1.5 text-[#64748b] hover:text-[#1f3a89] transition-colors text-sm font-medium"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span className="hidden sm:inline">My Cases</span>
        </button>

        <span className="text-[#e2e8f0] text-lg hidden sm:block">/</span>

        <span className="font-mono text-sm font-semibold text-[#64748b]">#{caseData.token}</span>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1f3a89] text-[18px]">summarize</span>
              <h3 className="font-semibold text-[#0f172a] text-sm">Case Summary</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
              {summaryRows.map((row) => (
                <div key={row.label}>
                  <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-0.5">{row.label}</p>
                  <p className="text-[#0f172a] text-sm font-medium">{row.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1f3a89] text-[18px]">report</span>
              <h3 className="font-semibold text-[#0f172a] text-sm">Incident Details</h3>
            </div>
            <div className="p-6 flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {incidentRows.map((row) => (
                  <div key={row.label}>
                    <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-0.5">{row.label}</p>
                    <p className="text-[#0f172a] text-sm font-medium">{row.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-2">Description</p>
                <p className="text-[#334155] text-sm leading-6 bg-slate-50 rounded-lg border border-[#e2e8f0] px-4 py-3">
                  {caseData.description}
                </p>
              </div>
            </div>
          </div>

          <EvidenceCard files={caseData.evidence} />

          {caseData.finalDecision && (
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1f3a89] text-[18px]">verified</span>
                <h3 className="font-semibold text-[#0f172a] text-sm">Final Decision</h3>
              </div>
              <div className="p-6 flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                  {[
                    { label: 'Resolved By', value: caseData.finalDecision.resolvedBy },
                    { label: 'Role', value: caseData.finalDecision.role },
                    { label: 'Resolution Date', value: caseData.finalDecision.date },
                    { label: 'Fine', value: caseData.finalDecision.fine },
                    { label: 'Penalty Points', value: caseData.finalDecision.penaltyPoints },
                    { label: 'Action Taken', value: caseData.finalDecision.actionTaken },
                  ].map((row) => (
                    <div key={row.label}>
                      <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-0.5">{row.label}</p>
                      <p className="text-[#0f172a] text-sm font-medium">{row.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-2">Remarks</p>
                  <p className="text-[#334155] text-sm leading-6 bg-slate-50 rounded-lg border border-[#e2e8f0] px-4 py-3">
                    {caseData.finalDecision.remarks}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-full xl:w-[340px] xl:shrink-0 flex flex-col gap-6">
          <TimelineCard events={caseData.timeline} />
        </div>
      </div>
    </div>
  );
}
