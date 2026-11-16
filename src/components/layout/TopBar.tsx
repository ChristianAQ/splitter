import type { ReactNode } from "react";
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

const ROW_CLASSNAME = "mx-auto flex max-w-lg items-center gap-3 px-4 pb-5";
const ROW_STYLE = { paddingTop: "calc(env(safe-area-inset-top) + 14px)" };

export function TopBar({ title, subtitle, onBack, right }: Props) {
  const navigate = useNavigate();
  const online = useOnlineStatus();

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
      <header
        className="fixed inset-x-0 top-0 z-30 bg-surface-light-subtle/55 backdrop-blur-2xl backdrop-saturate-150 dark:bg-surface-dark/55"
        // Fades the frosted strip out at its lower edge instead of ending
        // on a hard line — content scrolls up *into* the blur.
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 14px), transparent)",
          maskImage: "linear-gradient(to bottom, black calc(100% - 14px), transparent)",
        }}
      >
        {stack}
      </header>
    </>
  );
}
