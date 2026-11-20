import { Router } from 'express';
import {
  createCasePaymentController,
  createConsolidatedPaymentController,
  getFineSummaryController,
  getCasePaymentController,
  getMyPaymentsController,
  getReceiptController,
} from '../controllers/payments.controller.js';
import { requireRoles } from '../middleware/auth.middleware.js';

// DEMO fine payments. Mounted at /api/payments behind verifyToken. Case ownership and
// eligibility are enforced in payments.service.js; role guards here are the first gate.
const router = Router();

router.get('/mine', requireRoles('student'), getMyPaymentsController);
router.get('/summary', requireRoles('student'), getFineSummaryController);
router.post('/batch', requireRoles('student'), createConsolidatedPaymentController);
router.get('/cases/:caseId', requireRoles('student', 'warden', 'chief_warden', 'dsw', 'admin'), getCasePaymentController);
router.post('/cases/:caseId', requireRoles('student'), createCasePaymentController);
router.get('/:transactionId/receipt', requireRoles('student', 'warden', 'chief_warden', 'dsw', 'admin'), getReceiptController);

export default router;
