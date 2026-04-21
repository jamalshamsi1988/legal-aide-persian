import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, files, detailed } = await req.json();

    if (!question || question.trim().length < 15) {
      return new Response(
        JSON.stringify({ error: "لطفاً سوال حقوقی خود را به طور کامل بنویسید." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build multimodal content array
    const userContent: any[] = [{ type: "text", text: question }];

    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (file.type === "image" && file.data) {
          userContent.push({
            type: "image_url",
            image_url: {
              url: `data:${file.mimeType};base64,${file.data}`,
            },
          });
        } else if (file.type === "pdf" && file.data) {
          // For PDFs, send as image_url with PDF mime type (supported by Gemini)
          userContent.push({
            type: "image_url",
            image_url: {
              url: `data:${file.mimeType};base64,${file.data}`,
            },
          });
        }
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: detailed ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: detailed ? BASE_SYSTEM_PROMPT + DETAILED_EXTRA : BASE_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "اعتبار AI به پایان رسیده. لطفاً اعتبار خود را شارژ کنید." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

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

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("legal-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "خطای ناشناخته" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
