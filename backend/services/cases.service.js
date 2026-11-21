import crypto from 'crypto';
import pool from '../config/db.js';
import { levelFromCategory } from '../config/dacPolicy.js';
import {
  createNotificationsForRoleService,
  createNotificationService,
} from './notifications.service.js';
import { createCaseTimelineService } from './timeline.service.js';
import { isEmailConfigured, renderEmailTemplate, sendEmail } from './email.service.js';

// Student details live in users; cases only store student_id.
const CASE_WITH_STUDENT_SELECT = `
  SELECT
    cases.*,
    users.name AS student_name,
    users.enrollment_no,
    users.program,
    users.gender,
    users.hostel,
    users.room
  FROM cases
  JOIN users ON users.id = cases.student_id
`;

const ROLE_LABELS = { warden: 'Warden', chief_warden: 'Chief Warden', dsw: 'DSW', admin: 'Admin' };

function canActOnRole(role) {
  return ['chief_warden', 'dsw', 'admin'].includes(String(role || '').toLowerCase());
}

function getNextWorkflowState(role) {
  const normalizedRole = String(role || '').toLowerCase();
  if (normalizedRole === 'chief_warden') {
    return {
      status: 'pending_dsw',
      assignedToRole: 'dsw',
      notifyRole: 'dsw',
      notifyMessage: 'Case approved by Chief Warden. Ready for review.',
      event: 'Approved by Chief Warden and forwarded to DSW.',
      stageLabel: 'DSW review',
    };
  }

  if (normalizedRole === 'dsw') {
    return {
      status: 'pending_admin',
      assignedToRole: 'admin',
      notifyRole: 'admin',
      notifyMessage: 'Case forwarded by DSW. Final decision required.',
      event: 'Approved by DSW and forwarded to Admin.',
      stageLabel: 'Admin decision',
    };
  }

  if (normalizedRole === 'admin') {
    return {
      status: 'resolved',
      assignedToRole: null,
      notifyRole: null,
      notifyMessage: null,
      event: 'Final decision recorded by Admin. Case resolved.',
      stageLabel: 'resolved',
    };
  }

  return null;
}

// Columns the case lists, dashboards and reports display. Long text fields
// (description, notes, decision, ...) are only sent by GET /api/cases/:id.
const CASE_LIST_SELECT = `
  SELECT
    cases.id,
    cases.external_case_id,
    cases.student_id,
    cases.offense_type,
    cases.severity,
    cases.status,
    cases.incident_date,
    cases.created_at,
    cases.created_by,
    cases.penalty_points,
    cases.severity_score,
    users.name AS student_name,
    users.enrollment_no
  FROM cases
  JOIN users ON users.id = cases.student_id
`;

const CASE_LIST_ORDER = 'ORDER BY cases.incident_date DESC NULLS LAST, cases.created_at DESC, cases.id DESC';

// Workflow stage each reviewer acts on (matches STAGE_FOR_ROLE in the frontend).
const STAGE_FOR_ROLE = { chief_warden: 'pending_chief', dsw: 'pending_dsw', admin: 'pending_admin' };

// Row-visibility rules per requester role. Shared by the list, page and summary queries
// so that every view counts exactly the cases the requester may see.
function buildCaseScope({ requesterRole, requesterId, role, status }) {
  const conditions = [];
  const values = [];

  if (requesterRole === 'student') {
    values.push(requesterId);
    conditions.push(`cases.student_id = $${values.length}`);
  } else if (requesterRole === 'warden') {
    // Wardens oversee disciplinary cases; only restrict if explicitly asked for "my_created_only"
    if (role === 'my_created_only') {
      // Only cases this warden registered through the app. Cases registered in the app
      // record the warden in both columns; imported seed data sets created_by but never
      // reported_by, so it is not attributed to any warden.
      values.push(requesterId);
      conditions.push(`cases.created_by = $${values.length} AND cases.reported_by = $${values.length}`);
    }
  } else if (requesterRole === 'chief_warden' || requesterRole === 'admin') {
    if (role && role !== 'all' && requesterRole !== 'admin') {
      values.push(role);
      conditions.push(`cases.assigned_to_role = $${values.length}`);
    }
  } else if (requesterRole === 'dsw') {
    // DSW needs pending queue plus downstream status visibility for dashboard stats.
    if (status) {
      values.push(status);
      conditions.push(`cases.status = $${values.length}`);
    } else {
      conditions.push(`cases.status IN ('pending_dsw', 'pending_admin', 'resolved')`);
    }
  }

  if (status && requesterRole !== 'dsw') {
    values.push(status);
    conditions.push(`cases.status = $${values.length}`);
  }

  return { conditions, values };
}

