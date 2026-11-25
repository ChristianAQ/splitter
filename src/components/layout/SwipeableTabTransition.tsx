import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home } from "../../pages/Home";
import { Expenses } from "../../pages/Expenses";
import { Groups } from "../../pages/Groups";
import { Stats } from "../../pages/Stats";
import { Settings } from "../../pages/Settings";
import { haptic } from "../../lib/haptics";

const TABS: { path: string; Component: ComponentType }[] = [
  { path: "/", Component: Home },
  { path: "/gastos", Component: Expenses },
  { path: "/grupos", Component: Groups },
  { path: "/estadisticas", Component: Stats },
  { path: "/perfil", Component: Settings },
];

const RECOGNIZE_THRESHOLD = 10;
const DIRECTION_RATIO = 1.5;
const COMMIT_FRACTION = 0.2;
const SETTLE_MS = 260;
const SETTLE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
// Extra hold after navigating, with the already-loaded preview still covering
// the screen, before handing off to the freshly-mounted real page — that
// fresh mount re-subscribes to its data from scratch and briefly shows its
// own loading state, which otherwise flashes on screen as a spurious reload
// right as the swipe finishes.
const REVEAL_GRACE_MS = 160;

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

// No background of their own: both slides are see-through and travel side by
// side over the app's fixed ambient backdrop (index.css, body::before), which
// stays put while the pages move across it.
const SLIDE_BG = "";

/** Instagram-style paging: dragging horizontally slides the current page
 * out while the real destination page (mounted live, not a placeholder)
 * slides in from the edge in lock-step with the finger, and releasing
 * short of the commit threshold (COMMIT_FRACTION of the screen width)
 * slides both back to where they started instead of navigating.
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

    const gesture = { active: false, excluded: false, recognized: false, onSwipeRow: false, startX: 0, startY: 0 };

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1 || settleTimeoutRef.current) return;
      const touch = e.touches[0];
      gesture.active = true;
      gesture.recognized = false;
      gesture.excluded = isExcluded(e.target) || window.scrollY !== 0;
      gesture.onSwipeRow = e.target instanceof Element && e.target.closest("[data-swipe-row]") !== null;
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
        // A leftward drag that starts on a swipe-to-delete row belongs to
        // that row (see ui/SwipeToDelete) — without this both would move
        // at once: the card under the finger and the whole page with it.
        // Rightward drags from the same spot still change page.
        if (Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO || (gesture.onSwipeRow && dx < 0)) {
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

        if (targetIndex !== null) haptic();
        settleTimeoutRef.current = setTimeout(() => {
          if (targetIndex === null) {
            settleTimeoutRef.current = null;
            setDrag(null);
            return;
          }
          // Commit the route now, but keep the (already-loaded) preview
          // covering the screen a little longer — see REVEAL_GRACE_MS.
          navigate(TABS[targetIndex].path);
          settleTimeoutRef.current = setTimeout(() => {
            settleTimeoutRef.current = null;
            setDrag(null);
          }, REVEAL_GRACE_MS);
        }, SETTLE_MS);

        return { dx: finalDx, targetIndex, settling: true };
      });
    }

    // iOS can take the touch away mid-drag without a touchend (a system
    // gesture, a call, the app going to the background). Never leave the
    // page stranded half off the screen when that happens.
    function abandon() {
      if (!gesture.active && !gesture.recognized) return;
      gesture.active = false;
      gesture.recognized = false;
      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
        settleTimeoutRef.current = null;
      }
      setDrag(null);
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") abandon();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", abandon);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", finishGesture, { passive: true });
    document.addEventListener("touchcancel", finishGesture, { passive: true });
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", abandon);
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

  // Navigated some other way (a tab tapped mid-settle): drop any leftover
  // offset rather than show the new page shifted sideways.
  useEffect(() => {
    if (settleTimeoutRef.current) return;
    setDrag(null);
  }, [location.pathname]);

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
                transition: drag.settling ? `transform ${SETTLE_MS}ms ${SETTLE_EASE}` : "none",
              }
            : undefined
        }
      >
        {children}
      </div>
      {previewTarget && (
        // A viewport-sized frame that clips the sliding preview. Without it
        // the preview hangs off the side of the screen while it slides in,
        // and iOS answers anything wider than the screen by letting the
        // whole page be panned sideways — out of frame.
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
          <div
            className={SLIDE_BG}
            style={{
              position: "absolute",
              inset: 0,
              transform: `translateX(${previewX}px)`,
              transition: drag?.settling ? `transform ${SETTLE_MS}ms ${SETTLE_EASE}` : "none",
            }}
          >
            <previewTarget.Component />
          </div>
        </div>
      )}
    </>
  );
}
