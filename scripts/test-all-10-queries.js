import pool from '../backend/config/db.js';
import { ensureWorkflowSchema } from '../backend/config/bootstrap.js';
import { answerChatbotQuestion } from '../backend/services/chatbot.service.js';

const mockUser = {
  id: 11,
  sub: 11,
  email: 'chief@test.com',
  role: 'chief_warden',
  name: 'Chief Warden',
};

async function testAll10() {
  console.log('================================================================');
  console.log('       TESTING ALL 10 REQUIRED OPEN-ENDED RAG QUERIES          ');
  console.log('================================================================\n');

  await ensureWorkflowSchema();

  const conversationId = `test-convo-${Date.now()}`;

  const queries = [
    {
      id: 1,
      q: 'What are the DAC points for weed?',
      expectIntent: 'policy',
      expectShowCases: false,
      mustMatch: /25|level 2|points/i,
      mustNotMatch: /Found \d+ matching/i,
    },
    {
      id: 2,
      q: 'One student was caught smoking weed near the campus. According to the available DAC policy, what points are associated with this kind of offence?',
      expectIntent: 'policy',
      expectShowCases: false,
      mustMatch: /25|level 2|points/i,
      mustNotMatch: /Found \d+ matching/i,
    },
    {
      id: 3,
      q: 'How many alcohol cases are present in the database?',
      expectIntent: 'count',
      expectShowCases: false,
      mustMatch: /\b\d+\b/,
      mustNotMatch: null,
    },
    {
      id: 4,
      q: 'Which hostel has recorded the highest number of alcohol-related cases?',
      expectIntent: 'count',
      expectShowCases: false,
      mustMatch: /APJ|BSH|VSB|GH|HBH/i,
      mustNotMatch: null,
    },
    {
      id: 5,
      q: 'Tell me the complete previous DAC history of enrollment 240123.',
      expectIntent: 'student_history',
      expectShowCases: false, // User asked "Tell me...", not "Show cases"
      mustMatch: /240123|points|record/i,
      mustNotMatch: null,
    },
    {
      id: 6,
      q: 'What happened in DAC-2026-00127?',
      expectIntent: 'case_detail',
      expectShowCases: false,
      mustMatch: /Divya|Sharma|Harassment|GH/i,
      mustNotMatch: null,
    },
    {
      id: 7,
      q: 'What is the disciplinary workflow from Warden to Admin?',
      expectIntent: 'workflow',
      expectShowCases: false,
      mustMatch: /Warden|Chief|DSW|Admin/i,
      mustNotMatch: null,
    },
    {
      id: 8,
      q: 'Has this student previously been involved in substance abuse?',
      expectIntent: 'student_history',
      expectShowCases: false,
      mustMatch: /substance|alcohol|cases?|record|points|240123/i,
      mustNotMatch: null,
    },
    {
      id: 9,
      q: 'Can you explain what the policy says about examination malpractice?',
      expectIntent: 'policy',
      expectShowCases: false,
      mustMatch: /Level 4|100|Critical|suspension|expulsion|malpractice/i,
      mustNotMatch: null,
    },
    {
      id: 10,
      q: "A student has a previous alcohol case and is now involved in another substance-related incident. Show me the student's previous history and explain what information in the policy is relevant.",
      expectIntent: 'student_history',
      expectShowCases: true, // User explicitly said "Show me the student's previous history"
      mustMatch: /multiplier|repeat|recidivism|1\.5|policy|points/i,
      mustNotMatch: null,
    },
  ];

  let passed = 0;

  for (const item of queries) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log(`\n------------------------------------------------------------`);
    console.log(`QUERY #${item.id}: "${item.q}"`);
    console.log(`------------------------------------------------------------`);

    const res = await answerChatbotQuestion(mockUser, item.q, conversationId);

    console.log(`[Intent]: ${res.intent}`);
    console.log(`[ShowCases]: ${res.showCases} (Cases returned: ${res.cases.length})`);
    console.log(`[Sources]: ${res.sources.map((s) => s.title || s.id).slice(0, 3).join(', ')}`);
    console.log(`[Answer Preview]:\n${res.answer.slice(0, 250)}...`);

    let ok = true;
    if (item.expectIntent && res.intent !== item.expectIntent) {
      console.error(`✗ Intent mismatch: expected ${item.expectIntent}, got ${res.intent}`);
      ok = false;
    }
    if (res.showCases !== item.expectShowCases) {
      console.error(`✗ ShowCases mismatch: expected ${item.expectShowCases}, got ${res.showCases}`);
      ok = false;
    }
    if (item.mustMatch && !item.mustMatch.test(res.answer)) {
      console.error(`✗ Answer failed to match required pattern: ${item.mustMatch}`);
      ok = false;
    }
    if (item.mustNotMatch && item.mustNotMatch.test(res.answer)) {
      console.error(`✗ Answer contained forbidden text matching: ${item.mustNotMatch}`);
      ok = false;
    }

    if (ok) {
      console.log(`✓ [PASS] Query #${item.id}`);
      passed += 1;
    } else {
      console.error(`✗ [FAIL] Query #${item.id}`);
    }
  }

  console.log(`\n============================================================`);
  console.log(`FINAL SCORE: ${passed}/${queries.length} queries passed`);
  console.log(`============================================================`);

  await pool.end();
  if (passed !== queries.length) {
    process.exit(1);
  }
}

testAll10().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
