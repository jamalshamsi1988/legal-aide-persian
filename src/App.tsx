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
import AuthPage from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<Index />} />
            <Route
              path="/workspace/:slug"
              element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>}
            />
            <Route
              path="/admin/corpus"
              element={<ProtectedRoute requireAdmin><AdminCorpus /></ProtectedRoute>}
            />
            <Route
              path="/admin/audit"
              element={<ProtectedRoute requireAdmin><AdminAudit /></ProtectedRoute>}
            />
            <Route
              path="/admin/relations"
              element={<ProtectedRoute requireAdmin><AdminRelations /></ProtectedRoute>}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
