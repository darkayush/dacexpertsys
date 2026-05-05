-- Workflow migration for existing databases
-- Run this once on an existing schema:
-- psql -U <user> -d <db> -f database/workflow_migration.sql

-- Add new workflow statuses if they do not exist yet.
ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'pending_chief';
ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'pending_dsw';
ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'pending_admin';
ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'resolved';

-- Add workflow columns on cases.
ALTER TABLE cases ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reported_by INT REFERENCES users(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS resolved_by INT REFERENCES users(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS assigned_to_role user_role;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS offense_type TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS status case_status;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS severity case_severity;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS incident_date DATE;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS penalty_points INT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS severity_score FLOAT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS evidence_url TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Notifications table compatibility updates.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS case_id INT REFERENCES cases(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- If an older notifications.read column exists, migrate values and drop old column.
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
$$;

-- Backfill cases created before workflow columns existed.
UPDATE cases
SET created_by = COALESCE(created_by, reported_by)
WHERE created_by IS NULL;

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
  END;
