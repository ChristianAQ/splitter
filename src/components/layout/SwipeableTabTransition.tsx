import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home } from "../../pages/Home";
import { Expenses } from "../../pages/Expenses";
import { Groups } from "../../pages/Groups";
import { Stats } from "../../pages/Stats";
import { Settings } from "../../pages/Settings";

const TABS: { path: string; Component: ComponentType }[] = [
  { path: "/", Component: Home },
  { path: "/gastos", Component: Expenses },
  { path: "/grupos", Component: Groups },
  { path: "/estadisticas", Component: Stats },
  { path: "/perfil", Component: Settings },
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

const SLIDE_BG = "bg-surface-light-subtle dark:bg-surface-dark";

/** Instagram-style paging: dragging horizontally slides the current page
 * out while the real destination page (mounted live, not a placeholder)
 * slides in from the edge in lock-step with the finger, and releasing
 * short of a one-third-of-screen commit threshold slides both back to
 * where they started instead of navigating.
 *
 * The current page stays in normal document flow (unchanged scroll
 * architecture) and only ever gets a transform while the drag is at
 * scrollY 0 — otherwise its `fixed` TopBar would re-anchor to the
 * wrapper's scrolled-off position and visibly jump. The neighboring page
 * shown mid-drag is instead pinned full-screen (`fixed; inset: 0`) so its
 * own TopBar is always correctly placed regardless of the current page's
 * scroll position, and it's non-interactive (`pointer-events: none`) and
 * clipped since it only exists to be peeked at, not scrolled or tapped,
 * during the split second before a real navigation replaces it. */
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

  const previewTarget = drag && drag.targetIndex !== null ? TABS[drag.targetIndex] : null;
  const width = typeof window !== "undefined" ? window.innerWidth : 0;
  const previewX = drag && previewTarget ? (drag.dx < 0 ? width + drag.dx : -width + drag.dx) : 0;

  return (
    <>
      <div
        className={SLIDE_BG}
        style={
          drag
            ? {
                position: "relative",
                zIndex: 10,
                transform: `translateX(${drag.dx}px)`,
                transition: drag.settling ? `transform ${SETTLE_MS}ms ease-out` : "none",
              }
            : undefined
        }
      >
        {children}
      </div>
      {previewTarget && (
        <div
          aria-hidden
          className={SLIDE_BG}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5,
            overflow: "hidden",
            pointerEvents: "none",
            transform: `translateX(${previewX}px)`,
            transition: drag?.settling ? `transform ${SETTLE_MS}ms ease-out` : "none",
          }}
        >
          <previewTarget.Component />
        </div>
      )}
    </>
  );
}
