import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children, requireAdmin = false }: { children: JSX.Element; requireAdmin?: boolean }) => {
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
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6 gradient-section">
        <div>
          <h2 className="text-xl font-bold text-navy mb-2">دسترسی محدود</h2>
          <p className="text-muted-foreground">این بخش فقط برای مدیران در دسترس است.</p>
        </div>
      </div>
    );
  }
  return children;
};
