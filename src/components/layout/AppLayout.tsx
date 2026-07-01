import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { OfflineIndicator } from "@/components/common/OfflineIndicator";
import { KycBanner } from "@/components/common/KycBanner";

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export function AppLayout({ children, showNav = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <KycBanner />
      <main className={showNav ? "pb-20" : ""}>{children}</main>
      {showNav && <BottomNav />}
      <OfflineIndicator />
    </div>
  );
}
