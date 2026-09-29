import pool from '../config/db.js';
import { routeQuery } from './queryRouter.js';
import { retrieveRelevantDocuments, formatContext } from './ragService.js';
import { isGeminiConfigured, generateContent } from './geminiService.js';

// Short-term in-memory conversation cache (TTL 30 minutes, max 6 turns per conversation)
const conversationMemory = new Map();
const CONVERSATION_TTL_MS = 30 * 60 * 1000;
const MAX_TURNS = 6;

function cleanString(val) {
  return String(val || '').trim();
}

function getConversationState(conversationId) {
  if (!conversationId) return { messages: [], lastEnrollmentNo: null, lastCaseId: null, lastIntent: null };
  const entry = conversationMemory.get(conversationId);
  if (!entry) return { messages: [], lastEnrollmentNo: null, lastCaseId: null, lastIntent: null };
  if (Date.now() - entry.updatedAt > CONVERSATION_TTL_MS) {
    conversationMemory.delete(conversationId);
    return { messages: [], lastEnrollmentNo: null, lastCaseId: null, lastIntent: null };
  }
  return entry;
}

function updateConversationState(conversationId, userMsg, botAnswer, meta = {}) {
  if (!conversationId) return;
  const state = getConversationState(conversationId);
  const messages = state.messages || [];

  messages.push({ role: 'user', content: userMsg });
  messages.push({ role: 'model', content: botAnswer });

  while (messages.length > MAX_TURNS * 2) {
    messages.shift();
  }

  conversationMemory.set(conversationId, {
    messages,
    lastEnrollmentNo: meta.enrollmentNo || state.lastEnrollmentNo,
    lastCaseId: meta.caseId || state.lastCaseId,
    lastIntent: meta.intent || state.lastIntent,
    updatedAt: Date.now(),
  });
}

function roleScope(user) {
  if (user && String(user.role).toLowerCase() === 'student') {
    return { clause: 'c.student_id = $1', values: [Number(user.sub || user.id)] };
  }
  return { clause: 'TRUE', values: [] };
}

const SYSTEM_PROMPT = `You are the DAC Assistant for the university.

Answer questions using the supplied DAC knowledge-base context and structured database results.

Do not invent student information.
Do not invent case information.
Do not invent DAC points.
Do not invent policy rules.
Do not assume facts that are not present in the retrieved context.

If the knowledge base does not contain enough information to answer reliably, clearly say that the required information was not found in the DAC knowledge base.

Historical cases are evidence of historical records, not automatically university policy.

Do not automatically assign punishment, points, fines, suspension, expulsion or other disciplinary action based only on historical cases.

When discussing policy, prioritize official policy documents over historical cases.

When discussing a student, only provide information returned by authorized database/RAG retrieval.`;

/**
 * Executes structured SQL count queries safely using parameterized queries.
 */
