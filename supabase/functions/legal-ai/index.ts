import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBEDDING_MODEL = "google/gemini-embedding-001";
const EMBEDDING_DIMS = 1536;
const ROUTER_MODEL = "google/gemini-2.5-flash-lite";

// ============================================================
// لایه ۳ — Guardrail Engine
// (الف) Compliance Filter — خطوط قرمز قانونی
// (ب) Context-Aware Router — تشخیص حوزه و پیشنهاد فضای کاری
// (ج) Chain-of-Thought — استدلال گام‌به‌گام در system prompt
// ============================================================

const RED_LINE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /(ساخت|آموزش|نحوه[‌ ]ساخت|دستور[‌ ]ساخت).{0,30}(بمب|مواد منفجره|سلاح|گاز سمی|سم کشنده)/i, label: "ساخت سلاح/مواد منفجره" },
  { pattern: /(تولید|پخت|سنتز|آموزش[‌ ]تولید).{0,30}(شیشه|متامفتامین|هروئین|کوکائین|تریاک)/i, label: "تولید مواد مخدر" },
  { pattern: /(کودک[‌ ]آزار|محتوای جنسی.{0,15}کودک|csam)/i, label: "محتوای کودک‌آزاری" },
  { pattern: /(چگونه|آموزش|راه).{0,20}(قتل|ترور|کشتن).{0,30}(کسی|شخص|فرد|انسان)/i, label: "آموزش قتل/ترور" },
  { pattern: /(هک|نفوذ به|دور زدن).{0,30}(بانک|سامانه دولتی|سپاه|وزارت|نیروی انتظامی)/i, label: "نفوذ به سامانه‌های حاکمیتی" },
];

function checkCompliance(text: string): { blocked: boolean; reason?: string } {
  for (const { pattern, label } of RED_LINE_PATTERNS) {
    if (pattern.test(text)) return { blocked: true, reason: label };
  }
  return { blocked: false };
}

const COT_BLOCK = `

روش استدلال (Chain-of-Thought) که باید پیش از تولید پاسخ نهایی به‌صورت ذهنی اجرا کنی (نتیجه را در JSON بیاور، نه مراحل خام را):
۱. شناسایی مسئله حقوقی محوری و طرفین (خواهان/خوانده، شاکی/متشاکی).
۲. استخراج مواد قانونی مرتبط — اولویت مطلق با «منابع رسمی استنادی» اگر ارائه شده؛ سپس قوانین مدون ایران.
۳. بررسی تعارضات احتمالی (تعارض مواد، نسخ ضمنی، تخصیص، رویه قضایی متفاوت). اگر تعارض هست در analysis توضیح بده.
۴. اعمال قاعده بر فاکت‌ها و نتیجه‌گیری حقوقی (subsumption).
۵. تعیین اقدام عملی بعدی و در صورت نیاز، تنظیم پیش‌نویس لایحه.

هرگز ماده‌ای را که نمی‌شناسی یا در منابع نیست از خود اختراع نکن. اگر مطمئن نیستی، صریحاً در analysis بگو که نیاز به بررسی منبع تخصصی است.`;

const BASE_SYSTEM_PROMPT = `شما یک دستیار حقوقی حرفه‌ای در حوزه حقوق ایران هستید.

کاربر ممکن است علاوه بر سوال متنی، تصاویر یا اسناد PDF نیز ارسال کند. این فایل‌ها می‌توانند شامل قراردادها، احکام دادگاه، نامه‌های رسمی، مدارک هویتی، یا هر سند حقوقی دیگری باشند. آن‌ها را با دقت بررسی و در تحلیل خود لحاظ کنید.

بر اساس سوال و مدارک کاربر، پاسخ خود را دقیقاً به فرمت JSON زیر بدهید و هیچ متن اضافی خارج از JSON ننویسید:

{
  "summary": "خلاصه پرونده در ۲-۳ جمله",
  "legalBasis": ["ماده قانونی ۱ با شرح مختصر", "ماده قانونی ۲ با شرح مختصر"],
  "analysis": "تحلیل حقوقی دقیق و مستند (چند پاراگراف)",
  "nextSteps": ["اقدام ۱", "اقدام ۲", "اقدام ۳"],
  "draft": "پیش‌نویس لایحه رسمی قابل ارائه به دادگاه یا مرجع صالح. اگر لایحه مناسب نیست، null قرار دهید."
}

قوانین مهم:
- متن باید رسمی، مستند، دقیق و بدون حدس غیرحقوقی باشد.
- از استناد غیرواقعی خودداری کن. فقط مواد قانونی واقعی ایران را ذکر کن.
- اگر «منابع رسمی استنادی» در پایین سیستم‌پرامپت ارائه شد، اولویت اول استناد به همان متون باشد.
- اگر اطلاعات ناقص است، در summary بنویس که اطلاعات بیشتری لازم است و در nextSteps سوالات تکمیلی بپرس.
- اگر تصاویر یا اسناد ارسال شده، آن‌ها را دقیقاً بررسی و محتوای آن‌ها را در تحلیل ذکر کن.
- پاسخ باید فقط JSON معتبر باشد، بدون markdown، بدون بلوک کد.`
  + COT_BLOCK;

