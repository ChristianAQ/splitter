import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { BottomNav } from "./components/layout/BottomNav";
import { FAB } from "./components/layout/FAB";
import { QuickAddSheet } from "./components/expense/QuickAddSheet";

// The offline banner used to live here as a page-wide sticky sibling of
// <main>, stacked on top of each page's own sticky TopBar — since both sit
// in the same scrolling ancestor with `top: 0`, they'd overlap once scrolled
// past the banner's height. TopBar now renders it inside its own fixed
// stack instead (see components/layout/TopBar.tsx), and Home (the one page
// without a TopBar) renders it inline itself.
export function AppLayout({ children }: { children: ReactNode }) {
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