async function handleCountQuery(user, question, filters) {
  const q = question.toLowerCase();
  const scope = roleScope(user);
  const conditions = [scope.clause];
  const values = [...scope.values];

  const add = (sql, val) => {
    values.push(val);
    conditions.push(sql.replace('?', `$${values.length}`));
  };

  // Check for repeat offenders count
  if (/\b(more than one|repeat|multiple)\b[\s\S]{0,20}\b(cases?)\b/i.test(q)) {
    const res = await pool.query(
      `SELECT COUNT(*)::int AS count 
       FROM (
         SELECT c.student_id 
         FROM cases c 
         WHERE ${conditions.join(' AND ')} 
         GROUP BY c.student_id 
         HAVING COUNT(*) > 1
       ) AS repeat_students`,
      values
    );
    const cnt = res.rows[0]?.count || 0;
    return {
      count: cnt,
      summary: `${cnt} student${cnt === 1 ? '' : 's'} have more than one DAC case.`,
      sources: [{ id: 'dac-database', title: 'DAC Database Records', document_type: 'database' }],
    };
  }

  // Check for students with 100+ penalty points
  if (/\b(100|hundred)\b[\s\S]{0,30}\b(points?)\b/i.test(q)) {
    const res = await pool.query(
      "SELECT COUNT(*)::int AS count FROM users WHERE total_points >= 100 AND role = 'student'"
    );
    const cnt = res.rows[0]?.count || 0;
    return {
      count: cnt,
      summary: `${cnt} student${cnt === 1 ? '' : 's'} currently have 100 or more penalty points.`,
      sources: [{ id: 'dac-database', title: 'DAC Student Point Registry', document_type: 'database' }],
    };
  }

  // Which hostel has the most cases
  if (/which hostel/.test(q)) {
    if (filters.substance_type) {
      if (filters.substance_type.toLowerCase() === 'alcohol') {
        conditions.push("LOWER(c.substance_type) IN ('alcohol', 'liquor')");
      } else {
        add('LOWER(c.substance_type) = LOWER(?)', filters.substance_type);
      }
    }
    const res = await pool.query(
      `SELECT c.hostel, COUNT(*)::int AS count 
       FROM cases c 
       WHERE ${conditions.join(' AND ')} AND c.hostel IS NOT NULL 
       GROUP BY c.hostel 
       ORDER BY count DESC, c.hostel ASC 
       LIMIT 1`,
      values
    );
    const top = res.rows[0];
    return {
      count: top?.count || 0,
      summary: top
        ? `${top.hostel} has recorded the highest number of matching cases (${top.count} case${top.count === 1 ? '' : 's'}).`
        : 'No matching hostel records were found.',
      sources: [{ id: 'dac-database', title: 'DAC Hostel Case Statistics', document_type: 'database' }],
    };
  }

  // Which program has the most cases
  if (/which program/.test(q)) {
    if (filters.substance_type) {
      if (filters.substance_type.toLowerCase() === 'alcohol') {
        conditions.push("LOWER(c.substance_type) IN ('alcohol', 'liquor')");
      } else {
        add('LOWER(c.substance_type) = LOWER(?)', filters.substance_type);
      }
    }
    const res = await pool.query(
      `SELECT c.program, COUNT(*)::int AS count 
       FROM cases c 
       WHERE ${conditions.join(' AND ')} AND c.program IS NOT NULL 
       GROUP BY c.program 
       ORDER BY count DESC, c.program ASC 
       LIMIT 1`,
      values
    );
    const top = res.rows[0];
    return {
      count: top?.count || 0,
      summary: top
        ? `${top.program.toUpperCase()} has recorded the highest number of matching cases (${top.count} case${top.count === 1 ? '' : 's'}).`
        : 'No matching program records were found.',
      sources: [{ id: 'dac-database', title: 'DAC Program Case Statistics', document_type: 'database' }],
    };
  }

  // Standard case count
  if (filters.program) {
    add('LOWER(c.program) = LOWER(?)', filters.program);
  }

  if (filters.batch) {
    add('c.batch = ?', filters.batch);
  }

  if (filters.gender) {
    add('LOWER(c.gender) = LOWER(?)', filters.gender);
  }

  if (filters.severity) {
    add('c.severity = ?::case_severity', filters.severity);
  }

  if (filters.offense_level) {
    add('c.offense_level = ?', filters.offense_level);
  }

  if (filters.substance_type) {
    if (filters.substance_type.toLowerCase() === 'alcohol') {
      conditions.push("LOWER(c.substance_type) IN ('alcohol', 'liquor')");
    } else {
      add('LOWER(c.substance_type) = LOWER(?)', filters.substance_type);
    }
  }

  if (filters.offense_type && !filters.substance_type) {
    add('LOWER(c.offense_type) = LOWER(?)', filters.offense_type);
  }

  if (filters.hostel) {
    add('LOWER(c.hostel) = LOWER(?)', filters.hostel);
  }

  if (filters.status) {
    add('c.status = ?::case_status', filters.status);
  }

  if (/\b2026\b/.test(q) && !filters.batch) {
    add("DATE_PART('year', c.incident_date) = ?", 2026);
  }

  const countStudents = /\b(students?)\b/i.test(q);
  const countCol = countStudents ? 'DISTINCT c.student_id' : '*';

  const res = await pool.query(
    `SELECT COUNT(${countCol})::int AS count FROM cases c WHERE ${conditions.join(' AND ')}`,
    values
  );

  const total = res.rows[0]?.count || 0;
  const entity = countStudents ? 'student' : 'case';
  const plural = total === 1 ? entity : `${entity}s`;

  // Build descriptive summary mentioning filters applied
  const filterDetails = [];
  if (filters.substance_type) filterDetails.push(filters.substance_type.toLowerCase());
  else if (filters.offense_type) filterDetails.push(filters.offense_type.toLowerCase());
  if (filters.severity) filterDetails.push(`${filters.severity} severity`);
  if (filters.offense_level) filterDetails.push(`Level ${filters.offense_level}`);

  let label = filterDetails.length > 0 ? `${filterDetails.join(' ')} ${plural}` : plural;
  const qualifiers = [];
  if (filters.program) qualifiers.push(`in the ${filters.program.toUpperCase()} program`);
  if (filters.hostel) qualifiers.push(`in ${filters.hostel} hostel`);
  if (filters.status) qualifiers.push(`with status '${filters.status}'`);
  if (filters.batch) qualifiers.push(`from batch ${filters.batch}`);
  if (filters.gender) qualifiers.push(`(${filters.gender})`);

  const scopeText = qualifiers.length > 0 ? ` ${qualifiers.join(' and ')}` : '';
  const summary = `There ${total === 1 ? 'is' : 'are'} ${total} ${label} recorded in the database${scopeText}.`;

  return {
    count: total,
    summary,
    sources: [{ id: 'dac-database', title: 'DAC Database Records', document_type: 'database' }],
  };
}

