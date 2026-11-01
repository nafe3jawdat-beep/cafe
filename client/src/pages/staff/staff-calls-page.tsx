import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BellRing,
  Check,
  Droplets,
  HelpCircle,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { api } from "../../lib/api";
import { callTypeLabel, cn, timeAgo } from "../../lib/format";
import type { CallType, StaffCall } from "../../types";
import { CallStatusPill } from "../../components/status-pill";
import { EmptyState, Skeleton, Spinner } from "../../components/ui/feedback";
import { useLocalization } from "../../lib/localization";

const callIcons: Record<CallType, LucideIcon> = {
  WAITER: BellRing,
  WATER: Droplets,
  CLEAN_TABLE: Sparkles,
  OTHER: HelpCircle,
};

export function StaffCallsPage() {
  const { translate: t } = useLocalization();
  const queryClient = useQueryClient();

  const callsQuery = useQuery({
    queryKey: ["staff", "calls", "open"],
    queryFn: () => api.staffCalls("open"),
    refetchInterval: 20_000,
  });

  const mutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "ACKNOWLEDGED" | "RESOLVED";
    }) => api.updateCall(id, status),
    onSuccess: ({ call }, variables) => {
      toast.success(
        variables.status === "RESOLVED"
          ? `${t("Table")} ${call.table.number} ${t("Request resolved.")}`
          : `${t("Table")} ${call.table.number} ${t("Request acknowledged.")}`
      );
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error: Error) => toast.error(t(error.message)),
  });

  const calls = callsQuery.data?.calls ?? [];
  const openCount = calls.filter((call) => call.status === "OPEN").length;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["staff", "calls"] });
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">{t("Guest care")}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-espresso-900 sm:text-4xl">
            {t("Service calls")}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-espresso-500">
            {t("Every waiter call, water request, and table clean appears here in real time. Acknowledge it so the rest of the team knows it's covered.")}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="btn-secondary btn-sm w-fit"
          disabled={callsQuery.isFetching}
        >
          <RefreshCw
            className={cn(
              "h-3.5 w-3.5",
              callsQuery.isFetching && "animate-spin"
            )}
          />
          {t("Refresh")}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="rounded-2xl border border-terracotta-400/30 bg-terracotta-50 px-4 py-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-terracotta-600">
            {t("New")}
          </p>
          <p className="mt-0.5 font-display text-2xl font-semibold text-espresso-900">
            {openCount}
          </p>
        </div>
        <div className="rounded-2xl border border-espresso-900/[0.07] bg-white/60 px-4 py-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-espresso-300">
            {t("In progress")}
          </p>
          <p className="mt-0.5 font-display text-2xl font-semibold text-espresso-900">
            {calls.length - openCount}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {callsQuery.isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-44 w-full rounded-3xl" />
            ))}
          </div>
        ) : callsQuery.isError ? (
          <EmptyState
            icon={<RefreshCw className="h-5 w-5" />}
            title={t("Couldn't load service calls")}
            description={
              callsQuery.error instanceof Error
                ? callsQuery.error.message
                : "Check your connection and try again."
            }
            action={
              <button type="button" className="btn-secondary" onClick={refresh}>
                {t("Try again")}
              </button>
            }
          />
        ) : calls.length === 0 ? (
          <EmptyState
            icon={<BellRing className="h-5 w-5" />}
            title={t("No open service calls")}
            description={t("When a guest asks for a waiter, water, or a table clean, it will land here instantly.")}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {calls.map((call) => (
              <CallCard
                key={call.id}
                call={call}
                loading={mutation.isPending && mutation.variables?.id === call.id}
                onUpdate={(status) => mutation.mutate({ id: call.id, status })}
              />
            ))}
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-espresso-300">
        {t("Resolved calls are archived automatically and remain available in the database.")}
      </p>
    </div>
  );
}

function CallCard({
  call,
  loading,
  onUpdate,
}: {
  call: StaffCall;
  loading: boolean;
  onUpdate: (status: "ACKNOWLEDGED" | "RESOLVED") => void;
}) {
  const { translate: t } = useLocalization();
  const Icon = callIcons[call.type];
  const isOpen = call.status === "OPEN";

  return (
    <article
      className={cn(
        "animate-fade-up rounded-3xl border bg-white/80 p-4 shadow-soft sm:p-5",
        isOpen
          ? "border-terracotta-400/40"
          : "border-espresso-900/[0.07] opacity-90"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "relative grid h-11 w-11 place-items-center rounded-2xl",
              isOpen
                ? "bg-terracotta-50 text-terracotta-600"
                : "bg-gold-100 text-gold-500"
            )}
          >
            {isOpen ? (
              <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-terracotta-400/30" />
            ) : null}
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-espresso-900">
              {t(callTypeLabel(call.type))}
            </h2>
            <p className="mt-0.5 text-xs text-espresso-300">
              {t("Table")} {call.table.number} · {timeAgo(call.createdAt)}
            </p>
          </div>
        </div>
        <CallStatusPill status={call.status} />
      </div>

      {call.note ? (
        <p className="mt-3 rounded-2xl bg-cream-100 px-4 py-3 text-sm leading-relaxed text-espresso-700">
          “{call.note}”
        </p>
      ) : (
        <p className="mt-3 text-xs text-espresso-300">
          {t("No additional note from the guest.")}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        {call.status === "OPEN" ? (
          <button
            type="button"
            className="btn-secondary btn-sm flex-1"
            disabled={loading}
            onClick={() => onUpdate("ACKNOWLEDGED")}
          >
            {loading ? <Spinner className="h-3.5 w-3.5" /> : null}
            {t("I'm on it")}
          </button>
        ) : null}
        <button
          type="button"
          className="btn-primary btn-sm flex-1"
          disabled={loading}
          onClick={() => onUpdate("RESOLVED")}
        >
          {loading ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          {t("Mark resolved")}
        </button>
      </div>
    </article>
  );
}
