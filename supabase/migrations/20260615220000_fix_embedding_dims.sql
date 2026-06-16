
-- Fix embedding dimensions from 1536 to 3072 per TSD (google/gemini-embedding-001)
-- This migration should be applied after the initial schema migrations.

-- 1) Recreate legal_chunks embedding column with correct dimensions
--    Since pgvector doesn't support ALTER COLUMN TYPE directly for dimensions,
--    we recreate the column. Data should be re-ingested after this migration.

ALTER TABLE public.legal_chunks DROP COLUMN embedding;

ALTER TABLE public.legal_chunks ADD COLUMN embedding vector(3072);

-- 2) Recreate HNSW index on the new column
DROP INDEX IF EXISTS idx_legal_chunks_embedding;
CREATE INDEX idx_legal_chunks_embedding ON public.legal_chunks USING hnsw (embedding vector_cosine_ops);

-- 3) Update match_legal_chunks function parameter to match new dimensions
CREATE OR REPLACE FUNCTION public.match_legal_chunks(
  query_embedding vector(3072),
  workspace_slug TEXT,
  match_count INT DEFAULT 6
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  document_title TEXT,
  source_type TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    c.id AS chunk_id,
    c.document_id,
    d.title AS document_title,
    d.source_type,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.legal_chunks c
  JOIN public.legal_documents d ON d.id = c.document_id
  JOIN public.legal_workspaces w ON w.id = c.workspace_id
  WHERE w.slug = workspace_slug
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
