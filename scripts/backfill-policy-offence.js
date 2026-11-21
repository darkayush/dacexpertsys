// Gives cases registered before Register Case linked to Rules & Policies a policy offence
// (cases.policy_offence), chosen from the rules of the case's offence type.
//
//   npm run cases:backfill-offence            dry run: prints what would change, writes nothing
//   npm run cases:backfill-offence -- --apply writes, in one transaction
//
// Only cases with no policy offence are touched, so running it again changes nothing.
// - A "Policy offence: ..." line in the notes (cases registered before the column existed) is
//   moved into the column and removed from the notes.
// - Otherwise a random rule of the case's offence type is picked AT THE CASE'S OWN LEVEL, so the
//   label agrees with the case's level and points. If the type has no rule at that level, the
//   nearest level is used (e.g. Plagiarism Level 2 -> minor or major). Types with no rules
//   (e.g. Other) are skipped.
// - offense_level is filled only where it is empty (from the chosen rule).
// Penalty points, fine, status and every other column are left as they are.
import process from 'process';
import pool from '../backend/config/db.js';
import { levelFromCategory } from '../backend/config/dacPolicy.js';

const APPLY = process.argv.includes('--apply');
// Note line written by Register Case before the column existed:
// "Policy offence: <rule question> (<rule category>, <points> pts)". Questions and categories can
// contain brackets, so the question is matched against the known rules (longest first).
const NOTE_LINE = /^Policy offence: (.*)$/m;

function parseNote(rest, rules) {
  const rule = rules
    .filter((r) => rest.startsWith(`${r.question} (`))
    .sort((a, b) => b.question.length - a.question.length)[0];
  if (rule) return { offence: rule.question, level: levelFromCategory(rest.slice(rule.question.length + 2)) };
  const loose = /^(.*) \((.*), \d+(?:\.\d+)? pts\)\s*$/.exec(rest);
  return loose ? { offence: loose[1], level: levelFromCategory(loose[2]) } : { offence: rest.trim(), level: null };
}

function pickRule(rules, level) {
  if (!rules.length) return null;
  let candidates = rules;
  if (level) {
    const distance = (r) => (r.level ? Math.abs(r.level - level) : Infinity);
    const best = Math.min(...rules.map(distance));
    candidates = rules.filter((r) => distance(r) === best);
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

async function main() {
  // The backend adds the column on start; add it here too (additive) unless this is a dry run.
  const hasColumn = (await pool.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'policy_offence'",
  )).rowCount > 0;
  if (!hasColumn && APPLY) await pool.query('ALTER TABLE cases ADD COLUMN IF NOT EXISTS policy_offence TEXT');

  const rules = (await pool.query(
    'SELECT id, question, category, offence_type FROM rules WHERE offence_type IS NOT NULL ORDER BY id',
  )).rows.map((r) => ({ ...r, level: levelFromCategory(r.category) }));
  const rulesByType = new Map();
  rules.forEach((r) => {
    if (!rulesByType.has(r.offence_type)) rulesByType.set(r.offence_type, []);
    rulesByType.get(r.offence_type).push(r);
  });

  const cases = (await pool.query(
    `SELECT id, offense_type, offense_level, notes FROM cases
     ${hasColumn || APPLY ? 'WHERE policy_offence IS NULL' : ''} ORDER BY id`,
  )).rows;

  const updates = [];
  const summary = new Map();
  let skipped = 0;
  for (const c of cases) {
    const noteMatch = NOTE_LINE.exec(c.notes || '');
    let offence;
    let level;
    let notes = c.notes;
    let setNotes = false;
    if (noteMatch) {
      ({ offence, level } = parseNote(noteMatch[1], rules));
      notes = c.notes.replace(NOTE_LINE, '').replace(/^\s*\n/, '').trim() || null;
      setNotes = true;
    } else {
      const rule = pickRule(rulesByType.get(c.offense_type) || [], c.offense_level);
      if (!rule) { skipped += 1; continue; }
      offence = rule.question;
      level = rule.level;
    }
    updates.push({ id: c.id, offence, level: c.offense_level ? null : level, notes, setNotes });
    const key = `${c.offense_type} | level ${c.offense_level ?? '-'} -> ${offence}`;
    summary.set(key, (summary.get(key) || 0) + 1);
  }

  console.log(`Cases without a policy offence: ${cases.length}`);
  console.log(`Would set: ${updates.length}  (skipped, no rules for the type: ${skipped})`);
  console.log(`  from a "Policy offence:" note: ${updates.filter((u) => u.setNotes).length}`);
  console.log(`  empty offence level filled: ${updates.filter((u) => u.level !== null).length}`);
  [...summary.entries()].sort().forEach(([k, n]) => console.log(`  ${String(n).padStart(5)}  ${k}`));

  if (!APPLY) {
    console.log('\nDry run: nothing written. Re-run with --apply to write.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE cases c
       SET policy_offence = v.offence,
           offense_level = COALESCE(c.offense_level, v.level),
           notes = CASE WHEN v.set_notes THEN v.notes ELSE c.notes END
       FROM unnest($1::int[], $2::text[], $3::int[], $4::text[], $5::bool[]) AS v(id, offence, level, notes, set_notes)
       WHERE c.id = v.id AND c.policy_offence IS NULL`,
      [
        updates.map((u) => u.id),
        updates.map((u) => u.offence),
        updates.map((u) => u.level),
        updates.map((u) => u.notes),
        updates.map((u) => u.setNotes),
      ],
    );
    await client.query('COMMIT');
    console.log(`\nUpdated ${result.rowCount} cases.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => { console.error('Backfill failed:', error.message); process.exitCode = 1; })
  .finally(() => pool.end());
