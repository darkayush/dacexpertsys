import pool from './db.js';
import { getDacPolicyRules, OFFENCE_TYPE_RENAMES } from './dacPolicy.js';

// Recalculates every student's users.total_points from their cases (DAC points rule above
// ensureWorkflowSchema's points section). Idempotent; only rows whose total differs change.
// Same statement as the end of database/seed.sql.
export const RECOMPUTE_STUDENT_POINTS_SQL = `UPDATE users u
SET total_points = s.points
FROM (
  SELECT u2.id,
         COALESCE(SUM(c.penalty_points) FILTER (
           WHERE c.status = 'resolved' AND c.resolution_type IS DISTINCT FROM 'warning'
         ), 0)::int AS points
  FROM users u2
  LEFT JOIN cases c ON c.student_id = u2.id
  WHERE u2.role = 'student'
  GROUP BY u2.id
) s
WHERE u.id = s.id AND u.total_points IS DISTINCT FROM s.points`;

export async function ensureWorkflowSchema() {
  const statements = [
    "ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'pending_chief'",
    "ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'pending_dsw'",
    "ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'pending_admin'",
    "ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'resolved'",
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id)',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS reported_by INT REFERENCES users(id)',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS resolved_by INT REFERENCES users(id)',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS assigned_to_role user_role',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS offense_type TEXT',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS status case_status',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS severity case_severity',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS description TEXT',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS location TEXT',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS incident_date DATE',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS penalty_points INT',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS severity_score FLOAT',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS evidence_url TEXT',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()',
    'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS case_id INT REFERENCES cases(id)',
    'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE',
    `
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'read'
      ) THEN
        EXECUTE 'UPDATE notifications SET is_read = COALESCE(is_read, read)';
        EXECUTE 'ALTER TABLE notifications DROP COLUMN read';
      END IF;
    END
    $$
    `,
    `
    UPDATE cases
    SET created_by = COALESCE(created_by, reported_by)
    WHERE created_by IS NULL
    `,
    `
    UPDATE cases
    SET
      status = CASE
        WHEN status::text IN ('resolved') THEN 'resolved'::case_status
        WHEN status::text IN ('dac_review', 'pending_admin') THEN 'pending_admin'::case_status
        WHEN status::text IN ('investigation', 'pending_dsw') THEN 'pending_dsw'::case_status
        ELSE 'pending_chief'::case_status
      END,
      assigned_to_role = CASE
        WHEN status::text = 'resolved' THEN NULL
        WHEN status::text IN ('pending_admin', 'dac_review') THEN 'admin'::user_role
        WHEN status::text IN ('pending_dsw', 'investigation') THEN 'dsw'::user_role
        ELSE 'chief_warden'::user_role
      END
    `,
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_email TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS student_status TEXT',
    // student_status only applies to students
    'ALTER TABLE users ALTER COLUMN student_status DROP DEFAULT',
    "UPDATE users SET student_status = NULL WHERE role <> 'student' AND student_status IS NOT NULL",
    `
    DO $$
    BEGIN
      ALTER TABLE users ADD CONSTRAINT users_student_status_students_only
        CHECK (role = 'student' OR student_status IS NULL);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$
    `,
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS external_case_id TEXT',
    // Student details live in users; drop the old per-case copies
    'ALTER TABLE cases DROP COLUMN IF EXISTS enrollment_no',
    'ALTER TABLE cases DROP COLUMN IF EXISTS student_name',
    'ALTER TABLE cases DROP COLUMN IF EXISTS program',
    'ALTER TABLE cases DROP COLUMN IF EXISTS batch',
    'ALTER TABLE cases DROP COLUMN IF EXISTS gender',
    'ALTER TABLE cases DROP COLUMN IF EXISTS hostel',
    'ALTER TABLE cases DROP COLUMN IF EXISTS room',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS substance_type TEXT',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS offense_level INT',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS fine NUMERIC(12, 2) DEFAULT 0',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS incident_time TIME',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS incident_location TEXT',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS alcohol_reading NUMERIC(10, 2)',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS notes TEXT',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS decision TEXT',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS resolved_by_role user_role',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS resolution_type TEXT',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS incident_group_id TEXT',
    'CREATE INDEX IF NOT EXISTS cases_incident_group_id_idx ON cases(incident_group_id) WHERE incident_group_id IS NOT NULL',
    // In-person DAC meetings the Admin schedules with the student (case detail → Send meeting reminder).
    `CREATE TABLE IF NOT EXISTS case_meetings (
      id SERIAL PRIMARY KEY,
      case_id INT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      student_id INT NOT NULL REFERENCES users(id),
      scheduled_at TIMESTAMPTZ NOT NULL,
      location TEXT NOT NULL,
      notes TEXT,
      created_by INT REFERENCES users(id),
      email_sent BOOLEAN NOT NULL DEFAULT FALSE,
      email_status TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    'CREATE INDEX IF NOT EXISTS case_meetings_case_id_idx ON case_meetings(case_id)',
    'CREATE INDEX IF NOT EXISTS case_meetings_student_idx ON case_meetings(student_id, scheduled_at)',
    // Demo fine payments (no real gateway); one SUCCESS payment per case.
    `CREATE TABLE IF NOT EXISTS case_payments (
      id SERIAL PRIMARY KEY,
      -- RESTRICT: payment records are financial history and must outlive edits; a paid case or
      -- its student cannot be deleted while payments reference them.
      student_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      case_id INT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
      transaction_id TEXT NOT NULL UNIQUE,
      -- Sent by the client once per checkout so a retried request never creates a second payment.
      idempotency_key TEXT UNIQUE,
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      currency CHAR(3) NOT NULL DEFAULT 'INR',
      payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'SUCCESS', 'FAILED')),
      -- Only simulated payments exist; no real gateway is integrated.
      payment_type TEXT NOT NULL DEFAULT 'DEMO' CHECK (payment_type = 'DEMO'),
      payment_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    "CREATE UNIQUE INDEX IF NOT EXISTS case_payments_one_success_per_case_idx ON case_payments(case_id) WHERE payment_status = 'SUCCESS'",
    "CREATE INDEX IF NOT EXISTS case_payments_student_idx ON case_payments(student_id, created_at DESC)",
    // Consolidated payments: a header per transaction; case_payments rows are its lines.
    `CREATE TABLE IF NOT EXISTS payment_transactions (
      id SERIAL PRIMARY KEY,
      -- One consolidated payment covering one or more cases (its lines are case_payments rows).
      transaction_id TEXT NOT NULL UNIQUE,
      student_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      idempotency_key TEXT UNIQUE,
      total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
      currency CHAR(3) NOT NULL DEFAULT 'INR',
      case_count INT NOT NULL CHECK (case_count >= 1),
      payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'SUCCESS', 'FAILED')),
      payment_type TEXT NOT NULL DEFAULT 'DEMO' CHECK (payment_type = 'DEMO'),
      payment_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    "CREATE INDEX IF NOT EXISTS payment_transactions_student_idx ON payment_transactions(student_id, created_at DESC)",
    "ALTER TABLE case_payments ADD COLUMN IF NOT EXISTS payment_transaction_id INT REFERENCES payment_transactions(id) ON DELETE RESTRICT",
    "CREATE INDEX IF NOT EXISTS case_payments_transaction_idx ON case_payments(payment_transaction_id) WHERE payment_transaction_id IS NOT NULL",
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS created_by_role user_role',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()',
    'ALTER TABLE case_timeline ADD COLUMN IF NOT EXISTS external_case_id TEXT',
    'ALTER TABLE case_timeline ADD COLUMN IF NOT EXISTS performed_by_role user_role',
    'ALTER TABLE case_timeline ADD COLUMN IF NOT EXISTS notes TEXT',
    'CREATE UNIQUE INDEX IF NOT EXISTS users_enrollment_no_unique_idx ON users(enrollment_no) WHERE enrollment_no IS NOT NULL',
    'CREATE UNIQUE INDEX IF NOT EXISTS cases_external_case_id_unique_idx ON cases(external_case_id) WHERE external_case_id IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS cases_student_id_idx ON cases(student_id)',
    'CREATE INDEX IF NOT EXISTS cases_offense_type_idx ON cases(offense_type)',
    'CREATE INDEX IF NOT EXISTS cases_substance_type_idx ON cases(substance_type)',
    'CREATE INDEX IF NOT EXISTS cases_status_idx ON cases(status)',
    'CREATE INDEX IF NOT EXISTS cases_incident_date_idx ON cases(incident_date)',
    'CREATE INDEX IF NOT EXISTS cases_created_by_idx ON cases(created_by)',
    'CREATE INDEX IF NOT EXISTS case_timeline_case_id_idx ON case_timeline(case_id)',
    'CREATE INDEX IF NOT EXISTS evidence_case_id_idx ON evidence(case_id)',
    'CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id, created_at DESC)',
    `CREATE TABLE IF NOT EXISTS rag_documents (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'case_documents',
      document_type TEXT NOT NULL DEFAULT 'case_document',
      document_id TEXT,
      content TEXT NOT NULL,
      content_hash TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    "ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'case_documents'",
    "ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'case_document'",
    'ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS document_id TEXT',
    'ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS content_hash TEXT',
    "ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb",
    'ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()',
    'CREATE INDEX IF NOT EXISTS rag_documents_source_idx ON rag_documents(source)',
    'CREATE INDEX IF NOT EXISTS rag_documents_doc_type_idx ON rag_documents(document_type)',
    'CREATE INDEX IF NOT EXISTS rag_documents_doc_id_idx ON rag_documents(document_id)',
    'CREATE INDEX IF NOT EXISTS rag_documents_content_hash_idx ON rag_documents(content_hash)',
    'CREATE INDEX IF NOT EXISTS rag_documents_metadata_idx ON rag_documents USING GIN (metadata)',
    'CREATE INDEX IF NOT EXISTS case_timeline_external_case_id_idx ON case_timeline(external_case_id)',
    'CREATE UNIQUE INDEX IF NOT EXISTS case_timeline_external_event_timestamp_unique_idx ON case_timeline(external_case_id, event, timestamp) WHERE external_case_id IS NOT NULL',
    `
    DO $$
    BEGIN
      BEGIN
        CREATE EXTENSION IF NOT EXISTS vector;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'pgvector extension could not be enabled: %', SQLERRM;
      END;

      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS embedding vector(768);
        BEGIN
          CREATE INDEX IF NOT EXISTS rag_documents_embedding_hnsw_idx 
          ON rag_documents USING hnsw (embedding vector_cosine_ops);
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
    END
    $$;
    `,
  ];

  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (err) {
      console.warn(`Bootstrap statement warning (${err.message}):`, statement.slice(0, 80));
    }
  }

  // Ensure default demo/test student 240123 exists
  try {
    const u = await pool.query(`
      INSERT INTO users (name, email, role, program, enrollment_no, year, hostel, room, student_status)
      VALUES ('Aarav Sharma', 'aarav.sharma@dac.edu', 'student', 'btech', '240123', 3, 'APJ', 'B-204', 'active')
      ON CONFLICT (email) DO UPDATE SET enrollment_no = '240123', name = 'Aarav Sharma', hostel = 'APJ', room = 'B-204'
      RETURNING id
    `);
    if (u.rows[0]?.id) {
      await pool.query(`
        INSERT INTO cases (
          student_id, external_case_id, offense_type, substance_type, offense_level, severity,
          penalty_points, fine, incident_date, incident_location, description, status, decision
        )
        VALUES (
          $1, 'DAC-2026-09001', 'Substance Abuse', 'Alcohol', 2, 'medium'::case_severity,
          25, 2500, '2026-02-10', 'Hostel APJ Room B-204',
          'Found in possession of alcohol bottle in room B-204 during hostel inspection.',
          'resolved'::case_status, 'Assigned 25 DAC penalty points and ₹2,500 fine with counseling.'
        )
        ON CONFLICT (external_case_id) WHERE external_case_id IS NOT NULL DO NOTHING
      `, [u.rows[0].id]);
    }
  } catch (err) {
    // Ignore if already configured or users table not yet ready
  }

  // Offence types (Register Case dropdown). Each rule in Rules & Policies has an offence_type.
  // Rules from the DAC/Unfair Means policies get theirs by name; only rules with no type yet are
  // filled, so a type the admin changed is kept. Then cases still stored under an older type
  // name are relabelled to the current one (1:1 rename; normally 0 rows after the first start).
  const policyRules = getDacPolicyRules();
  const renames = Object.entries(OFFENCE_TYPE_RENAMES);
  const offenceTypeStatements = [
    ['ALTER TABLE rules ADD COLUMN IF NOT EXISTS offence_type TEXT'],
    // Offence picked from Rules & Policies (text snapshot, so later rule edits keep the case's record).
    ['ALTER TABLE cases ADD COLUMN IF NOT EXISTS policy_offence TEXT'],
    [
      `UPDATE rules r SET offence_type = p.offence_type
       FROM unnest($1::text[], $2::text[]) AS p(question, offence_type)
       WHERE r.offence_type IS NULL AND LOWER(TRIM(r.question)) = LOWER(TRIM(p.question))`,
      [policyRules.map((r) => r.question), policyRules.map((r) => r.offence_type)],
    ],
    [
      `UPDATE cases c SET offense_type = m.new_name
       FROM unnest($1::text[], $2::text[]) AS m(old_name, new_name)
       WHERE c.offense_type = m.old_name`,
      [renames.map(([oldName]) => oldName), renames.map(([, newName]) => newName)],
    ],
  ];
  for (const [statement, params] of offenceTypeStatements) {
    try {
      await pool.query(statement, params);
    } catch (err) {
      console.warn(`Bootstrap statement warning (${err.message}):`, statement.slice(0, 80));
    }
  }

  // DAC points rule: a student's users.total_points is the sum of penalty_points of their cases
  // that are RESOLVED, excluding cases resolved with a warning. Points of pending cases never count.
  // The trigger below keeps the column in sync on every insert/update/delete of a case.
  // Runs last on every start: (re)creates the trigger, then corrects any stale totals
  // (normally 0 rows; it fixes totals written before the trigger existed or by seed imports).
  // The function and constraint text is kept identical to database/schema.sql.
  const pointsStatements = [
    `CREATE OR REPLACE FUNCTION refresh_student_total_points(sid INT) RETURNS void AS $$
DECLARE
  new_total INT;
BEGIN
  -- Lock the student row first: a concurrent transaction changing the same student's cases
  -- waits here until the other one commits or rolls back. NO KEY UPDATE (the lock an UPDATE of
  -- total_points takes anyway) does not conflict with the KEY SHARE locks that foreign-key
  -- checks take, so moving cases between students cannot deadlock on those.
  PERFORM 1 FROM users WHERE id = sid FOR NO KEY UPDATE;
  -- Separate statement, so under READ COMMITTED it takes a new snapshot taken after the
  -- lock was granted and therefore sees the other transaction's committed cases.
  SELECT COALESCE(SUM(c.penalty_points), 0)::int INTO new_total
  FROM cases c
  WHERE c.student_id = sid AND c.status = 'resolved' AND c.resolution_type IS DISTINCT FROM 'warning';
  UPDATE users SET total_points = new_total WHERE id = sid AND total_points IS DISTINCT FROM new_total;
END
$$ LANGUAGE plpgsql`,
    `CREATE OR REPLACE FUNCTION cases_total_points_trigger() RETURNS trigger AS $$
DECLARE
  old_sid INT := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.student_id END;
  new_sid INT := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.student_id END;
BEGIN
  IF old_sid IS NOT NULL AND new_sid IS NOT NULL AND old_sid <> new_sid THEN
    -- Case moved to another student: refresh both, lower id first, so two opposite moves
    -- lock the student rows in the same order and cannot deadlock.
    PERFORM refresh_student_total_points(LEAST(old_sid, new_sid));
    PERFORM refresh_student_total_points(GREATEST(old_sid, new_sid));
  ELSIF COALESCE(new_sid, old_sid) IS NOT NULL THEN
    PERFORM refresh_student_total_points(COALESCE(new_sid, old_sid));
  END IF;
  RETURN NULL;
END
$$ LANGUAGE plpgsql`,
    `DROP TRIGGER IF EXISTS cases_total_points ON cases`,
    `CREATE TRIGGER cases_total_points
  AFTER INSERT OR DELETE OR UPDATE OF status, resolution_type, penalty_points, student_id ON cases
  FOR EACH ROW EXECUTE FUNCTION cases_total_points_trigger()`,
    `DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cases_penalty_points_nonnegative' AND conrelid = 'cases'::regclass
  ) THEN
    ALTER TABLE cases ADD CONSTRAINT cases_penalty_points_nonnegative
      CHECK (penalty_points IS NULL OR penalty_points >= 0);
  END IF;
END
$$`,
    RECOMPUTE_STUDENT_POINTS_SQL,
  ];
  for (const statement of pointsStatements) {
    try {
      await pool.query(statement);
    } catch (err) {
      console.warn(`Bootstrap statement warning (${err.message}):`, statement.slice(0, 80));
    }
  }
}

