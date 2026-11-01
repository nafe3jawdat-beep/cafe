import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { formatMoney } from "../lib/format";
import type { MenuItem } from "../types";
import { ImageWithFallback } from "./image-with-fallback";
import { Modal } from "./ui/modal";
import { useLocalization } from "../lib/localization";

export function ItemSheet({
  item,
  open,
  currency,
  onClose,
  onAdd,
}: {
  item: MenuItem | null;
  open: boolean;
  currency: string;
  onClose: () => void;
  onAdd: (item: MenuItem, quantity: number, notes: string) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const { translate: t } = useLocalization();

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setNotes("");
    }
  }, [open, item?.id]);

  if (!item) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      footer={
        <div className="flex items-center gap-3 pb-5">
          <div className="flex items-center rounded-full border border-espresso-900/10 bg-white p-1">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="grid h-9 w-9 place-items-center rounded-full text-espresso-700 transition hover:bg-cream-200 disabled:opacity-40"
              disabled={quantity <= 1}
              aria-label={t("Decrease quantity")}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(20, value + 1))}
              className="grid h-9 w-9 place-items-center rounded-full text-espresso-700 transition hover:bg-cream-200 disabled:opacity-40"
              disabled={quantity >= 20}
              aria-label={t("Increase quantity")}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={!item.available}
            onClick={() => {
              onAdd(item, quantity, notes);
              onClose();
            }}
          >
            {item.available
              ? `${t("Add")} · ${formatMoney(item.priceCents * quantity, currency)}`
              : t("Currently unavailable")}
          </button>
        </div>
      }
    >
      <div>
        <ImageWithFallback
          src={item.imageUrl}
          alt={item.name}
          className="aspect-[16/10] w-full"
        />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-espresso-900">
                {item.name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-espresso-500">
                {item.description}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-cream-200 px-3 py-1.5 text-sm font-bold text-espresso-900">
              {formatMoney(item.priceCents, currency)}
            </span>
          </div>

          {!item.available ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {t("This item is sold out right now. Please choose something else.")}
            </p>
          ) : null}

          <label className="label mt-6" htmlFor="item-notes">
            {t("Special request")}
          </label>
          <textarea
            id="item-notes"
            className="input min-h-24 resize-none"
            placeholder={t("No sugar, oat milk, extra hot…")}
            maxLength={160}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <p className="mt-2 text-right text-xs text-espresso-300">
            {notes.length}/160
          </p>
        </div>
      </div>
    </Modal>
  );
}
