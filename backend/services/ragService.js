import pool from '../config/db.js';

const DEFAULT_TOP_K = parseInt(process.env.RAG_TOP_K || '5', 10);

/**
 * Clean string helper.
 */
function clean(val) {
  return String(val || '').trim();
}

/**
 * Retrieves the documents most relevant to a question with PostgreSQL keyword search over
 * rag_documents (DAC policy sections and case narratives).
 *
 * Students only ever see policy documents and their own case documents. If the caller cannot
 * say which student it is (no enrollment number), a student gets policy documents only.
 *
 * @param {string} query - The search query
 * @param {object} options - { topK, filters, user, studentEnrollment }
 * @returns {Promise<Array<{ id, source, document_type, document_id, content, metadata, score }>>}
 */
export async function retrieveRelevantDocuments(query, options = {}) {
  const cleanQuery = clean(query);
  if (!cleanQuery) return [];

  const topK = options.topK || DEFAULT_TOP_K;
  const filters = { ...(options.filters || {}) };
  const user = options.user || null;

  // If user is a student, scope retrieval so they cannot see other students' private case documents
  const isStudent = user && String(user.role).toLowerCase() === 'student';
  const studentEnrollment = clean(options.studentEnrollment || user?.enrollment_no) || null;
  if (isStudent && !studentEnrollment) filters.document_type = 'dac_policy'; // fail closed

  return fallbackTextSearch(cleanQuery, { topK, filters, isStudent, studentEnrollment });
}

const STOP_WORDS = new Set([
  'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how',
  'that', 'this', 'these', 'those', 'there', 'here',
  'show', 'tell', 'about', 'many', 'much', 'more', 'most', 'give', 'list',
  'find', 'view', 'look', 'want', 'need', 'will', 'would', 'shall', 'should',
  'can', 'could', 'may', 'might', 'must', 'have', 'has', 'had', 'having',
  'does', 'doesnt', 'dont', 'did', 'doing', 'done',
  'the', 'and', 'for', 'with', 'from', 'are', 'was', 'were', 'been', 'being',
  'not', 'but', 'all', 'any', 'both', 'each', 'few', 'some', 'such',
  'one', 'two', 'per', 'via', 'into', 'onto', 'upon', 'out', 'off', 'over',
  'case', 'cases', 'record', 'records', 'student', 'students',
]);

/**
 * PostgreSQL keyword / metadata search over rag_documents.
 */
async function fallbackTextSearch(query, { topK, filters, isStudent, studentEnrollment }) {
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t))
    .slice(0, 8);

  const conditions = [];
  const values = [];

  if (filters.document_type) {
    values.push(filters.document_type);
    conditions.push(`document_type = $${values.length}`);
  }

  if (filters.case_id) {
    values.push(filters.case_id);
    conditions.push(`(document_id = $${values.length} OR metadata->>'case_id' = $${values.length})`);
  }

  if (filters.offense_type) {
    values.push(filters.offense_type);
    conditions.push(`LOWER(metadata->>'offense_type') = LOWER($${values.length})`);
  }

  if (filters.substance_type) {
    values.push(filters.substance_type);
    conditions.push(`LOWER(metadata->>'substance_type') = LOWER($${values.length})`);
  }

  if (isStudent && studentEnrollment) {
    values.push(studentEnrollment);
    conditions.push(`(document_type = 'dac_policy' OR metadata->>'enrollment_no' = $${values.length})`);
  }

  // If there are specific search terms, require at least one match and rank by relevance
  let scoreExpr = '1';
  if (terms.length > 0) {
    const matchExpressions = [];
    const termClauses = terms.map((term) => {
      values.push(`%${term}%`);
      const valIdx = values.length;
      matchExpressions.push(`(CASE WHEN content ILIKE $${valIdx} THEN 1 ELSE 0 END)`);
      return `content ILIKE $${valIdx}`;
    });
    conditions.push(`(${termClauses.join(' OR ')})`);
    scoreExpr = `(${matchExpressions.join(' + ')})`;
  } else if (conditions.length === 0) {
    // If no terms and no filters, do not return random documents
    return [];
  }

  values.push(topK);
  const limitIndex = values.length;

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT id, source, document_type, document_id, content, metadata,
           (${scoreExpr})::float AS score
    FROM rag_documents
    ${whereClause}
    ORDER BY 
      (${scoreExpr}) DESC,
      CASE WHEN document_type = 'dac_policy' THEN 0 ELSE 1 END,
      updated_at DESC
    LIMIT $${limitIndex}
  `;

  try {
    const res = await pool.query(sql, values);
    return deduplicateChunks(res.rows);
  } catch (err) {
    console.error('Fallback document search error:', err.message);
    return [];
  }
}

/**
 * Removes duplicate chunks based on ID or identical content.
 */
function deduplicateChunks(rows) {
  const seenIds = new Set();
  const seenContentPrefix = new Set();
  const unique = [];

  for (const row of rows) {
    if (seenIds.has(row.id)) continue;
    const prefix = clean(row.content).slice(0, 150).toLowerCase();
    if (seenContentPrefix.has(prefix)) continue;

    seenIds.add(row.id);
    seenContentPrefix.add(prefix);
    unique.push({
      id: row.id,
      source: row.source,
      document_type: row.document_type,
      document_id: row.document_id,
      content: row.content,
      metadata: row.metadata || {},
      score: row.score ? Number(parseFloat(row.score).toFixed(4)) : 0.80,
    });
  }

  return unique;
}

/**
 * Formats retrieved chunks into clean, cited context blocks for the LLM.
 */
export function formatContext(documents) {
  if (!documents || documents.length === 0) {
    return 'No relevant DAC documents or case records found.';
  }

  return documents.map((doc, idx) => {
    const title = doc.metadata?.title || doc.metadata?.policy_name || doc.document_id || doc.id;
    const typeLabel = doc.document_type === 'dac_policy' ? 'OFFICIAL POLICY'
      : doc.document_type === 'case_timeline' ? 'CASE TIMELINE'
      : 'HISTORICAL CASE RECORD';

    return `[DOCUMENT ${idx + 1}] (${typeLabel}: "${title}" | ID: ${doc.id})\n${doc.content}\n`;
  }).join('\n---\n\n');
}

export default {
  retrieveRelevantDocuments,
  formatContext,
};
