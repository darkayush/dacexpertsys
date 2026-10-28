import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DACLayout from '../components/layout/DACLayout';
import SeverityBadge from '../components/ui/SeverityBadge';
import { useAuth } from '../context/AuthContext';
import { getCases } from '../services/api';

const ACTIVE_STATUSES = ['pending_chief', 'pending_dsw', 'pending_admin'];

const STATUS_LABELS = {
  pending_chief: 'With Chief Warden',
  pending_dsw: 'With DSW',
  pending_admin: 'With Admin',
  resolved: 'Resolved',
};

const STATUS_DOTS = {
  pending_chief: 'bg-amber-500',
  pending_dsw: 'bg-indigo-500',
  pending_admin: 'bg-violet-500',
  resolved: 'bg-emerald-500',
};

const PAGE_SIZE = 10;

const AVATAR_TINTS = [
  'bg-indigo-50 text-indigo-600',
  'bg-amber-50 text-amber-700',
  'bg-emerald-50 text-emerald-700',
  'bg-sky-50 text-sky-700',
  'bg-rose-50 text-rose-600',
];

function Icon({ name, className = '' }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined leading-none ${className}`}>
      {name}
    </span>
  );
}

function Avatar({ name, seed }) {
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span
      className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold ${
        AVATAR_TINTS[seed % AVATAR_TINTS.length]
      }`}
    >
      {initials || '?'}
    </span>
  );
}

