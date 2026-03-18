import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import StudentDetailsCard from '../components/StudentDetailsCard';
import PreviousOffencesTable from '../components/PreviousOffencesTable';
import IncidentDetailsCard from '../components/IncidentDetailsCard';
import EvidenceCard from '../components/EvidenceCard';
import CaseResolutionCard from '../components/CaseResolutionCard';
import TimelineCard from '../components/TimelineCard';
import { pageVariants, listVariants, itemVariants } from '../lib/motion';

// ─── Dummy data keyed by token ─────────────────────────────────────────────────
const DUMMY_RESOLVED_CASES = {
  '2024-003': {
    token: '#2024-003',
    offenseType: 'Attendance',
    severity: 'Low',
    severityClass: 'bg-slate-100 text-slate-700',
    resolvedOn: '15 Feb 2024',

    student: {
      name: 'Robert Brown',
      enrollment: '21EN007',
      year: '3rd Year',
      department: 'Engineering',
      email: 'robert.brown@university.edu',
      contact: '+91 87654 32109',
      hostel: 'BSH',
      room: 'C-112',
      penaltyPoints: 10,
    },

    previousOffences: [],

    incident: {
      token: '#2024-003',
      date: '20 Jan 2024',
      time: '09:00 AM',
      location: 'Engineering Block — Lecture Hall 3',
      offenseType: 'Attendance',
      reportedBy: 'Prof. R. Mehta',
      description:
        'Student recorded 34% attendance in the Engineering Mathematics course against the required minimum of 75%. Multiple warnings were issued during the semester (Nov 2023, Dec 2023) with no improvement. The case was escalated to the Warden following the end-of-semester review.',
    },

    evidence: [
      { name: 'Attendance_Sheet_Jan.pdf', size: '420 KB', uploadedAt: '20 Jan 2024' },
      { name: 'Warning_Letter_Dec.pdf',   size: '185 KB', uploadedAt: '05 Dec 2023' },
    ],

    resolution: {
      resolvedBy:    'Dr. Amit Sharma',
      role:          'Dean of Student Welfare',
      date:          '15 Feb 2024',
      fine:          '₹ 1,000',
      penaltyPoints: '10 pts',
      actionTaken:   'Written Warning',
      remarks:
        'Student admitted to the attendance violation and cited personal health issues as the cause. Given the first-time nature of the offense and supporting medical documentation, the committee decided on a written warning along with a compulsory counselling session. A repeat violation will result in debarment from end-semester exams.',
    },

    timeline: [
      { title: 'Case Reported',         date: '20 Jan 2024', state: 'completed', note: 'Reported by Prof. R. Mehta.' },
      { title: 'Investigation Started', date: '22 Jan 2024', state: 'completed', note: 'DSW office reviewed attendance records.' },
      { title: 'DAC Review',            date: '10 Feb 2024', state: 'completed', note: 'Committee hearing held. Student present.' },
      { title: 'Decision Issued',       date: '12 Feb 2024', state: 'completed', note: 'Written warning & counselling session ordered.' },
      { title: 'Resolved',              date: '15 Feb 2024', state: 'completed', note: 'Case closed by Dean.' },
    ],
  },

  '2024-005': {
    token: '#2024-005',
    offenseType: 'Disruption',
    severity: 'Medium',
    severityClass: 'bg-yellow-100 text-yellow-800',
    resolvedOn: '01 Mar 2024',

    student: {
      name: 'Michael Green',
      enrollment: '23BA022',
      year: '1st Year',
      department: 'Business Administration',
      email: 'michael.green@university.edu',
      contact: '+91 76543 21098',
      hostel: 'BSH',
      room: 'A-305',
      penaltyPoints: 25,
    },

    previousOffences: [
      { date: '03 Nov 2023', offenseType: 'Noise Violation', severity: 'Low', penaltyPoints: 5, status: 'Resolved' },
    ],

    incident: {
      token: '#2024-005',
      date: '14 Feb 2024',
      time: '02:30 PM',
      location: 'Library — Reading Room',
      offenseType: 'Disruption',
      reportedBy: 'Library Warden',
      description:
        'Student was involved in a verbal altercation with another student in the reading room, causing significant disruption to approximately 30 other students. Despite being asked twice to maintain decorum by library staff, the student continued the argument before being escorted out by security.',
    },

    evidence: [
      { name: 'Incident_Report.pdf', size: '310 KB', uploadedAt: '14 Feb 2024' },
      { name: 'CCTV_Snapshot.jpg',   size: '890 KB', uploadedAt: '15 Feb 2024' },
    ],

    resolution: {
      resolvedBy:    'Prof. Neeta Joshi',
      role:          'Warden, Block A',
      date:          '01 Mar 2024',
      fine:          '₹ 2,500',
      penaltyPoints: '25 pts',
      actionTaken:   'Community Service (10 hours)',
      remarks:
        'Student accepted responsibility during the hearing. Given prior noise violation, the committee imposed a fine and community service. Student has been informed that any further misconduct will result in hostel expulsion.',
    },

    timeline: [
      { title: 'Case Reported',         date: '14 Feb 2024', state: 'completed', note: 'Reported by Library Warden.' },
      { title: 'Investigation Started', date: '16 Feb 2024', state: 'completed', note: 'Security and witness statements collected.' },
      { title: 'DAC Review',            date: '25 Feb 2024', state: 'completed', note: 'Hearing conducted. Student acknowledged incident.' },
      { title: 'Decision Issued',       date: '28 Feb 2024', state: 'completed', note: 'Fine and community service imposed.' },
      { title: 'Resolved',              date: '01 Mar 2024', state: 'completed', note: 'Case closed by Warden.' },
    ],
  },
};

