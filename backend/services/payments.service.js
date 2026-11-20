import crypto from 'crypto';
import pool from '../config/db.js';
import { createNotificationsForRoleService } from './notifications.service.js';
import { createCaseTimelineService } from './timeline.service.js';

// DEMO fine payments. No payment gateway is integrated and no money moves: a confirmed
// checkout is recorded as a successful DEMO transaction in case_payments.
//
// Amount: the fine the Admin set in the case's final decision (cases.fine). It is copied onto
// the payment row so later edits to the case never change a recorded payment.
//
// Eligibility (checked here, never trusted from the client), per case:
//   - the case belongs to the requesting student,
//   - status is 'resolved' (any earlier or re-opened state is not payable),
//   - it was not closed with a warning and the fine is above 0,
//   - it has no SUCCESS payment yet (also enforced by a partial unique index).

export const PAYMENT_CURRENCY = 'INR';
const STAFF_ROLES = new Set(['warden', 'chief_warden', 'dsw', 'admin']);
// New ids use TXN-; DEMO- is still accepted for payments recorded before the rename.
const TRANSACTION_ID_PATTERN = /^(TXN|DEMO)-\d{8}-[0-9A-F]{8}$/;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9-]{16,100}$/;

export const INELIGIBLE_REASONS = {
  NOT_RESOLVED: 'The fine can be paid only after the case is resolved.',
  NO_FINE: 'There is no fine to pay for this case.',
  ALREADY_PAID: 'The fine for this case has already been paid.',
};

export class PaymentError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    Object.assign(this, extra);
  }
}

const notFound = () => new PaymentError(404, 'NOT_FOUND', 'Case not found');

/** Pure eligibility rule; a recorded payment always wins so paid cases stay "paid". */
export function evaluateEligibility(caseRow, successfulPayment) {
  if (successfulPayment) return { eligible: false, reason: 'ALREADY_PAID' };
  if (caseRow.status !== 'resolved') return { eligible: false, reason: 'NOT_RESOLVED' };
  if (caseRow.resolution_type === 'warning' || !(Number(caseRow.fine) > 0)) {
    return { eligible: false, reason: 'NO_FINE' };
  }
  return { eligible: true, reason: null };
}

// Students reach only their own cases (others look "not found"); staff may read any.
function assertCaseAccess(caseRow, requester) {
  if (!caseRow) throw notFound();
  if (requester.role === 'student') {
    if (Number(caseRow.student_id) !== Number(requester.id)) throw notFound();
    return;
  }
  if (!STAFF_ROLES.has(requester.role)) throw new PaymentError(403, 'FORBIDDEN', 'Forbidden');
}

// A case_payments row is either a single-case payment (payment_transaction_id IS NULL) or one
// line of a consolidated payment_transactions header. Consolidated lines report the header's
// transaction id, so every case paid together shares one transaction id and one receipt.
const PAYMENT_SELECT = `
  SELECT p.id, p.transaction_id, p.case_id, p.student_id, p.idempotency_key, p.amount, p.currency,
         p.payment_status, p.payment_type, p.payment_date, p.created_at, c.external_case_id,
         pt.transaction_id AS group_transaction_id, pt.case_count AS group_case_count,
         pt.total_amount AS group_total_amount
  FROM case_payments p
  JOIN cases c ON c.id = p.case_id
  LEFT JOIN payment_transactions pt ON pt.id = p.payment_transaction_id
`;

/** Client-facing shape; never exposes the idempotency key or internal ids beyond the case. */
export function toPaymentDto(row) {
  if (!row) return null;
  const consolidated = Boolean(row.group_transaction_id);
  return {
    transaction_id: consolidated ? row.group_transaction_id : row.transaction_id,
    case_id: row.case_id,
    case_ref: row.external_case_id || `#${row.case_id}`,
    amount: Number(row.amount),
    currency: row.currency,
    payment_status: row.payment_status,
    payment_type: row.payment_type,
    payment_date: row.payment_date,
    created_at: row.created_at,
    consolidated,
    transaction_case_count: consolidated ? Number(row.group_case_count) : 1,
    transaction_total: consolidated ? Number(row.group_total_amount) : Number(row.amount),
  };
}

