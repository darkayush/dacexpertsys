import pool from '../config/db.js';
import { DAC_POLICY, UNFAIR_MEANS_POLICY } from '../config/dacPolicy.js';
import { groqGenerate, isGroqConfigured } from './groqService.js';

// AI penalty recommendation for one case (case page → "Generate recommendation").
// Groq reads the case, the student's earlier cases, the official policies and the admin's
// rules & weights, and suggests a DAC level, points, fine and reasoning. Advisory only:
// nothing is saved and the case is not changed.
// Privacy: the student's name and enrollment number are not sent to the model.

export function isRecommendationConfigured() {
  return isGroqConfigured();
}

const SYSTEM_INSTRUCTION = `You are an advisor to the Disciplinary Action Committee (DAC) of BML Munjal University.
Recommend a penalty for ONE case, strictly based on the official policy text, the rules list and the facts given.
- Use only DAC levels 1-4 with the policy's exact points and fines (Level 1: 10 pts / Rs 1000, Level 2: 25 / 2500, Level 3: 50 / 5000, Level 4: 100 / 10000), unless "no_penalty" or "warning" is clearly better.
- Exam offences: follow the Unfair Means Policy category and its DAC level.
- Consider prior cases: the policy says repeat offenders may be punished to a greater extent, and a first-time Level 1 keeps the scholarship.
- Say whether the student's total points after this case would reach 100 (barred from placement) or 200 (expulsion).
- Never invent facts. If information is missing, say so in "missing_information".
- The final decision belongs to the Committee; you only advise.
Reply with ONE JSON object and nothing else, with exactly these keys:
{
  "recommended_action": "short title, e.g. 'Level 2 penalty: 25 points + Rs 2,500 fine'",
  "dac_level": 1 | 2 | 3 | 4 | null,
  "penalty_points": number,
  "fine": number,
  "additional_measures": ["string", ...],
  "severity_score": number from 0 to 100,
  "risk_level": "Low" | "Moderate" | "High" | "Critical",
  "summary": "2-4 sentences explaining the recommendation",
  "factors": [{ "type": "aggravating" | "mitigating" | "history" | "evidence" | "policy", "title": "string", "detail": "string" }],
  "policy_references": ["quote or cite the exact policy line used", ...],
  "points_after_case": number,
  "threshold_warning": "string or null",
  "missing_information": ["string", ...],
  "confidence": "Low" | "Medium" | "High"
}`;

function formatPolicyForPrompt(rules) {
  const levels = DAC_POLICY.levels
    .map((l) => `Level ${l.level} (${l.points} points, fine Rs ${l.fine}): ${l.offences.join('; ')}`)
    .join('\n');
  const exam = UNFAIR_MEANS_POLICY.categories
    .map((c) => `Category ${c.category}${c.dacLevel ? ` (DAC Level ${c.dacLevel})` : ''}: ${c.punishment} Offences: ${c.offences.join('; ')}`)
    .join('\n');
  const ruleList = rules.length
    ? rules.map((r) => `- ${r.question} | ${r.category || 'no category'} | weight ${r.weight}`).join('\n')
    : '(none)';
  return `DAC POLICY v2 (${DAC_POLICY.reference}) offence levels:
${levels}
Point limits: ${DAC_POLICY.thresholds.map((t) => `${t.points} points: ${t.consequence}`).join(' ')}
Policy rules:
${DAC_POLICY.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

UNFAIR MEANS POLICY (${UNFAIR_MEANS_POLICY.reference}) for examinations:
${exam}
${UNFAIR_MEANS_POLICY.additional.join('\n')}

ADMIN RULES & WEIGHTS (weight = penalty points):
${ruleList}`;
}

function describeCase(c) {
  const lines = [
    ['Case', c.external_case_id || `#${c.id}`],
    ['Offence type', c.offense_type],
    ['Policy offence (from Rules & Policies)', c.policy_offence],
    ['Substance', c.substance_type],
    ['Recorded severity', c.severity],
    ['Recorded offence level', c.offense_level],
    ['Recorded penalty points', c.penalty_points],
    ['Incident date', c.incident_date ? new Date(c.incident_date).toISOString().slice(0, 10) : null],
    ['Incident time', c.incident_time],
    ['Location', c.incident_location || c.location],
    ['Alcohol reading', c.alcohol_reading],
    ['Status', c.status],
    ['Part of a group incident', c.incident_group_id ? 'yes' : null],
    ['Description', c.description],
    ['Notes', c.notes],
    ['Decision so far', c.decision],
  ];
  return lines
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => `${label}: ${String(value).slice(0, 2000)}`)
    .join('\n');
}

