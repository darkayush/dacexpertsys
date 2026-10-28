import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DACLayout from '../../components/layout/DACLayout';
import GreetingCard from '../../components/ui/GreetingCard';
import QuickActionCard, { AddActionPlaceholderCard } from '../../components/ui/QuickActionCard';
import NotificationCard from '../../components/ui/NotificationCard';
import PriorityCaseCard from '../../components/ui/PriorityCaseCard';
import CalendarActivityCard from '../../components/ui/CalendarActivityCard';
import ActivityCard from '../../components/ui/ActivityCard';
import PromoAssistantCard from '../../components/ui/PromoAssistantCard';
import AnalyticsCard from '../../components/ui/AnalyticsCard';
import { getCaseHistory, getCases, getUsers } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const AVATAR_STYLES = [
  { avatarBg: 'bg-sky-100', avatarText: 'text-sky-700' },
  { avatarBg: 'bg-emerald-100', avatarText: 'text-emerald-700' },
  { avatarBg: 'bg-indigo-100', avatarText: 'text-indigo-700' },
  { avatarBg: 'bg-purple-100', avatarText: 'text-purple-700' },
  { avatarBg: 'bg-amber-100', avatarText: 'text-amber-700' },
];

function toTitleCase(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function WardenDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const hasLoggedResponseRef = useRef(false);
  const [search, setSearch] = useState('');
  const [cases, setCases] = useState([]);
  const [rawCases, setRawCases] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, escalated: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 5;

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const [casesResponse, usersResponse] = await Promise.all([
          getCases({ role: 'warden' }),
          getUsers(),
        ]);

        setHistoryLoading(true);
        setHistoryError('');
        try {
          const historyResponse = await getCaseHistory(6);
          const mappedHistory = historyResponse.map((entry) => ({
            id: entry.id,
            token: entry.external_case_id || `#${entry.id}`,
            studentName: entry.student_name || 'Unknown Student',
            offense: toTitleCase(entry.offense_type) || 'N/A',
            status: toTitleCase(entry.status) || 'N/A',
            date: new Date(entry.incident_date ?? entry.created_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
          }));
          if (mounted) setHistoryRecords(mappedHistory);
        } catch (historyLoadError) {
          if (mounted) setHistoryError(historyLoadError?.message || 'Failed to fetch history.');
        } finally {
          if (mounted) setHistoryLoading(false);
        }

        if (!hasLoggedResponseRef.current) {
          console.log('WardenDashboard API response:', { cases: casesResponse, users: usersResponse });
          hasLoggedResponseRef.current = true;
        }

        const usersById = Object.fromEntries(usersResponse.map((user) => [String(user.id), user]));
        const mappedCases = casesResponse.map((entry, index) => {
          const student = usersById[String(entry.student_id)] ?? {};
          const status = toTitleCase(entry.status);
          const severity = toTitleCase(entry.severity) || 'Low';
          const name = student.name || entry.student_name || 'Unknown Student';
          const dept = student.program || entry.program ? toTitleCase(student.program || entry.program) : 'N/A';
          const style = AVATAR_STYLES[index % AVATAR_STYLES.length];
          return {
            id: String(entry.id),
            token: entry.external_case_id || `#${entry.id}`,
            name,
            dept,
            enrollment: student.enrollment_no || entry.enrollment_no || '',
            initials: name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'ST',
            avatarBg: style.avatarBg,
            avatarText: style.avatarText,
            offense: toTitleCase(entry.offense_type) || 'N/A',
            substance: entry.substance_type || '',
            severity,
            status,
            rawStatus: String(entry.status || '').toLowerCase(),
            date: new Date(entry.incident_date ?? entry.created_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
            action: ['pending_chief', 'investigation', 'pending'].includes(String(entry.status || '').toLowerCase()) ? 'Manage' : 'View',
          };
        });

        const total = mappedCases.length;
        const active = casesResponse.filter((entry) =>
          ['pending_chief', 'pending_dsw', 'pending_admin', 'investigation', 'pending'].includes(
            String(entry.status || '').toLowerCase()
          )
        ).length;
        const escalated = casesResponse.filter((entry) =>
          ['pending_dsw', 'pending_admin'].includes(String(entry.status || '').toLowerCase())
        ).length;
        const resolved = casesResponse.filter(
          (entry) => String(entry.status || '').toLowerCase() === 'resolved'
        ).length;

        if (mounted) {
          setRawCases(casesResponse);
          setCases(mappedCases);
          setStats({ total, active, escalated, resolved });
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.message || 'Failed to fetch dashboard data.');
          setCases([]);
          setStats({ total: 0, active: 0, escalated: 0, resolved: 0 });
          setHistoryRecords([]);
          setHistoryLoading(false);
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

  useEffect(() => {
    setPage(0);
  }, [search]);

  const filtered = cases.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.offense.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      (c.token && c.token.toLowerCase().includes(search.toLowerCase())) ||
      (c.enrollment && c.enrollment.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedCases = filtered.slice(page * pageSize, (page + 1) * pageSize);

  // Highest priority pending case
  const topPendingCase = cases.find((c) =>
    ['pending_chief', 'pending_dsw', 'investigation'].includes(c.rawStatus)
  ) || cases[0];

  return (
    <DACLayout
      searchValue={search}
      onSearchChange={setSearch}
      primaryAction={
        <Link
          to="/warden/register"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1e1b4b] hover:bg-black text-white text-xs font-bold transition-all shadow-sm active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Register Case</span>
        </Link>
      }
    >
      <div className="space-y-6 sm:space-y-8">
        
        {/* ── ROW 1: Greeting & Quick Action Cards (Asymmetric) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Large Greeting Card */}
          <div className="lg:col-span-4 flex flex-col justify-center">
            <GreetingCard
              role="Warden"
              name={currentUser?.name}
              subtitle="Review campus disciplinary incidents, manage hostel compliance, and track student hearings."
              activeCount={stats.active}
              totalCount={stats.total}
            />
          </div>

          {/* Quick Action Cards Row inspired by the reference */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Dashed Add Action Card */}
            <div>
              <AddActionPlaceholderCard
                to="/warden/register"
                label="New Case"
              />
            </div>

            {/* Quick Action 1 */}
            <div>
              <QuickActionCard
                title="Register Incident"
                description="Structured intake for hostel disciplinary cases"
                to="/warden/register"
                illustrationType="document"
              />
            </div>

            {/* Quick Action 2 */}
            <div>
              <QuickActionCard
                title="Review Cases"
                description="Inspect pending hostel cases awaiting review"
                to="/warden/cases"
                illustrationType="sync"
              />
            </div>

            {/* Quick Action 3 */}
            <div>
              <QuickActionCard
                title="Search Student"
                description="Instant lookup of disciplinary history & penalty points"
                to="/warden/cases"
                illustrationType="shield"
              />
            </div>
          </div>
        </div>

        {/* ── ROW 2: Notifications, Priority Assignments & Calendar Strip ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Notifications Card */}
          <div>
            <NotificationCard
              viewAllTo="/warden/notifications"
              onClear={() => {}}
            />
          </div>

          {/* Priority Case / Assignments Card */}
          <div>
            <PriorityCaseCard
              caseItem={topPendingCase}
              viewAllTo="/warden/cases"
            />
          </div>

          {/* Calendar Activity Card */}
          <div>
            <CalendarActivityCard />
          </div>
        </div>

        {/* ── ROW 3: Recent Case Activity, AI Copilot & Analytics ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Wide: Case Activity Card */}
          <div id="search-results" className="lg:col-span-6">
            <ActivityCard
              title="Recent Case Activity"
              cases={paginatedCases}
              totalCount={filtered.length}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              onPrevPage={() => setPage((p) => Math.max(0, p - 1))}
              onNextPage={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              viewAllTo="/warden/cases"
            />
          </div>

          {/* Center: Vibrant Purple AI Assistant Card */}
          <div className="lg:col-span-3">
            <PromoAssistantCard />
          </div>

          {/* Right: Circular Analytics & Committee Session */}
          <div className="lg:col-span-3">
            <AnalyticsCard stats={stats} />
          </div>
        </div>

      </div>
    </DACLayout>
  );
}
