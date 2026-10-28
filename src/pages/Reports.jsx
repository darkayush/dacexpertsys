import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DACLayout from '../components/layout/DACLayout';
import { pageVariants, listVariants, itemVariants } from '../lib/motion';
import { getCases, getUsers } from '../services/api';

// ── Icons ───────────────────────────────────────────────────────────────────
const ScalesIcon = () => (
  <svg width="27" height="28.5" viewBox="0 0 27 28.5" fill="none">
    <line x1="13.5" y1="2" x2="13.5" y2="26.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <line x1="2" y1="8" x2="25" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M2 8 L6 18 Q2 18 6 18" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <path d="M2 18 Q4 13 6 18" stroke="white" strokeWidth="1.6" fill="rgba(255,255,255,0.2)" strokeLinecap="round" />
    <path d="M21 8 L25 18" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M21 18 Q23 13 25 18" stroke="white" strokeWidth="1.6" fill="rgba(255,255,255,0.2)" strokeLinecap="round" />
    <line x1="9" y1="26.5" x2="18" y2="26.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="6.5" stroke="white" strokeWidth="1.3" />
    <path d="M4.5 7.5l2 2 4-4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EditIcon = () => (
  <svg width="13.5" height="13.5" viewBox="0 0 14 14" fill="none">
    <path d="M1 13h12" stroke="#64748b" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M10.5 1.5l2 2-8 8H2.5v-2l8-8z" stroke="#64748b" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 1v7M3 5.5l3 3 3-3" stroke="#64748b" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1 10.5h10" stroke="#64748b" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const BackIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M7.5 1.5l-5 4.5 5 4.5" stroke="#64748b" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2.5 6h9" stroke="#64748b" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const GridIcon = () => (
  <svg width="20" height="18" viewBox="0 0 20 18" fill="none">
    <rect x="1" y="1" width="7" height="7" rx="1" stroke="#4f46e5" strokeWidth="1.4" />
    <rect x="12" y="1" width="7" height="7" rx="1" stroke="#4f46e5" strokeWidth="1.4" />
    <rect x="1" y="10" width="7" height="7" rx="1" stroke="#4f46e5" strokeWidth="1.4" />
    <rect x="12" y="10" width="7" height="7" rx="1" stroke="#4f46e5" strokeWidth="1.4" />
  </svg>
);

const WarningIcon = () => (
  <svg width="22" height="19" viewBox="0 0 22 19" fill="none">
    <path d="M11 1L1 17h20L11 1z" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M11 8v4" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="11" cy="14.5" r="0.75" fill="#f97316" />
  </svg>
);

const ExclamationIcon = () => (
  <svg width="4" height="18" viewBox="0 0 4 18" fill="none">
    <path d="M2 1v11" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="2" cy="16" r="1.5" fill="#ef4444" />
  </svg>
);

const InfoCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="8.5" stroke="#3b82f6" strokeWidth="1.4" />
    <path d="M10 9v5" stroke="#3b82f6" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="10" cy="6.5" r="0.8" fill="#3b82f6" />
  </svg>
);

