import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  ChevronRight,
  ReceiptText,
  Search,
  ShoppingBag,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { cn, formatMoney } from "../lib/format";
import { tablePath } from "../lib/table-path";
import type { MenuItem, MenuResponse } from "../types";
import { useTableRealtime } from "../hooks/use-table-realtime";
import { CartProvider, useCart } from "../context/cart-context";
import { Brand } from "../components/brand";
import { MenuItemCard } from "../components/menu-item-card";
import { ItemSheet } from "../components/item-sheet";
import { CartSheet } from "../components/cart-sheet";
import { ServiceSheet } from "../components/service-sheet";
import { ImageWithFallback } from "../components/image-with-fallback";
import { EmptyState, Skeleton, Spinner } from "../components/ui/feedback";
import { LanguageSwitcher, useLocalization } from "../lib/localization";

export function MenuPage() {
  const { tableNumber: tableParam } = useParams();
  const [searchParams] = useSearchParams();
  const tableNumber = Number(tableParam);
  const tableKey = searchParams.get("key") ?? undefined;
  const validTable = Number.isInteger(tableNumber) && tableNumber > 0;

  const menuQuery = useQuery({
    queryKey: ["table-menu", tableNumber, tableKey],
    queryFn: () => api.getMenu(tableNumber, tableKey),
    enabled: validTable,
    retry: false,
  });

  if (!validTable) {
    return <MenuError message="That table number doesn't look right." />;
  }

  if (menuQuery.isLoading) {
    return <MenuSkeleton />;
  }

  if (menuQuery.isError || !menuQuery.data) {
    return (
      <MenuError
        message={
          menuQuery.error instanceof Error
            ? menuQuery.error.message
            : "We couldn't load this table's menu."
        }
      />
    );
  }

  return (
    <CartProvider tableNumber={tableNumber} pricing={menuQuery.data.pricing}>
      <MenuExperience
        data={menuQuery.data}
        tableNumber={tableNumber}
        tableKey={tableKey}
      />
    </CartProvider>
  );
}