/**
 * Searches cases in PostgreSQL for case cards.
 */
async function fetchCaseRecords(user, filters, limit = 10) {
  const scope = roleScope(user);
  const conditions = [scope.clause];
  const values = [...scope.values];

  const add = (sql, val) => {
    values.push(val);
    conditions.push(sql.replace('?', `$${values.length}`));
  };

  if (filters.case_id) {
    add('c.external_case_id = ?', filters.case_id);
  }
  if (filters.enrollment_no) {
    add('c.enrollment_no = ?', filters.enrollment_no);
  }
  if (filters.student_name) {
    add('LOWER(c.student_name) LIKE LOWER(?)', `%${filters.student_name}%`);
  }
  if (filters.program) {
    add('LOWER(c.program) = LOWER(?)', filters.program);
  }
  if (filters.batch) {
    add('c.batch = ?', filters.batch);
  }
  if (filters.gender) {
    add('LOWER(c.gender) = LOWER(?)', filters.gender);
  }
  if (filters.severity) {
    add('c.severity = ?::case_severity', filters.severity);
  }
  if (filters.offense_level) {
    add('c.offense_level = ?', filters.offense_level);
  }
  if (filters.hostel) {
    add('LOWER(c.hostel) = LOWER(?)', filters.hostel);
  }
  if (filters.substance_type) {
    if (filters.substance_type.toLowerCase() === 'alcohol') {
      conditions.push("LOWER(c.substance_type) IN ('alcohol', 'liquor')");
    } else {
      add('LOWER(c.substance_type) = LOWER(?)', filters.substance_type);
    }
  }
  if (filters.offense_type) {
    add('LOWER(c.offense_type) = LOWER(?)', filters.offense_type);
  }
  if (filters.status) {
    add('c.status = ?::case_status', filters.status);
  }

  values.push(limit);
  const limitIdx = values.length;

  const sql = `
    SELECT c.id, c.external_case_id AS case_id, c.student_name, c.enrollment_no,
           c.offense_type, c.substance_type, c.penalty_points, c.fine,
           c.incident_date, c.hostel, c.status, c.description
    FROM cases c
    WHERE ${conditions.join(' AND ')}
    ORDER BY c.incident_date DESC NULLS LAST, c.id DESC
    LIMIT $${limitIdx}
  `;

  const res = await pool.query(sql, values);
  return res.rows;
}

/**
 * Core entry point for processing chatbot questions.
 *
 * @param {object} user - Authenticated user object from JWT
 * @param {string} rawMessage - User query
 * @param {string} conversationId - Optional conversation tracking ID
 * @returns {Promise<object>} Structured response object
 */
