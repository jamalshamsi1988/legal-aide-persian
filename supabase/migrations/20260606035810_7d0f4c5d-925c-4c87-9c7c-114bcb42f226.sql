
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_slug text,
  question text NOT NULL,
  question_length int NOT NULL DEFAULT 0,
  files_count int NOT NULL DEFAULT 0,
  detailed boolean NOT NULL DEFAULT false,
  response_summary text,
  sources_count int NOT NULL DEFAULT 0,
  routing_suggested_slug text,
  routing_confidence numeric,
  blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  status text NOT NULL DEFAULT 'ok',
  error_message text,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admins view all audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_audit_logs_user_created ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_workspace_created ON public.audit_logs(workspace_slug, created_at DESC);
CREATE INDEX idx_audit_logs_blocked ON public.audit_logs(blocked) WHERE blocked = true;
