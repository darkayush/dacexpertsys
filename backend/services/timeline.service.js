import pool from '../config/db.js';

function resolveDbClient(client) {
  return client || pool;
}

export async function createCaseTimelineService({ caseId, event, performedBy }, client) {
  const db = resolveDbClient(client);
  const query = `
    INSERT INTO case_timeline (case_id, event, performed_by)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const result = await db.query(query, [caseId, event, performedBy || null]);
  return result.rows[0] || null;
}

export async function getCaseTimelineService(caseId) {
  const query = `
    SELECT id, case_id, event, performed_by, timestamp
    FROM case_timeline
    WHERE case_id = $1
    ORDER BY timestamp ASC
  `;
  const result = await pool.query(query, [caseId]);
  return result.rows;
}

export async function updateCaseTimelineService(timelineId, payload) {
  const updates = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(payload, 'event')) {
    values.push(payload.event);
    updates.push(`event = $${values.length}`);
  }

  if (!updates.length) {
    const existing = await pool.query('SELECT * FROM case_timeline WHERE id = $1', [timelineId]);
    return existing.rows[0] || null;
  }

  values.push(timelineId);
  const query = `
    UPDATE case_timeline
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING *
  `;
  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

export async function deleteCaseTimelineService(timelineId) {
  const result = await pool.query('DELETE FROM case_timeline WHERE id = $1 RETURNING *', [timelineId]);
  return result.rows[0] || null;
}
