import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { BottomNav } from "./components/layout/BottomNav";
import { FAB } from "./components/layout/FAB";
import { QuickAddSheet } from "./components/expense/QuickAddSheet";
import { SwipeableTabTransition } from "./components/layout/SwipeableTabTransition";

export function AppLayout({ children }: { children: ReactNode }) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const location = useLocation();
  const hideFab = location.pathname.startsWith("/perfil") || location.pathname === "/grupos";

  // HashRouter navigation never triggers a real page load, so the browser
  // never resets scroll on its own the way it would between two server-
  // rendered pages — without this, a new page opens wherever the previous
  // one happened to be scrolled to. Runs on every pathname change (tab
  // switch, drilling into a group, going back), not on query-param-only
  // changes to the same page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <SwipeableTabTransition>
        <main className="pb-24">{children}</main>
      </SwipeableTabTransition>
      {!hideFab && <FAB onClick={() => setQuickAddOpen(true)} />}
      <BottomNav />
      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  );
}
