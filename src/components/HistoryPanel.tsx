// ============================================================
// تاریخچه تحلیل‌های حقوقی — ذخیره‌سازی در localStorage
// ============================================================
import { useEffect, useState } from "react";
import { History, Trash2, ChevronDown, ChevronUp } from "lucide-react";

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

export const HistoryPanel = ({ workspaceSlug, refreshKey, onSelect }: HistoryPanelProps) => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"this" | "all">(workspaceSlug ? "this" : "all");

  useEffect(() => {
    setItems(loadHistory());
  }, [refreshKey]);

  const filtered = scope === "this" && workspaceSlug
    ? items.filter((i) => i.workspaceSlug === workspaceSlug)
    : items;

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

          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              هنوز تحلیلی ذخیره نشده. پس از هر تحلیل به‌طور خودکار اینجا نگه‌داری می‌شود.
            </p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {filtered.map((h) => (
                <li
                  key={h.id}
                  className="flex items-start gap-2 p-2.5 bg-parchment rounded-lg border border-border hover:border-gold transition-colors"
                >
                  <button
                    onClick={() => onSelect(h)}
                    className="flex-1 text-right"
                  >
                    <p className="text-xs text-navy line-clamp-2 leading-relaxed">
                      {h.question}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span>{fmtDate(h.createdAt)}</span>
                      {h.workspaceName && <span>• {h.workspaceName}</span>}
                      {h.detailed && <span className="text-gold font-bold">• تحلیل ویژه</span>}
                    </div>
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
    </div>
  );
};
