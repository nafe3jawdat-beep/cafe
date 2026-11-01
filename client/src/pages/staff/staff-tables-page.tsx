import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  Copy,
  Download,
  ExternalLink,
  Plus,
  QrCode,
  RefreshCw,
  Trash2,
  Table2,
} from "lucide-react";
import { api } from "../../lib/api";
import { cn, formatMoney } from "../../lib/format";
import type { TableSummary } from "../../types";
import { EmptyState, Skeleton, Spinner } from "../../components/ui/feedback";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Modal } from "../../components/ui/modal";
import { useLocalization } from "../../lib/localization";

export function StaffTablesPage() {
  const { translate: t } = useLocalization();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<TableSummary | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TableSummary | null>(null);

  const statsQuery = useQuery({
    queryKey: ["staff", "stats"],
    queryFn: () => api.staffStats(),
  });

  const tablesQuery = useQuery({
    queryKey: ["staff", "tables"],
    queryFn: () => api.staffTables(),
    refetchInterval: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (input: { number: number; name?: string }) =>
      api.createTable(input),
    onSuccess: ({ table }) => {
      toast.success(t("Table added."));
      setCreateOpen(false);
      setSelected(table);
      void queryClient.invalidateQueries({ queryKey: ["staff", "tables"] });
      void queryClient.invalidateQueries({ queryKey: ["staff", "stats"] });
    },
    onError: (error: Error) => toast.error(t(error.message)),
  });

  const deleteMutation = useMutation({
    mutationFn: (table: TableSummary) => api.deleteTable(table.id),
    onSuccess: (_data, table) => {
      toast.success(`${t("Table")} ${table.number} ${t("was deleted.")}`);
      setDeleteTarget(null);
      if (selected?.id === table.id) setSelected(null);
      void queryClient.invalidateQueries({ queryKey: ["staff", "tables"] });
      void queryClient.invalidateQueries({ queryKey: ["staff", "stats"] });
    },
    onError: (error: Error) => toast.error(t(error.message)),
  });

  const tables = tablesQuery.data?.tables ?? [];
  const currency = statsQuery.data?.currency ?? "SYP";
  const busyCount = tables.filter((table) => table.activeOrderCount > 0).length;
  const billCount = tables.filter((table) => table.openBill).length;

  const tableUrl = (table: TableSummary) =>
    `${window.location.origin}/table/${table.number}?key=${encodeURIComponent(
      table.qrToken
    )}`;

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setGenerating(true);
    setQrDataUrl("");

    QRCode.toDataURL(tableUrl(selected), {
      width: 720,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#231710", light: "#faf5ec" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) toast.error(t("Could not generate the QR code."));
      })
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected]);

  const copyLink = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(tableUrl(selected));
      toast.success(t("Table link copied."));
    } catch {
      toast.error(t("Could not copy the link."));
    }
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">{t("QR codes")}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-espresso-900 sm:text-4xl">
            {t("Tables")}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-espresso-500">
            {t("Print each table's QR code and place it on the table. Every code opens the menu with the table number and secure key attached.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="btn-primary btn-sm w-fit"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("Add table")}
          </button>
          <button
            type="button"
            onClick={() => void tablesQuery.refetch()}
            className="btn-secondary btn-sm w-fit"
            disabled={tablesQuery.isFetching}
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                tablesQuery.isFetching && "animate-spin"
              )}
            />
            {t("Refresh")}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-espresso-900/[0.07] bg-white/60 px-4 py-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-espresso-300">
            {t("Tables")}
          </p>
          <p className="mt-0.5 font-display text-2xl font-semibold text-espresso-900">
            {tables.length}
          </p>
        </div>
        <div className="rounded-2xl border border-sage-400/30 bg-sage-50 px-4 py-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-sage-600">
            {t("Busy")}
          </p>
          <p className="mt-0.5 font-display text-2xl font-semibold text-espresso-900">
            {busyCount}
          </p>
        </div>
        <div className="rounded-2xl border border-gold-400/30 bg-gold-100 px-4 py-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-gold-500">
            {t("Open bills")}
          </p>
          <p className="mt-0.5 font-display text-2xl font-semibold text-espresso-900">
            {billCount}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {tablesQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Skeleton key={item} className="h-40 w-full rounded-3xl" />
            ))}
          </div>
        ) : tablesQuery.isError ? (
          <EmptyState
            icon={<RefreshCw className="h-5 w-5" />}
            title={t("Couldn't load tables")}
            description={
              tablesQuery.error instanceof Error
                ? tablesQuery.error.message
                : "Check your connection and try again."
            }
            action={
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void tablesQuery.refetch()}
              >
                {t("Try again")}
              </button>
            }
          />
        ) : tables.length === 0 ? (
          <EmptyState
            icon={<Table2 className="h-5 w-5" />}
            title={t("No tables configured")}
            description={t("Add a table to generate its secure QR code.")}
            action={
              <button
                type="button"
                className="btn-primary"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                {t("Add table")}
              </button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tables.map((table) => (
              <div
                key={table.id}
                className={cn(
                  "overflow-hidden rounded-3xl border bg-white/75 p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:bg-white",
                  table.activeOrderCount > 0
                    ? "border-terracotta-400/30"
                    : "border-espresso-900/[0.07]"
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelected(table)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        "grid h-12 w-12 place-items-center rounded-2xl font-display text-xl font-semibold",
                        table.activeOrderCount > 0
                          ? "bg-terracotta-500 text-white"
                          : "bg-espresso-900 text-cream-50"
                      )}
                    >
                      {table.number}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.1em]",
                        table.activeOrderCount > 0
                          ? "bg-terracotta-50 text-terracotta-600"
                          : "bg-sage-50 text-sage-600"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          table.activeOrderCount > 0
                            ? "bg-terracotta-500"
                            : "bg-sage-500"
                        )}
                      />
                      {t(table.activeOrderCount > 0 ? "Busy" : "Open")}
                    </span>
                  </div>

                  <p className="mt-4 text-sm font-bold text-espresso-900">
                    {t("Table")} {table.number}
                    {table.name ? (
                      <span className="font-normal text-espresso-300">
                        {" "}
                        · {table.name}
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-espresso-300">
                    <span>
                      {table.activeOrderCount}{" "}
                      {t(
                        table.activeOrderCount === 1
                          ? "active order"
                          : "active orders"
                      )}
                    </span>
                    {table.pendingCount > 0 ? (
                      <span className="font-semibold text-terracotta-600">
                        {table.pendingCount} {t("new")}
                      </span>
                    ) : null}
                    {table.openBill ? (
                      <span className="font-semibold text-gold-500">
                        {t("Bill")} ·{" "}
                        {formatMoney(table.openBill.totalCents, currency)}
                      </span>
                    ) : null}
                  </div>
                </button>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(table)}
                    className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-espresso-300 transition hover:text-terracotta-600"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    {t("View QR code")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(table)}
                    aria-label={`${t("Delete table")} ${table.number}`}
                    className="grid h-8 w-8 place-items-center rounded-full text-espresso-300 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TableFormModal
        open={createOpen}
        loading={createMutation.isPending}
        onClose={() => {
          if (!createMutation.isPending) setCreateOpen(false);
        }}
        onSubmit={(input) => createMutation.mutate(input)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null);
        }}
        title={t("Delete table?")}
        description={
          deleteTarget
            ? `${t("Table")} ${deleteTarget.number}. ${t(
                "It will be removed from this list. Historical orders and bills are kept, and you can add this table number again later."
              )}`
            : undefined
        }
        confirmLabel={t("Delete table")}
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
      />

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={
          selected
            ? `Table ${selected.number}${selected.name ? ` · ${selected.name}` : ""}`
            : t("Table QR")
        }
        description={t("Print this code or share the secure link.")}
        size="sm"
      >
        {selected ? (
          <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
            <div className="mx-auto max-w-xs rounded-3xl border border-espresso-900/[0.08] bg-white p-4 shadow-soft">
              {generating || !qrDataUrl ? (
                <div className="grid aspect-square place-items-center rounded-2xl bg-cream-100">
                  <Spinner className="h-6 w-6 text-espresso-300" />
                </div>
              ) : (
                <img
                  src={qrDataUrl}
                  alt={`${t("QR code for table")} ${selected.number}`}
                  className="aspect-square w-full rounded-2xl"
                />
              )}
              <p className="mt-3 text-center font-display text-lg font-semibold text-espresso-900">
                Table {selected.number}
              </p>
              <p className="mt-0.5 text-center text-[0.65rem] text-espresso-300">
                {t("Scan to view the menu")}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="btn-secondary btn-sm"
              >
                <Copy className="h-3.5 w-3.5" />
                {t("Copy link")}
              </button>
              <a
                href={qrDataUrl || undefined}
                download={`cafe-qr-table-${selected.number}.png`}
                className="btn-primary btn-sm"
                aria-disabled={!qrDataUrl}
              >
                <Download className="h-3.5 w-3.5" />
                {t("Download")}
              </a>
            </div>
            <a
              href={tableUrl(selected)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold text-terracotta-600 transition hover:bg-terracotta-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("Open guest menu")}
            </a>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function TableFormModal({
  open,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (input: { number: number; name?: string }) => void;
}) {
  const { translate: t } = useLocalization();
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setNumber("");
      setName("");
    }
  }, [open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedNumber = Number(number);
    if (
      !Number.isInteger(parsedNumber) ||
      parsedNumber < 1 ||
      parsedNumber > 100000
    ) {
      toast.error(t("Enter a table number from 1 to 100000."));
      return;
    }

    onSubmit({ number: parsedNumber, name: name.trim() || undefined });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Add table")}
      description={t("A unique secure QR code will be created for this table.")}
      size="sm"
    >
      <form onSubmit={submit} className="space-y-4 px-5 py-5 sm:px-6">
        <label className="block text-sm font-semibold text-espresso-700">
          {t("Table number")}
          <input
            type="number"
            min="1"
            max="100000"
            step="1"
            required
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            className="input mt-1.5 w-full"
          />
        </label>
        <label className="block text-sm font-semibold text-espresso-700">
          {t("Name (optional)")}
          <input
            type="text"
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input mt-1.5 w-full"
          />
        </label>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {t("Cancel")}
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading ? <Spinner /> : <Plus className="h-4 w-4" />}
            {t("Add table")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
