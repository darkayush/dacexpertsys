import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Card, Icon } from './parts';
import { caseLink, studentProfilePath, toTitleCase } from './caseUi';
import { getRecentlyViewed } from '../../lib/recentlyViewed';

const TABS = [
  { key: 'cases', label: 'Cases' },
  { key: 'students', label: 'Students' },
];

function viewedAgo(timestamp) {
  const minutes = Math.floor((Date.now() - Number(timestamp || 0)) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

/** Dashboard panel: the cases and student profiles this user opened most recently. */
export default function RecentlyViewedCard({ userId, role }) {
  const [tab, setTab] = useState('cases');
  const [recent, setRecent] = useState(() => getRecentlyViewed(userId));
  const tabRefs = useRef({});

  // Re-read when another browser tab records a view (the dashboard remounts this card per user).
  useEffect(() => {
    const onStorage = () => setRecent(getRecentlyViewed(userId));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId]);

  // Arrow keys move between the two tabs (WAI-ARIA tabs pattern).
  const onTabKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = TABS.findIndex((t) => t.key === tab);
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? TABS.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    const next = TABS[nextIndex].key;
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const items = recent[tab] || [];

  return (
    <Card
      title="Recently Viewed"
      icon="history"
      action={
        <div role="tablist" aria-label="Recently viewed" className="flex gap-1 bg-[#f6f6fa] rounded-lg p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              ref={(node) => { tabRefs.current[t.key] = node; }}
              type="button"
              role="tab"
              id={`recent-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls="recent-panel"
              tabIndex={tab === t.key ? 0 : -1}
              onClick={() => setTab(t.key)}
              onKeyDown={onTabKeyDown}
              className={`px-3 py-1 rounded-md text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                tab === t.key ? 'bg-[#3d3793] text-white font-medium' : 'text-slate-600 hover:bg-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      <ul id="recent-panel" role="tabpanel" aria-labelledby={`recent-tab-${tab}`} className="px-3 pb-3">
        {items.length === 0 && (
          <li className="px-3 py-8 flex flex-col items-center gap-2 text-sm text-slate-500 text-center">
            <Icon name={tab === 'cases' ? 'folder_open' : 'person_search'} className="text-[24px] text-slate-400" />
            {tab === 'cases' ? 'Cases you open will appear here.' : 'Student profiles you open will appear here.'}
          </li>
        )}
        {tab === 'cases' && items.map((c) => (
          <li key={c.id} className="border-t border-slate-100 first:border-t-0">
            <Link to={caseLink(role, c.id)} className="group flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200">
              <Avatar name={c.student || c.caseId} seed={c.id} square />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900 truncate">{c.caseId}</span>
                <span className="block text-xs text-slate-500 truncate">
                  {[c.student, toTitleCase(c.offense)].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="shrink-0 text-xs text-slate-500">{viewedAgo(c.viewedAt)}</span>
              <Icon name="chevron_right" className="text-[20px] text-slate-400 group-hover:text-slate-600" />
            </Link>
          </li>
        ))}
        {tab === 'students' && items.map((s) => (
          <li key={s.enrollment} className="border-t border-slate-100 first:border-t-0">
            <Link to={studentProfilePath(s.enrollment)} className="group flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200">
              <Avatar name={s.name || s.enrollment} seed={Number(s.enrollment) || 0} square />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900 truncate">{s.name || s.enrollment}</span>
                <span className="block text-xs text-slate-500 truncate">
                  {[s.enrollment, s.program ? String(s.program).toUpperCase() : null].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="shrink-0 text-xs text-slate-500">{viewedAgo(s.viewedAt)}</span>
              <Icon name="chevron_right" className="text-[20px] text-slate-400 group-hover:text-slate-600" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
