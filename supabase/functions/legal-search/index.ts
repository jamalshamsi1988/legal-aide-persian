import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBEDDING_MODEL = "google/gemini-embedding-001";
const EMBEDDING_DIMS = 3072;

export async function embedQuery(query: string, apiKey: string): Promise<number[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: query,
      dimensions: EMBEDDING_DIMS,
    }),
  });
  if (!res.ok) throw new Error(`Embedding API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sbAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

  // ── AuthN ──
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return new Response(
      JSON.stringify({ error: "برای جستجو باید وارد حساب شوید." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userErr } = await sbAdmin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return new Response(
      JSON.stringify({ error: "نشست شما منقضی شده است." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const userId = userData.user.id;

  try {
    const { workspace_slug, query, top_k } = await req.json();
    if (!workspace_slug || !query) {
      return new Response(JSON.stringify({ error: "workspace_slug و query الزامی هستند" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Quota gate (search) ──
    const { data: canUse } = await sbAdmin.rpc("check_can_use", {
      _uid: userId, _kind: "search",
    });
    if (!canUse?.allowed) {
      return new Response(
        JSON.stringify({
          error: "سهمیه/موجودی کافی برای جستجو ندارید. لطفاً بسته توکن تهیه کنید.",
          quota: canUse,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Server misconfigured");

    const embedding = await embedQuery(query, LOVABLE_API_KEY);

    const { data, error } = await sbAdmin.rpc("match_legal_chunks", {
      query_embedding: embedding as any,
      workspace_slug,
      match_count: Math.min(Math.max(top_k || 6, 1), 20),
    });
    if (error) throw error;

    // Record light usage (embedding cost is small; count as a small paid/free deduction)
    try {
      await sbAdmin.rpc("record_ai_usage", {
        _uid: userId,
        _kind: "search",
        _mode: canUse.mode,
        _prompt_tokens: Math.min(query.length, 2000),
        _completion_tokens: 0,
        _workspace_slug: workspace_slug,
        _meta: { top_k: top_k || 6 },
      });
    } catch (e) {
      console.warn("record_ai_usage(search) failed", e);
    }

    return new Response(JSON.stringify({ matches: data || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("legal-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطای ناشناخته" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
