import { useRef, useState, type ReactNode } from "react";

const THRESHOLD = 72; // px of pull before releasing triggers a refresh
const MAX_PULL = 110;

/**
 * Native-feeling pull-to-refresh for the installed-PWA case, where iOS/
 * Android don't offer the browser's own pull-to-refresh in standalone mode.
 * A full reload is the refresh mechanism on purpose: HashRouter keeps the
 * route in the URL fragment, so reloading lands back on the exact same
 * screen once Firebase Auth restores the persisted session — "refresh but
 * stay where I am" without hand-rolling a re-fetch for every page.
 */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleTouchStart(e: React.TouchEvent) {
    if (refreshing) return;
    if ((containerRef.current?.scrollTop ?? 0) > 0) {
      startY.current = null;
      return;
    }
    startY.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    // Resistance curve so it doesn't feel like a 1:1 drag.
    setPull(Math.min(MAX_PULL, delta * 0.5));
  }

  function handleTouchEnd() {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      window.location.reload();
    } else {
      setPull(0);
    }
  }

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div
      ref={containerRef}
      className="min-h-screen overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] motion-reduce:hidden"
        style={{ height: pull, transitionDuration: startY.current ? "0ms" : "200ms" }}
        aria-hidden={pull === 0}
      >
        <div
          className={`h-6 w-6 rounded-full border-2 border-accent-200 border-t-accent ${
            refreshing ? "animate-spin" : ""
          }`}
          style={{
            transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
            opacity: Math.max(0.3, progress),
          }}
        />
      </div>
      {children}
    </div>
  );
}
