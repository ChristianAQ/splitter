import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { focusWithoutPanning, IS_IOS, lockPageScroll } from "../../lib/ios";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Pinned under the scrolling content — the sheet's primary action lives
   * here so it's always on screen, not at the far end of a long form. */
  footer?: ReactNode;
  /** Sits in the header next to the close button — e.g. "Editar" on a
   * read-only detail sheet. */
  headerAction?: ReactNode;
}

const EXIT_MS = 240;

// <input> types that don't bring up the on-screen keyboard.
const NON_TEXT_INPUT_TYPES = new Set(["checkbox", "radio", "range", "color", "file", "image", "button", "submit", "reset", "date", "time", "month", "week", "datetime-local"]);
// Springs back with a slight overshoot — the "it's elastic, it just has
// nowhere to go" feel, instead of sliding stiffly back into place.
const SPRING = "420ms cubic-bezier(0.34, 1.45, 0.64, 1)";
// How far the sheet will stretch when pulled past its limits.
const RUBBER_MAX_PX = 46;
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
export function BottomSheet({ open, onClose, title, children, footer, headerAction }: Props) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
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
  const shown = useRef({ title, children, footer, headerAction });
  if (open) shown.current = { title, children, footer, headerAction };

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
    return lockPageScroll();
  }, [mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Keyboard handling, which on iPhone (above all as an installed app) is
  // most of the work of a sheet with a form in it. The keyboard there
  // doesn't resize the page — it slides over it — and WebKit then:
  //   1. pans the whole page upward to reveal the focused field, dragging
  //      this bottom-anchored sheet up with it; and
  //   2. frequently *leaves* the page panned after the keyboard goes away
  //      (pressing Intro, tapping elsewhere), so everything fixed sits too
  //      high and a strip of the page shows underneath it;
  // and it doesn't reliably send the viewport events that would let a page
  // react to either.
  //
  // So, while a sheet is up:
  //   - its frame is pinned to the *visual* viewport (the part of the
  //     screen not under the keyboard), re-measured every frame rather
  //     than on events, so it always ends exactly at the keyboard's top
  //     edge — or at the screen's, the moment the keyboard is gone;
  //   - any pan WebKit applies to the page itself is undone on the spot;
  //   - fields are focused in a way that doesn't trigger the pan in the
  //     first place, and are scrolled into view inside the sheet instead.
  useEffect(() => {
    if (!mounted) return;
    const viewport = window.visualViewport;
    const frame = frameRef.current;
    const sheet = sheetRef.current;
    if (!frame || !sheet) return;

    // Where the page behind was scrolled to when the sheet opened — it
    // must still be there when the sheet closes.
    const pageY = window.scrollY;
    const applied = { height: -1, top: -1, keyboard: false };
    let raf = 0;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;

    function reveal(field: Element | null) {
      clearTimeout(revealTimer);
      revealTimer = setTimeout(() => {
        const scroller = scrollRef.current;
        if (!scroller || !(field instanceof HTMLElement) || !scroller.contains(field) || document.activeElement !== field) return;
        const f = field.getBoundingClientRect();
        const s = scroller.getBoundingClientRect();
        if (f.top < s.top + 12 || f.bottom > s.bottom - 12) {
          scroller.scrollBy({ top: f.top - s.top - (s.height - f.height) / 2, behavior: "smooth" });
        }
      }, 60);
    }

    function sync() {
      raf = requestAnimationFrame(sync);

      // The page behind must not move while the sheet is open. If WebKit
      // has scrolled the window anyway (to reveal a field, or left it
      // scrolled after the keyboard closed), put it back.
      if (IS_IOS && Math.abs(window.scrollY - pageY) > 0.5) window.scrollTo(0, pageY);

      const height = viewport ? viewport.height : window.innerHeight;
      const top = viewport ? viewport.offsetTop : 0;
      if (Math.abs(height - applied.height) < 0.5 && Math.abs(top - applied.top) < 0.5) return;

      const keyboard = window.innerHeight - height > 120;
      applied.height = height;
      applied.top = top;
      // Only while the keyboard is up. At rest the frame is simply the
      // full fixed layer (CSS): the visual viewport's reported height
      // isn't trustworthy enough to position by when nothing is covering
      // the screen — as an installed app it can come back a status bar
      // short, which would lift the whole sheet off the bottom edge.
      frame!.style.height = keyboard ? `${height}px` : "";
      frame!.style.transform = keyboard && top ? `translate3d(0, ${top}px, 0)` : "";
      frame!.dataset.keyboard = String(keyboard);
      // Keyboard just finished opening (or changed size): make sure the
      // field being typed in is inside what's left of the sheet.
      if (keyboard) reveal(document.activeElement);
      applied.keyboard = keyboard;
    }
    sync();

    // Focusing a text field without letting Safari pan the page to it: for
    // the instant of the focus call the field is moved far off-screen, so
    // there is nowhere sensible for Safari to pan to and it leaves the
    // page alone. (The technique React Aria uses for the same problem.)
    const opensKeyboard = (el: EventTarget | null): el is HTMLElement =>
      (el instanceof HTMLInputElement && !NON_TEXT_INPUT_TYPES.has(el.type)) || el instanceof HTMLTextAreaElement;

    function onTouchEnd(e: TouchEvent) {
      const target = e.target;
      // Only a plain tap on a field that isn't focused yet; a tap inside
      // the focused one is the user placing the caret.
      if (!IS_IOS || !opensKeyboard(target) || target === document.activeElement || !e.cancelable || tapMoved) return;
      e.preventDefault();
      focusWithoutPanning(target);
    }

    let tapMoved = false;
    const onTouchStart = () => {
      tapMoved = false;
    };
    const onTouchMove = () => {
      tapMoved = true;
    };

    // However the field got focus (a tap, autofocus, the keyboard's
    // next/previous arrows), make sure it ends up visible in the sheet.
    function onFocusIn(e: FocusEvent) {
      if (opensKeyboard(e.target)) reveal(e.target);
    }

    // Keyboard gone and no other field took over: WebKit sometimes keeps
    // rendering the page where the keyboard had pushed it while reporting
    // that nothing is scrolled. Forgetting what was last applied makes the
    // next frames re-apply the frame from scratch, and the 1px round trip
    // is the nudge that makes WebKit lay the page out again.
    function onFocusOut() {
      setTimeout(() => {
        if (opensKeyboard(document.activeElement)) return;
        applied.height = -1;
        if (IS_IOS) {
          window.scrollTo(0, pageY + 1);
          window.scrollTo(0, pageY);
        }
      }, 60);
    }

    sheet.addEventListener("touchstart", onTouchStart, { passive: true });
    sheet.addEventListener("touchmove", onTouchMove, { passive: true });
    sheet.addEventListener("touchend", onTouchEnd, { passive: false });
    sheet.addEventListener("focusin", onFocusIn);
    sheet.addEventListener("focusout", onFocusOut);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(revealTimer);
      sheet.removeEventListener("touchstart", onTouchStart);
      sheet.removeEventListener("touchmove", onTouchMove);
      sheet.removeEventListener("touchend", onTouchEnd);
      sheet.removeEventListener("focusin", onFocusIn);
      sheet.removeEventListener("focusout", onFocusOut);
    };
  }, [mounted]);

  // Drag down to dismiss. Plain DOM listeners (not React's) because
  // `touchmove` has to be registered as non-passive to be allowed to stop
  // the content's own scroll/rubber-band once the sheet takes the gesture.
  useEffect(() => {
    if (!mounted) return;
    const sheet = sheetRef.current;
    if (!sheet) return;

    const g = { active: false, dragging: false, ignored: false, startX: 0, startY: 0, offset: 0, lastY: 0, lastT: 0, velocity: 0 };

    // Resistance that grows with distance and levels off at RUBBER_MAX_PX:
    // the first few pixels follow the finger, then it gets harder.
    const rubber = (distance: number) => RUBBER_MAX_PX * (1 - 1 / (distance / (RUBBER_MAX_PX * 1.6) + 1));
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    function paint(offset: number, transition: string) {
      const backdrop = backdropRef.current;
      sheet!.style.transition = transition ? `transform ${transition}` : "none";
      sheet!.style.transform = offset !== 0 ? `translate3d(0, ${offset}px, 0)` : "";
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
        const inContent = scroller !== null && e.target instanceof Node && scroller.contains(e.target);
        const canScrollBack = inContent && scroller.scrollTop > 0;
        const canScrollOn = inContent && scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1;
        // Sideways (a row of chips), or in a direction the content itself
        // can still scroll: the content's business, not the sheet's.
        if (Math.abs(dx) > Math.abs(dy) || (dy > 0 && canScrollBack) || (dy < 0 && canScrollOn) || !e.cancelable) {
          g.ignored = true;
          return;
        }
        // Everything else moves the sheet: down to dismiss it, or — with
        // nothing (left) to scroll — up against a rubber band, so the
        // gesture gets an answer instead of the sheet sitting there inert.
        g.dragging = true;
        g.startY = t.clientY; // start from here so the sheet doesn't jump by the slop
        // Dragging the sheet away with the keyboard up: put the keyboard away too.
        if (dy > 0 && document.activeElement instanceof HTMLElement) document.activeElement.blur();
      }

      if (e.cancelable) e.preventDefault();
      const raw = t.clientY - g.startY;
      g.offset = raw >= 0 ? raw : -rubber(-raw);
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

      if (g.offset <= 0 || (!farEnough && !flicked)) {
        paint(0, SPRING);
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
            paint(0, SPRING);
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
    <div className={`fixed inset-0 z-50 ${closing ? "pointer-events-none" : ""}`}>
      <div
        ref={backdropRef}
        className={`absolute inset-0 bg-neutral-950/35 backdrop-blur-[3px] ${closing ? "animate-fade-out" : "animate-fade-in"}`}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={frameRef}
        className="group pointer-events-none absolute inset-x-0 top-0 flex h-full items-end justify-center sm:items-center"
      >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={content.title}
        className={`pointer-events-auto relative flex max-h-[92%] w-full flex-col sm:max-w-md ${
          closing ? "animate-sheet-out sm:animate-scale-out" : "animate-slide-up sm:animate-scale-in"
        }`}
      >
        {/* More sheet below the sheet. Whenever it sits higher than the
         * bottom edge — stretched upward against the rubber band, the
         * overshoot of a spring-back, or iOS having nudged things around
         * the keyboard — what shows underneath is this, not a strip of
         * the page behind. */}
        <div aria-hidden className="sheet-bleed absolute inset-x-0 top-[calc(100%-1px)] h-[70vh] sm:hidden" />
        <div className="glass-sheet relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[32px] border-b-0 shadow-sheet sm:rounded-[32px] sm:border-b">
        {/* Handle + header: a generous grab area for dragging the sheet. */}
        <div className="shrink-0 touch-none">
          <div className="flex items-center justify-center pb-1 pt-2.5 sm:hidden">
            <div className="h-1 w-9 rounded-full bg-neutral-900/15 dark:bg-white/20" />
          </div>
          {content.title && (
            <div className="flex items-center gap-1 px-5 pb-2 pt-2 sm:pt-4">
              <h2 className="min-w-0 flex-1 truncate text-[19px] font-semibold tracking-tight">{content.title}</h2>
              {content.headerAction}
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
            content.footer ? "pb-4" : "pb-[calc(env(safe-area-inset-bottom)+20px)] group-data-[keyboard=true]:pb-4"
          }`}
        >
          {content.children}
        </div>
        {content.footer && (
          // With the keyboard up the sheet sits on top of it, not on the
          // home-indicator strip, so that inset would just be dead space.
          <div className="shrink-0 border-t border-black/[0.06] px-5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 group-data-[keyboard=true]:pb-3 dark:border-white/[0.08]">
            {content.footer}
          </div>
        )}
        </div>
      </div>
      </div>
    </div>
  );
}
