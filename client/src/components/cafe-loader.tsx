import { cn } from "../lib/format";
import { useLocalization } from "../lib/localization";
import { Brand } from "./brand";

/**
 * A branded waiting state for the guest menu. A QR scan should feel like
 * walking into the café, so we brew a cup while the menu is on its way.
 */
export function CafeLoader({
  tableNumber,
  className,
}: {
  tableNumber?: number;
  className?: string;
}) {
  const { translate: t } = useLocalization();
  const hasTable = Number.isInteger(tableNumber) && (tableNumber ?? 0) > 0;

  return (
    <main
      role="status"
      aria-live="polite"
      className={cn(
        "relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center",
        className
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[36%] h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-terracotta-400/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-sage-400/10 blur-3xl" />
        <div className="absolute -left-16 bottom-16 h-56 w-56 rounded-full bg-gold-400/10 blur-3xl" />
      </div>

      <div className="relative flex w-full max-w-sm flex-col items-center">
        <Brand className="justify-center" />

        <CoffeeCupArt className="mt-9 h-44 w-44 sm:h-52 sm:w-52" />

        <h1 className="mt-7 font-display text-2xl font-semibold tracking-tight text-espresso-900 sm:text-3xl">
          {t("Brewing your menu…")}
        </h1>
        <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-espresso-500">
          {t("A moment while we set the table.")}
        </p>

        {hasTable ? (
          <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-espresso-900/10 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-espresso-700 shadow-soft backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-terracotta-500" />
            {t(`Table ${tableNumber}`)}
          </span>
        ) : null}

        <div
          aria-hidden="true"
          className="mt-8 h-1.5 w-56 overflow-hidden rounded-full bg-espresso-900/10"
        >
          <div className="h-full w-1/3 animate-loader-slide rounded-full bg-gradient-to-r from-terracotta-400 via-terracotta-500 to-gold-400" />
        </div>
      </div>
    </main>
  );
}

function CoffeeCupArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 180"
      aria-hidden="true"
      focusable="false"
      className={cn("overflow-visible", className)}
    >
      <defs>
        <radialGradient id="cafe-loader-halo" cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#df7d58" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#df7d58" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cafe-loader-cup" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdfbf7" />
          <stop offset="100%" stopColor="#f3e9d8" />
        </linearGradient>
        <linearGradient id="cafe-loader-crema" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#76513b" />
          <stop offset="100%" stopColor="#3a2519" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="96" r="84" fill="url(#cafe-loader-halo)" />
      <circle
        cx="100"
        cy="96"
        r="70"
        fill="none"
        stroke="#c95d35"
        strokeOpacity="0.16"
        strokeWidth="2"
        strokeDasharray="3 10"
        strokeLinecap="round"
        className="svg-center animate-[spin_28s_linear_infinite]"
      />

      <g className="svg-center animate-cup-bob">
        <g fill="none" stroke="#b99b85" strokeLinecap="round" strokeWidth="4">
          <path
            d="M84 78c-7-9 7-15 0-27"
            className="steam-wisp animate-steam"
          />
          <path
            d="M100 74c-8-10 8-17 0-30"
            style={{ animationDelay: "0.65s" }}
            className="steam-wisp animate-steam"
          />
          <path
            d="M116 78c-7-9 7-15 0-27"
            style={{ animationDelay: "1.3s" }}
            className="steam-wisp animate-steam"
          />
        </g>

        <ellipse
          cx="100"
          cy="166"
          rx="54"
          ry="7"
          fill="#231710"
          opacity="0.08"
        />
        <ellipse cx="100" cy="158" rx="68" ry="14" fill="#ead8bd" />
        <ellipse cx="100" cy="155" rx="57" ry="9.5" fill="#f3e9d8" />

        <path
          d="M137 105h8a18 18 0 0 1 0 36h-11"
          fill="none"
          stroke="#e0cdb3"
          strokeLinecap="round"
          strokeWidth="9"
        />

        <path
          d="M62 93h76l-8 46c-2 8-10 14-18 14H88c-8 0-16-6-18-14z"
          fill="url(#cafe-loader-cup)"
          stroke="#e3d2bb"
          strokeLinejoin="round"
          strokeWidth="3"
        />

        <ellipse cx="100" cy="93" rx="38" ry="8.5" fill="url(#cafe-loader-crema)" />
        <ellipse
          cx="100"
          cy="93"
          rx="26"
          ry="4.6"
          fill="#8a6248"
          opacity="0.55"
        />
        <path
          d="M75 106c1 14 4 24 9 32"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.7"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <ellipse
          cx="100"
          cy="93"
          rx="38"
          ry="8.5"
          fill="none"
          stroke="#e3d2bb"
          strokeWidth="3"
        />
      </g>
    </svg>
  );
}