function MenuExperience({
  data,
  tableNumber,
  tableKey,
}: {
  data: MenuResponse;
  tableNumber: number;
  tableKey?: string;
}) {
  const { translate: t } = useLocalization();
  const navigate = useNavigate();
  const cart = useCart();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemSheetOpen, setItemSheetOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);

  const { connected } = useTableRealtime(tableNumber, tableKey);

  const sessionQuery = useQuery({
    queryKey: ["table-session", tableNumber, tableKey],
    queryFn: () => api.getTableSession(tableNumber, tableKey),
    refetchInterval: 30_000,
  });

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.categories
      .filter((category) => categoryId === "all" || category.id === categoryId)
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          if (!term) return true;
          return (
            item.name.toLowerCase().includes(term) ||
            item.description?.toLowerCase().includes(term)
          );
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [data.categories, categoryId, search]);

  const openBill = sessionQuery.data?.openBill ?? null;
  const activeCall = sessionQuery.data?.calls?.[0] ?? null;
  const totalItems = filteredCategories.reduce(
    (sum, category) => sum + category.items.length,
    0
  );

  const addItem = (item: MenuItem, quantity: number, notes: string) => {
    cart.addItem(item, quantity, notes);
    toast.success(`${item.name} ${t("Added to your order")}`, {
      description: quantity > 1 ? `${quantity} × ${item.name}` : undefined,
      duration: 1800,
    });
  };

  const openItem = (item: MenuItem) => {
    setSelectedItem(item);
    setItemSheetOpen(true);
  };

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 border-b border-espresso-900/[0.06] bg-cream-100/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:h-[4.5rem] sm:px-6">
          <Link to="/" aria-label={t("Brillo Cafe home")} className="shrink-0">
            <Brand className="hidden sm:flex" />
            <Brand compact className="sm:hidden" />
          </Link>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <span className="hidden items-center gap-2 rounded-full border border-espresso-900/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-espresso-700 sm:inline-flex">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  connected ? "bg-sage-500" : "bg-gold-400"
                )}
              />
              {connected ? t("Live updates") : t("Reconnecting")}
            </span>
            <span className="rounded-full bg-espresso-900 px-3 py-1.5 text-xs font-bold text-cream-50">
              {t("Table")} {data.table.number}
            </span>
            <Link
              to={tablePath(tableNumber, tableKey, "/status")}
              className="grid h-9 w-9 place-items-center rounded-full border border-espresso-900/10 bg-white/70 text-espresso-700 transition hover:bg-white"
              aria-label={t("View your orders")}
            >
              <ReceiptText className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setServiceOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-full bg-terracotta-500 text-white shadow-soft transition hover:bg-terracotta-600"
              aria-label={t("Call a staff member")}
            >
              <BellRing className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        <section className="pb-5 pt-8 sm:pb-7 sm:pt-12">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Table {String(data.table.number).padStart(2, "0")}
                {data.table.name ? ` · ${data.table.name}` : ""}
              </p>
              <h1 className="mt-2 text-balance font-display text-4xl font-semibold leading-[1.02] tracking-tight text-espresso-900 sm:text-5xl">
                {t("What are we craving?")}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-espresso-500 sm:text-base">
                {t("Everything is made fresh. Tap an item for details, or add it straight to your order.")}
              </p>
            </div>
            <div className="hidden shrink-0 items-center gap-2 text-xs font-medium text-espresso-500 sm:flex">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/80 text-sage-600 shadow-soft">
                {connected ? (
                  <Wifi className="h-4 w-4" />
                ) : (
                  <WifiOff className="h-4 w-4" />
                )}
              </span>
              <span className="max-w-28 leading-snug">
                {connected ? t("Orders update live") : t("Trying to reconnect")}
              </span>
            </div>
          </div>

          <div className="relative mt-6">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso-300" />
            <input
              type="search"
              placeholder={t("Search the menu…")}
              className="input h-12 pl-11"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label={t("Search the menu")}
            />
          </div>

          {openBill ? (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-gold-400/30 bg-gold-100/70 px-4 py-3">
              <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
              <div className="text-sm">
                <p className="font-semibold text-espresso-900">
                  {t("Bill requested ·")}{" "}
                  {formatMoney(openBill.totalCents, data.pricing.currency)}
                </p>
                <p className="mt-0.5 text-xs text-espresso-500">
                  {t("A staff member will bring the card machine. You can keep browsing while you wait.")}
                </p>
              </div>
            </div>
          ) : null}

          {activeCall ? (
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-sage-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("Your service request is with the team.")}
            </div>
          ) : null}
        </section>

        <nav
          className="sticky top-16 z-20 -mx-4 border-b border-espresso-900/[0.06] bg-cream-100/90 px-4 py-3 backdrop-blur-xl sm:top-[4.5rem] sm:-mx-6 sm:px-6"
          aria-label={t("Menu categories")}
        >
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setCategoryId("all")}
              className={cn("chip", categoryId === "all" && "chip-active")}
            >
              {t("All")}
            </button>
            {data.categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={cn(
                  "chip",
                  categoryId === category.id && "chip-active"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        </nav>

        <div className="space-y-10 py-8 sm:py-10">
          {filteredCategories.length === 0 ? (
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title={t("Nothing matches that search")}
              description={t("Try a different word, or browse another category.")}
              action={
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSearch("");
                    setCategoryId("all");
                  }}
                >
                  {t("Show the full menu")}
                </button>
              }
            />
          ) : (
            filteredCategories.map((category) => (
              <section key={category.id} id={category.slug}>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="section-title">{category.name}</h2>
                    {category.description ? (
                      <p className="mt-1 text-sm text-espresso-500">
                        {category.description}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-espresso-300">
                    {category.items.length}{" "}
                    {t(category.items.length === 1 ? "item" : "items")}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {category.items.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      currency={data.pricing.currency}
                      onOpen={() => openItem(item)}
                      onQuickAdd={() => addItem(item, 1, "")}
                    />
                  ))}
                </div>
              </section>
            ))
          )}

          {!search && categoryId === "all" && totalItems > 0 ? (
            <FeaturedFooter
              data={data}
              onOpen={(item) => openItem(item)}
              onQuickAdd={(item) => addItem(item, 1, "")}
            />
          ) : null}
        </div>

        <footer className="flex flex-col items-center gap-2 border-t border-espresso-900/[0.07] py-8 text-center text-xs text-espresso-300">
          <p>{t("Freshly prepared · Please tell us about any allergies.")}</p>
          <button
            type="button"
            onClick={() => setServiceOpen(true)}
            className="font-semibold text-terracotta-600 hover:underline"
          >
            {t("Need something? Call a staff member")}
          </button>
        </footer>
      </main>

      {cart.itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 safe-bottom px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 rounded-full bg-espresso-900 py-3 pl-3 pr-5 text-cream-50 shadow-lift transition hover:-translate-y-0.5 hover:bg-espresso-700"
          >
            <span className="flex items-center gap-3">
              <span className="relative grid h-10 w-10 place-items-center rounded-full bg-cream-50/10">
                <ShoppingBag className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-terracotta-500 px-1 text-[0.6rem] font-bold text-white">
                  {cart.itemCount}
                </span>
              </span>
              <span className="text-left">
                <span className="block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-cream-300">
                  {t("Your order")}
                </span>
                <span className="block text-sm font-semibold">
                  {cart.itemCount} {t(cart.itemCount === 1 ? "item" : "items")}
                </span>
              </span>
            </span>
            <span className="flex items-center gap-2 text-sm font-bold">
              {formatMoney(cart.totalCents, data.pricing.currency)}
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      ) : null}

      <ItemSheet
        item={selectedItem}
        open={itemSheetOpen}
        currency={data.pricing.currency}
        onClose={() => setItemSheetOpen(false)}
        onAdd={addItem}
      />

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        tableNumber={tableNumber}
        tableKey={tableKey}
        pricing={data.pricing}
        openBill={openBill}
        onOrderPlaced={(order) => {
          toast.success(`Order #${order.orderNumber} ${t("sent to the kitchen")}`, {
            description: t("You can follow its progress on the next screen."),
          });
          navigate(tablePath(tableNumber, tableKey, "/status"));
        }}
      />

      <ServiceSheet
        open={serviceOpen}
        onClose={() => setServiceOpen(false)}
        tableNumber={tableNumber}
        tableKey={tableKey}
        onRequested={() => void sessionQuery.refetch()}
      />
    </div>
  );
}

