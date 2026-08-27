import { useEffect } from "react";

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * The native rubber-band bounce at the top/bottom of the page is left alone
 * everywhere (see index.css) — including iOS standalone (added-to-home-
 * screen), where it's just as much a part of the native-app feel as in a
 * regular Safari tab. Standalone has one WKWebView-specific quirk though:
 * without browser chrome to force a reflow once the bounce settles, the
 * page can occasionally end up visually offset by a few pixels even though
 * `scrollTop` itself is already back to the correct value — a paint/
 * compositor sync issue, not a logical scroll-position bug. A 1px
 * nudge-and-back after a gesture that touched the top/bottom edge forces
 * WebKit to repaint at the true position, fixing the glitch without ever
 * preventing or altering the bounce itself. Regular browser tabs (where
 * this doesn't happen) never attach these listeners.
 */
export function useFixStandaloneBounceGlitch() {
  useEffect(() => {
    if (!isStandalone()) return;

    let touchedBoundary = false;
    let nudgeTimer: ReturnType<typeof setTimeout> | undefined;

    function onTouchMove() {
      const scroller = document.scrollingElement;
      if (!scroller) return;
      const atTop = scroller.scrollTop <= 0;
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
      if (atTop || atBottom) touchedBoundary = true;
    }

    function onTouchEnd() {
      if (!touchedBoundary) return;
      touchedBoundary = false;
      clearTimeout(nudgeTimer);
      // Long enough for iOS's own bounce-back animation to have settled
      // before nudging — nudging mid-animation would just fight it.
      nudgeTimer = setTimeout(() => {
        const scroller = document.scrollingElement;
        if (!scroller) return;
        const y = scroller.scrollTop;
        window.scrollBy(0, 1);
        window.scrollBy(0, -1);
        if (scroller.scrollTop !== y) scroller.scrollTop = y;
      }, 350);
    }

    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      clearTimeout(nudgeTimer);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);
}
