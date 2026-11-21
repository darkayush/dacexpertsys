// Shared case vocabulary for the redesigned pages: labels, colours and row mapping.

export const ACTIVE_STATUSES = ['pending_chief', 'pending_dsw', 'pending_admin'];

export const STATUS_LABELS = {
  pending_chief: 'With Chief Warden',
  pending_dsw: 'With DSW',
  pending_admin: 'With Admin',
  resolved: 'Resolved',
};

export const STATUS_DOTS = {
  pending_chief: 'bg-amber-500',
  pending_dsw: 'bg-indigo-500',
  pending_admin: 'bg-violet-500',
  resolved: 'bg-emerald-500',
};

export const SEVERITY_PILLS = {
  critical: 'bg-[#f6dde1] text-[#a1203a]',
  high: 'bg-[#fbe4d6] text-[#b4541a]',
  medium: 'bg-[#fbecd3] text-[#94600f]',
  low: 'bg-[#e3ebf7] text-[#3b5b8a]',
};

export const AVATAR_TINTS = [
  'bg-[#f8e3e7] text-[#a1203a]',
  'bg-[#fbf0d4] text-[#94600f]',
  'bg-[#fde6d6] text-[#b4541a]',
  'bg-[#e3ebf7] text-[#3b5b8a]',
  'bg-[#e6f2ea] text-[#2f7a4d]',
];

// Workflow stage that each reviewer acts on.
export const STAGE_FOR_ROLE = {
  chief_warden: 'pending_chief',
  dsw: 'pending_dsw',
  admin: 'pending_admin',
};

// Staff-only student profile route. Enrollment number is the identifier (unique in users).
export function studentProfilePath(enrollmentNo) {
  return `/students/${encodeURIComponent(enrollmentNo)}`;
}

// A return target is accepted only if it is an in-app student profile path.
export function safeReturnPath(value) {
  return typeof value === 'string' && /^\/students\/[^/?#]+$/.test(value) ? value : null;
}

const CASE_ROUTES = {
  warden: '/warden/cases',
  chief_warden: '/chief-warden/cases',
  student: '/student/cases',
};

export function caseLink(role, id) {
  return `${CASE_ROUTES[role] || '/cases'}/${id}`;
}

export function toTitleCase(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || toTitleCase(status);
}

// API case row -> the fields the tables and cards display.
export function mapCase(row) {
  return {
    id: row.id,
    caseId: row.external_case_id || `#${row.id}`,
    student: row.student_name || 'Unknown student',
    enrollment: row.enrollment_no || '',
    offense: toTitleCase(row.offense_type) || '—',
    severity: String(row.severity || 'low').toLowerCase(),
    status: String(row.status || '').toLowerCase(),
    date: row.incident_date ?? row.created_at,
    createdBy: row.created_by,
  };
}

export function matchesFilter(c, filter, myStage) {
  if (filter === 'active') return ACTIVE_STATUSES.includes(c.status);
  if (filter === 'mine') return c.status === myStage;
  if (filter === 'resolved') return c.status === 'resolved';
  if (filter === 'severe') return (c.severity === 'high' || c.severity === 'critical') && c.status !== 'resolved';
  return true;
}

export function searchCases(cases, query) {
  const q = query.trim().toLowerCase();
  if (!q) return cases;
  return cases.filter((c) => [c.student, c.enrollment, c.caseId, c.offense].some((v) => v.toLowerCase().includes(q)));
}

// Page buttons like 1 2 3 … 245, keeping the current page visible.
export function pageList(page, totalPages) {
  const pages = new Set([0, 1, 2, page - 1, page, page + 1, totalPages - 1]);
  const sorted = [...pages].filter((p) => p >= 0 && p < totalPages).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

export const fmtNumber = (n) => Number(n || 0).toLocaleString('en-IN');

// A case's points and fine are set by the DAC and are final only once it is resolved; until
// then show a dash instead of the provisional (often 0) value.
const isResolved = (c) => String(c?.status || '').toLowerCase() === 'resolved';
export const casePointsText = (c) => (isResolved(c) ? fmtNumber(c.penalty_points) : '—');
export const caseFineText = (c) => (isResolved(c) ? `₹${fmtNumber(c.fine)}` : '—');
