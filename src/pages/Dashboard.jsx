import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DACLayout from '../components/layout/DACLayout';
import CasesTable from '../components/cases/CasesTable';
import RecentlyViewedCard from '../components/cases/RecentlyViewedCard';
import { Donut, TrendChart } from '../components/cases/charts';
import { Avatar, Card, Icon } from '../components/cases/parts';
import { TREND_RANGES, buildTrend } from '../components/cases/trend';
import {
  ACTIVE_STATUSES,
  STAGE_FOR_ROLE,
  caseLink,
  fmtNumber,
  formatDate,
  mapCase,
  statusLabel,
} from '../components/cases/caseUi';
import { useAuth } from '../context/AuthContext';
import { usePagedCases } from '../hooks/usePagedCases';
import { getCasesSummary } from '../services/api';

const OWN_CASES_QUERY = { role: 'my_created_only' };
const ALL_CASES_QUERY = {};

// The case table covers the same cases as the count cards: wardens see the cases they registered;
// Admin, Chief Warden and DSW see every case their role may see (scoped by the backend).

// 'YYYY-MM-DD' -> local-midnight Date (new Date('YYYY-MM-DD') would be UTC).
function parseDay(day) {
  const [y, m, d] = String(day).split('-').map(Number);
  return new Date(y, m - 1, d);
}

