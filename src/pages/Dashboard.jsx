import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { scrollToElement } from '../hooks/useLenis';
import DACLayout from '../components/layout/DACLayout';
import GreetingCard from '../components/ui/GreetingCard';
import QuickActionCard from '../components/ui/QuickActionCard';
import NotificationCard from '../components/ui/NotificationCard';
import PriorityCaseCard from '../components/ui/PriorityCaseCard';
import CalendarActivityCard from '../components/ui/CalendarActivityCard';
import ActivityCard from '../components/ui/ActivityCard';
import PromoAssistantCard from '../components/ui/PromoAssistantCard';
import AnalyticsCard from '../components/ui/AnalyticsCard';
import WorkflowCard from '../components/ui/WorkflowCard';
import { useAuth } from '../context/AuthContext';
import { approveCase, getCaseHistory, getCases, getUsers } from '../services/api';

const AVATAR_STYLES = [
  { avatarBg: 'bg-sky-100', avatarText: 'text-sky-700' },
  { avatarBg: 'bg-indigo-100', avatarText: 'text-indigo-700' },
  { avatarBg: 'bg-purple-100', avatarText: 'text-purple-700' },
  { avatarBg: 'bg-emerald-100', avatarText: 'text-emerald-700' },
];

function toTitleCase(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { role, currentUser } = useAuth();
  const hasLoggedResponseRef = useRef(false);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(0);
  const pageSize = 5;
  const [cases, setCases] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, highSeverity: 0, resolved: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const targetRole = role === 'dsw' ? 'dsw' : 'admin';
        const targetStatus = role === 'dsw' ? 'pending_dsw' : 'pending_admin';
        const [casesResponse, allCasesResponse, usersResponse] = await Promise.all([
          getCases({ role: targetRole, status: targetStatus }),
          getCases({ role: targetRole }),
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
          console.log('Dashboard API response:', { cases: casesResponse, users: usersResponse });
          hasLoggedResponseRef.current = true;
        }

        const usersById = Object.fromEntries(usersResponse.map((user) => [String(user.id), user]));
        const mappedCases = allCasesResponse.map((entry, index) => {
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
            initials: name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD',
            avatarBg: style.avatarBg,
            avatarText: style.avatarText,
            offense: toTitleCase(entry.offense_type) || 'N/A',
            substance: entry.substance_type || '',
            severity,
            rawSeverity: String(entry.severity || '').toLowerCase(),
            status,
            rawStatus: String(entry.status || '').toLowerCase(),
            date: new Date(entry.incident_date ?? entry.created_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
            action: 'Review',
          };
        });

        const total = allCasesResponse.length;
        const pending = casesResponse.length;
        const highSeverity = allCasesResponse.filter(
          (entry) => String(entry.severity || '').toLowerCase() === 'high' || String(entry.severity || '').toLowerCase() === 'critical'
        ).length;
        const resolved = allCasesResponse.filter(
          (entry) => String(entry.status || '').toLowerCase() === 'resolved'
        ).length;
        const active = allCasesResponse.filter((entry) =>
          ['pending_chief', 'pending_dsw', 'pending_admin', 'investigation', 'pending'].includes(
            String(entry.status || '').toLowerCase()
          )
        ).length;

        if (mounted) {
          setAllCases(allCasesResponse);
          setCases(mappedCases);
          setStats({ total, pending, highSeverity, resolved, active });
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.message || 'Failed to fetch admin dashboard data.');
          setCases([]);
          setStats({ total: 0, pending: 0, highSeverity: 0, resolved: 0, active: 0 });
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
  }, [role]);

  useEffect(() => {
    setPage(0);
  }, [search, activeFilter]);

  // Arriving from the top-bar search on another page (?q=): show the results.
  useEffect(() => {
    if (!loading && searchParams.get('q')) scrollToElement(document.getElementById('search-results'));
  }, [loading, searchParams]);

  const filtered = useMemo(() => {
    let list = cases;
    if (activeFilter === 'active') {
      list = list.filter((c) =>
        ['pending_chief', 'pending_dsw', 'pending_admin', 'investigation', 'pending'].includes(c.rawStatus)
      );
    } else if (activeFilter === 'resolved') {
      list = list.filter((c) => c.rawStatus === 'resolved');
    } else if (activeFilter === 'severe') {
      list = list.filter((c) => c.rawSeverity === 'high' || c.rawSeverity === 'critical');
    }

    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.offense.toLowerCase().includes(s) ||
        c.id.toLowerCase().includes(s) ||
        (c.token && c.token.toLowerCase().includes(s)) ||
        (c.enrollment && c.enrollment.toLowerCase().includes(s))
    );
  }, [cases, activeFilter, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedCases = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const topPendingCase = cases[0] || null;

  return (
    <DACLayout
      searchValue={search}
      onSearchChange={setSearch}
    >
      <div className="space-y-6 sm:space-y-8">
        
        {/* ── ROW 1: Greeting & Quick Actions (Asymmetric) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-4 flex flex-col justify-center">
            <GreetingCard
              role="Admin"
              name={currentUser?.name}
              subtitle="Full institutional oversight of disciplinary workflows, committee sanctions, and university user rosters."
              activeCount={stats.active}
              totalCount={stats.total}
            />
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <QuickActionCard
                title="Total Cases"
                value={stats.total}
                badge="All Records"
                description="Total recorded campus disciplinary cases"
                illustrationType="document"
                active={activeFilter === 'all'}
                onClick={() => setActiveFilter('all')}
              />
            </div>

            <div>
              <QuickActionCard
                title="Active Cases"
                value={stats.active}
                badge="In Progress"
                description="Under active inquiry or DAC review"
                illustrationType="sync"
                active={activeFilter === 'active'}
                onClick={() => setActiveFilter((prev) => (prev === 'active' ? 'all' : 'active'))}
              />
            </div>

            <div>
              <QuickActionCard
                title="Resolved Cases"
                value={stats.resolved}
                badge="Concluded"
                description="Concluded with sanctions or acquittal"
                illustrationType="shield"
                active={activeFilter === 'resolved'}
                onClick={() => setActiveFilter((prev) => (prev === 'resolved' ? 'all' : 'resolved'))}
              />
            </div>

            <div>
              <QuickActionCard
                title="Severe Cases"
                value={stats.highSeverity}
                badge="High Priority"
                description="High & critical severity violations"
                illustrationType="alert"
                active={activeFilter === 'severe'}
                onClick={() => setActiveFilter((prev) => (prev === 'severe' ? 'all' : 'severe'))}
              />
            </div>
          </div>
        </div>

        {/* ── ROW 2: Notifications, Priority Case & Calendar ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <NotificationCard
              viewAllTo="/admin-settings/users"
              onClear={() => {}}
            />
          </div>

          <div>
            <PriorityCaseCard
              caseItem={topPendingCase}
              viewAllTo="/cases"
            />
          </div>

          <div>
            <CalendarActivityCard />
          </div>
        </div>

        {/* ── ROW 2.5: Full Institutional Workflow Card ── */}
        <div>
          <WorkflowCard />
        </div>

        {/* ── ROW 3: Recent Case Activity, AI Assistant & Analytics ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div id="search-results" className="lg:col-span-6">
            <ActivityCard
              title={
                activeFilter === 'active'
                  ? 'Active Inquiries Log'
                  : activeFilter === 'resolved'
                  ? 'Resolved Incidents Log'
                  : activeFilter === 'severe'
                  ? 'Severe Incidents Log'
                  : 'Campus Incident Log'
              }
              cases={paginatedCases}
              totalCount={filtered.length}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              onPrevPage={() => setPage((p) => Math.max(0, p - 1))}
              onNextPage={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              viewAllTo="/reports"
            />
          </div>

          <div className="lg:col-span-3">
            <PromoAssistantCard />
          </div>

          <div className="lg:col-span-3">
            <AnalyticsCard stats={stats} />
          </div>
        </div>

      </div>
    </DACLayout>
  );
}