const DETAILED_EXTRA = `

دستورالعمل ویژه تحلیل مفصل:
- بخش draft باید یک لایحه یا شکایت‌نامه کامل، رسمی و حرفه‌ای باشد با حداقل ۲۰۰۰ کلمه و حداکثر ۳۰۰۰ کلمه.
- لایحه باید شامل: مقدمه، شرح وقایع، استدلالات حقوقی مفصل با استناد به مواد قانونی، خواسته‌ها، و نتیجه‌گیری باشد.
- از قالب رسمی لوایح دادگاه‌های ایران استفاده کن (ریاست محترم دادگاه، احتراماً، ...).
- بخش analysis نیز باید مفصل‌تر و جامع‌تر باشد (حداقل ۵۰۰ کلمه).
- تمام مواد قانونی مرتبط را با شرح کامل ذکر کن.`;

async function retrieveContext(workspaceSlug: string, query: string, apiKey: string, supabaseUrl: string, serviceKey: string) {
  try {
    const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: query, dimensions: EMBEDDING_DIMS }),
    });
    if (!embRes.ok) {
      console.warn("embedding failed", embRes.status);
      return [];
    }
    const embData = await embRes.json();
    const embedding = embData.data[0].embedding;

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabase.rpc("match_legal_chunks", {
      query_embedding: embedding as any,
      workspace_slug: workspaceSlug,
      match_count: 6,
    });
    if (error) {
      console.warn("match_legal_chunks failed", error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn("retrieveContext error", e);
    return [];
  }
}

// Context-Aware Router: classify question into best workspace slug
async function routeWorkspace(
  question: string,
  workspaces: { slug: string; name_fa: string; description: string | null }[],
  apiKey: string,
): Promise<{ best_slug: string | null; confidence: number; reason: string }> {
  if (workspaces.length === 0) return { best_slug: null, confidence: 0, reason: "" };
  const list = workspaces.map((w) => `- ${w.slug}: ${w.name_fa}${w.description ? ` — ${w.description}` : ""}`).join("\n");
  const sys = `تو یک طبقه‌بند حوزه حقوقی هستی. بر اساس سوال کاربر، مناسب‌ترین فضای کاری را از فهرست زیر انتخاب کن. فقط JSON معتبر برگردان.

فهرست فضاهای کاری:
${list}

پاسخ دقیقاً به این فرمت:
{"best_slug":"<slug>","confidence":<0..1>,"reason":"<توضیح کوتاه فارسی>"}`;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ROUTER_MODEL,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: question.slice(0, 1500) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      console.warn("router classify failed", r.status);
      return { best_slug: null, confidence: 0, reason: "" };
    }
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content || "{}";
    const cleaned = txt.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      best_slug: typeof parsed.best_slug === "string" ? parsed.best_slug : null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  } catch (e) {
    console.warn("routeWorkspace error", e);
    return { best_slug: null, confidence: 0, reason: "" };
  }
}