// ─── Not found fallback ───────────────────────────────────────────────────────
function NotFound({ token, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <span className="material-symbols-outlined text-[60px] text-[#cbd5e1]">search_off</span>
      <p className="text-[#0f172a] text-lg font-semibold">Case not found</p>
      <p className="text-[#64748b] text-sm">
        No resolved case with token <span className="font-mono font-semibold">#{token}</span> exists.
      </p>
      <button
        onClick={onBack}
        className="mt-2 flex items-center gap-2 bg-[#1f3a89] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#162d6b] transition-colors shadow-sm"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Back to Dashboard
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ViewCase() {
  const { token } = useParams();
  const navigate = useNavigate();

  const caseData = DUMMY_RESOLVED_CASES[token];

  return (
    <div className="min-h-screen bg-[#f9f9fb] font-sans antialiased">
      <Sidebar />

      <main className="pt-14 md:pt-0 md:pl-64 flex flex-col min-h-screen bg-[#f9f9fb]">

        {/* ── Sticky Header ── */}
        <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-20 px-4 md:px-6 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Back */}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-[#64748b] hover:text-[#1f3a89] transition-colors text-sm font-medium"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span className="hidden sm:inline">Dashboard</span>
            </button>

            <span className="text-[#e2e8f0] text-lg hidden sm:block">/</span>

            <span className="font-mono text-sm font-semibold text-[#64748b]">
              {caseData ? caseData.token : `#${token}`}
            </span>

            {caseData && (
              <>
                <span className="text-[#e2e8f0] text-lg hidden sm:block">/</span>

                <h2 className="text-[#0f172a] text-base font-semibold tracking-tight">
                  {caseData.student.name}
                </h2>

                <div className="flex items-center gap-2 ml-auto sm:ml-0 flex-wrap">
                  {/* Severity */}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${caseData.severityClass}`}>
                    {caseData.severity}
                  </span>

                  {/* Status — always Resolved */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Resolved
                  </span>

                  {/* Resolution date */}
                  <span className="text-[#64748b] text-xs hidden md:inline">
                    Resolved on {caseData.resolvedOn}
                  </span>
                </div>
              </>
            )}
          </div>
        </header>

        {/* ── Body ── */}
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full">
          {!caseData ? (
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
                {/* ── Left column ── */}
                <div className="flex-1 min-w-0 flex flex-col gap-6">
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
                    <CaseResolutionCard resolution={caseData.resolution} />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <PreviousOffencesTable offences={caseData.previousOffences} />
                  </motion.div>
                </div>

                {/* ── Right column ── */}
                <div className="w-full xl:w-[340px] xl:shrink-0 flex flex-col gap-6">
                  <motion.div variants={itemVariants}>
                    <TimelineCard events={caseData.timeline} />
                  </motion.div>

                  {/* Penalty summary */}
                  <motion.div variants={itemVariants}>
                    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#1f3a89] text-[18px]">payments</span>
                        <h3 className="font-semibold text-[#0f172a] text-sm">Penalty Summary</h3>
                      </div>
                      <div className="p-5 flex flex-col gap-3">
                        {[
                          { label: 'Fine',           value: caseData.resolution.fine          },
                          { label: 'Penalty Points', value: caseData.resolution.penaltyPoints  },
                          { label: 'Action Taken',   value: caseData.resolution.actionTaken    },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center justify-between">
                            <span className="text-[#64748b] text-xs font-medium">{label}</span>
                            <span className="text-[#0f172a] text-sm font-semibold">{value}</span>
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