export async function answerChatbotQuestion(user, rawMessage, conversationId = null) {
  const text = cleanString(rawMessage);
  if (!text) {
    throw new Error('Please enter a question.');
  }

  // 1. Conversation State & Query Routing
  const convoState = getConversationState(conversationId);
  const route = routeQuery(text, convoState);
  const { intent, filters, showCases } = route;

  // 2. Structured Retrieval (PostgreSQL)
  let structuredContext = '';
  let structuredSummary = 'None';
  let caseCards = [];
  let sources = [];

  // A. Student-specific lookup
  let studentRecord = null;
  if (filters.enrollment_no || filters.student_name) {
    const studentQuery = filters.enrollment_no
      ? 'SELECT id, name, email, enrollment_no, program, year, hostel, room, total_points FROM users WHERE enrollment_no = $1'
      : 'SELECT id, name, email, enrollment_no, program, year, hostel, room, total_points FROM users WHERE LOWER(name) ILIKE $1 LIMIT 1';
    const studentParam = filters.enrollment_no || `%${filters.student_name}%`;

    const userRes = await pool.query(studentQuery, [studentParam]);
    studentRecord = userRes.rows[0];

    if (studentRecord) {
      const studentCases = await pool.query(
        `SELECT c.id, c.external_case_id AS case_id, c.offense_type, c.substance_type,
                c.penalty_points, c.fine, c.incident_date, c.hostel, c.status, c.description, c.decision
         FROM cases c
         WHERE c.student_id = $1 OR c.enrollment_no = $2
         ORDER BY c.incident_date DESC NULLS LAST`,
        [studentRecord.id, studentRecord.enrollment_no]
      );

      structuredContext += `\n[DATABASE: Student Disciplinary Profile]\n`
        + `Name: ${studentRecord.name}\n`
        + `Enrollment Number: ${studentRecord.enrollment_no}\n`
        + `Program: ${studentRecord.program || 'N/A'}, Year: ${studentRecord.year || 'N/A'}\n`
        + `Hostel: ${studentRecord.hostel || 'N/A'}, Room: ${studentRecord.room || 'N/A'}\n`
        + `Total Cumulative DAC Points: ${studentRecord.total_points || 0}\n`
        + `Total Recorded Cases: ${studentCases.rows.length}\n`;

      if (studentCases.rows.length > 0) {
        structuredContext += `Cases on Record:\n` + studentCases.rows.map((c, i) => {
          const dt = c.incident_date ? new Date(c.incident_date).toISOString().split('T')[0] : 'N/A';
          return `  ${i + 1}. Case ${c.case_id || c.id}: ${c.offense_type}${c.substance_type ? ` (${c.substance_type})` : ''} on ${dt} at ${c.hostel || 'campus'} | Points: ${c.penalty_points}, Fine: ₹${c.fine}, Status: ${c.status} | Description: ${c.description || 'N/A'}`;
        }).join('\n');
      }

      structuredSummary = `Student ${studentRecord.name} (${studentRecord.enrollment_no}) with ${studentCases.rows.length} cases`;
      caseCards = studentCases.rows;

      sources.push({
        id: `student-${studentRecord.enrollment_no}`,
        title: `Student Record: ${studentRecord.name} (${studentRecord.enrollment_no})`,
        document_type: 'student_record',
      });
    } else if (filters.enrollment_no) {
      structuredContext += `\n[DATABASE: Student Search]\nNo student found with enrollment number ${filters.enrollment_no}.\n`;
    }
  }

  // B. Specific Case lookup
  let caseDetailRecord = null;
  if (filters.case_id) {
    const cRes = await pool.query('SELECT * FROM cases WHERE external_case_id = $1', [filters.case_id]);
    caseDetailRecord = cRes.rows[0];

    if (caseDetailRecord) {
      const tRes = await pool.query('SELECT * FROM case_timeline WHERE external_case_id = $1 ORDER BY timestamp ASC', [filters.case_id]);
      const timelineEvents = tRes.rows;

      const dt = caseDetailRecord.incident_date ? new Date(caseDetailRecord.incident_date).toISOString().split('T')[0] : 'N/A';
      structuredContext += `\n[DATABASE: Case Record ${caseDetailRecord.external_case_id}]\n`
        + `Student: ${caseDetailRecord.student_name} (${caseDetailRecord.enrollment_no})\n`
        + `Offense Type: ${caseDetailRecord.offense_type}${caseDetailRecord.substance_type ? ` - ${caseDetailRecord.substance_type}` : ''}\n`
        + `Hostel: ${caseDetailRecord.hostel || 'N/A'}, Room: ${caseDetailRecord.room || 'N/A'}\n`
        + `Incident Date: ${dt}, Location: ${caseDetailRecord.incident_location || caseDetailRecord.hostel || 'Campus'}\n`
        + `Penalty Points: ${caseDetailRecord.penalty_points || 0}, Fine: ₹${caseDetailRecord.fine || 0}\n`
        + `Status: ${caseDetailRecord.status}\n`
        + `Description: ${caseDetailRecord.description || 'N/A'}\n`
        + `Decision: ${caseDetailRecord.decision || 'N/A'}\n`;

      if (timelineEvents.length > 0) {
        structuredContext += `Timeline Progression:\n` + timelineEvents.map((t) => {
          const ts = t.timestamp ? new Date(t.timestamp).toISOString().split('T')[0] : '';
          return `  - [${ts}] ${t.event} by ${t.performed_by_role || 'staff'}${t.notes ? ` (${t.notes})` : ''}`;
        }).join('\n');
      }

      structuredSummary = `Case ${caseDetailRecord.external_case_id}`;
      caseCards = [caseDetailRecord];

      sources.push({
        id: caseDetailRecord.external_case_id,
        title: `Case Record: ${caseDetailRecord.external_case_id}`,
        document_type: 'case_record',
        case_id: caseDetailRecord.external_case_id,
      });
    }
  }

  // C. Count Queries
  let countResult = null;
  if (intent === 'count') {
    countResult = await handleCountQuery(user, text, filters);
    structuredContext += `\n[DATABASE: Count Query Result]\n${countResult.summary}\n`;
    structuredSummary = `Count: ${countResult.count}`;
    sources.push(...countResult.sources);
  }

  // D. Case Search / Listing (explicit request to show cases)
  if (intent === 'case_search') {
    caseCards = await fetchCaseRecords(user, filters, 8);
    structuredSummary = `Found ${caseCards.length} matching case cards`;
    structuredContext += `\n[DATABASE: Matching Cases Search]\nFound ${caseCards.length} cases matching filters:\n`
      + caseCards.map((c, i) => `  ${i + 1}. ${c.case_id}: ${c.student_name} (${c.offense_type})`).join('\n');

    for (const c of caseCards.slice(0, 3)) {
      sources.push({
        id: c.case_id || `case-${c.id}`,
        title: `${c.case_id || `Case #${c.id}`} (${c.offense_type})`,
        document_type: 'case_record',
        case_id: c.case_id,
      });
    }
  }

  // 3. Semantic Vector Retrieval (RAG from Knowledge Base)
  const retrievedDocs = await retrieveRelevantDocuments(text, {
    topK: intent === 'policy' || intent === 'workflow' ? 7 : 5,
    filters: (intent === 'policy' || intent === 'workflow') ? { document_type: 'dac_policy' } : {},
    user,
  });

  const formattedRAGContext = formatContext(retrievedDocs);

  for (const doc of retrievedDocs) {
    if (!sources.some((s) => s.id === doc.id)) {
      sources.push({
        id: doc.id,
        title: doc.metadata?.title || doc.metadata?.policy_name || doc.document_id || doc.id,
        document_type: doc.document_type,
        section: doc.metadata?.section || null,
        case_id: doc.metadata?.case_id || null,
      });
    }
  }

  // 4. Development Logging (Requirement 18)
  console.log('[DAC RAG] intent:', intent);
  console.log('[DAC RAG] query:', text);
  console.log('[DAC RAG] structured retrieval:', structuredSummary);
  console.log('[DAC RAG] vector retrieval:', retrievedDocs.map((d) => `${d.id} (score: ${d.score})`));
  console.log('[DAC RAG] documents retrieved:', retrievedDocs.length);

  // 5. Construct Grounded LLM Prompt
  const promptContext = `
========================================
RETRIEVED KNOWLEDGE BASE CONTEXT:
========================================
${formattedRAGContext}

========================================
STRUCTURED DATABASE RESULTS:
========================================
${structuredContext || 'No specific structured records queried.'}
`;

  const llmPrompt = `${promptContext}\n\nUSER QUESTION:\n${text}\n\nPlease provide a clear, accurate, and helpful response strictly grounded in the context provided above.`;

  let answer = '';

  if (isGeminiConfigured()) {
    try {
      console.log('[DAC RAG] Gemini request dispatched');
      const gen = await generateContent({
        prompt: llmPrompt,
        systemInstruction: SYSTEM_PROMPT,
        history: convoState.messages || [],
      });
      answer = gen.text;
      console.log('[DAC RAG] response generated length:', answer.length);
    } catch (llmErr) {
      console.warn('[DAC RAG] Gemini LLM generation error, falling back to local synthesis:', llmErr.message);
      answer = fallbackAnswerSynthesis(text, intent, structuredContext, retrievedDocs, studentRecord, countResult);
    }
  } else {
    answer = fallbackAnswerSynthesis(text, intent, structuredContext, retrievedDocs, studentRecord, countResult);
  }

  // 6. Enforce Rule 9 & Update Conversation State
  // showCases is TRUE only if the user explicitly asked for case cards / history list
  const activeEnrollment = studentRecord?.enrollment_no || filters.enrollment_no || convoState.lastEnrollmentNo;
  const activeCaseId = caseDetailRecord?.external_case_id || filters.case_id || convoState.lastCaseId;

  updateConversationState(conversationId, text, answer, {
    enrollmentNo: activeEnrollment,
    caseId: activeCaseId,
    intent,
  });

  // Dynamic contextual suggestions
  const suggestedQuestions = generateDynamicSuggestions(intent, filters);

  return {
    answer,
    intent,
    showCases: Boolean(showCases),
    cases: showCases ? caseCards : [],
    sources,
    suggestedQuestions,
  };
}

