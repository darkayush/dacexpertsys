import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DACLayout from '../../components/layout/DACLayout';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import EmptyState from '../../components/ui/EmptyState';
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

export default function MyCases() {
  const navigate = useNavigate();
  const hasLoggedResponseRef = useRef(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const [casesResponse, usersResponse] = await Promise.all([getCases(), getUsers()]);

        if (!hasLoggedResponseRef.current) {
          console.log('Warden MyCases API response:', { cases: casesResponse, users: usersResponse });
          hasLoggedResponseRef.current = true;
        }

        const usersById = Object.fromEntries(usersResponse.map((user) => [String(user.id), user]));
        const mapped = casesResponse.map((entry) => {
          const student = usersById[String(entry.student_id)] ?? {};
          const status = toTitleCase(entry.status);
          const severity = toTitleCase(entry.severity);

          return {
            id: String(entry.id),
            token: entry.external_case_id || `#${entry.id}`,
            studentName: student.name || entry.student_name || 'Unknown Student',
            enrollment: student.enrollment_no || entry.enrollment_no || 'N/A',
            offense: toTitleCase(entry.offense_type) || 'N/A',
            severity,
            status,
            penaltyPoints: entry.penalty_points || 0,
            date: formatDate(entry.incident_date ?? entry.created_at),
          };
        });

        if (mounted) setCases(mapped);
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.message || 'Failed to fetch cases.');
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

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch =
        c.studentName.toLowerCase().includes(q) ||
        c.offense.toLowerCase().includes(q) ||
        c.enrollment.toLowerCase().includes(q) ||
        c.token.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'All' || c.status.toLowerCase().includes(statusFilter.toLowerCase());
      return matchesSearch && matchesStatus;
    });
  }, [cases, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedCases = useMemo(() => {
    const start = page * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

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
      <div className="space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#1e1b4b] tracking-tight">
              My Disciplinary Cases
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Comprehensive roster of disciplinary incidents registered and managed
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Pending', 'Chief', 'DSW', 'Resolved'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setStatusFilter(tab);
                  setPage(0);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  statusFilter === tab
                    ? 'bg-[#5c54eb] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Card / List Hybrid Roster */}
        <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between min-h-[460px]">
          <div>
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <span className="material-symbols-outlined animate-spin text-[32px] text-[#5c54eb] mb-2">
                  progress_activity
                </span>
                <p className="text-xs font-semibold">Loading disciplinary roster...</p>
              </div>
            ) : paginatedCases.length === 0 ? (
              <EmptyState
                icon="folder_off"
                title="No Matching Cases Found"
                description="Try refining your search query or switching active status filters."
              />
            ) : (
              <div className="space-y-3">
                {paginatedCases.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.005 }}
                    className="p-4 rounded-2xl bg-slate-50/60 hover:bg-white border border-slate-100/90 hover:border-purple-100 hover:shadow-[0_4px_16px_rgba(92,84,235,0.06)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    {/* Left: Token & Student */}
                    <div className="flex items-center gap-3.5">
                      <div className="h-10 w-10 rounded-2xl bg-purple-50 group-hover:bg-[#5c54eb] text-[#5c54eb] group-hover:text-white flex items-center justify-center font-extrabold text-xs transition-colors shrink-0">
                        {item.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#1e1b4b] group-hover:text-[#5c54eb] transition-colors">
                            {item.studentName}
                          </h4>
                          <span className="text-xs font-mono font-bold text-slate-400">
                            {item.token}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          Enrollment: <span className="text-slate-700 font-bold">{item.enrollment}</span> · Logged: {item.date}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Offense & Points */}
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                        {item.offense}
                      </span>
                      {item.penaltyPoints > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100">
                          {item.penaltyPoints} pts
                        </span>
                      )}
                    </div>

                    {/* Right: Badges & Details Action */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                      <StatusBadge status={item.status} />
                      <SeverityBadge severity={item.severity} />
                      <Link
                        to={`/warden/cases/${item.id}`}
                        className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#5c54eb] text-slate-600 hover:text-white border border-slate-200 text-xs font-bold transition-all shadow-xs"
                      >
                        Inspect Record
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-slate-500">
                Page {page + 1} of {totalPages} ({filtered.length} total cases)
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>

      </div>
    </DACLayout>
  );
}
