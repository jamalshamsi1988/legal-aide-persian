// ============================================================
// کامپوننت اصلی اپلیکیشن - تعریف مسیرهای Routing
// ============================================================
// Providerهای سطح بالا:
// - QueryClientProvider: برای مدیریت Cache و State queries (TanStack Query)
// - TooltipProvider: برای نمایش Tooltipهای رادیکس UI
// - Toaster / Sonner: برای نمایش Toastهای اعلان
// ============================================================
// مسیرهای اصلی:
// - "/"               : صفحه اصلی (Index)
// - "/workspace/:slug" : فضای کاری کاربر با قابلیت تحلیل حقوقی
// - "/admin/corpus"   : مدیریت پایگاه دانش (فقط ادمین)
// - "/admin/audit"    : گزارش‌های ممیزی (فقط ادمین)
// - "/admin/relations": مدیریت روابط حقوقی (فقط ادمین)
// - "*"               : صفحه 404 (NotFound)
// ============================================================
// نکته: مسیرهای admin باید با ProtectedRoute محافظت شوند
// برای فعال کردن محافظت، از کامپوننت ProtectedRoute استفاده کنید:
//   import { ProtectedRoute } from "@/components/ProtectedRoute";
//   <Route path="/admin/corpus" element={
//     <ProtectedRoute requireAdmin>
//       <AdminCorpus />
//     </ProtectedRoute>
//   } />
// ============================================================

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import WorkspacePage from "./pages/WorkspacePage";
import AdminCorpus from "./pages/AdminCorpus";
import AdminAudit from "./pages/AdminAudit";
import AdminRelations from "./pages/AdminRelations";
import NotFound from "./pages/NotFound";

// ============================================================
// ایجاد Instance QueryClient برای TanStack Query
// ============================================================
// این Instance در کل اپلیکیشن استفاده می‌شود و
// کش کردن داده‌های سرور و مدیریت State را بر عهده دارد.
// ============================================================
const queryClient = new QueryClient();

// ============================================================
// کامپوننت اصلی App با ساختار Providerها
// ============================================================
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* صفحه اصلی - landing page */}
          <Route path="/" element={<Index />} />
          {/* فضای کاری کاربر - جستجو و تحلیل حقوقی */}
          <Route path="/workspace/:slug" element={<WorkspacePage />} />
          {/* مدیریت پایگاه دانش حقوقی */}
          <Route path="/admin/corpus" element={<AdminCorpus />} />
          {/* گزارش‌های ممیزی و Auditing */}
          <Route path="/admin/audit" element={<AdminAudit />} />
          {/* مدیریت روابط بین اسناد حقوقی */}
          <Route path="/admin/relations" element={<AdminRelations />} />
          {/* صفحه 404 - برای مسیرهای نامعتبر */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
