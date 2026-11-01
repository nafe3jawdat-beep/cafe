import { Coffee } from "lucide-react";
import { cn } from "../lib/format";
import { useLocalization } from "../lib/localization";

export function Brand({
  compact = false,
  inverted = false,
  className,
}: {
  compact?: boolean;
  inverted?: boolean;
  className?: string;
}) {
  const { translate: t } = useLocalization();

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "grid h-10 w-10 place-items-center rounded-2xl shadow-soft",
          inverted
            ? "bg-cream-50 text-espresso-900"
            : "bg-espresso-900 text-cream-50"
        )}
      >
        <Coffee className="h-5 w-5" strokeWidth={2.2} />
      </span>
      {!compact ? (
        <span className="leading-tight">
          <span
            className={cn(
              "block font-display text-lg font-semibold tracking-tight",
              inverted ? "text-cream-50" : "text-espresso-900"
            )}
          >
            Brillo Cafe
          </span>
          <span
            className={cn(
              "block text-[0.65rem] font-semibold uppercase tracking-[0.18em]",
              inverted ? "text-cream-300" : "text-espresso-500"
            )}
          >
            {t("Order from your table")}
          </span>
        </span>
      ) : null}
    </div>
  );
}
