import {
  createNotificationsForRoleService,
  getNotificationsForUserService,
  markNotificationReadService,
  updateNotificationService,
  deleteNotificationService,
} from '../services/notifications.service.js';

export async function createNotificationController(req, res) {
  try {
    const requesterRole = String(req.user?.role || '').toLowerCase();
    if (requesterRole !== 'admin') {
      return res.status(403).json({ error: 'Only admin can create notifications manually' });
    }

    const { role, message, case_id: caseId } = req.body || {};
    if (!role || !message) {
      return res.status(400).json({ error: 'role and message are required' });
    }

    const notifications = await createNotificationsForRoleService({
      role: String(role).toLowerCase(),
      message,
      caseId: caseId ? Number(caseId) : null,
    });

    return res.status(201).json({
      message: 'Notifications created successfully',
      notifications,
    });
  } catch (error) {
    console.error('Error creating notifications:', error);
    return res.status(500).json({ error: 'Failed to create notifications' });
  }
}

export async function getNotificationsController(req, res) {
  try {
    const userId = Number(req.user?.sub);
    const notifications = await getNotificationsForUserService(userId);
    return res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

export async function markNotificationReadController(req, res) {
  try {
    const notificationId = Number(req.params.id);
    const userId = Number(req.user?.sub);

    if (!notificationId) {
      return res.status(400).json({ error: 'A valid notification id is required' });
    }

    const updated = await markNotificationReadService(notificationId, userId);
    if (!updated) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating notification:', error);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
}

export async function updateNotificationController(req, res) {
  try {
    const notificationId = Number(req.params.id);
    if (!notificationId) {
      return res.status(400).json({ error: 'A valid notification id is required' });
    }

    const updated = await updateNotificationService(notificationId, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating notification:', error);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
}

export async function deleteNotificationController(req, res) {
  try {
    const notificationId = Number(req.params.id);
    if (!notificationId) {
      return res.status(400).json({ error: 'A valid notification id is required' });
    }

    const deleted = await deleteNotificationService(notificationId);
    if (!deleted) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.status(200).json({ message: 'Notification deleted', notification: deleted });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
}
