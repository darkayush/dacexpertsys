import pool from '../config/db.js';

function resolveDbClient(client) {
  return client || pool;
}

export async function createNotificationService({ userId, message, caseId = null }, client) {
  const db = resolveDbClient(client);
  const query = `
    INSERT INTO notifications (user_id, message, case_id, is_read)
    VALUES ($1, $2, $3, FALSE)
    RETURNING *
  `;
  const result = await db.query(query, [userId, message, caseId]);
  return result.rows[0] || null;
}

export async function createNotificationsForRoleService({ role, message, caseId = null }, client) {
  const db = resolveDbClient(client);
  const users = await db.query('SELECT id FROM users WHERE role = $1', [role]);

  if (!users.rows.length) {
    return [];
  }

  const notifications = [];
  for (const row of users.rows) {
    const created = await createNotificationService(
      {
        userId: row.id,
        message,
        caseId,
      },
      db,
    );
    if (created) notifications.push(created);
  }

  return notifications;
}

export async function getNotificationsForUserService(userId) {
  const query = `
    SELECT id, user_id, message, case_id, is_read, created_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
}

export async function markNotificationReadService(notificationId, userId) {
  const query = `
    UPDATE notifications
    SET is_read = TRUE
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id, message, case_id, is_read, created_at
  `;
  const result = await pool.query(query, [notificationId, userId]);
  return result.rows[0] || null;
}

export async function updateNotificationService(notificationId, payload) {
  const updates = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(payload, 'message')) {
    values.push(payload.message);
    updates.push(`message = $${values.length}`);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'is_read')) {
    values.push(Boolean(payload.is_read));
    updates.push(`is_read = $${values.length}`);
  }

  if (!updates.length) {
    const existing = await pool.query(
      'SELECT id, user_id, message, case_id, is_read, created_at FROM notifications WHERE id = $1',
      [notificationId],
    );
    return existing.rows[0] || null;
  }

  values.push(notificationId);
  const query = `
    UPDATE notifications
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING id, user_id, message, case_id, is_read, created_at
  `;
  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

export async function deleteNotificationService(notificationId) {
  const result = await pool.query(
    'DELETE FROM notifications WHERE id = $1 RETURNING id, user_id, message, case_id, is_read, created_at',
    [notificationId],
  );
  return result.rows[0] || null;
}
