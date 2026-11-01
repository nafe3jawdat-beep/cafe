import { Bell, Check, ChefHat, ReceiptText, Utensils } from "lucide-react";
import { cn } from "../lib/format";
import type { OrderStatus } from "../types";
import { useLocalization } from "../lib/localization";

const steps = [
  { status: "PENDING", label: "Received", icon: ReceiptText },
  { status: "PREPARING", label: "Preparing", icon: ChefHat },
  { status: "READY", label: "Ready", icon: Bell },
  { status: "DELIVERED", label: "Served", icon: Utensils },
] as const;

export function OrderStatusStepper({ status }: { status: OrderStatus }) {
  const { translate: t } = useLocalization();

  if (status === "CANCELLED") {
    return (
      <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
        {t("This order was cancelled. Please speak to a staff member if you need help.")}
      </div>
    );
  }

  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.status === status)
  );

  return (
    <div className="flex items-start">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const complete = index < currentIndex;
        const active = index === currentIndex;

        return (
          <div key={step.status} className="flex flex-1 items-start">
            <div className="flex flex-1 flex-col items-center">
              <div
                className={cn(
                  "relative grid h-8 w-8 place-items-center rounded-full border transition",
                  complete
                    ? "border-sage-500 bg-sage-500 text-white"
                    : active
                      ? "border-espresso-900 bg-espresso-900 text-cream-50"
                      : "border-espresso-900/10 bg-white text-espresso-300"
                )}
              >
                {active && status !== "DELIVERED" ? (
                  <span className="absolute inset-0 -z-10 animate-pulse-ring rounded-full bg-espresso-900/20" />
                ) : null}
                {complete ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>
              <span
                className={cn(
                  "mt-1.5 text-center text-[0.6rem] font-bold uppercase tracking-[0.1em]",
                  complete || active ? "text-espresso-700" : "text-espresso-300"
                )}
              >
                {t(step.label)}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={cn(
                  "mt-4 h-px flex-1",
                  index < currentIndex ? "bg-sage-400" : "bg-espresso-900/10"
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
