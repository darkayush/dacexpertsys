import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  { avatarBg: 'bg-sky-100', avatarText: 'text-sky-700' },
  { avatarBg: 'bg-emerald-100', avatarText: 'text-emerald-700' },
  { avatarBg: 'bg-indigo-100', avatarText: 'text-indigo-700' },
  { avatarBg: 'bg-purple-100', avatarText: 'text-purple-700' },
];

function toTitleCase(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function DswDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const hasLoggedResponseRef = useRef(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 5;
  const [statusFilter, setStatusFilter] = useState('pending_dsw');
  const [severityFilter, setSeverityFilter] = useState('all');

  const [tableCases, setTableCases] = useState([]);
  const [rawCases, setRawCases] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    forwarded: 0,
    resolved: 0,
    active: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingCaseId, setProcessingCaseId] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const loadDashboard = async ({ tableStatus = statusFilter, skipLoading = false } = {}) => {
    try {
      if (!skipLoading) setLoading(true);
      setError('');

      const statusParam = tableStatus === 'all' ? undefined : tableStatus;
      const [overviewCases, queueCases, usersResponse] = await Promise.all([
        getCases({ role: 'dsw' }),
        getCases({ role: 'dsw', status: statusParam }),
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
        setHistoryRecords(mappedHistory);
      } catch (historyLoadError) {
        setHistoryError(historyLoadError?.message || 'Failed to fetch history.');
      } finally {
        setHistoryLoading(false);
      }

      if (!hasLoggedResponseRef.current) {
        console.log('DswDashboard API response:', { overviewCases, queueCases, usersResponse });
        hasLoggedResponseRef.current = true;
      }

      const usersById = Object.fromEntries(usersResponse.map((user) => [String(user.id), user]));
      const mappedQueue = queueCases.map((entry, index) => {
        const student = usersById[String(entry.student_id)] ?? {};
        const statusKey = String(entry.status || '').toLowerCase();
        const status = toTitleCase(statusKey) || 'Pending Dsw';
        const severity = toTitleCase(entry.severity) || 'Low';
        const style = AVATAR_STYLES[index % AVATAR_STYLES.length];
        const name = student.name || entry.student_name || 'Unknown Student';

        return {
          id: String(entry.id),
          token: entry.external_case_id || `#${entry.id}`,
          name,
          dept: student.program || entry.program ? toTitleCase(student.program || entry.program) : 'N/A',
          initials: name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'ST',
          avatarBg: style.avatarBg,
          avatarText: style.avatarText,
          offense: toTitleCase(entry.offense_type) || 'N/A',
          severity,
          status,
          rawStatus: statusKey,
          date: new Date(entry.incident_date ?? entry.created_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          action: 'Review',
        };
      });

      const normalizedOverview = overviewCases.map((entry) => String(entry.status || '').toLowerCase());
      const pendingCount = normalizedOverview.filter((v) => v === 'pending_dsw').length;
      const forwardedCount = normalizedOverview.filter((v) => v === 'pending_admin').length;
      const resolvedCount = normalizedOverview.filter((v) => v === 'resolved').length;

      setStats({
        total: overviewCases.length,
        pending: pendingCount,
        forwarded: forwardedCount,
        resolved: resolvedCount,
        active: pendingCount + forwardedCount,
      });

      setRawCases(overviewCases);
      setTableCases(mappedQueue);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to fetch DSW dashboard data.');
      setTableCases([]);
      setStats({ total: 0, pending: 0, forwarded: 0, resolved: 0, active: 0 });
      setHistoryRecords([]);
      setHistoryLoading(false);
    } finally {
      if (!skipLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard({ tableStatus: statusFilter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleForward = async (caseId) => {
    try {
      setProcessingCaseId(caseId);
      setError('');
      await approveCase(caseId);
      await loadDashboard({ tableStatus: statusFilter, skipLoading: true });
    } catch (approveError) {
      setError(approveError?.message || 'Failed to forward case');
    } finally {
      setProcessingCaseId(null);
    }
  };

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, severityFilter]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tableCases.filter((row) => {
      const matchSearch =
        !query ||
        row.name.toLowerCase().includes(query) ||
        row.token.toLowerCase().includes(query) ||
        row.offense.toLowerCase().includes(query) ||
        row.dept.toLowerCase().includes(query);

      const matchSeverity =
        severityFilter === 'all' ||
        row.severity.toLowerCase() === severityFilter.toLowerCase();

      return matchSearch && matchSeverity;
    });
  }, [tableCases, search, severityFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedCases = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const topPendingCase = tableCases[0] || null;

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
              role="DSW"
              name={currentUser?.name}
              subtitle="Oversee university student welfare, review escalated cases, and forward committee sanctions."
              activeCount={stats.pending}
              totalCount={stats.total}
            />
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <AddActionPlaceholderCard
                to="/dashboard"
                label="Case Directory"
              />
            </div>

            <div>
              <QuickActionCard
                title="Pending Appeals"
                description="Evaluate cases forwarded to Dean of Student Welfare"
                onClick={() => setStatusFilter('pending_dsw')}
                illustrationType="sync"
              />
            </div>

            <div>
              <QuickActionCard
                title="Forward to Admin"
                description="Sanction recommendations ready for administrative signoff"
                onClick={() => setStatusFilter('pending_admin')}
                illustrationType="document"
              />
            </div>

            <div>
              <QuickActionCard
                title="Welfare Compliance"
                description="Institutional guidelines, student rights & hearing policy"
                to="/reports"
                illustrationType="shield"
              />
            </div>
          </div>
        </div>

        {/* ── ROW 2: Notifications, Priority Case & Calendar ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <NotificationCard
              viewAllTo="/dashboard"
              onClear={() => {}}
            />
          </div>

          <div>
            <PriorityCaseCard
              caseItem={topPendingCase}
              viewAllTo="/dashboard"
            />
          </div>

          <div>
            <CalendarActivityCard />
          </div>
        </div>

        {/* ── ROW 3: Priority Review Queue, AI Assistant & Analytics ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div id="search-results" className="lg:col-span-6">
            <ActivityCard
              title="DSW Review Queue"
              cases={paginatedCases}
              totalCount={filtered.length}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              onPrevPage={() => setPage((p) => Math.max(0, p - 1))}
              onNextPage={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              viewAllTo="/dashboard"
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