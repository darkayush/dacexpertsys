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
import { approveCase, getCaseHistory, getCases, getUsers } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const AVATAR_STYLES = [
  { avatarBg: 'bg-indigo-100', avatarText: 'text-indigo-700' },
  { avatarBg: 'bg-purple-100', avatarText: 'text-purple-700' },
  { avatarBg: 'bg-sky-100', avatarText: 'text-sky-700' },
  { avatarBg: 'bg-emerald-100', avatarText: 'text-emerald-700' },
];

function toTitleCase(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ChiefWardenDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const hasLoggedResponseRef = useRef(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 5;
  const [cases, setCases] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, escalated: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const loadData = async (mounted = true) => {
    try {
      setLoading(true);
      setError('');

      const [casesResponse, allCasesResponse, usersResponse] = await Promise.all([
        getCases({ role: 'chief_warden', status: 'pending_chief' }),
        getCases({ role: 'chief_warden' }),
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
        console.log('ChiefWardenDashboard API response:', { cases: casesResponse, users: usersResponse });
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
          initials: name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'CW',
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
          action: 'Review',
        };
      });

      const total = allCasesResponse.length;
      const pending = casesResponse.length;
      const escalated = allCasesResponse.filter((entry) =>
        ['pending_dsw', 'pending_admin'].includes(String(entry.status || '').toLowerCase())
      ).length;
      const resolved = allCasesResponse.filter(
        (entry) => String(entry.status || '').toLowerCase() === 'resolved'
      ).length;

      if (mounted) {
        setAllCases(allCasesResponse);
        setCases(mappedCases);
        setStats({ total, pending, escalated, resolved, active: pending + escalated });
      }
    } catch (loadError) {
      if (mounted) {
        setError(loadError?.message || 'Failed to fetch dashboard data.');
        setCases([]);
        setStats({ total: 0, pending: 0, escalated: 0, resolved: 0, active: 0 });
        setHistoryRecords([]);
        setHistoryLoading(false);
      }
    } finally {
      if (mounted) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    loadData(mounted);
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

  const topPendingCase = cases[0] || null;

  return (
    <DACLayout
      searchValue={search}
      onSearchChange={setSearch}
      primaryAction={
        <Link
          to="/chief-warden/register"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1e1b4b] hover:bg-black text-white text-xs font-bold transition-all shadow-sm active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Register Case</span>
        </Link>
      }
    >
      <div className="space-y-6 sm:space-y-8">
        
        {/* ── ROW 1: Greeting & Quick Actions (Asymmetric) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-4 flex flex-col justify-center">
            <GreetingCard
              role="Chief Warden"
              name={currentUser?.name}
              subtitle="Supervise campus hostel discipline, conduct hearings, and expedite committee reviews."
              activeCount={stats.pending}
              totalCount={stats.total}
            />
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <AddActionPlaceholderCard
                to="/chief-warden/register"
                label="New Referral"
              />
            </div>

            <div>
              <QuickActionCard
                title="Review Escalations"
                description="Evaluate hostel cases forwarded for committee review"
                to="/chief-warden/cases"
                illustrationType="sync"
              />
            </div>

            <div>
              <QuickActionCard
                title="Hostel Roster"
                description="Comprehensive campus discipline register & records"
                to="/chief-warden/cases"
                illustrationType="document"
              />
            </div>

            <div>
              <QuickActionCard
                title="Disciplinary Policy"
                description="Inspect university offense matrix & fine schedules"
                to="/chief-warden/cases"
                illustrationType="shield"
              />
            </div>
          </div>
        </div>

        {/* ── ROW 2: Notifications, Priority Case & Calendar ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <NotificationCard
              viewAllTo="/chief-warden/notifications"
              onClear={() => {}}
            />
          </div>

          <div>
            <PriorityCaseCard
              caseItem={topPendingCase}
              viewAllTo="/chief-warden/cases"
            />
          </div>

          <div>
            <CalendarActivityCard />
          </div>
        </div>

        {/* ── ROW 3: Priority Review Queue, AI Assistant & Analytics ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-6">
            <ActivityCard
              title="Cases Awaiting Approval"
              cases={paginatedCases}
              totalCount={filtered.length}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              onPrevPage={() => setPage((p) => Math.max(0, p - 1))}
              onNextPage={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              viewAllTo="/chief-warden/cases"
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
