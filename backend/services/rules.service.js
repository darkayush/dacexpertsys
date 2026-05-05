import pool from '../config/db.js';

export async function getRulesService() {
  const result = await pool.query('SELECT id, question, weight, category FROM rules ORDER BY id ASC');
  return result.rows;
}

export async function createRuleService({ question, weight, category }) {
  const query = `
    INSERT INTO rules (question, weight, category)
    VALUES ($1, $2, $3)
    RETURNING id, question, weight, category
  `;
  const result = await pool.query(query, [question, weight, category || null]);
  return result.rows[0] || null;
}

export async function updateRuleService(ruleId, payload = {}) {
  const { question, weight, category } = payload;
  const updates = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(payload, 'question')) {
    values.push(question);
    updates.push(`question = $${values.length}`);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'weight')) {
    values.push(weight);
    updates.push(`weight = $${values.length}`);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'category')) {
    values.push(category);
    updates.push(`category = $${values.length}`);
  }

  if (!updates.length) {
    const existing = await pool.query('SELECT id, question, weight, category FROM rules WHERE id = $1', [ruleId]);
    return existing.rows[0] || null;
  }

  values.push(ruleId);
  const query = `
    UPDATE rules
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING id, question, weight, category
  `;
  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

export async function deleteRuleService(ruleId) {
  const result = await pool.query('DELETE FROM rules WHERE id = $1 RETURNING id, question, weight, category', [ruleId]);
  return result.rows[0] || null;
}

export async function seedRulesService(rules, { force = false } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT COUNT(*)::int AS count FROM rules');
    const count = existing.rows[0]?.count || 0;

    if (count > 0 && !force) {
      await client.query('COMMIT');
      return { seeded: false, count };
    }

    if (force) {
      await client.query('DELETE FROM rules');
    }

    for (const rule of rules) {
      await client.query(
        'INSERT INTO rules (question, weight, category) VALUES ($1, $2, $3)',
        [rule.question, rule.weight, rule.category || null],
      );
    }

    await client.query('COMMIT');
    return { seeded: true, count: rules.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
