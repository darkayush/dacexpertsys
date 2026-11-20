-- ============================================================================
-- DAC EXPERT SYSTEM - DATABASE SCHEMA
-- ============================================================================

-- =========================
-- EXTENSIONS
-- =========================

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pgvector extension could not be enabled: %', SQLERRM;
END $$;

-- =========================
-- ENUMS
-- =========================

DO $$
BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'warden', 'chief_warden', 'dsw', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE case_status AS ENUM ('pending_chief', 'pending_dsw', 'pending_admin', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE case_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE program_type AS ENUM ('btech', 'bba', 'mba', 'ballb', 'bcom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================
-- TABLES
-- =========================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    role user_role NOT NULL,
    program program_type,
    enrollment_no TEXT,
    year INT,
    hostel TEXT,
    room TEXT,
    total_points INT DEFAULT 0,
    parent_email TEXT,
    gender TEXT,
    student_status TEXT,
    CONSTRAINT users_student_status_students_only CHECK (role = 'student' OR student_status IS NULL)
);

-- Student details (name, enrollment, program, hostel, room, gender) live in users;
-- read them through student_id.
CREATE TABLE IF NOT EXISTS cases (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES users(id),
    external_case_id TEXT,
    offense_type TEXT,
    substance_type TEXT,
    offense_level INT,
    severity case_severity NOT NULL,
    penalty_points INT DEFAULT 0,
    fine NUMERIC(12, 2) DEFAULT 0,
    incident_date DATE,
    incident_time TIME,
    incident_location TEXT,
    location TEXT,
    alcohol_reading NUMERIC(10, 2),
    description TEXT,
    notes TEXT,
    decision TEXT,
    status case_status NOT NULL DEFAULT 'pending_chief',
    created_by INT REFERENCES users(id),
    created_by_role user_role,
    reported_by INT REFERENCES users(id),
    assigned_to_role user_role,
    resolved_by INT REFERENCES users(id),
    resolved_by_role user_role,
    resolved_at TIMESTAMP,
    -- 'warning' when a reviewer closed the case by warning the student; NULL for a normal decision.
    resolution_type TEXT,
    -- Shared by the separate cases registered together as one group incident (e.g. GRP-2026-1A2B3C4D).
    incident_group_id TEXT,
    severity_score FLOAT,
    evidence_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_timeline (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(id),
    external_case_id TEXT,
    event TEXT NOT NULL,
    performed_by INT REFERENCES users(id),
    performed_by_role user_role,
    notes TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rules (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    weight FLOAT NOT NULL DEFAULT 1.0,
    category TEXT
);

CREATE TABLE IF NOT EXISTS evidence (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(id),
    file_url TEXT NOT NULL,
    file_type TEXT,
    uploaded_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    case_id INT REFERENCES cases(id),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rag_documents (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'case_documents',
    document_type TEXT NOT NULL DEFAULT 'case_document',
    document_id TEXT,
    content TEXT NOT NULL,
    content_hash TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Optional vector embedding column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS embedding vector(768);
  END IF;
END $$;

-- =========================
-- INDICES & CONSTRAINTS
-- =========================

CREATE UNIQUE INDEX IF NOT EXISTS users_enrollment_no_unique_idx 
    ON users(enrollment_no) WHERE enrollment_no IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cases_external_case_id_unique_idx 
    ON cases(external_case_id) WHERE external_case_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS case_timeline_external_event_timestamp_unique_idx 
    ON case_timeline(external_case_id, event, timestamp) WHERE external_case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS cases_student_id_idx ON cases(student_id);
CREATE INDEX IF NOT EXISTS cases_offense_type_idx ON cases(offense_type);
CREATE INDEX IF NOT EXISTS cases_substance_type_idx ON cases(substance_type);
CREATE INDEX IF NOT EXISTS cases_status_idx ON cases(status);
CREATE INDEX IF NOT EXISTS cases_incident_date_idx ON cases(incident_date);
CREATE INDEX IF NOT EXISTS cases_created_by_idx ON cases(created_by);
CREATE INDEX IF NOT EXISTS cases_incident_group_id_idx ON cases(incident_group_id) WHERE incident_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS case_timeline_case_id_idx ON case_timeline(case_id);
CREATE INDEX IF NOT EXISTS evidence_case_id_idx ON evidence(case_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS case_timeline_external_case_id_idx ON case_timeline(external_case_id);

CREATE INDEX IF NOT EXISTS rag_documents_source_idx ON rag_documents(source);
CREATE INDEX IF NOT EXISTS rag_documents_doc_type_idx ON rag_documents(document_type);
CREATE INDEX IF NOT EXISTS rag_documents_doc_id_idx ON rag_documents(document_id);
CREATE INDEX IF NOT EXISTS rag_documents_content_hash_idx ON rag_documents(content_hash);
CREATE INDEX IF NOT EXISTS rag_documents_metadata_idx ON rag_documents USING GIN (metadata);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rag_documents' AND column_name = 'embedding'
  ) THEN
    BEGIN
      CREATE INDEX IF NOT EXISTS rag_documents_embedding_hnsw_idx 
      ON rag_documents USING hnsw (embedding vector_cosine_ops);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

-- In-person DAC meetings the Admin schedules with the student (case detail -> Send meeting reminder).
CREATE TABLE IF NOT EXISTS case_meetings (
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
);
CREATE INDEX IF NOT EXISTS case_meetings_case_id_idx ON case_meetings(case_id);
CREATE INDEX IF NOT EXISTS case_meetings_student_idx ON case_meetings(student_id, scheduled_at);

-- Demo fine payments (no real gateway). One SUCCESS payment per case, enforced by the index below.
CREATE TABLE IF NOT EXISTS case_payments (
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
);
CREATE UNIQUE INDEX IF NOT EXISTS case_payments_one_success_per_case_idx ON case_payments(case_id) WHERE payment_status = 'SUCCESS';
CREATE INDEX IF NOT EXISTS case_payments_student_idx ON case_payments(student_id, created_at DESC);

-- Consolidated payments (dashboard "pay all"): one header, one case_payments line per case.
CREATE TABLE IF NOT EXISTS payment_transactions (
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
);
CREATE INDEX IF NOT EXISTS payment_transactions_student_idx ON payment_transactions(student_id, created_at DESC);
ALTER TABLE case_payments ADD COLUMN IF NOT EXISTS payment_transaction_id INT REFERENCES payment_transactions(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS case_payments_transaction_idx ON case_payments(payment_transaction_id) WHERE payment_transaction_id IS NOT NULL;
