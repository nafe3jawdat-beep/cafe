import {
  ArrowLeft,
  Clock,
  Compass,
  MapPin,
  RefreshCw,
  ShieldCheck,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { LocationErrorCode } from "../lib/geolocation";
import { useLocalization, LanguageSwitcher } from "../lib/localization";
import { Brand } from "./brand";
import { Spinner } from "./ui/feedback";

export type LocationBlockReason =
  | { kind: "permission"; issue?: LocationErrorCode }
  | {
      kind: "out-of-range";
      distanceMeters?: number;
      radiusMeters?: number;
    }
  | { kind: "closed"; openingTime?: string; closingTime?: string }
  | { kind: "unavailable" };

interface BlockContent {
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  hint?: string;
  badges?: Array<{ label: string; value: string }>;
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.max(1, Math.round(meters))} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function contentFor(
  reason: LocationBlockReason,
  t: (text: string) => string
): BlockContent {
  if (reason.kind === "out-of-range") {
    return {
      icon: MapPin,
      title: t("You're outside the café"),
      description: t(
        "Please move inside the café and try again. The menu unlocks once you're close enough."
      ),
      action: t("Check again"),
      hint: t(
        "Indoor location can be approximate. Stepping closer to the entrance usually helps."
      ),
      badges: [
        ...(reason.distanceMeters !== undefined
          ? [
              {
                label: t("Distance"),
                value: formatDistance(reason.distanceMeters),
              },
            ]
          : []),
        ...(reason.radiusMeters !== undefined
          ? [
              {
                label: t("Allowed radius"),
                value: formatDistance(reason.radiusMeters),
              },
            ]
          : []),
      ],
    };
  }

  if (reason.kind === "closed") {
    return {
      icon: Clock,
      title: t("We're closed right now"),
      description: t("Please come back during our opening hours."),
      action: t("Check again"),
      badges:
        reason.openingTime && reason.closingTime
          ? [
              {
                label: t("Opening hours"),
                value: `${reason.openingTime} – ${reason.closingTime}`,
              },
            ]
          : undefined,
    };
  }

  if (reason.kind === "unavailable") {
    return {
      icon: WifiOff,
      title: t("Location check unavailable"),
      description: t(
        "We couldn't confirm your location right now. Please ask a staff member for help."
      ),
      action: t("Try again"),
    };
  }

  if (reason.issue === "unsupported") {
    return {
      icon: WifiOff,
      title: t("Location isn't available"),
      description: t(
        "This browser can't share your location. Please ask a staff member for help."
      ),
      action: t("Try again"),
    };
  }

  if (reason.issue === "denied") {
    return {
      icon: ShieldCheck,
      title: t("Location permission is needed"),
      description: t(
        "Allow location access for this site in your browser, then try again. We only use it to confirm you're inside the café."
      ),
      action: t("Enable location"),
      hint: t(
        "Open the site settings from your browser's address bar to allow location."
      ),
    };
  }

  return {
    icon: Compass,
    title: t("We couldn't confirm your location"),
    description: t(
      "Make sure location services are on, then try again."
    ),
    action: t("Try again"),
    hint: t(
      "If you're inside the café and this keeps happening, ask a staff member for help."
    ),
  };
}

export function LocationBlocked({
  reason,
  onRetry,
  retrying = false,
}: {
  reason: LocationBlockReason;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const { translate: t } = useLocalization();
  const content = contentFor(reason, t);
  const Icon = content.icon;

  return (
    <main className="relative grid min-h-[100svh] place-items-center overflow-hidden px-5 py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-terracotta-400/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-sage-400/10 blur-3xl" />
      </div>

      <div className="absolute right-4 top-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="card relative w-full max-w-md p-7 text-center sm:p-9">
        <Brand className="justify-center" />

        <span className="mx-auto mt-7 grid h-16 w-16 place-items-center rounded-full bg-terracotta-50 text-terracotta-600">
          <Icon className="h-7 w-7" />
        </span>

        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-espresso-900">
          {content.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-espresso-500">
          {content.description}
        </p>

        {content.badges?.length ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {content.badges.map((badge) => (
              <div
                key={badge.label}
                className="rounded-2xl border border-espresso-900/[0.07] bg-cream-50 px-3 py-2"
              >
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-espresso-300">
                  {badge.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-espresso-900">
                  {badge.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {content.hint ? (
          <p className="mt-4 rounded-2xl bg-cream-100 px-4 py-3 text-xs leading-relaxed text-espresso-500">
            {content.hint}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={onRetry}
            disabled={retrying}
          >
            {retrying ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
            {content.action}
          </button>
          <Link to="/" className="btn-secondary flex-1">
            <ArrowLeft className="h-4 w-4" />
            {t("Back to start")}
          </Link>
        </div>
      </div>
    </main>
  );
}
