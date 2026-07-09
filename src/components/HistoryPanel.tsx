import { useEffect, useMemo, useState } from "react";
import { History, Trash2, ChevronDown, ChevronUp, Search, X, Calendar, Filter, Eye, Scale, BookOpen, ChevronLeft, Send, FileDown, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { generateLegalPdf } from "@/lib/generatePdf";

export interface HistoryItem {
  id: string;
  createdAt: number;
  workspaceSlug?: string;
  workspaceName?: string;
  question: string;
  detailed: boolean;
  result: any;
}

const STORAGE_KEY = "legal_history_v1";
const MAX_ITEMS = 100;

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveHistoryItem(item: Omit<HistoryItem, "id" | "createdAt">) {
  try {
    const all = loadHistory();
    const entry: HistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    const next = [entry, ...all].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return entry;
  } catch (e) {
    console.warn("saveHistoryItem failed", e);
    return null;
  }
}

export function deleteHistoryItem(id: string) {
  try {
    const next = loadHistory().filter((h) => h.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

interface HistoryPanelProps {
  workspaceSlug?: string;
  refreshKey: number;
  onSelect: (item: HistoryItem) => void;
}

function fmtDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date(ts).toISOString();
  }
}

function dateToTimestamp(dateStr: string, endOfDay: boolean): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date.getTime();
}

export const HistoryPanel = ({ workspaceSlug, refreshKey, onSelect }: HistoryPanelProps) => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"this" | "all">(workspaceSlug ? "this" : "all");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailItem, setDetailItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    setItems(loadHistory());
  }, [refreshKey]);

  const roleOptions = useMemo(() => {
    const roles = new Map<string, string>();
    items.forEach((item) => {
      const role = item.result?.detected_role;
      if (role?.role) {
        roles.set(role.role, role.label_fa || role.role);
      }
    });
    return Array.from(roles.entries()).sort((a, b) => a[1].localeCompare(b[1], "fa-IR"));
  }, [items]);

  const filtered = useMemo(() => {
    const fromTs = dateToTimestamp(dateFrom, false);
    const toTs = dateToTimestamp(dateTo, true);
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      if (scope === "this" && workspaceSlug && item.workspaceSlug !== workspaceSlug) return false;
      if (query && !item.question.toLowerCase().includes(query)) return false;
      if (roleFilter !== "all" && item.result?.detected_role?.role !== roleFilter) return false;
      if (fromTs && item.createdAt < fromTs) return false;
      if (toTs && item.createdAt > toTs) return false;
      return true;
    });
  }, [items, scope, workspaceSlug, search, roleFilter, dateFrom, dateTo]);

  const hasActiveFilters = search || roleFilter !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const handleDelete = (id: string) => {
    deleteHistoryItem(id);
    setItems(loadHistory());
  };

  const handleClear = () => {
    if (!confirm("همه تاریخچه حذف شود؟")) return;
    clearHistory();
    setItems([]);
  };

  return (
    <div className="bg-card rounded-2xl shadow-legal border border-border overflow-hidden mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-gold-pale/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gold" />
          <span className="text-sm font-bold text-navy">
            تاریخچه تحلیل‌ها {items.length > 0 && `(${items.length})`}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-navy" /> : <ChevronDown className="w-4 h-4 text-navy" />}
      </button>

      {open && (
        <div className="p-4 border-t border-border space-y-3">
          {/* Scope + search */}
          <div className="space-y-2">
            {workspaceSlug && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setScope("this")}
                  className={`rounded-lg px-3 py-1 border transition-colors ${
                    scope === "this"
                      ? "bg-navy text-primary-foreground border-navy"
                      : "bg-parchment text-navy border-border hover:border-gold"
                  }`}
                >
                  این فضای کاری
                </button>
                <button
                  onClick={() => setScope("all")}
                  className={`rounded-lg px-3 py-1 border transition-colors ${
                    scope === "all"
                      ? "bg-navy text-primary-foreground border-navy"
                      : "bg-parchment text-navy border-border hover:border-gold"
                  }`}
                >
                  همه فضاها
                </button>
                <span className="mr-auto text-muted-foreground">{filtered.length} مورد</span>
              </div>
            )}

            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در عنوان/سوال..."
                className="w-full bg-parchment border border-border rounded-xl pr-9 pl-9 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all placeholder:text-muted-foreground font-vazir"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[140px] space-y-1">
              <label className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Filter className="w-3 h-3" />
                نقش تشخیص‌داده‌شده
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full bg-parchment border border-border rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold font-vazir"
              >
                <option value="all">همه نقش‌ها</option>
                {roleOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[120px] space-y-1">
              <label className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                از تاریخ
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-parchment border border-border rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold font-vazir"
              />
            </div>

            <div className="flex-1 min-w-[120px] space-y-1">
              <label className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                تا تاریخ
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-parchment border border-border rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold font-vazir"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 rounded-lg px-2 py-2 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                پاک کردن فیلترها
              </button>
            )}
          </div>

          {!workspaceSlug && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{filtered.length} مورد</span>
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {items.length === 0
                ? "هنوز تحلیلی ذخیره نشده. پس از هر تحلیل به‌طور خودکار اینجا نگه‌داری می‌شود."
                : "موردی با فیلترهای انتخاب‌شده یافت نشد."}
            </p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {filtered.map((h) => (
                <li
                  key={h.id}
                  className="flex items-start gap-2 p-2.5 bg-parchment rounded-lg border border-border hover:border-gold transition-colors"
                >
                  <button onClick={() => setDetailItem(h)} className="flex-1 text-right">
                    <p className="text-xs text-navy line-clamp-2 leading-relaxed">{h.question}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                      <span>{fmtDate(h.createdAt)}</span>
                      {h.workspaceName && <span>• {h.workspaceName}</span>}
                      {h.result?.detected_role?.label_fa && (
                        <span className="text-gold font-bold">• {h.result.detected_role.label_fa}</span>
                      )}
                      {h.detailed && <span className="text-gold font-bold">• تحلیل ویژه</span>}
                    </div>
                  </button>
                  <button
                    onClick={() => setDetailItem(h)}
                    className="p-1.5 text-navy hover:bg-gold-pale rounded-md"
                    title="مشاهده جزئیات"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(h.id)}
                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {items.length > 0 && (
            <button
              onClick={handleClear}
              className="w-full text-xs text-destructive hover:underline pt-1"
            >
              پاک‌کردن کامل تاریخچه
            </button>
          )}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto font-vazir" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-navy text-base text-right">جزئیات تحلیل حقوقی</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4 text-right">
              <div className="text-[11px] text-muted-foreground flex flex-wrap gap-2">
                <span>{fmtDate(detailItem.createdAt)}</span>
                {detailItem.workspaceName && <span>• {detailItem.workspaceName}</span>}
                {detailItem.result?.detected_role?.label_fa && (
                  <span className="text-gold font-bold">• {detailItem.result.detected_role.label_fa}</span>
                )}
                {detailItem.detailed && <span className="text-gold font-bold">• تحلیل ویژه</span>}
              </div>

              <div className="bg-parchment rounded-lg p-3 border border-border">
                <p className="text-[11px] text-muted-foreground mb-1">سوال کاربر:</p>
                <p className="text-sm text-navy leading-relaxed">{detailItem.question}</p>
              </div>

              {detailItem.result?.summary && (
                <div className="rounded-xl border border-border border-r-4 border-r-navy bg-secondary p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="w-4 h-4 text-navy" />
                    <h4 className="text-navy font-bold text-sm">خلاصه پرونده</h4>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {detailItem.result.summary}
                  </p>
                </div>
              )}

              {Array.isArray(detailItem.result?.legalBasis) && detailItem.result.legalBasis.length > 0 && (
                <div className="rounded-xl border border-border border-r-4 border-r-gold bg-gold-pale p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-gold" />
                    <h4 className="text-navy font-bold text-sm">مبانی قانونی مرتبط</h4>
                  </div>
                  <ul className="space-y-1.5">
                    {detailItem.result.legalBasis.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <ChevronLeft className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                        <span className="text-foreground leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detailItem.result?.analysis && (
                <div className="rounded-xl border border-border border-r-4 border-r-navy bg-secondary p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="w-4 h-4 text-navy" />
                    <h4 className="text-navy font-bold text-sm">تحلیل حقوقی</h4>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {detailItem.result.analysis}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="sm:justify-start gap-2">
            <button
              onClick={() => {
                if (detailItem) {
                  onSelect(detailItem);
                  setDetailItem(null);
                }
              }}
              className="flex items-center gap-2 gradient-gold text-navy font-bold rounded-xl px-4 py-2 text-sm shadow-gold hover:opacity-90 transition-all"
            >
              <Send className="w-4 h-4" />
              بارگذاری کامل در تحلیل‌گر
            </button>
            <button
              onClick={() => setDetailItem(null)}
              className="bg-secondary text-navy border border-border rounded-xl px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              بستن
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

