import type {
  Bill,
  CafeSettings,
  CafeSettingsPayload,
  CartLine,
  Category,
  FinancialExpense,
  FinancialReport,
  MenuResponse,
  Order,
  OrderStatus,
  StaffCall,
  StaffMenuResponse,
  StaffStats,
  StaffUser,
  TableSession,
  TableSummary,
} from "../types";
import { API_BASE, IS_DEV } from "./config";

// Render free instances can take about a minute to wake up after being idle.
const REQUEST_TIMEOUT_MS = 60_000;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Development-only logging. Request bodies are never logged (they can hold passwords),
// and /auth/ responses are logged without their payload.
function logResponse(
  method: string,
  path: string,
  status: number | string,
  startedAt: number,
  data?: unknown
) {
  if (!IS_DEV) return;
  const ms = Math.round(performance.now() - startedAt);
  const label = `[api] ← ${status} ${method} ${path} (${ms}ms)`;
  if (data === undefined || path.startsWith("/auth/")) {
    console.debug(label);
  } else {
    console.debug(label, data);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("content-type")
  ) {
    headers.set("content-type", "application/json");
  }

  const controller = new AbortController();
  let timedOut = false;
  options.signal?.addEventListener("abort", () => controller.abort(), {
    once: true,
  });
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const startedAt = performance.now();
  if (IS_DEV) console.debug(`[api] → ${method} ${API_BASE}${path}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (cause) {
    logResponse(method, path, timedOut ? "TIMEOUT" : "NETWORK_ERROR", startedAt);
    if (
      cause instanceof DOMException &&
      cause.name === "AbortError" &&
      !timedOut
    ) {
      throw cause;
    }
    throw new ApiError(
      0,
      timedOut ? "REQUEST_TIMEOUT" : "NETWORK_ERROR",
      timedOut
        ? "The server took too long to respond. Please try again."
        : "Cannot reach the server. Check your connection and try again."
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (response.status === 204) {
    logResponse(method, path, 204, startedAt);
    return undefined as T;
  }

  const data = await response.json().catch(() => null);
  logResponse(method, path, response.status, startedAt, data);

  if (!response.ok) {
    const error = data?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "REQUEST_FAILED",
      error?.message ?? "The request could not be completed.",
      error?.details
    );
  }

  if (data === null) {
    // A 2xx that is not JSON usually means the request hit the static host (HTML)
    // instead of the API, i.e. VITE_API_URL is wrong or missing in this build.
    throw new ApiError(
      response.status,
      "INVALID_RESPONSE",
      "The server returned an unexpected response."
    );
  }

  return data as T;
}

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const value = search.toString();
  return value ? `?${value}` : "";
};

export interface CreateOrderPayload {
  tableNumber: number;
  tableKey?: string;
  lat?: number;
  lng?: number;
  clientRequestId: string;
  customerName?: string;
  note?: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    notes?: string;
  }>;
}

export interface MenuItemPayload {
  categoryId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  imageFile?: File | null;
  priceCents: number;
  available?: boolean;
  featured?: boolean;
  sortOrder?: number;
  slug?: string;
}

export interface CreateCategoryPayload {
  name: string;
}

function menuItemFormData(payload: Partial<MenuItemPayload>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (key === "imageFile") {
      if (value instanceof File) formData.append("image", value);
    } else if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }
  return formData;
}

export const api = {
  getMenu(
    tableNumber: number,
    tableKey?: string,
    location?: { lat: number; lng: number }
  ) {
    return request<MenuResponse>(
      `/public/tables/${tableNumber}/menu${query({
        key: tableKey,
        lat: location?.lat,
        lng: location?.lng,
      })}`
    );
  },

  getTableSession(tableNumber: number, tableKey?: string) {
    return request<TableSession>(
      `/public/tables/${tableNumber}/session${query({ key: tableKey })}`
    );
  },

  createOrder(payload: CreateOrderPayload) {
    return request<{ order: Order }>("/public/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  createCall(payload: {
    tableNumber: number;
    tableKey?: string;
    lat?: number;
    lng?: number;
    type: "WAITER" | "WATER" | "CLEAN_TABLE" | "OTHER";
    note?: string;
  }) {
    return request<{ call: StaffCall }>("/public/calls", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  requestBill(payload: {
    tableNumber: number;
    tableKey?: string;
    lat?: number;
    lng?: number;
  }) {
    return request<{ bill: Bill }>("/public/bills", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  login(email: string, password: string) {
    return request<{ user: StaffUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  me() {
    return request<{ user: StaffUser }>("/auth/me");
  },

  logout() {
    return request<void>("/auth/logout", { method: "POST" });
  },

  staffStats() {
    return request<StaffStats>("/staff/stats");
  },

  staffSettings() {
    return request<{ settings: CafeSettings }>("/staff/settings");
  },

  updateStaffSettings(payload: CafeSettingsPayload) {
    return request<{ settings: CafeSettings }>("/staff/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  staffOrders(scope: "active" | "today" | "all" = "active") {
    return request<{ orders: Order[] }>(
      `/staff/orders${query({ scope })}`
    );
  },

  updateOrderStatus(id: string, status: OrderStatus) {
    return request<{ order: Order }>(`/staff/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  staffCalls(scope: "open" | "all" = "open") {
    return request<{ calls: StaffCall[] }>(
      `/staff/calls${query({ scope })}`
    );
  },

  updateCall(id: string, status: "ACKNOWLEDGED" | "RESOLVED") {
    return request<{ call: StaffCall }>(`/staff/calls/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  staffBills(scope: "open" | "all" = "open") {
    return request<{ bills: Bill[] }>(
      `/staff/bills${query({ scope })}`
    );
  },

  settleBill(id: string) {
    return request<{ bill: Bill }>(`/staff/bills/${id}/settle`, {
      method: "PATCH",
    });
  },

  staffMenu() {
    return request<StaffMenuResponse>("/staff/menu");
  },

  staffFinancialReport(startDate: string, endDate: string) {
    const params = new URLSearchParams({ startDate, endDate });
    return request<FinancialReport>(`/staff/finance?${params.toString()}`);
  },

  createExpense(payload: {
    date: string;
    description: string;
    amountCents: number;
  }) {
    return request<{ expense: FinancialExpense }>("/staff/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteExpense(id: string) {
    return request<void>(`/staff/expenses/${id}`, {
      method: "DELETE",
    });
  },

  createCategory(payload: CreateCategoryPayload) {
    return request<{ category: Category }>(
      "/staff/menu/categories",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  createMenuItem(payload: MenuItemPayload) {
    return request<{ item: unknown }>("/staff/menu/items", {
      method: "POST",
      body: menuItemFormData(payload),
    });
  },

  updateMenuItem(id: string, payload: Partial<MenuItemPayload>) {
    return request<{ item: unknown }>(`/staff/menu/items/${id}`, {
      method: "PATCH",
      body: menuItemFormData(payload),
    });
  },

  deleteMenuItem(id: string) {
    return request<void>(`/staff/menu/items/${id}`, {
      method: "DELETE",
    });
  },

  updateAvailability(id: string, available: boolean) {
    return request<{ item: unknown }>(
      `/staff/menu/items/${id}/availability`,
      {
        method: "PATCH",
        body: JSON.stringify({ available }),
      }
    );
  },

  staffTables() {
    return request<{ tables: TableSummary[] }>("/staff/tables");
  },

  createTable(payload: { number: number; name?: string }) {
    return request<{ table: TableSummary }>("/staff/tables", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteTable(id: string) {
    return request<void>(`/staff/tables/${id}`, {
      method: "DELETE",
    });
  },
};

export type { CartLine };
