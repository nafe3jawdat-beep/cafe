import type { ReactNode } from "react";
import { cn } from "../../lib/format";
import { useLocalization } from "../../lib/localization";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent",
        className
      )}
      aria-hidden="true"
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  const { translate: t } = useLocalization();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-espresso-900/15 bg-white/40 px-6 py-14 text-center",
        className
      )}
    >
      {icon ? (
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-cream-200 text-espresso-500">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-lg font-semibold text-espresso-900">
        {t(title)}
      </h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-espresso-500">
          {t(description)}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}
