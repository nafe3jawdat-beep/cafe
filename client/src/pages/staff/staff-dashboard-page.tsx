import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  Check,
  ChefHat,
  CircleDollarSign,
  Clock,
  Coffee,
  RefreshCw,
  Table2,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { api } from "../../lib/api";
import {
  cn,
  formatMoney,
  formatTime,
  timeAgo,
} from "../../lib/format";
import { useAuth } from "../../hooks/use-auth";
import type { Order, OrderStatus } from "../../types";
import { OrderStatusPill } from "../../components/status-pill";
import { EmptyState, Skeleton, Spinner } from "../../components/ui/feedback";
import { useLocalization } from "../../lib/localization";

const columns: Array<{
  status: OrderStatus;
  title: string;
  hint: string;
  icon: typeof ChefHat;
}> = [
  {
    status: "PENDING",
    title: "New",
    hint: "Waiting to be started",
    icon: Clock,
  },
  {
    status: "PREPARING",
    title: "Preparing",
    hint: "In the kitchen",
    icon: ChefHat,
  },
  {
    status: "READY",
    title: "Ready",
    hint: "Ready to serve",
    icon: Bell,
  },
];

const nextAction: Partial<
  Record<OrderStatus, { status: OrderStatus; label: string; icon: typeof Check }>
> = {
  PENDING: { status: "PREPARING", label: "Start preparing", icon: ChefHat },
  PREPARING: { status: "READY", label: "Mark ready", icon: Bell },
  READY: { status: "DELIVERED", label: "Mark delivered", icon: Check },
};

