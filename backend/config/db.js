import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

// DATABASE_URL (Supabase) takes precedence over the local PG_* settings.
// Supabase signs its certificates with its own root CA, pinned here for verified TLS.
const pool = process.env.DATABASE_URL
  ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { ca: fs.readFileSync(path.resolve(__dirname, 'supabase-ca.crt'), 'utf8') },
  })
  : new Pool({
    host: process.env.PG_HOST || process.env.PGHOST || 'localhost',
    user: process.env.PG_USER || process.env.PGUSER || 'postgres',
    database: process.env.PG_DATABASE || process.env.PGDATABASE || 'dac_system',
    password: process.env.PG_PASSWORD || process.env.PGPASSWORD || 'your_postgres_password',
    port: Number(process.env.PG_PORT || process.env.PGPORT) || 5432,
  });

export default pool;
