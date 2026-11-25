import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BottomNav } from "./components/layout/BottomNav";
import { FAB } from "./components/layout/FAB";
import { QuickAddSheet } from "./components/expense/QuickAddSheet";
import { useLegacyMigrations } from "./hooks/useLegacyMigrations";
import { SwipeableTabTransition } from "./components/layout/SwipeableTabTransition";
import { useEdgeSwipeBack } from "./components/layout/useEdgeSwipeBack";
import { isRestorableRoute, readLast, writeLast } from "./lib/lastPlace";

const TAB_PATHS = ["/", "/gastos", "/grupos", "/estadisticas", "/perfil"];
// Once per launch: reopening the app goes back to where it was left.
let restoredThisLaunch = false;

export function AppLayout({ children }: { children: ReactNode }) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  useLegacyMigrations();

  // Like a native app, open on the screen that was open last time — only
  // when launched onto Inicio (a link into a specific screen wins).
  useEffect(() => {
    if (restoredThisLaunch) return;
    restoredThisLaunch = true;
    const last = readLast("route");
    if (location.pathname === "/" && !location.search && last && last !== "/" && isRestorableRoute(last.split("?")[0])) {
      navigate(last, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (restoredThisLaunch && isRestorableRoute(location.pathname)) writeLast("route", location.pathname + location.search);
  }, [location.pathname, location.search]);

  // Screens under a tab (a group, Amigos) go back with a swipe from the
  // left edge, as on iOS.
  const isTab = TAB_PATHS.includes(location.pathname);
  const goBack = useCallback(() => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate("/grupos", { replace: true });
  }, [navigate]);
  useEdgeSwipeBack(mainRef, !isTab, goBack);
  // Perfil has nothing to add. In Grupos the + is the group's own: the list
  // has its own "+" in the header, and a group adds straight to itself
  // (GroupDetail renders that button).
  const hideFab = location.pathname.startsWith("/perfil") || location.pathname.startsWith("/grupos");

  // HashRouter navigation never triggers a real page load, so the browser
  // never resets scroll on its own the way it would between two server-
  // rendered pages — without this, a new page opens wherever the previous
  // one happened to be scrolled to. Runs on every pathname change (tab
  // switch, drilling into a group, going back), not on query-param-only
  // changes to the same page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // `overflow-x: clip`, not `hidden`: a card dragged off to the right
  // (swipe-to-delete) must not make the page itself pannable sideways on
  // iPhone, but `hidden` would turn this into a scroll container and break
  // the window-level scrolling everything else relies on.
  return (
    <div className="min-h-app overflow-x-clip">
      <SwipeableTabTransition>
        <main ref={mainRef} className="pb-24">
          {children}
        </main>
      </SwipeableTabTransition>
      {!hideFab && <FAB onClick={() => setQuickAddOpen(true)} />}
      <BottomNav />
      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  );
}
