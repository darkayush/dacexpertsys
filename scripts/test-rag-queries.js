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

async function runTests() {
  console.log('====================================================');
  console.log('         DAC RAG CHATBOT VERIFICATION SUITE         ');
  console.log('====================================================\n');

  await ensureWorkflowSchema();

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total += 1;
    if (condition) {
      console.log(`✓ [PASS] ${message}`);
      passed += 1;
    } else {
      console.error(`✗ [FAIL] ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Policy inquiry for weed points
    // Rule 9: Must answer policy/points with NO case cards!
    // -------------------------------------------------------------
    console.log('Test 1: "What are the DAC points for weed?"');
    const t1 = await answerChatbotQuestion(mockUser, 'What are the DAC points for weed?');
    assert(t1.intent === 'policy', `Intent should be "policy" (got "${t1.intent}")`);
    assert(Array.isArray(t1.cases) && t1.cases.length === 0, `Cases must be empty (got ${t1.cases.length} cases)`);
    assert(/25|level 2|points/i.test(t1.answer), `Answer should explain penalty points or level (got "${t1.answer.slice(0, 100)}...")`);
    assert(Array.isArray(t1.sources) && t1.sources.length > 0, `Sources should be cited (got ${t1.sources.length} sources)`);
    console.log('---');

    console.log('Test 1B (Rule 9 Critical): "One student is caught smoking weed in campus, what will be the DAC points?"');
    const t1b = await answerChatbotQuestion(mockUser, 'One student is caught smoking weed in campus, what will be the DAC points?');
    assert(t1b.intent === 'policy', `Intent should be "policy" (got "${t1b.intent}")`);
    assert(Array.isArray(t1b.cases) && t1b.cases.length === 0, `Cases must be STRICTLY empty (got ${t1b.cases.length} cases)`);
    assert(!/Found \d+ matching/i.test(t1b.answer), 'Answer must NOT say "Found X matching cases"');
    assert(/25|level 2|points/i.test(t1b.answer), `Answer should explain policy points (got "${t1b.answer.slice(0, 100)}...")`);
    console.log('---');

    // -------------------------------------------------------------
    // Test 2: Exact count question
    // -------------------------------------------------------------
    console.log('Test 2: "How many alcohol cases?"');
    const t2 = await answerChatbotQuestion(mockUser, 'How many alcohol cases?');
    assert(t2.intent === 'count', `Intent should be "count" (got "${t2.intent}")`);
    assert(Array.isArray(t2.cases) && t2.cases.length === 0, `Cases must be empty for count query (got ${t2.cases.length} cases)`);
    assert(/\b\d+\b/.test(t2.answer), `Answer should state a numeric count (got "${t2.answer}")`);
    console.log('---');

    // -------------------------------------------------------------
    // Test 3: Explicit case search
    // -------------------------------------------------------------
    console.log('Test 3: "Show alcohol cases"');
    const t3 = await answerChatbotQuestion(mockUser, 'Show alcohol cases');
    assert(t3.intent === 'case_search', `Intent should be "case_search" (got "${t3.intent}")`);
    assert(Array.isArray(t3.cases) && t3.cases.length > 0, `Cases array must contain cards (got ${t3.cases.length} cases)`);
    assert(t3.cases[0].substance_type || t3.cases[0].offense_type, `First card should have offense details`);
    console.log('---');

    // -------------------------------------------------------------
    // Test 4: Student history query
    // -------------------------------------------------------------
    console.log('Test 4: "Show previous cases for 240123"');
    const t4 = await answerChatbotQuestion(mockUser, 'Show previous cases for 240123');
    assert(t4.intent === 'student_history', `Intent should be "student_history" (got "${t4.intent}")`);
    assert(Array.isArray(t4.cases), 'Cases should be returned as an array');
    assert(/240123/.test(t4.answer), 'Answer should mention the enrollment number');
    console.log('---');

    // -------------------------------------------------------------
    // Test 5: Specific case details
    // -------------------------------------------------------------
    console.log('Test 5: "Tell me about DAC-2026-00127"');
    const t5 = await answerChatbotQuestion(mockUser, 'Tell me about DAC-2026-00127');
    assert(t5.intent === 'case_detail', `Intent should be "case_detail" (got "${t5.intent}")`);
    assert(t5.sources.some((s) => s.id.includes('DAC-2026-00127') || s.case_id === 'DAC-2026-00127'), 'Sources should cite DAC-2026-00127');
    assert(/divya|sharma|harassment|dac-2026-00127/i.test(t5.answer), `Answer should describe case facts (got "${t5.answer.slice(0, 100)}...")`);
    console.log('---');

    // -------------------------------------------------------------
    // Test 6: Policy workflow explanation
    // -------------------------------------------------------------
    console.log('Test 6: "What is the DAC workflow?"');
    const t6 = await answerChatbotQuestion(mockUser, 'What is the DAC workflow?');
    assert(t6.intent === 'workflow', `Intent should be "workflow" (got "${t6.intent}")`);
    assert(t6.cases.length === 0, 'Cases array must be empty for workflow query');
    assert(/warden|chief|dsw|admin|stage/i.test(t6.answer), 'Answer should explain workflow stages');
    console.log('---');

    // -------------------------------------------------------------
    // Test 7: Unsupported question limitation
    // -------------------------------------------------------------
    console.log('Test 7: "What is the recipe for baking chocolate brownies?"');
    const t7 = await answerChatbotQuestion(mockUser, 'What is the recipe for baking chocolate brownies?');
    assert(
      /couldn't find enough information|DAC knowledge base|not found|unrelated/i.test(t7.answer) || t7.sources.length === 0,
      `Answer should declare knowledge base limitation (got "${t7.answer}")`
    );
    console.log('---');

    // -------------------------------------------------------------
    // Test 8: Knowledge Base Idempotency & Record Integrity
    // -------------------------------------------------------------
    console.log('Test 8: Database Integrity & Vector Storage Check');
    const totalDocs = (await pool.query('SELECT count(*)::int AS count FROM rag_documents')).rows[0].count;
    const policyDocs = (await pool.query("SELECT count(*)::int AS count FROM rag_documents WHERE document_type = 'dac_policy'")).rows[0].count;
    assert(totalDocs >= 10000, `Knowledge base should have >= 10,000 indexed records (found ${totalDocs})`);
    assert(policyDocs >= 7, `Knowledge base should contain policy records (found ${policyDocs})`);

    // Verify duplicate IDs do not exist
    const dupes = (await pool.query('SELECT id, COUNT(*) FROM rag_documents GROUP BY id HAVING COUNT(*) > 1')).rows;
    assert(dupes.length === 0, `There must be 0 duplicate document IDs in rag_documents (found ${dupes.length})`);
    console.log('---');

  } catch (err) {
    console.error('Fatal error during test suite:', err);
  } finally {
    await pool.end();
  }

  console.log('====================================================');
  console.log(`RESULTS: ${passed}/${total} assertions passed (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