// ── Audit logger (best-effort, never throws) ──────────────
async function logAudit(sbAdmin: any, entry: Record<string, any>) {
  try {
    await sbAdmin.from("audit_logs").insert(entry);
  } catch (e) {
    console.warn("audit log insert failed", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const sbAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

  let auditBase: Record<string, any> = {
    user_id: null,
    workspace_slug: null,
    question: "",
    question_length: 0,
    files_count: 0,
    detailed: false,
  };

  try {
    const { question, files, detailed, workspace_slug } = await req.json();
    auditBase = {
      ...auditBase,
      workspace_slug: workspace_slug || null,
      question: (question || "").slice(0, 4000),
      question_length: (question || "").length,
      files_count: Array.isArray(files) ? files.length : 0,
      detailed: !!detailed,
    };

    if (!question || question.trim().length < 15) {
      await logAudit(sbAdmin, {
        ...auditBase, status: "validation_error",
        error_message: "question too short", duration_ms: Date.now() - startedAt,
      });
      return new Response(
        JSON.stringify({ error: "لطفاً سوال حقوقی خود را به طور کامل بنویسید." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ── Auth check FIRST (so audit log has user_id) ──────────
    const authHeader = req.headers.get("Authorization") || "";
    const sbUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await sbUser.auth.getUser();
    const user = userData?.user;
    if (!user) {
      await logAudit(sbAdmin, {
        ...auditBase, status: "unauthorized",
        error_message: "no auth", duration_ms: Date.now() - startedAt,
      });
      return new Response(JSON.stringify({ error: "برای استفاده از دستیار حقوقی باید وارد حساب شوید." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    auditBase.user_id = user.id;

    // ── (الف) Compliance Filter (input) ──────────────────────
    const compliance = checkCompliance(question);
    if (compliance.blocked) {
      await logAudit(sbAdmin, {
        ...auditBase, status: "blocked_input",
        blocked: true, block_reason: compliance.reason,
        duration_ms: Date.now() - startedAt,
      });
      return new Response(
        JSON.stringify({
          summary: "این درخواست خارج از چارچوب مجاز خدمت حقوقی است.",
          legalBasis: [],
          analysis:
            `درخواست شما با خطوط قرمز قانونی (${compliance.reason}) تطبیق داده شد و قابل پاسخ‌گویی نیست. در صورت داشتن سوال حقوقی مشروع در همین حوزه، لطفاً صورت‌مسئله را با ادبیات قانونی بازنویسی کنید.`,
          nextSteps: ["بازنویسی سوال در چارچوب قانونی", "مشاوره با وکیل دارای پروانه"],
          draft: null,
          sources: [],
          blocked: true,
          block_reason: compliance.reason,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Workspace RBAC ───────────────────────────────────────
    if (workspace_slug) {
      const { data: ws } = await sbAdmin.from("legal_workspaces").select("id").eq("slug", workspace_slug).maybeSingle();
      if (!ws) {
        await logAudit(sbAdmin, {
          ...auditBase, status: "workspace_not_found",
          duration_ms: Date.now() - startedAt,
        });
        return new Response(JSON.stringify({ error: "فضای کاری یافت نشد." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const [{ data: roleRow }, { data: accessRow }] = await Promise.all([
        sbAdmin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
        sbAdmin.from("workspace_access").select("level").eq("user_id", user.id).eq("workspace_id", ws.id).maybeSingle(),
      ]);
      const isAdmin = !!roleRow;
      const hasAccess = isAdmin || !!accessRow;
      if (!hasAccess) {
        await logAudit(sbAdmin, {
          ...auditBase, status: "forbidden",
          error_message: "no workspace access", duration_ms: Date.now() - startedAt,
        });
        return new Response(JSON.stringify({ error: "شما به این فضای کاری دسترسی ندارید. لطفاً از ادمین درخواست دسترسی کنید." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── (ب) Context-Aware Router ─────────────────────────────
    let routing: any = null;
    if (workspace_slug) {
      const { data: wsList } = await sbAdmin
        .from("legal_workspaces")
        .select("slug, name_fa, description")
        .order("order_index");
      const classification = await routeWorkspace(question, wsList || [], LOVABLE_API_KEY);
      if (
        classification.best_slug &&
        classification.best_slug !== workspace_slug &&
        classification.confidence >= 0.7
      ) {
        const suggested = (wsList || []).find((w) => w.slug === classification.best_slug);
        if (suggested) {
          routing = {
            suggested_slug: suggested.slug,
            suggested_name: suggested.name_fa,
            confidence: classification.confidence,
            reason: classification.reason,
          };
        }
      }
    }

    // RAG retrieval (only if workspace specified)
    let sources: any[] = [];
    let related: any[] = [];
    let contextBlock = "";
    if (workspace_slug) {
      sources = await retrieveContext(workspace_slug, question, LOVABLE_API_KEY, SUPABASE_URL, SERVICE_KEY);
      if (sources.length > 0) {
        contextBlock = "\n\n=== منابع رسمی استنادی (از پایگاه دانش این فضای کاری) ===\n" +
          sources.map((s: any, i: number) =>
            `[منبع ${i + 1}] ${s.document_title} (${s.source_type}):\n${s.content}`
          ).join("\n\n---\n\n") +
          "\n=== پایان منابع ===\n\nدر تحلیل و legalBasis خود به این منابع استناد کن.";

        // Graph-like related documents (Legal Relations)
        try {
          const docIds = Array.from(new Set(sources.map((s: any) => s.document_id))).filter(Boolean);
          if (docIds.length > 0) {
            const { data: relRows } = await sbAdmin.rpc("get_related_documents", {
              _document_ids: docIds,
              _workspace_slug: workspace_slug,
              _max_per_doc: 3,
            });
            related = relRows || [];
            if (related.length > 0) {
              contextBlock += "\n\n=== اسناد مرتبط (روابط حقوقی ثبت‌شده) ===\n" +
                related.slice(0, 10).map((r: any, i: number) =>
                  `[مرتبط ${i + 1}] ${r.related_title} (${r.related_source_type}) — نوع رابطه: ${r.relation_type}${r.note ? ` — ${r.note}` : ""}`
                ).join("\n") +
                "\n=== پایان اسناد مرتبط ===";
            }
          }
        } catch (e) {
          console.warn("related docs fetch failed", e);
        }
      }
    }

    const userContent: any[] = [{ type: "text", text: question }];
    if (files && Array.isArray(files)) {
      for (const file of files) {
        if ((file.type === "image" || file.type === "pdf") && file.data) {
          userContent.push({
            type: "image_url",
            image_url: { url: `data:${file.mimeType};base64,${file.data}` },
          });
        }
      }
    }

    const systemPrompt =
      (detailed ? BASE_SYSTEM_PROMPT + DETAILED_EXTRA : BASE_SYSTEM_PROMPT) + contextBlock;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: detailed ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      await logAudit(sbAdmin, {
        ...auditBase, status: `ai_error_${response.status}`,
        error_message: errText.slice(0, 500), duration_ms: Date.now() - startedAt,
      });
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "اعتبار AI به پایان رسیده. لطفاً اعتبار خود را شارژ کنید." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    let parsed: any;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response as JSON:", content);
      parsed = {
        summary: content.substring(0, 200),
        legalBasis: ["پاسخ AI قابل تحلیل ساختاری نبود. لطفاً دوباره تلاش کنید."],
        analysis: content,
        nextSteps: ["سوال خود را با جزئیات بیشتر مطرح کنید."],
        draft: null,
      };
    }

    const outCheck = checkCompliance(
      [parsed.summary, parsed.analysis, parsed.draft].filter(Boolean).join("\n"),
    );
    if (outCheck.blocked) {
      parsed.analysis = `پاسخ تولیدی شامل محتوای خارج از چارچوب مجاز (${outCheck.reason}) بود و حذف شد.`;
      parsed.draft = null;
      parsed.blocked = true;
      parsed.block_reason = outCheck.reason;
    }

    parsed.sources = sources.map((s: any) => ({
      title: s.document_title,
      source_type: s.source_type,
      excerpt: s.content.substring(0, 300),
      similarity: s.similarity,
    }));
    parsed.related = related.map((r: any) => ({
      title: r.related_title,
      source_type: r.related_source_type,
      relation_type: r.relation_type,
      note: r.note,
    }));
    if (routing) parsed.routing = routing;

    await logAudit(sbAdmin, {
      ...auditBase,
      response_summary: (parsed.summary || "").slice(0, 500),
      sources_count: sources.length,
      routing_suggested_slug: routing?.suggested_slug || null,
      routing_confidence: routing?.confidence ?? null,
      blocked: !!parsed.blocked,
      block_reason: parsed.block_reason || null,
      status: parsed.blocked ? "blocked_output" : "ok",
      duration_ms: Date.now() - startedAt,
    });

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("legal-ai error:", e);
    await logAudit(sbAdmin, {
      ...auditBase, status: "error",
      error_message: (e instanceof Error ? e.message : String(e)).slice(0, 500),
      duration_ms: Date.now() - startedAt,
    });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطای ناشناخته" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