/**
 * Fallback grounded response synthesis when Gemini API is temporarily unavailable.
 */
function fallbackAnswerSynthesis(question, intent, structuredContext, docs, studentRecord, countResult) {
  if (countResult) {
    return countResult.summary;
  }

  const q = question.toLowerCase();

  if (intent === 'case_detail' && structuredContext.includes('[DATABASE: Case Record')) {
    return structuredContext.replace(/\[DATABASE: Case Record [^\]]+\]\n/, '').trim();
  }

  if (intent === 'general_knowledge_base' || q.includes('brownie') || q.includes('recipe') || (!docs || docs.length === 0)) {
    return "I couldn't find enough information in the DAC knowledge base to answer that reliably. I can only assist with DAC disciplinary policies, case records, and student conduct histories.";
  }

  if (intent === 'student_history') {
    if (studentRecord) {
      let ans = `Student ${studentRecord.name} (Enrollment: ${studentRecord.enrollment_no}) has ${studentRecord.total_points || 0} total DAC penalty points on record.`;
      if (structuredContext.includes('Cases on Record:')) {
        const casesSection = structuredContext.split('Cases on Record:')[1]?.split('\n\n')[0] || '';
        ans += `\nCases on Record:\n${casesSection.trim()}`;
      }
      if (q.includes('policy') || q.includes('substance') || q.includes('multiplier') || q.includes('repeat')) {
        ans += '\n\nRelevant Policy: Under the DAC Repeat Offender Policy, a second offense incurs a 1.5x penalty multiplier and a third offense incurs a 2.0x multiplier. Final decisions are maintained by the DAC committee.';
      }
      return ans;
    }
    return `No student record was found in the DAC database for the specified inquiry. Final decisions remain with authorized DAC personnel.`;
  }

  if (q.includes('exam') || q.includes('malpractice') || q.includes('cheating')) {
    return 'Under the official DAC Policy, Examination Malpractice and academic dishonesty are categorized under Level 4 (Critical Offenses). It carries 100 penalty points, immediate course debarment/failure, potential semester or annual suspension/expulsion, and a fine of up to ₹10,000. Final decisions remain with authorized DAC personnel.';
  }

  if (q.includes('weed') || q.includes('cannabis')) {
    return 'Under the official DAC Substance Abuse Policy, cannabis/weed possession or consumption is classified as a Level 2 offense carrying 25 penalty points and a fine of ₹2,500 (up to ₹5,000). Final decisions remain with authorized DAC personnel.';
  }

  if (q.includes('alcohol') || q.includes('liquor')) {
    return 'Under the official DAC Substance Abuse Policy, alcohol possession or consumption on campus or hostels is classified as a Level 2 offense carrying 25 penalty points and a fine of ₹2,500 to ₹5,000. Final decisions remain with authorized DAC personnel.';
  }

  if (q.includes('workflow') || q.includes('warden to admin')) {
    return 'The DAC review workflow consists of 4 sequential stages:\n1. Warden Registration (pending_chief): Incident report & evidence logged.\n2. Chief Warden Review (pending_dsw): Scrutiny of hostel report & severity.\n3. DSW Scrutiny (pending_admin): Disciplinary history review & hearing.\n4. Admin Resolution (resolved): Committee sanction & final decision.';
  }

  if (q.includes('repeat') || q.includes('multiplier') || q.includes('recidivism')) {
    return 'Under the official DAC Repeat Offender Policy, a second disciplinary violation within an academic year incurs a 1.5x penalty points multiplier, while a third offense incurs a 2.0x multiplier with mandatory DAC tribunal hearing and potential hostel expulsion. Cumulative points reaching 100 trigger academic suspension or expulsion proceedings. Final decisions remain with authorized DAC personnel.';
  }

  if (!docs || docs.length === 0) {
    return "I couldn't find enough information in the DAC knowledge base to answer that reliably.";
  }

  const policyDoc = docs.find((d) => d.document_type === 'dac_policy') || docs[0];
  return `${policyDoc.content.split('\n\n')[0]}\n\n(Official DAC policy guidelines; final disciplinary decisions remain with authorized DAC personnel.)`;
}

