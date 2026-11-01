function currentLocale() {
  return window.localStorage.getItem("cafe-language") === "ar" ? "ar" : "en-US";
}

export function formatMoney(cents: number, currency = "USD") {
  const formatter = new Intl.NumberFormat(currentLocale(), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });

  return formatter
    .formatToParts(cents / 100)
    .map((part) =>
      part.type === "currency" && ["USD", "SYP"].includes(currency)
        ? "ل.س"
        : part.value
    )
    .join("");
}

export function formatTime(value: string | Date) {
  return new Intl.DateTimeFormat(currentLocale(), {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function timeAgo(value: string | Date) {
  const date = new Date(value);
  const seconds = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000));

  if (currentLocale() === "ar") {
    const formatter = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
    if (seconds < 60) return formatter.format(-seconds, "second");
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return formatter.format(-minutes, "minute");
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return formatter.format(-hours, "hour");
    return formatter.format(-Math.floor(hours / 24), "day");
  }

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat(currentLocale(), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function orderStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "New order";
    case "PREPARING":
      return "Preparing";
    case "READY":
      return "Ready";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

export function callTypeLabel(type: string) {
  switch (type) {
    case "WAITER":
      return "Needs a waiter";
    case "WATER":
      return "Needs water";
    case "CLEAN_TABLE":
      return "Table needs cleaning";
    case "OTHER":
      return "Needs assistance";
    default:
      return type;
  }
}