function FeaturedFooter({
  data,
  onOpen,
  onQuickAdd,
}: {
  data: MenuResponse;
  onOpen: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem) => void;
}) {
  const { translate: t } = useLocalization();
  const featured = data.categories
    .flatMap((category) => category.items)
    .find((item) => item.featured && item.available);

  if (!featured) return null;

  return (
    <section className="overflow-hidden rounded-4xl bg-espresso-900 text-cream-50 shadow-lift">
      <div className="grid sm:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-center p-6 sm:p-9">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-terracotta-400">
            {t("A little suggestion")}
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {featured.name}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-cream-300">
            {featured.description}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onQuickAdd(featured)}
              className="btn bg-cream-50 text-espresso-900 hover:bg-white"
            >
              {t("Add to order")} · {formatMoney(featured.priceCents, data.pricing.currency)}
            </button>
            <button
              type="button"
              onClick={() => onOpen(featured)}
              className="text-xs font-semibold text-cream-300 underline-offset-4 hover:text-cream-50 hover:underline"
            >
              {t("Details")}
            </button>
          </div>
        </div>
        <ImageWithFallback
          src={featured.imageUrl}
          alt={featured.name}
          className="hidden min-h-56 sm:block"
        />
      </div>
    </section>
  );
}

function MenuSkeleton() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="mt-12 h-4 w-28" />
      <Skeleton className="mt-4 h-12 w-80 max-w-full" />
      <Skeleton className="mt-4 h-4 w-64 max-w-full" />
      <Skeleton className="mt-8 h-12 w-full" />
      <div className="mt-8 flex gap-2">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-32 w-full" />
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <Spinner className="h-5 w-5 text-espresso-300" />
      </div>
    </div>
  );
}

function MenuError({ message }: { message: string }) {
  const { translate: t } = useLocalization();

  return (
    <main className="relative grid min-h-screen place-items-center px-5 py-12">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="card w-full max-w-md p-8 text-center">
        <Brand className="justify-center" />
        <h1 className="mt-8 font-display text-2xl font-semibold text-espresso-900">
          {t("We couldn't open this table")}
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