// TXN-YYYYMMDD-XXXXXXXX: date in India time + 32 cryptographically random bits.
// (The payment row itself is always stored with payment_type = 'DEMO'.)
function newTransactionId(now = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now).replaceAll('-', '');
  return `TXN-${day}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// Runs fn in a transaction. With an external client (tests, or a caller's transaction) it uses
// a savepoint instead, so the caller decides whether anything is committed.
async function withTransaction(fn, externalClient = null) {
  if (externalClient) {
    await externalClient.query('SAVEPOINT demo_payment');
    try {
      const result = await fn(externalClient);
      await externalClient.query('RELEASE SAVEPOINT demo_payment');
      return result;
    } catch (error) {
      await externalClient.query('ROLLBACK TO SAVEPOINT demo_payment');
      throw error;
    }
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function findSuccessfulPayment(db, caseId) {
  const result = await db.query(`${PAYMENT_SELECT} WHERE p.case_id = $1 AND p.payment_status = 'SUCCESS' LIMIT 1`, [caseId]);
  return result.rows[0] || null;
}

/** Payment panel state for one case: amount, eligibility and the recorded payment, if any. */
export async function getCasePaymentStateService(caseId, requester, { client } = {}) {
  const db = client || pool;
  const caseResult = await db.query(
    'SELECT id, student_id, status, resolution_type, fine, external_case_id FROM cases WHERE id = $1',
    [caseId],
  );
  const caseRow = caseResult.rows[0];
  assertCaseAccess(caseRow, requester);

  const payment = await findSuccessfulPayment(db, caseId);
  const { eligible, reason } = evaluateEligibility(caseRow, payment);
  return {
    case_id: caseRow.id,
    case_ref: caseRow.external_case_id || `#${caseRow.id}`,
    case_status: caseRow.status,
    amount: Number(caseRow.fine || 0),
    currency: PAYMENT_CURRENCY,
    eligible,
    reason,
    reason_message: reason ? INELIGIBLE_REASONS[reason] : null,
    payment: toPaymentDto(payment),
  };
}

/**
 * Records a successful DEMO payment for the student's own eligible case.
 * idempotencyKey (one per checkout) makes retries safe: the same key returns the same payment.
 * Returns { payment, replayed }.
 */
