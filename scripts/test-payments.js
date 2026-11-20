// Integration checks for the DEMO payment system (needs a database with the schema applied).
//
//   node scripts/test-payments.js [receipt-output-dir]
//
// With receipt-output-dir, a sample PDF receipt is written there (it contains the fixture
// student's real name and email, so only pass a private folder).
//
// Safe on a real database: every write runs inside a transaction that is ROLLED BACK, so no
// payment, timeline entry or notification is kept. Existing students and cases are only read
// to pick fixtures; nothing is created for them permanently.
import fs from 'fs';
import path from 'path';
import process from 'process';
import express from 'express';
import pool from '../backend/config/db.js';
import { verifyToken } from '../backend/middleware/auth.middleware.js';
import paymentsRoutes from '../backend/routes/payments.routes.js';
import {
  createConsolidatedPaymentService,
  createDemoPaymentService,
  getCasePaymentStateService,
  getStudentFineSummaryService,
  getReceiptDataService,
  listStudentPaymentsService,
} from '../backend/services/payments.service.js';
import { renderReceiptPdf } from '../backend/services/receipt.service.js';

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
async function expectError(name, fn, { status, code }) {
  try {
    await fn();
    check(name, false, 'no error thrown');
  } catch (error) {
    const ok = (!status || error.status === status) && (!code || error.code === code);
    check(name, ok, `got ${error.status} ${error.code || ''} ${error.message}`);
  }
}
const key = () => `test-${crypto.randomUUID()}`;
const q = async (db, sql, values) => (await db.query(sql, values)).rows;

// ── Fixtures (read-only) ──────────────────────────────────────────────────────
const PAYABLE = "c.status = 'resolved' AND c.fine > 0 AND COALESCE(c.resolution_type, '') <> 'warning'";
const UNPAID = 'NOT EXISTS (SELECT 1 FROM case_payments p WHERE p.case_id = c.id AND p.payment_status = \'SUCCESS\')';
const [fixture] = await q(pool, `
  SELECT c.student_id
  FROM cases c
  GROUP BY c.student_id
  HAVING COUNT(*) FILTER (WHERE ${PAYABLE} AND ${UNPAID}) >= 2 AND bool_or(c.status <> 'resolved')
  LIMIT 1`);
if (!fixture) {
  console.log('No student with two unpaid resolved cases and one open case was found; cannot run.');
  process.exit(1);
}
const S = { id: fixture.student_id, role: 'student' };
const [r1, r2] = await q(pool, `SELECT c.id, c.fine FROM cases c WHERE c.student_id = $1 AND ${PAYABLE} AND ${UNPAID} ORDER BY c.id LIMIT 2`, [S.id]);
const [open] = await q(pool, "SELECT c.id, c.status FROM cases c WHERE c.student_id = $1 AND c.status <> 'resolved' LIMIT 1", [S.id]);
const [warned] = await q(pool, "SELECT c.id, c.student_id FROM cases c WHERE c.resolution_type = 'warning' LIMIT 1");
const [other] = await q(pool, "SELECT id FROM users WHERE role = 'student' AND id <> $1 LIMIT 1", [S.id]);
const [admin] = await q(pool, "SELECT id FROM users WHERE role = 'admin' LIMIT 1");
const S2 = { id: other.id, role: 'student' };
const ADMIN = { id: admin?.id ?? 0, role: 'admin' };
console.log(`Fixtures: student ${S.id}; resolved cases ${r1.id}, ${r2.id}; open case ${open.id} (${open.status}); other student ${S2.id}${warned ? `; warning case ${warned.id}` : ''}\n`);

const outDir = process.argv[2] || null;
let receiptPath = null;

