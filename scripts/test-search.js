// Integration checks for the global header search (GET /api/search). Read-only: it only
// runs SELECTs, using existing students and cases as fixtures.
//
//   node scripts/test-search.js
import process from 'process';
import express from 'express';
import pool from '../backend/config/db.js';
import { verifyToken } from '../backend/middleware/auth.middleware.js';
import searchRoutes from '../backend/routes/search.routes.js';
import { likeContains, searchCasesService, searchOffencesService } from '../backend/services/cases.service.js';
import { searchStudentsService } from '../backend/services/users.service.js';

let passed = 0;
let failed = 0;
function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `  (${detail})` : ''}`);
  }
}
const rows = async (sql, values) => (await pool.query(sql, values)).rows;

// ── Fixtures (read-only) ─────────────────────────────────────────────────────
const [student] = await rows(`
  SELECT u.id, u.name, u.enrollment_no, u.email
  FROM users u
  WHERE u.role = 'student' AND u.enrollment_no IS NOT NULL AND u.email IS NOT NULL
    AND EXISTS (SELECT 1 FROM cases c WHERE c.student_id = u.id AND c.external_case_id IS NOT NULL)
  ORDER BY u.id LIMIT 1`);
const [ownCase] = await rows('SELECT id, external_case_id, offense_type FROM cases WHERE student_id = $1 AND external_case_id IS NOT NULL ORDER BY id LIMIT 1', [student.id]);
const [otherCase] = await rows('SELECT id, external_case_id FROM cases WHERE student_id <> $1 AND external_case_id IS NOT NULL ORDER BY id LIMIT 1', [student.id]);
const [chiefCase] = await rows("SELECT id, external_case_id FROM cases WHERE status = 'pending_chief' AND external_case_id IS NOT NULL ORDER BY id LIMIT 1");
const [offenceRow] = await rows('SELECT offense_type FROM cases WHERE offense_type IS NOT NULL GROUP BY offense_type ORDER BY COUNT(*) DESC LIMIT 1');
const [admin] = await rows("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
const ADMIN = { requesterRole: 'admin', requesterId: admin?.id ?? 0 };
const DSW = { requesterRole: 'dsw', requesterId: 0 };
const STUDENT = { requesterRole: 'student', requesterId: student.id };
const offence = offenceRow.offense_type;
console.log(`Fixtures: student ${student.id} (${student.enrollment_no}); own case ${ownCase.external_case_id}; other case ${otherCase.external_case_id}; pending_chief case ${chiefCase?.external_case_id}; offence "${offence}"\n`);

console.log('Cases');
const byId = await searchCasesService({ ...ADMIN, q: ownCase.external_case_id });
check('exact case ID is the first result', byId[0]?.id === ownCase.id, byId[0]?.external_case_id);
const partialId = ownCase.external_case_id.slice(0, -2);
const byPartial = await searchCasesService({ ...ADMIN, q: partialId.toLowerCase() });
check('partial, lower-case case ID matches (case-insensitive)', byPartial.length > 0 && byPartial.every((c) => c.external_case_id.toUpperCase().includes(partialId.toUpperCase()) || c.student_name.toUpperCase().includes(partialId.toUpperCase()) || String(c.offense_type).toUpperCase().includes(partialId.toUpperCase()) || String(c.enrollment_no).includes(partialId)));
const byStudentName = await searchCasesService({ ...ADMIN, q: student.name });
check("student name finds that student's cases", byStudentName.some((c) => c.student_id === student.id));
check('case results are limited (default 6)', (await searchCasesService({ ...ADMIN, q: 'DAC' })).length <= 6);
const wildcard = await searchCasesService({ ...ADMIN, q: '%' });
check('"%" is matched literally, not as a wildcard', wildcard.length === 0, `${wildcard.length} rows`);
const underscore = await searchCasesService({ ...ADMIN, q: '_' });
check('"_" is matched literally, not as a wildcard', underscore.length === 0, `${underscore.length} rows`);

console.log('\nOffences');
const offences = await searchOffencesService({ ...ADMIN, q: offence.slice(0, 5) });
check('partial offence name returns the offence with a case count', offences.some((o) => o.offense_type.toLowerCase() === offence.toLowerCase() && o.case_count > 0));
const drill = await searchCasesService({ ...ADMIN, offence: offence.toUpperCase(), limit: 8 });
check('offence drill-down returns only cases with that offence', drill.length > 0 && drill.every((c) => c.offense_type.toLowerCase() === offence.toLowerCase()));

console.log('\nStudents');
const byName = await searchStudentsService({ term: student.name, pattern: likeContains(student.name) });
check('student found by full name', byName.some((s) => s.id === student.id));
const byEnrollment = await searchStudentsService({ term: student.enrollment_no, pattern: likeContains(student.enrollment_no) });
check('exact enrollment number is the first student result', byEnrollment[0]?.id === student.id);
const byEmail = await searchStudentsService({ term: student.email.toUpperCase(), pattern: likeContains(student.email.toUpperCase()) });
check('student found by email (case-insensitive)', byEmail.some((s) => s.id === student.id));
check('student results include a case count', Number.isInteger(byName.find((s) => s.id === student.id)?.case_count));
const staffOnly = await searchStudentsService({ term: 'a', pattern: likeContains('a'), limit: 50 });
const [{ n: nonStudents }] = await rows("SELECT COUNT(*)::int AS n FROM users WHERE id = ANY($1) AND role <> 'student'", [staffOnly.map((s) => s.id)]);
check('only student accounts are returned (no staff/admin users)', nonStudents === 0);

console.log('\nRole scoping');
const ownSearch = await searchCasesService({ ...STUDENT, q: ownCase.external_case_id });
check('student finds their own case', ownSearch.some((c) => c.id === ownCase.id));
const otherSearch = await searchCasesService({ ...STUDENT, q: otherCase.external_case_id });
check("student cannot find another student's case", !otherSearch.some((c) => c.id === otherCase.id), `${otherSearch.length} rows`);
const studentBroad = await searchCasesService({ ...STUDENT, q: 'DAC', limit: 50 });
check('every case a student can find is their own', studentBroad.every((c) => c.student_id === student.id));
if (chiefCase) {
  const dswSearch = await searchCasesService({ ...DSW, q: chiefCase.external_case_id });
  check('DSW cannot find cases still with the Chief Warden (same scope as their case list)', !dswSearch.some((c) => c.id === chiefCase.id));
}

console.log('\nHTTP endpoint');
{
  const app = express();
  app.use('/secured/api/search', verifyToken, searchRoutes);
  app.use('/api/search', (req, res, next) => { req.user = JSON.parse(req.get('x-test-user') || '{}'); next(); }, searchRoutes);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = async (path, user) => {
    const response = await fetch(base + path, { headers: user ? { 'x-test-user': JSON.stringify(user) } : {} });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  const adminUser = { sub: ADMIN.requesterId, role: 'admin' };
  const studentUser = { sub: student.id, role: 'student' };
  try {
    check('unauthenticated request is rejected (401)', (await get('/secured/api/search?q=DAC')).status === 401);
    const full = await get(`/api/search?q=${encodeURIComponent(student.name)}`, adminUser);
    check('staff get grouped students, cases and offences', full.status === 200 && Array.isArray(full.body.students) && Array.isArray(full.body.cases) && Array.isArray(full.body.offences) && full.body.students.some((s) => s.id === student.id));
    const asStudent = await get(`/api/search?q=${encodeURIComponent(student.name)}`, studentUser);
    check('students never receive student records or offences', asStudent.status === 200 && asStudent.body.students.length === 0 && asStudent.body.offences.length === 0);
    const crossStudent = await get(`/api/search?q=${encodeURIComponent(otherCase.external_case_id)}`, studentUser);
    check("student request for another student's case ID returns nothing", crossStudent.body.cases.every((c) => c.id !== otherCase.id));
    const short = await get('/api/search?q=a', adminUser);
    check('one-character query returns empty groups without searching', short.status === 200 && short.body.cases.length === 0 && short.body.students.length === 0);
    const empty = await get('/api/search', adminUser);
    check('empty query returns empty groups', empty.status === 200 && empty.body.cases.length === 0);
    check('over-long query is rejected (400)', (await get(`/api/search?q=${'x'.repeat(101)}`, adminUser)).status === 400);
    const drillHttp = await get(`/api/search?offence=${encodeURIComponent(offence)}`, adminUser);
    check('offence drill-down over HTTP returns cases for that offence', drillHttp.status === 200 && drillHttp.body.cases.length > 0 && drillHttp.body.cases.every((c) => c.offense_type.toLowerCase() === offence.toLowerCase()));
    check('unknown role is rejected (403)', (await get('/api/search?q=DAC', { sub: 1, role: 'guest' })).status === 403);
    const t = Date.now();
    await get(`/api/search?q=${encodeURIComponent(student.name.split(' ')[0])}`, adminUser);
    const ms = Date.now() - t;
    console.log(`  info  full search round trip: ${ms} ms`);
  } finally {
    server.close();
  }
}

await pool.end();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
