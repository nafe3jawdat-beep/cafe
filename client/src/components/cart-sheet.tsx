import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { api } from "../lib/api";
import { cn, formatMoney } from "../lib/format";
import type { Bill, Order, Pricing } from "../types";
import { useCart } from "../context/cart-context";
import { EmptyState, Spinner } from "./ui/feedback";
import { Modal } from "./ui/modal";
import { ImageWithFallback } from "./image-with-fallback";
import { useLocalization } from "../lib/localization";

export function CartSheet({
  open,
  onClose,
  tableNumber,
  tableKey,
  pricing,
  openBill,
  onOrderPlaced,
}: {
  open: boolean;
  onClose: () => void;
  tableNumber: number;
  tableKey?: string;
  pricing: Pricing;
  openBill: Bill | null | undefined;
  onOrderPlaced: (order: Order) => void;
}) {
  const cart = useCart();
  const { translate: t } = useLocalization();
  const [note, setNote] = useState("");
  const [customerName, setCustomerName] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const clientRequestId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      return api.createOrder({
        tableNumber,
        tableKey,
        clientRequestId,
        note,
        customerName,
        items: cart.lines.map((line) => ({
          menuItemId: line.menuItemId,
          quantity: line.quantity,
          notes: line.notes,
        })),
      });
    },
    onSuccess: ({ order }) => {
      cart.clear();
      setNote("");
      setCustomerName("");
      onClose();
      onOrderPlaced(order);
    },
    onError: (error: Error) => {
      toast.error(t(error.message));
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Your order")}
      description={t(`Table ${tableNumber} · pay at the table when you're ready.`)}
      size="md"
      footer={
        cart.lines.length > 0 ? (
          <div className="space-y-3 pb-5">
            {openBill ? (
              <p className="rounded-2xl bg-gold-100 px-4 py-3 text-xs font-medium leading-relaxed text-espresso-700">
                {t("A bill has already been requested for this table. Ask a staff member if you'd like to add more.")}
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-espresso-300">
                  {t("Total")}
                </p>
                <p className="font-display text-2xl font-semibold text-espresso-900">
                  {formatMoney(cart.totalCents, pricing.currency)}
                </p>
              </div>
              <button
                type="button"
                className="btn-accent min-w-40"
                disabled={
                  mutation.isPending || cart.lines.length === 0 || !!openBill
                }
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? <Spinner /> : <ShoppingBag className="h-4 w-4" />}
                {mutation.isPending ? t("Sending…") : t("Place order")}
              </button>
            </div>
          </div>
        ) : undefined
      }
    >
      {cart.lines.length === 0 ? (
        <div className="p-5 sm:p-6">
          <EmptyState
            icon={<ShoppingBag className="h-5 w-5" />}
            title={t("Your cart is empty")}
            description={t("Add something from the menu and it will appear here.")}
            action={
              <button type="button" className="btn-secondary" onClick={onClose}>
                {t("Browse the menu")}
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4 p-5 sm:p-6">
          <div className="space-y-3">
            {cart.lines.map((line) => (
              <div
                key={line.id}
                className="flex gap-3 rounded-2xl border border-espresso-900/[0.07] bg-white/70 p-3"
              >
                <ImageWithFallback
                  src={line.imageUrl}
                  alt={line.name}
                  className="h-16 w-16 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-espresso-900">
                        {line.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-espresso-500">
                        {formatMoney(line.priceCents, pricing.currency)} each
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cart.removeLine(line.id)}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-espresso-300 transition hover:bg-red-50 hover:text-red-500"
                      aria-label={t(`Remove ${line.name}`)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex items-center rounded-full border border-espresso-900/10 bg-cream-50 p-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          cart.updateQuantity(line.id, line.quantity - 1)
                        }
                        className="grid h-7 w-7 place-items-center rounded-full text-espresso-700 transition hover:bg-cream-200"
                        aria-label={t("Decrease quantity")}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold tabular-nums">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          cart.updateQuantity(line.id, line.quantity + 1)
                        }
                        disabled={line.quantity >= 20}
                        className="grid h-7 w-7 place-items-center rounded-full text-espresso-700 transition hover:bg-cream-200 disabled:opacity-40"
                        aria-label={t("Increase quantity")}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-espresso-900">
                      {formatMoney(
                        line.priceCents * line.quantity,
                        pricing.currency
                      )}
                    </span>
                  </div>

                  <input
                    className="mt-2 w-full rounded-xl border border-transparent bg-cream-100/70 px-3 py-1.5 text-xs text-espresso-700 placeholder:text-espresso-300 focus:border-terracotta-300 focus:bg-white focus:outline-none"
                    placeholder={t("Add a note for this item…")}
                    maxLength={160}
                    value={line.notes}
                    onChange={(event) =>
                      cart.updateNotes(line.id, event.target.value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-cream-100/80 p-4">
            <div className="flex items-center justify-between text-sm text-espresso-500">
              <span>{t("Subtotal")}</span>
              <span>{formatMoney(cart.subtotalCents, pricing.currency)}</span>
            </div>
            {pricing.taxRate > 0 ? (
              <div className="mt-1.5 flex items-center justify-between text-sm text-espresso-500">
                <span>{t("Tax")}</span>
                <span>{formatMoney(cart.taxCents, pricing.currency)}</span>
              </div>
            ) : null}
            {pricing.serviceChargeRate > 0 ? (
              <div className="mt-1.5 flex items-center justify-between text-sm text-espresso-500">
                <span>{t("Service charge")}</span>
                <span>
                  {formatMoney(cart.serviceChargeCents, pricing.currency)}
                </span>
              </div>
            ) : null}
            <div className="mt-2 flex items-center justify-between border-t border-espresso-900/10 pt-2 text-sm font-bold text-espresso-900">
              <span>{t("Total")}</span>
              <span>{formatMoney(cart.totalCents, pricing.currency)}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="customer-name">
                {t("Name (optional)")}
              </label>
              <input
                id="customer-name"
                className="input"
                placeholder={t("For the order")}
                maxLength={80}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="order-note">
                {t("Order note")}
              </label>
              <input
                id="order-note"
                className="input"
                placeholder={t("Allergies, timing…")}
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-espresso-300">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            <span>{t("Orders are sent straight to the kitchen and your waiter.")}</span>
          </div>

          <button
            type="button"
            onClick={() => cart.clear()}
            className={cn(
              "text-xs font-semibold text-espresso-300 underline-offset-2 hover:text-terracotta-600 hover:underline"
            )}
          >
            {t("Clear cart")}
          </button>
        </div>
      )}
    </Modal>
  );
}