const SUBTITLES = {
  admin: "Here's the current status of disciplinary cases.",
  dsw: 'Cases moving through Dean of Student Welfare review.',
  chief_warden: 'Cases waiting for your first review, and everything else in progress.',
  warden: 'Cases you have registered and where they are in the review chain.',
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Dashboard for admin, DSW, chief warden and warden. Reviewers see the cases
 * waiting on their workflow stage; wardens see the cases they registered.
 */
export default function Dashboard() {
  const { role, currentUser } = useAuth();
  const [filter, setFilter] = useState('all');
  const [trendRange, setTrendRange] = useState('30d');
  // Distribution slice highlighted from the donut or its legend.
  const [activeSlice, setActiveSlice] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const isWarden = role === 'warden';
  const myStage = STAGE_FOR_ROLE[role];
  const scopeQuery = isWarden ? OWN_CASES_QUERY : ALL_CASES_QUERY;

  // Counts, trend and side panel are computed by the server; the table loads one page at a time.
  useEffect(() => {
    let mounted = true;
    getCasesSummary(scopeQuery)
      .then((data) => mounted && setSummary(data))
      .catch((loadError) => mounted && setSummaryError(loadError?.message || 'Failed to load cases.'))
      .finally(() => mounted && setSummaryLoading(false));
    return () => {
      mounted = false;
    };
  }, [scopeQuery]);

  const tableTitle = isWarden ? 'Cases You Registered' : 'All Cases';
  const table = usePagedCases({ query: scopeQuery, filter, pageSize: 5 });

  const loading = summaryLoading;
  const error = summaryError || table.error;

  const stats = useMemo(() => {
    const byStatus = { pending_chief: 0, pending_dsw: 0, pending_admin: 0, resolved: 0, ...(summary?.byStatus || {}) };
    const active = ACTIVE_STATUSES.reduce((sum, s) => sum + byStatus[s], 0);
    return { total: summary?.total || 0, active, resolved: byStatus.resolved, severe: summary?.severe || 0, byStatus };
  }, [summary]);

  // Reviewers: oldest cases waiting on them. Wardens: their latest registrations.
  const sideList = useMemo(() => (summary?.queue || []).map(mapCase), [summary]);

  const trend = useMemo(
    () => buildTrend(
      (summary?.trend || []).map((d) => ({ date: parseDay(d.day), count: d.count })),
      TREND_RANGES.find((r) => r.key === trendRange)
    ),
    [summary, trendRange]
  );
  const trendTotal = trend.reduce((sum, p) => sum + p.value, 0);


  const statCards = [
    {
      key: 'all', label: isWarden ? 'Registered by You' : 'Total Cases', value: stats.total, icon: 'folder_open', wave: true,
      card: 'bg-[#eeedfa] border-[#e0ddf6]', chip: 'bg-[#dcd9f5] text-[#4b44b5]', labelColor: 'text-slate-800', ring: 'ring-[#4b44b5]',
    },
    {
      key: 'active', label: 'Active Cases', value: stats.active, icon: 'schedule',
      card: 'bg-[#fbf1e5] border-[#f2e1cc]', chip: 'bg-[#f4dfc4] text-[#9a5b16]', labelColor: 'text-[#9a5b16]', ring: 'ring-[#c98a3f]',
    },
    {
      key: 'resolved', label: 'Resolved Cases', value: stats.resolved, icon: 'check',
      card: 'bg-[#eaf4ee] border-[#d5e9dc]', chip: 'bg-[#d2e8da] text-[#2f7a4d]', labelColor: 'text-slate-800', ring: 'ring-[#4f9a6d]',
    },
    {
      key: 'severe', label: 'High & Critical', value: stats.severe, icon: 'warning',
      card: 'bg-[#f8e7ea] border-[#efd2d8]', chip: 'bg-[#f1d0d7] text-[#b42b44]', labelColor: 'text-[#9f1d35]', ring: 'ring-[#c2475e]',
    },
  ];

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    ...(myStage ? [{ key: 'mine', label: 'Awaiting You' }] : []),
    { key: 'resolved', label: 'Resolved' },
    { key: 'severe', label: 'High & Critical' },
  ];

  // Every case falls in exactly one slice. DSW's case list excludes cases still
  // with the Chief Warden, so that slice is hidden for DSW.
  const distribution = [
    { key: 'resolved', label: 'Resolved', color: '#7cc39a' },
    { key: 'pending_chief', label: 'With Chief Warden', color: '#f0b44c' },
    { key: 'pending_dsw', label: 'With DSW', color: '#8b84e8' },
    { key: 'pending_admin', label: 'With Admin', color: '#c08fe8' },
  ]
    .filter((slice) => role !== 'dsw' || slice.key !== 'pending_chief')
    .map((slice) => ({ ...slice, value: stats.byStatus[slice.key] }));

  const roleName = { admin: 'Admin', dsw: 'DSW', chief_warden: 'Chief Warden', warden: 'Warden' }[role];
  const displayName = currentUser?.name?.split(' ')[0] || roleName;

  return (
    <DACLayout>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="border-l-4 border-[#3d3793] pl-4">
          <h1 className="text-2xl sm:text-[28px] text-slate-900 tracking-tight">
            {greeting()}, <span className="font-semibold">{displayName}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{SUBTITLES[role] || SUBTITLES.admin}</p>
        </div>

        {error && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Stat cards: click filters the table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              aria-pressed={filter === item.key}
              className={`relative overflow-hidden text-left rounded-2xl border px-6 py-6 flex items-center gap-4 transition-shadow hover:shadow-sm ${item.card} ${
                filter === item.key ? `ring-2 ${item.ring} ring-offset-2 ring-offset-[#f6f6fa]` : ''
              }`}
            >
              {item.wave && (
                <svg aria-hidden="true" viewBox="0 0 200 80" preserveAspectRatio="none" className="absolute right-0 bottom-0 w-1/2 h-3/4 text-[#d9d5f4]">
                  <path d="M0,70 C30,66 50,72 80,58 C110,44 125,20 160,18 C180,17 192,24 200,28 L200,80 L0,80 Z" fill="currentColor" />
                </svg>
              )}
              <span className={`relative h-12 w-12 shrink-0 rounded-full flex items-center justify-center ${item.chip}`}>
                <Icon name={item.icon} className="text-[26px]" />
              </span>
              <span className="relative min-w-0">
                <span className={`block text-sm font-semibold ${item.labelColor}`}>{item.label}</span>
                <span className="block mt-1 text-3xl font-semibold text-slate-900 tabular-nums">
                  {loading ? '–' : fmtNumber(item.value)}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 space-y-6">
            <CasesTable
              cases={table.rows}
              loading={table.loading}
              role={role}
              title={tableTitle}
              tabs={tabs}
              activeTab={filter}
              onTabChange={setFilter}
              pageSize={5}
              total={table.total}
              page={table.page}
              onPageChange={table.setPage}
            />

            <Card
              title="Case Trend"
              icon="trending_up"
              action={
                <div className="flex gap-1 bg-[#f6f6fa] rounded-lg p-1">
                  {TREND_RANGES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setTrendRange(r.key)}
                      className={`px-3 py-1 rounded-md text-xs ${
                        trendRange === r.key ? 'bg-[#3d3793] text-white font-medium' : 'text-slate-600 hover:bg-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="px-6 pb-5">
                {loading ? (
                  <div className="h-48 rounded-lg bg-slate-100 animate-pulse" />
                ) : (
                  <>
                    <p className="text-xs text-slate-500 mb-2">
                      {trendTotal ? `${fmtNumber(trendTotal)} cases reported in this period` : 'No cases reported in this period'}
                    </p>
                    <TrendChart points={trend} />
                  </>
                )}
              </div>
            </Card>
          </div>

          <div className="xl:col-span-4 space-y-6">
            <Card
              title={isWarden ? 'Your Recent Registrations' : 'Needs Your Decision'}
              icon={isWarden ? 'history' : 'gavel'}
              action={
                <button
                  type="button"
                  onClick={() => setFilter(isWarden ? 'active' : 'mine')}
                  className="flex items-center gap-1 text-sm font-medium text-[#3d3793] hover:underline"
                >
                  View all <Icon name="arrow_forward" className="text-[18px]" />
                </button>
              }
            >
              <ul className="px-3 pb-3">
                {!loading && sideList.length === 0 && (
                  <li className="px-3 py-8 flex flex-col items-center gap-2 text-sm text-slate-500">
                    <Icon name="done_all" className="text-[24px] text-emerald-500" />
                    {isWarden ? 'No cases registered yet.' : 'Nothing waiting on you.'}
                  </li>
                )}
                {sideList.map((c) => (
                  <li key={c.id} className="border-t border-slate-100 first:border-t-0">
                    <Link to={caseLink(role, c.id)} className="group flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-50">
                      <Avatar name={c.student} seed={c.id} square />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900 truncate">{c.student}</span>
                        <span className="block text-xs text-slate-500 truncate">
                          {c.caseId} · {isWarden ? statusLabel(c.status) : c.offense}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">{formatDate(c.date)}</span>
                      <Icon name="chevron_right" className="text-[20px] text-slate-400 group-hover:text-slate-600" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            <RecentlyViewedCard key={currentUser?.id || 'anonymous'} userId={currentUser?.id} role={role} />

            <Card title="Case Distribution" icon="donut_large">
              <div className="px-6 pb-6 flex flex-col sm:flex-row xl:flex-col 2xl:flex-row items-center gap-6">
                {loading ? (
                  <div className="h-44 w-44 rounded-full bg-slate-100 animate-pulse" />
                ) : (
                  <Donut slices={distribution} total={stats.total} activeKey={activeSlice} onActiveChange={setActiveSlice} />
                )}
                <ul className="w-full divide-y divide-slate-100">
                  {distribution.map((slice) => (
                    <li
                      key={slice.key}
                      tabIndex={loading ? undefined : 0}
                      onMouseEnter={() => setActiveSlice(slice.key)}
                      onMouseLeave={() => setActiveSlice(null)}
                      onFocus={() => setActiveSlice(slice.key)}
                      onBlur={() => setActiveSlice(null)}
                      className={`flex items-center justify-between py-2.5 px-2 -mx-2 text-sm rounded-lg cursor-default outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-indigo-200 ${
                        activeSlice === slice.key ? 'bg-slate-50' : ''
                      } ${activeSlice && activeSlice !== slice.key ? 'opacity-60' : ''}`}
                    >
                      <span className="flex items-center gap-2.5 text-slate-700">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                        {slice.label}
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums">{loading ? '–' : fmtNumber(slice.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DACLayout>
  );
}
