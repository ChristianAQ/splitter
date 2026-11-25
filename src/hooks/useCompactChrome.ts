import { useSyncExternalStore } from "react";

/**
 * Whether the tab bar (and the + button riding above it) should be in its
 * minimized form: scrolling down into a page tucks it away, the way iOS
 * shrinks its tab bar; scrolling back up, reaching the top or the bottom of
 * the page, or changing page brings it back.
 *
 * One scroll listener for the whole app, shared through a tiny store so the
 * tab bar and the + button always move together.
 */

/** Finger travel in one direction before the bar changes — small jitters
 * while reading don't make it flicker. */
const THRESHOLD = 14;
/** Near the top it always shows in full. */
const TOP_ZONE = 32;

let compact = false;
let anchor = 0;
let frame = 0;
const listeners = new Set<() => void>();

function set(next: boolean) {
  if (next === compact) return;
  compact = next;
  listeners.forEach((l) => l());
}

function measure() {
  frame = 0;
  // A sheet or dialog is open: the page behind it isn't being scrolled.
  if (document.body.style.overflow === "hidden") return;
  const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
  // Clamped, so iOS's rubber-band past either end doesn't read as a
  // change of direction.
  const y = Math.min(Math.max(window.scrollY, 0), max);

  if (y < TOP_ZONE || (max > 0 && y >= max - 2 && max > TOP_ZONE * 4)) {
    anchor = y;
    set(false);
    return;
  }
  if (compact) {
    if (y > anchor) anchor = y; // still going down: follow
    else if (anchor - y > THRESHOLD) {
      anchor = y;
      set(false);
    }
  } else {
    if (y < anchor) anchor = y; // still going up: follow
    else if (y - anchor > THRESHOLD) {
      anchor = y;
      set(true);
    }
  }
}

function onScroll() {
  if (!frame) frame = requestAnimationFrame(measure);
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    anchor = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("scroll", onScroll);
  };
}

/** Back to full size (a new page, a tap on the bar). */
export function expandChrome() {
  anchor = window.scrollY;
  set(false);
}

export function useCompactChrome() {
  return useSyncExternalStore(
    subscribe,
    () => compact,
    () => false
  );
}
