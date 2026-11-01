import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Printer,
  ReceiptText,
  RefreshCw,
  Table2,
} from "lucide-react";
import { api } from "../../lib/api";
import { cn, formatDate, formatMoney, timeAgo } from "../../lib/format";
import type { Bill } from "../../types";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { EmptyState, Skeleton } from "../../components/ui/feedback";
import { useLocalization } from "../../lib/localization";

export function StaffBillsPage() {
  const { translate: t } = useLocalization();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<"open" | "all">("open");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [printBill, setPrintBill] = useState<Bill | null>(null);

  useEffect(() => {
    if (!printBill) return;

    const handleAfterPrint = () => setPrintBill(null);
    window.addEventListener("afterprint", handleAfterPrint);
    window.print();

    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [printBill]);

  const statsQuery = useQuery({
    queryKey: ["staff", "stats"],
    queryFn: () => api.staffStats(),
  });

  const billsQuery = useQuery({
    queryKey: ["staff", "bills", scope],
    queryFn: () => api.staffBills(scope),
    refetchInterval: scope === "open" ? 20_000 : false,
  });

  const settleMutation = useMutation({
    mutationFn: (id: string) => api.settleBill(id),
    onSuccess: ({ bill }) => {
      setSelectedBill(null);
      toast.success(`${t("Table")} ${bill.table.number} ${t("bill settled.")}`, {
        description: `${formatMoney(
          bill.totalCents,
          statsQuery.data?.currency ?? "SYP"
        )} ${t("marked as paid.")}`,
      });
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error: Error) => {
      setSelectedBill(null);
      toast.error(t(error.message));
    },
  });

  const bills = billsQuery.data?.bills ?? [];
  const currency = statsQuery.data?.currency ?? "SYP";

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">{t("Front of house")}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-espresso-900 sm:text-4xl">
            Bills
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-espresso-500">
            Settle a table once payment is received.             {t("Bills are calculated from every unbilled order on the table.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-espresso-900/10 bg-white/70 p-1">
            {(["open", "all"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition",
                  scope === value
                    ? "bg-espresso-900 text-cream-50"
                    : "text-espresso-500 hover:text-espresso-900"
                )}
              >
                {t(value)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void billsQuery.refetch()}
            className="btn-secondary btn-sm"
            disabled={billsQuery.isFetching}
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                billsQuery.isFetching && "animate-spin"
              )}
            />
          </button>
        </div>
      </div>

      <div className="mt-6">
        {billsQuery.isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-56 w-full rounded-3xl" />
            ))}
          </div>
        ) : billsQuery.isError ? (
          <EmptyState
            icon={<RefreshCw className="h-5 w-5" />}
            title="Couldn't load bills"
            description={
              billsQuery.error instanceof Error
                ? billsQuery.error.message
                : "Check your connection and try again."
            }
            action={
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void billsQuery.refetch()}
              >
                Try again
              </button>
            }
          />
        ) : bills.length === 0 ? (
          <EmptyState
            icon={<ReceiptText className="h-5 w-5" />}
            title={scope === "open" ? "No open bills" : "No bills yet"}
            description={
              scope === "open"
                ? "When a guest requests the bill from their table, it will appear here."
                : "Settled and open bills will be listed here."
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {bills.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                currency={currency}
                onSettle={() => setSelectedBill(bill)}
                onPrint={() => setPrintBill(bill)}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        title={t("Mark this bill as settled?")}
        description={
          selectedBill
            ? t(`Confirm that ${formatMoney(
                selectedBill.totalCents,
                currency
          )} has been paid for table ${selectedBill.table.number}. This cannot be undone.`)
            : undefined
        }
        confirmLabel={t("Mark as paid")}
        loading={settleMutation.isPending}
        onConfirm={() => {
          if (selectedBill) settleMutation.mutate(selectedBill.id);
        }}
      />

      {printBill ? (
        <section className="invoice-print hidden" aria-label={t("Printable invoice")}>
          <header className="invoice-print-header">
            <div>
              <p className="invoice-print-brand">Brillo Cafe</p>
              <h1>{t("Invoice")}</h1>
            </div>
            <p className="invoice-print-status">
              {printBill.status === "SETTLED" ? t("PAID") : t("UNPAID")}
            </p>
          </header>

          <div className="invoice-print-details">
            <p>
              <strong>{t("Table:")}</strong> {printBill.table.number}
              {printBill.table.name ? ` · ${printBill.table.name}` : ""}
            </p>
            <p>
              <strong>{t("Requested:")}</strong> {formatDate(printBill.requestedAt)}
            </p>
            {printBill.settledAt ? (
              <p>
                <strong>{t("Paid:")}</strong> {formatDate(printBill.settledAt)}
                {printBill.settledBy ? ` by ${printBill.settledBy.name}` : ""}
              </p>
            ) : null}
          </div>

          <table className="invoice-print-orders">
            <thead>
              <tr>
                <th>{t("Item")}</th>
                <th>{t("Order")}</th>
                <th className="invoice-print-amount">{t("Qty")}</th>
                <th className="invoice-print-amount">{t("Unit price")}</th>
                <th className="invoice-print-amount">{t("Amount")}</th>
              </tr>
            </thead>
            <tbody>
              {printBill.orders.flatMap((order) =>
                order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.name}
                      {item.notes ? (
                        <small className="invoice-print-item-note">
                          {item.notes}
                        </small>
                      ) : null}
                    </td>
                    <td>#{order.orderNumber}</td>
                    <td className="invoice-print-amount">{item.quantity}</td>
                    <td className="invoice-print-amount">
                      {formatMoney(item.unitPriceCents, currency)}
                    </td>
                    <td className="invoice-print-amount">
                      {formatMoney(item.lineTotalCents, currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <dl className="invoice-print-totals">
            <div>
              <dt>{t("Subtotal")}</dt>
              <dd>{formatMoney(printBill.subtotalCents, currency)}</dd>
            </div>
            {printBill.taxCents > 0 ? (
              <div>
                <dt>{t("Tax")}</dt>
                <dd>{formatMoney(printBill.taxCents, currency)}</dd>
              </div>
            ) : null}
            {printBill.serviceChargeCents > 0 ? (
              <div>
                <dt>{t("Service")}</dt>
                <dd>{formatMoney(printBill.serviceChargeCents, currency)}</dd>
              </div>
            ) : null}
            <div className="invoice-print-grand-total">
              <dt>{t("Total")}</dt>
              <dd>{formatMoney(printBill.totalCents, currency)}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}

function BillCard({
  bill,
  currency,
  onSettle,
  onPrint,
}: {
  bill: Bill;
  currency: string;
  onSettle: () => void;
  onPrint: () => void;
}) {
  const { translate: t } = useLocalization();
  const itemCount = bill.orders.reduce(
    (sum, order) =>
      sum + order.items.reduce((orderSum, item) => orderSum + item.quantity, 0),
    0
  );
  const isOpen = bill.status === "OPEN";

  return (
    <article
      className={cn(
        "animate-fade-up rounded-3xl border bg-white/80 p-4 shadow-soft sm:p-5",
        isOpen
          ? "border-gold-400/40"
          : "border-espresso-900/[0.07] opacity-90"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-espresso-900 text-sm font-bold text-cream-50">
            {bill.table.number}
          </span>
          <div>
            <h2 className="text-sm font-bold text-espresso-900">
              {t("Table")} {bill.table.number}
              {bill.table.name ? (
                <span className="font-normal text-espresso-300">
                  {" "}
                  · {bill.table.name}
                </span>
              ) : null}
            </h2>
            <p className="mt-0.5 text-xs text-espresso-300">
              {isOpen
                ? `${t("Requested")} ${timeAgo(bill.requestedAt)}`
                : `${t("Settled")} ${bill.settledAt ? formatDate(bill.settledAt) : ""}`}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em]",
            isOpen
              ? "bg-gold-100 text-gold-500"
              : "bg-sage-50 text-sage-600"
          )}
        >
          {isOpen ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
          {isOpen ? "Open" : "Paid"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-cream-100 px-3.5 py-2.5">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-espresso-300">
          {t("Orders")}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-espresso-900">
            <Table2 className="h-3.5 w-3.5 text-espresso-300" />
            {bill.orders.length}
          </p>
        </div>
        <div className="rounded-2xl bg-cream-100 px-3.5 py-2.5">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-espresso-300">
            {t("Items")}
          </p>
          <p className="mt-0.5 text-sm font-bold text-espresso-900">{itemCount}</p>
        </div>
      </div>

      <div className="mt-3 space-y-1 text-xs text-espresso-500">
        <div className="flex justify-between">
          <span>{t("Subtotal")}</span>
          <span>{formatMoney(bill.subtotalCents, currency)}</span>
        </div>
        {bill.taxCents > 0 ? (
          <div className="flex justify-between">
            <span>{t("Tax")}</span>
            <span>{formatMoney(bill.taxCents, currency)}</span>
          </div>
        ) : null}
        {bill.serviceChargeCents > 0 ? (
          <div className="flex justify-between">
            <span>{t("Service")}</span>
            <span>{formatMoney(bill.serviceChargeCents, currency)}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-end justify-between border-t border-espresso-900/[0.07] pt-3">
        <div>
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-espresso-300">
            {t("Total")}
          </p>
          <p className="font-display text-2xl font-semibold text-espresso-900">
            {formatMoney(bill.totalCents, currency)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPrint} className="btn-secondary btn-sm">
            <Printer className="h-3.5 w-3.5" />
            {t("Print")}
          </button>
          {isOpen ? (
            <button
              type="button"
              onClick={onSettle}
              className="btn-primary btn-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("Settle bill")}
            </button>
          ) : (
            <p className="text-right text-[0.65rem] text-espresso-300">
              {t("Paid")}
              {bill.settledBy ? (
                <>
                  <br />
                  by {bill.settledBy.name}
                </>
              ) : null}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
