import { useEffect } from "react";

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function hasScrollableAncestor(target: Element): boolean {
  let node: Element | null = target;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    if ((style.overflowY === "auto" || style.overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

/**
 * iOS "Add to Home Screen" (standalone display mode) lets the document
 * rubber-band past its top/bottom edge but, unlike Safari-with-chrome, has
 * no browser UI whose own reflow forces it back to rest — it can end up
 * visibly offset a few dozen pixels until the next scroll gesture.
 * `overscroll-behavior` is not reliably honored by WKWebView in this mode,
 * so the boundary bounce is suppressed directly via touch events instead.
 * Regular browser tabs (where the bug doesn't occur) never attach these
 * listeners, and any element with its own scrollable overflow (sheets,
 * modals) is left alone to handle its own touches.
 */
export function useSuppressStandaloneBounce() {
  useEffect(() => {
    if (!isStandalone()) return;

    let startY = 0;

    function onTouchStart(e: TouchEvent) {
      startY = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (hasScrollableAncestor(e.target as Element)) return;

      const scroller = document.scrollingElement;
      if (!scroller) return;
      const atTop = scroller.scrollTop <= 0;
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
      const draggingDown = e.touches[0].clientY > startY;

      if ((atTop && draggingDown) || (atBottom && !draggingDown)) {
        e.preventDefault();
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);
}
