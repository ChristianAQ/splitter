import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

/**
 * Which data position the pointer is over, for the charts' tooltips.
 *
 * - Mouse: follows the pointer, cleared when it leaves.
 * - Touch: press and slide sideways to scrub (vertical drags still scroll
 *   the page — the chart sets `touch-action: pan-y`); the readout stays
 *   after lifting the finger, until the next tap somewhere else.
 * - Keyboard: arrow keys step through the positions while focused.
 *
 * `mode` is how x maps to an index: "band" for columns (each owns an equal
 * slice), "point" for lines (nearest of `count` evenly spaced points).
 */
export function useScrub(count: number, mode: "band" | "point", initial?: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const sticky = useRef(false);

  const indexAt = useCallback(
    (clientX: number) => {
      const el = ref.current;
      if (!el || count === 0) return null;
      const rect = el.getBoundingClientRect();
      const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
      const i = mode === "band" ? Math.floor((x / rect.width) * count) : Math.round((x / rect.width) * (count - 1));
      return Math.min(Math.max(i, 0), count - 1);
    },
    [count, mode]
  );

  // A tap outside the chart dismisses a touch readout.
  useEffect(() => {
    if (active === null || !sticky.current) return;
    const onDown = (e: globalThis.PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        sticky.current = false;
        setActive(null);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [active]);

  // Data shrinking under an open readout (another month picked).
  const safeActive = active !== null && active < count ? active : null;

  const handlers = {
    onPointerDown: (e: PointerEvent) => {
      sticky.current = e.pointerType !== "mouse";
      setActive(indexAt(e.clientX));
    },
    onPointerMove: (e: PointerEvent) => {
      if (e.pointerType === "mouse" || e.pressure > 0) setActive(indexAt(e.clientX));
    },
    onPointerLeave: (e: PointerEvent) => {
      if (e.pointerType === "mouse") setActive(null);
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const from = safeActive ?? initial ?? count - 1;
      setActive(Math.min(Math.max(from + (e.key === "ArrowRight" ? 1 : -1), 0), count - 1));
    },
    onFocus: () => setActive((a) => a ?? initial ?? count - 1),
    onBlur: () => {
      sticky.current = false;
      setActive(null);
    },
  };

  return { ref, active: safeActive, setActive, handlers };
}
