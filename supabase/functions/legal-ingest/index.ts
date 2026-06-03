import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBEDDING_MODEL = "google/gemini-embedding-001";
const EMBEDDING_DIMS = 1536;
const CHUNK_SIZE = 1000; // characters
const CHUNK_OVERLAP = 200;
const BATCH_SIZE = 16;

function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (clean.length <= CHUNK_SIZE) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length);
    // try to break on paragraph or sentence boundary
    if (end < clean.length) {
      const slice = clean.slice(start, end);
      const lastPara = slice.lastIndexOf("\n\n");
      const lastNewline = slice.lastIndexOf("\n");
      const lastPeriod = Math.max(slice.lastIndexOf("."), slice.lastIndexOf("؟"), slice.lastIndexOf("!"));
      const breakAt = lastPara > CHUNK_SIZE * 0.5
        ? lastPara
        : lastNewline > CHUNK_SIZE * 0.6
        ? lastNewline
        : lastPeriod > CHUNK_SIZE * 0.6
        ? lastPeriod + 1
        : -1;
      if (breakAt > 0) end = start + breakAt;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
  }
  return chunks.filter((c) => c.length > 20);
}

async function embedBatch(inputs: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: inputs,
      dimensions: EMBEDDING_DIMS,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embedding API ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data.data.map((d: any) => d.embedding);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_slug, title, source_type, published_date, raw_text } = await req.json();

    if (!workspace_slug || !title || !raw_text || typeof raw_text !== "string") {
      return new Response(
        JSON.stringify({ error: "workspace_slug, title, raw_text الزامی هستند" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
      throw new Error("Server misconfigured");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Look up workspace
    const { data: ws, error: wsErr } = await supabase
      .from("legal_workspaces")
      .select("id")
      .eq("slug", workspace_slug)
      .maybeSingle();
    if (wsErr) throw wsErr;
    if (!ws) {
      return new Response(JSON.stringify({ error: "فضای کاری یافت نشد" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create document
    const { data: doc, error: docErr } = await supabase
      .from("legal_documents")
      .insert({
        workspace_id: ws.id,
        title,
        source_type: source_type || "law",
        published_date: published_date || null,
        raw_text,
      })
      .select("id")
      .single();
    if (docErr) throw docErr;

    // Chunk
    const chunks = chunkText(raw_text);
    if (chunks.length === 0) {
      return new Response(JSON.stringify({ documentId: doc.id, chunkCount: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Embed in batches and insert
    let inserted = 0;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await embedBatch(batch, LOVABLE_API_KEY);
      const rows = batch.map((content, j) => ({
        document_id: doc.id,
        workspace_id: ws.id,
        chunk_index: i + j,
        content,
        embedding: embeddings[j] as any,
      }));
      const { error: insErr } = await supabase.from("legal_chunks").insert(rows);
      if (insErr) throw insErr;
      inserted += rows.length;
    }

    return new Response(
      JSON.stringify({ documentId: doc.id, chunkCount: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("legal-ingest error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "خطای ناشناخته" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
