import { AlertTriangle } from "lucide-react";
import { Modal } from "./modal";
import { Spinner } from "./feedback";
import { useLocalization } from "../../lib/localization";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { translate: t } = useLocalization();

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <div className="flex gap-3 pb-5">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {t(cancelLabel)}
          </button>
          <button
            type="button"
            className={
              destructive
                ? "btn flex-1 bg-red-600 text-white hover:bg-red-700"
                : "btn-primary flex-1"
            }
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Spinner /> : null}
            {t(confirmLabel)}
          </button>
        </div>
      }
    >
      <div className="px-6 py-6">
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-terracotta-50 text-terracotta-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="font-display text-xl font-semibold text-espresso-900">
          {t(title)}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-espresso-500">
            {t(description)}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
