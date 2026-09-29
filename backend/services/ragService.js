import pool from '../config/db.js';
import { generateEmbedding, isGeminiConfigured } from './geminiService.js';

const DEFAULT_TOP_K = parseInt(process.env.RAG_TOP_K || '5', 10);
const DEFAULT_MIN_SCORE = parseFloat(process.env.RAG_MIN_SCORE || '0.50');

/**
 * Checks if pgvector is enabled in the database.
 */
let isPgvectorChecked = false;
let hasPgvector = false;

async function checkPgvectorSupport() {
  if (isPgvectorChecked) return hasPgvector;
  try {
    const res = await pool.query("SELECT 1 FROM pg_extension WHERE extname = 'vector'");
    hasPgvector = res.rowCount > 0;
    isPgvectorChecked = true;
    return hasPgvector;
  } catch {
    hasPgvector = false;
    isPgvectorChecked = true;
    return false;
  }
}

/**
 * Clean string helper.
 */
function clean(val) {
  return String(val || '').trim();
}

/**
 * Retrieves relevant documents using semantic vector similarity search via pgvector,
 * with graceful fallback to full-text / metadata search if embeddings are not yet generated.
 *
 * @param {string} query - The search query
 * @param {object} options - Search options { topK, minScore, filters, userRole, studentEnrollment }
 * @returns {Promise<Array<{ id, source, document_type, document_id, content, metadata, score }>>}
 */
export async function retrieveRelevantDocuments(query, options = {}) {
  const cleanQuery = clean(query);
  if (!cleanQuery) return [];

  const topK = options.topK || DEFAULT_TOP_K;
  const minScore = options.minScore !== undefined ? options.minScore : DEFAULT_MIN_SCORE;
  const filters = options.filters || {};
  const user = options.user || null;

  const pgvectorSupported = await checkPgvectorSupport();
  const geminiAvailable = isGeminiConfigured();

  // If user is a student, scope retrieval so they cannot see other students' private case documents
  const isStudent = user && String(user.role).toLowerCase() === 'student';
  const studentEnrollment = user?.enrollment_no ? String(user.enrollment_no) : null;

  let queryEmbedding = null;
  if (geminiAvailable && pgvectorSupported) {
    try {
      queryEmbedding = await generateEmbedding(cleanQuery);
    } catch (embErr) {
      console.warn('Could not generate query embedding, using text fallback:', embErr.message);
    }
  }

  // 1. Vector Retrieval if embedding is present
  if (queryEmbedding && pgvectorSupported) {
    const conditions = ['embedding IS NOT NULL'];
    const values = [`[${queryEmbedding.join(',')}]`];

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
      // Students can see policy and only their own cases/timelines
      values.push(studentEnrollment);
      conditions.push(`(document_type = 'dac_policy' OR metadata->>'enrollment_no' = $${values.length})`);
    }

    values.push(minScore);
    const minScoreIndex = values.length;

    values.push(topK);
    const limitIndex = values.length;

    const sql = `
      SELECT id, source, document_type, document_id, content, metadata,
             (1 - (embedding <=> $1::vector)) AS score
      FROM rag_documents
      WHERE ${conditions.join(' AND ')}
        AND (1 - (embedding <=> $1::vector)) >= $${minScoreIndex}
      ORDER BY embedding <=> $1::vector ASC
      LIMIT $${limitIndex}
    `;

    try {
      const res = await pool.query(sql, values);
      if (res.rows.length > 0) {
        return deduplicateChunks(res.rows);
      }
    } catch (err) {
      console.warn('Vector query error, falling back to text search:', err.message);
    }
  }

  // 2. Clean fallback: Text and structured keyword search in PostgreSQL
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
 * Clean PostgreSQL text/metadata fallback search.
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
