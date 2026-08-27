import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, WalletMinimal, Users, ChartColumn, Settings, type LucideIcon } from "lucide-react";

interface Tab {
  path: string;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { path: "/", label: "Inicio", icon: Home },
  { path: "/gastos", label: "Gastos", icon: WalletMinimal },
  { path: "/grupos", label: "Grupos", icon: Users },
  { path: "/estadisticas", label: "Estadísticas", icon: ChartColumn },
  { path: "/perfil", label: "Perfil", icon: Settings },
];

const RECOGNIZE_THRESHOLD = 10;
const DIRECTION_RATIO = 1.5;
const COMMIT_FRACTION = 0.33;
const SETTLE_MS = 220;

function isExcluded(target: EventTarget | null): boolean {
  let node = target instanceof Node ? target : null;
  while (node) {
    if (node instanceof Element) {
      const role = node.getAttribute("role");
      if (role === "dialog" || role === "alertdialog") return true;
      const style = window.getComputedStyle(node);
      if ((style.overflowX === "auto" || style.overflowX === "scroll") && node.scrollWidth > node.clientWidth) {
        return true;
      }
    }
    node = node.parentNode;
  }
  return false;
}

interface DragState {
  dx: number;
  targetIndex: number | null;
  settling: boolean;
}

/** Lets the user drag between tabs and see the destination live, instead of
 * jumping straight there on release — dragging short of the commit
 * threshold snaps back to the current page with no navigation at all. Only
 * ever mounts one real page at a time (the transform lives on a wrapper
 * around `children`, never on a page itself) so each page's own `fixed`
 * TopBar stays scoped to sliding with its page; the "next" page is faked
 * with a static icon+label panel revealed underneath as the current one
 * slides away, avoiding the cost/complexity of mounting two real pages
 * side by side. */
export function SwipeableTabTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [drag, setDrag] = useState<DragState | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentIndex = TABS.findIndex((tab) => tab.path === location.pathname);

  useEffect(() => {
    if (currentIndex === -1) return;

    const gesture = { active: false, excluded: false, recognized: false, startX: 0, startY: 0 };

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1 || settleTimeoutRef.current) return;
      const touch = e.touches[0];
      gesture.active = true;
      gesture.recognized = false;
      // A page scrolled away from the top can't safely become the transform's
      // containing block (its `fixed` TopBar would re-anchor to the wrapper's
      // scrolled-off position and jump) — so swiping only engages at the top.
      gesture.excluded = isExcluded(e.target) || window.scrollY !== 0;
      gesture.startX = touch.clientX;
      gesture.startY = touch.clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (!gesture.active || gesture.excluded) return;
      const touch = e.touches[0];
      const dx = touch.clientX - gesture.startX;
      const dy = touch.clientY - gesture.startY;

      if (!gesture.recognized) {
        if (Math.abs(dx) < RECOGNIZE_THRESHOLD && Math.abs(dy) < RECOGNIZE_THRESHOLD) return;
        if (Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO) {
          gesture.excluded = true;
          return;
        }
        gesture.recognized = true;
      }

      e.preventDefault();

      const rawTarget = dx < 0 ? currentIndex + 1 : currentIndex - 1;
      const hasTarget = rawTarget >= 0 && rawTarget < TABS.length;
      // Rubber-band resistance past the first/last tab: it still moves a
      // little (so the drag never feels dead), but there is no destination
      // to reveal and release always snaps back.
      setDrag({ dx: hasTarget ? dx : dx / 3, targetIndex: hasTarget ? rawTarget : null, settling: false });
    }

    function finishGesture() {
      if (!gesture.active) return;
      gesture.active = false;
      if (!gesture.recognized) {
        setDrag(null);
        return;
      }

      setDrag((prev) => {
        if (!prev) return null;
        const width = window.innerWidth;
        const committed = prev.targetIndex !== null && Math.abs(prev.dx) > width * COMMIT_FRACTION;
        const targetIndex = committed ? prev.targetIndex : null;
        const finalDx = committed ? (prev.dx < 0 ? -width : width) : 0;

        settleTimeoutRef.current = setTimeout(() => {
          settleTimeoutRef.current = null;
          setDrag(null);
          if (targetIndex !== null) navigate(TABS[targetIndex].path);
        }, SETTLE_MS);

        return { dx: finalDx, targetIndex, settling: true };
      });
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", finishGesture, { passive: true });
    document.addEventListener("touchcancel", finishGesture, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", finishGesture);
      document.removeEventListener("touchcancel", finishGesture);
    };
  }, [currentIndex, navigate]);

  useEffect(() => {
    return () => {
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    };
  }, []);

  const previewTab = drag && drag.targetIndex !== null ? TABS[drag.targetIndex] : null;

  return (
    <div className="relative">
      {previewTab && (
        <div className="fixed inset-0 z-0 flex flex-col items-center justify-center gap-3 bg-surface-light-subtle text-neutral-300 dark:bg-surface-dark dark:text-neutral-700">
          <previewTab.icon size={40} strokeWidth={1.5} />
          <span className="text-sm font-medium">{previewTab.label}</span>
        </div>
      )}
      <div
        className="relative z-10 bg-surface-light-subtle dark:bg-surface-dark"
        style={
          drag
            ? { transform: `translateX(${drag.dx}px)`, transition: drag.settling ? `transform ${SETTLE_MS}ms ease-out` : "none" }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
