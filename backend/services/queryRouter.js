/**
 * queryRouter.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Intent classification and parameter extraction for the open-ended DAC RAG Chatbot.
 * Distinguishes policy inquiries, student/case lookups, counts, workflows, and enforces
 * the Critical Response Rule (Rule 9: No case cards unless explicitly requested).
 */

const STATUS_MAP = {
  'chief warden': 'pending_chief',
  chief: 'pending_chief',
  dsw: 'pending_dsw',
  admin: 'pending_admin',
  resolved: 'resolved',
  pending: 'pending_chief',
};

const SUBSTANCE_KEYWORDS = {
  weed: 'Weed',
  cannabis: 'Weed',
  marijuana: 'Weed',
  ganja: 'Weed',
  hash: 'Weed',
  pot: 'Weed',
  alcohol: 'Alcohol',
  liquor: 'Alcohol',
  beer: 'Alcohol',
  wine: 'Alcohol',
  booze: 'Alcohol',
  drink: 'Alcohol',
  cigarette: 'Cigarette',
  cigarettes: 'Cigarette',
  smoking: 'Cigarette',
  smoke: 'Cigarette',
  tobacco: 'Cigarette',
  vape: 'Cigarette',
};

const OFFENSE_KEYWORDS = {
  'substance abuse': 'Substance Abuse',
  substance: 'Substance Abuse',
  drugs: 'Substance Abuse',
  harassment: 'Harassment',
  bullying: 'Harassment',
  vandalism: 'Vandalism',
  damage: 'Vandalism',
  disruption: 'Disruption',
  noise: 'Disruption',
  disturbance: 'Disruption',
  attendance: 'Attendance',
  absent: 'Attendance',
  ragging: 'Ragging',
  'examination malpractice': 'Exam Malpractice',
  malpractice: 'Exam Malpractice',
  cheating: 'Exam Malpractice',
};

const HOSTEL_KEYWORDS = ['apj', 'bsh', 'vsb', 'hbh', 'gh'];

const PROGRAM_MAP = {
  'b.tech': 'btech',
  'b tech': 'btech',
  btech: 'btech',
  'b.b.a': 'bba',
  'b ba': 'bba',
  bba: 'bba',
  'm.b.a': 'mba',
  'm ba': 'mba',
  mba: 'mba',
  'b.a.ll.b': 'ballb',
  'b.a. ll.b': 'ballb',
  'ba-llb': 'ballb',
  'ba llb': 'ballb',
  ballb: 'ballb',
  'b.com': 'bcom',
  'b com': 'bcom',
  bcom: 'bcom',
};

/**
 * Classifies a user question and extracts metadata filters.
 *
 * @param {string} rawQuestion - User query string
 * @param {object} contextState - Prior conversational state (e.g. active student enrollment or case ID)
 * @returns {object} { intent, filters, showCases, requires_case_records }
 */
