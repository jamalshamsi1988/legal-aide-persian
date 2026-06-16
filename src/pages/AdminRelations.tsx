// ============================================================
// صفحه مدیریت روابط حقوقی (Admin Relations)
// ============================================================
// این صفحه برای مدیران سیستم است و امکان مدیریت روابط بین
// اسناد حقوقی را فراهم می‌کند:
// - افزودن رابطه بین دو سند (منبع و مقصد)
// - تعریف نوع رابطه: ارجاع، اصلاح، نسخ، تفسیر، مرتبط، استناد شده
// - افزودن انکر (ماده/بند) برای هر طرف رابطه
// - افزودن یادداشت توضیحی به رابطه
// - مشاهده و حذف روابط موجود
// ============================================================
// دسترسی: فقط کاربران با نقش "admin"
// ============================================================

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Trash2, Plus, Loader2, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LegalHeader } from "@/components/LegalHeader";

// ============================================================
// تعریف انواع داده‌های مورد نیاز در این صفحه
// ============================================================
interface Workspace { id: string; slug: string; name_fa: string; }
interface DocRow { id: string; title: string; source_type: string; }
interface RelationRow {
  id: string;
  source_document_id: string;
  target_document_id: string;
  relation_type: string;
  source_anchor: string | null;
  target_anchor: string | null;
  note: string | null;
}

// ============================================================
// انواع روابط قابل تعریف بین اسناد حقوقی
// ============================================================
const RELATION_TYPES = [
  { v: "REFERENCES", l: "ارجاع می‌دهد" },
  { v: "AMENDS", l: "اصلاح می‌کند" },
  { v: "REPEALS", l: "نسخ می‌کند" },
  { v: "INTERPRETS", l: "تفسیر می‌کند" },
  { v: "RELATES_TO", l: "مرتبط است با" },
  { v: "CITED_BY", l: "استناد شده توسط" },
];

