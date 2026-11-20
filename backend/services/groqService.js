import dotenv from 'dotenv';

dotenv.config();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.GROQ_TIMEOUT_MS || '12000', 10);

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());
}

/**
 * Single-turn chat completion on Groq (OpenAI-compatible API).
 * Returns { text, model }. Throws on HTTP errors or timeout.
 */
export async function groqGenerate(options) {
  const configured = (process.env.GROQ_MODEL || '').trim() || DEFAULT_GROQ_MODEL;
  try {
    return await callGroqWithRetry(configured, options);
  } catch (error) {
    // Groq retires models; if GROQ_MODEL no longer exists, retry once with the default.
    if (error?.status === 404 && configured !== DEFAULT_GROQ_MODEL) {
      console.warn(`Groq model "${configured}" is unavailable; falling back to ${DEFAULT_GROQ_MODEL}.`);
      return callGroqWithRetry(DEFAULT_GROQ_MODEL, options);
    }
    throw error;
  }
}

// Rate limits (429, e.g. tokens per minute on the free tier) clear within seconds, so wait
// as long as Groq asks and try again instead of failing the request.
const RATE_LIMIT_RETRIES = 3;
const MAX_RATE_LIMIT_WAIT_MS = 15000;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGroqWithRetry(model, options) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await callGroq(model, options);
    } catch (error) {
      if (error?.status !== 429 || attempt >= RATE_LIMIT_RETRIES) throw error;
      const delay = Math.min(error.retryAfterMs || 2000 * (attempt + 1), MAX_RATE_LIMIT_WAIT_MS);
      console.warn(`Groq rate limit reached; retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${RATE_LIMIT_RETRIES}).`);
      await wait(delay + 250);
    }
  }
}

// Wait time from the Retry-After header or the "Please try again in 1.38s / 900ms" message.
function readRetryAfterMs(response, detail) {
  const header = Number(response.headers.get('retry-after'));
  if (Number.isFinite(header) && header > 0) return header * 1000;
  const match = /try again in ([\d.]+)\s*(ms|s)/i.exec(detail || '');
  if (!match) return null;
  const value = Number(match[1]);
  return match[2].toLowerCase() === 'ms' ? value : value * 1000;
}

async function callGroq(model, { prompt, systemInstruction, temperature = 0, maxTokens = 2048, responseFormat = null, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in backend environment variables.');
  }
  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: String(prompt || '') });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        // gpt-oss models reason before answering; keep that short for a plain translation.
        ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
        // e.g. { type: 'json_object' } to force a JSON reply.
        ...(responseFormat ? { response_format: responseFormat } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = '';
      try {
        const payload = await response.json();
        detail = payload?.error?.message || '';
      } catch {
        // Ignore JSON parse failures.
      }
      const error = new Error(`Groq API error ${response.status}${detail ? `: ${detail}` : ''}`);
      error.status = response.status;
      if (response.status === 429) error.retryAfterMs = readRetryAfterMs(response, detail);
      throw error;
    }

    const payload = await response.json();
    const text = String(payload?.choices?.[0]?.message?.content || '').trim();
    return { text, model };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Groq API call timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
