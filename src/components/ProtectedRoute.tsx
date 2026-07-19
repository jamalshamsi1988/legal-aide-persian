import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: Props) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-section">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-section p-6">
        <div className="bg-card rounded-2xl border border-border p-8 max-w-md text-center">
          <h2 className="text-lg font-bold text-navy mb-2">دسترسی محدود</h2>
          <p className="text-sm text-muted-foreground">
            این بخش فقط برای مدیران قابل مشاهده است.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
