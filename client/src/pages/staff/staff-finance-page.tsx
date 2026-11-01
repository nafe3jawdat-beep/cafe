import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  ChartNoAxesCombined,
  Plus,
  ReceiptText,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { api } from "../../lib/api";
import { cn, formatMoney } from "../../lib/format";
import type { FinancialExpense, FinancialItemRanking } from "../../types";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { EmptyState, Skeleton, Spinner } from "../../components/ui/feedback";
import { Modal } from "../../components/ui/modal";
import { useLocalization } from "../../lib/localization";

function localDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatExpenseDate(value: string) {
  const locale =
    window.localStorage.getItem("cafe-language") === "ar" ? "ar" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function StaffFinancePage() {
  const { translate: t } = useLocalization();
  const queryClient = useQueryClient();
  const today = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState(
    localDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1))
  );
  const [endDate, setEndDate] = useState(localDateInputValue(today));
  const [startDateDraft, setStartDateDraft] = useState(startDate);
  const [endDateDraft, setEndDateDraft] = useState(endDate);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FinancialExpense | null>(
    null
  );

  const reportQuery = useQuery({
    queryKey: ["staff", "finance", startDate, endDate],
    queryFn: () => api.staffFinancialReport(startDate, endDate),
    enabled: Boolean(startDate && endDate && startDate <= endDate),
  });

  const createExpenseMutation = useMutation({
    mutationFn: api.createExpense,
    onSuccess: () => {
      toast.success(t("Expense added."));
      setAddExpenseOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["staff", "finance"] });
    },
    onError: (error: Error) => toast.error(t(error.message)),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: api.deleteExpense,
    onSuccess: () => {
      toast.success(t("Expense deleted."));
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["staff", "finance"] });
    },
    onError: (error: Error) => {
      setDeleteTarget(null);
      toast.error(t(error.message));
    },
  });

  const report = reportQuery.data;
  const currency = report?.currency ?? "SYP";

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">{t("Admin")}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-espresso-900 sm:text-4xl">
            {t("Financial overview")}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-espresso-500">
            {t(
              "Review delivered orders placed, recorded expenses, and menu item sales for a date range."
            )}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => {
            createExpenseMutation.reset();
            setAddExpenseOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          {t("Add expense")}
        </button>
      </div>

      <form
        className="mt-6 flex flex-col gap-3 rounded-3xl border border-espresso-900/[0.07] bg-white/70 p-4 shadow-soft sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          if (startDateDraft > endDateDraft) {
            toast.error(t("Start date must be on or before end date."));
            return;
          }
          setStartDate(startDateDraft);
          setEndDate(endDateDraft);
        }}
      >
        <div className="flex-1">
          <label className="label" htmlFor="finance-start-date">
            {t("From")}
          </label>
          <input
            id="finance-start-date"
            className="input"
            type="date"
            required
            value={startDateDraft}
            max={endDateDraft || undefined}
            onChange={(event) => setStartDateDraft(event.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="label" htmlFor="finance-end-date">
            {t("To")}
          </label>
          <input
            id="finance-end-date"
            className="input"
            type="date"
            required
            value={endDateDraft}
            min={startDateDraft || undefined}
            onChange={(event) => setEndDateDraft(event.target.value)}
          />
        </div>
        <button
          type="submit"
          className="btn-secondary btn-sm"
          disabled={reportQuery.isFetching}
        >
          {reportQuery.isFetching ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <CalendarDays className="h-4 w-4" />
          )}
          {t("Update report")}
        </button>
      </form>

      {startDateDraft > endDateDraft ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
        >
          {t("Start date must be on or before end date.")}
        </p>
      ) : null}

      {reportQuery.isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-32 rounded-3xl" />
          ))}
        </div>
      ) : reportQuery.isError ? (
        <div className="mt-6">
          <EmptyState
            icon={<RefreshCw className="h-5 w-5" />}
            title={t("Couldn't load financial report")}
            description={
              reportQuery.error instanceof Error
                ? reportQuery.error.message
                : t("Check your connection and try again.")
            }
            action={
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void reportQuery.refetch()}
              >
                {t("Try again")}
              </button>
            }
          />
        </div>
      ) : report ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceStat
              label="Delivered sales"
              value={formatMoney(report.revenueCents, currency)}
              detail={t("Before tax and service charges")}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="sage"
            />
            <FinanceStat
              label="Expenses"
              value={formatMoney(report.expenseCents, currency)}
              detail={`${report.expenses.length} ${t("recorded expenses")}`}
              icon={<ReceiptText className="h-5 w-5" />}
              tone="terracotta"
            />
            <FinanceStat
              label="Net profit / loss"
              value={formatMoney(report.profitCents, currency)}
              detail={t("Delivered sales minus recorded expenses")}
              icon={
                report.profitCents >= 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )
              }
              tone={report.profitCents >= 0 ? "espresso" : "red"}
            />
            <FinanceStat
              label="Delivered orders"
              value={String(report.deliveredOrders)}
              detail={`${formatExpenseDate(report.startDate)} – ${formatExpenseDate(report.endDate)}`}
              icon={<ChartNoAxesCombined className="h-5 w-5" />}
              tone="gold"
            />
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <RankingCard
              title="Best-selling items"
              description="Ranked by quantity sold in the selected period."
              items={report.bestSellingItems}
              currency={currency}
              emptyText="No delivered item sales in this date range."
              t={t}
            />
            <RankingCard
              title="Least-selling items"
              description="Includes current menu items with no sales."
              items={report.leastSellingItems}
              currency={currency}
              emptyText="No menu items to rank."
              t={t}
            />
          </div>

          <section className="mt-6 overflow-hidden rounded-3xl border border-espresso-900/[0.07] bg-white/75 shadow-soft">
            <div className="flex flex-col justify-between gap-3 border-b border-espresso-900/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:px-5">
              <div>
                <h2 className="font-display text-xl font-semibold text-espresso-900">
                  {t("Expenses")}
                </h2>
                <p className="mt-1 text-xs text-espresso-400">
                  {t("Expenses recorded within the selected date range.")}
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => {
                  createExpenseMutation.reset();
                  setAddExpenseOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("Add expense")}
              </button>
            </div>
            {report.expenses.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-medium text-espresso-700">
                  {t("No expenses in this date range.")}
                </p>
                <p className="mt-1 text-xs text-espresso-400">
                  {t("Add an expense to include it in profit and loss.")}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-espresso-900/[0.06]">
                {report.expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-espresso-800">
                        {expense.description}
                      </p>
                      <p className="mt-0.5 text-xs text-espresso-400">
                        {formatExpenseDate(expense.date)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-espresso-800">
                      {formatMoney(expense.amountCents, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(expense)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:border-red-300 hover:bg-red-100"
                      aria-label={`${t("Delete expense")}: ${expense.description}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      <ExpenseFormModal
        open={addExpenseOpen}
        loading={createExpenseMutation.isPending}
        error={
          createExpenseMutation.error instanceof Error
            ? createExpenseMutation.error.message
            : undefined
        }
        defaultDate={endDate}
        onClose={() => {
          if (!createExpenseMutation.isPending) setAddExpenseOpen(false);
        }}
        onSubmit={(expense) => createExpenseMutation.mutate(expense)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteExpenseMutation.isPending) setDeleteTarget(null);
        }}
        title="Delete expense?"
        description={deleteTarget?.description}
        confirmLabel="Delete expense"
        destructive
        loading={deleteExpenseMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteExpenseMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}

function FinanceStat({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone: "sage" | "terracotta" | "espresso" | "gold" | "red";
}) {
  const { translate: t } = useLocalization();
  const iconTones = {
    sage: "bg-sage-50 text-sage-600",
    terracotta: "bg-terracotta-50 text-terracotta-600",
    espresso: "bg-cream-200 text-espresso-700",
    gold: "bg-gold-50 text-gold-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <article className="rounded-3xl border border-espresso-900/[0.07] bg-white/75 p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-espresso-500">{t(label)}</p>
        <span
          className={cn(
            "grid h-10 w-10 place-items-center rounded-2xl",
            iconTones[tone]
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-4 truncate text-2xl font-bold tabular-nums text-espresso-900">
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-espresso-400">{t(detail)}</p>
    </article>
  );
}

function RankingCard({
  title,
  description,
  items,
  currency,
  emptyText,
  t,
}: {
  title: string;
  description: string;
  items: FinancialItemRanking[];
  currency: string;
  emptyText: string;
  t: (text: string) => string;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-espresso-900/[0.07] bg-white/75 shadow-soft">
      <div className="border-b border-espresso-900/[0.06] px-5 py-4">
        <h2 className="font-display text-xl font-semibold text-espresso-900">
          {t(title)}
        </h2>
        <p className="mt-1 text-xs text-espresso-400">{t(description)}</p>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-espresso-400">
          {t(emptyText)}
        </p>
      ) : (
        <div className="divide-y divide-espresso-900/[0.06]">
          {items.map((item, index) => (
            <div
              key={item.menuItemId ?? `${item.name}-${index}`}
              className="flex items-center gap-3 px-5 py-3.5"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-cream-100 text-xs font-bold text-espresso-500">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-espresso-800">
                  {item.name}
                </p>
                <p className="mt-0.5 text-xs text-espresso-400">
                  {item.quantity} {t(item.quantity === 1 ? "item sold" : "items sold")}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-espresso-700">
                {formatMoney(item.revenueCents, currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ExpenseFormModal({
  open,
  loading,
  error,
  defaultDate,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  error?: string;
  defaultDate: string;
  onClose: () => void;
  onSubmit: (expense: {
    date: string;
    description: string;
    amountCents: number;
  }) => void;
}) {
  const { translate: t } = useLocalization();
  const [date, setDate] = useState(defaultDate);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDate(defaultDate);
    setDescription("");
    setAmount("");
    setLocalError("");
  }, [defaultDate, open]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setLocalError("");
    const trimmedDescription = description.trim();
    const amountPattern = /^\d+(?:\.\d{1,2})?$/;
    const parsedAmount = Number(amount);

    if (!date) {
      setLocalError(t("Choose an expense date."));
      return;
    }
    if (!trimmedDescription) {
      setLocalError(t("Enter an expense description."));
      return;
    }
    if (
      !amountPattern.test(amount) ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      Math.round(parsedAmount * 100) < 1
    ) {
      setLocalError(t("Enter a valid expense amount."));
      return;
    }

    onSubmit({
      date,
      description: trimmedDescription,
      amountCents: Math.round(parsedAmount * 100),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add expense"
      description="Record an expense to include it in profit and loss."
      footer={
        <div className="flex gap-3 pb-5">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            form="expense-form"
            className="btn-primary flex-1"
            disabled={loading}
          >
            {loading ? <Spinner /> : null}
            {t("Save expense")}
          </button>
        </div>
      }
    >
      <form
        id="expense-form"
        onSubmit={handleSubmit}
        className="space-y-4 px-5 py-5 sm:px-6"
      >
        <div>
          <label className="label" htmlFor="expense-date">
            {t("Date")}
          </label>
          <input
            id="expense-date"
            type="date"
            className="input"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="expense-description">
            {t("Description")}
          </label>
          <input
            id="expense-description"
            className="input"
            required
            maxLength={200}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("e.g. Coffee beans")}
          />
        </div>
        <div>
          <label className="label" htmlFor="expense-amount">
            {t("Amount")}
          </label>
          <input
            id="expense-amount"
            type="number"
            className="input"
            required
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
          />
        </div>
        {localError || error ? (
          <p
            role="alert"
            className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
          >
            {localError || t(error ?? "")}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
