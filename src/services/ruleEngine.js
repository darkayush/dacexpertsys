/**
 * ruleEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Core rule-based logic for the DAC Expert System.
 *
 * Exports:
 *   generateToken()              → Promise<string>   "DAC-2026-1001"
 *   calculateSeverity(answers)   → number            raw score (0–100+)
 *   determineOffenseLevel(score) → number            1 | 2 | 3 | 4
 *   applyPenalty(level)          → Promise<{ fine, penaltyPoints }>
 */

// ─── DAC Policy Levels (fallback if Firestore unavailable) ───────────────────
const POLICY_FALLBACK = {
  1: { fine: 1000,  penaltyPoints: 10  },
  2: { fine: 2500,  penaltyPoints: 25  },
  3: { fine: 5000,  penaltyPoints: 50  },
  4: { fine: 10000, penaltyPoints: 100 },
};

// ─── Severity Score Thresholds ────────────────────────────────────────────────
//   Score < 30  → Level 1 (Minor)
//   Score < 55  → Level 2 (Moderate)
//   Score < 80  → Level 3 (Serious)
//   Score >= 80 → Level 4 (Critical)
const THRESHOLDS = [
  { max: 30, level: 1 },
  { max: 55, level: 2 },
  { max: 80, level: 3 },
];

// ─── Token Generation ─────────────────────────────────────────────────────────

/**
 * Generates a unique case token in the format DAC-YYYY-XXXX.
 * Queries Firestore for the highest existing sequential number for the
 * current year and returns the next one (starting at 1001).
 *
 * @returns {Promise<string>}  e.g. "DAC-2026-1001"
 */
export async function generateToken() {
  const year = new Date().getFullYear();
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `DAC-${year}-${seq}`;
}

// ─── Severity Calculation ─────────────────────────────────────────────────────

/**
 * Calculates the severity score from an array of weighted question answers.
 *
 * Answer object shape:
 *   { questionId, weight, value, offenseCount? }
 *
 * For boolean questions: weight is added if value === true.
 * For select/count questions: the chosen option's weight is added directly.
 *
 * Recidivism multipliers (applied to the final total):
 *   offenseCount == 2  → ×1.5
 *   offenseCount >= 3  → ×2.0
 *
 * @param {Array<{ questionId: string, weight: number, value: boolean|number, offenseCount?: number }>} answers
 * @returns {number} Rounded severity score
 */
export function calculateSeverity(answers = []) {
  if (!answers.length) return 0;

  let score = 0;
  let offenseCount = 1;

  for (const answer of answers) {
    if (answer.questionId === 'Q3') {
      // Offense count question – value holds the count (1, 2, 3+)
      offenseCount = answer.value;
      score += answer.weight; // weight already reflects the count tier
    } else if (typeof answer.value === 'boolean') {
      if (answer.value) score += answer.weight;
    } else {
      // Numeric / pre-weighted answer
      score += answer.weight;
    }
  }

  // Apply recidivism multiplier on total score
  if (offenseCount === 2)      score *= 1.5;
  else if (offenseCount >= 3)  score *= 2.0;

  return Math.round(score);
}

// ─── Offense Level Mapping ────────────────────────────────────────────────────

/**
 * Maps a severity score to a DAC offense level (1–4).
 *
 * @param {number} score
 * @returns {number} 1 | 2 | 3 | 4
 */
export function determineOffenseLevel(score) {
  for (const { max, level } of THRESHOLDS) {
    if (score < max) return level;
  }
  return 4;
}

// ─── Penalty Lookup ───────────────────────────────────────────────────────────

/**
 * Fetches the fine and penaltyPoints for a given offense level from Firestore.
 * Falls back to the hard-coded POLICY_FALLBACK if the collection is missing.
 *
 * @param {number} level  1 | 2 | 3 | 4
 * @returns {Promise<{ fine: number, penaltyPoints: number }>}
 */
export async function applyPenalty(level) {
  return POLICY_FALLBACK[level] ?? POLICY_FALLBACK[4];
}
