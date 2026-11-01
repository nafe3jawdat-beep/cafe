import { cn } from "../../lib/format";

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-sage-500" : "bg-espresso-900/15"
      )}
    >
      <span
        className={cn(
          "inline-block h-[1.125rem] w-[1.125rem] transform rounded-full bg-white shadow transition-transform",
          checked
            ? "ltr:translate-x-[1.4rem] rtl:-translate-x-[1.4rem]"
            : "ltr:translate-x-1 rtl:-translate-x-1"
        )}
      />
    </button>
  );
}