export function StaffDashboardPage() {
  const { translate: t, language } = useLocalization();
  const auth = useAuth();
  const queryClient = useQueryClient();

  const statsQuery = useQuery({
    queryKey: ["staff", "stats"],
    queryFn: () => api.staffStats(),
    refetchInterval: 30_000,
  });

  const ordersQuery = useQuery({
    queryKey: ["staff", "orders", "active"],
    queryFn: () => api.staffOrders("active"),
    refetchInterval: 20_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.updateOrderStatus(id, status),
    onSuccess: ({ order }) => {
      toast.success(
        `${t("Order")} #${order.orderNumber} → ${t(order.status.toLowerCase())}`
      );
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error: Error) => toast.error(t(error.message)),
  });

  const orders = ordersQuery.data?.orders ?? [];
  const stats = statsQuery.data;
  const currency = stats?.currency ?? "SYP";
  const firstName = auth.data?.name.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["staff"] });
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">{t(greeting)}, {firstName}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-espresso-900 sm:text-4xl">
            {t("Live floor")}
          </h1>
          <p className="mt-1.5 text-sm text-espresso-500">
            {new Intl.DateTimeFormat(language === "ar" ? "ar" : "en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            }).format(new Date())}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="btn-secondary btn-sm"
            disabled={ordersQuery.isFetching}
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                ordersQuery.isFetching && "animate-spin"
              )}
            />
            {t("Refresh")}
          </button>
          <span className="hidden items-center gap-2 rounded-full border border-espresso-900/10 bg-white/70 px-3 py-2 text-xs font-semibold text-espresso-500 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sage-500" />
            {t("Updating live")}
          </span>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          icon={UtensilsCrossed}
          label={t("Active orders")}
          value={stats?.activeOrders ?? 0}
          tone="terracotta"
          loading={statsQuery.isLoading}
        />
        <StatCard
          icon={Bell}
          label={t("Open calls")}
          value={stats?.openCalls ?? 0}
          tone="gold"
          loading={statsQuery.isLoading}
        />
        <StatCard
          icon={Table2}
          label={t("Tables busy")}
          value={stats?.occupiedTables ?? 0}
          tone="sage"
          loading={statsQuery.isLoading}
        />
        <StatCard
          icon={CircleDollarSign}
          label={t("Today's sales")}
          value={formatMoney(stats?.revenueTodayCents ?? 0, currency)}
          tone="espresso"
          loading={statsQuery.isLoading}
        />
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-espresso-900">
              {t("Order board")}
            </h2>
            <p className="mt-0.5 text-sm text-espresso-500">
              {t("Move each order through the kitchen and onto the table.")}
            </p>
          </div>
          <span className="text-xs font-semibold text-espresso-300">
            {orders.length} {t("active")}
          </span>
        </div>

        {ordersQuery.isLoading ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {[1, 2, 3].map((column) => (
              <div key={column} className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-44 w-full rounded-3xl" />
                <Skeleton className="h-44 w-full rounded-3xl" />
              </div>
            ))}
          </div>
        ) : ordersQuery.isError ? (
          <EmptyState
            className="mt-4"
            icon={<RefreshCw className="h-5 w-5" />}
            title={t("Couldn't load orders")}
            description={
              ordersQuery.error instanceof Error
                ? ordersQuery.error.message
                : "Check your connection and try again."
            }
            action={
              <button type="button" className="btn-secondary" onClick={refresh}>
                {t("Try again")}
              </button>
            }
          />
        ) : orders.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={<Coffee className="h-5 w-5" />}
            title={t("The floor is calm")}
            description={t("New orders will appear here the moment a guest sends one. No refresh needed.")}
          />
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {columns.map((column) => {
              const columnOrders = orders.filter(
                (order) => order.status === column.status
              );
              const Icon = column.icon;

              return (
                <div
                  key={column.status}
                  className="rounded-3xl border border-espresso-900/[0.06] bg-white/35 p-2.5"
                >
                  <div className="flex items-center gap-2.5 px-2 py-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/80 text-espresso-500 shadow-soft">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-espresso-900">
                        {t(column.title)}
                      </h3>
                      <p className="text-[0.65rem] text-espresso-300">
                        {t(column.hint)}
                      </p>
                    </div>
                    <span className="grid h-6 min-w-6 place-items-center rounded-full bg-espresso-900/5 px-1.5 text-xs font-bold text-espresso-500">
                      {columnOrders.length}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {columnOrders.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-espresso-900/10 px-4 py-8 text-center text-xs text-espresso-300">
                        Nothing here right now
                      </div>
                    ) : (
                      columnOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          currency={currency}
                          loading={
                            statusMutation.isPending &&
                            statusMutation.variables?.id === order.id
                          }
                          onAdvance={(status) =>
                            statusMutation.mutate({ id: order.id, status })
                          }
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-3xl border border-espresso-900/[0.07] bg-white/60 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sage-50 text-sage-600">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-espresso-300">
              Orders today
            </p>
            <p className="mt-0.5 text-sm font-bold text-espresso-900">
              {stats?.ordersToday ?? 0} sent to the kitchen
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-3xl border border-espresso-900/[0.07] bg-white/60 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gold-100 text-gold-500">
            <CircleDollarSign className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-espresso-300">
              Open bills
            </p>
            <p className="mt-0.5 text-sm font-bold text-espresso-900">
              {stats?.openBills ?? 0} waiting to settle
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  loading,
}: {
  icon: typeof Coffee;
  label: string;
  value: number | string;
  tone: "terracotta" | "gold" | "sage" | "espresso";
  loading: boolean;
}) {
  const tones = {
    terracotta: "bg-terracotta-50 text-terracotta-600",
    gold: "bg-gold-100 text-gold-500",
    sage: "bg-sage-50 text-sage-600",
    espresso: "bg-espresso-900/5 text-espresso-700",
  };

  return (
    <div className="rounded-3xl border border-espresso-900/[0.07] bg-white/70 p-4 shadow-soft sm:p-5">
      <div className={cn("grid h-9 w-9 place-items-center rounded-xl", tones[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-espresso-300">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : (
        <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-espresso-900 sm:text-3xl">
          {value}
        </p>
      )}
    </div>
  );
}

function OrderCard({
  order,
  currency,
  loading,
  onAdvance,
}: {
  order: Order;
  currency: string;
  loading: boolean;
  onAdvance: (status: OrderStatus) => void;
}) {
  const { translate: t } = useLocalization();
  const action = nextAction[order.status];
  const ActionIcon = action?.icon;

  return (
    <article
      className={cn(
        "animate-fade-up rounded-2xl border bg-white p-3.5 shadow-soft",
        order.status === "PENDING"
          ? "border-terracotta-400/40"
          : "border-espresso-900/[0.07]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-espresso-900 text-sm font-bold text-cream-50">
            {order.table.number}
          </span>
          <div>
            <p className="text-sm font-bold text-espresso-900">
              {t("Table")} {order.table.number}
            </p>
            <p className="text-[0.65rem] text-espresso-300">
              #{order.orderNumber} · {timeAgo(order.createdAt)} ·{" "}
              {formatTime(order.createdAt)}
            </p>
          </div>
        </div>
        <OrderStatusPill status={order.status} />
      </div>

      <div className="mt-3 space-y-1 border-t border-espresso-900/[0.06] pt-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-espresso-900">
                <span className="mr-1 font-bold text-terracotta-600">
                  {item.quantity}×
                </span>
                {item.name}
              </p>
              {item.notes ? (
                <p className="mt-0.5 text-[0.65rem] italic leading-relaxed text-espresso-300">
                  “{item.notes}”
                </p>
              ) : null}
            </div>
            <span className="shrink-0 text-[0.65rem] font-semibold text-espresso-300">
              {formatMoney(item.lineTotalCents, currency)}
            </span>
          </div>
        ))}
      </div>

      {order.note ? (
        <div className="mt-3 rounded-xl bg-gold-100/70 px-3 py-2 text-[0.68rem] leading-relaxed text-espresso-700">
          <span className="font-bold">{t("Note: ")}</span>
          {order.note}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between border-t border-espresso-900/[0.06] pt-2.5">
        <span className="text-[0.65rem] font-semibold text-espresso-300">
          {order.customerName ? order.customerName : t("Guest")}
        </span>
        <span className="text-xs font-bold text-espresso-900">
          {formatMoney(order.totalCents, currency)}
        </span>
      </div>

      {action ? (
        <button
          type="button"
          onClick={() => onAdvance(action.status)}
          disabled={loading}
          className={cn(
            "mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition disabled:opacity-60",
            order.status === "PENDING"
              ? "bg-terracotta-500 text-white hover:bg-terracotta-600"
              : "bg-espresso-900 text-cream-50 hover:bg-espresso-700"
          )}
        >
          {loading ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : ActionIcon ? (
            <ActionIcon className="h-3.5 w-3.5" />
          ) : null}
          {t(action.label)}
        </button>
      ) : null}
    </article>
  );
}
