import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BellRing,
  Droplets,
  HelpCircle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { api } from "../lib/api";
import { cn } from "../lib/format";
import type { CallType } from "../types";
import { Modal } from "./ui/modal";
import { Spinner } from "./ui/feedback";
import { useLocalization } from "../lib/localization";

const options: Array<{
  type: CallType;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    type: "WAITER",
    label: "Call a waiter",
    description: "Someone will come to your table.",
    icon: BellRing,
  },
  {
    type: "WATER",
    label: "Bring water",
    description: "Still or sparkling — just ask.",
    icon: Droplets,
  },
  {
    type: "CLEAN_TABLE",
    label: "Clear the table",
    description: "We'll tidy up and take empty plates.",
    icon: Sparkles,
  },
  {
    type: "OTHER",
    label: "Something else",
    description: "Tell us what you need below.",
    icon: HelpCircle,
  },
];

export function ServiceSheet({
  open,
  onClose,
  tableNumber,
  tableKey,
  onRequested,
}: {
  open: boolean;
  onClose: () => void;
  tableNumber: number;
  tableKey?: string;
  onRequested?: () => void;
}) {
  const [note, setNote] = useState("");
  const [activeType, setActiveType] = useState<CallType | null>(null);
  const { translate: t } = useLocalization();

  const mutation = useMutation({
    mutationFn: (type: CallType) =>
      api.createCall({ tableNumber, tableKey, type, note }),
    onSuccess: () => {
      toast.success(t("A staff member has been notified."), {
        description: t("They'll be with you shortly."),
      });
      setNote("");
      setActiveType(null);
      onRequested?.();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(t(error.message));
      setActiveType(null);
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("How can we help?")}
      description={`Table ${tableNumber} · requests appear instantly on the staff dashboard.`}
      size="md"
    >
      <div className="grid gap-2.5 p-5 sm:grid-cols-2 sm:p-6">
        {options.map((option) => {
          const Icon = option.icon;
          const loading = mutation.isPending && activeType === option.type;
          return (
            <button
              key={option.type}
              type="button"
              disabled={mutation.isPending}
              onClick={() => {
                setActiveType(option.type);
                mutation.mutate(option.type);
              }}
              className={cn(
                "group flex items-start gap-3 rounded-2xl border border-espresso-900/[0.08] bg-white/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-terracotta-300 hover:bg-white hover:shadow-soft disabled:pointer-events-none disabled:opacity-60",
                loading && "border-terracotta-300 bg-white"
              )}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-terracotta-50 text-terracotta-600 transition group-hover:bg-terracotta-100">
                {loading ? <Spinner /> : <Icon className="h-5 w-5" />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-espresso-900">
                  {t(option.label)}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-espresso-500">
                  {t(option.description)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="border-t border-espresso-900/[0.07] px-5 pb-6 pt-4 sm:px-6">
        <label className="label" htmlFor="service-note">
          {t("Optional note")}
        </label>
        <textarea
          id="service-note"
          className="input min-h-20 resize-none"
          placeholder={t("e.g. We need two extra glasses")}
          maxLength={200}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <p className="mt-2 text-xs text-espresso-300">
          {t("Tap a request above to send it. Notes are attached to the request.")}
        </p>
      </div>
    </Modal>
  );
}
