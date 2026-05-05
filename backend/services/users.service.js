import pool from '../config/db.js';

export async function getAllUsersService({ excludeRole } = {}) {
  const values = [];
  let whereClause = '';

  if (excludeRole) {
    values.push(excludeRole);
    whereClause = `WHERE role != $${values.length}`;
  }

  const result = await pool.query(
    `
    SELECT
      id,
      name,
      email,
      role,
      program,
      enrollment_no,
      year,
      hostel,
      room,
      total_points
    FROM users
    ${whereClause}
  `,
    values,
  );
  return result.rows;
}

export async function getUserByIdService(userId) {
  const result = await pool.query(
    `
    SELECT
      id,
      name,
      email,
      role,
      program,
      enrollment_no,
      year,
      hostel,
      room,
      total_points
    FROM users
    WHERE id = $1
  `,
    [userId],
  );
  return result.rows[0] || null;
}

export async function createUserService({
  name,
  email,
  password,
  role,
  program = null,
  enrollment_no = null,
  year = null,
  hostel = null,
  room = null,
}) {
  const query = `
    INSERT INTO users (name, email, password, role, program, enrollment_no, year, hostel, room)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, name, email, role, program, enrollment_no, year, hostel, room, total_points
  `;
  const result = await pool.query(query, [
    name,
    String(email || '').trim().toLowerCase(),
    password || null,
    role,
    program,
    enrollment_no,
    year,
    hostel,
    room,
  ]);
  return result.rows[0] || null;
}

export async function updateUserService(userId, payload) {
  const updates = [];
  const values = [];

  const allowed = {
    name: 'name',
    email: 'email',
    role: 'role',
    program: 'program',
    enrollment_no: 'enrollment_no',
    year: 'year',
    hostel: 'hostel',
    room: 'room',
  };

  Object.entries(allowed).forEach(([key, column]) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      const value = key === 'email'
        ? String(payload[key] || '').trim().toLowerCase()
        : payload[key];
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    }
  });

  if (!updates.length) {
    return getUserByIdService(userId);
  }

  values.push(userId);
  const query = `
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING id, name, email, role, program, enrollment_no, year, hostel, room, total_points
  `;
  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

export async function deleteUserService(userId) {
  const result = await pool.query(
    'DELETE FROM users WHERE id = $1 RETURNING id, name, email, role',
    [userId],
  );
  return result.rows[0] || null;
}

export async function updateUserRoleService(userId, role) {
  const query = `
    UPDATE users
    SET role = $2
    WHERE id = $1
    RETURNING id, name, email, role, program, enrollment_no, year, hostel, room, total_points
  `;
  const result = await pool.query(query, [userId, role]);
  return result.rows[0] || null;
}

export async function resetUserPasswordService(userId, passwordHash) {
  const query = `
    UPDATE users
    SET password = $2
    WHERE id = $1
    RETURNING id, name, email, role
  `;
  const result = await pool.query(query, [userId, passwordHash]);
  return result.rows[0] || null;
}
