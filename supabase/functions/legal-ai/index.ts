import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBEDDING_MODEL = "google/gemini-embedding-001";
const EMBEDDING_DIMS = 1536;

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
- پاسخ باید فقط JSON معتبر باشد، بدون markdown، بدون بلوک کد.`;

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, files, detailed, workspace_slug } = await req.json();

    if (!question || question.trim().length < 15) {
      return new Response(
        JSON.stringify({ error: "لطفاً سوال حقوقی خود را به طور کامل بنویسید." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // RAG retrieval (only if workspace specified)
    let sources: any[] = [];
    let contextBlock = "";
    if (workspace_slug) {
      sources = await retrieveContext(workspace_slug, question, LOVABLE_API_KEY, SUPABASE_URL, SERVICE_KEY);
      if (sources.length > 0) {
        contextBlock = "\n\n=== منابع رسمی استنادی (از پایگاه دانش این فضای کاری) ===\n" +
          sources.map((s: any, i: number) =>
            `[منبع ${i + 1}] ${s.document_title} (${s.source_type}):\n${s.content}`
          ).join("\n\n---\n\n") +
          "\n=== پایان منابع ===\n\nدر تحلیل و legalBasis خود به این منابع استناد کن.";
      }
    }

    // Build multimodal content array
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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    let parsed;
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

    // Attach citation metadata
    parsed.sources = sources.map((s: any) => ({
      title: s.document_title,
      source_type: s.source_type,
      excerpt: s.content.substring(0, 300),
      similarity: s.similarity,
    }));

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("legal-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطای ناشناخته" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
