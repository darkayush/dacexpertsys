import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../backend/config/db.js';
import { ensureWorkflowSchema } from '../backend/config/bootstrap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = process.env.DAC_DATA_DIR || path.join(process.env.HOME || '', 'Downloads');
const files = {
  users: path.join(dataDir, 'dac_users_synthetic_2005_updated_batch_parent_hostels_points.csv'),
  cases: path.join(dataDir, 'dac_cases_5000_with_fine.csv'),
  timeline: path.join(dataDir, 'case_timeline_synthetic.csv'),
  documents: path.join(dataDir, 'case_documents_5000.jsonl'),
  seedSql: path.resolve(__dirname, '../database/seed.sql'),
};

function nullable(value) {
  const v = String(value ?? '').trim();
  return v && v.toLowerCase() !== 'null' ? v : null;
}

function num(value) {
  const v = nullable(value);
  return v === null || Number.isNaN(Number(v)) ? null : Number(v);
}

function csv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (c === '"') {
      quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && next === '\n') i += 1;
      row.push(value);
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += c;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const [headers, ...body] = rows;
  return body.map((cells) => Object.fromEntries(headers.map((key, i) => [key, cells[i] ?? ''])));
}

function readCsv(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing data file: ${file}`);
  return csv(fs.readFileSync(file, 'utf8'));
}

function severity(level) {
  return Number(level) >= 4 ? 'critical' : Number(level) === 3 ? 'high' : Number(level) === 2 ? 'medium' : 'low';
}

function safeRole(value) {
  return ['student', 'warden', 'chief_warden', 'dsw', 'admin'].includes(nullable(value)) ? nullable(value) : null;
}

function safeStatus(value) {
  return ['pending_chief', 'pending_dsw', 'pending_admin', 'resolved'].includes(nullable(value))
    ? nullable(value)
    : 'pending_chief';
}

async function importFromCsv(client) {
  console.log('Importing from CSV files in', dataDir);
  // Import Users
  for (const r of readCsv(files.users)) {
    const role = safeRole(r.role) || 'student';
    await client.query(
      `INSERT INTO users (name,email,password,role,program,enrollment_no,year,hostel,room,total_points,parent_email,gender,student_status)
       VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role, program=EXCLUDED.program, enrollment_no=EXCLUDED.enrollment_no, year=EXCLUDED.year, hostel=EXCLUDED.hostel, room=EXCLUDED.room, total_points=EXCLUDED.total_points, parent_email=EXCLUDED.parent_email, gender=EXCLUDED.gender, student_status=EXCLUDED.student_status`,
      [
        nullable(r.name),
        nullable(r.email)?.toLowerCase(),
        role,
        nullable(r.program),
        nullable(r.enrollment_no),
        num(r.year),
        nullable(r.hostel),
        nullable(r.room),
        num(r.total_points) || 0,
        nullable(r.parent_email),
        nullable(r.gender),
        role === 'student' ? nullable(r.student_status) : null,
      ]
    );
  }

  // Import Cases
  for (const r of readCsv(files.cases)) {
    const student = await client.query('SELECT id FROM users WHERE enrollment_no = $1', [nullable(r.enrollment_no)]);
    if (!student.rows[0]) continue;
    await client.query(
      `INSERT INTO cases (student_id,external_case_id,offense_type,substance_type,offense_level,severity,penalty_points,fine,incident_date,incident_time,incident_location,alcohol_reading,description,notes,status,decision,resolved_by_role,resolved_at,created_by_role,assigned_to_role,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6::case_severity,$7,$8,$9,$10,$11,$12,$13,$14,$15::case_status,$16,$17::user_role,$18,$19::user_role,$20::user_role,$21,$21)
       ON CONFLICT (external_case_id) WHERE external_case_id IS NOT NULL DO UPDATE SET student_id=EXCLUDED.student_id,offense_type=EXCLUDED.offense_type,substance_type=EXCLUDED.substance_type,offense_level=EXCLUDED.offense_level,severity=EXCLUDED.severity,penalty_points=EXCLUDED.penalty_points,fine=EXCLUDED.fine,incident_date=EXCLUDED.incident_date,incident_time=EXCLUDED.incident_time,incident_location=EXCLUDED.incident_location,alcohol_reading=EXCLUDED.alcohol_reading,description=EXCLUDED.description,notes=EXCLUDED.notes,status=EXCLUDED.status,decision=EXCLUDED.decision,resolved_by_role=EXCLUDED.resolved_by_role,resolved_at=EXCLUDED.resolved_at,created_by_role=EXCLUDED.created_by_role,assigned_to_role=EXCLUDED.assigned_to_role,updated_at=NOW()`,
      [
        student.rows[0].id,
        nullable(r.case_id),
        nullable(r.offense_type),
        nullable(r.substance_type),
        num(r.offense_level),
        severity(r.offense_level),
        num(r.penalty_points) || 0,
        num(r.fine) || 0,
        nullable(r.incident_date),
        nullable(r.incident_time),
        nullable(r.incident_location),
        num(r.alcohol_reading),
        nullable(r.description),
        nullable(r.notes),
        safeStatus(r.status),
        nullable(r.decision),
        safeRole(r.resolved_by_role),
        nullable(r.resolved_at),
        safeRole(r.created_by_role),
        safeRole(r.assigned_to_role),
        nullable(r.created_at) || nullable(r.incident_date),
      ]
    );
  }

  // Import Timeline
  for (const r of readCsv(files.timeline)) {
    await client.query(
      `INSERT INTO case_timeline (case_id,external_case_id,event,performed_by_role,timestamp,notes)
       SELECT id,$1,$2,$3::user_role,$4,$5 FROM cases WHERE external_case_id=$1
       ON CONFLICT (external_case_id,event,timestamp) WHERE external_case_id IS NOT NULL DO NOTHING`,
      [
        nullable(r.case_id),
        nullable(r.event),
        safeRole(r.performed_by_role),
        nullable(r.timestamp),
        nullable(r.notes),
      ]
    );
  }

  // Import Documents
  if (fs.existsSync(files.documents)) {
    for (const line of fs.readFileSync(files.documents, 'utf8').split(/\r?\n/)) {
      if (!line.trim()) continue;
      const d = JSON.parse(line);
      await client.query(
        `INSERT INTO rag_documents (id,content,metadata,updated_at)
         VALUES ($1,$2,$3,NOW())
         ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,metadata=EXCLUDED.metadata,updated_at=NOW()`,
        [String(d.id), String(d.text || ''), d.metadata || {}]
      );
    }
  }
}

async function importFromSeedSql(client) {
  if (!fs.existsSync(files.seedSql)) {
    throw new Error(`Seed SQL file not found at: ${files.seedSql}`);
  }
  console.log('Seeding database directly from:', files.seedSql);
  const sql = fs.readFileSync(files.seedSql, 'utf8');
  await client.query(sql);
}

async function main() {
  await ensureWorkflowSchema();
  const client = await pool.connect();
  try {
    const csvAvailable = fs.existsSync(files.users) && fs.existsSync(files.cases);
    if (csvAvailable) {
      await client.query('BEGIN');
      await importFromCsv(client);
      await client.query('COMMIT');
    } else {
      // Use repository database/seed.sql directly
      await importFromSeedSql(client);
    }

    const counts = await Promise.all(
      ['users', 'cases', 'case_timeline', 'rag_documents', 'notifications'].map(async (table) => [
        table,
        Number((await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`)).rows[0].count),
      ])
    );
    const students = Number(
      (await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role='student'")).rows[0].count
    );
    console.log('Database seeded successfully:');
    console.log(Object.fromEntries([...counts, ['students', students]]));
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