export async function createDemoPaymentService(caseId, requester, { idempotencyKey = null } = {}, { client } = {}) {
  if (requester.role !== 'student') {
    throw new PaymentError(403, 'FORBIDDEN', 'Only students can pay a fine.');
  }
  const key = idempotencyKey ? String(idempotencyKey) : null;
  if (key && !IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new PaymentError(400, 'INVALID_IDEMPOTENCY_KEY', 'Invalid payment request. Please reload the page and try again.');
  }

  return withTransaction(async (db) => {
    // 1. Replay: this exact checkout already succeeded (e.g. the response was lost). Return it.
    if (key) {
      const prior = (await db.query(`${PAYMENT_SELECT} WHERE p.idempotency_key = $1`, [key])).rows[0];
      if (prior) {
        if (Number(prior.student_id) !== Number(requester.id) || Number(prior.case_id) !== Number(caseId)) {
          throw new PaymentError(409, 'IDEMPOTENCY_KEY_REUSED', 'Invalid payment request. Please reload the page and try again.');
        }
        return { payment: toPaymentDto(prior), replayed: true };
      }
    }

    // 2. Lock the case row so concurrent checkouts for the same case run one at a time.
    const caseRow = (await db.query(
      'SELECT id, student_id, status, resolution_type, fine, external_case_id FROM cases WHERE id = $1 FOR UPDATE',
      [caseId],
    )).rows[0];
    if (!caseRow || Number(caseRow.student_id) !== Number(requester.id)) throw notFound();

    // 3. Eligibility from the database, not from the client.
    const existing = await findSuccessfulPayment(db, caseId);
    const { eligible, reason } = evaluateEligibility(caseRow, existing);
    if (!eligible) {
      throw new PaymentError(409, reason, INELIGIBLE_REASONS[reason], { payment: toPaymentDto(existing) });
    }

    // 4. Persist the transaction. A transaction-id collision (2^-32 per day) is retried;
    //    the unique indexes reject duplicate successful payments and duplicate checkouts.
    let inserted = null;
    for (let attempt = 0; attempt < 3 && !inserted; attempt += 1) {
      await db.query('SAVEPOINT demo_payment_insert');
      try {
        inserted = (await db.query(
          `INSERT INTO case_payments
             (student_id, case_id, transaction_id, idempotency_key, amount, currency, payment_status, payment_type, payment_date)
           VALUES ($1, $2, $3, $4, $5, $6, 'SUCCESS', 'DEMO', NOW())
           RETURNING id`,
          [requester.id, caseId, newTransactionId(), key, caseRow.fine, PAYMENT_CURRENCY],
        )).rows[0];
        await db.query('RELEASE SAVEPOINT demo_payment_insert');
      } catch (error) {
        await db.query('ROLLBACK TO SAVEPOINT demo_payment_insert');
        if (error?.code !== '23505') throw error;
        if (error.constraint === 'case_payments_transaction_id_key') continue;
        if (error.constraint === 'case_payments_idempotency_key_key') {
          throw new PaymentError(409, 'DUPLICATE_REQUEST', 'This payment is already being processed. Please refresh the page.');
        }
        throw new PaymentError(409, 'ALREADY_PAID', INELIGIBLE_REASONS.ALREADY_PAID);
      }
    }
    if (!inserted) throw new Error('Could not generate a unique transaction id');

    const payment = (await db.query(`${PAYMENT_SELECT} WHERE p.id = $1`, [inserted.id])).rows[0];
    const amountText = `₹${Number(payment.amount).toLocaleString('en-IN')}`;
    const caseRef = payment.external_case_id || `#${payment.case_id}`;

    // 5. Audit trail and staff notification, in the same transaction as the payment.
    await createCaseTimelineService(
      { caseId, event: `Fine of ${amountText} paid by the student (transaction ${payment.transaction_id}).`, performedBy: requester.id },
      db,
    );
    await createNotificationsForRoleService(
      { role: 'admin', message: `Fine of ${amountText} for case ${caseRef} was paid by the student (transaction ${payment.transaction_id}).`, caseId },
      db,
    );

    return { payment: toPaymentDto(payment), replayed: false };
  }, client);
}

/**
 * The student's own payment history, newest first: one entry per transaction. A consolidated
 * payment is one entry listing all of its cases. Fields: transaction_id, amount, currency,
 * payment_status, payment_type, payment_date, case_count, cases [{ case_id, case_ref, amount }],
 * plus case_id / case_ref of the first case for single-case entries.
 */
export async function listStudentPaymentsService(studentId, { client } = {}) {
  const db = client || pool;
  const result = await db.query(
    `${PAYMENT_SELECT} WHERE p.student_id = $1 AND p.payment_status = 'SUCCESS' ORDER BY p.payment_date DESC, p.id DESC`,
    [studentId],
  );
  const byTransaction = new Map();
  for (const row of result.rows) {
    const dto = toPaymentDto(row);
    let entry = byTransaction.get(dto.transaction_id);
    if (!entry) {
      entry = {
        transaction_id: dto.transaction_id,
        amount: dto.transaction_total,
        currency: dto.currency,
        payment_status: dto.payment_status,
        payment_type: dto.payment_type,
        payment_date: dto.payment_date,
        consolidated: dto.consolidated,
        case_count: dto.transaction_case_count,
        case_id: dto.case_id,
        case_ref: dto.case_ref,
        cases: [],
      };
      byTransaction.set(dto.transaction_id, entry);
    }
    entry.cases.push({ case_id: dto.case_id, case_ref: dto.case_ref, amount: dto.amount });
  }
  return [...byTransaction.values()];
}

// ── Student fine summary and consolidated ("pay all") payments ─────────────────────────

const FINE_STATES = {
  PAYABLE: 'payable', // resolved, fine > 0, unpaid
  PAID: 'paid',
  AWAITING: 'awaiting_resolution', // not resolved yet: any fine is provisional and not payable
  NO_FINE: 'no_fine', // resolved with a warning or without a fine
};

function fineStateOf(caseRow, payment) {
  if (payment) return FINE_STATES.PAID;
  const { reason } = evaluateEligibility(caseRow, null);
  if (reason === 'NOT_RESOLVED') return FINE_STATES.AWAITING;
  if (reason === 'NO_FINE') return FINE_STATES.NO_FINE;
  return FINE_STATES.PAYABLE;
}

const toMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

/**
 * Case-wise fine breakdown for the signed-in student, computed from cases and recorded
 * payments (one query). Outstanding = fines of payable cases only; partial payments are not
 * part of this model, so a case is either fully paid or fully outstanding.
 */
export async function getStudentFineSummaryService(studentId, { client } = {}) {
  const db = client || pool;
  const { rows } = await db.query(
    `SELECT c.id, c.external_case_id, c.offense_type, c.status, c.resolution_type, c.fine,
            c.incident_date, c.created_at,
            p.amount AS paid_amount, p.payment_date, p.transaction_id AS line_transaction_id,
            pt.transaction_id AS group_transaction_id
     FROM cases c
     LEFT JOIN case_payments p ON p.case_id = c.id AND p.payment_status = 'SUCCESS'
     LEFT JOIN payment_transactions pt ON pt.id = p.payment_transaction_id
     WHERE c.student_id = $1
     ORDER BY c.incident_date DESC NULLS LAST, c.id DESC`,
    [studentId],
  );

  const items = rows.map((row) => {
    const paid = row.paid_amount !== null;
    const state = fineStateOf(row, paid);
    const fine = toMoney(row.fine);
    const paidAmount = paid ? toMoney(row.paid_amount) : 0;
    return {
      case_id: row.id,
      case_ref: row.external_case_id || `#${row.id}`,
      offense_type: row.offense_type,
      status: row.status,
      incident_date: row.incident_date || row.created_at,
      state,
      fine: paid ? paidAmount : fine,
      paid_amount: paidAmount,
      outstanding: state === FINE_STATES.PAYABLE ? fine : 0,
      payable: state === FINE_STATES.PAYABLE,
      payment: paid
        ? { transaction_id: row.group_transaction_id || row.line_transaction_id, payment_date: row.payment_date }
        : null,
    };
  });

  const sum = (list, field) => toMoney(list.reduce((total, item) => total + item[field], 0));
  const payable = items.filter((i) => i.state === FINE_STATES.PAYABLE);
  const paid = items.filter((i) => i.state === FINE_STATES.PAID);
  const awaiting = items.filter((i) => i.state === FINE_STATES.AWAITING);
  return {
    currency: PAYMENT_CURRENCY,
    total_outstanding: sum(payable, 'outstanding'),
    outstanding_count: payable.length,
    paid_total: sum(paid, 'paid_amount'),
    paid_count: paid.length,
    awaiting_count: awaiting.length,
    awaiting_total: sum(awaiting, 'fine'),
    items,
  };
}

const MAX_BATCH_CASES = 50;

/**
 * Pays several of the student's cases in ONE transaction (all or nothing).
 * The server re-checks every case (ownership, resolved, fine, unpaid) under row locks and
 * computes the total itself; if expectedTotal is given and differs (the balance changed during
 * checkout), nothing is recorded and AMOUNT_CHANGED is returned.
 * Returns { payment, replayed } where payment = { transaction_id, amount, case_count, cases, ... }.
 */
