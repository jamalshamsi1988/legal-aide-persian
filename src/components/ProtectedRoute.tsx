// ============================================================
// کامپوننت محافظت از مسیرها (ProtectedRoute)
// ============================================================
// این کامپوننت برای محافظت از مسیرهای حساس استفاده می‌شود:
// - بررسی می‌کند کاربر وارد شده باشد یا نه
// - در صورت عدم ورود، کاربر به صفحه احراز هویت هدایت می‌شود
// - اگر requireAdmin=true باشد، فقط کاربران با نقش "admin" می‌توانند وارد شوند
// - در صورت عدم دسترسی، پیام مناسب نمایش داده می‌شود
//
// نحوه استفاده در App.tsx:
//   <Route path="/admin/corpus" element={
//     <ProtectedRoute requireAdmin>
//       <AdminCorpus />
//     </ProtectedRoute>
//   } />
// ============================================================

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

// ============================================================
// پراپ‌های کامپوننت
// ============================================================
// - children: محتوای محافظت شده
// - requireAdmin: آیا فقط ادمین‌ها دسترسی دارند؟ (پیش‌فرض: false)
// ============================================================
export const ProtectedRoute = ({ children, requireAdmin = false }: { children: JSX.Element; requireAdmin?: boolean }) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  // ============================================================
  // در حال بارگذاری وضعیت احراز هویت - نمایش اسپینر
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-section">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  // ============================================================
  // کاربر وارد نشده - هدایت به صفحه احراز هویت
  // ============================================================
  // state={{ from: location.pathname }} برای بازگشت پس از ورود استفاده می‌شود
  // ============================================================
  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // ============================================================
  // بررسی دسترسی ادمین (اگر requireAdmin فعال باشد)
  // ============================================================
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

  // ============================================================
  // کاربر احراز هویت شده و دسترسی دارد - نمایش محتوا
  // ============================================================
  return children;
};
