import { Router } from 'express';
import {
  getRulesController,
  createRuleController,
  updateRuleController,
  deleteRuleController,
  seedRulesController,
} from '../controllers/rules.controller.js';
import { requireRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', getRulesController);
router.post('/', requireRoles('admin'), createRuleController);
router.put('/:id', requireRoles('admin'), updateRuleController);
router.delete('/:id', requireRoles('admin'), deleteRuleController);
router.post('/seed', requireRoles('admin'), seedRulesController);

export default router;
