import { Router } from 'express';
import {
  getEvidenceController,
  getEvidenceByIdController,
  updateEvidenceController,
  deleteEvidenceController,
} from '../controllers/evidence.controller.js';
import { requireRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', getEvidenceController);
router.get('/:id', getEvidenceByIdController);
router.put('/:id', requireRoles('admin'), updateEvidenceController);
router.delete('/:id', requireRoles('admin'), deleteEvidenceController);

export default router;