// ── Service checks, all inside one rolled-back transaction ────────────────────
const db = await pool.connect();
try {
  await db.query('BEGIN');
  console.log('Eligibility and ownership');
  const s1 = await getCasePaymentStateService(r1.id, S, { client: db });
  check('resolved case with a fine is payable', s1.eligible && s1.amount === Number(r1.fine) && !s1.payment);
  const sOpen = await getCasePaymentStateService(open.id, S, { client: db });
  check('open (unresolved) case is not payable', !sOpen.eligible && sOpen.reason === 'NOT_RESOLVED');
  await expectError("another student's case is hidden", () => getCasePaymentStateService(r1.id, S2, { client: db }), { status: 404 });
  const sAdmin = await getCasePaymentStateService(r1.id, ADMIN, { client: db });
  check('staff can read payment status', sAdmin.case_id === r1.id);
  if (warned) {
    const sWarn = await getCasePaymentStateService(warned.id, { id: warned.student_id, role: 'student' }, { client: db });
    check('case resolved with a warning has no fine to pay', !sWarn.eligible && sWarn.reason === 'NO_FINE');
  }

  console.log('\nPayment creation');
  await expectError('staff cannot pay', () => createDemoPaymentService(r1.id, ADMIN, { idempotencyKey: key() }, { client: db }), { status: 403 });
  await expectError("cannot pay another student's case", () => createDemoPaymentService(r1.id, S2, { idempotencyKey: key() }, { client: db }), { status: 404 });
  await expectError('cannot pay an unresolved case (direct API call)', () => createDemoPaymentService(open.id, S, { idempotencyKey: key() }, { client: db }), { status: 409, code: 'NOT_RESOLVED' });
  if (warned) {
    await expectError('cannot pay a warning-only case', () => createDemoPaymentService(warned.id, { id: warned.student_id, role: 'student' }, { idempotencyKey: key() }, { client: db }), { status: 409, code: 'NO_FINE' });
  }
  await expectError('malformed idempotency key is rejected', () => createDemoPaymentService(r1.id, S, { idempotencyKey: 'x' }, { client: db }), { status: 400 });

  const k1 = key();
  const first = await createDemoPaymentService(r1.id, S, { idempotencyKey: k1 }, { client: db });
  const p = first.payment;
  check('payment is created as a SUCCESS DEMO transaction', !first.replayed && p.payment_status === 'SUCCESS' && p.payment_type === 'DEMO');
  check('transaction id has the TXN-YYYYMMDD-XXXXXXXX format', /^TXN-\d{8}-[0-9A-F]{8}$/.test(p.transaction_id), p.transaction_id);
  check('amount equals the case fine, in INR', p.amount === Number(r1.fine) && p.currency === 'INR');

  const after = await getCasePaymentStateService(r1.id, S, { client: db });
  check('state shows the case as paid with the recorded payment', !after.eligible && after.reason === 'ALREADY_PAID' && after.payment?.transaction_id === p.transaction_id);
  const otherCase = await getCasePaymentStateService(r2.id, S, { client: db });
  check("the student's other resolved case is still payable (independent per case)", otherCase.eligible);

  await expectError('a second payment for the same case is rejected', () => createDemoPaymentService(r1.id, S, { idempotencyKey: key() }, { client: db }), { status: 409, code: 'ALREADY_PAID' });
  const replay = await createDemoPaymentService(r1.id, S, { idempotencyKey: k1 }, { client: db });
  check('retrying the same checkout returns the same transaction', replay.replayed && replay.payment.transaction_id === p.transaction_id);
  await expectError('reusing a checkout key for a different case is rejected', () => createDemoPaymentService(r2.id, S, { idempotencyKey: k1 }, { client: db }), { status: 409, code: 'IDEMPOTENCY_KEY_REUSED' });

  const [{ n: paymentsForCase }] = await q(db, "SELECT COUNT(*)::int AS n FROM case_payments WHERE case_id = $1 AND payment_status = 'SUCCESS'", [r1.id]);
  check('exactly one successful payment exists for the case', paymentsForCase === 1, `found ${paymentsForCase}`);
  const [{ n: timelineRows }] = await q(db, 'SELECT COUNT(*)::int AS n FROM case_timeline WHERE case_id = $1 AND event LIKE $2', [r1.id, `%${p.transaction_id}%`]);
  check('a timeline entry was written in the same transaction', timelineRows === 1);

  console.log('\nHistory and receipts');
  const history = await listStudentPaymentsService(S.id, { client: db });
  check("payment appears in the student's history", history.some((h) => h.transaction_id === p.transaction_id));
  const history2 = await listStudentPaymentsService(S2.id, { client: db });
  check("payment does not appear in another student's history", !history2.some((h) => h.transaction_id === p.transaction_id));
  const receiptData = await getReceiptDataService(p.transaction_id, S, { client: db });
  check('owner can load receipt data from persisted rows', receiptData.transaction_id === p.transaction_id && Number(receiptData.amount) === p.amount);
  await expectError("another student cannot load the receipt", () => getReceiptDataService(p.transaction_id, S2, { client: db }), { status: 404 });
  check('staff can load the receipt', (await getReceiptDataService(p.transaction_id, ADMIN, { client: db })).transaction_id === p.transaction_id);
  await expectError('unknown transaction id is not found', () => getReceiptDataService('TXN-20000101-00000000', S, { client: db }), { status: 404 });
  await expectError('legacy DEMO- ids are still looked up (unknown id → not found)', () => getReceiptDataService('DEMO-20000101-00000000', S, { client: db }), { status: 404, code: 'NOT_FOUND' });
  check('receipt lookup accepts the stored transaction id', (await getReceiptDataService(p.transaction_id.toLowerCase(), S, { client: db })).transaction_id === p.transaction_id);
  const pdf = await renderReceiptPdf(receiptData);
  check('PDF receipt is a complete PDF document', pdf.subarray(0, 5).toString() === '%PDF-' && pdf.subarray(-6).toString().includes('%%EOF'), `${pdf.length} bytes`);
  check('rupee sign in stored text is written as "Rs." in the PDF', (await import('../backend/services/receipt.service.js')).pdfSafe('₹2500 fine') === 'Rs. 2500 fine');
  if (outDir) {
    receiptPath = path.join(outDir, `test-receipt-${p.transaction_id}.pdf`);
    fs.writeFileSync(receiptPath, pdf);
  }

  console.log('\nRe-opened case');
  await db.query("UPDATE cases SET status = 'pending_admin' WHERE id = $1", [r1.id]);
  const reopened = await getCasePaymentStateService(r1.id, S, { client: db });
  check('a paid case that is re-opened keeps its payment record', reopened.payment?.transaction_id === p.transaction_id);
  await db.query("UPDATE cases SET status = 'pending_admin' WHERE id = $1", [r2.id]);
  await expectError('an unpaid re-opened case cannot be paid', () => createDemoPaymentService(r2.id, S, { idempotencyKey: key() }, { client: db }), { status: 409, code: 'NOT_RESOLVED' });

  console.log('\nDatabase constraints (defence in depth)');
  const constraintError = async (name, sql, values, expectedCode) => {
    await db.query('SAVEPOINT c');
    try {
      await db.query(sql, values);
      check(name, false, 'statement succeeded');
    } catch (error) {
      check(name, error.code === expectedCode, `${error.code} ${error.message}`);
    }
    await db.query('ROLLBACK TO SAVEPOINT c');
  };
  await constraintError('unique index blocks a second SUCCESS row even without the service',
    "INSERT INTO case_payments (student_id, case_id, transaction_id, amount, payment_status, payment_date) VALUES ($1, $2, 'DEMO-20000101-AAAAAAAA', 1, 'SUCCESS', NOW())", [S.id, r1.id], '23505');
  await constraintError('amount must be above zero',
    "INSERT INTO case_payments (student_id, case_id, transaction_id, amount) VALUES ($1, $2, 'DEMO-20000101-BBBBBBBB', 0)", [S.id, r2.id], '23514');
  await constraintError('only DEMO payment type is allowed',
    "INSERT INTO case_payments (student_id, case_id, transaction_id, amount, payment_type) VALUES ($1, $2, 'DEMO-20000101-CCCCCCCC', 1, 'CARD')", [S.id, r2.id], '23514');
  await constraintError('a paid case cannot be deleted (payment history kept)', 'DELETE FROM cases WHERE id = $1', [r1.id], '23503');
} finally {
  await db.query('ROLLBACK');
  db.release();
}

