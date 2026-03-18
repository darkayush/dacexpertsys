import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import { pageVariants, listVariants, itemVariants } from '../lib/motion';

// ─── Data ─────────────────────────────────────────────────────────────────────
const stats = [
  {
    label: 'Total Cases',
    value: '1,248',
    bgIcon: 'folder_shared',
    bgIconColor: 'text-[#1f3a89]',
  },
  {
    label: 'Pending DAC Cases',
    value: '45',
    bgIcon: 'pending_actions',
    bgIconColor: 'text-amber-500',
  },
  {
    label: 'High Severity',
    value: '12',
    bgIcon: 'gavel',
    bgIconColor: 'text-red-500',
  },
  {
    label: 'Resolved Cases',
    value: '890',
    bgIcon: 'check_circle',
    bgIconColor: 'text-emerald-500',
  },
];

const CASES = [
  {
    id: '#2024-001',
    name: 'John Doe',
    dept: 'Comp Sci',
    initials: 'JD',
    avatarBg: 'bg-indigo-100',
    avatarText: 'text-indigo-700',
    offense: 'Plagiarism',
    severity: 'Critical',
    severityClass: 'bg-red-100 text-red-800',
    statusDot: 'bg-yellow-500',
    status: 'Pending Review',
    action: 'Manage',
    actionClass: 'text-[#1f3a89] hover:text-[#3b5dc9]',
  },
  {
    id: '#2024-002',
    name: 'Jane Smith',
    dept: 'Arts & Humanities',
    initials: 'JS',
    avatarBg: 'bg-pink-100',
    avatarText: 'text-pink-700',
    offense: 'Vandalism',
    severity: 'High',
    severityClass: 'bg-orange-100 text-orange-800',
    statusDot: 'bg-blue-500',
    status: 'Investigation',
    action: 'Manage',
    actionClass: 'text-[#1f3a89] hover:text-[#3b5dc9]',
  },
  {
    id: '#2024-003',
    name: 'Robert Brown',
    dept: 'Engineering',
    initials: 'RB',
    avatarBg: 'bg-emerald-100',
    avatarText: 'text-emerald-700',
    offense: 'Attendance',
    severity: 'Low',
    severityClass: 'bg-slate-100 text-slate-700',
    statusDot: 'bg-green-500',
    status: 'Resolved',
    action: 'View Details',
    actionClass: 'text-[#64748b] hover:text-[#1f3a89]',
  },
  {
    id: '#2024-004',
    name: 'Emily White',
    dept: 'Law',
    initials: 'EW',
    avatarBg: 'bg-cyan-100',
    avatarText: 'text-cyan-700',
    offense: 'Exam Malpractice',
    severity: 'Critical',
    severityClass: 'bg-red-100 text-red-800',
    statusDot: 'bg-purple-500',
    status: 'DAC Review',
    action: 'Manage',
    actionClass: 'text-[#1f3a89] hover:text-[#3b5dc9]',
  },
  {
    id: '#2024-005',
    name: 'Michael Green',
    dept: 'Business',
    initials: 'MG',
    avatarBg: 'bg-amber-100',
    avatarText: 'text-amber-700',
    offense: 'Disruption',
    severity: 'Medium',
    severityClass: 'bg-yellow-100 text-yellow-800',
    statusDot: 'bg-green-500',
    status: 'Resolved',
    action: 'View Details',
    actionClass: 'text-[#64748b] hover:text-[#1f3a89]',
  },
];