function extractJson(text) {
  const cleaned = String(text || '').replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('The AI reply was not JSON.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

const clampNumber = (value, min, max, fallback = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};
const asStringList = (value) => (Array.isArray(value) ? value.map(String).filter(Boolean).slice(0, 10) : []);

function normalise(raw) {
  const level = [1, 2, 3, 4].includes(Number(raw?.dac_level)) ? Number(raw.dac_level) : null;
  const factorTypes = new Set(['aggravating', 'mitigating', 'history', 'evidence', 'policy']);
  return {
    recommended_action: String(raw?.recommended_action || 'No recommendation'),
    dac_level: level,
    penalty_points: clampNumber(raw?.penalty_points, 0, 200),
    fine: clampNumber(raw?.fine, 0, 1000000),
    additional_measures: asStringList(raw?.additional_measures),
    severity_score: Math.round(clampNumber(raw?.severity_score, 0, 100)),
    risk_level: ['Low', 'Moderate', 'High', 'Critical'].includes(raw?.risk_level) ? raw.risk_level : 'Moderate',
    summary: String(raw?.summary || ''),
    factors: (Array.isArray(raw?.factors) ? raw.factors : []).slice(0, 8).map((f) => ({
      type: factorTypes.has(f?.type) ? f.type : 'policy',
      title: String(f?.title || ''),
      detail: String(f?.detail || ''),
    })).filter((f) => f.title || f.detail),
    policy_references: asStringList(raw?.policy_references),
    points_after_case: clampNumber(raw?.points_after_case, 0, 10000),
    threshold_warning: raw?.threshold_warning ? String(raw.threshold_warning) : null,
    missing_information: asStringList(raw?.missing_information),
    confidence: ['Low', 'Medium', 'High'].includes(raw?.confidence) ? raw.confidence : 'Medium',
  };
}

// Recent recommendations per case. Two requests for the same case at once (e.g. two admins
// or two browser tabs) share one Groq call, and a
// result is reused for a few minutes while the case is unchanged. Groq's free tier allows
// only about one recommendation per few seconds, so this avoids needless 429 errors.
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
const recommendationCache = new Map(); // caseId -> { key, promise, settled, at }

/**
 * Returns null when the case does not exist.
 * refresh: true generates a new recommendation instead of reusing a recent one.
 */
export async function generateCaseRecommendationService(caseId, { refresh = false } = {}) {
  const caseResult = await pool.query('SELECT * FROM cases WHERE id = $1', [caseId]);
  const target = caseResult.rows[0];
  if (!target) return null;
  // Only the final stage: the DSW has forwarded the case and the committee decides the penalty.
  if (target.status !== 'pending_admin') {
    const error = new Error('AI recommendations are only available for cases forwarded by the DSW for the final decision.');
    error.status = 409;
    throw error;
  }

  // Any edit to the case row changes the key, so a stale recommendation is never reused.
  const key = JSON.stringify(target);
  const cached = recommendationCache.get(caseId);
  if (cached && cached.key === key) {
    const inFlight = !cached.settled;
    const fresh = Date.now() - cached.at < CACHE_TTL_MS;
    // An in-flight call is always shared, even on refresh, so it is never sent twice.
    if (inFlight || (fresh && !refresh)) return cached.promise;
  }

  const entry = { key, settled: false, at: Date.now() };
  entry.promise = buildRecommendation(target).then(
    (result) => {
      entry.settled = true;
      entry.at = Date.now();
      return result;
    },
    (error) => {
      // Failures are not cached: the next request tries again.
      if (recommendationCache.get(caseId) === entry) recommendationCache.delete(caseId);
      throw error;
    },
  );
  recommendationCache.delete(caseId);
  recommendationCache.set(caseId, entry);
  if (recommendationCache.size > CACHE_MAX_ENTRIES) {
    recommendationCache.delete(recommendationCache.keys().next().value);
  }
  return entry.promise;
}

async function buildRecommendation(target) {
  const [historyResult, rulesResult] = await Promise.all([
    pool.query(
      `SELECT id, offense_type, severity, penalty_points, status, resolution_type, incident_date, created_at
       FROM cases
       WHERE student_id = $1 AND id <> $2
       ORDER BY COALESCE(incident_date, created_at::date) DESC
       LIMIT 20`,
      [target.student_id, target.id],
    ),
    pool.query('SELECT question, weight, category FROM rules ORDER BY id ASC LIMIT 120'),
  ]);

  const history = historyResult.rows;
  const priorPoints = history
    .filter((h) => h.status === 'resolved' && h.resolution_type !== 'warning')
    .reduce((sum, h) => sum + Number(h.penalty_points || 0), 0);
  const historyText = history.length
    ? history.map((h) => {
      const date = new Date(h.incident_date || h.created_at).toISOString().slice(0, 10);
      const outcome = h.resolution_type === 'warning' ? 'resolved with warning' : h.status;
      return `- ${date}: ${h.offense_type || 'unknown'} (severity ${h.severity}, ${h.penalty_points || 0} points, ${outcome})`;
    }).join('\n')
    : 'No earlier cases.';

  const prompt = `${formatPolicyForPrompt(rulesResult.rows)}

THIS CASE:
${describeCase(target)}

STUDENT'S EARLIER CASES (${history.length}):
${historyText}
Penalty points already awarded (resolved cases, excluding warnings): ${priorPoints}

Recommend the penalty for THIS CASE as the JSON object described.`;

  const { text, model } = await groqGenerate({
    prompt,
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0.2,
    maxTokens: 3000,
    responseFormat: { type: 'json_object' },
    timeoutMs: 45000,
  });

  return {
    case_id: target.id,
    model,
    generated_at: new Date().toISOString(),
    prior_cases: history.length,
    prior_points: priorPoints,
    ...normalise(extractJson(text)),
  };
}
