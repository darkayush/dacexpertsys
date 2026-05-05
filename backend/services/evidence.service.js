import pool from '../config/db.js';

export async function createEvidenceService({ caseId, fileUrl, fileType, uploadedBy }) {
  const query = `
    INSERT INTO evidence (case_id, file_url, file_type, uploaded_by)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await pool.query(query, [caseId, fileUrl, fileType || null, uploadedBy || null]);
  return result.rows[0] || null;
}

export async function getEvidenceByIdService(evidenceId) {
  const result = await pool.query('SELECT * FROM evidence WHERE id = $1', [evidenceId]);
  return result.rows[0] || null;
}

export async function getEvidenceService({ caseId } = {}) {
  const values = [];
  let whereClause = '';

  if (caseId) {
    values.push(caseId);
    whereClause = `WHERE case_id = $${values.length}`;
  }

  const query = `
    SELECT id, case_id, file_url, file_type, uploaded_by, created_at
    FROM evidence
    ${whereClause}
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query, values);
  return result.rows;
}

export async function updateEvidenceService(evidenceId, payload) {
  const updates = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(payload, 'file_type')) {
    values.push(payload.file_type);
    updates.push(`file_type = $${values.length}`);
  }

  if (!updates.length) {
    return getEvidenceByIdService(evidenceId);
  }

  values.push(evidenceId);
  const query = `
    UPDATE evidence
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING *
  `;
  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

export async function deleteEvidenceService(evidenceId) {
  const result = await pool.query('DELETE FROM evidence WHERE id = $1 RETURNING *', [evidenceId]);
  return result.rows[0] || null;
}

export async function attachEvidenceToCaseService(caseId, fileUrl) {
  const query = `
    UPDATE cases
    SET evidence_url = COALESCE(evidence_url, $2)
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [caseId, fileUrl]);
  return result.rows[0] || null;
}
