import {
  PaymentError,
  createDemoPaymentService,
  getCasePaymentStateService,
  getReceiptDataService,
  listStudentPaymentsService,
} from '../services/payments.service.js';
import { renderReceiptPdf } from '../services/receipt.service.js';

// The requester always comes from the verified JWT, never from the request body.
function requesterOf(req) {
  return { id: Number(req.user?.sub), role: String(req.user?.role || '').toLowerCase() };
}

function readCaseId(req) {
  const caseId = Number(req.params.caseId);
  return Number.isInteger(caseId) && caseId > 0 ? caseId : null;
}

function sendError(res, error, fallbackMessage) {
  if (error instanceof PaymentError) {
    return res.status(error.status).json({
      error: error.message,
      code: error.code,
      ...(error.payment ? { payment: error.payment } : {}),
    });
  }
  console.error(fallbackMessage, error);
  return res.status(500).json({ error: fallbackMessage });
}

// GET /api/payments/mine — the signed-in student's payment history.
export async function getMyPaymentsController(req, res) {
  try {
    return res.status(200).json(await listStudentPaymentsService(requesterOf(req).id));
  } catch (error) {
    return sendError(res, error, 'Failed to load payment history');
  }
}

// GET /api/payments/cases/:caseId — amount, eligibility and recorded payment for one case.
export async function getCasePaymentController(req, res) {
  const caseId = readCaseId(req);
  if (!caseId) return res.status(400).json({ error: 'A valid case id is required' });
  try {
    return res.status(200).json(await getCasePaymentStateService(caseId, requesterOf(req)));
  } catch (error) {
    return sendError(res, error, 'Failed to load payment details');
  }
}

// POST /api/payments/cases/:caseId { idempotency_key } — confirm a DEMO payment.
export async function createCasePaymentController(req, res) {
  const caseId = readCaseId(req);
  if (!caseId) return res.status(400).json({ error: 'A valid case id is required' });
  try {
    const { payment, replayed } = await createDemoPaymentService(caseId, requesterOf(req), {
      idempotencyKey: req.body?.idempotency_key || null,
    });
    return res.status(replayed ? 200 : 201).json({ payment, replayed });
  } catch (error) {
    return sendError(res, error, 'The payment could not be completed. No payment was recorded.');
  }
}

// GET /api/payments/:transactionId/receipt[?download=1] — PDF receipt from persisted data.
export async function getReceiptController(req, res) {
  try {
    const data = await getReceiptDataService(req.params.transactionId, requesterOf(req));
    const pdf = await renderReceiptPdf(data);
    const disposition = String(req.query?.download || '') === '1' ? 'attachment' : 'inline';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
      'Content-Disposition': `${disposition}; filename="DAC-Payment-Receipt-${data.transaction_id}.pdf"`,
      'Cache-Control': 'private, no-store',
    });
    return res.status(200).send(pdf);
  } catch (error) {
    return sendError(res, error, 'Failed to generate the receipt');
  }
}
