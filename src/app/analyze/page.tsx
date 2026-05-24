import { TopNav } from "@/components/layout/top-nav";
import { ThreeColumn } from "@/components/layout/three-column";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { CenterPanel } from "@/components/layout/center-panel";
import { RightSidebar } from "@/components/layout/right-sidebar";

export default function AnalyzePage() {
  return (
    <>
      <TopNav />
      <ThreeColumn
        left={<LeftSidebar />}
        center={<CenterPanel />}
        right={<RightSidebar />}
      />
    </>
  );
}
