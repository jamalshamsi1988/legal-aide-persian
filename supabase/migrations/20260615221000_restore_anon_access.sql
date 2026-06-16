
-- Restore anonymous read access per TSD specification
-- In the initial phase, all corpus tables should be readable by anon users.
-- Admin controls will be added in a later phase.

-- 1) Re-grant SELECT to anon on legal tables
GRANT SELECT ON public.legal_workspaces TO anon;
GRANT SELECT ON public.legal_documents TO anon;
GRANT SELECT ON public.legal_chunks TO anon;

-- 2) Drop auth-based RLS policies and replace with public read
-- legal_documents
DROP POLICY IF EXISTS "Authorized users read documents" ON public.legal_documents;
DROP POLICY IF EXISTS "Writers and admins insert documents" ON public.legal_documents;
DROP POLICY IF EXISTS "Writers and admins update documents" ON public.legal_documents;
DROP POLICY IF EXISTS "Admins delete documents" ON public.legal_documents;

CREATE POLICY "Documents are readable by everyone"
ON public.legal_documents FOR SELECT
USING (true);

-- Note: INSERT/UPDATE/DELETE on legal_documents and legal_chunks
-- should only happen via edge functions with service_role.
-- We do NOT grant INSERT/UPDATE/DELETE to anon or authenticated.

-- legal_chunks
DROP POLICY IF EXISTS "Authorized users read chunks" ON public.legal_chunks;

CREATE POLICY "Chunks are readable by everyone"
ON public.legal_chunks FOR SELECT
USING (true);

-- legal_workspaces: ensure public read (already exists from initial migration)
DROP POLICY IF EXISTS "Workspaces are readable by everyone" ON public.legal_workspaces;
CREATE POLICY "Workspaces are readable by everyone"
ON public.legal_workspaces FOR SELECT
USING (true);

-- 3) Disable RLS on tables where we rely on grant-based access
-- Actually, keep RLS enabled but with permissive SELECT policies.
