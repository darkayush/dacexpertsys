import { answerChatbotQuestion, getStudentHistory } from '../services/chatbot.service.js';

export async function chatController(req, res) {
  try {
    const rawQuestion = req.body?.message || req.body?.question;
    const conversationId = req.body?.conversationId || null;

    if (!rawQuestion || typeof rawQuestion !== 'string' || !rawQuestion.trim()) {
      return res.status(400).json({ error: 'Please enter a question.' });
    }

    const response = await answerChatbotQuestion(req.user, rawQuestion.trim(), conversationId);

    // Ensure clean response payload (never leak raw embeddings, prompts, or SQL)
    return res.json({
      answer: response.answer || '',
      intent: response.intent || 'general_knowledge_base',
      showCases: Boolean(response.showCases),
      cases: response.cases || [],
      sources: response.sources || [],
      suggestedQuestions: response.suggestedQuestions || [],
    });
  } catch (error) {
    console.error('Chatbot Controller Error:', error);
    return res.status(500).json({
      error: 'Unable to answer this question right now. Please try again.',
      answer: "I couldn't process your request right now. Please try again shortly.",
      showCases: false,
      sources: [],
      cases: [],
      suggestedQuestions: [],
    });
  }
}

export async function studentHistoryController(req, res) {
  try {
    const data = await getStudentHistory(
      req.user,
      req.params.enrollmentNo,
      req.query?.substance_type,
      req.query?.offense_type
    );
    return data ? res.json(data) : res.status(404).json({ error: 'Student not found.' });
  } catch (error) {
    const status = error.message === 'FORBIDDEN' ? 403 : 500;
    return res.status(status).json({
      error: error.message === 'FORBIDDEN' ? 'Forbidden' : 'Unable to fetch student history.',
    });
  }
}

export default {
  chatController,
  studentHistoryController,
};
