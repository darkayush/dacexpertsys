import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import pool from '../backend/config/db.js';
import { ensureWorkflowSchema } from '../backend/config/bootstrap.js';
import { isGeminiConfigured, generateEmbeddings, detectEmbeddingDimension } from '../backend/services/geminiService.js';

dotenv.config();

const KB_DIR = path.resolve('backend/knowledge_base');

function computeHash(content) {
  return crypto.createHash('sha256').update(String(content || '').trim()).digest('hex');
}

function cleanString(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function normalizeMetadata(raw, docType, sourceName) {
  const meta = { ...(raw.metadata || {}) };
  return {
    source: cleanString(meta.source || raw.source || sourceName),
    document_type: cleanString(meta.document_type || raw.document_type || docType),
    case_id: cleanString(meta.case_id || raw.case_id || meta.external_case_id || ''),
    student_id: meta.student_id ? Number(meta.student_id) : (raw.student_id ? Number(raw.student_id) : null),
    enrollment_no: cleanString(meta.enrollment_no || raw.enrollment_no || ''),
    offense_type: cleanString(meta.offense_type || raw.offense_type || ''),
    substance_type: cleanString(meta.substance_type || raw.substance_type || ''),
    hostel: cleanString(meta.hostel || raw.hostel || ''),
    batch: meta.batch ? Number(meta.batch) : (raw.batch ? Number(raw.batch) : null),
    status: cleanString(meta.status || raw.status || ''),
    date: cleanString(meta.date || meta.incident_date || raw.date || raw.incident_date || ''),
    page: cleanString(meta.page || raw.page || ''),
    section: cleanString(meta.section || raw.section || ''),
    title: cleanString(meta.title || raw.title || ''),
  };
}

/**
 * Splits large text into sensible chunks while keeping complete sentences / paragraphs intact.
 */
function chunkDocument(id, text, metadata, maxChars = 2000, overlap = 200) {
  const clean = text.trim();
  if (clean.length <= maxChars) {
    return [{
      chunkId: id,
      content: clean,
      metadata,
    }];
  }

  // Split by paragraphs
  const paragraphs = clean.split(/\n\s*\n/);
  const chunks = [];
  let current = '';
  let partIndex = 1;

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length <= maxChars) {
      current = current ? current + '\n\n' + para : para;
    } else {
      if (current) {
        chunks.push({
          chunkId: `${id}_part_${partIndex}`,
          content: current.trim(),
          metadata: { ...metadata, chunk_part: partIndex },
        });
        partIndex += 1;
        // Keep trailing overlap
        const sliceLen = Math.min(overlap, current.length);
        const overlapSlice = current.slice(current.length - sliceLen);
        current = overlapSlice + '\n\n' + para;
      } else {
        // Single paragraph larger than maxChars
        chunks.push({
          chunkId: `${id}_part_${partIndex}`,
          content: para.slice(0, maxChars).trim(),
          metadata: { ...metadata, chunk_part: partIndex },
        });
        partIndex += 1;
        current = para.slice(maxChars - overlap);
      }
    }
  }

  if (current.trim()) {
    chunks.push({
      chunkId: `${id}_part_${partIndex}`,
      content: current.trim(),
      metadata: { ...metadata, chunk_part: partIndex },
    });
  }

  return chunks;
}

