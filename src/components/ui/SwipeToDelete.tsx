import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

interface Props {
  /** Runs once the row has been dragged past the threshold and released.
   * If it rejects, the row slides back into place. */
  onDelete: () => Promise<void> | void;
  children: ReactNode;
  /** Rendered to the left of the swipeable card and not part of the swipe
   * (the "mark as done" circle some rows have). */
  leading?: ReactNode;
  disabled?: boolean;
}

// Finger travel before a touch counts as a drag at all, and how decisively
// horizontal it must be — anything else is left to the page's own vertical
// scroll.
const SLOP = 8;
const DIRECTION_RATIO = 1.2;
// How far (as a fraction of the card's width) the card has to travel for a
// release to delete. Past this point the trash icon "arms".
const COMMIT_FRACTION = 0.5;
// Space between the red action and the card it trails.
const GAP = 6;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SNAP_MS = 320;
const EXIT_MS = 200;
const COLLAPSE_MS = 220;

/**
 * Drag a row to the right to delete it: a red pill with a trash icon grows
 * out of the left edge behind the card, the icon pops once the card is far
 * enough that letting go will delete, and releasing there sends the card
 * off to the right and closes the gap it leaves.
 *
 * Everything that moves is driven straight through refs rather than React
 * state — a state update per touchmove re-renders the row's whole subtree
 * on every frame, which is exactly what makes this kind of gesture feel
 * laggy on a phone.
 *
 * The red action is only ever as wide as the gap the card has opened up
 * (never a full-width layer underneath it): the cards are translucent, so
 * anything sitting behind them would show through.
 */
export function SwipeToDelete({ onDelete, children, leading, disabled }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const gesture = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    axis: null as null | "x" | "y",
    dx: 0,
    width: 0,
    armed: false,
    // Set once a drag has actually moved the card, so the click that the
    // browser fires on release doesn't also open the row.
    suppressClick: false,
    busy: false,
  });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  function later(fn: () => void, ms: number) {
    timers.current.push(setTimeout(fn, ms));
  }

  function paint(dx: number, animate: boolean) {
    const card = cardRef.current;
    const action = actionRef.current;
    if (!card || !action) return;
    const transition = animate ? `${SNAP_MS}ms ${EASE}` : "";
    card.style.transition = animate ? `transform ${transition}` : "none";
    card.style.transform = dx > 0 ? `translate3d(${dx}px, 0, 0)` : "";
    action.style.transition = animate ? `width ${transition}, opacity 160ms ease-out` : "none";
    action.style.width = `${Math.max(dx - GAP, 0)}px`;
    action.style.opacity = dx > GAP ? "1" : "0";
  }

  function setArmed(armed: boolean) {
    const g = gesture.current;
    if (g.armed === armed) return;
    g.armed = armed;
    actionRef.current?.setAttribute("data-armed", String(armed));
    if (iconRef.current) iconRef.current.style.transform = armed ? "scale(1.22)" : "scale(1)";
  }

  function reset(animate: boolean) {
    const g = gesture.current;
    g.pointerId = -1;
    g.axis = null;
    g.dx = 0;
    setArmed(false);
    paint(0, animate);
  }

  function restoreRow() {
    const root = rootRef.current;
    if (root) {
      root.style.transition = "";
      root.style.height = "";
      root.style.marginBottom = "";
      root.style.overflow = "";
    }
    gesture.current.busy = false;
    reset(true);
  }

  function commit() {
    const g = gesture.current;
    const root = rootRef.current;
    const card = cardRef.current;
    const action = actionRef.current;
    if (!root || !card || !action) return;
    g.busy = true;
    g.pointerId = -1;
    g.axis = null;

    // 1. Card leaves to the right; the red action fills the space behind it.
    card.style.transition = `transform ${EXIT_MS}ms ease-in`;
    card.style.transform = `translate3d(${g.width + 32}px, 0, 0)`;
    action.style.transition = `width ${EXIT_MS}ms ease-in`;
    action.style.width = "100%";

    later(() => {
      // 2. The row closes up, taking its share of the list's gap with it so
      //    nothing jumps when the item is finally removed from the list.
      const gap = root.parentElement ? parseFloat(getComputedStyle(root.parentElement).rowGap) || 0 : 0;
      root.style.height = `${root.offsetHeight}px`;
      root.style.overflow = "hidden";
      void root.offsetHeight; // commit the starting height before animating from it
      root.style.transition = `height ${COLLAPSE_MS}ms ${EASE}, margin-bottom ${COLLAPSE_MS}ms ${EASE}`;
      root.style.height = "0px";
      root.style.marginBottom = `${-gap}px`;
      action.style.transition = `opacity ${COLLAPSE_MS}ms ease-out`;
      action.style.opacity = "0";

      later(async () => {
        try {
          await onDelete();
          // Normally the list drops this row right here. If it's somehow
          // still mounted a moment later (the write was rejected without
          // throwing, the list didn't change...), bring it back rather than
          // leaving an invisible zero-height row behind.
          later(() => rootRef.current && restoreRow(), 1500);
        } catch {
          restoreRow();
        }
      }, COLLAPSE_MS);
    }, EXIT_MS);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (disabled || g.busy || g.pointerId !== -1) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    g.pointerId = e.pointerId;
    g.startX = e.clientX;
    g.startY = e.clientY;
    g.axis = null;
    g.dx = 0;
    g.suppressClick = false;
    g.width = cardRef.current?.offsetWidth ?? 0;
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (e.pointerId !== g.pointerId || g.axis === "y") return;
    const rawX = e.clientX - g.startX;
    const rawY = e.clientY - g.startY;

    if (g.axis === null) {
      if (Math.abs(rawX) < SLOP && Math.abs(rawY) < SLOP) return;
      // Only a rightward, clearly horizontal drag is ours. Leftward ones
      // stay available to the page-to-page swipe; vertical ones are scroll.
      if (rawX <= 0 || Math.abs(rawX) < Math.abs(rawY) * DIRECTION_RATIO) {
        g.axis = "y";
        return;
      }
      g.axis = "x";
      g.suppressClick = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    g.dx = Math.max(0, rawX - SLOP);
    setArmed(g.dx > g.width * COMMIT_FRACTION);
    paint(g.dx, false);
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (e.pointerId !== g.pointerId) return;
    if (g.axis === "x" && g.armed) commit();
    else reset(g.axis === "x");
  }

  // The browser took the touch over (a vertical scroll started, a system
  // gesture...) — never delete on that, just put the card back.
  function onPointerCancel(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerId !== gesture.current.pointerId) return;
    reset(true);
  }

  return (
    <div ref={rootRef} className={leading ? "flex items-center gap-2" : undefined}>
      {leading}
      <div
        data-swipe-row
        className="relative min-w-0 flex-1 select-none [-webkit-touch-callout:none]"
        // Vertical panning stays native (and instant); horizontal movement
        // is delivered to the handlers below instead of being claimed by
        // the browser.
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={(e) => {
          if (!gesture.current.suppressClick) return;
          gesture.current.suppressClick = false;
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        <div
          ref={actionRef}
          aria-hidden
          data-armed="false"
          className="absolute inset-y-0 left-0 flex items-center overflow-hidden rounded-[22px] bg-negative/80 text-white opacity-0 transition-colors duration-150 data-[armed=true]:bg-negative"
          style={{ width: 0 }}
        >
          <span ref={iconRef} className="ml-[18px] flex shrink-0 transition-transform duration-200 ease-out">
            <Trash2 size={20} strokeWidth={2.1} />
          </span>
        </div>
        <div ref={cardRef} className="relative">
          {children}
        </div>
      </div>
    </div>
  );
}
