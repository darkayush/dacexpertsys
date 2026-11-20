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

const PAYMENT_SELECT = `
  SELECT p.id, p.transaction_id, p.case_id, p.student_id, p.idempotency_key, p.amount, p.currency,
         p.payment_status, p.payment_type, p.payment_date, p.created_at, c.external_case_id
  FROM case_payments p
  JOIN cases c ON c.id = p.case_id
`;

/** Client-facing shape; never exposes the idempotency key or internal ids beyond the case. */
export function toPaymentDto(row) {
  if (!row) return null;
  return {
    transaction_id: row.transaction_id,
    case_id: row.case_id,
    case_ref: row.external_case_id || `#${row.case_id}`,
    amount: Number(row.amount),
    currency: row.currency,
    payment_status: row.payment_status,
    payment_type: row.payment_type,
    payment_date: row.payment_date,
    created_at: row.created_at,
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

/** The student's own payment history, newest first. */
export async function listStudentPaymentsService(studentId, { client } = {}) {
  const db = client || pool;
  const result = await db.query(
    `${PAYMENT_SELECT} WHERE p.student_id = $1 AND p.payment_status = 'SUCCESS' ORDER BY p.payment_date DESC, p.id DESC`,
    [studentId],
  );
  return result.rows.map(toPaymentDto);
}

/** Everything a receipt shows, from persisted rows only. Students may read only their own. */
export async function getReceiptDataService(transactionId, requester, { client } = {}) {
  const db = client || pool;
  const id = String(transactionId || '').toUpperCase();
  if (!TRANSACTION_ID_PATTERN.test(id)) throw new PaymentError(404, 'NOT_FOUND', 'Receipt not found');

  const row = (await db.query(
    `SELECT p.transaction_id, p.case_id, p.student_id, p.amount, p.currency, p.payment_status, p.payment_type,
            p.payment_date, c.external_case_id, c.offense_type, c.status AS case_status, c.decision,
            u.name AS student_name, u.email AS student_email, u.enrollment_no, u.program
     FROM case_payments p
     JOIN cases c ON c.id = p.case_id
     JOIN users u ON u.id = p.student_id
     WHERE p.transaction_id = $1 AND p.payment_status = 'SUCCESS'`,
    [id],
  )).rows[0];

  if (!row) throw new PaymentError(404, 'NOT_FOUND', 'Receipt not found');
  if (requester.role === 'student' && Number(row.student_id) !== Number(requester.id)) {
    throw new PaymentError(404, 'NOT_FOUND', 'Receipt not found');
  }
  if (requester.role !== 'student' && !STAFF_ROLES.has(requester.role)) {
    throw new PaymentError(403, 'FORBIDDEN', 'Forbidden');
  }
  return row;
}
