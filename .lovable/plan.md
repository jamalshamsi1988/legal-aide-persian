
# لایه ۱: هسته دانش حقوقی (Legal Corpus Hub)

نسخه وب-محور. تمرکز بر RAG با Vector Database و ۴۰ فضای کاری تخصصی.

---

## ۱. زیرساخت دیتابیس (Supabase + pgvector)

فعال‌سازی افزونه `vector` و ساخت سه جدول اصلی:

- **`legal_workspaces`** — ۴۰ فضای کاری از پیش تعریف‌شده (مدنی، کیفری، خانواده، کار، تجارت، ملکی، ثبت احوال، مالیاتی، ...). ستون‌ها: `id`, `slug`, `name_fa`, `description`, `icon`, `order_index`.
- **`legal_documents`** — متادیتای هر سند حقوقی آپلودشده. ستون‌ها: `id`, `workspace_id`, `title`, `source_type` (قانون / آیین‌نامه / نظریه مشورتی / رای وحدت رویه)، `published_date`, `raw_text`.
- **`legal_chunks`** — تکه‌های متنی به همراه embedding. ستون‌ها: `id`, `document_id`, `workspace_id`, `chunk_index`, `content`, `embedding vector(3072)`, `metadata jsonb`. ایندکس HNSW روی `embedding` با `vector_cosine_ops`.

تابع `match_legal_chunks(query_embedding, workspace_slug, match_count)` برای جستجوی برداری محدود به یک workspace.

دسترسی: همه‌ی جدول‌ها برای `anon` فقط خواندنی، نوشتن فقط از طریق edge function با `service_role`. (در فاز بعد نقش admin اضافه می‌شود.)

## ۲. Seed داده‌ی ۴۰ فضای کاری

یک migration که ۴۰ ردیف اولیه را در `legal_workspaces` درج می‌کند با دسته‌بندی استاندارد حقوقی ایران (نمونه: حقوق مدنی، حقوق کیفری عمومی، حقوق کیفری اختصاصی، خانواده، کار و تأمین اجتماعی، تجارت، شرکت‌ها، چک و اسناد، ملکی و ثبت، اجاره، رهن، ارث، وقف، مالیاتی، گمرکی، بانکی، بیمه، پزشکی، رایانه‌ای، مطبوعاتی، نظامی، انتظامی، اداری، استخدامی، شهرداری، محیط زیست، انرژی، ورزشی، فرهنگی، آیین دادرسی مدنی، آیین دادرسی کیفری، اجرای احکام، داوری، بین‌الملل خصوصی، بین‌الملل عمومی، تجارت بین‌الملل، حقوق بشر، قانون اساسی، انتخابات، ثبت احوال).

## ۳. Edge Functions جدید

### `legal-ingest`
ورودی: `{ workspace_slug, title, source_type, raw_text }` (یا متن استخراج‌شده از PDF در کلاینت).  
کار: متن را به chunks ۸۰۰-۱۲۰۰ کاراکتری با overlap ۲۰۰ تقسیم → برای هر chunk با `google/gemini-embedding-001` (از Lovable AI Gateway) embedding می‌گیرد → در `legal_chunks` ذخیره می‌کند.

### `legal-search`
ورودی: `{ workspace_slug, query, top_k }`. خروجی: لیست chunk‌های مرتبط با similarity score.

### بروزرسانی `legal-ai`
- پارامتر `workspace_slug` اضافه می‌شود.
- قبل از فراخوانی LLM، با `legal-search` بهترین ۵-۸ chunk از workspace انتخاب‌شده را می‌گیرد.
- این chunks به‌عنوان «منابع رسمی استنادی» در system prompt تزریق می‌شوند تا LLM فقط بر اساس آن‌ها استناد دهد (کاهش hallucination).
- در خروجی JSON، آرایه‌ی جدید `sources` با عنوان سند و chunk اضافه می‌شود.

## ۴. تغییرات UI (React)

### صفحه اصلی
- **انتخابگر فضای کاری**: گرید ۴۰ کارت با آیکون و عنوان فارسی، با جستجو/فیلتر سریع. کلیک → ورود به آن workspace.
- بدون انتخاب workspace، تحلیل حقوقی غیرفعال است (یا یک حالت «عمومی» با hint).

### داخل هر workspace
- هدر workspace (نام + توضیح).
- همان فرم فعلی `LegalAssistant` ولی محدود به آن workspace.
- بخش **«منابع استنادی»** زیر پاسخ، که chunk‌های بازیابی‌شده را با عنوان سند نمایش می‌دهد.

### صفحه `/admin/corpus` (موقتاً بدون auth — در فاز ۵ محافظت می‌شود)
- انتخاب workspace → آپلود PDF/TXT یا paste متن قانون → دکمه‌ی «تزریق به دیتابیس» → فراخوانی `legal-ingest`.
- نمایش لیست اسناد موجود در هر workspace با امکان حذف.

## ۵. روتینگ
- `/` → انتخاب workspace
- `/workspace/:slug` → چت حقوقی همان حوزه
- `/admin/corpus` → مدیریت دیتابیس قوانین

---

## جزئیات فنی

- **مدل embedding**: `google/gemini-embedding-001` (3072 بُعد) از طریق `https://ai.gateway.lovable.dev/v1/embeddings` با `LOVABLE_API_KEY`.
- **Chunking**: ساده، بر اساس کاراکتر با شکستن روی پاراگراف. (در فاز بعد می‌توان token-aware کرد.)
- **استخراج متن PDF در کلاینت**: استفاده از `pdfjs-dist` که قبلاً در دسترس است.
- **محدودیت اندازه**: هر سند تا ~۵۰۰۰۰ کاراکتر در یک درخواست ingest (در صورت بزرگ‌تر بودن، کلاینت آن را تکه می‌کند و چند بار صدا می‌زند).
- **پنل ادمین**: در این فاز بدون auth — فقط برای ساخت اولیه. در فاز ۵ پشت login می‌رود.

## خارج از scope این فاز
- احراز هویت و نقش‌ها (فاز ۵)
- Guardrail / Router LLM / CoT صریح (فاز ۳)
- OCR و Share Intent (نیاز به Native — فعلاً رد شد)

---

## ترتیب اجرا

1. Migration: pgvector + سه جدول + seed ۴۰ workspace + تابع match.
2. سه edge function (`legal-ingest`, `legal-search`, آپدیت `legal-ai`).
3. صفحه انتخاب workspace + روتر.
4. پنل `/admin/corpus`.
5. نمایش sources در نتیجه.

تأیید می‌کنید این مسیر را شروع کنم؟
