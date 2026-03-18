import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import StudentDetailsCard from '../components/StudentDetailsCard';
import PreviousOffencesTable from '../components/PreviousOffencesTable';
import IncidentDetailsCard from '../components/IncidentDetailsCard';
import EvidenceCard from '../components/EvidenceCard';
import TimelineCard from '../components/TimelineCard';
import { pageVariants, listVariants, itemVariants } from '../lib/motion';

// ─── Dummy data keyed by token ─────────────────────────────────────────────────
const DUMMY_CASES = {
  '2024-001': {
    token: '#2024-001',
    status: 'Pending Review',
    statusDot: 'bg-yellow-500',
    severity: 'Critical',
    severityClass: 'bg-red-100 text-red-800',

    student: {
      name: 'John Doe',
      enrollment: '22CS034',
      year: '2nd Year',
      department: 'Computer Science',
      email: 'john.doe@university.edu',
      contact: '+91 98765 43210',
      hostel: 'BSH',
      room: 'B-214',
      penaltyPoints: 25,
    },

    previousOffences: [
      { date: '12 Feb 2024', offenseType: 'Smoking',    severity: 'Medium', penaltyPoints: 25, status: 'Resolved' },
      { date: '08 Sep 2023', offenseType: 'Attendance', severity: 'Low',    penaltyPoints: 10, status: 'Resolved' },
    ],

    incident: {
      token: '#2024-001',
      date: '10 Mar 2024',
      time: '11:45 PM',
      location: 'Block B — Common Area',
      offenseType: 'Plagiarism',
      reportedBy: 'Warden, Block B',
      description:
        'Student was found to have submitted an assignment with significant portions copied from online sources without citation. Turnitin report shows 45% similarity, well above the permitted 15% threshold. Incident was first flagged by Dr. Patel (CS Dept.) during grading and subsequently referred to the Warden for formal reporting.',
    },

    evidence: [
      { name: 'Turnitin_Report.pdf',   size: '1.2 MB', uploadedAt: '10 Mar 2024' },
      { name: 'Assignment_Scan.pdf',   size: '3.8 MB', uploadedAt: '10 Mar 2024' },
      { name: 'Photo_1.jpg',           size: '540 KB', uploadedAt: '11 Mar 2024' },
    ],

    timeline: [
      { title: 'Case Reported',       date: '10 Mar 2024, 11:50 PM', badge: 'Reported',     state: 'completed', note: 'Reported by Warden, Block B.' },
      { title: 'Investigation Started', date: '11 Mar 2024, 09:00 AM', badge: 'In Progress', state: 'completed', note: 'Assigned to DSW for primary investigation.' },
      { title: 'DAC Review',          date: 'Scheduled: 18 Mar 2024', badge: 'Active',       state: 'active',    note: 'Awaiting committee hearing.' },
      { title: 'Decision Issued',     date: null,                     badge: 'Pending',      state: 'upcoming',  note: null },
      { title: 'Resolved',            date: null,                     badge: null,           state: 'upcoming',  note: null },
    ],
  },

  '2024-002': {
    token: '#2024-002',
    status: 'Investigation',
    statusDot: 'bg-blue-500',
    severity: 'High',
    severityClass: 'bg-orange-100 text-orange-800',

    student: {
      name: 'Jane Smith',
      enrollment: '21AH019',
      year: '3rd Year',
      department: 'Arts & Humanities',
      email: 'jane.smith@university.edu',
      contact: '+91 91234 56789',
      hostel: 'GH-1',
      room: 'G-108',
      penaltyPoints: 15,
    },

    previousOffences: [],

    incident: {
      token: '#2024-002',
      date: '05 Mar 2024',
      time: '03:20 PM',
      location: 'Arts Block — Corridor',
      offenseType: 'Vandalism',
      reportedBy: 'Security Officer',
      description:
        'Student allegedly damaged a notice board and spray-painted graffiti on the wall of the Arts Block corridor. CCTV footage and witness accounts have been collected. Estimated property damage: ₹12,000.',
    },

    evidence: [
      { name: 'CCTV_Footage_Clip.mp4', size: '22.4 MB', uploadedAt: '05 Mar 2024' },
      { name: 'Damage_Photos.jpg',     size: '2.1 MB',  uploadedAt: '06 Mar 2024' },
    ],

    timeline: [
      { title: 'Case Reported',      date: '05 Mar 2024, 04:00 PM', badge: 'Reported',     state: 'completed', note: 'Reported by campus security.' },
      { title: 'Investigation Started', date: '06 Mar 2024, 10:00 AM', badge: 'In Progress', state: 'active',    note: 'Evidence being collected by DSW office.' },
      { title: 'DAC Review',         date: null,                    badge: 'Pending',      state: 'upcoming',  note: null },
      { title: 'Decision Issued',    date: null,                    badge: null,           state: 'upcoming',  note: null },
      { title: 'Resolved',           date: null,                    badge: null,           state: 'upcoming',  note: null },
    ],
  },
};

