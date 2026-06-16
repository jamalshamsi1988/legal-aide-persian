import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Settings, Scale } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface Workspace {
  id: string;
  slug: string;
  name_fa: string;
  description: string | null;
  icon: string | null;
  order_index: number;
}

const renderIcon = (name: string | null) => {
  if (!name) return <Scale className="w-6 h-6" />;
  const Icon = (LucideIcons as any)[name];
  if (!Icon) return <Scale className="w-6 h-6" />;
  return <Icon className="w-6 h-6" />;
};

export const WorkspaceSelector = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("legal_workspaces")
        .select("*")
        .order("order_index");
      if (!error && data) setWorkspaces(data as Workspace[]);
      setLoading(false);
    })();
  }, []);

  const filtered = workspaces.filter(
    (w) =>
      w.name_fa.includes(search) ||
      (w.description || "").includes(search) ||
      w.slug.includes(search),
  );

  return (
    <main className="container max-w-6xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-navy">انتخاب فضای کاری حقوقی</h2>
          <p className="text-sm text-muted-foreground mt-1">
            یکی از ۴۰ حوزه تخصصی را انتخاب کنید تا تحلیل بر اساس پایگاه دانش همان حوزه انجام شود.
          </p>
        </div>
        <Link
          to="/admin/corpus"
          className="flex items-center gap-2 bg-secondary text-navy border border-border rounded-xl px-4 py-2 text-sm hover:bg-muted"
        >
          <Settings className="w-4 h-4" />
          مدیریت دانش
        </Link>
      </div>

      <div className="relative mb-6">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در حوزه‌های حقوقی..."
          className="w-full bg-parchment border border-border rounded-xl py-3 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold font-vazir"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((w) => (
            <Link
              key={w.id}
              to={`/workspace/${w.slug}`}
              className="group bg-card border border-border rounded-xl p-4 hover:border-gold hover:shadow-gold transition-all duration-200 text-right"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold-pale text-navy flex items-center justify-center group-hover:bg-gold transition-colors">
                  {renderIcon(w.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-navy font-bold text-sm leading-snug">{w.name_fa}</h3>
                  {w.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {w.description}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">حوزه‌ای یافت نشد.</p>
      )}
    </main>
  );
};
