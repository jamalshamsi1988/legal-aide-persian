import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LegalHeader } from "@/components/LegalHeader";
import { Loader2, ArrowRight, ShieldAlert, CheckCircle2, AlertTriangle, Filter } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AuditRow {
  id: string;
  user_id: string | null;
  workspace_slug: string | null;
  question: string;
  question_length: number;
  files_count: number;
  detailed: boolean;
  response_summary: string | null;
  sources_count: number;
  routing_suggested_slug: string | null;
  routing_confidence: number | null;
  blocked: boolean;
  block_reason: string | null;
  status: string;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

const PAGE_SIZE = 50;

const statusBadge = (status: string, blocked: boolean) => {
  if (blocked || status.startsWith("blocked")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-50 text-red-700 border border-red-200">
        <ShieldAlert className="w-3 h-3" /> مسدود
      </span>
    );
  }
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> موفق
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200">
      <AlertTriangle className="w-3 h-3" /> {status}
    </span>
  );
};

const AdminAudit = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "blocked" | "errors">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(PAGE_SIZE);
      if (filter === "blocked") q = q.eq("blocked", true);
      if (filter === "errors") q = q.neq("status", "ok").neq("status", "blocked_input").neq("status", "blocked_output");
      const { data, error } = await q;
      if (error) toast({ title: "خطا در دریافت گزارش‌ها", description: error.message, variant: "destructive" });
      setRows((data as AuditRow[]) || []);
      setLoading(false);
    })();
  }, [filter]);

  return (
    <div className="min-h-screen bg-background">
      <LegalHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-navy mb-2">
              <ArrowRight className="w-4 h-4" /> بازگشت
            </Link>
            <h1 className="text-2xl font-bold text-navy">گزارش‌های ممیزی (Audit Logs)</h1>
            <p className="text-sm text-muted-foreground mt-1">
              ثبت تمام پرس‌وجوها، منابع استنادی، مسیریابی پیشنهادی و موارد مسدودشده.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {(["all", "blocked", "errors"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm border transition ${
                  filter === f
                    ? "bg-navy text-white border-navy"
                    : "bg-white text-navy border-border hover:border-gold"
                }`}
              >
                {f === "all" ? "همه" : f === "blocked" ? "مسدودشده" : "خطاها"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">گزارشی یافت نشد.</div>
        ) : (
          <div className="bg-white rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-navy">
                  <tr>
                    <th className="text-right p-3 font-semibold">زمان</th>
                    <th className="text-right p-3 font-semibold">وضعیت</th>
                    <th className="text-right p-3 font-semibold">فضای کاری</th>
                    <th className="text-right p-3 font-semibold">سوال</th>
                    <th className="text-right p-3 font-semibold">منابع</th>
                    <th className="text-right p-3 font-semibold">مسیریابی</th>
                    <th className="text-right p-3 font-semibold">مدت</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isOpen = expanded === r.id;
                    return (
                      <Fragment key={r.id}>
                        <tr
                          className="border-t border-border hover:bg-muted/30 cursor-pointer"
                          onClick={() => setExpanded(isOpen ? null : r.id)}
                        >
                          <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(r.created_at).toLocaleString("fa-IR")}
                          </td>
                          <td className="p-3">{statusBadge(r.status, r.blocked)}</td>
                          <td className="p-3 text-xs">{r.workspace_slug || "—"}</td>
                          <td className="p-3 max-w-md truncate" title={r.question}>
                            {r.question.slice(0, 100)}
                            {r.question.length > 100 && "…"}
                          </td>
                          <td className="p-3 text-center">{r.sources_count}</td>
                          <td className="p-3 text-xs">
                            {r.routing_suggested_slug
                              ? `${r.routing_suggested_slug} (${Math.round((r.routing_confidence || 0) * 100)}%)`
                              : "—"}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {r.duration_ms ? `${r.duration_ms}ms` : "—"}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-muted/20 border-t border-border">
                            <td colSpan={7} className="p-4 space-y-2 text-xs">
                              <div>
                                <span className="font-semibold text-navy">سوال کامل: </span>
                                <span className="whitespace-pre-wrap">{r.question}</span>
                              </div>
                              {r.response_summary && (
                                <div>
                                  <span className="font-semibold text-navy">خلاصه پاسخ: </span>
                                  {r.response_summary}
                                </div>
                              )}
                              {r.block_reason && (
                                <div className="text-red-700">
                                  <span className="font-semibold">دلیل مسدود شدن: </span>
                                  {r.block_reason}
                                </div>
                              )}
                              {r.error_message && (
                                <div className="text-amber-700">
                                  <span className="font-semibold">خطا: </span>
                                  {r.error_message}
                                </div>
                              )}
                              <div className="text-muted-foreground">
                                user_id: {r.user_id || "—"} · فایل‌ها: {r.files_count} · تحلیل مفصل: {r.detailed ? "بله" : "خیر"}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminAudit;