export async function createConsolidatedPaymentService(requester, { caseIds, expectedTotal = null, idempotencyKey = null } = {}, { client } = {}) {
  if (requester.role !== 'student') {
    throw new PaymentError(403, 'FORBIDDEN', 'Only students can pay a fine.');
  }
  const ids = [...new Set((Array.isArray(caseIds) ? caseIds : []).map(Number))];
  if (!ids.length || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new PaymentError(400, 'INVALID_CASES', 'Choose at least one case to pay.');
  }
  if (ids.length > MAX_BATCH_CASES) {
    throw new PaymentError(400, 'INVALID_CASES', `At most ${MAX_BATCH_CASES} cases can be paid at once.`);
  }
  const key = idempotencyKey ? String(idempotencyKey) : null;
  if (key && !IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new PaymentError(400, 'INVALID_IDEMPOTENCY_KEY', 'Invalid payment request. Please reload the page and try again.');
  }
  const expected = expectedTotal === null || expectedTotal === undefined ? null : toMoney(expectedTotal);

  return withTransaction(async (db) => {
    // 1. Replay of the same checkout: return the transaction it already created.
    if (key) {
      const prior = (await db.query('SELECT id, student_id FROM payment_transactions WHERE idempotency_key = $1', [key])).rows[0];
      if (prior) {
        if (Number(prior.student_id) !== Number(requester.id)) {
          throw new PaymentError(409, 'IDEMPOTENCY_KEY_REUSED', 'Invalid payment request. Please reload the page and try again.');
        }
        return { payment: await loadConsolidatedPayment(db, prior.id), replayed: true };
      }
    }

    // 2. Lock every requested case (in id order, so concurrent checkouts cannot deadlock).
    const { rows: caseRows } = await db.query(
      `SELECT id, student_id, status, resolution_type, fine, external_case_id
       FROM cases WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE`,
      [ids],
    );
    const owned = caseRows.filter((c) => Number(c.student_id) === Number(requester.id));
    if (owned.length !== ids.length) throw notFound(); // missing or another student's case

    // 3. Re-validate each case against the database right now.
    const { rows: paidRows } = await db.query(
      "SELECT case_id FROM case_payments WHERE case_id = ANY($1::int[]) AND payment_status = 'SUCCESS'",
      [ids],
    );
    const paidIds = new Set(paidRows.map((r) => Number(r.case_id)));
    const problems = owned
      .map((c) => ({ c, ...evaluateEligibility(c, paidIds.has(Number(c.id))) }))
      .filter((r) => !r.eligible)
      .map((r) => ({ case_id: r.c.id, case_ref: r.c.external_case_id || `#${r.c.id}`, reason: r.reason }));
    if (problems.length) {
      const message = problems.length === 1
        ? `${problems[0].case_ref}: ${INELIGIBLE_REASONS[problems[0].reason]}`
        : `${problems.length} of the selected cases can no longer be paid. Please review your fines again.`;
      throw new PaymentError(409, 'CASES_NOT_PAYABLE', message, { cases: problems });
    }

    // 4. The server's total is the only amount that can be charged.
    const total = toMoney(owned.reduce((sum, c) => sum + Number(c.fine), 0));
    if (expected !== null && expected !== total) {
      throw new PaymentError(409, 'AMOUNT_CHANGED', 'Your outstanding balance has changed. Please review your fines again.', { total });
    }

    // 5. Header + one line per case, all in this transaction.
    let header = null;
    for (let attempt = 0; attempt < 3 && !header; attempt += 1) {
      await db.query('SAVEPOINT demo_batch_header');
      try {
        header = (await db.query(
          `INSERT INTO payment_transactions
             (transaction_id, student_id, idempotency_key, total_amount, currency, case_count, payment_status, payment_type, payment_date)
           VALUES ($1, $2, $3, $4, $5, $6, 'SUCCESS', 'DEMO', NOW())
           RETURNING id, transaction_id, payment_date`,
          [newTransactionId(), requester.id, key, total, PAYMENT_CURRENCY, owned.length],
        )).rows[0];
        await db.query('RELEASE SAVEPOINT demo_batch_header');
      } catch (error) {
        await db.query('ROLLBACK TO SAVEPOINT demo_batch_header');
        if (error?.code !== '23505') throw error;
        if (error.constraint === 'payment_transactions_transaction_id_key') continue;
        throw new PaymentError(409, 'DUPLICATE_REQUEST', 'This payment is already being processed. Please refresh the page.');
      }
    }
    if (!header) throw new Error('Could not generate a unique transaction id');

    for (const [index, c] of owned.entries()) {
      try {
        await db.query(
          `INSERT INTO case_payments
             (student_id, case_id, transaction_id, amount, currency, payment_status, payment_type, payment_date, payment_transaction_id)
           VALUES ($1, $2, $3, $4, $5, 'SUCCESS', 'DEMO', $6, $7)`,
          [requester.id, c.id, `${header.transaction_id}-${index + 1}`, c.fine, PAYMENT_CURRENCY, header.payment_date, header.id],
        );
      } catch (error) {
        // The one-success-per-case index: another payment won the race. Abort everything.
        if (error?.code === '23505') throw new PaymentError(409, 'CASES_NOT_PAYABLE', INELIGIBLE_REASONS.ALREADY_PAID);
        throw error;
      }
      const amountText = `₹${Number(c.fine).toLocaleString('en-IN')}`;
      await createCaseTimelineService(
        { caseId: c.id, event: `Fine of ${amountText} paid by the student (transaction ${header.transaction_id}).`, performedBy: requester.id },
        db,
      );
    }

    const refs = owned.map((c) => c.external_case_id || `#${c.id}`);
    await createNotificationsForRoleService(
      {
        role: 'admin',
        message: `Fines of ₹${total.toLocaleString('en-IN')} for ${owned.length} case${owned.length === 1 ? '' : 's'} (${refs.join(', ')}) were paid by the student (transaction ${header.transaction_id}).`,
        caseId: owned.length === 1 ? owned[0].id : null,
      },
      db,
    );

    return { payment: await loadConsolidatedPayment(db, header.id), replayed: false };
  }, client);
}

