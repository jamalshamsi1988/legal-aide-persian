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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/workspace/:slug" element={<WorkspacePage />} />
          <Route path="/admin/corpus" element={<AdminCorpus />} />
          <Route path="/admin/audit" element={<AdminAudit />} />
          <Route path="/admin/relations" element={<AdminRelations />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