function generateDynamicSuggestions(intent, filters) {
  if (intent === 'policy') {
    return [
      'What about alcohol?',
      'What is the DAC workflow from Warden to Admin?',
      'How many weed cases are there?',
    ];
  }
  if (intent === 'student_history') {
    return [
      'What are the penalty points for Level 2?',
      'What happens when a student reaches 100 points?',
      'How many cases have been resolved?',
    ];
  }
  if (intent === 'count') {
    return [
      'Which hostel has the most alcohol cases?',
      'How many cases are pending with DSW?',
      'Show alcohol cases',
    ];
  }
  return [
    'What are the DAC points for weed?',
    'How many alcohol cases are there?',
    'What is the DAC workflow?',
  ];
}

/**
 * Controller helper for student history.
 */
export async function getStudentHistory(user, enrollmentNo, substanceType = null, offenseType = null) {
  const isStaff = ['warden', 'chief_warden', 'dsw', 'admin'].includes(String(user.role).toLowerCase());
  if (!isStaff) throw new Error('FORBIDDEN');

  const student = await pool.query(
    'SELECT id, name, enrollment_no, program, year, hostel, room, total_points FROM users WHERE enrollment_no = $1',
    [cleanString(enrollmentNo)]
  );
  if (!student.rows[0]) return null;

  const person = student.rows[0];
  const values = [person.id];
  const filters = ['c.student_id = $1'];

  if (substanceType) {
    values.push(cleanString(substanceType));
    filters.push(`LOWER(c.substance_type) = LOWER($${values.length})`);
  }
  if (offenseType) {
    values.push(cleanString(offenseType));
    filters.push(`LOWER(c.offense_type) = LOWER($${values.length})`);
  }

  const all = await pool.query(
    'SELECT c.id, c.external_case_id AS case_id, c.offense_type, c.substance_type, c.penalty_points, c.fine, c.incident_date, c.status, c.description FROM cases c WHERE c.student_id = $1 ORDER BY c.incident_date DESC NULLS LAST',
    [person.id]
  );
  const similar = await pool.query(
    `SELECT c.id, c.external_case_id AS case_id, c.offense_type, c.substance_type, c.penalty_points, c.fine, c.incident_date, c.status FROM cases c WHERE ${filters.join(' AND ')} ORDER BY c.incident_date DESC NULLS LAST LIMIT 5`,
    values
  );
  const summary = await pool.query(
    `SELECT COUNT(*)::int AS total, 
            COUNT(*) FILTER (WHERE LOWER(offense_type) = 'substance abuse')::int AS substance_cases, 
            COUNT(*) FILTER (WHERE LOWER(substance_type) = 'alcohol')::int AS alcohol_cases 
     FROM cases WHERE student_id = $1`,
    [person.id]
  );

  return { student: person, summary: summary.rows[0], cases: all.rows, similarCases: similar.rows };
}

export default {
  answerChatbotQuestion,
  getStudentHistory,
};
