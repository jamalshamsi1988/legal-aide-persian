import { LegalHeader } from "@/components/LegalHeader";
import { WorkspaceSelector } from "@/components/WorkspaceSelector";

const Index = () => {
  return (
    <div className="min-h-screen gradient-section">
      <LegalHeader />
      <WorkspaceSelector />
    </div>
  );
};

export default Index;