async function ingest() {
  console.log('--- Starting DAC RAG Knowledge Base Ingestion ---');
  await ensureWorkflowSchema();

  const client = await pool.connect();
  const stats = {
    filesProcessed: 0,
    documentsProcessed: 0,
    chunksCreated: 0,
    chunksSkipped: 0,
    embeddingsGenerated: 0,
    errors: 0,
  };

  const hasPgvector = (await client.query("SELECT 1 FROM pg_extension WHERE extname = 'vector'")).rowCount > 0;
  const geminiReady = isGeminiConfigured();

  if (!geminiReady) {
    console.warn('⚠️  GEMINI_API_KEY is not configured in .env. Documents and metadata will be indexed; vectors will be generated once key is configured.');
  } else {
    console.log('✓ Gemini API key detected. Embedding generation enabled.');
  }

  if (hasPgvector) {
    console.log('✓ PostgreSQL pgvector extension is active.');
  } else {
    console.warn('⚠️  PostgreSQL pgvector extension is not active. Falling back to structured metadata search.');
  }

  if (!fs.existsSync(KB_DIR)) {
    console.error(`Knowledge base directory not found at: ${KB_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(KB_DIR).filter((f) => f.endsWith('.jsonl'));
  files.sort((a, b) => (a.includes('policy') ? -1 : (b.includes('policy') ? 1 : 0)));
  console.log(`Found ${files.length} JSONL files in ${KB_DIR}`);

  const pendingChunksToEmbed = [];

  for (const filename of files) {
    stats.filesProcessed += 1;
    const filePath = path.join(KB_DIR, filename);
    const sourceName = filename.replace('.jsonl', '');
    const defaultDocType = filename.includes('policy') ? 'dac_policy'
      : filename.includes('timeline') ? 'case_timeline'
      : 'case_document';

    console.log(`\nProcessing file [${stats.filesProcessed}/${files.length}]: ${filename}`);

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineNumber = 0;
    for await (const line of rl) {
      lineNumber += 1;
      const trimmed = line.trim();
      if (!trimmed) continue;

      let record;
      try {
        record = JSON.parse(trimmed);
      } catch (err) {
        stats.errors += 1;
        console.warn(`Malformed JSON in ${filename}:${lineNumber}: ${err.message}`);
        continue;
      }

      stats.documentsProcessed += 1;

      const rawContent = record.content || record.text || '';
      if (!rawContent) {
        stats.errors += 1;
        continue;
      }

      const docId = cleanString(record.id || `${sourceName}_${lineNumber}`);
      const meta = normalizeMetadata(record, defaultDocType, sourceName);
      const chunks = chunkDocument(docId, rawContent, meta);

      for (const chunk of chunks) {
        const hash = computeHash(chunk.content);

        // Check if chunk already exists in DB
        const existing = await client.query(
          'SELECT content_hash, (embedding IS NOT NULL) AS has_embedding FROM rag_documents WHERE id = $1',
          [chunk.chunkId]
        );

        const row = existing.rows[0];
        // If content unchanged and already has embedding (or gemini not ready), skip
        if (row && row.content_hash === hash && (row.has_embedding || !geminiReady)) {
          stats.chunksSkipped += 1;
          continue;
        }

        stats.chunksCreated += 1;
        pendingChunksToEmbed.push({
          id: chunk.chunkId,
          source: meta.source || sourceName,
          document_type: meta.document_type || defaultDocType,
          document_id: meta.case_id || docId,
          content: chunk.content,
          content_hash: hash,
          metadata: chunk.metadata,
        });
      }
    }
  }

  console.log(`\nExtracted ${pendingChunksToEmbed.length} chunks needing update/embedding.`);

  // Process pending chunks in batches
  const batchSize = 30;
  for (let i = 0; i < pendingChunksToEmbed.length; i += batchSize) {
    const batch = pendingChunksToEmbed.slice(i, i + batchSize);
    let embeddings = [];

    if (geminiReady) {
      try {
        const texts = batch.map((c) => c.content);
        embeddings = await generateEmbeddings(texts, { batchSize: 30, delayMs: 200 });
        stats.embeddingsGenerated += embeddings.length;
      } catch (err) {
        console.error(`Error generating embeddings for batch ${i / batchSize + 1}:`, err.message);
        stats.errors += 1;
      }
    }

    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const emb = embeddings[j] || null;

      try {
        if (hasPgvector && emb) {
          const vectorStr = `[${emb.join(',')}]`;
          await client.query(
            `INSERT INTO rag_documents (id, source, document_type, document_id, content, content_hash, metadata, embedding, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, NOW())
             ON CONFLICT (id) DO UPDATE SET
               source = EXCLUDED.source,
               document_type = EXCLUDED.document_type,
               document_id = EXCLUDED.document_id,
               content = EXCLUDED.content,
               content_hash = EXCLUDED.content_hash,
               metadata = EXCLUDED.metadata,
               embedding = EXCLUDED.embedding,
               updated_at = NOW()`,
            [item.id, item.source, item.document_type, item.document_id, item.content, item.content_hash, item.metadata, vectorStr]
          );
        } else {
          await client.query(
            `INSERT INTO rag_documents (id, source, document_type, document_id, content, content_hash, metadata, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             ON CONFLICT (id) DO UPDATE SET
               source = EXCLUDED.source,
               document_type = EXCLUDED.document_type,
               document_id = EXCLUDED.document_id,
               content = EXCLUDED.content,
               content_hash = EXCLUDED.content_hash,
               metadata = EXCLUDED.metadata,
               updated_at = NOW()`,
            [item.id, item.source, item.document_type, item.document_id, item.content, item.content_hash, item.metadata]
          );
        }
      } catch (dbErr) {
        stats.errors += 1;
        console.error(`DB upsert error for ${item.id}:`, dbErr.message);
      }
    }

    process.stdout.write(`Ingested ${Math.min(i + batchSize, pendingChunksToEmbed.length)}/${pendingChunksToEmbed.length} chunks...\r`);
  }

  client.release();
  await pool.end();

  console.log('\n=======================================');
  console.log('       RAG INGESTION SUMMARY           ');
  console.log('=======================================');
  console.log(`Files processed:       ${stats.filesProcessed}`);
  console.log(`Documents processed:   ${stats.documentsProcessed}`);
  console.log(`Chunks created:        ${stats.chunksCreated}`);
  console.log(`Chunks skipped:        ${stats.chunksSkipped}`);
  console.log(`Embeddings generated:  ${stats.embeddingsGenerated}`);
  console.log(`Errors:                ${stats.errors}`);
  console.log('=======================================');
}

ingest().catch((err) => {
  console.error('Fatal ingestion error:', err);
  process.exit(1);
});
