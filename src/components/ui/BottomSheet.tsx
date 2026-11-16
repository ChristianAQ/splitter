import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Pinned under the scrolling content — the sheet's primary action lives
   * here so it's always on screen, not at the far end of a long form. */
  footer?: ReactNode;
}

const EXIT_MS = 240;
const SNAP_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
// A downward drag is taken over once it has moved this far...
const DRAG_SLOP = 6;
// ...and on release dismisses the sheet if it travelled this fraction of
// the sheet's height (capped), or was flicked down faster than this.
const DISMISS_FRACTION = 0.28;
const DISMISS_MAX_PX = 170;
const DISMISS_VELOCITY = 0.55; // px per ms

/**
 * Modal sheet that rises from the bottom edge (a centered dialog from
 * tablet width up).
 *
 * Closing is animated in every case — the sheet stays mounted for the
 * length of the exit and keeps showing what it had (callers typically
 * clear the thing being edited the instant they close, which would
 * otherwise flash the form back to its empty "new" state on the way out).
 *
 * On touch screens it can also be dragged down to dismiss, from anywhere:
 * the handle, the header, or the content itself once that's scrolled to
 * the top. It follows the finger, then either leaves or springs back.
 */
export function BottomSheet({ open, onClose, title, children, footer }: Props) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const openRef = useRef(open);
  openRef.current = open;
  // Set when a drag has already carried the sheet off screen, so the
  // close that follows doesn't replay an exit animation from the top.
  const draggedAway = useRef(false);
  const shown = useRef({ title, children, footer });
  if (open) shown.current = { title, children, footer };

  useEffect(() => {
    if (open) {
      draggedAway.current = false;
      setMounted(true);
      setClosing(false);
      return;
    }
    if (draggedAway.current) {
      draggedAway.current = false;
      setMounted(false);
      setClosing(false);
      return;
    }
    setClosing(true);
    const timer = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Drag down to dismiss. Plain DOM listeners (not React's) because
  // `touchmove` has to be registered as non-passive to be allowed to stop
  // the content's own scroll/rubber-band once the sheet takes the gesture.
  useEffect(() => {
    if (!mounted) return;
    const sheet = sheetRef.current;
    if (!sheet) return;

    const g = { active: false, dragging: false, ignored: false, startX: 0, startY: 0, offset: 0, lastY: 0, lastT: 0, velocity: 0 };
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    function paint(offset: number, transition: string) {
      const backdrop = backdropRef.current;
      sheet!.style.transition = transition ? `transform ${transition}` : "none";
      sheet!.style.transform = offset > 0 ? `translate3d(0, ${offset}px, 0)` : "";
      if (backdrop) {
        backdrop.style.transition = transition ? `opacity ${transition}` : "none";
        backdrop.style.opacity = offset > 0 ? String(1 - Math.min(offset / sheet!.offsetHeight, 1) * 0.85) : "";
      }
    }

    function onStart(e: TouchEvent) {
      // The centered-dialog layout (tablet/desktop width) isn't a sheet.
      if (e.touches.length !== 1 || !openRef.current || window.matchMedia("(min-width: 640px)").matches) return;
      const t = e.touches[0];
      g.active = true;
      g.dragging = false;
      g.ignored = false;
      g.startX = t.clientX;
      g.startY = g.lastY = t.clientY;
      g.lastT = e.timeStamp;
      g.velocity = 0;
      g.offset = 0;
    }

    function onMove(e: TouchEvent) {
      if (!g.active || g.ignored) return;
      const t = e.touches[0];
      const dx = t.clientX - g.startX;
      const dy = t.clientY - g.startY;

      if (!g.dragging) {
        if (Math.abs(dx) < DRAG_SLOP && Math.abs(dy) < DRAG_SLOP) return;
        const scroller = scrollRef.current;
        const insideScrolledContent =
          scroller !== null && e.target instanceof Node && scroller.contains(e.target) && scroller.scrollTop > 0;
        // Sideways (a row of chips), upwards (scrolling the form), or
        // downwards while the content still has somewhere to scroll back
        // to: all the content's business, not the sheet's.
        if (Math.abs(dx) > Math.abs(dy) || dy < 0 || insideScrolledContent || !e.cancelable) {
          g.ignored = true;
          return;
        }
        g.dragging = true;
        g.startY = t.clientY; // start from here so the sheet doesn't jump by the slop
        // Dragging the sheet away with the keyboard up: put the keyboard away too.
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      }

      if (e.cancelable) e.preventDefault();
      g.offset = Math.max(0, t.clientY - g.startY);
      const dt = e.timeStamp - g.lastT;
      if (dt > 0) g.velocity = (t.clientY - g.lastY) / dt;
      g.lastY = t.clientY;
      g.lastT = e.timeStamp;
      paint(g.offset, "");
    }

    function onEnd() {
      if (!g.active) return;
      g.active = false;
      if (!g.dragging) return;
      g.dragging = false;
      const height = sheet!.offsetHeight;
      const farEnough = g.offset > Math.min(height * DISMISS_FRACTION, DISMISS_MAX_PX);
      const flicked = g.velocity > DISMISS_VELOCITY && g.offset > 24;

      if (!farEnough && !flicked) {
        paint(0, `320ms ${SNAP_EASE}`);
        return;
      }

      paint(height, "200ms ease-out");
      resetTimer = setTimeout(() => {
        draggedAway.current = true;
        onCloseRef.current();
        // A caller that declines to close (none do today) would otherwise
        // be left with an open sheet parked below the screen.
        resetTimer = setTimeout(() => {
          if (openRef.current) {
            draggedAway.current = false;
            paint(0, `320ms ${SNAP_EASE}`);
          }
        }, 300);
      }, 200);
    }

    sheet.addEventListener("touchstart", onStart, { passive: true });
    sheet.addEventListener("touchmove", onMove, { passive: false });
    sheet.addEventListener("touchend", onEnd, { passive: true });
    sheet.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      clearTimeout(resetTimer);
      sheet.removeEventListener("touchstart", onStart);
      sheet.removeEventListener("touchmove", onMove);
      sheet.removeEventListener("touchend", onEnd);
      sheet.removeEventListener("touchcancel", onEnd);
    };
  }, [mounted]);

  if (!mounted) return null;

  const content = shown.current;

  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center ${closing ? "pointer-events-none" : ""}`}>
      <div
        ref={backdropRef}
        className={`absolute inset-0 bg-neutral-950/35 backdrop-blur-[3px] ${closing ? "animate-fade-out" : "animate-fade-in"}`}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={content.title}
        className={`glass-sheet relative flex max-h-sheet w-full flex-col overflow-hidden rounded-t-[32px] border-b-0 shadow-sheet sm:max-w-md sm:rounded-[32px] sm:border-b ${
          closing ? "animate-sheet-out sm:animate-scale-out" : "animate-slide-up sm:animate-scale-in"
        }`}
      >
        {/* Handle + header: a generous grab area for dragging the sheet. */}
        <div className="shrink-0 touch-none">
          <div className="flex items-center justify-center pb-1 pt-2.5 sm:hidden">
            <div className="h-1 w-9 rounded-full bg-neutral-900/15 dark:bg-white/20" />
          </div>
          {content.title && (
            <div className="flex items-center justify-between px-5 pb-2 pt-2 sm:pt-4">
              <h2 className="text-[19px] font-semibold tracking-tight">{content.title}</h2>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                // 44pt target around a smaller visible button.
                className="pressable -mr-1.5 flex h-11 w-11 items-center justify-center rounded-full text-neutral-500 dark:text-neutral-400"
              >
                <span className="well flex h-8 w-8 items-center justify-center rounded-full">
                  <X size={16} strokeWidth={2.4} />
                </span>
              </button>
            </div>
          )}
        </div>
        <div
          ref={scrollRef}
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 ${
            content.footer ? "pb-4" : "pb-[calc(env(safe-area-inset-bottom)+20px)]"
          }`}
        >
          {content.children}
        </div>
        {content.footer && (
          <div className="shrink-0 border-t border-black/[0.06] px-5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 dark:border-white/[0.08]">
            {content.footer}
          </div>
        )}
      </div>
    </div>
  );
}
