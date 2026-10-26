import pool from '../config/db.js';

export async function getUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const query = `
    SELECT id, name, email, password, role
    FROM users
    WHERE LOWER(email) = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [normalizedEmail]);
  return result.rows[0] || null;
}

export async function getUserAuthById(id) {
  const query = `
    SELECT id, name, email, password, role
    FROM users
    WHERE id = $1
    LIMIT 1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

export async function updateUserPasswordById(id, passwordHash) {
  const query = `
    UPDATE users
    SET password = $2
    WHERE id = $1
    RETURNING id, name, email, role
  `;
  const result = await pool.query(query, [id, passwordHash]);
  return result.rows[0] || null;
}

export async function createUserFromGoogle({ name, email, role }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const query = `
    INSERT INTO users (name, email, role, student_status)
    VALUES ($1, $2, $3, CASE WHEN $3::user_role = 'student' THEN 'active' END)
    RETURNING id, name, email, role
  `;
  const result = await pool.query(query, [name, normalizedEmail, role]);
  return result.rows[0] || null;
}
