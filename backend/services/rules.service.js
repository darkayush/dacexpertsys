import pool from '../config/db.js';
import { getDacPolicyRules } from '../config/dacPolicy.js';

export async function getRulesService() {
  const result = await pool.query('SELECT id, question, weight, category, offence_type FROM rules ORDER BY id ASC');
  return result.rows;
}

export async function createRuleService({ question, weight, category, offence_type: offenceType }) {
  const query = `
    INSERT INTO rules (question, weight, category, offence_type)
    VALUES ($1, $2, $3, $4)
    RETURNING id, question, weight, category, offence_type
  `;
  const result = await pool.query(query, [question, weight, category || null, offenceType || null]);
  return result.rows[0] || null;
}

export async function updateRuleService(ruleId, payload = {}) {
  const { question, weight, category, offence_type: offenceType } = payload;
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
  if (Object.prototype.hasOwnProperty.call(payload, 'offence_type')) {
    values.push(offenceType || null);
    updates.push(`offence_type = $${values.length}`);
  }

  if (!updates.length) {
    const existing = await pool.query('SELECT id, question, weight, category, offence_type FROM rules WHERE id = $1', [ruleId]);
    return existing.rows[0] || null;
  }

  values.push(ruleId);
  const query = `
    UPDATE rules
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING id, question, weight, category, offence_type
  `;
  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

export async function deleteRuleService(ruleId) {
  const result = await pool.query('DELETE FROM rules WHERE id = $1 RETURNING id, question, weight, category, offence_type', [ruleId]);
  return result.rows[0] || null;
}

/**
 * Loads the DAC Policy v2 offences as rules (weight = penalty points, category = level).
 * Adds missing ones and corrects points/level/offence type of existing ones (matched by name, case-insensitive).
 * With replace = true, rules that are not in the policy are deleted.
 */
export async function loadDacPolicyRulesService({ replace = false } = {}) {
  const policyRules = getDacPolicyRules();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let added = 0;
    let updated = 0;
    for (const rule of policyRules) {
      const result = await client.query(
        `UPDATE rules SET weight = $2, category = $3, offence_type = $4
         WHERE LOWER(TRIM(question)) = LOWER(TRIM($1))
         RETURNING id`,
        [rule.question, rule.weight, rule.category, rule.offence_type],
      );
      if (result.rowCount) {
        updated += result.rowCount;
      } else {
        await client.query(
          'INSERT INTO rules (question, weight, category, offence_type) VALUES ($1, $2, $3, $4)',
          [rule.question, rule.weight, rule.category, rule.offence_type],
        );
        added += 1;
      }
    }
    let removed = 0;
    if (replace) {
      const result = await client.query(
        'DELETE FROM rules WHERE NOT (LOWER(TRIM(question)) = ANY($1::text[]))',
        [policyRules.map((rule) => rule.question.trim().toLowerCase())],
      );
      removed = result.rowCount;
    }
    await client.query('COMMIT');
    return { added, updated, removed, total: policyRules.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