// ── Consolidated ("pay all") payments, in a second rolled-back transaction ──────
{
  const db2 = await pool.connect();
  const lineCount = async () => (await q(db2, 'SELECT COUNT(*)::int AS n FROM case_payments'))[0].n;
  try {
    await db2.query('BEGIN');
    console.log('\nFine summary');
    const before = await getStudentFineSummaryService(S.id, { client: db2 });
    const item = (id) => before.items.find((i) => i.case_id === id);
    check('summary lists every case of the student', before.items.length === (await q(db2, 'SELECT COUNT(*)::int AS n FROM cases WHERE student_id = $1', [S.id]))[0].n);
    check('resolved unpaid cases are payable with their fine outstanding', item(r1.id)?.state === 'payable' && item(r1.id).outstanding === Number(r1.fine));
    check('unresolved case is awaiting resolution and not outstanding', item(open.id)?.state === 'awaiting_resolution' && item(open.id).outstanding === 0);
    const expectedOutstanding = before.items.filter((i) => i.state === 'payable').reduce((sum, i) => sum + i.fine, 0);
    check('total outstanding = sum of payable fines only', before.total_outstanding === Math.round(expectedOutstanding * 100) / 100 && before.outstanding_count === before.items.filter((i) => i.payable).length);
    const otherSummary = await getStudentFineSummaryService(S2.id, { client: db2 });
    check("another student's summary never includes this student's cases", !otherSummary.items.some((i) => i.case_id === r1.id));

    console.log('\nConsolidated payment');
    const total2 = Number(r1.fine) + Number(r2.fine);
    await expectError('staff cannot make a consolidated payment', () => createConsolidatedPaymentService(ADMIN, { caseIds: [r1.id] }, { client: db2 }), { status: 403 });
    await expectError('an empty selection is rejected', () => createConsolidatedPaymentService(S, { caseIds: [] }, { client: db2 }), { status: 400 });
    const linesBefore = await lineCount();
    await expectError('including an unresolved case rejects the whole payment', () => createConsolidatedPaymentService(S, { caseIds: [r1.id, open.id], idempotencyKey: key() }, { client: db2 }), { status: 409, code: 'CASES_NOT_PAYABLE' });
    await expectError("including another student's case is rejected", () => createConsolidatedPaymentService(S2, { caseIds: [r1.id], idempotencyKey: key() }, { client: db2 }), { status: 404 });
    await expectError('a total that differs from the server total is rejected', () => createConsolidatedPaymentService(S, { caseIds: [r1.id, r2.id], expectedTotal: total2 - 1, idempotencyKey: key() }, { client: db2 }), { status: 409, code: 'AMOUNT_CHANGED' });
    check('rejected payments record nothing (all or nothing)', (await lineCount()) === linesBefore);

    const bk = key();
    const batch = await createConsolidatedPaymentService(S, { caseIds: [r2.id, r1.id, r1.id], expectedTotal: total2, idempotencyKey: bk }, { client: db2 });
    const bp = batch.payment;
    check('one consolidated transaction covers both cases (duplicates ignored)', !batch.replayed && bp.case_count === 2 && bp.cases.length === 2);
    check('consolidated amount is the server-computed total', bp.amount === total2);
    check('consolidated transaction id has the TXN- format', /^TXN-\d{8}-[0-9A-F]{8}$/.test(bp.transaction_id), bp.transaction_id);
    check('one payment line per case was written', (await lineCount()) === linesBefore + 2);
    const after = await getStudentFineSummaryService(S.id, { client: db2 });
    check('outstanding drops by exactly the paid amount (no double counting)', Math.abs(after.total_outstanding - (before.total_outstanding - total2)) < 0.001 && after.paid_count === before.paid_count + 2);
    check('paid cases show the consolidated transaction id', after.items.find((i) => i.case_id === r1.id)?.payment?.transaction_id === bp.transaction_id);
    const caseState = await getCasePaymentStateService(r1.id, S, { client: db2 });
    check('case page state reports the consolidated payment and links its receipt', caseState.payment?.transaction_id === bp.transaction_id && caseState.payment.consolidated && caseState.payment.amount === Number(r1.fine));
    const replay = await createConsolidatedPaymentService(S, { caseIds: [r1.id, r2.id], expectedTotal: total2, idempotencyKey: bk }, { client: db2 });
    check('retrying the same checkout returns the same transaction', replay.replayed && replay.payment.transaction_id === bp.transaction_id);
    await expectError('paying the same cases again is rejected', () => createConsolidatedPaymentService(S, { caseIds: [r1.id], idempotencyKey: key() }, { client: db2 }), { status: 409, code: 'CASES_NOT_PAYABLE' });
    await expectError('single-case payment of a case paid in a batch is rejected', () => createDemoPaymentService(r1.id, S, { idempotencyKey: key() }, { client: db2 }), { status: 409, code: 'ALREADY_PAID' });
    const [{ n: timelineRows }] = await q(db2, 'SELECT COUNT(*)::int AS n FROM case_timeline WHERE case_id = ANY($1) AND event LIKE $2', [[r1.id, r2.id], `%${bp.transaction_id}%`]);
    check('a timeline entry was written for each case', timelineRows === 2);

    console.log('\nConsolidated history and receipt');
    const hist = await listStudentPaymentsService(S.id, { client: db2 });
    const entry = hist.find((h) => h.transaction_id === bp.transaction_id);
    check('history shows the consolidated payment once, with both cases', hist.filter((h) => h.transaction_id === bp.transaction_id).length === 1 && entry.cases.length === 2 && entry.amount === total2);
    const rData = await getReceiptDataService(bp.transaction_id, S, { client: db2 });
    check('consolidated receipt data has case-wise items', rData.consolidated && rData.items.length === 2 && Number(rData.amount) === total2);
    await expectError('another student cannot load the consolidated receipt', () => getReceiptDataService(bp.transaction_id, S2, { client: db2 }), { status: 404 });
    await expectError('internal line ids are not receipt ids', () => getReceiptDataService(`${bp.transaction_id}-1`, S, { client: db2 }), { status: 404 });
    const rPdf = await renderReceiptPdf(rData);
    check('consolidated PDF receipt is a complete PDF', rPdf.subarray(0, 5).toString() === '%PDF-' && rPdf.subarray(-6).toString().includes('%%EOF'));
    if (outDir) fs.writeFileSync(path.join(outDir, `test-receipt-consolidated-${bp.transaction_id}.pdf`), rPdf);
    const manyItems = Array.from({ length: 30 }, (_, i) => ({ ...rData.items[i % 2], external_case_id: `DAC-TEST-${i + 1}` }));
    const longPdf = await renderReceiptPdf({ ...rData, items: manyItems });
    const pages = (longPdf.toString('latin1').match(/\/Type \/Page[^s]/g) || []).length;
    check('a long case list breaks onto further pages', pages >= 2, `${pages} page(s)`);

    console.log('\nRe-opened case in a consolidated payment');
    const [r3] = await q(db2, `SELECT c.id FROM cases c WHERE c.student_id = $1 AND ${PAYABLE} AND ${UNPAID} AND c.id NOT IN ($2, $3) LIMIT 1`, [S.id, r1.id, r2.id]);
    const reopenTarget = r3 || r2;
    if (!r3) await db2.query("DELETE FROM case_payments WHERE case_id = $1 AND payment_transaction_id IS NOT NULL", [r2.id]);
    await db2.query("UPDATE cases SET status = 'pending_admin' WHERE id = $1", [reopenTarget.id]);
    await expectError('a re-opened case cannot be paid in a batch', () => createConsolidatedPaymentService(S, { caseIds: [reopenTarget.id], idempotencyKey: key() }, { client: db2 }), { status: 409, code: 'CASES_NOT_PAYABLE' });
  } finally {
    await db2.query('ROLLBACK');
    db2.release();
  }
}

