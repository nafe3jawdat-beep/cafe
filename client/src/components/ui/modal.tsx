import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/format";
import { useLocalization } from "../../lib/localization";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "center" | "sheet";
  className?: string;
}

const sizes = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  variant = "center",
  className,
}: ModalProps) {
  const { translate: t } = useLocalization();

  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }, 40);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex justify-center bg-espresso-900/40 p-0 backdrop-blur-[3px] sm:p-6",
        variant === "sheet"
          ? "items-end sm:items-center"
          : "items-end sm:items-center"
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden bg-cream-50 shadow-lift animate-slide-up sm:animate-fade-up",
          variant === "sheet"
            ? "rounded-t-4xl sm:rounded-4xl"
            : "rounded-t-4xl sm:rounded-4xl",
          sizes[size],
          className
        )}
      >
        {title ? (
          <div className="flex items-start justify-between gap-4 border-b border-espresso-900/[0.07] px-5 py-4 sm:px-6">
            <div>
              <h2
                id={titleId}
                className="font-display text-xl font-semibold tracking-tight text-espresso-900"
              >
                {title ? t(title) : undefined}
              </h2>
              {description ? (
                <p className="mt-1 text-sm text-espresso-500">                {description ? t(description) : undefined}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-espresso-500 transition hover:bg-espresso-900/5 hover:text-espresso-900"
              aria-label={t("Close dialog")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer ? (
          <div className="safe-bottom border-t border-espresso-900/[0.07] bg-cream-50 px-5 pt-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
