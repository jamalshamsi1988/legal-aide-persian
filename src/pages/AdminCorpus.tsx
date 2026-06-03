import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, Trash2, Loader2, ArrowRight, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LegalHeader } from "@/components/LegalHeader";

interface Workspace {
  id: string;
  slug: string;
  name_fa: string;
}

interface DocRow {
  id: string;
  title: string;
  source_type: string;
  created_at: string;
}

const SOURCE_TYPES = [
  { value: "law", label: "قانون" },
  { value: "regulation", label: "آیین‌نامه" },
  { value: "advisory", label: "نظریه مشورتی" },
  { value: "ruling", label: "رای وحدت رویه" },
];

const AdminCorpus = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState("law");
  const [rawText, setRawText] = useState("");
  const [ingesting, setIngesting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("legal_workspaces")
        .select("id, slug, name_fa")
        .order("order_index");
      if (data) {
        setWorkspaces(data);
        if (data.length > 0) setSelectedSlug(data[0].slug);
      }
    })();
  }, []);

  const loadDocs = async (slug: string) => {
    const ws = workspaces.find((w) => w.slug === slug);
    if (!ws) return setDocs([]);
    const { data } = await supabase
      .from("legal_documents")
      .select("id, title, source_type, created_at")
      .eq("workspace_id", ws.id)
      .order("created_at", { ascending: false });
    setDocs((data as DocRow[]) || []);
  };

  useEffect(() => {
    if (selectedSlug && workspaces.length) loadDocs(selectedSlug);
  }, [selectedSlug, workspaces]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "خطا", description: "حداکثر اندازه فایل ۵ مگابایت", variant: "destructive" });
      return;
    }
    const text = await file.text();
    setRawText(text);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
  };

  const handleIngest = async () => {
    if (!selectedSlug || !title.trim() || !rawText.trim()) {
      toast({ title: "خطا", description: "عنوان، فضای کاری و متن الزامی است", variant: "destructive" });
      return;
    }
    if (rawText.length < 50) {
      toast({ title: "خطا", description: "متن خیلی کوتاه است", variant: "destructive" });
      return;
    }
    setIngesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("legal-ingest", {
        body: {
          workspace_slug: selectedSlug,
          title: title.trim(),
          source_type: sourceType,
          raw_text: rawText,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({
        title: "موفق",
        description: `${data.chunkCount} تکه ذخیره و embedding شد.`,
      });
      setTitle("");
      setRawText("");
      await loadDocs(selectedSlug);
    } catch (e) {
      toast({
        title: "خطا",
        description: e instanceof Error ? e.message : "خطای ناشناخته",
        variant: "destructive",
      });
    } finally {
      setIngesting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("این سند و همه تکه‌هایش حذف شود؟")) return;
    const { error } = await supabase.from("legal_documents").delete().eq("id", id);
    if (error) {
      toast({ title: "خطا در حذف", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "حذف شد" });
    loadDocs(selectedSlug);
  };

  return (
    <div className="min-h-screen gradient-section">
      <LegalHeader />
      <main className="container max-w-4xl py-8 px-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-navy hover:text-gold mb-4">
          <ArrowRight className="w-4 h-4" />
          بازگشت
        </Link>

        <div className="bg-card rounded-2xl shadow-legal-lg border border-border p-6 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-navy mb-1">مدیریت پایگاه دانش حقوقی</h2>
            <p className="text-xs text-muted-foreground">
              قوانین، آیین‌نامه‌ها و نظریات مشورتی را در هر فضای کاری تزریق کنید. متن به تکه‌های کوچک‌تر تقسیم و برای جستجوی معنایی embedding می‌شود.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-navy font-bold block mb-1">فضای کاری</label>
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full bg-parchment border border-border rounded-lg p-2.5 text-sm font-vazir"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.slug}>{w.name_fa}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-navy font-bold block mb-1">نوع منبع</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full bg-parchment border border-border rounded-lg p-2.5 text-sm font-vazir"
              >
                {SOURCE_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-navy font-bold block mb-1">عنوان سند</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً: قانون مدنی - مواد ۱۸۳ تا ۲۰۰"
              className="w-full bg-parchment border border-border rounded-lg p-2.5 text-sm font-vazir"
            />
          </div>

          <div>
            <label className="text-xs text-navy font-bold block mb-1">
              متن خام (یا فایل TXT آپلود کنید)
            </label>
            <input
              type="file"
              accept=".txt,.md,text/plain"
              onChange={handleFile}
              className="block text-xs mb-2"
            />
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="متن قانون یا آیین‌نامه را اینجا paste کنید..."
              className="w-full min-h-[200px] bg-parchment border border-border rounded-lg p-3 text-sm font-vazir resize-y"
            />
            <p className="text-[10px] text-muted-foreground mt-1">{rawText.length} کاراکتر</p>
          </div>

          <button
            onClick={handleIngest}
            disabled={ingesting}
            className="w-full flex items-center justify-center gap-2 gradient-gold text-navy font-bold rounded-xl px-5 py-3 shadow-gold hover:opacity-90 transition-all duration-200 disabled:opacity-40 text-sm"
          >
            {ingesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                در حال تزریق و embedding...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                تزریق به پایگاه دانش
              </>
            )}
          </button>
        </div>

        <div className="bg-card rounded-2xl shadow-legal border border-border p-6 mt-6">
          <h3 className="text-navy font-bold text-base mb-3">
            اسناد موجود ({docs.length})
          </h3>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              هنوز سندی در این فضای کاری ثبت نشده.
            </p>
          ) : (
            <ul className="space-y-2">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-3 p-3 bg-parchment rounded-lg border border-border"
                >
                  <FileText className="w-4 h-4 text-gold flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-navy font-bold truncate">{d.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {d.source_type} • {new Date(d.created_at).toLocaleDateString("fa-IR")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                    aria-label="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminCorpus;
