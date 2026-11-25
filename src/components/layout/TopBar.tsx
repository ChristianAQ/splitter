import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { OfflineBanner } from "../ui/ErrorState";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

interface Props {
  title: ReactNode;
  subtitle?: string;
  onBack?: boolean;
  /** Where "back" goes when there's no earlier page in this visit (opened
   * from a link, or after a reload) — otherwise it would leave the app. */
  backTo?: string;
  right?: ReactNode;
}

/** Height of the bar itself, below the status bar. */
const BAR = 52;

/**
 * An iOS navigation bar with a large title.
 *
 * The large title is part of the page and scrolls away with it — no
 * animation can be smoother than that. Above it, a slim bar stays pinned
 * to the top with the back button and the page's actions; once the large
 * title has slid under it, the bar frosts over and shows the title small
 * and centred, as iOS does.
 *
 * The bar's height is published as `--nav-h`, which is where anything that
 * sticks under it (StickySubnav) stops.
 */
export function TopBar({ title, subtitle, onBack, backTo = "/", right }: Props) {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const barRef = useRef<HTMLElement>(null);
  const largeRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(() => window.scrollY > 2);
  const [collapsed, setCollapsed] = useState(false);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const publish = () => document.documentElement.style.setProperty("--nav-h", `${bar.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 2);
      const large = largeRef.current?.querySelector("h1");
      const bar = barRef.current;
      // The large title is gone once its baseline passes under the bar.
      if (large && bar) setCollapsed(large.getBoundingClientRect().bottom <= bar.offsetHeight + 2);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const goBack = () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(backTo, { replace: true }));

  const barContent = (
    <>
      <div className="relative mx-auto flex max-w-lg items-center gap-2 px-3" style={{ height: BAR }}>
        <div className="flex min-w-[44px] shrink-0 items-center">
          {onBack && (
            <button
              onClick={goBack}
              aria-label="Volver"
              className="pressable -ml-1 flex h-11 items-center gap-0.5 rounded-full pl-1 pr-2 text-[17px] text-accent dark:text-accent-300"
            >
              <ChevronLeft size={28} strokeWidth={2.4} className="-mr-0.5" />
            </button>
          )}
        </div>
        {/* The small title: in only once the large one has scrolled away. */}
        <p
          aria-hidden={!collapsed}
          className={`min-w-0 flex-1 truncate text-center text-[17px] font-semibold tracking-[-0.02em] transition-[opacity,transform] duration-200 ease-out ${
            collapsed ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
          }`}
        >
          {title}
        </p>
        <div className="flex min-w-[44px] shrink-0 items-center justify-end gap-2">{right}</div>
      </div>
      {!online && <OfflineBanner />}
    </>
  );

  return (
    <>
      <header
        ref={barRef}
        className="fixed inset-x-0 top-0 z-30"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          // Fades while the page is swiped back from the edge (useEdgeSwipeBack).
          opacity: "calc(1 - var(--edge-swipe-progress, 0) * 1.4)",
          transition: "var(--edge-swipe-transition, none)",
        }}
      >
        {/* Frosted backing, only once something has scrolled underneath:
         * at the top of the page the bar is just part of the page (the
         * ambient backdrop runs through it uninterrupted). Kept on its own
         * layers — no mask on a backdrop-filter element, which browsers
         * render inconsistently. */}
        <div
          aria-hidden
          className={`absolute inset-0 bg-surface-light-subtle/[0.9] backdrop-blur-xl backdrop-saturate-150 transition-opacity duration-200 dark:bg-surface-dark/[0.9] ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 top-full h-3 bg-gradient-to-b from-surface-light-subtle/[0.9] to-transparent transition-opacity duration-200 dark:from-surface-dark/[0.9] ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="relative">{barContent}</div>
      </header>

      {/* Holds the pinned bar's place in the flow. */}
      <div aria-hidden style={{ height: `calc(env(safe-area-inset-top) + ${BAR}px${online ? "" : " + 32px"})` }} />

      {/* The large title, scrolling with the page. */}
      <div ref={largeRef} className="mx-auto max-w-lg px-4 pb-4">
        <h1 className="line-clamp-2 text-[32px] font-bold leading-[1.1] tracking-[-0.035em]">{title}</h1>
        {subtitle && <p className="mt-1 truncate text-[14px] text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
      </div>
    </>
  );
}
