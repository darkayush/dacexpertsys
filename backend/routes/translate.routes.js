import { Router } from 'express';
import { requireRoles } from '../middleware/auth.middleware.js';
import { groqGenerate, isGroqConfigured } from '../services/groqService.js';

const router = Router();

const MAX_TEXT_LENGTH = 6000;

const SYSTEM_INSTRUCTION = `You translate spoken incident reports for a university disciplinary office.
Translate the user's Hindi (or mixed Hindi-English) text into clear, natural English.
Keep names, room numbers, places, times and numbers exactly as given.
Do not add, remove, summarise or explain anything.
Reply with the English translation only.`;

// POST /api/translate/hi-en { text } -> { translation }
// Used by the Register Case voice input: Hindi speech is transcribed in the browser,
// then translated here with Groq (GROQ_MODEL, default openai/gpt-oss-120b).
// API keys stay on the backend.
router.post('/hi-en', requireRoles('warden', 'chief_warden'), async (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({ error: `text must be at most ${MAX_TEXT_LENGTH} characters` });
  }
  if (!isGroqConfigured()) {
    return res.status(503).json({ error: 'Translation is not configured. Set GROQ_API_KEY in .env.' });
  }

  try {
    const request = { prompt: text, systemInstruction: SYSTEM_INSTRUCTION, temperature: 0 };
    const { text: translation } = await groqGenerate(request);
    if (!translation) {
      return res.status(502).json({ error: 'The translation came back empty. Please try again.' });
    }
    return res.status(200).json({ translation });
  } catch (error) {
    console.error('Translation error:', error?.message || error);
    return res.status(502).json({ error: 'Translation failed. Please try again.' });
  }
});

export default router;
