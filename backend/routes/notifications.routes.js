import { Router } from 'express';
import {
  createNotificationController,
  getNotificationsController,
  markNotificationReadController,
  updateNotificationController,
  deleteNotificationController,
} from '../controllers/notifications.controller.js';
import { requireRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/create', createNotificationController);
router.get('/', getNotificationsController);
router.put('/:id/read', markNotificationReadController);
router.put('/:id', requireRoles('admin'), updateNotificationController);
router.delete('/:id', requireRoles('admin'), deleteNotificationController);

export default router;