function toTitleCase(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function matchesFilter(c, filter, myStage) {
  if (filter === 'active') return ACTIVE_STATUSES.includes(c.status);
  if (filter === 'mine') return c.status === myStage;
  if (filter === 'resolved') return c.status === 'resolved';
  if (filter === 'severe') return c.severity === 'high' || c.severity === 'critical';
  return true;
}

function StatusCell({ status }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-slate-700 whitespace-nowrap">
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status] || 'bg-slate-400'}`} />
      {STATUS_LABELS[status] || toTitleCase(status)}
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { role, currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cases waiting on the viewer's own workflow stage.
  const myStage = role === 'dsw' ? 'pending_dsw' : 'pending_admin';

  useEffect(() => {
    let mounted = true;
    getCases()
      .then((rows) => {
        if (!mounted) return;
        setCases(
          rows.map((row) => ({
            id: row.id,
            caseId: row.external_case_id || `#${row.id}`,
            student: row.student_name || 'Unknown student',
            enrollment: row.enrollment_no || '',
            offense: toTitleCase(row.offense_type) || '—',
            severity: String(row.severity || 'low').toLowerCase(),
            status: String(row.status || '').toLowerCase(),
            date: row.incident_date ?? row.created_at,
          }))
        );
      })
      .catch((loadError) => mounted && setError(loadError?.message || 'Failed to load cases.'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const byStatus = Object.fromEntries([...ACTIVE_STATUSES, 'resolved'].map((s) => [s, 0]));
    let severe = 0;
    for (const c of cases) {
      if (c.status in byStatus) byStatus[c.status] += 1;
      if (c.severity === 'high' || c.severity === 'critical') severe += 1;
    }
    const active = ACTIVE_STATUSES.reduce((sum, s) => sum + byStatus[s], 0);
    return { total: cases.length, active, resolved: byStatus.resolved, severe, byStatus };
  }, [cases]);

  const filtered = useMemo(() => cases.filter((c) => matchesFilter(c, filter, myStage)), [cases, filter, myStage]);

  const awaiting = useMemo(
    () =>
      cases
        .filter((c) => c.status === myStage)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5),
    [cases, myStage]
  );

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return cases
      .filter((c) =>
        [c.student, c.enrollment, c.caseId, c.offense].some((v) => v.toLowerCase().includes(q))
      )
      .slice(0, 8)
      .map((c) => ({
        key: c.id,
        title: `${c.caseId} · ${c.student}`,
        subtitle: [c.enrollment, c.offense].filter(Boolean).join(' · '),
        meta: STATUS_LABELS[c.status] || toTitleCase(c.status),
        to: `/cases/${c.id}`,
      }));
  }, [cases, search]);

  const selectFilter = (next) => {
    setFilter(next);
    setPage(0);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const rangeStart = filtered.length ? page * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, filtered.length);

  const pctOf = (n) => (stats.total ? `${Math.round((n / stats.total) * 100)}% of all cases` : '');
  const statItems = [
    {
      key: 'all', label: 'Total cases', value: stats.total, icon: 'folder_open', note: 'All recorded incidents',
      card: 'bg-indigo-50/70 border-indigo-100 hover:border-indigo-200', chip: 'bg-indigo-500', label_: 'text-indigo-700', ring: 'ring-indigo-400',
    },
    {
      key: 'active', label: 'Active cases', value: stats.active, icon: 'pending_actions', note: pctOf(stats.active),
      card: 'bg-amber-50/70 border-amber-100 hover:border-amber-200', chip: 'bg-amber-500', label_: 'text-amber-700', ring: 'ring-amber-400',
    },
    {
      key: 'resolved', label: 'Resolved cases', value: stats.resolved, icon: 'task_alt', note: pctOf(stats.resolved),
      card: 'bg-emerald-50/70 border-emerald-100 hover:border-emerald-200', chip: 'bg-emerald-500', label_: 'text-emerald-700', ring: 'ring-emerald-400',
    },
    {
      key: 'severe', label: 'High & critical', value: stats.severe, icon: 'priority_high', note: pctOf(stats.severe),
      card: 'bg-rose-50/70 border-rose-100 hover:border-rose-200', chip: 'bg-rose-500', label_: 'text-rose-700', ring: 'ring-rose-400',
    },
  ];

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'mine', label: 'Awaiting you' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'severe', label: 'High & critical' },
  ];

  // DSW's case list excludes cases still with the Chief Warden, so that stage is admin-only.
  const stageBars = [
    { key: 'pending_chief', label: 'Chief Warden' },
    { key: 'pending_dsw', label: 'DSW' },
    { key: 'pending_admin', label: 'Admin' },
  ].filter((bar) => role !== 'dsw' || bar.key !== 'pending_chief');

  const firstName = (currentUser?.name || '').split(' ')[0];
  const fmt = (n) => n.toLocaleString('en-IN');

  return (
    <DACLayout searchValue={search} onSearchChange={setSearch} searchResults={searchResults}>
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              {greeting()}{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {role === 'dsw' ? 'Case roster' : 'Disciplinary overview'}
            </p>
          </div>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Stat blocks: each number appears only here; click filters the table */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => selectFilter(item.key)}
              aria-pressed={filter === item.key}
              className={`text-left rounded-2xl border px-5 py-5 flex items-start gap-4 transition-all ${item.card} ${
                filter === item.key ? `ring-2 ${item.ring} ring-offset-2 ring-offset-[#f8f9fe]` : ''
              }`}
            >
              <span className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-white shadow-sm ${item.chip}`}>
                <Icon name={item.icon} className="text-[20px]" />
              </span>
              <span className="min-w-0">
                <span className={`block text-xs font-semibold ${item.label_}`}>{item.label}</span>
                <span className="block mt-1 text-3xl font-semibold text-slate-900 tabular-nums">
                  {loading ? '–' : fmt(item.value)}
                </span>
                <span className="block mt-1 text-[11px] text-slate-500">{loading ? '' : item.note}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cases table */}
          <section className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Icon name="list_alt" className="text-[18px] text-slate-400" />
                Cases
              </h2>
              <div className="flex flex-wrap gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => selectFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filter === tab.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-y border-slate-100 bg-slate-50/60">
                    <th className="font-medium px-5 py-2.5">Case</th>
                    <th className="font-medium px-3 py-2.5">Student</th>
                    <th className="font-medium px-3 py-2.5">Offense</th>
                    <th className="font-medium px-3 py-2.5">Severity</th>
                    <th className="font-medium px-3 py-2.5">Status</th>
                    <th className="font-medium px-5 py-2.5 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading &&
                    Array.from({ length: PAGE_SIZE }, (_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-5 py-3.5">
                          <div className="h-4 rounded bg-slate-100 animate-pulse" />
                        </td>
                      </tr>
                    ))}
                  {!loading && pageRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                        <Icon name="inbox" className="block text-[28px] text-slate-300 mb-2" />
                        No cases in this view.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    pageRows.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => navigate(`/cases/${c.id}`)}
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-5 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{c.caseId}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={c.student} seed={c.id} />
                            <div>
                              <p className="font-medium text-slate-900 whitespace-nowrap">{c.student}</p>
                              <p className="text-xs text-slate-500">{c.enrollment}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{c.offense}</td>
                        <td className="px-3 py-3">
                          <SeverityBadge severity={c.severity} />
                        </td>
                        <td className="px-3 py-3">
                          <StatusCell status={c.status} />
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-slate-500 whitespace-nowrap">{formatDate(c.date)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
              <span className="tabular-nums">
                {rangeStart}–{rangeEnd} of {fmt(filtered.length)}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          </section>

          <div className="lg:col-span-4 space-y-6">
            {/* Needs your decision */}
            <section className="bg-white border border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Icon name="gavel" className="text-[18px] text-slate-400" />
                  Needs your decision
                </h2>
                <button
                  type="button"
                  onClick={() => selectFilter('mine')}
                  className="text-xs font-medium text-[#5c54eb] hover:underline"
                >
                  View all
                </button>
              </div>
              <ul className="divide-y divide-slate-100">
                {!loading && awaiting.length === 0 && (
                  <li className="px-5 py-8 flex flex-col items-center gap-2 text-sm text-slate-500">
                    <Icon name="done_all" className="text-[24px] text-emerald-500" />
                    Nothing waiting on you.
                  </li>
                )}
                {awaiting.map((c) => (
                  <li key={c.id}>
                    <Link to={`/cases/${c.id}`} className="group flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                      <Avatar name={c.student} seed={c.id} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-900 truncate">{c.student}</span>
                        <span className="block text-xs text-slate-500 truncate">
                          {c.caseId} · {c.offense}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">{formatDate(c.date)}</span>
                      <Icon name="chevron_right" className="text-[18px] text-slate-300 group-hover:text-slate-500" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* Active cases by stage */}
            <section className="bg-white border border-slate-200 rounded-2xl px-5 py-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-4">
                <Icon name="conversion_path" className="text-[18px] text-slate-400" />
                Active cases by stage
              </h2>
              <div className="space-y-4">
                {stageBars.map((bar) => {
                  const count = stats.byStatus[bar.key];
                  const pct = stats.active ? (count / stats.active) * 100 : 0;
                  return (
                    <div key={bar.key}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-2 text-slate-600">
                          <span className={`h-2 w-2 rounded-full ${STATUS_DOTS[bar.key]}`} />
                          {bar.label}
                        </span>
                        <span className="text-slate-900 font-medium tabular-nums">{loading ? '–' : fmt(count)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${STATUS_DOTS[bar.key]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </DACLayout>
  );
}
