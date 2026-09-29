-- Migration: RAG Vector Storage & pgvector Integration
-- Enables pgvector extension, ensures rag_documents table structure, and creates HNSW index.

DO $$
BEGIN
  -- Attempt to create vector extension if pgvector binary is installed
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pgvector extension could not be enabled: %', SQLERRM;
END $$;

-- Create or alter rag_documents table
CREATE TABLE IF NOT EXISTS rag_documents (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'case_documents',
  document_type TEXT NOT NULL DEFAULT 'case_document',
  document_id TEXT,
  content TEXT NOT NULL,
  content_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'case_documents';
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'case_document';
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS document_id TEXT;
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Add vector embedding column if vector extension is present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS embedding vector(768);
  END IF;
END $$;

-- Create search and performance indices
CREATE INDEX IF NOT EXISTS rag_documents_source_idx ON rag_documents(source);
CREATE INDEX IF NOT EXISTS rag_documents_doc_type_idx ON rag_documents(document_type);
CREATE INDEX IF NOT EXISTS rag_documents_doc_id_idx ON rag_documents(document_id);
CREATE INDEX IF NOT EXISTS rag_documents_content_hash_idx ON rag_documents(content_hash);
CREATE INDEX IF NOT EXISTS rag_documents_metadata_idx ON rag_documents USING GIN (metadata);

-- Create HNSW vector similarity search index if supported
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rag_documents' AND column_name = 'embedding'
  ) THEN
    BEGIN
      CREATE INDEX IF NOT EXISTS rag_documents_embedding_hnsw_idx 
      ON rag_documents USING hnsw (embedding vector_cosine_ops);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not create HNSW index: %', SQLERRM;
    END;
  END IF;
END $$;