// ── Concurrency: two checkouts for the same case are serialised by the row lock ──
console.log('\nConcurrency');
{
  const a = await pool.connect();
  const b = await pool.connect();
  try {
    await a.query('BEGIN');
    await b.query('BEGIN');
    await createDemoPaymentService(r1.id, S, { idempotencyKey: key() }, { client: a });
    let bFinished = false;
    const bPromise = createDemoPaymentService(r1.id, S, { idempotencyKey: key() }, { client: b })
      .then((r) => { bFinished = true; return r; }, (e) => { bFinished = true; throw e; });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    check('a second concurrent checkout waits while the first holds the case lock', !bFinished);
    await a.query('ROLLBACK'); // the first checkout fails, so the second may proceed
    const bResult = await bPromise;
    check('after the first checkout is rolled back, the waiting one completes once', bResult.payment.payment_status === 'SUCCESS');
  } finally {
    await a.query('ROLLBACK').catch(() => {});
    await b.query('ROLLBACK').catch(() => {});
    a.release();
    b.release();
  }
}

// ── Concurrency: two batches over the same cases in opposite order (no deadlock) ──
console.log('\nConcurrency (consolidated)');
{
  const a = await pool.connect();
  const b = await pool.connect();
  try {
    await a.query('BEGIN');
    await b.query('BEGIN');
    await createConsolidatedPaymentService(S, { caseIds: [r1.id, r2.id], idempotencyKey: key() }, { client: a });
    let bDone = false;
    const bRun = createConsolidatedPaymentService(S, { caseIds: [r2.id, r1.id], idempotencyKey: key() }, { client: b })
      .then((r) => { bDone = true; return r; }, (e) => { bDone = true; throw e; });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    check('a concurrent batch for the same cases waits for the first', !bDone);
    await a.query('ROLLBACK');
    const bRes = await bRun;
    check('after the first batch rolls back, the waiting batch completes (no deadlock)', bRes.payment.case_count === 2);
  } finally {
    await a.query('ROLLBACK').catch(() => {});
    await b.query('ROLLBACK').catch(() => {});
    a.release();
    b.release();
  }
}