// ============================================================
// کامپوننت اصلی مدیریت روابط حقوقی
// ============================================================
const AdminRelations = () => {
  // ============================================================
  // Stateهای صفحه
  // ============================================================
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);       // لیست فضاهای کاری
  const [selectedSlug, setSelectedSlug] = useState("");                 // فضای کاری انتخاب‌شده
  const [docs, setDocs] = useState<DocRow[]>([]);                       // لیست اسناد موجود
  const [relations, setRelations] = useState<RelationRow[]>([]);       // لیست روابط موجود
  const [loading, setLoading] = useState(false);                        // وضعیت بارگذاری

  // فیلدهای فرم افزودن رابطه جدید
  const [sourceId, setSourceId] = useState("");                         // شناسه سند مبدأ
  const [targetId, setTargetId] = useState("");                         // شناسه سند مقصد
  const [relType, setRelType] = useState("RELATES_TO");                  // نوع رابطه
  const [sourceAnchor, setSourceAnchor] = useState("");                 // انکر مبدأ (ماده/بند)
  const [targetAnchor, setTargetAnchor] = useState("");                 // انکر مقصد (ماده/بند)
  const [note, setNote] = useState("");                                 // یادداشت توضیحی
  const [saving, setSaving] = useState(false);                          // وضعیت ذخیره

  // ============================================================
  // بارگیری لیست فضاهای کاری از پایگاه داده
  // ============================================================
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("legal_workspaces").select("id, slug, name_fa").order("order_index");
      if (data) {
        setWorkspaces(data);
        if (data.length > 0) setSelectedSlug(data[0].slug);
      }
    })();
  }, []);

  // ============================================================
  // پیدا کردن فضای کاری انتخاب‌شده
  // ============================================================
  const ws = workspaces.find((w) => w.slug === selectedSlug);

  // ============================================================
  // بارگیری اسناد و روابط یک فضای کاری خاص
  // ============================================================
  useEffect(() => {
    if (!ws) return;
    (async () => {
      setLoading(true);
      const [{ data: d }, { data: r }] = await Promise.all([
        supabase.from("legal_documents").select("id, title, source_type")
          .eq("workspace_id", ws.id).order("created_at", { ascending: false }),
        supabase.from("legal_relations").select("*")
          .eq("workspace_id", ws.id).order("created_at", { ascending: false }),
      ]);
      setDocs(d || []);
      setRelations(r || []);
      setLoading(false);
    })();
  }, [ws?.id]);

  // ============================================================
  // دریافت عنوان سند با شناسه
  // ============================================================
  const docTitle = (id: string) => docs.find((d) => d.id === id)?.title || id;

  // ============================================================
  // افزودن رابطه جدید بین دو سند
  // ============================================================
  const handleAdd = async () => {
    if (!ws || !sourceId || !targetId) {
      toast({ title: "ناقص", description: "مبدأ و مقصد را انتخاب کنید", variant: "destructive" });
      return;
    }
    if (sourceId === targetId) {
      toast({ title: "خطا", description: "سند مبدأ و مقصد نباید یکی باشد", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("legal_relations").insert({
      workspace_id: ws.id,
      source_document_id: sourceId,
      target_document_id: targetId,
      relation_type: relType as any,
      source_anchor: sourceAnchor || null,
      target_anchor: targetAnchor || null,
      note: note || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
      return;
    }
    // پاک کردن فرم بعد از موفقیت
    toast({ title: "ثبت شد", description: "رابطه افزوده شد" });
    setNote(""); setSourceAnchor(""); setTargetAnchor("");
    // بارگیری مجدد لیست روابط
    const { data: r } = await supabase.from("legal_relations").select("*")
      .eq("workspace_id", ws.id).order("created_at", { ascending: false });
    setRelations(r || []);
  };

  // ============================================================
  // حذف یک رابطه موجود
  // ============================================================
  const handleDelete = async (id: string) => {
    if (!confirm("حذف این رابطه؟")) return;
    const { error } = await supabase.from("legal_relations").delete().eq("id", id);
    if (error) { toast({ title: "خطا", description: error.message, variant: "destructive" }); return; }
    setRelations((rs) => rs.filter((r) => r.id !== id));
  };

  // ============================================================
  // رابط کاربری صفحه مدیریت روابط حقوقی
  // ============================================================
  return (
    <div className="min-h-screen bg-background">
      <LegalHeader />
      <main className="container max-w-5xl py-8 px-4 space-y-6">
        {/* هدر صفحه */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-navy flex items-center gap-2">
            <Link2 className="w-5 h-5 text-gold" /> مدیریت روابط حقوقی
          </h2>
          <Link to="/" className="text-sm text-navy hover:text-gold flex items-center gap-1">
            بازگشت <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* انتخاب فضای کاری */}
        <div className="bg-card rounded-xl border border-border p-4">
          <label className="text-xs text-muted-foreground block mb-1">فضای کاری</label>
          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="w-full bg-parchment border border-border rounded-lg px-3 py-2 text-sm"
          >
            {workspaces.map((w) => (
              <option key={w.slug} value={w.slug}>{w.name_fa}</option>
            ))}
          </select>
        </div>

        {/* فرم افزودن رابطه جدید */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-bold text-navy text-sm">افزودن رابطه جدید</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">سند مبدأ</label>
              <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}
                className="w-full bg-parchment border border-border rounded-lg px-3 py-2 text-sm">
                <option value="">— انتخاب —</option>
                {docs.map((d) => <option key={d.id} value={d.id}>{d.title} ({d.source_type})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">سند مقصد</label>
              <select value={targetId} onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-parchment border border-border rounded-lg px-3 py-2 text-sm">
                <option value="">— انتخاب —</option>
                {docs.map((d) => <option key={d.id} value={d.id}>{d.title} ({d.source_type})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">نوع رابطه</label>
              <select value={relType} onChange={(e) => setRelType(e.target.value)}
                className="w-full bg-parchment border border-border rounded-lg px-3 py-2 text-sm">
                {RELATION_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">یادداشت (اختیاری)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)}
                className="w-full bg-parchment border border-border rounded-lg px-3 py-2 text-sm"
                placeholder="مثلاً: ماده ۱۰ اصلاحی" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">انکر مبدأ (ماده/بند، اختیاری)</label>
              <input value={sourceAnchor} onChange={(e) => setSourceAnchor(e.target.value)}
                className="w-full bg-parchment border border-border rounded-lg px-3 py-2 text-sm"
                placeholder="ماده ۱۰" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">انکر مقصد (اختیاری)</label>
              <input value={targetAnchor} onChange={(e) => setTargetAnchor(e.target.value)}
                className="w-full bg-parchment border border-border rounded-lg px-3 py-2 text-sm"
                placeholder="ماده ۲" />
            </div>
          </div>
          <button onClick={handleAdd} disabled={saving}
            className="flex items-center gap-2 gradient-gold text-navy font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            افزودن رابطه
          </button>
        </div>

        {/* لیست روابط موجود */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-bold text-navy text-sm mb-3">روابط موجود ({relations.length})</h3>
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : relations.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">هیچ رابطه‌ای ثبت نشده.</p>
          ) : (
            <ul className="space-y-2">
              {relations.map((r) => (
                <li key={r.id} className="border border-border rounded-lg p-3 text-xs flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-navy font-bold mb-1">
                      {docTitle(r.source_document_id)}
                      {r.source_anchor ? ` (${r.source_anchor})` : ""}
                      {" "}
                      <span className="text-gold">— {r.relation_type} —</span>
                      {" "}
                      {docTitle(r.target_document_id)}
                      {r.target_anchor ? ` (${r.target_anchor})` : ""}
                    </div>
                    {r.note && <p className="text-muted-foreground">{r.note}</p>}
                  </div>
                  <button onClick={() => handleDelete(r.id)}
                    className="text-destructive hover:bg-red-50 rounded p-1">
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

export default AdminRelations;