// ─── Fallback for unknown tokens ───────────────────────────────────────────────
function NotFound({ token, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <span className="material-symbols-outlined text-[60px] text-[#cbd5e1]">search_off</span>
      <p className="text-[#0f172a] text-lg font-semibold">Case not found</p>
      <p className="text-[#64748b] text-sm">No case with token <span className="font-mono font-semibold">#{token}</span> exists.</p>
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

// ─── Status & severity badge helpers ─────────────────────────────────────────
const statusDotMap = {
  'Pending Review': 'bg-yellow-500',
  'Investigation':  'bg-blue-500',
  'DAC Review':     'bg-purple-500',
  'Resolved':       'bg-green-500',
  'Dismissed':      'bg-slate-400',
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ManageCase() {
  const { token } = useParams();
  const navigate = useNavigate();

  const caseData = DUMMY_CASES[token];

  return (
    <div className="min-h-screen bg-[#f9f9fb] font-sans antialiased">
      <Sidebar />

      <main className="pt-14 md:pt-0 md:pl-64 flex flex-col min-h-screen bg-[#f9f9fb]">

        {/* ── Header ── */}
        <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-20 px-4 md:px-6 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Back button */}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-[#64748b] hover:text-[#1f3a89] transition-colors text-sm font-medium"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span className="hidden sm:inline">Dashboard</span>
            </button>

            <span className="text-[#e2e8f0] text-lg hidden sm:block">/</span>

            {/* Token */}
            <span className="font-mono text-sm font-semibold text-[#64748b]">
              {caseData ? caseData.token : `#${token}`}
            </span>

            {caseData && (
              <>
                <span className="text-[#e2e8f0] text-lg hidden sm:block">/</span>

                {/* Student name */}
                <h2 className="text-[#0f172a] text-base font-semibold tracking-tight">
                  {caseData.student.name}
                </h2>

                {/* Status badge */}
                <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                  <span className={`h-2 w-2 rounded-full ${statusDotMap[caseData.status] ?? 'bg-slate-400'}`} />
                  <span className="text-sm text-[#0f172a]">{caseData.status}</span>
                </div>

                {/* Severity badge */}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${caseData.severityClass}`}>
                  {caseData.severity}
                </span>
              </>
            )}
          </div>
        </header>

        {/* ── Page body ── */}
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
              {/* ── Two-column layout ── */}
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
                    <PreviousOffencesTable offences={caseData.previousOffences} />
                  </motion.div>
                </div>

                {/* ── Right column ── */}
                <div className="w-full xl:w-[340px] xl:shrink-0 flex flex-col gap-6">
                  <motion.div variants={itemVariants}>
                    <TimelineCard events={caseData.timeline} />
                  </motion.div>

                  {/* Quick actions card */}
                  <motion.div variants={itemVariants}>
                    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#1f3a89] text-[18px]">bolt</span>
                        <h3 className="font-semibold text-[#0f172a] text-sm">Quick Actions</h3>
                      </div>
                      <div className="p-4 flex flex-col gap-2">
                        {[
                          { label: 'Mark as Resolved',      icon: 'check_circle',     cls: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'          },
                          { label: 'Escalate to DAC',       icon: 'gavel',            cls: 'bg-[#1f3a89] hover:bg-[#162d6b] text-white shadow-sm'              },
                          { label: 'Dismiss Case',          icon: 'cancel',           cls: 'border border-[#e2e8f0] text-red-500 hover:border-red-300 hover:bg-red-50 bg-white' },
                        ].map(({ label, icon, cls }) => (
                          <button
                            key={label}
                            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${cls}`}
                          >
                            <span className="material-symbols-outlined text-[18px]">{icon}</span>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  {/* Penalty summary card */}
                  <motion.div variants={itemVariants}>
                    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#1f3a89] text-[18px]">payments</span>
                        <h3 className="font-semibold text-[#0f172a] text-sm">Penalty Summary</h3>
                      </div>
                      <div className="p-5 flex flex-col gap-3">
                        {[
                          { label: 'Offense Level',   value: 'Level 2 — Moderate' },
                          { label: 'Severity Score',  value: '55 / 100' },
                          { label: 'Fine',            value: '₹ 2,500' },
                          { label: 'Penalty Points',  value: '25 pts' },
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
