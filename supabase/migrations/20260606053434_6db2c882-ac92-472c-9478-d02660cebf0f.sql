
DO $$ BEGIN
  CREATE TYPE public.legal_relation_type AS ENUM (
    'REFERENCES','AMENDS','REPEALS','INTERPRETS','RELATES_TO','CITED_BY'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.legal_relations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.legal_workspaces(id) ON DELETE CASCADE,
  source_document_id UUID NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  target_document_id UUID NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  relation_type public.legal_relation_type NOT NULL DEFAULT 'RELATES_TO',
  source_anchor TEXT,
  target_anchor TEXT,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_relation CHECK (source_document_id <> target_document_id),
  UNIQUE (source_document_id, target_document_id, relation_type, source_anchor, target_anchor)
);

CREATE INDEX idx_legal_relations_source ON public.legal_relations(source_document_id);
CREATE INDEX idx_legal_relations_target ON public.legal_relations(target_document_id);
CREATE INDEX idx_legal_relations_workspace ON public.legal_relations(workspace_id);
CREATE INDEX idx_legal_relations_type ON public.legal_relations(relation_type);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_relations TO authenticated;
GRANT ALL ON public.legal_relations TO service_role;

ALTER TABLE public.legal_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view relations with workspace access"
  ON public.legal_relations FOR SELECT TO authenticated
  USING (public.has_workspace_access(auth.uid(), workspace_id, 'read'));

CREATE POLICY "admins manage relations"
  ON public.legal_relations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_legal_relations_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_legal_relations_updated_at
  BEFORE UPDATE ON public.legal_relations
  FOR EACH ROW EXECUTE FUNCTION public.update_legal_relations_updated_at();

CREATE OR REPLACE FUNCTION public.get_related_documents(
  _document_ids UUID[],
  _workspace_slug TEXT,
  _max_per_doc INT DEFAULT 5
)
RETURNS TABLE(
  source_document_id UUID,
  related_document_id UUID,
  related_title TEXT,
  related_source_type TEXT,
  relation_type public.legal_relation_type,
  source_anchor TEXT,
  target_anchor TEXT,
  note TEXT
)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH ws AS (SELECT id FROM public.legal_workspaces WHERE slug = _workspace_slug),
  rels AS (
    SELECT r.source_document_id AS src, r.target_document_id AS rel,
           r.relation_type, r.source_anchor, r.target_anchor, r.note,
           row_number() OVER (PARTITION BY r.source_document_id ORDER BY r.created_at DESC) AS rn
    FROM public.legal_relations r, ws
    WHERE r.workspace_id = ws.id AND r.source_document_id = ANY(_document_ids)
    UNION ALL
    SELECT r.target_document_id, r.source_document_id,
           r.relation_type, r.target_anchor, r.source_anchor, r.note,
           row_number() OVER (PARTITION BY r.target_document_id ORDER BY r.created_at DESC)
    FROM public.legal_relations r, ws
    WHERE r.workspace_id = ws.id AND r.target_document_id = ANY(_document_ids)
  )
  SELECT rels.src, rels.rel, d.title, d.source_type,
         rels.relation_type, rels.source_anchor, rels.target_anchor, rels.note
  FROM rels JOIN public.legal_documents d ON d.id = rels.rel
  WHERE rels.rn <= _max_per_doc;
$$;

REVOKE EXECUTE ON FUNCTION public.get_related_documents(UUID[], TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_related_documents(UUID[], TEXT, INT) TO authenticated, service_role;
