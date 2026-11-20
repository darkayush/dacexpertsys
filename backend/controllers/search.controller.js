import { likeContains, searchCasesService, searchOffencesService } from '../services/cases.service.js';
import { searchStudentsService } from '../services/users.service.js';

// Global header search: one request returns grouped results the requester is allowed to see.
//   GET /api/search?q=<text>        → { query, students, cases, offences }
//   GET /api/search?offence=<name>  → { query, offence, students: [], cases, offences: [] }
// Students (records, emails) are returned to staff only; students search their own cases.

export const SEARCH_MIN_LENGTH = 2;
const SEARCH_MAX_LENGTH = 100;
const STAFF_ROLES = new Set(['warden', 'chief_warden', 'dsw', 'admin']);
const LIMITS = { students: 5, cases: 6, offences: 5, offenceCases: 8 };

const toCaseResult = (row) => ({
  id: row.id,
  case_ref: row.external_case_id || `#${row.id}`,
  offense_type: row.offense_type,
  status: row.status,
  severity: row.severity,
  student_name: row.student_name,
  enrollment_no: row.enrollment_no,
  incident_date: row.incident_date,
});

export async function globalSearchController(req, res) {
  const role = String(req.user?.role || '').toLowerCase();
  const requesterId = Number(req.user?.sub);
  const isStaff = STAFF_ROLES.has(role);
  if (!isStaff && role !== 'student') return res.status(403).json({ error: 'Forbidden' });

  const q = String(req.query?.q ?? '').trim();
  const offence = String(req.query?.offence ?? '').trim();
  if (q.length > SEARCH_MAX_LENGTH || offence.length > SEARCH_MAX_LENGTH) {
    return res.status(400).json({ error: `Search text can be at most ${SEARCH_MAX_LENGTH} characters.` });
  }

  try {
    const scope = { requesterRole: role, requesterId };

    // Drill-down from an offence result: the visible cases with that exact offence.
    if (offence) {
      const cases = await searchCasesService({ ...scope, offence, limit: LIMITS.offenceCases });
      return res.status(200).json({ query: q, offence, students: [], cases: cases.map(toCaseResult), offences: [] });
    }

    if (q.length < SEARCH_MIN_LENGTH) {
      return res.status(200).json({ query: q, students: [], cases: [], offences: [] });
    }

    const [students, cases, offences] = await Promise.all([
      isStaff ? searchStudentsService({ term: q, pattern: likeContains(q), limit: LIMITS.students }) : [],
      searchCasesService({ ...scope, q, limit: LIMITS.cases }),
      isStaff ? searchOffencesService({ ...scope, q, limit: LIMITS.offences }) : [],
    ]);

    return res.status(200).json({
      query: q,
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        enrollment_no: s.enrollment_no,
        email: s.email,
        program: s.program,
        hostel: s.hostel,
        case_count: s.case_count,
      })),
      cases: cases.map(toCaseResult),
      offences: offences.map((o) => ({ offense_type: o.offense_type, case_count: o.case_count })),
    });
  } catch (error) {
    console.error('Global search error:', error);
    return res.status(500).json({ error: 'Search failed. Please try again.' });
  }
}