async function loadConsolidatedPayment(db, headerId) {
  const header = (await db.query(
    `SELECT transaction_id, total_amount, currency, case_count, payment_status, payment_type, payment_date
     FROM payment_transactions WHERE id = $1`,
    [headerId],
  )).rows[0];
  const { rows: lines } = await db.query(
    `SELECT p.case_id, p.amount, c.external_case_id
     FROM case_payments p JOIN cases c ON c.id = p.case_id
     WHERE p.payment_transaction_id = $1 ORDER BY p.id`,
    [headerId],
  );
  return {
    transaction_id: header.transaction_id,
    amount: Number(header.total_amount),
    currency: header.currency,
    payment_status: header.payment_status,
    payment_type: header.payment_type,
    payment_date: header.payment_date,
    consolidated: true,
    case_count: Number(header.case_count),
    cases: lines.map((l) => ({ case_id: l.case_id, case_ref: l.external_case_id || `#${l.case_id}`, amount: Number(l.amount) })),
  };
}

/** Everything a receipt shows, from persisted rows only. Students may read only their own. */
export async function getReceiptDataService(transactionId, requester, { client } = {}) {
  const db = client || pool;
  const id = String(transactionId || '').toUpperCase();
  if (!TRANSACTION_ID_PATTERN.test(id)) throw new PaymentError(404, 'NOT_FOUND', 'Receipt not found');

  // Single-case payment (not a line of a consolidated transaction)...
  let row = (await db.query(
    `SELECT p.transaction_id, p.case_id, p.student_id, p.amount, p.currency, p.payment_status, p.payment_type,
            p.payment_date, c.external_case_id, c.offense_type, c.status AS case_status, c.decision,
            u.name AS student_name, u.email AS student_email, u.enrollment_no, u.program
     FROM case_payments p
     JOIN cases c ON c.id = p.case_id
     JOIN users u ON u.id = p.student_id
     WHERE p.transaction_id = $1 AND p.payment_status = 'SUCCESS' AND p.payment_transaction_id IS NULL`,
    [id],
  )).rows[0];

  // ...or a consolidated transaction with its case-wise lines.
  if (!row) {
    const header = (await db.query(
      `SELECT pt.id, pt.transaction_id, pt.student_id, pt.total_amount AS amount, pt.currency, pt.payment_status,
              pt.payment_type, pt.payment_date, pt.case_count,
              u.name AS student_name, u.email AS student_email, u.enrollment_no, u.program
       FROM payment_transactions pt
       JOIN users u ON u.id = pt.student_id
       WHERE pt.transaction_id = $1 AND pt.payment_status = 'SUCCESS'`,
      [id],
    )).rows[0];
    if (header) {
      const { rows: lines } = await db.query(
        `SELECT p.case_id, p.amount, c.external_case_id, c.offense_type, c.status AS case_status
         FROM case_payments p JOIN cases c ON c.id = p.case_id
         WHERE p.payment_transaction_id = $1 ORDER BY p.id`,
        [header.id],
      );
      row = { ...header, consolidated: true, items: lines };
    }
  }

  if (!row) throw new PaymentError(404, 'NOT_FOUND', 'Receipt not found');
  if (requester.role === 'student' && Number(row.student_id) !== Number(requester.id)) {
    throw new PaymentError(404, 'NOT_FOUND', 'Receipt not found');
  }
  if (requester.role !== 'student' && !STAFF_ROLES.has(requester.role)) {
    throw new PaymentError(403, 'FORBIDDEN', 'Forbidden');
  }
  return row;
}
