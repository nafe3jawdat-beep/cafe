import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartLine, MenuItem, Pricing } from "../types";

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  subtotalCents: number;
  taxCents: number;
  serviceChargeCents: number;
  totalCents: number;
  addItem: (item: MenuItem, quantity: number, notes?: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  updateNotes: (lineId: string, notes: string) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `line-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function CartProvider({
  tableNumber,
  pricing,
  children,
}: {
  tableNumber: number;
  pricing: Pricing;
  children: ReactNode;
}) {
  const storageKey = `cafe-qr-cart-${tableNumber}`;
  const [lines, setLines] = useState<CartLine[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CartLine[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(lines));
    } catch {
      // Storage can be unavailable in private browsing; the cart still works in-memory.
    }
  }, [lines, storageKey]);

  const addItem = useCallback(
    (item: MenuItem, quantity: number, notes = "") => {
      const cleanNotes = notes.trim();
      setLines((current) => {
        const existing = current.find(
          (line) =>
            line.menuItemId === item.id && line.notes === cleanNotes
        );
        if (existing) {
          return current.map((line) =>
            line.id === existing.id
              ? { ...line, quantity: Math.min(20, line.quantity + quantity) }
              : line
          );
        }
        return [
          ...current,
          {
            id: makeId(),
            menuItemId: item.id,
            name: item.name,
            priceCents: item.priceCents,
            imageUrl: item.imageUrl,
            quantity,
            notes: cleanNotes,
          },
        ];
      });
    },
    []
  );

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.id !== lineId)
        : current.map((line) =>
            line.id === lineId
              ? { ...line, quantity: Math.min(20, quantity) }
              : line
          )
    );
  }, []);

  const updateNotes = useCallback((lineId: string, notes: string) => {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId ? { ...line, notes: notes.trim() } : line
      )
    );
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setLines((current) => current.filter((line) => line.id !== lineId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const totals = useMemo(() => {
    const subtotalCents = lines.reduce(
      (sum, line) => sum + line.priceCents * line.quantity,
      0
    );
    const taxCents = Math.round(subtotalCents * pricing.taxRate);
    const serviceChargeCents = Math.round(
      subtotalCents * pricing.serviceChargeRate
    );
    return {
      subtotalCents,
      taxCents,
      serviceChargeCents,
      totalCents: subtotalCents + taxCents + serviceChargeCents,
    };
  }, [lines, pricing]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      ...totals,
      addItem,
      updateQuantity,
      updateNotes,
      removeLine,
      clear,
    }),
    [
      lines,
      totals,
      addItem,
      updateQuantity,
      updateNotes,
      removeLine,
      clear,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
