import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A page's own navigation (its tabs, a filter) that stays pinned right
 * under the top bar once the page scrolls up to it — like the segmented
 * control under an iOS navigation bar. Frosted only while pinned; in place
 * it's just part of the page.
 *
 * `position: sticky` does the pinning, so it moves with the scroll itself
 * (no JS on the hot path); the frosting is the only thing toggled.
 */
export function StickySubnav({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 0;
      setStuck(window.scrollY > 0 && el.getBoundingClientRect().top <= navH + 0.5);
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

  return (
    <div ref={ref} className={`sticky z-20 -mx-4 px-4 py-2 ${className}`} style={{ top: "var(--nav-h, 0px)" }}>
      <div
        aria-hidden
        className={`absolute inset-0 bg-surface-light-subtle/[0.9] backdrop-blur-xl backdrop-saturate-150 transition-opacity duration-200 dark:bg-surface-dark/[0.9] ${
          stuck ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-full h-3 bg-gradient-to-b from-surface-light-subtle/[0.9] to-transparent transition-opacity duration-200 dark:from-surface-dark/[0.9] ${
          stuck ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
