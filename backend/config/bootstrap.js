import pool from './db.js';

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
      INSERT INTO users (name, email, role, program, enrollment_no, year, hostel, room, total_points, student_status)
      VALUES ('Aarav Sharma', 'aarav.sharma@dac.edu', 'student', 'btech', '240123', 3, 'APJ', 'B-204', 25, 'active')
      ON CONFLICT (email) DO UPDATE SET enrollment_no = '240123', name = 'Aarav Sharma', hostel = 'APJ', room = 'B-204', total_points = 25
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
}

