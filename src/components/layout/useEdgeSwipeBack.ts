import { useEffect, type RefObject } from "react";
import { haptic } from "../../lib/haptics";

/** How close to the left edge a touch must start to count. */
const EDGE = 28;
const RECOGNIZE = 8;
const COMMIT_FRACTION = 0.33;
/** A fast flick commits even if it hasn't travelled far. */
const FLICK_SPEED = 0.5; // px per ms
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SETTLE_MS = 260;

/**
 * iOS's swipe from the left edge to go back, for the pages that have a back
 * button — an app added to the home screen has no browser back gesture.
 *
 * The page follows the finger and either slides off (going back) or springs
 * into place. It's moved with `left` rather than a transform: a transformed
 * ancestor would turn the page's fixed header into one that scrolls away
 * with the content. The header doesn't move — sliding a fixed element past
 * the screen's edge is exactly what lets iOS pan the whole page sideways —
 * it fades out instead, through `--edge-swipe-progress` (see TopBar).
 *
 * Styles are written straight to the element, not through React state, so
 * a drag never re-renders the page.
 */
export function useEdgeSwipeBack(pageRef: RefObject<HTMLElement>, enabled: boolean, goBack: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const g = { active: false, recognized: false, cancelled: false, startX: 0, startY: 0, dx: 0, lastX: 0, lastT: 0, speed: 0 };

    const paint = (x: number, animate: boolean) => {
      const page = pageRef.current;
      if (!page) return;
      const transition = animate ? `left ${SETTLE_MS}ms ${EASE}, box-shadow ${SETTLE_MS}ms ${EASE}` : "none";
      page.style.position = "relative";
      page.style.transition = transition;
      page.style.left = `${x}px`;
      page.style.boxShadow = x > 0 ? "-12px 0 32px -12px rgb(0 0 0 / 0.35)" : "";
      root.style.setProperty("--edge-swipe-progress", String(Math.min(x / window.innerWidth, 1)));
      root.style.setProperty("--edge-swipe-transition", animate ? `opacity ${SETTLE_MS}ms ${EASE}` : "none");
    };
    const reset = () => {
      const page = pageRef.current;
      if (page) {
        page.style.position = "";
        page.style.transition = "";
        page.style.left = "";
        page.style.boxShadow = "";
      }
      root.style.removeProperty("--edge-swipe-progress");
      root.style.removeProperty("--edge-swipe-transition");
    };

    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      g.active = e.touches.length === 1 && t.clientX <= EDGE && document.body.style.overflow !== "hidden"; // no sheet open
      g.recognized = false;
      g.cancelled = false;
      g.startX = g.lastX = t.clientX;
      g.startY = t.clientY;
      g.lastT = e.timeStamp;
      g.dx = 0;
      g.speed = 0;
    }
    function onMove(e: TouchEvent) {
      if (!g.active || g.cancelled) return;
      const t = e.touches[0];
      const dx = t.clientX - g.startX;
      const dy = t.clientY - g.startY;
      if (!g.recognized) {
        if (Math.abs(dx) < RECOGNIZE && Math.abs(dy) < RECOGNIZE) return;
        if (dx <= 0 || Math.abs(dy) > Math.abs(dx)) {
          g.cancelled = true;
          return;
        }
        g.recognized = true;
      }
      e.preventDefault();
      const dt = Math.max(e.timeStamp - g.lastT, 1);
      g.speed = (t.clientX - g.lastX) / dt;
      g.lastX = t.clientX;
      g.lastT = e.timeStamp;
      g.dx = Math.max(dx, 0);
      paint(g.dx, false);
    }
    function onEnd() {
      if (!g.active) return;
      g.active = false;
      if (!g.recognized) return;
      const width = window.innerWidth;
      const commit = g.dx > width * COMMIT_FRACTION || (g.speed > FLICK_SPEED && g.dx > 40);
      if (commit) {
        haptic();
        paint(width, true);
        setTimeout(() => {
          goBack();
          // The next page mounts in place; clear after it has.
          requestAnimationFrame(reset);
        }, SETTLE_MS);
      } else {
        paint(0, true);
        setTimeout(reset, SETTLE_MS);
      }
    }

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
      reset();
    };
  }, [pageRef, enabled, goBack]);
}
