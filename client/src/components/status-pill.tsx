import { cn } from "../lib/format";
import type { CallStatus, OrderStatus } from "../types";
import { useLocalization } from "../lib/localization";

const orderStyles: Record<OrderStatus, string> = {
  PENDING: "bg-gold-100 text-espresso-700 ring-gold-400/30",
  PREPARING: "bg-terracotta-50 text-terracotta-700 ring-terracotta-400/30",
  READY: "bg-sage-50 text-sage-600 ring-sage-400/30",
  DELIVERED: "bg-espresso-900/5 text-espresso-500 ring-espresso-900/10",
  CANCELLED: "bg-red-50 text-red-600 ring-red-200",
};

const orderLabels: Record<OrderStatus, string> = {
  PENDING: "New",
  PREPARING: "Preparing",
  READY: "Ready",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const callStyles: Record<CallStatus, string> = {
  OPEN: "bg-terracotta-50 text-terracotta-700 ring-terracotta-400/30",
  ACKNOWLEDGED: "bg-gold-100 text-espresso-700 ring-gold-400/30",
  RESOLVED: "bg-sage-50 text-sage-600 ring-sage-400/30",
};

export function OrderStatusPill({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const { translate: t } = useLocalization();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] ring-1 ring-inset",
        orderStyles[status],
        className
      )}
    >
      {status === "PENDING" ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-500" />
        </span>
      ) : null}
      {t(orderLabels[status])}
    </span>
  );
}

export function CallStatusPill({
  status,
  className,
}: {
  status: CallStatus;
  className?: string;
}) {
  const { translate: t } = useLocalization();

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] ring-1 ring-inset",
        callStyles[status],
        className
      )}
    >
      {status === "OPEN"
        ? t("Open")
        : status === "ACKNOWLEDGED"
          ? t("On it")
          : t("Resolved")}
    </span>
  );
}
