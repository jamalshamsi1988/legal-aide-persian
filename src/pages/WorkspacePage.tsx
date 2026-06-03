import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LegalAssistant } from "@/components/LegalAssistant";
import { LegalHeader } from "@/components/LegalHeader";

interface Workspace {
  id: string;
  slug: string;
  name_fa: string;
  description: string | null;
}

const WorkspacePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [docCount, setDocCount] = useState<number>(0);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("legal_workspaces")
        .select("id, slug, name_fa, description")
        .eq("slug", slug)
        .maybeSingle();
      if (!data) {
        setNotFound(true);
        return;
      }
      setWs(data);
      const { count } = await supabase
        .from("legal_documents")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", data.id);
      setDocCount(count || 0);
    })();
  }, [slug]);

  if (notFound) {
    return (
      <div className="min-h-screen gradient-section">
        <LegalHeader />
        <main className="container max-w-3xl py-12 px-4 text-center">
          <p className="text-navy font-bold mb-4">این فضای کاری یافت نشد.</p>
          <Link to="/" className="text-gold underline">بازگشت به فهرست</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-section">
      <LegalHeader />
      <div className="container max-w-3xl pt-6 px-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-navy hover:text-gold mb-3"
        >
          <ArrowRight className="w-4 h-4" />
          همه فضاهای کاری
        </Link>
        {ws && (
          <div className="bg-navy text-primary-foreground rounded-2xl p-5 shadow-legal-lg">
            <div className="flex items-center gap-2 text-xs text-gold/80 mb-1">
              <span>فضای کاری</span>
              <ChevronRight className="w-3 h-3" />
              <span>{docCount} سند در پایگاه دانش</span>
            </div>
            <h2 className="text-xl font-bold">{ws.name_fa}</h2>
            {ws.description && (
              <p className="text-sm text-primary-foreground/70 mt-1">{ws.description}</p>
            )}
          </div>
        )}
      </div>
      <LegalAssistant workspaceSlug={ws?.slug} workspaceName={ws?.name_fa} />
    </div>
  );
};

export default WorkspacePage;
