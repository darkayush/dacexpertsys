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
    student_status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS cases (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES users(id),
    external_case_id TEXT,
    enrollment_no TEXT,
    student_name TEXT,
    program TEXT,
    batch INT,
    gender TEXT,
    hostel TEXT,
    room TEXT,
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
CREATE INDEX IF NOT EXISTS cases_hostel_idx ON cases(hostel);
CREATE INDEX IF NOT EXISTS cases_status_idx ON cases(status);
CREATE INDEX IF NOT EXISTS cases_incident_date_idx ON cases(incident_date);
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