const UpTrendIcon = () => (
  <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
    <path d="M1 11L7 5L11 9L19 1" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="5" height="8" viewBox="0 0 5 8" fill="none">
    <path d="M1 1l3 3-3 3" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Severity Gauge ─────────────────────────────────────────────────────────
function SeverityGauge({ score = 85 }) {
  const r = 44;
  const circumference = Math.PI * r;
  const progress = (score / 100) * circumference;
  const color = score >= 71 ? '#ef4444' : score >= 41 ? '#f97316' : '#22c55e';

  return (
    <div className="flex flex-col items-center py-2">
      <svg width="100" height="60" viewBox="0 0 100 60">
        <path d={`M 6 52 A ${r} ${r} 0 0 1 94 52`} fill="none" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round" />
        <path d={`M 6 52 A ${r} ${r} 0 0 1 94 52`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${progress} ${circumference}`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x="50" y="46" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a" fontFamily="Inter, sans-serif">{score}</text>
      </svg>
      <p className="text-[#94a3b8] text-xs mt-1">out of 100</p>
    </div>
  );
}

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
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function toRisk(score) {
  if (score >= 85) return 'Critical';
  if (score >= 65) return 'High Risk';
  if (score >= 40) return 'Moderate';
  return 'Low';
}

function toPunishment(points, severity) {
  if (points >= 40 || severity === 'Critical') return '2-Week Academic Suspension';
  if (points >= 25 || severity === 'High') return 'Fine + 1-Month Campus Work';
  if (points >= 10 || severity === 'Medium') return 'Formal Apology & 1-Week Probation';
  return 'Official Warning';
}

const FACTORS = [
  {
    Icon: WarningIcon,
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    title: 'Repeat Offense',
    detail: 'Student has one prior warning for academic misconduct in the previous semester (Case #3012).',
  },
  {
    Icon: ExclamationIcon,
    bg: 'bg-red-50',
    border: 'border-red-100',
    title: 'Evidence Weight',
    detail: 'Turnitin report indicates 45% similarity match, exceeding the threshold for Level 1 offenses.',
  },
  {
    Icon: InfoCircleIcon,
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    title: 'Mitigating Circumstances',
    detail: 'Student self-reported the issue prior to final grading, which reduced the recommended penalty from Expulsion to Suspension.',
  },
];

// ── Main Component ─────────────────────────────────────────────────────────
export default function Reports() {
  const hasLoggedResponseRef = useRef(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [search, setSearch] = useState('');
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
          console.log('Reports API response:', { cases: casesResponse, users: usersResponse });
          hasLoggedResponseRef.current = true;
        }

        const usersById = Object.fromEntries(usersResponse.map((user) => [String(user.id), user]));

        const mappedCases = casesResponse.map((entry) => {
          const student = usersById[String(entry.student_id)] ?? {};
          const score = Number(entry.severity_score ?? entry.penalty_points ?? 0);
          const severity = toTitleCase(entry.severity);
          return {
            id: `#${entry.id}`,
            studentName: student.name || 'Unknown Student',
            studentId: student.enrollment_no || `ID-${entry.student_id}`,
            offense: toTitleCase(entry.offense_type) || 'N/A',
            date: formatDate(entry.incident_date ?? entry.created_at),
            status: 'Pending Recommendation',
            punishment: toPunishment(Number(entry.penalty_points ?? 0), severity),
            score,
            risk: toRisk(score),
          };
        });

        if (mounted) setCases(mappedCases);
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.message || 'Failed to fetch recommendation data.');
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

  const filteredCases = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter((c) =>
      [c.id, c.studentName, c.studentId, c.offense].some((v) => String(v).toLowerCase().includes(q))
    );
  }, [cases, search]);

  const renderDetailView = () => (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="max-w-[1152px] mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-[#94a3b8] mb-3">
            <button onClick={() => setSelectedCase(null)} className="hover:text-[#4f46e5] transition-colors">Cases</button>
            <ChevronRightIcon />
            <span className="text-[#4f46e5] font-medium">Case {selectedCase.id}</span>
            <ChevronRightIcon />
            <span className="text-[#4f46e5] font-medium">Recommendation</span>
          </div>
          <h1 className="text-[#0f172a] text-[32px] font-bold leading-9 mb-2">
            Recommendation Result
          </h1>
          <p className="text-[#64748b] text-lg leading-7">
            Case {selectedCase.id} - {selectedCase.studentName} (Student ID: {selectedCase.studentId})
          </p>
        </div>

        <div className="flex gap-3 mt-2 shrink-0">
          <button onClick={() => setSelectedCase(null)} className="flex items-center gap-2 border border-[#e2e8f0] bg-white text-[#64748b] text-sm font-medium px-4 py-2.5 rounded-lg hover:border-[#4f46e5] hover:text-[#4f46e5] transition-colors shadow-sm">
            <BackIcon /> Back to Cases
          </button>
          <button className="flex items-center gap-2 border border-[#e2e8f0] bg-white text-[#64748b] text-sm font-medium px-4 py-2.5 rounded-lg hover:border-[#4f46e5] hover:text-[#4f46e5] transition-colors shadow-sm">
            <DownloadIcon /> Download Report
          </button>
        </div>
      </div>

      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col lg:flex-row gap-8 items-start"
      >
        <motion.div variants={itemVariants} className="flex-1 min-w-0 flex flex-col gap-6">

          <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden">
            <div className="h-2 bg-[#4f46e5] w-full" />
            <div className="p-8 flex gap-6">
              <div className="w-[59px] h-[60px] rounded-xl bg-[#4f46e5] flex items-center justify-center shrink-0">
                <ScalesIcon />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[#0f172a] text-2xl font-bold leading-8 mb-4">
                  {selectedCase.punishment}
                </h2>
                <p className="text-[#64748b] text-sm leading-6 mb-6 max-w-[611px]">
                  Based on the analysis of the incident report, severity of the offense ({selectedCase.offense}),
                  and the student's prior disciplinary history, the system recommends this punishment.
                </p>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 bg-[#4f46e5] text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-[#162d6b] transition-colors shadow-sm">
                    <CheckCircleIcon /> Confirm & Apply
                  </button>
                  <button className="flex items-center gap-2 border border-[#e2e8f0] text-[#64748b] text-sm font-medium px-5 py-2.5 rounded-lg hover:border-[#4f46e5] hover:text-[#4f46e5] transition-colors">
                    <EditIcon /> Modify Action
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm p-8">
            <h3 className="text-[#0f172a] text-lg font-bold flex items-center gap-3 mb-6">
              <GridIcon />
              Contributing Factors
            </h3>
            <div className="flex flex-col gap-4">
              {FACTORS.map(({ Icon, bg, border, title, detail }) => (
                <div
                  key={title}
                  className={`flex gap-4 p-4 rounded-xl border ${bg} ${border}`}
                >
                  <div className="w-[22px] shrink-0 flex items-start justify-center pt-0.5">
                    <Icon />
                  </div>
                  <div>
                    <p className="text-[#0f172a] text-sm font-semibold mb-1">{title}</p>
                    <p className="text-[#64748b] text-sm leading-5">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="w-full lg:w-[368px] lg:shrink-0 flex flex-col gap-4">

          <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm px-6 py-5">
            <p className="text-[#64748b] text-xs font-semibold uppercase tracking-widest text-center mb-1">
              Severity Score
            </p>
            <SeverityGauge score={selectedCase.score} />
          </div>

          {/* Risk Level */}
          <div className={`bg-white border-y border-r border-l-4 ${selectedCase.score >= 75 ? 'border-l-[#ef4444]' : selectedCase.score >= 45 ? 'border-l-[#f97316]' : 'border-l-[#22c55e]'} rounded-xl shadow-sm px-6 py-5 border-y-[#e2e8f0] border-r-[#e2e8f0]`}>
            <p className="text-[#94a3b8] text-xs font-semibold uppercase tracking-widest mb-2">
              Risk Level
            </p>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-2xl font-bold leading-none ${selectedCase.score >= 75 ? 'text-[#ef4444]' : selectedCase.score >= 45 ? 'text-[#f97316]' : 'text-[#22c55e]'}`}>
                {selectedCase.risk}
              </span>
              {selectedCase.score >= 75 && <UpTrendIcon />}
            </div>
            <p className="text-[#94a3b8] text-xs">
              {selectedCase.score >= 75 ? "Requires immediate DAC attention." : "Standard review procedures apply."}
            </p>
          </div>

        </motion.div>
      </motion.div>
    </motion.div>
  );

  const renderListView = () => (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="max-w-[1152px] mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[#0f172a] text-[32px] font-bold leading-9 mb-2">AI Case Recommendations</h1>
          <p className="text-[#64748b] text-lg leading-7">Select a case to view its AI-generated penalty recommendations.</p>
        </div>
      </div>

      {loading && <p className="text-[#64748b] text-sm mb-4">Loading...</p>}
      {!!error && <p className="text-sm text-red-600 mb-4">Error: {error}</p>}

      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4"
      >
        {filteredCases.map((c) => (
          <motion.div
            key={c.id}
            variants={itemVariants}
            onClick={() => setSelectedCase(c)}
            className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer hover:border-[#4f46e5] hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-full bg-[#f1f5f9] flex items-center justify-center text-lg font-bold text-[#64748b]">
                {c.studentName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0f172a] group-hover:text-[#4f46e5] transition-colors">{c.id} - {c.studentName}</h3>
                <p className="text-[#64748b] text-sm">
                  <span className="font-medium text-[#475569]">{c.offense}</span> • ID: {c.studentId} • {c.date}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-[#94a3b8] text-xs font-semibold uppercase tracking-widest mb-1">Status</p>
                <p className="text-[#f97316] text-sm font-medium flex items-center gap-1.5 justify-end">
                  <span className="w-2 h-2 rounded-full bg-[#f97316]" />
                  {c.status}
                </p>
              </div>
              <button className="hidden sm:flex border border-[#e2e8f0] bg-white text-[#4f46e5] text-sm font-medium px-4 py-2 rounded-lg group-hover:bg-[#4f46e5] group-hover:text-white transition-colors">
                View Recommendation
              </button>
              <span className="text-[#94a3b8] group-hover:text-[#4f46e5] transition-colors">
                <ChevronRightIcon />
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );

  return (
    <DACLayout searchValue={search} onSearchChange={setSearch}>
      <div className="font-inter">
        <AnimatePresence mode="wait">
          {selectedCase ? (
            <motion.div key="detail" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              {renderDetailView()}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              {renderListView()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DACLayout>
  );
}