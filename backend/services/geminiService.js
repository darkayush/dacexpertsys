import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_GENERATION_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const DEFAULT_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';
const DEFAULT_EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION || '768', 10);
const DEFAULT_TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS || '12000', 10);

let cachedAiClient = null;
let detectedDimension = null;

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
}

export function getGeminiClient() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in backend environment variables.');
  }
  if (!cachedAiClient) {
    cachedAiClient = new GoogleGenAI({ apiKey });
  }
  return cachedAiClient;
}

function withTimeout(promise, ms = DEFAULT_TIMEOUT_MS, operation = 'Gemini API call') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

/**
 * Executes an async action with exponential backoff for transient errors.
 */
async function withRetry(action, maxRetries = 2, baseDelayMs = 800) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await withTimeout(action(), DEFAULT_TIMEOUT_MS);
    } catch (error) {
      attempt += 1;
      const status = error?.status || error?.statusCode || error?.response?.status;
      const message = String(error?.message || '').toLowerCase();

      // If quota exhausted (429) or timed out, do not block the user with long sleeps; fail fast to let RAG fallback answer
      if (status === 429 || message.includes('quota') || message.includes('timed out')) {
        throw error;
      }

      const isTransient = status === 503 || status === 500 || message.includes('overloaded') || message.includes('fetch failed');
      if (!isTransient || attempt >= maxRetries) {
        throw error;
      }

      const backoff = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}

/**
 * Generates an embedding vector for a single text string using Gemini.
 * Returns an array of floats with dimension 768.
 */
export async function generateEmbedding(text, options = {}) {
  const cleanText = String(text || '').trim();
  if (!cleanText) {
    throw new Error('Cannot generate embedding for empty text.');
  }

  const ai = getGeminiClient();
  const model = options.model || process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  const dimension = options.dimension || DEFAULT_EMBEDDING_DIMENSION;

  return withRetry(async () => {
    try {
      const config = dimension ? { outputDimensionality: dimension } : {};
      const response = await ai.models.embedContent({
        model,
        contents: cleanText,
        config,
      });

      const values = response?.embeddings?.[0]?.values || response?.embedding?.values;
      if (!values || !Array.isArray(values) || values.length === 0) {
        throw new Error(`Embedding response was empty for model ${model}`);
      }
      return values;
    } catch (err) {
      if (model.includes('gemini-embedding-2') && !options.triedFallback) {
        return generateEmbedding(cleanText, { ...options, model: 'text-embedding-004', triedFallback: true });
      }
      throw err;
    }
  });
}

/**
 * Generates embeddings in batches to optimize performance and prevent rate limiting.
 */
export async function generateEmbeddings(texts, options = {}) {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  const batchSize = options.batchSize || 15;
  const results = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const chunk = texts.slice(i, i + batchSize);
    const chunkPromises = chunk.map((text) => generateEmbedding(text, options));
    const batchEmbeddings = await Promise.all(chunkPromises);
    results.push(...batchEmbeddings);

    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs || 200));
    }
  }

  return results;
}

/**
 * Detects the embedding vector dimension by probing the configured embedding model.
 */
export async function detectEmbeddingDimension() {
  if (detectedDimension) return detectedDimension;
  if (process.env.EMBEDDING_DIMENSION) {
    detectedDimension = parseInt(process.env.EMBEDDING_DIMENSION, 10);
    return detectedDimension;
  }
  if (!isGeminiConfigured()) {
    return 768;
  }

  try {
    const sampleVec = await generateEmbedding('probe');
    detectedDimension = sampleVec.length;
    return detectedDimension;
  } catch (error) {
    console.warn('Failed to detect embedding dimension via Gemini probe; falling back to 768:', error.message);
    return 768;
  }
}

/**
 * Generates a grounded response using Gemini LLM.
 */
export async function generateContent({ prompt, systemInstruction, history = [], temperature = 0.1, model }) {
  const ai = getGeminiClient();
  const selectedModel = model || process.env.GEMINI_MODEL || DEFAULT_GENERATION_MODEL;

  const contents = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const msg of history) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content || msg.text || '' }],
      });
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction,
        temperature,
      },
    });

    const answer = response.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      text: answer.trim(),
      model: selectedModel,
    };
  });
}

export default {
  isGeminiConfigured,
  getGeminiClient,
  generateEmbedding,
  generateEmbeddings,
  detectEmbeddingDimension,
  generateContent,
};
