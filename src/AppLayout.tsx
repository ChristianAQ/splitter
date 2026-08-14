import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { BottomNav } from "./components/layout/BottomNav";
import { FAB } from "./components/layout/FAB";
import { OfflineBanner } from "./components/ui/ErrorState";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { QuickAddSheet } from "./components/expense/QuickAddSheet";

export function AppLayout({ children }: { children: ReactNode }) {
  const online = useOnlineStatus();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const location = useLocation();
  const hideFab = location.pathname.startsWith("/perfil");

  return (
    <div className="min-h-screen">
      {!online && <div className="sticky top-0 z-50">{<OfflineBanner />}</div>}
      <main className="pb-24">{children}</main>
      {!hideFab && <FAB onClick={() => setQuickAddOpen(true)} />}
      <BottomNav />
      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  );
}
