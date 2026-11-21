// Checks the DAC points rule: users.total_points = sum of penalty_points of the student's
// RESOLVED cases, excluding cases resolved with a warning (kept by the cases_total_points
// trigger, see backend/config/bootstrap.js). Needs the server to have started once.
//
//   node scripts/test-points.js
//
// Safe on a real database: every write runs inside a transaction that is ROLLED BACK.
// Checks that need the current repository version of the trigger/constraint report SKIP (not
// PASS) until the backend has been started with this code.
//
// POINTS_TEST_DISPOSABLE_DB=1 additionally runs a COMMITTING two-connection race test (it creates
// and then deletes its own students and cases). Use it only on a throwaway test database.
import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import pg from 'pg';
import pool from '../backend/config/db.js';
import { RECOMPUTE_STUDENT_POINTS_SQL } from '../backend/config/bootstrap.js';
import { getStudentProfileService, validatePenaltyPoints } from '../backend/services/cases.service.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;
let skipped = 0;
function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `  (${detail})` : ''}`);
  }
}
function skip(name, reason) {
  skipped += 1;
  console.log(`  SKIP  ${name}  (${reason})`);
}
const q = async (db, sql, values) => (await db.query(sql, values)).rows;
const norm = (text) => text.replace(/\s+/g, ' ').trim();
const RULE = "c.status = 'resolved' AND c.resolution_type IS DISTINCT FROM 'warning'";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Repository definitions ──────────────────────────────────────────────────
console.log('Definitions');
const schemaSql = fs.readFileSync(path.join(root, 'database/schema.sql'), 'utf8');
const bootstrapJs = fs.readFileSync(path.join(root, 'backend/config/bootstrap.js'), 'utf8');
const seedSql = fs.readFileSync(path.join(root, 'database/seed.sql'), 'utf8');
const sqlBlock = (text, startMarker, endMarker) => {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start);
  return start === -1 || end === -1 ? null : text.slice(start, end + endMarker.length);
};
for (const [label, startMarker, endMarker] of [
  ['refresh_student_total_points', 'CREATE OR REPLACE FUNCTION refresh_student_total_points', '$$ LANGUAGE plpgsql'],
  ['cases_total_points_trigger', 'CREATE OR REPLACE FUNCTION cases_total_points_trigger', '$$ LANGUAGE plpgsql'],
  ['cases_penalty_points_nonnegative', "WHERE conname = 'cases_penalty_points_nonnegative'", 'END IF;'],
]) {
  const a = sqlBlock(schemaSql, startMarker, endMarker);
  const b = sqlBlock(bootstrapJs, startMarker, endMarker);
  check(`${label}: schema.sql and bootstrap.js are identical`, a && b && norm(a) === norm(b));
}
check('seed.sql recalculates totals with the same statement as bootstrap.js', norm(seedSql).includes(norm(RECOMPUTE_STUDENT_POINTS_SQL)));
check('seed.sql does not insert total_points directly', !/INSERT INTO users \([^)]*total_points/.test(seedSql) && !/total_points=EXCLUDED/.test(seedSql));
const seedDac = fs.readFileSync(path.join(root, 'scripts/seed-dac.js'), 'utf8');
check('seed-dac.js does not write total_points from CSV and recalculates after import', !/room,total_points/.test(seedDac) && seedDac.includes('client.query(RECOMPUTE_STUDENT_POINTS_SQL)'));

// ── API validation ──────────────────────────────────────────────────────────
console.log('\nPenalty points validation');
const invalid = (v) => { try { validatePenaltyPoints(v); return false; } catch (e) { return e.code === 'INVALID_PENALTY_POINTS' && e.status === 400; } };
check('negative points are rejected', invalid(-1) && invalid('-5'));
check('fractions and text are rejected', invalid(2.5) && invalid('abc') && invalid('10pts'));
check('valid values are accepted (empty means 0)', validatePenaltyPoints(0) === 0 && validatePenaltyPoints('25') === 25 && validatePenaltyPoints(null) === 0 && validatePenaltyPoints('') === 0);

// ── Database state ──────────────────────────────────────────────────────────
console.log('\nDatabase');
const [trigger] = await q(pool, "SELECT tgname FROM pg_trigger WHERE tgrelid = 'cases'::regclass AND tgname = 'cases_total_points'");
check('cases_total_points trigger is installed', Boolean(trigger));
const liveFunctions = await q(pool, "SELECT proname, prosrc FROM pg_proc WHERE proname IN ('refresh_student_total_points', 'cases_total_points_trigger')");
const repoBody = (name) => {
  const block = sqlBlock(schemaSql, `CREATE OR REPLACE FUNCTION ${name}`, '$$ LANGUAGE plpgsql');
  return block ? block.slice(block.indexOf('$$') + 2, block.lastIndexOf('$$')) : '';
};
const migrated = liveFunctions.length === 2 && liveFunctions.every((f) => norm(f.prosrc) === norm(repoBody(f.proname)));
const [constraint] = await q(pool, "SELECT conname FROM pg_constraint WHERE conrelid = 'cases'::regclass AND conname = 'cases_penalty_points_nonnegative'");
const NOT_MIGRATED = 'this database still has an older trigger/constraint; start the backend once with this code to apply it';
if (migrated) check('database functions match the repository version', true);
else skip('database functions match the repository version', NOT_MIGRATED);
const [{ n: mismatched }] = await q(pool, `
  SELECT COUNT(*)::int AS n FROM users u
  WHERE u.role = 'student'
    AND u.total_points IS DISTINCT FROM COALESCE((SELECT SUM(c.penalty_points) FROM cases c WHERE c.student_id = u.id AND ${RULE}), 0)`);
check('every student total matches the rule', mismatched === 0, `${mismatched} mismatched`);
const [{ n: negatives }] = await q(pool, 'SELECT COUNT(*)::int AS n FROM cases WHERE penalty_points < 0');
check('no case has negative points', negatives === 0, `${negatives} found`);

// Fixtures: two existing students (read-only until the rolled-back blocks).
const [a, b] = await q(pool, "SELECT id, total_points FROM users WHERE role = 'student' ORDER BY id LIMIT 2");

const db = await pool.connect();
const total = async (id) => (await q(db, 'SELECT total_points FROM users WHERE id = $1', [id]))[0].total_points;
try {
  await db.query('BEGIN');
  const start = await total(a.id);
  console.log('\nCase lifecycle (rolled back)');
  const [c] = await q(db, `
    INSERT INTO cases (student_id, offense_type, severity, penalty_points, status, assigned_to_role)
    VALUES ($1, 'Test offence', 'low', 100, 'pending_chief', 'chief_warden') RETURNING id`, [a.id]);
  check('registering a 100-point case adds nothing', (await total(a.id)) === start);
  await db.query("UPDATE cases SET status = 'pending_admin', assigned_to_role = 'admin', penalty_points = 50 WHERE id = $1", [c.id]);
  check('admin setting points before deciding adds nothing', (await total(a.id)) === start);
  await db.query("UPDATE cases SET status = 'resolved' WHERE id = $1", [c.id]);
  check('resolving the case adds its points (+50)', (await total(a.id)) === start + 50, `${await total(a.id)}`);
  await db.query('UPDATE cases SET penalty_points = 25 WHERE id = $1', [c.id]);
  check('editing points of a resolved case updates the total (+25)', (await total(a.id)) === start + 25);
  await db.query("UPDATE cases SET status = 'pending_admin' WHERE id = $1", [c.id]);
  check('re-opening a resolved case removes its points', (await total(a.id)) === start);
  await db.query("UPDATE cases SET status = 'resolved' WHERE id = $1", [c.id]);

  const [w] = await q(db, `
    INSERT INTO cases (student_id, offense_type, severity, penalty_points, status, assigned_to_role)
    VALUES ($1, 'Test offence', 'low', 100, 'pending_dsw', 'dsw') RETURNING id`, [a.id]);
  await db.query("UPDATE cases SET status = 'resolved', resolution_type = 'warning' WHERE id = $1", [w.id]);
  check('resolving with a warning adds nothing', (await total(a.id)) === start + 25);

  const bStart = await total(b.id);
  await db.query('UPDATE cases SET student_id = $2 WHERE id = $1', [c.id, b.id]);
  check('moving a resolved case to another student moves its points', (await total(a.id)) === start && (await total(b.id)) === bStart + 25);

  await db.query('DELETE FROM cases WHERE id = ANY($1)', [[c.id, w.id]]);
  check('deleting cases recalculates the totals', (await total(a.id)) === start && (await total(b.id)) === bStart);

  if (constraint) {
    await db.query('SAVEPOINT neg');
    let code = null;
    try {
      await db.query("UPDATE cases SET penalty_points = -5 WHERE id = (SELECT id FROM cases LIMIT 1)");
    } catch (e) {
      code = e.code;
    }
    await db.query('ROLLBACK TO SAVEPOINT neg');
    check('the database rejects negative points (CHECK constraint)', code === '23514', String(code));
  } else {
    skip('the database rejects negative points (CHECK constraint)', NOT_MIGRATED);
  }
} finally {
  await db.query('ROLLBACK');
  db.release();
}
check('nothing kept after rollback', (await q(pool, 'SELECT total_points FROM users WHERE id = $1', [a.id]))[0].total_points === a.total_points);

// ── Concurrency, rolled back: a second transaction waits for the first ──────────
console.log('\nConcurrency (two connections, rolled back)');
{
  const c1 = await pool.connect();
  const c2 = await pool.connect();
  try {
    await c1.query('BEGIN');
    await c2.query('BEGIN');
    const start = (await q(c1, 'SELECT total_points FROM users WHERE id = $1', [a.id]))[0].total_points;
    const [x] = await q(c1, "INSERT INTO cases (student_id, offense_type, severity, penalty_points, status) VALUES ($1, 'Race', 'low', 10, 'pending_admin') RETURNING id", [a.id]);
    await c1.query("UPDATE cases SET status = 'resolved' WHERE id = $1", [x.id]);
    // Connection 2 registers and resolves its own case for the same student. It must wait for
    // connection 1 (the student row is locked), at whichever of the two steps it first needs it.
    let second = false;
    const pending = (async () => {
      const [y] = await q(c2, "INSERT INTO cases (student_id, offense_type, severity, penalty_points, status) VALUES ($1, 'Race', 'low', 25, 'pending_admin') RETURNING id", [a.id]);
      await c2.query("UPDATE cases SET status = 'resolved' WHERE id = $1", [y.id]);
      second = true;
    })();
    await sleep(1200);
    check('a second resolution for the same student waits for the first transaction', !second);
    await c1.query('ROLLBACK');
    await pending;
    const after = (await q(c2, 'SELECT total_points FROM users WHERE id = $1', [a.id]))[0].total_points;
    check('after the first rolls back, the second counts only its own case (+25)', after === start + 25, `${start} -> ${after}`);
  } finally {
    await c1.query('ROLLBACK').catch(() => {});
    await c2.query('ROLLBACK').catch(() => {});
    c1.release();
    c2.release();
  }
}

// ── Concurrency, committing: only on a disposable database ──────────────────────
console.log('\nConcurrency (two connections, committed; disposable database only)');
if (process.env.POINTS_TEST_DISPOSABLE_DB !== '1') {
  skip('simultaneous resolutions both count', 'set POINTS_TEST_DISPOSABLE_DB=1 on a throwaway database to run');
  skip('opposite case moves do not deadlock', 'set POINTS_TEST_DISPOSABLE_DB=1 on a throwaway database to run');
} else {
  // Separate connections outside the pool, with the same settings as the app's pool.
  const client = () => new pg.Client(pool.options);
  const stamp = `${Date.now()}`;
  const created = { users: [], cases: [] };
  const mkStudent = async (label) => {
    const [row] = await q(pool, "INSERT INTO users (name, email, role, enrollment_no) VALUES ($1, $2, 'student', $3) RETURNING id", [`Points ${label}`, `points-${label}-${stamp}@test.invalid`, `PT${label}${stamp}`]);
    created.users.push(row.id);
    return row.id;
  };
  const mkCase = async (sid, pts, status) => {
    const [row] = await q(pool, "INSERT INTO cases (student_id, offense_type, severity, penalty_points, status) VALUES ($1, 'Points test', 'low', $2, $3) RETURNING id", [sid, pts, status]);
    created.cases.push(row.id);
    return row.id;
  };
  try {
    let lost = 0;
    const rounds = 10;
    for (let i = 0; i < rounds; i += 1) {
      const sid = await mkStudent(`r${i}`);
      const x = await mkCase(sid, 10, 'pending_admin');
      const y = await mkCase(sid, 25, 'pending_admin');
      const c1 = client();
      const c2 = client();
      await c1.connect();
      await c2.connect();
      try {
        await c1.query('BEGIN');
        await c2.query('BEGIN');
        await c1.query("UPDATE cases SET status = 'resolved' WHERE id = $1", [x]);
        const second = c2.query("UPDATE cases SET status = 'resolved' WHERE id = $1", [y]);
        await sleep(150);
        await c1.query('COMMIT');
        await second;
        await c2.query('COMMIT');
      } finally {
        await c1.end();
        await c2.end();
      }
      if ((await q(pool, 'SELECT total_points FROM users WHERE id = $1', [sid]))[0].total_points !== 35) lost += 1;
    }
    check(`simultaneous resolutions both count (${rounds} rounds, 10 + 25 = 35 each)`, lost === 0, `${lost} stale totals`);

    const s1 = await mkStudent('m1');
    const s2 = await mkStudent('m2');
    const k1 = await mkCase(s1, 40, 'resolved');
    const k2 = await mkCase(s2, 7, 'resolved');
    const c1 = client();
    const c2 = client();
    await c1.connect();
    await c2.connect();
    let deadlock = false;
    try {
      await c1.query('BEGIN');
      await c2.query('BEGIN');
      // Each transaction commits right after its own move; one of them may wait for the other.
      await Promise.all([
        c1.query('UPDATE cases SET student_id = $2 WHERE id = $1', [k1, s2]).then(() => c1.query('COMMIT')),
        c2.query('UPDATE cases SET student_id = $2 WHERE id = $1', [k2, s1]).then(() => c2.query('COMMIT')),
      ]);
    } catch (e) {
      deadlock = /deadlock/i.test(e.message);
      if (!deadlock) throw e;
    } finally {
      await c1.end();
      await c2.end();
    }
    const t1 = (await q(pool, 'SELECT total_points FROM users WHERE id = $1', [s1]))[0].total_points;
    const t2 = (await q(pool, 'SELECT total_points FROM users WHERE id = $1', [s2]))[0].total_points;
    check('opposite case moves do not deadlock and both totals are correct', !deadlock && t1 === 7 && t2 === 40, `deadlock=${deadlock} s1=${t1} s2=${t2}`);
  } finally {
    // Remove only the rows this block created (disposable database).
    if (created.cases.length) await pool.query('DELETE FROM cases WHERE id = ANY($1)', [created.cases]);
    if (created.users.length) await pool.query('DELETE FROM users WHERE id = ANY($1)', [created.users]);
  }
}

console.log('\nStudent profile summary');
const [withPending] = await q(pool, `
  SELECT u.enrollment_no FROM users u JOIN cases c ON c.student_id = u.id
  WHERE u.role = 'student' AND u.enrollment_no IS NOT NULL AND c.status <> 'resolved' AND c.penalty_points > 0
  LIMIT 1`);
if (withPending) {
  const profile = await getStudentProfileService(withPending.enrollment_no);
  const [stored] = await q(pool, 'SELECT total_points FROM users WHERE enrollment_no = $1', [withPending.enrollment_no]);
  check('profile total equals the stored total', profile.summary.total_points === stored.total_points, `${profile.summary.total_points} vs ${stored.total_points}`);
  const resolvedSum = profile.cases.filter((x) => x.status === 'resolved' && x.resolution_type !== 'warning').reduce((s, x) => s + Number(x.penalty_points || 0), 0);
  check('profile total excludes unresolved cases (their points are not reported)', profile.summary.total_points === resolvedSum && !('pending_points' in profile.summary));
} else {
  skip('profile summary checks', 'no student with a pending case that carries points');
}

await pool.end();
console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed ? 1 : 0);
