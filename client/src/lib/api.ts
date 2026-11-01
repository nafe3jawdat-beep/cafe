import type {
  Bill,
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

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

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

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("content-type")
  ) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = data?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "REQUEST_FAILED",
      error?.message ?? "The request could not be completed.",
      error?.details
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
  getMenu(tableNumber: number, tableKey?: string) {
    return request<MenuResponse>(
      `/api/public/tables/${tableNumber}/menu${query({ key: tableKey })}`
    );
  },

  getTableSession(tableNumber: number, tableKey?: string) {
    return request<TableSession>(
      `/api/public/tables/${tableNumber}/session${query({ key: tableKey })}`
    );
  },

  createOrder(payload: CreateOrderPayload) {
    return request<{ order: Order }>("/api/public/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  createCall(payload: {
    tableNumber: number;
    tableKey?: string;
    type: "WAITER" | "WATER" | "CLEAN_TABLE" | "OTHER";
    note?: string;
  }) {
    return request<{ call: StaffCall }>("/api/public/calls", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  requestBill(payload: { tableNumber: number; tableKey?: string }) {
    return request<{ bill: Bill }>("/api/public/bills", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  login(email: string, password: string) {
    return request<{ user: StaffUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  me() {
    return request<{ user: StaffUser }>("/api/auth/me");
  },

  logout() {
    return request<void>("/api/auth/logout", { method: "POST" });
  },

  staffStats() {
    return request<StaffStats>("/api/staff/stats");
  },

  staffOrders(scope: "active" | "today" | "all" = "active") {
    return request<{ orders: Order[] }>(
      `/api/staff/orders${query({ scope })}`
    );
  },

  updateOrderStatus(id: string, status: OrderStatus) {
    return request<{ order: Order }>(`/api/staff/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  staffCalls(scope: "open" | "all" = "open") {
    return request<{ calls: StaffCall[] }>(
      `/api/staff/calls${query({ scope })}`
    );
  },

  updateCall(id: string, status: "ACKNOWLEDGED" | "RESOLVED") {
    return request<{ call: StaffCall }>(`/api/staff/calls/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  staffBills(scope: "open" | "all" = "open") {
    return request<{ bills: Bill[] }>(
      `/api/staff/bills${query({ scope })}`
    );
  },

  settleBill(id: string) {
    return request<{ bill: Bill }>(`/api/staff/bills/${id}/settle`, {
      method: "PATCH",
    });
  },

  staffMenu() {
    return request<StaffMenuResponse>("/api/staff/menu");
  },

  staffFinancialReport(startDate: string, endDate: string) {
    const params = new URLSearchParams({ startDate, endDate });
    return request<FinancialReport>(`/api/staff/finance?${params.toString()}`);
  },

  createExpense(payload: {
    date: string;
    description: string;
    amountCents: number;
  }) {
    return request<{ expense: FinancialExpense }>("/api/staff/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteExpense(id: string) {
    return request<void>(`/api/staff/expenses/${id}`, {
      method: "DELETE",
    });
  },

  createCategory(payload: CreateCategoryPayload) {
    return request<{ category: Category }>(
      "/api/staff/menu/categories",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  createMenuItem(payload: MenuItemPayload) {
    return request<{ item: unknown }>("/api/staff/menu/items", {
      method: "POST",
      body: menuItemFormData(payload),
    });
  },

  updateMenuItem(id: string, payload: Partial<MenuItemPayload>) {
    return request<{ item: unknown }>(`/api/staff/menu/items/${id}`, {
      method: "PATCH",
      body: menuItemFormData(payload),
    });
  },

  deleteMenuItem(id: string) {
    return request<void>(`/api/staff/menu/items/${id}`, {
      method: "DELETE",
    });
  },

  updateAvailability(id: string, available: boolean) {
    return request<{ item: unknown }>(
      `/api/staff/menu/items/${id}/availability`,
      {
        method: "PATCH",
        body: JSON.stringify({ available }),
      }
    );
  },

  staffTables() {
    return request<{ tables: TableSummary[] }>("/api/staff/tables");
  },

  createTable(payload: { number: number; name?: string }) {
    return request<{ table: TableSummary }>("/api/staff/tables", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteTable(id: string) {
    return request<void>(`/api/staff/tables/${id}`, {
      method: "DELETE",
    });
  },
};

export type { CartLine };
