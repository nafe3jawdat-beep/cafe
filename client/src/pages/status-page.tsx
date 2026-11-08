import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Link,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coffee,
  Droplets,
  ReceiptText,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { withLocationRetry } from "../lib/geolocation";
import { formatMoney, formatTime, orderStatusLabel } from "../lib/format";
import { tablePath } from "../lib/table-path";
import { useTableRealtime } from "../hooks/use-table-realtime";
import { Brand } from "../components/brand";
import { OrderStatusPill } from "../components/status-pill";
import { OrderStatusStepper } from "../components/order-status-stepper";
import { ServiceSheet } from "../components/service-sheet";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { EmptyState, Skeleton, Spinner } from "../components/ui/feedback";
import { useQueryClient } from "@tanstack/react-query";
import { LanguageSwitcher, useLocalization } from "../lib/localization";

export function StatusPage() {
  const { translate: t } = useLocalization();
  const { tableNumber: tableParam } = useParams();
  const [searchParams] = useSearchParams();
  const tableNumber = Number(tableParam);
  const tableKey = searchParams.get("key") ?? undefined;
  const validTable = Number.isInteger(tableNumber) && tableNumber > 0;
  const queryClient = useQueryClient();

  const [serviceOpen, setServiceOpen] = useState(false);
  const [confirmBillOpen, setConfirmBillOpen] = useState(false);

  const { connected } = useTableRealtime(tableNumber, tableKey);

  const sessionQuery = useQuery({
    queryKey: ["table-session", tableNumber, tableKey],
    queryFn: () => api.getTableSession(tableNumber, tableKey),
    enabled: validTable,
    retry: false,
    refetchInterval: 30_000,
  });

  const billMutation = useMutation({
    mutationFn: () =>
      withLocationRetry((coordinates) =>
        api.requestBill({
          tableNumber,
          tableKey,
          ...(coordinates ?? {}),
        })
      ),
    onSuccess: () => {
      setConfirmBillOpen(false);
      toast.success(t("Bill requested"), {
        description: t("A staff member will bring it to your table."),
      });
      void queryClient.invalidateQueries({
        queryKey: ["table-session", tableNumber, tableKey],
      });
    },
    onError: (error: Error) => {
      setConfirmBillOpen(false);
      toast.error(t(error.message));
    },
  });

  const session = sessionQuery.data;
  const orders = session?.orders ?? [];
  const openBill = session?.openBill ?? null;
  const activeCall = session?.calls?.[0] ?? null;

  const unbilledOrders = useMemo(
    () => orders.filter((order) => !order.billId && order.status !== "CANCELLED"),
    [orders]
  );
  const estimatedTotal = unbilledOrders.reduce(
    (sum, order) => sum + order.totalCents,
    0
  );

  if (!validTable) {
    return <StatusError message="That table number doesn't look right." />;
  }

  if (sessionQuery.isLoading) {
    return <StatusSkeleton />;
  }

  if (sessionQuery.isError || !session) {
    return (
      <StatusError
        message={
          sessionQuery.error instanceof Error
            ? sessionQuery.error.message
            : "We couldn't load your table."
        }
      />
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-30 border-b border-espresso-900/[0.06] bg-cream-100/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4 sm:h-[4.5rem] sm:px-6">
          <Link
            to={tablePath(tableNumber, tableKey)}
            className="flex items-center gap-2 text-sm font-semibold text-espresso-700 transition hover:text-espresso-900"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full border border-espresso-900/10 bg-white/70">
              <ArrowLeft className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">{t("Back to menu")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <span
              className={`hidden items-center gap-2 rounded-full border border-espresso-900/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-espresso-700 sm:inline-flex`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connected ? "bg-sage-500" : "bg-gold-400"
                }`}
              />
              {connected ? t("Live updates") : t("Reconnecting")}
            </span>
            <span className="rounded-full bg-espresso-900 px-3 py-1.5 text-xs font-bold text-cream-50">
              {t("Table")} {session.table.number}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6">
        <section className="pb-6 pt-8 sm:pt-12">
          <p className="eyebrow flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {t("Your table")}
          </p>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-espresso-900 sm:text-5xl">
                {t("Order status")}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-espresso-500">
                {t("Follow every plate from the kitchen to your table.")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setServiceOpen(true)}
                className="btn-secondary btn-sm"
              >
                <BellRing className="h-4 w-4" />
                {t("Call staff")}
              </button>
              <Link
                to={tablePath(tableNumber, tableKey)}
                className="btn-primary btn-sm"
              >
                <Coffee className="h-4 w-4" />
                {t("Add items")}
              </Link>
            </div>
          </div>

          {activeCall ? (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-sage-400/25 bg-sage-50 px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />
              <div className="text-sm">
                <p className="font-semibold text-sage-600">
                  {t("Your request is with the team")}
                </p>
                <p className="mt-0.5 text-xs text-sage-600/80">
                  {t("Requested at")} {formatTime(activeCall.createdAt)}. {t("They'll be with you shortly.")}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        {openBill ? (
          <section className="mb-6 overflow-hidden rounded-4xl bg-espresso-900 text-cream-50 shadow-lift">
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cream-50/10">
                  <ReceiptText className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-terracotta-400">
                    {t("Bill requested")}
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold">
                    {formatMoney(openBill.totalCents, session.pricing.currency)}
                  </p>
                  <p className="mt-1 text-xs text-cream-300">
                    {t("Requested at")} {formatTime(openBill.requestedAt)}. {t("A staff member will bring the card machine.")}
                  </p>
                </div>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-cream-50/10 px-4 py-2 text-xs font-semibold text-cream-200">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-400" />
                {t("Waiting for payment")}
              </span>
            </div>
          </section>
        ) : null}

        <div className="space-y-4">
          {orders.length === 0 ? (
            <EmptyState
              icon={<UtensilsCrossed className="h-5 w-5" />}
              title={t("No orders yet")}
              description={t("Your table is ready. Browse the menu and send your first order whenever you like.")}
              action={
                <Link
                  to={tablePath(tableNumber, tableKey)}
                  className="btn-primary"
                >
                  {t("Browse the menu")}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              }
            />
          ) : (
            orders.map((order) => (
              <article key={order.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-espresso-900/[0.06] px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-cream-200 text-espresso-700">
                      <ReceiptText className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-espresso-900">
                        {t("Order")} #{order.orderNumber}
                      </h2>
                      <p className="text-xs text-espresso-300">
                        {formatTime(order.createdAt)} ·{" "}
                        {t(orderStatusLabel(order.status))}
                      </p>
                    </div>
                  </div>
                  <OrderStatusPill status={order.status} />
                </div>

                <div className="px-5 py-5 sm:px-6">
                  <OrderStatusStepper status={order.status} />

                  <div className="mt-5 space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-4 text-sm"
                      >
                        <div>
                          <p className="font-medium text-espresso-900">
                            <span className="mr-1.5 text-espresso-300">
                              {item.quantity}×
                            </span>
                            {item.name}
                          </p>
                          {item.notes ? (
                            <p className="mt-0.5 pl-6 text-xs italic text-espresso-300">
                              “{item.notes}”
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 font-semibold text-espresso-700">
                          {formatMoney(
                            item.lineTotalCents,
                            session.pricing.currency
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.note ? (
                    <div className="mt-4 rounded-2xl bg-cream-100 px-4 py-3 text-xs leading-relaxed text-espresso-500">
                      <span className="font-bold text-espresso-700">{t("Note: ")}</span>
                      {order.note}
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between border-t border-espresso-900/[0.06] pt-3 text-sm">
                    <span className="font-semibold text-espresso-500">{t("Total")}</span>
                    <span className="font-bold text-espresso-900">
                      {formatMoney(
                        order.totalCents,
                        session.pricing.currency
                      )}
                    </span>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {orders.length > 0 ? (
          <section className="mt-6 rounded-4xl border border-espresso-900/[0.08] bg-white/70 p-5 shadow-soft sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-semibold text-espresso-900">
                  {t("Ready to wrap up?")}
                </h2>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-espresso-500">
                  {t("Request the bill and we'll bring it to your table. You can keep ordering until then.")}
                </p>
                {!openBill && unbilledOrders.length > 0 ? (
                  <p className="mt-3 text-xs font-semibold text-espresso-700">
                    {t("Current total ·")}{" "}
                    {formatMoney(estimatedTotal, session.pricing.currency)}
                  </p>
                ) : null}
                {!openBill && unbilledOrders.length === 0 ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sage-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("All orders on this table are settled.")}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setServiceOpen(true)}
                  className="btn-secondary btn-sm"
                >
                  <Droplets className="h-4 w-4" />
                  {t("Need water")}
                </button>
                <button
                  type="button"
                  onClick={() => setServiceOpen(true)}
                  className="btn-secondary btn-sm"
                >
                  <Sparkles className="h-4 w-4" />
                  {t("Clean table")}
                </button>
                {!openBill ? (
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={unbilledOrders.length === 0}
                    onClick={() => setConfirmBillOpen(true)}
                  >
                    <ReceiptText className="h-4 w-4" />
                    {t("Request bill")}
                  </button>
                ) : (
                  <span className="btn-secondary btn-sm pointer-events-none">
                    {t("Bill requested")}
                  </span>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-espresso-300">
          <BellRing className="h-3.5 w-3.5" />
          {t("Need help?")}{" "}
          <button
            type="button"
            className="font-semibold text-terracotta-600 hover:underline"
            onClick={() => setServiceOpen(true)}
          >
            {t("Call a staff member")}
          </button>
        </div>
      </main>

      <ServiceSheet
        open={serviceOpen}
        onClose={() => setServiceOpen(false)}
        tableNumber={tableNumber}
        tableKey={tableKey}
        onRequested={() => void sessionQuery.refetch()}
      />

      <ConfirmDialog
        open={confirmBillOpen}
        onClose={() => setConfirmBillOpen(false)}
        title={t("Request the bill?")}
        description={t(`We'll bring the bill for ${formatMoney(
          estimatedTotal,
          session.pricing.currency
        )} to table ${session.table.number}. You won't be able to add new items after this.`)}
        confirmLabel={t("Request bill")}
        loading={billMutation.isPending}
        onConfirm={() => billMutation.mutate()}
      />
    </div>
  );
}

function StatusSkeleton() {
  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6 sm:px-6">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="mt-12 h-4 w-24" />
      <Skeleton className="mt-4 h-12 w-64 max-w-full" />
      <Skeleton className="mt-8 h-48 w-full rounded-4xl" />
      <Skeleton className="mt-6 h-64 w-full rounded-4xl" />
      <div className="mt-8 flex justify-center">
        <Spinner className="h-5 w-5 text-espresso-300" />
      </div>
    </div>
  );
}

function StatusError({ message }: { message: string }) {
  const { translate: t } = useLocalization();

  return (
    <main className="relative grid min-h-screen place-items-center px-5 py-12">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="card w-full max-w-md p-8 text-center">
        <Brand className="justify-center" />
        <h1 className="mt-8 font-display text-2xl font-semibold text-espresso-900">
          {t("We couldn't find your table")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-espresso-500">
          {t(message)}
        </p>
        <Link to="/" className="btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" />
          {t("Back to start")}
        </Link>
      </div>
    </main>
  );
}
