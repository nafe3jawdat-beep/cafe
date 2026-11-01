import { Plus } from "lucide-react";
import { cn, formatMoney } from "../lib/format";
import type { MenuItem } from "../types";
import { ImageWithFallback } from "./image-with-fallback";
import { useLocalization } from "../lib/localization";

export function MenuItemCard({
  item,
  currency,
  onOpen,
  onQuickAdd,
}: {
  item: MenuItem;
  currency: string;
  onOpen: () => void;
  onQuickAdd: () => void;
}) {
  const { translate: t } = useLocalization();

  return (
    <article
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${item.name}, ${formatMoney(item.priceCents, currency)}`}
      className={cn(
        "group relative flex cursor-pointer gap-3.5 rounded-3xl border border-espresso-900/[0.07] bg-white/80 p-3 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-espresso-900/15 hover:bg-white sm:p-4",
        !item.available && "opacity-70"
      )}
    >
      <ImageWithFallback
        src={item.imageUrl}
        alt={item.name}
        className={cn(
          "h-24 w-24 shrink-0 rounded-2xl sm:h-28 sm:w-28",
          !item.available && "grayscale"
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[0.95rem] font-semibold text-espresso-900">
              {item.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-espresso-500">
              {item.description}
            </p>
          </div>
          {item.featured && item.available ? (
            <span className="shrink-0 rounded-full bg-gold-100 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-gold-500">
              {t("Popular")}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <span className="text-sm font-bold text-espresso-900">
              {formatMoney(item.priceCents, currency)}
            </span>
            {!item.available ? (
              <span className="ml-2 text-[0.65rem] font-bold uppercase tracking-wider text-red-500">
                {t("Sold out")}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onQuickAdd();
            }}
            disabled={!item.available}
            className="grid h-9 w-9 place-items-center rounded-full bg-espresso-900 text-cream-50 shadow-soft transition hover:scale-105 hover:bg-terracotta-500 active:scale-95 disabled:pointer-events-none disabled:bg-espresso-300"
            aria-label={`${t("Add to cart")}: ${item.name}`}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </article>
  );
}