// ── HTTP layer: authentication, role guards and ownership through the real routes ──
console.log('\nHTTP endpoints (no writes)');
{
  const app = express();
  app.use(express.json());
  app.use('/secured/api/payments', verifyToken, paymentsRoutes);
  // Test-only identity injection to exercise role guards without minting tokens.
  app.use('/api/payments', (req, res, next) => { req.user = JSON.parse(req.get('x-test-user') || '{}'); next(); }, paymentsRoutes);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (pathName, { user, method = 'GET', body } = {}) => fetch(base + pathName, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? { 'x-test-user': JSON.stringify({ sub: user.id, role: user.role }) } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  try {
    for (const [method, p] of [['GET', '/mine'], ['GET', `/cases/${r1.id}`], ['POST', `/cases/${r1.id}`], ['GET', '/DEMO-20000101-00000000/receipt']]) {
      check(`unauthenticated ${method} ${p} is rejected (401)`, (await call(`/secured/api/payments${p}`, { method })).status === 401);
    }
    check('student reads own case payment state (200)', (await call(`/api/payments/cases/${r1.id}`, { user: S })).status === 200);
    check("student cannot read another student's case (404)", (await call(`/api/payments/cases/${r1.id}`, { user: S2 })).status === 404);
    check('staff cannot create payments (403)', (await call(`/api/payments/cases/${r1.id}`, { user: ADMIN, method: 'POST', body: { idempotency_key: key() } })).status === 403);
    check('staff cannot list student history (403)', (await call('/api/payments/mine', { user: ADMIN })).status === 403);
    const blocked = await call(`/api/payments/cases/${open.id}`, { user: S, method: 'POST', body: { idempotency_key: key() } });
    check('direct POST for an unresolved case is rejected (409)', blocked.status === 409);
    check('staff cannot open the student fine summary (403)', (await call('/api/payments/summary', { user: ADMIN })).status === 403);
    check('student reads their own fine summary (200)', (await call('/api/payments/summary', { user: S })).status === 200);
    check('unauthenticated summary is rejected (401)', (await call('/secured/api/payments/summary')).status === 401);
    const badBatch = await call('/api/payments/batch', { user: S, method: 'POST', body: { case_ids: [open.id], idempotency_key: key() } });
    check('direct batch POST with an unresolved case is rejected (409)', badBatch.status === 409);
    check('staff cannot POST a batch (403)', (await call('/api/payments/batch', { user: ADMIN, method: 'POST', body: { case_ids: [r1.id] } })).status === 403);
    check('invalid case id is rejected (400)', (await call('/api/payments/cases/abc', { user: S })).status === 400);
    check('unknown receipt is not found (404)', (await call('/api/payments/DEMO-20000101-00000000/receipt', { user: S })).status === 404);
  } finally {
    server.close();
  }
}

const [{ n: leftover }] = await q(pool, "SELECT ((SELECT COUNT(*) FROM case_payments WHERE idempotency_key LIKE 'test-%') + (SELECT COUNT(*) FROM payment_transactions WHERE idempotency_key LIKE 'test-%'))::int AS n");
check('no test payments were left in the database', leftover === 0, `${leftover} left`);
await pool.end();

console.log(`\n${passed} passed, ${failed} failed${receiptPath ? `\nSample receipt (from rolled-back data): ${receiptPath}` : ''}`);
process.exit(failed ? 1 : 0);
