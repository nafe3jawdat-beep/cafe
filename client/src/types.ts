export type Role = "ADMIN";

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface PublicTable {
  id: string;
  number: number;
  name: string | null;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  available: boolean;
  featured: boolean;
  sortOrder: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
  items: MenuItem[];
}

export interface Pricing {
  currency: string;
  taxRate: number;
  serviceChargeRate: number;
}

export interface MenuResponse {
  table: PublicTable;
  categories: Category[];
  pricing: Pricing;
}

export type OrderStatus =
  | "PENDING"
  | "PREPARING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string | null;
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes: string | null;
  lineTotalCents: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  clientRequestId: string | null;
  tableId: string;
  table: PublicTable;
  status: OrderStatus;
  subtotalCents: number;
  taxCents: number;
  serviceChargeCents: number;
  totalCents: number;
  note: string | null;
  customerName: string | null;
  billId: string | null;
  bill: { id: string; status: string; totalCents: number } | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export type CallType = "WAITER" | "WATER" | "CLEAN_TABLE" | "OTHER";
export type CallStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export interface StaffCall {
  id: string;
  tableId: string;
  table: PublicTable;
  type: CallType;
  status: CallStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  resolvedById: string | null;
  resolvedBy: { id: string; name: string } | null;
}

export type BillStatus = "OPEN" | "SETTLED" | "CANCELLED";

export interface Bill {
  id: string;
  tableId: string;
  table: PublicTable;
  status: BillStatus;
  subtotalCents: number;
  taxCents: number;
  serviceChargeCents: number;
  totalCents: number;
  requestedAt: string;
  updatedAt: string;
  settledAt: string | null;
  settledById: string | null;
  settledBy: { id: string; name: string } | null;
  orders: Array<{
    id: string;
    orderNumber: number;
    status: OrderStatus;
    totalCents: number;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      unitPriceCents: number;
      lineTotalCents: number;
      notes: string | null;
    }>;
  }>;
}

export interface TableSession {
  table: PublicTable;
  orders: Order[];
  openBill: Bill | null;
  calls: StaffCall[];
  pricing: Pricing;
}

export interface TableSummary extends PublicTable {
  qrToken: string;
  active: boolean;
  activeOrderCount: number;
  pendingCount: number;
  openBill: { tableId: string; totalCents: number } | null;
}

export interface StaffStats {
  revenueTodayCents: number;
  ordersToday: number;
  activeOrders: number;
  openCalls: number;
  occupiedTables: number;
  openBills: number;
  currency: string;
}

export interface FinancialExpense {
  id: string;
  date: string;
  description: string;
  amountCents: number;
  createdAt: string;
}

export interface FinancialItemRanking {
  menuItemId: string | null;
  name: string;
  quantity: number;
  revenueCents: number;
}

export interface FinancialReport {
  startDate: string;
  endDate: string;
  currency: string;
  revenueCents: number;
  expenseCents: number;
  profitCents: number;
  deliveredOrders: number;
  bestSellingItems: FinancialItemRanking[];
  leastSellingItems: FinancialItemRanking[];
  expenses: FinancialExpense[];
}

export interface StaffMenuResponse {
  categories: Category[];
  pricing: Pricing;
}

export interface CartLine {
  id: string;
  menuItemId: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  quantity: number;
  notes: string;
}
