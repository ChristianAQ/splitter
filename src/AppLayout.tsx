import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { BottomNav } from "./components/layout/BottomNav";
import { FAB } from "./components/layout/FAB";
import { QuickAddSheet } from "./components/expense/QuickAddSheet";
import { useSuppressStandaloneBounce } from "./hooks/useSuppressStandaloneBounce";

export function AppLayout({ children }: { children: ReactNode }) {
  useSuppressStandaloneBounce();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const location = useLocation();
  const hideFab = location.pathname.startsWith("/perfil");

  return (
    <div className="min-h-screen">
      <main className="pb-24">{children}</main>
      {!hideFab && <FAB onClick={() => setQuickAddOpen(true)} />}
      <BottomNav />
      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  );
}
