import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Same order as BottomNav's tabs — swiping moves one step at a time through
// this list, clamped at both ends (no wrap-around).
const TAB_ORDER = ["/", "/gastos", "/grupos", "/estadisticas", "/perfil"];

const DISTANCE_THRESHOLD = 70; // px of horizontal travel required
const DIRECTION_RATIO = 1.5; // horizontal must dominate vertical by this much, so a scroll never gets mistaken for a swipe

function isExcluded(target: Element): boolean {
  let node: Element | null = target;
  while (node && node !== document.body) {
    const role = node.getAttribute("role");
    if (role === "dialog" || role === "alertdialog") return true; // sheets/modals handle their own gestures
    const style = getComputedStyle(node);
    if ((style.overflowX === "auto" || style.overflowX === "scroll") && node.scrollWidth > node.clientWidth) {
      return true; // e.g. Stats' scope strip, the group-expense member picker
    }
    node = node.parentElement;
  }
  return false;
}

/**
 * Lets the five main tabs (see BottomNav) be swiped between horizontally,
 * on top of tapping their icons — the native-feeling "flick between
 * screens" gesture. Deliberately scoped to exactly those five routes (not
 * drill-down pages like a group's detail or a friend's profile, which have
 * their own back button and no well-defined "next tab").
 */
export function useSwipeTabNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const start = useRef<{ x: number; y: number } | null>(null);
  const excluded = useRef(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) {
        start.current = null;
        return;
      }
      const touch = e.touches[0];
      start.current = { x: touch.clientX, y: touch.clientY };
      excluded.current = isExcluded(e.target as Element);
    }

    function onTouchEnd(e: TouchEvent) {
      const origin = start.current;
      start.current = null;
      if (!origin || excluded.current) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - origin.x;
      const dy = touch.clientY - origin.y;

      if (Math.abs(dx) < DISTANCE_THRESHOLD) return;
      if (Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO) return;

      const currentIndex = TAB_ORDER.indexOf(location.pathname);
      if (currentIndex === -1) return;

      const nextIndex = currentIndex + (dx < 0 ? 1 : -1); // right-to-left swipe -> next tab
      if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) return;

      navigate(TAB_ORDER[nextIndex]);
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [location.pathname, navigate]);
}
