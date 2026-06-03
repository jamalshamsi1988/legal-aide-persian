
-- 1) Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) legal_workspaces
CREATE TABLE public.legal_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_fa TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.legal_workspaces TO anon, authenticated;
GRANT ALL ON public.legal_workspaces TO service_role;

ALTER TABLE public.legal_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspaces are readable by everyone"
ON public.legal_workspaces FOR SELECT
USING (true);

-- 3) legal_documents
CREATE TABLE public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.legal_workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'law',
  published_date DATE,
  raw_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_documents_workspace ON public.legal_documents(workspace_id);

GRANT SELECT ON public.legal_documents TO anon, authenticated;
GRANT ALL ON public.legal_documents TO service_role;

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documents are readable by everyone"
ON public.legal_documents FOR SELECT
USING (true);

-- 4) legal_chunks with 1536-dim embeddings (HNSW-compatible)
CREATE TABLE public.legal_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.legal_workspaces(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_chunks_workspace ON public.legal_chunks(workspace_id);
CREATE INDEX idx_legal_chunks_document ON public.legal_chunks(document_id);
CREATE INDEX idx_legal_chunks_embedding ON public.legal_chunks USING hnsw (embedding vector_cosine_ops);

GRANT SELECT ON public.legal_chunks TO anon, authenticated;
GRANT ALL ON public.legal_chunks TO service_role;

ALTER TABLE public.legal_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chunks are readable by everyone"
ON public.legal_chunks FOR SELECT
USING (true);

-- 5) Semantic search function scoped to a workspace
CREATE OR REPLACE FUNCTION public.match_legal_chunks(
  query_embedding vector(1536),
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

-- 6) Seed 40 Iranian legal workspaces
INSERT INTO public.legal_workspaces (slug, name_fa, description, icon, order_index) VALUES
('civil', 'حقوق مدنی', 'قراردادها، تعهدات، مسئولیت مدنی', 'Scale', 1),
('criminal-general', 'حقوق کیفری عمومی', 'اصول و کلیات حقوق جزا', 'Gavel', 2),
('criminal-special', 'حقوق کیفری اختصاصی', 'جرایم خاص و مجازات‌ها', 'ShieldAlert', 3),
('family', 'حقوق خانواده', 'ازدواج، طلاق، مهریه، حضانت', 'Heart', 4),
('labor', 'کار و تأمین اجتماعی', 'قراردادهای کار، حقوق کارگر و کارفرما', 'Briefcase', 5),
('commerce', 'حقوق تجارت', 'معاملات تجاری و بازرگانی', 'Store', 6),
('companies', 'حقوق شرکت‌ها', 'تأسیس، اداره و انحلال شرکت‌ها', 'Building2', 7),
('checks-docs', 'چک و اسناد تجاری', 'چک، سفته، برات', 'FileSignature', 8),
('property', 'املاک و ثبت', 'مالکیت، ثبت اسناد و املاک', 'Home', 9),
('tenancy', 'اجاره', 'روابط موجر و مستأجر', 'Key', 10),
('mortgage', 'رهن و وثیقه', 'رهن املاک و تضمینات', 'Landmark', 11),
('inheritance', 'ارث و وصیت', 'تقسیم ترکه و وصیت', 'Users', 12),
('endowment', 'وقف', 'موقوفات و امور خیریه', 'BookHeart', 13),
('tax', 'حقوق مالیاتی', 'مالیات بر درآمد، ارزش افزوده', 'Receipt', 14),
('customs', 'حقوق گمرکی', 'واردات، صادرات و گمرک', 'Container', 15),
('banking', 'حقوق بانکی', 'تسهیلات، سپرده و عملیات بانکی', 'CreditCard', 16),
('insurance', 'حقوق بیمه', 'بیمه‌های اشخاص و اموال', 'ShieldCheck', 17),
('medical', 'حقوق پزشکی', 'مسئولیت پزشک و بیمار', 'Stethoscope', 18),
('cyber', 'جرایم رایانه‌ای', 'جرایم سایبری و فضای مجازی', 'Laptop', 19),
('press', 'حقوق مطبوعات', 'رسانه، روزنامه و انتشارات', 'Newspaper', 20),
('military', 'حقوق نظامی', 'نیروهای مسلح', 'Shield', 21),
('disciplinary', 'حقوق انتظامی', 'تخلفات صنفی و انتظامی', 'AlertOctagon', 22),
('administrative', 'حقوق اداری', 'دیوان عدالت اداری، تصمیمات دولتی', 'Building', 23),
('employment', 'استخدامی', 'استخدام و خدمات کشوری', 'UserCheck', 24),
('municipal', 'حقوق شهرداری', 'کمیسیون ماده ۱۰۰، عوارض', 'MapPin', 25),
('environment', 'محیط زیست', 'حفاظت محیط زیست', 'Leaf', 26),
('energy', 'حقوق انرژی', 'نفت، گاز و برق', 'Zap', 27),
('sports', 'حقوق ورزشی', 'قراردادهای ورزشی و انضباطی', 'Trophy', 28),
('cultural', 'حقوق فرهنگی', 'میراث فرهنگی و مالکیت فکری', 'Palette', 29),
('civil-procedure', 'آیین دادرسی مدنی', 'تشریفات رسیدگی مدنی', 'BookOpen', 30),
('criminal-procedure', 'آیین دادرسی کیفری', 'تشریفات رسیدگی کیفری', 'BookMarked', 31),
('enforcement', 'اجرای احکام', 'اجرای آرا و توقیف اموال', 'Hammer', 32),
('arbitration', 'داوری', 'حل اختلاف از طریق داوری', 'Handshake', 33),
('private-international', 'بین‌الملل خصوصی', 'تعارض قوانین و دادگاه‌ها', 'Globe', 34),
('public-international', 'بین‌الملل عمومی', 'حقوق میان دولت‌ها', 'Globe2', 35),
('international-trade', 'تجارت بین‌الملل', 'قراردادهای فرامرزی', 'Plane', 36),
('human-rights', 'حقوق بشر', 'حقوق بنیادین انسانی', 'HandHeart', 37),
('constitutional', 'حقوق اساسی', 'قانون اساسی و ساختار حکومت', 'Crown', 38),
('elections', 'حقوق انتخابات', 'انتخابات و نظارت', 'Vote', 39),
('civil-registry', 'ثبت احوال', 'شناسنامه، هویت و احوال شخصیه', 'IdCard', 40);
