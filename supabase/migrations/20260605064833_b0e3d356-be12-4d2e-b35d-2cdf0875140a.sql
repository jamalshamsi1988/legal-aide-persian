-- 1) profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2) app_role enum + user_roles
CREATE TYPE public.app_role AS ENUM ('admin', 'lawyer', 'restricted');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) workspace_access
CREATE TYPE public.access_level AS ENUM ('read', 'write');

CREATE TABLE public.workspace_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.legal_workspaces(id) ON DELETE CASCADE,
  level public.access_level NOT NULL DEFAULT 'read',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, workspace_id)
);
GRANT SELECT ON public.workspace_access TO authenticated;
GRANT ALL ON public.workspace_access TO service_role;
ALTER TABLE public.workspace_access ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_workspace_access(_user_id UUID, _workspace_id UUID, _min_level public.access_level DEFAULT 'read')
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.workspace_access
      WHERE user_id = _user_id
        AND workspace_id = _workspace_id
        AND (
          _min_level = 'read'
          OR (level = 'write')
        )
    )
$$;

CREATE POLICY "Users can view their own access" ON public.workspace_access
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage workspace access" ON public.workspace_access
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'lawyer');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5) Tighten RLS on legal_* tables
-- legal_workspaces: keep public read (showcase)
-- legal_documents
DROP POLICY IF EXISTS "Documents are readable by everyone" ON public.legal_documents;
CREATE POLICY "Authorized users read documents" ON public.legal_documents
  FOR SELECT TO authenticated
  USING (public.has_workspace_access(auth.uid(), workspace_id, 'read'));
CREATE POLICY "Writers and admins insert documents" ON public.legal_documents
  FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_access(auth.uid(), workspace_id, 'write'));
CREATE POLICY "Writers and admins update documents" ON public.legal_documents
  FOR UPDATE TO authenticated
  USING (public.has_workspace_access(auth.uid(), workspace_id, 'write'));
CREATE POLICY "Admins delete documents" ON public.legal_documents
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- legal_chunks
DROP POLICY IF EXISTS "Chunks are readable by everyone" ON public.legal_chunks;
CREATE POLICY "Authorized users read chunks" ON public.legal_chunks
  FOR SELECT TO authenticated
  USING (public.has_workspace_access(auth.uid(), workspace_id, 'read'));

-- Revoke previous anon read access on documents/chunks (workspaces still public)
REVOKE SELECT ON public.legal_documents FROM anon;
REVOKE SELECT ON public.legal_chunks FROM anon;