function whereSql(conditions) {
  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

export async function getAllCasesService(scope) {
  const { conditions, values } = buildCaseScope(scope);
  const result = await pool.query(`${CASE_LIST_SELECT} ${whereSql(conditions)} ${CASE_LIST_ORDER}`, values);
  return result.rows;
}

// One page of cases plus the total matching count.
// filter: 'all' | 'active' | 'mine' | 'resolved' | 'severe'; q: free-text search;
// days: only cases registered in the last N days (omit for no time limit).
export async function getCasesPageService({ filter = 'all', q = '', page = 0, pageSize = 10, days = null, ...scope }) {
  const { conditions, values } = buildCaseScope(scope);

  if (days) {
    values.push(days);
    conditions.push(`cases.created_at >= NOW() - make_interval(days => $${values.length})`);
  }

  if (filter === 'active') {
    conditions.push("cases.status IN ('pending_chief', 'pending_dsw', 'pending_admin')");
  } else if (filter === 'resolved') {
    conditions.push("cases.status = 'resolved'");
  } else if (filter === 'severe') {
    // Only open high/critical cases: resolved ones need no attention.
    conditions.push("cases.severity IN ('high', 'critical') AND cases.status <> 'resolved'");
  } else if (filter === 'mine' && STAGE_FOR_ROLE[scope.requesterRole]) {
    values.push(STAGE_FOR_ROLE[scope.requesterRole]);
    conditions.push(`cases.status = $${values.length}`);
  }

  const term = String(q || '').trim();
  if (term) {
    values.push(`%${term}%`);
    const p = `$${values.length}`;
    conditions.push(
      `(users.name ILIKE ${p} OR users.enrollment_no ILIKE ${p} OR cases.external_case_id ILIKE ${p} OR cases.offense_type ILIKE ${p})`
    );
  }

  const where = whereSql(conditions);
  const limit = Math.min(Math.max(Number(pageSize) || 10, 1), 100);
  const offset = Math.max(Number(page) || 0, 0) * limit;

  const [rowsResult, countResult] = await Promise.all([
    pool.query(`${CASE_LIST_SELECT} ${where} ${CASE_LIST_ORDER} LIMIT ${limit} OFFSET ${offset}`, values),
    pool.query(`SELECT COUNT(*)::int AS total FROM cases JOIN users ON users.id = cases.student_id ${where}`, values),
  ]);

  return { rows: rowsResult.rows, total: countResult.rows[0]?.total || 0 };
}

// ── Global header search ────────────────────────────────────────────────────
// Both queries use buildCaseScope, so search shows exactly the cases the requester may see
// in the case lists (students: their own; DSW: from their stage on; others: all).

// Matches user text literally inside ILIKE (escapes %, _ and \).
export function likeContains(term) {
  return `%${String(term).replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

/**
 * Cases matching a search term (case ID, offence, student name or enrollment number),
 * or every visible case with one exact offence when `offence` is given.
 */
export async function searchCasesService({ requesterRole, requesterId, q = '', offence = null, limit = 6 }) {
  const { conditions, values } = buildCaseScope({ requesterRole, requesterId });
  let exactIdParam = 'NULL';

  if (offence) {
    values.push(offence);
    conditions.push(`LOWER(cases.offense_type) = LOWER($${values.length})`);
  } else {
    values.push(likeContains(q));
    const p = `$${values.length}`;
    conditions.push(
      `(cases.external_case_id ILIKE ${p} OR cases.offense_type ILIKE ${p} OR users.name ILIKE ${p} OR users.enrollment_no ILIKE ${p})`
    );
    values.push(String(q));
    exactIdParam = `$${values.length}`;
  }
  values.push(limit);

  const result = await pool.query(
    `${CASE_LIST_SELECT} ${whereSql(conditions)}
     ORDER BY (UPPER(cases.external_case_id) = UPPER(${exactIdParam})) DESC NULLS LAST,
              cases.incident_date DESC NULLS LAST, cases.created_at DESC, cases.id DESC
     LIMIT $${values.length}`,
    values,
  );
  return result.rows;
}

/** Distinct offence types matching a term among the requester's visible cases, with counts. */
export async function searchOffencesService({ requesterRole, requesterId, q, limit = 5 }) {
  const { conditions, values } = buildCaseScope({ requesterRole, requesterId });
  values.push(likeContains(q));
  conditions.push(`cases.offense_type ILIKE $${values.length}`);
  values.push(limit);

  const result = await pool.query(
    `SELECT MIN(cases.offense_type) AS offense_type, COUNT(*)::int AS case_count
     FROM cases
     JOIN users ON users.id = cases.student_id
     ${whereSql(conditions)}
     GROUP BY LOWER(cases.offense_type)
     ORDER BY case_count DESC, offense_type ASC
     LIMIT $${values.length}`,
    values,
  );
  return result.rows;
}

// Dashboard numbers computed in SQL: counts per status, high/critical count,
// daily counts for the trend chart (last ~13 months) and the side-panel queue.
export async function getCasesSummaryService(scope) {
  const { conditions, values } = buildCaseScope(scope);
  const where = whereSql(conditions);
  const caseDate = 'COALESCE(cases.incident_date, cases.created_at::date)';

  const stage = STAGE_FOR_ROLE[scope.requesterRole];
  const queueValues = [...values];
  let queueSql;
  if (stage) {
    queueValues.push(stage);
    queueSql = `${CASE_LIST_SELECT} ${whereSql([...conditions, `cases.status = $${queueValues.length}`])}
      ORDER BY ${caseDate} ASC, cases.id ASC LIMIT 4`;
  } else {
    queueSql = `${CASE_LIST_SELECT} ${where} ORDER BY ${caseDate} DESC, cases.id DESC LIMIT 4`;
  }

  const [statusResult, trendResult, queueResult] = await Promise.all([
    pool.query(
      `SELECT cases.status::text AS status,
              COUNT(*)::int AS count,
              COUNT(*) FILTER (WHERE cases.severity IN ('high', 'critical') AND cases.status <> 'resolved')::int AS severe
       FROM cases ${where}
       GROUP BY cases.status`,
      values
    ),
    pool.query(
      `SELECT to_char(${caseDate}, 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
       FROM cases ${whereSql([...conditions, `${caseDate} >= CURRENT_DATE - 400`])}
       GROUP BY 1`,
      values
    ),
    pool.query(queueSql, queueValues),
  ]);

  const byStatus = { pending_chief: 0, pending_dsw: 0, pending_admin: 0, resolved: 0 };
  let severe = 0;
  for (const row of statusResult.rows) {
    if (row.status in byStatus) byStatus[row.status] = row.count;
    severe += row.severe;
  }
  const total = statusResult.rows.reduce((sum, row) => sum + row.count, 0);

  return { total, severe, byStatus, trend: trendResult.rows, queue: queueResult.rows };
}

// DAC penalty points must be a whole number of 0 or more (the database also enforces >= 0).
// Empty / null means 0. Throws an error with code INVALID_PENALTY_POINTS (HTTP 400).
export function validatePenaltyPoints(value) {
  if (value === undefined || value === null || value === '') return 0;
  const points = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(points) || points < 0 || points > 2147483647) {
    const error = new Error('Penalty points must be a whole number of 0 or more.');
    error.code = 'INVALID_PENALTY_POINTS';
    error.status = 400;
    throw error;
  }
  return points;
}

// The offence picked from Rules & Policies on Register Case. The rule is read here, not taken
// from the client, so the stored offence text and level always come from the system config.
// It must belong to the case's offence type.
async function resolvePolicyRule(client, policyRuleId, offenseType) {
  if (policyRuleId === null || policyRuleId === undefined || policyRuleId === '') {
    return { policyOffence: null, offenseLevel: null };
  }
  const ruleId = Number(policyRuleId);
  const rule = Number.isInteger(ruleId) && ruleId > 0
    ? (await client.query('SELECT question, category, offence_type FROM rules WHERE id = $1', [ruleId])).rows[0]
    : null;
  if (!rule || rule.offence_type !== offenseType) {
    const error = new Error('The selected offence does not belong to this offence type. Reload the page and choose it again.');
    error.code = 'INVALID_POLICY_RULE';
    error.status = 400;
    throw error;
  }
  return { policyOffence: rule.question, offenseLevel: levelFromCategory(rule.category) };
}

export const STATEMENT_MAX_LENGTH = 5000;
export const DECLINE_REASON_MAX_LENGTH = 500;
// Names match ignoring case and extra spaces ("  aarav  SHARMA" = "Aarav Sharma").
export const normaliseSignName = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

function invalidStatement(message) {
  const error = new Error(message);
  error.code = 'INVALID_STATEMENT';
  error.status = 400;
  return error;
}

// The student's statement from Register Case: either signed (text + confirmation tick + typed
// full name that matches the student) or declined (optional reason). Not sending one at all is
// allowed for older clients and scripts; the case then has no statement.
async function resolveStatement(client, statement, studentId) {
  const none = { text: null, declined: null, reason: null, signedName: null, recorded: false };
  if (statement === undefined || statement === null) return none;
  if (typeof statement !== 'object') throw invalidStatement('The student statement is not valid.');
  if (statement.declined === true) {
    const reason = String(statement.decline_reason || '').trim();
    if (reason.length > DECLINE_REASON_MAX_LENGTH) {
      throw invalidStatement(`The reason for declining can be at most ${DECLINE_REASON_MAX_LENGTH} characters.`);
    }
    return { text: null, declined: true, reason: reason || null, signedName: null, recorded: true };
  }
  const text = String(statement.text || '').trim();
  if (!text) throw invalidStatement('The student statement is empty. Enter it, or mark that the student declined.');
  if (text.length > STATEMENT_MAX_LENGTH) {
    throw invalidStatement(`The student statement can be at most ${STATEMENT_MAX_LENGTH} characters.`);
  }
  if (statement.confirmed !== true) throw invalidStatement('The student must tick the box confirming the statement is their own.');
  const student = (await client.query('SELECT name FROM users WHERE id = $1', [studentId])).rows[0];
  const signedName = String(statement.signed_name || '').trim().replace(/\s+/g, ' ');
  if (!student || !signedName || normaliseSignName(signedName) !== normaliseSignName(student.name)) {
    throw invalidStatement('The signature must be the student\'s full name as registered.');
  }
  return { text, declined: false, reason: null, signedName, recorded: true };
}

// Inserts one case inside an open transaction: gives it a public DAC-<year>-<id> number,
// notifies the chief wardens and writes the first timeline entry.
async function insertCaseWithClient(client, payload, requesterId, requesterRole, { groupSize = 0 } = {}) {
  const {
    student_id: studentId,
    offense_type: offenseType,
    description = null,
    location = null,
    incident_date: incidentDate = null,
    severity = 'low',
    penalty_points: penaltyPoints = 0,
    evidence_url: evidenceUrl = null,
    substance_type: substanceType = null,
    incident_time: incidentTime = null,
    incident_location: incidentLocation = null,
    alcohol_reading: alcoholReading = null,
    notes = null,
    incident_group_id: incidentGroupId = null,
    policy_rule_id: policyRuleId = null,
    statement = null,
  } = payload;
  const validPenaltyPoints = validatePenaltyPoints(penaltyPoints);
  const { policyOffence, offenseLevel } = await resolvePolicyRule(client, policyRuleId, offenseType);
  const studentStatement = await resolveStatement(client, statement, studentId);

  const query = `
    INSERT INTO cases (
      student_id,
      created_by,
      created_by_role,
      assigned_to_role,
      reported_by,
      offense_type,
      status,
      severity,
      description,
      location,
      incident_date,
      penalty_points,
      evidence_url,
      substance_type,
      incident_time,
      incident_location,
      alcohol_reading,
      notes,
      incident_group_id,
      policy_offence,
      offense_level,
      student_statement,
      statement_declined,
      statement_decline_reason,
      statement_signed_name,
      statement_signed_at
    )
    VALUES ($1, $2, $12, $3, $2, $4, $5, $6, $7, $8, $9, $10, $11, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, CASE WHEN $25::boolean THEN NOW() END)
    RETURNING *
  `;

  const values = [
    studentId,
    requesterId,
    'chief_warden',
    offenseType,
    'pending_chief',
    severity,
    description,
    location,
    incidentDate,
    validPenaltyPoints,
    evidenceUrl,
    requesterRole,
    substanceType,
    incidentTime,
    incidentLocation,
    alcoholReading,
    notes,
    incidentGroupId,
    policyOffence,
    offenseLevel,
    studentStatement.text,
    studentStatement.declined,
    studentStatement.reason,
    studentStatement.signedName,
    studentStatement.recorded,
  ];
  const result = await client.query(query, values);
  // Give app-created cases the same public ID format as imported ones: DAC-<year>-<5-digit id>.
  const withPublicId = await client.query(
    `UPDATE cases
     SET external_case_id = 'DAC-' || to_char(COALESCE(incident_date, NOW()), 'YYYY') || '-' || lpad(id::text, 5, '0')
     WHERE id = $1 AND external_case_id IS NULL
     RETURNING *`,
    [result.rows[0].id]
  );
  const createdCase = withPublicId.rows[0] || result.rows[0];
  const byRole = ROLE_LABELS[requesterRole] || 'staff';

  await createNotificationsForRoleService(
    {
      role: 'chief_warden',
      message: groupSize
        ? `New group-incident case (${groupSize} students) created by ${byRole}. Click to review.`
        : `New case created by ${byRole}. Click to review.`,
      caseId: createdCase.id,
    },
    client,
  );

  await createCaseTimelineService(
    {
      caseId: createdCase.id,
      event: groupSize
        ? `Case created as part of a group incident (${groupSize} students) and assigned to Chief Warden.`
        : 'Case created and assigned to Chief Warden.',
      performedBy: requesterId,
    },
    client,
  );

  if (studentStatement.recorded) {
    await createCaseTimelineService(
      {
        caseId: createdCase.id,
        event: studentStatement.declined
          ? 'Student declined to give a statement.'
          : `Student statement recorded (signed by ${studentStatement.signedName}).`,
        performedBy: requesterId,
      },
      client,
    );
  }

  return createdCase;
}

export async function createCaseService(payload, requesterId, requesterRole = 'warden') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const createdCase = await insertCaseWithClient(client, payload, requesterId, requesterRole);
    await client.query('COMMIT');
    return createdCase;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export const MAX_GROUP_STUDENTS = 50;

// Group incident: one separate case per student, all sharing the incident details and an
// incident_group_id. Either every case is created or none is.
// students: [{ student_id, location?, alcohol_reading?, notes? }] — the optional fields are
// per-student (e.g. each student's own breathalyzer reading); shared: the incident fields.
export async function createGroupCasesService(students, shared, requesterId, requesterRole = 'warden') {
  const ids = students.map((s) => Number(s.student_id));
  if (ids.length < 2 || ids.length > MAX_GROUP_STUDENTS || ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new Error('INVALID_GROUP');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const found = await client.query("SELECT id FROM users WHERE id = ANY($1::int[]) AND role = 'student'", [ids]);
    if (found.rows.length !== ids.length) {
      throw new Error('UNKNOWN_STUDENT');
    }

    const groupId = `GRP-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const created = [];
    for (const student of students) {
      const createdCase = await insertCaseWithClient(
        client,
        {
          ...shared,
          student_id: Number(student.student_id),
          location: student.location ?? shared.location ?? null,
          alcohol_reading: student.alcohol_reading !== undefined ? student.alcohol_reading : (shared.alcohol_reading ?? null),
          notes: student.notes !== undefined ? student.notes : (shared.notes ?? null),
          // Each student signs (or declines) their own statement; never shared across the group.
          statement: student.statement ?? null,
          incident_group_id: groupId,
        },
        requesterId,
        requesterRole,
        { groupSize: students.length },
      );
      created.push(createdCase);
    }

    await client.query('COMMIT');
    return { incident_group_id: groupId, cases: created };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// The other cases from the same group incident (empty when the case is not part of one).
export async function getGroupCasesService(caseId) {
  const result = await pool.query(
    `SELECT cases.id, cases.external_case_id, cases.status, cases.severity,
            users.name AS student_name, users.enrollment_no
     FROM cases
     JOIN users ON users.id = cases.student_id
     WHERE cases.incident_group_id IS NOT NULL
       AND cases.incident_group_id = (SELECT incident_group_id FROM cases WHERE id = $1)
       AND cases.id <> $1
     ORDER BY cases.id`,
    [caseId],
  );
  return result.rows;
}

export async function getCaseHistoryService({ requesterRole, requesterId, limit = 6 }) {
  const normalizedRole = String(requesterRole || '').toLowerCase();
  const values = [];
  const conditions = [];

  if (normalizedRole === 'student') {
    values.push(requesterId);
    conditions.push(`cases.student_id = $${values.length}`);
  }

  values.push(limit);
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      cases.id,
      cases.offense_type,
      cases.status,
      cases.created_at,
      cases.incident_date,
      COALESCE(users.name, 'Unknown Student') AS student_name
    FROM cases
    LEFT JOIN users ON users.id = cases.student_id
    ${whereClause}
    ORDER BY cases.incident_date DESC NULLS LAST, cases.created_at DESC
    LIMIT $${values.length}
  `;

  const result = await pool.query(query, values);
  return result.rows;
}

export async function approveCaseService(caseId, actor) {
  if (!canActOnRole(actor?.role)) {
    throw new Error('FORBIDDEN_ROLE');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM cases WHERE id = $1 FOR UPDATE', [caseId]);
    const currentCase = existing.rows[0];
    if (!currentCase) {
      throw new Error('CASE_NOT_FOUND');
    }

    if (String(currentCase.status || '').toLowerCase() === 'resolved') {
      throw new Error('CASE_ALREADY_RESOLVED');
    }

    if (String(currentCase.assigned_to_role || '').toLowerCase() !== String(actor.role || '').toLowerCase()) {
      throw new Error('NOT_ASSIGNED_ROLE');
    }

    const nextState = getNextWorkflowState(actor.role);
    if (!nextState) {
      throw new Error('INVALID_TRANSITION');
    }

    const updated = await client.query(
      `
      UPDATE cases
      SET
        status = $2::case_status,
        assigned_to_role = $3::user_role,
        resolved_by = CASE WHEN $2::case_status = 'resolved'::case_status THEN $4 ELSE resolved_by END,
        resolved_by_role = CASE WHEN $2::case_status = 'resolved'::case_status THEN $5::user_role ELSE resolved_by_role END,
        resolved_at = CASE WHEN $2::case_status = 'resolved'::case_status THEN NOW() ELSE resolved_at END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [caseId, nextState.status, nextState.assignedToRole, actor.id, actor.role],
    );
    const updatedCase = updated.rows[0];

    if (nextState.notifyRole) {
      await createNotificationsForRoleService(
        {
          role: nextState.notifyRole,
          message: nextState.notifyMessage,
          caseId: updatedCase.id,
        },
        client,
      );
    }

    if (updatedCase.created_by) {
      const caseRef = updatedCase.external_case_id || `#${updatedCase.id}`;
      const creatorMessage = nextState.status === 'resolved'
        ? `Case ${caseRef} has been resolved.`
        : `Case ${caseRef} moved to ${nextState.stageLabel}.`;
      await createNotificationService(
        {
          userId: updatedCase.created_by,
          message: creatorMessage,
          caseId: updatedCase.id,
        },
        client,
      );
    }

    await createCaseTimelineService(
      {
        caseId: updatedCase.id,
        event: nextState.event,
        performedBy: actor.id,
      },
      client,
    );

    await client.query('COMMIT');
    return updatedCase;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Closes a case at the current review stage by warning the student. Only the role the
// case is assigned to may do this. Reviewers, the case creator and the student are notified.
export async function warnCaseService(caseId, actor, note = null) {
  if (!canActOnRole(actor?.role)) {
    throw new Error('FORBIDDEN_ROLE');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM cases WHERE id = $1 FOR UPDATE', [caseId]);
    const currentCase = existing.rows[0];
    if (!currentCase) {
      throw new Error('CASE_NOT_FOUND');
    }

    if (String(currentCase.status || '').toLowerCase() === 'resolved') {
      throw new Error('CASE_ALREADY_RESOLVED');
    }

    if (String(currentCase.assigned_to_role || '').toLowerCase() !== String(actor.role || '').toLowerCase()) {
      throw new Error('NOT_ASSIGNED_ROLE');
    }

    const roleLabel = ROLE_LABELS[actor.role] || 'Reviewer';
    const cleanNote = String(note || '').trim();
    const decision = `Resolved by ${roleLabel} with a warning to the student.${cleanNote ? ` ${cleanNote}` : ''}`;

    const updated = await client.query(
      `
      UPDATE cases
      SET
        status = 'resolved'::case_status,
        assigned_to_role = NULL,
        resolution_type = 'warning',
        decision = $2,
        resolved_by = $3,
        resolved_by_role = $4::user_role,
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [caseId, decision, actor.id, actor.role],
    );
    const updatedCase = updated.rows[0];

    const caseRef = updatedCase.external_case_id || `#${updatedCase.id}`;
    const recipients = await client.query(
      `SELECT id FROM users
       WHERE (role IN ('chief_warden', 'dsw', 'admin') OR id = $1 OR id = $2)
         AND id <> $3`,
      [updatedCase.created_by, updatedCase.student_id, actor.id],
    );
    for (const row of recipients.rows) {
      await createNotificationService(
        {
          userId: row.id,
          message: `Case ${caseRef} was resolved by ${roleLabel} with a warning to the student.`,
          caseId: updatedCase.id,
        },
        client,
      );
    }

    await createCaseTimelineService(
      {
        caseId: updatedCase.id,
        event: `Resolved by ${roleLabel} with a warning to the student.`,
        performedBy: actor.id,
      },
      client,
    );

    await client.query('COMMIT');
    return updatedCase;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Emails the student after the Admin resolves their case with DAC penalty points.
// Called only from the Admin's final decision. Never throws; returns what happened:
// { sent: true, to } | { sent: false, reason }.
export async function sendDacPenaltyEmailService(caseId) {
  try {
    const result = await pool.query(
      `SELECT cases.id, cases.external_case_id, cases.offense_type, cases.penalty_points, cases.fine,
              cases.decision, cases.status, users.name AS student_name, users.email AS student_email
       FROM cases
       JOIN users ON users.id = cases.student_id
       WHERE cases.id = $1`,
      [caseId],
    );
    const row = result.rows[0];
    const points = Number(row?.penalty_points || 0);

    if (!row || row.status !== 'resolved') return { sent: false, reason: 'Case is not resolved' };
    if (points <= 0) return { sent: false, reason: 'No DAC points were imposed' };
    if (!row.student_email) return { sent: false, reason: 'Student has no email address' };
    if (!isEmailConfigured()) return { sent: false, reason: 'Email is not configured' };

    const caseRef = row.external_case_id || `#${row.id}`;
    const fine = Number(row.fine || 0);
    const pointsText = `${points} DAC point${points === 1 ? '' : 's'}`;
    const paragraphs = [
      `The Disciplinary Action Committee has concluded case ${caseRef}${row.offense_type ? ` (${row.offense_type})` : ''}. You have been given ${pointsText}.`,
      ...(fine > 0 ? [`A fine of Rs. ${fine.toLocaleString('en-IN')} has also been imposed.`] : []),
      ...(row.decision ? [`Decision: ${row.decision}`] : []),
      // DAC Policy v2, rule xiv.
      'If you wish to appeal, write to appeal.dac@bml.edu.in within a week of this decision, after paying the fine and an appeal fee of Rs. 500. Paying the fine does not cancel the penalty points.',
    ];

    const { error } = await sendEmail({
      to: row.student_email,
      subject: `DAC decision for case ${caseRef}: ${pointsText}`,
      html: renderEmailTemplate({ heading: `You have been given ${pointsText}`, greetingName: row.student_name, paragraphs }),
      text: [`Hello ${row.student_name},`, ...paragraphs].join('\n\n'),
    });

    if (error) return { sent: false, reason: error.message || 'Email provider rejected the email' };
    return { sent: true, to: row.student_email };
  } catch (err) {
    console.error('DAC penalty email failed:', err?.message || err);
    return { sent: false, reason: 'Email could not be sent' };
  }
}

export async function getCaseByIdService(caseId) {
  const result = await pool.query(`${CASE_WITH_STUDENT_SELECT} WHERE cases.id = $1`, [caseId]);
  return result.rows[0] || null;
}

const ACTIVE_CASE_STATUSES = ['pending_chief', 'pending_dsw', 'pending_admin'];

// One student (by enrollment number) plus all of their DAC cases. The summary is
// computed from the same case rows that are returned, so totals match the history.
export async function getStudentProfileService(enrollmentNo) {
  const studentResult = await pool.query(
    `SELECT id, name, email, enrollment_no, program, year, hostel, room, gender, student_status
     FROM users
     WHERE role = 'student' AND enrollment_no = $1`,
    [enrollmentNo]
  );
  const student = studentResult.rows[0];
  if (!student) return null;

  const casesResult = await pool.query(
    `${CASE_WITH_STUDENT_SELECT}
     WHERE cases.student_id = $1
     ORDER BY cases.incident_date DESC NULLS LAST, cases.id DESC`,
    [student.id]
  );
  const cases = casesResult.rows;

  // DAC points count only once a case is resolved, and never for a warning (same rule as the
  // users.total_points trigger).
  const counts = (c) => c.status === 'resolved' && c.resolution_type !== 'warning';
  const summary = {
    total_cases: cases.length,
    total_points: cases.filter(counts).reduce((sum, c) => sum + Number(c.penalty_points || 0), 0),
    active_cases: cases.filter((c) => ACTIVE_CASE_STATUSES.includes(c.status)).length,
    resolved_cases: cases.filter((c) => c.status === 'resolved').length,
  };

  return { student, summary, cases };
}

export async function updateCaseService(caseId, payload, actor) {
  const updates = [];
  const values = [];

  const allowedFields = {
    offense_type: 'offense_type',
    description: 'description',
    location: 'location',
    incident_date: 'incident_date',
    severity: 'severity',
    penalty_points: 'penalty_points',
    evidence_url: 'evidence_url',
    fine: 'fine',
    decision: 'decision',
  };

  Object.entries(allowedFields).forEach(([key, column]) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      values.push(key === 'penalty_points' ? validatePenaltyPoints(payload[key]) : payload[key]);
      updates.push(`${column} = $${values.length}`);
    }
  });

  if (!updates.length) {
    return getCaseByIdService(caseId);
  }

  values.push(caseId);
  const query = `
    UPDATE cases
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  const updatedCase = result.rows[0] || null;

  if (updatedCase && actor?.id) {
    await createCaseTimelineService({
      caseId: updatedCase.id,
      event: 'Case details updated.',
      performedBy: actor.id,
    });
  }

  return updatedCase;
}

export async function deleteCaseService(caseId) {
  const result = await pool.query('DELETE FROM cases WHERE id = $1 RETURNING *', [caseId]);
  return result.rows[0] || null;
}