// ─── Hardcoded notifications (swap for backend fetch later) ──────────────────
const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    icon: 'gavel',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    title: 'New High-Severity Case',
    body: 'Case #DAC-2026-049 flagged as Critical — Exam Malpractice.',
    time: '2 min ago',
    read: false,
  },
  {
    id: 2,
    icon: 'pending_actions',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    title: 'DAC Review Pending',
    body: 'Case #DAC-2026-041 is awaiting committee review.',
    time: '18 min ago',
    read: false,
  },
  {
    id: 3,
    icon: 'check_circle',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    title: 'Case Resolved',
    body: 'Case #DAC-2026-038 marked as resolved by Admin.',
    time: '1 hr ago',
    read: false,
  },
  {
    id: 4,
    icon: 'person_add',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'New User Registered',
    body: 'Faculty member Dr. Sharma joined the system.',
    time: '3 hr ago',
    read: true,
  },
  {
    id: 5,
    icon: 'rule',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    title: 'Rule Set Updated',
    body: 'Disciplinary rule weights updated to v4.3.',
    time: 'Yesterday',
    read: true,
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const markRead = (id) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

  const filtered = CASES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.offense.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f9f9fb] font-sans antialiased">
      <Sidebar />

      <main className="pt-14 md:pt-0 md:pl-64 flex flex-col min-h-screen bg-[#f9f9fb]">

        {/* ── Header ── */}
        <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-20 px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-[#0f172a] tracking-tight">Dashboard</h2>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            {/* Search — hidden on mobile */}
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] text-[20px]">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cases, students..."
                className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#1f3a89]/20 w-64 placeholder:text-[#64748b]/70 text-[#0f172a] transition-shadow outline-none"
              />
            </div>

            {/* Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className={`relative p-1.5 rounded-lg transition-colors ${notifOpen ? 'text-[#1f3a89] bg-[#1f3a89]/10' : 'text-[#64748b] hover:text-[#1f3a89] hover:bg-slate-100'
                  }`}
                aria-label="Notifications"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-[#ef4444] border-2 border-white flex items-center justify-center">
                    <span className="text-white text-[9px] font-bold leading-none">{unreadCount}</span>
                  </span>
                )}
              </button>

              {/* Dropdown panel */}
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#e2e8f0] rounded-xl shadow-xl z-50 overflow-hidden origin-top-right"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0]">
                      <div className="flex items-center gap-2">
                        <span className="text-[#0f172a] font-semibold text-sm">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="bg-[#ef4444] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[#1f3a89] text-xs font-medium hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* List */}
                    <div className="max-h-[360px] overflow-y-auto divide-y divide-[#f1f5f9]">
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => markRead(n.id)}
                          className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors ${n.read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/60 hover:bg-blue-50'
                            }`}
                        >
                          {/* Icon */}
                          <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${n.iconBg}`}>
                            <span className={`material-symbols-outlined text-[16px] ${n.iconColor}`}>{n.icon}</span>
                          </div>
                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug ${n.read ? 'text-[#0f172a] font-medium' : 'text-[#0f172a] font-semibold'}`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-[#64748b] mt-0.5 leading-snug">{n.body}</p>
                            <p className="text-[10px] text-[#94a3b8] mt-1">{n.time}</p>
                          </div>
                          {/* Unread dot */}
                          {!n.read && (
                            <span className="h-2 w-2 rounded-full bg-[#1f3a89] shrink-0 mt-1.5" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-[#e2e8f0] text-center">
                      <button className="text-[#1f3a89] text-xs font-medium hover:underline">
                        View all notifications
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* New Case */}
            <Link
              to="/register-case"
              className="bg-[#1f3a89] hover:bg-[#3b5dc9] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm shadow-[#1f3a89]/30"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Case</span>
            </Link>
          </div>
        </header>

        {/* ── Page Content ── */}
        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-[1400px] mx-auto w-full"
        >

          {/* ── Stats Grid ── */}
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6"
          >
            {stats.map((s) => (
              <motion.div
                key={s.label}
                variants={itemVariants}
                whileHover={{ y: -4, boxShadow: '0 10px 24px rgba(0,0,0,0.09)', transition: { duration: 0.2 } }}
                className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm transition-shadow relative overflow-hidden group"
              >
                <div className="flex flex-col gap-1 relative z-10">
                  <span className="text-[#64748b] text-sm font-medium">{s.label}</span>
                  <div className="flex items-end gap-2">
                    <h3 className="text-3xl font-bold text-[#0f172a] tracking-tight">{s.value}</h3>
                  </div>
                </div>
                {/* Background icon */}
                <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className={`material-symbols-outlined text-[100px] ${s.bgIconColor}`}>{s.bgIcon}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* ── Table Section ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0f172a]">Recent Disciplinary Cases</h3>
              <div className="flex gap-2">
                <button className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#64748b] bg-white border border-[#e2e8f0] rounded-lg hover:bg-slate-50 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">filter_list</span>
                  Filter
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#64748b] bg-white border border-[#e2e8f0] rounded-lg hover:bg-slate-50 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Export
                </button>
              </div>
            </div>

            {/* Table card */}
            <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto min-w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-[#e2e8f0]">
                      {[
                        { label: 'Token ID', cls: 'w-32 text-left' },
                        { label: 'Student Name', cls: 'text-left' },
                        { label: 'Offense Type', cls: 'text-left' },
                        { label: 'Severity', cls: 'text-left' },
                        { label: 'Status', cls: 'text-left' },
                        { label: 'Actions', cls: 'text-right' },
                      ].map(({ label, cls }) => (
                        <th
                          key={label}
                          className={`px-6 py-4 text-xs font-semibold text-[#64748b] uppercase tracking-wider ${cls}`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#e2e8f0] bg-white">
                    {filtered.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">

                        {/* Token ID */}
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-[#64748b]">{row.id}</span>
                        </td>

                        {/* Student */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full ${row.avatarBg} flex items-center justify-center ${row.avatarText} text-xs font-bold shrink-0`}>
                              {row.initials}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-[#0f172a]">{row.name}</div>
                              <div className="text-xs text-[#64748b]">{row.dept}</div>
                            </div>
                          </div>
                        </td>

                        {/* Offense */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-[#0f172a]">{row.offense}</span>
                        </td>

                        {/* Severity */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.severityClass}`}>
                            {row.severity}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${row.statusDot}`} />
                            <span className="text-sm text-[#0f172a]">{row.status}</span>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-6 py-4 text-right">
                          {row.action === 'Manage' ? (
                            <button
                              onClick={() => navigate(`/cases/${row.id.replace('#', '')}`)}
                              className={`font-medium text-sm transition-colors ${row.actionClass}`}
                            >
                              {row.action}
                            </button>
                          ) : row.action === 'View Details' ? (
                            <button
                              onClick={() => navigate(`/view-case/${row.id.replace('#', '')}`)}
                              className={`font-medium text-sm transition-colors ${row.actionClass}`}
                            >
                              {row.action}
                            </button>
                          ) : (
                            <button className={`font-medium text-sm transition-colors ${row.actionClass}`}>
                              {row.action}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-t border-[#e2e8f0]">
                <div className="text-sm text-[#64748b]">
                  Showing{' '}
                  <span className="font-medium text-[#0f172a]">1</span>
                  {' '}to{' '}
                  <span className="font-medium text-[#0f172a]">5</span>
                  {' '}of{' '}
                  <span className="font-medium text-[#0f172a]">1,248</span>
                  {' '}results
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm border border-[#e2e8f0] rounded-md bg-white text-[#64748b] hover:bg-slate-50 disabled:opacity-50 transition-colors">
                    Previous
                  </button>
                  <button className="px-3 py-1 text-sm border border-[#e2e8f0] rounded-md bg-white text-[#64748b] hover:bg-slate-50 transition-colors">
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}