export function routeQuery(rawQuestion, contextState = {}) {
  const text = String(rawQuestion || '').trim();
  const q = text.toLowerCase();

  // 1. Extract Entities
  const caseIdMatch = text.match(/\bDAC[-\s]?\d{4}[-\s]?\d+\b/i);
  const wantsThisCase = /\b(this case|same case|the case|that case)\b/i.test(q);
  const caseId = caseIdMatch
    ? caseIdMatch[0].replace(/\s+/g, '-').toUpperCase()
    : (wantsThisCase ? (contextState.lastCaseId || null) : null);

  const enrollmentMatch = text.match(/\b\d{6}\b/) || text.match(/\b(?:enrollment|student)\s*[:#]?\s*(\d{5,8})\b/i);
  let enrollmentNo = enrollmentMatch ? (enrollmentMatch[1] || enrollmentMatch[0]) : null;

  // Handle conversational references ("this student", "the same student", "his cases", "her history")
  const wantsThisStudent = /\b(this student|same student|the student|his|her)\b/i.test(q);
  if (!enrollmentNo && wantsThisStudent && contextState.lastEnrollmentNo) {
    enrollmentNo = contextState.lastEnrollmentNo;
  }

  // Extract student name if explicitly given (e.g. "student Divya Sharma" or "about Sakshi Srivastava")
  let studentName = null;
  const nameMatch = text.match(/\b(?:student|about|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/);
  if (nameMatch && !/hostel|chief|warden|dsw|admin|disciplinary|university/i.test(nameMatch[1])) {
    studentName = nameMatch[1].trim();
  }

  let substanceType = null;
  for (const [kw, val] of Object.entries(SUBSTANCE_KEYWORDS)) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(q)) {
      substanceType = val;
      break;
    }
  }

  let offenseType = null;
  if (substanceType) {
    offenseType = 'Substance Abuse';
  } else {
    for (const [kw, val] of Object.entries(OFFENSE_KEYWORDS)) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(q)) {
        offenseType = val;
        break;
      }
    }
  }

  let hostel = null;
  const hostelPrefixMatch = q.match(/\b(?:in|for|from|at)\s+hostel\s+([a-z0-9-]+)\b/i);
  if (hostelPrefixMatch && HOSTEL_KEYWORDS.includes(hostelPrefixMatch[1].toLowerCase())) {
    hostel = hostelPrefixMatch[1].toUpperCase();
  } else {
    for (const h of HOSTEL_KEYWORDS) {
      const regex = new RegExp(`\\b${h}\\b`, 'i');
      if (regex.test(q)) {
        hostel = h.toUpperCase();
        break;
      }
    }
  }

  let status = null;
  for (const [kw, st] of Object.entries(STATUS_MAP)) {
    if (q.includes(`pending ${kw}`) || q.includes(`${kw} pending`) || (kw === 'resolved' && q.includes('resolved'))) {
      status = st;
      break;
    }
  }

  let program = null;
  for (const [kw, val] of Object.entries(PROGRAM_MAP)) {
    const escaped = kw.replace(/\./g, '\\.');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(q)) {
      program = val;
      break;
    }
  }

  let batch = null;
  const batchMatch = text.match(/\b(?:batch|year)\s*[:#]?\s*(202[3-6])\b/i) || text.match(/\b(202[3-6])\s*(?:batch)?\b/);
  if (batchMatch) {
    batch = parseInt(batchMatch[1] || batchMatch[0], 10);
  }

  let severity = null;
  for (const s of ['critical', 'high', 'medium', 'low']) {
    if (new RegExp(`\\b${s}\\b`, 'i').test(q)) {
      severity = s;
      break;
    }
  }

  let offenseLevel = null;
  const levelMatch = text.match(/\blevel\s*([1-4])\b/i);
  if (levelMatch) {
    offenseLevel = parseInt(levelMatch[1], 10);
  }

  let gender = null;
  if (/\b(female|women|girls?)\b/i.test(q)) {
    gender = 'female';
  } else if (/\b(male|boys?)\b/i.test(q) && !/female/i.test(q)) {
    gender = 'male';
  }

  const filters = {};
  if (caseId) filters.case_id = caseId;
  if (enrollmentNo) filters.enrollment_no = enrollmentNo;
  if (studentName) filters.student_name = studentName;
  if (substanceType) filters.substance_type = substanceType;
  if (offenseType) filters.offense_type = offenseType;
  if (hostel) filters.hostel = hostel;
  if (status) filters.status = status;
  if (program) filters.program = program;
  if (batch) filters.batch = batch;
  if (severity) filters.severity = severity;
  if (offenseLevel) filters.offense_level = offenseLevel;
  if (gender) filters.gender = gender;

  // 2. Classify Intent & showCases

  // Explicit case cards request (e.g. "show me weed cases", "display cases", "show cases for 240123")
  const wantsCaseList = /\b(show|list|display|give me|fetch|view)\b[\s\S]{0,35}\b(cases?|records?|history)\b/i.test(q)
    || /\b(show|list|display)\b[\s\S]{0,25}\b(alcohol|weed|cigarette|substance|harassment|vandalism)\s+cases?\b/i.test(q);

  // Workflow inquiries
  const isWorkflow = /\b(workflow|lifecycle|stages?|process|warden to admin|how does.*proceed|review process)\b/i.test(q);
  if (isWorkflow) {
    return {
      intent: 'workflow',
      filters,
      showCases: false,
      requires_case_records: false,
    };
  }

  // Count / Aggregations (how many, count of, which hostel has most, which program has most)
  const isCount = /\b(how many|count|number of|which hostel has the most|which hostel has most|which hostel has recorded the highest|which program has the most|which program has most|which program has recorded the highest|highest number of cases)\b/i.test(q);
  if (isCount) {
    return {
      intent: 'count',
      filters,
      showCases: false,
      requires_case_records: false,
    };
  }

  // Policy inquiries (Rule 9: NEVER show case cards for policy questions)
  // Check policy BEFORE case_detail unless explicit case ID is given in the text
  const isPolicyQuestion = /\b(dac points?|penalty points?|penalty|points?|fine|rules?|policy|level \d|punishment|what will be|what is the penalty|what are the|associated with this kind of off?ence|examination malpractice|malpractice)\b/i.test(q)
    || /\b(caught|found|guilty|smoking weed|drinking alcohol)\b/i.test(q);

  if (isPolicyQuestion && !caseIdMatch && !wantsCaseList) {
    return {
      intent: 'policy',
      filters,
      showCases: false,
      requires_case_records: false,
    };
  }

  // Specific student history or inquiry
  const isStudentQuestion = (enrollmentNo || studentName) || (contextState.lastEnrollmentNo && wantsThisStudent);
  if (isStudentQuestion) {
    return {
      intent: 'student_history',
      filters,
      showCases: wantsCaseList, // Only show case cards if user asked to show/list/display
      requires_case_records: wantsCaseList,
    };
  }

  // Specific Case detail lookup (e.g. "Tell me about DAC-2026-00127", "What happened in DAC-2026-00127?")
  if (caseId) {
    return {
      intent: 'case_detail',
      filters,
      showCases: wantsCaseList,
      requires_case_records: wantsCaseList,
    };
  }

  if (wantsCaseList) {
    return {
      intent: 'case_search',
      filters,
      showCases: true,
      requires_case_records: true,
    };
  }

  // Hybrid summarization request (e.g. "Summarize the recent weed-related cases")
  const isHybridSummary = /\b(summarize|summary|overview of)\b[\s\S]{0,30}\b(cases?|incidents?)\b/i.test(q);
  if (isHybridSummary) {
    return {
      intent: 'hybrid',
      filters,
      showCases: false,
      requires_case_records: false,
    };
  }

  // General open-ended RAG / Knowledge Base query
  return {
    intent: 'general_knowledge_base',
    filters,
    showCases: false,
    requires_case_records: false,
  };
}

export default {
  routeQuery,
};
