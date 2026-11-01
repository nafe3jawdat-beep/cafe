import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { api, type MenuItemPayload } from "../../lib/api";
import { cn, formatMoney } from "../../lib/format";
import type { Category, MenuItem } from "../../types";
import { ImageWithFallback } from "../../components/image-with-fallback";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { EmptyState, Skeleton, Spinner } from "../../components/ui/feedback";
import { Modal } from "../../components/ui/modal";
import { Switch } from "../../components/ui/switch";
import { useLocalization } from "../../lib/localization";

export function StaffMenuPage() {
  const { translate: t } = useLocalization();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [pendingAvailabilityId, setPendingAvailabilityId] = useState<
    string | null
  >(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formCategoryId, setFormCategoryId] = useState<string | null>(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  const menuQuery = useQuery({
    queryKey: ["staff", "menu"],
    queryFn: () => api.staffMenu(),
  });

  const availabilityMutation = useMutation({
    mutationFn: ({ item, available }: { item: MenuItem; available: boolean }) =>
      api.updateAvailability(item.id, available),
    onMutate: ({ item }) => setPendingAvailabilityId(item.id),
    onSuccess: (_data, { item, available }) => {
      toast.success(
        `${item.name} ${t("is now")} ${t(available ? "available" : "sold out")}.`
      );
      void queryClient.invalidateQueries({ queryKey: ["staff", "menu"] });
    },
    onError: (error: Error) => toast.error(t(error.message)),
    onSettled: () => setPendingAvailabilityId(null),
  });

  const saveMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id?: string;
      payload: MenuItemPayload;
    }) =>
      id ? api.updateMenuItem(id, payload) : api.createMenuItem(payload),
    onSuccess: (_data, variables) => {
      toast.success(
        t(variables.id ? "Menu item updated." : "Menu item added.")
      );
      setFormOpen(false);
      setEditingItem(null);
      setFormCategoryId(null);
      void queryClient.invalidateQueries({ queryKey: ["staff", "menu"] });
      void queryClient.invalidateQueries({ queryKey: ["table-menu"] });
    },
    onError: (error: Error) => toast.error(t(error.message)),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => api.createCategory({ name }),
    onSuccess: () => {
      toast.success(t("Category added."));
      setCategoryFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["staff", "menu"] });
      void queryClient.invalidateQueries({ queryKey: ["table-menu"] });
    },
    onError: (error: Error) => toast.error(t(error.message)),
  });

  const deleteMutation = useMutation({
    mutationFn: (item: MenuItem) => api.deleteMenuItem(item.id),
    onSuccess: (_data, item) => {
      toast.success(`${item.name} ${t("was deleted.")}`);
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["staff", "menu"] });
      void queryClient.invalidateQueries({ queryKey: ["table-menu"] });
    },
    onError: (error: Error) => toast.error(t(error.message)),
  });

  const menu = menuQuery.data;
  const currency = menu?.pricing.currency ?? "SYP";
  const allItems = menu?.categories.flatMap((category) => category.items) ?? [];
  const availableCount = allItems.filter((item) => item.available).length;

  const categories = useMemo(() => {
    if (!menu) return [];
    const term = search.trim().toLowerCase();
    return menu.categories
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) =>
            !term ||
            item.name.toLowerCase().includes(term) ||
            item.description?.toLowerCase().includes(term)
        ),
      }))
      .filter((category) => !term || category.items.length > 0);
  }, [menu, search]);

  const openCreate = (categoryId?: string) => {
    saveMutation.reset();
    setEditingItem(null);
    setFormCategoryId(categoryId ?? null);
    setFormOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    saveMutation.reset();
    setEditingItem(item);
    setFormCategoryId(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saveMutation.isPending) return;
    setFormOpen(false);
    setEditingItem(null);
    setFormCategoryId(null);
  };

  const openCategoryForm = () => {
    createCategoryMutation.reset();
    setCategoryFormOpen(true);
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">{t("Admin")}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-espresso-900 sm:text-4xl">
            {t("Menu management")}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-espresso-500">
            {t(
              "Add new items, update prices, or remove dishes. Changes appear on the guest menu immediately."
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCategoryForm}
            className="btn-secondary btn-sm"
            disabled={!menu}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("Add category")}
          </button>
          <button
            type="button"
            onClick={() => openCreate()}
            className="btn-primary btn-sm"
            disabled={!menu || menu.categories.length === 0}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("Add item")}
          </button>
          <button
            type="button"
            onClick={() => void menuQuery.refetch()}
            className="btn-secondary btn-sm"
            disabled={menuQuery.isFetching}
            aria-label={t("Refresh")}
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                menuQuery.isFetching && "animate-spin"
              )}
            />
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso-300" />
          <input
            type="search"
            className="input h-11 pl-11"
            placeholder={t("Search menu items…")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={t("Search menu items")}
          />
        </div>
        <div className="flex gap-2">
          <span className="rounded-full border border-sage-400/30 bg-sage-50 px-3.5 py-2 text-xs font-semibold text-sage-600">
            {availableCount} {t("available")}
          </span>
          <span className="rounded-full border border-espresso-900/10 bg-white/70 px-3.5 py-2 text-xs font-semibold text-espresso-500">
            {allItems.length - availableCount} {t("sold out")}
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {menuQuery.isLoading ? (
          <>
            <Skeleton className="h-72 w-full rounded-3xl" />
            <Skeleton className="h-72 w-full rounded-3xl" />
          </>
        ) : menuQuery.isError ? (
          <EmptyState
            icon={<RefreshCw className="h-5 w-5" />}
            title={t("Couldn't load the menu")}
            description={
              menuQuery.error instanceof Error
                ? menuQuery.error.message
                : "Check your connection and try again."
            }
            action={
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void menuQuery.refetch()}
              >
                {t("Try again")}
              </button>
            }
          />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed className="h-5 w-5" />}
            title={t(
              !search.trim() && menu?.categories.length === 0
                ? "No categories yet"
                : "No matching menu items"
            )}
            description={t(
              !search.trim() && menu?.categories.length === 0
                ? "Create a category before adding menu items."
                : "Try a different search term."
            )}
            action={
              !search.trim() && menu?.categories.length === 0 ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={openCategoryForm}
                >
                  <Plus className="h-4 w-4" />
                  {t("Add category")}
                </button>
              ) : undefined
            }
          />
        ) : (
          categories.map((category) => (
            <section
              key={category.id}
              className="overflow-hidden rounded-3xl border border-espresso-900/[0.07] bg-white/70 shadow-soft"
            >
              <div className="flex items-center justify-between gap-3 border-b border-espresso-900/[0.06] px-4 py-3.5 sm:px-5">
                <div>
                  <h2 className="font-display text-lg font-semibold text-espresso-900">
                    {category.name}
                  </h2>
                  <p className="text-xs text-espresso-300">
                    {category.items.length}{" "}
                    {t(category.items.length === 1 ? "item" : "items")}
                  </p>
                </div>
                <span className="rounded-full bg-cream-100 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-espresso-500">
                  {category.items.filter((item) => item.available).length}{" "}
                  {t("available")}
                </span>
              </div>

              <div className="divide-y divide-espresso-900/[0.06]">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5"
                  >
                    <ImageWithFallback
                      src={item.imageUrl}
                      alt={item.name}
                      className={cn(
                        "h-12 w-12 shrink-0 rounded-xl",
                        !item.available && "grayscale"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-semibold",
                          item.available
                            ? "text-espresso-900"
                            : "text-espresso-300 line-through"
                        )}
                      >
                        {item.name}
                        {item.featured ? (
                          <span className="ms-2 rounded-full bg-gold-100 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-gold-500">
                            {t("Featured")}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-espresso-300">
                        {item.description || t("No description yet.")}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-espresso-700">
                      {formatMoney(item.priceCents, currency)}
                    </span>
                    <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:ms-0">
                      <span
                        className={cn(
                          "hidden text-[0.6rem] font-bold uppercase tracking-wider md:block",
                          item.available ? "text-sage-600" : "text-espresso-300"
                        )}
                      >
                        {t(item.available ? "Available" : "Sold out")}
                      </span>
                      <Switch
                        checked={item.available}
                        disabled={pendingAvailabilityId === item.id}
                        label={`${t("Toggle availability for")} ${item.name}`}
                        onChange={(available) =>
                          availabilityMutation.mutate({ item, available })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="grid h-9 w-9 place-items-center rounded-full border border-espresso-900/10 bg-white/70 text-espresso-500 transition hover:border-espresso-900/20 hover:text-espresso-900"
                        aria-label={`${t("Edit")} ${item.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="grid h-9 w-9 place-items-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:border-red-300 hover:bg-red-100"
                        aria-label={`${t("Delete")} ${item.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {category.items.length === 0 ? (
                  <div className="flex flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <p className="text-sm text-espresso-400">
                      {t("No items in this category yet.")}
                    </p>
                    <button
                      type="button"
                      onClick={() => openCreate(category.id)}
                      className="btn-secondary btn-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t("Add item")}
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          ))
        )}
      </div>

      {formOpen ? (
        <MenuItemFormModal
          key={editingItem?.id ?? formCategoryId ?? "new"}
          open={formOpen}
          item={editingItem}
          categories={menu?.categories ?? []}
          defaultCategoryId={formCategoryId}
          currency={currency}
          loading={saveMutation.isPending}
          error={
            saveMutation.error instanceof Error
              ? saveMutation.error.message
              : undefined
          }
          onClose={closeForm}
          onSubmit={(payload) =>
            saveMutation.mutate({ id: editingItem?.id, payload })
          }
        />
      ) : null}

      <CategoryFormModal
        open={categoryFormOpen}
        loading={createCategoryMutation.isPending}
        error={
          createCategoryMutation.error instanceof Error
            ? createCategoryMutation.error.message
            : undefined
        }
        onClose={() => {
          if (!createCategoryMutation.isPending) setCategoryFormOpen(false);
        }}
        onSubmit={(name) => createCategoryMutation.mutate(name)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null);
        }}
        title={t("Delete menu item?")}
        description={
          deleteTarget
            ? `${deleteTarget.name} — ${t(
                "This cannot be undone. Existing orders keep their recorded item details."
              )}`
            : undefined
        }
        confirmLabel={t("Delete item")}
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
      />
    </div>
  );
}

function CategoryFormModal({
  open,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const { translate: t } = useLocalization();
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName) onSubmit(trimmedName);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add category"
      description="Create a category for organizing menu items."
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
            form="menu-category-form"
            className="btn-primary flex-1"
            disabled={loading}
          >
            {loading ? <Spinner /> : null}
            {t("Create category")}
          </button>
        </div>
      }
    >
      <form
        id="menu-category-form"
        onSubmit={handleSubmit}
        className="space-y-4 px-5 py-5 sm:px-6"
      >
        <div>
          <label className="label" htmlFor="menu-category-name">
            {t("Category name")}
          </label>
          <input
            id="menu-category-name"
            className="input"
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("e.g. Seasonal specials")}
          />
        </div>
        {error ? (
          <p
            role="alert"
            className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
          >
            {t(error)}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

function MenuItemFormModal({
  open,
  item,
  categories,
  defaultCategoryId,
  currency,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  item: MenuItem | null;
  categories: Category[];
  defaultCategoryId: string | null;
  currency: string;
  loading: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (payload: MenuItemPayload) => void;
}) {
  const { translate: t } = useLocalization();
  const [form, setForm] = useState(() => ({
    name: item?.name ?? "",
    categoryId: item?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? "",
    description: item?.description ?? "",
    imageUrl: item?.imageUrl ?? "",
    imageFile: null as File | null,
    price: item ? (item.priceCents / 100).toFixed(2) : "",
    available: item?.available ?? true,
    featured: item?.featured ?? false,
  }));
  const [localError, setLocalError] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!form.imageFile) {
      setImagePreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(form.imageFile);
    setImagePreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [form.imageFile]);

  const update = <Key extends keyof typeof form>(
    key: Key,
    value: (typeof form)[Key]
  ) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setLocalError("");

    if (!form.name.trim()) {
      setLocalError(t("Give this item a name."));
      return;
    }

    if (!form.categoryId) {
      setLocalError(t("Choose a category."));
      return;
    }

    const price = Number(form.price);
    if (!form.price.trim() || !Number.isFinite(price) || price < 0) {
      setLocalError(t("Enter a valid price."));
      return;
    }

    onSubmit({
      categoryId: form.categoryId,
      name: form.name.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      imageFile: form.imageFile,
      priceCents: Math.round(price * 100),
      available: form.available,
      featured: form.featured,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? "Edit menu item" : "New menu item"}
      description={
        item
          ? "Update the details or price shown to guests."
          : "Add a dish or drink to the guest menu."
      }
      size="lg"
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
            form="menu-item-form"
            className="btn-primary flex-1"
            disabled={loading}
          >
            {loading ? <Spinner /> : null}
            {item ? t("Save changes") : t("Add item")}
          </button>
        </div>
      }
    >
      <form
        id="menu-item-form"
        onSubmit={handleSubmit}
        className="space-y-4 px-5 py-5 sm:px-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="menu-item-name">
              {t("Name")}
            </label>
            <input
              id="menu-item-name"
              className="input"
              required
              maxLength={120}
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder={t("e.g. Iced Vanilla Latte")}
            />
          </div>
          <div>
            <label className="label" htmlFor="menu-item-category">
              {t("Category")}
            </label>
            <select
              id="menu-item-category"
              className="input"
              required
              value={form.categoryId}
              onChange={(event) => update("categoryId", event.target.value)}
            >
              <option value="" disabled>
                {t("Choose a category")}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="menu-item-description">
            {t("Description")}
          </label>
          <textarea
            id="menu-item-description"
            className="input min-h-24 resize-y"
            maxLength={500}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder={t("What makes this item special?")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="menu-item-price">
              {t("Price")} ({currency})
            </label>
            <input
              id="menu-item-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              required
              className="input"
              value={form.price}
              onChange={(event) => update("price", event.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="label" htmlFor="menu-item-image">
              {t("Menu item image")}
            </label>
            <input
              id="menu-item-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="input"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setLocalError("");
                if (
                  file &&
                  !["image/jpeg", "image/png", "image/webp"].includes(file.type)
                ) {
                  setLocalError(t("Choose a JPEG, PNG, or WebP image."));
                  event.target.value = "";
                  return;
                }
                if (file && file.size > 5 * 1024 * 1024) {
                  setLocalError(t("Images must be 5 MB or smaller."));
                  event.target.value = "";
                  return;
                }
                update("imageFile", file);
              }}
            />
            <p className="mt-1.5 text-xs text-espresso-300">
              {t("Choose a JPEG, PNG, or WebP image. Maximum size: 5 MB.")}
            </p>
            {imagePreviewUrl || form.imageUrl ? (
              <ImageWithFallback
                src={imagePreviewUrl ?? form.imageUrl}
                alt={form.name || t("Menu item image")}
                className="mt-3 h-24 w-24 rounded-2xl"
              />
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-espresso-900/[0.07] bg-white/60 p-4 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-espresso-900">
                {t("Available on the menu")}
              </p>
              <p className="mt-0.5 text-xs text-espresso-300">
                {t("Guests can order this item now.")}
              </p>
            </div>
            <Switch
              checked={form.available}
              label={t("Available on the menu")}
              onChange={(available) => update("available", available)}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-espresso-900">
                {t("Featured item")}
              </p>
              <p className="mt-0.5 text-xs text-espresso-300">
                {t("Highlight this item on the guest menu.")}
              </p>
            </div>
            <Switch
              checked={form.featured}
              label={t("Featured item")}
              onChange={(featured) => update("featured", featured)}
            />
          </div>
        </div>

        {localError || error ? (
          <p
            role="alert"
            className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
          >
            {localError || error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
