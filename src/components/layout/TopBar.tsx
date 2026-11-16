import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { OfflineBanner } from "../ui/ErrorState";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

interface Props {
  title: ReactNode;
  subtitle?: string;
  onBack?: boolean;
  right?: ReactNode;
}

const ROW_CLASSNAME = "mx-auto flex max-w-lg items-center gap-3 px-4 pb-3";
const ROW_STYLE = { paddingTop: "calc(env(safe-area-inset-top) + 14px)" };

export function TopBar({ title, subtitle, onBack, right }: Props) {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [scrolled, setScrolled] = useState(() => window.scrollY > 4);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 4);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const stack = (
    <>
      {!online && <OfflineBanner />}
      <div className={ROW_CLASSNAME} style={ROW_STYLE}>
        {onBack && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="well well-press pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-700 dark:text-neutral-200"
          >
            <ArrowLeft size={19} strokeWidth={2.25} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className={`truncate font-semibold tracking-[-0.03em] ${onBack ? "text-[20px]" : "text-[24px]"}`}>{title}</h1>
          {subtitle && <p className="truncate text-[13px] text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
        </div>
        {right}
      </div>
    </>
  );

  return (
    <>
      {/* Invisible twin left in normal document flow: reserves exactly the
       * real stack height (title row + offline banner when present) so the
       * fixed header below never covers whatever renders after it. */}
      <header aria-hidden className="invisible">
        {stack}
      </header>
      {/* `fixed` rather than `sticky`: pins to the viewport unconditionally,
       * independent of any ancestor's scroll/overflow setup — this app
       * already had a sticky-header drift on iOS Safari once before (see
       * AppLayout/PullToRefresh history). The offline banner lives inside
       * this same fixed stack (rather than as a separate sticky sibling in
       * AppLayout, as it used to be) so the two can never overlap: both
       * stack tops are always in sync since they share one spacer. */}
      <header className="fixed inset-x-0 top-0 z-30">
        {/* Frosted backing, only once something has scrolled underneath:
         * at the top of the page the header is just part of the page (the
         * ambient backdrop runs through it uninterrupted); scrolled, it
         * turns nearly opaque so list text passing behind can't ghost
         * through the title. Kept on its own layers — no mask on a
         * backdrop-filter element, which browsers render inconsistently. */}
        <div
          aria-hidden
          className={`absolute inset-0 bg-surface-light-subtle/[0.93] backdrop-blur-xl backdrop-saturate-150 transition-opacity duration-200 dark:bg-surface-dark/[0.93] ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 top-full h-4 bg-gradient-to-b from-surface-light-subtle/[0.93] to-transparent transition-opacity duration-200 dark:from-surface-dark/[0.93] ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="relative">{stack}</div>
      </header>
    </>
  );
}
