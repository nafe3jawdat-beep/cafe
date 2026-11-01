export interface ItemSales {
  menuItemId: string | null;
  name: string;
  quantity: number;
  revenueCents: number;
}

const RANKING_LIMIT = 5;

export function rankMenuItems(
  currentItems: Array<{ id: string; name: string }>,
  sales: ItemSales[]
) {
  const grouped = new Map<string, ItemSales>();

  for (const item of currentItems) {
    grouped.set(item.id, {
      menuItemId: item.id,
      name: item.name,
      quantity: 0,
      revenueCents: 0,
    });
  }

  for (const sale of sales) {
    const key = sale.menuItemId ?? `deleted:${sale.name}`;
    const current = grouped.get(key);
    if (current) {
      current.quantity += sale.quantity;
      current.revenueCents += sale.revenueCents;
    } else {
      grouped.set(key, { ...sale });
    }
  }

  const ranked = [...grouped.values()].sort(
    (left, right) =>
      right.quantity - left.quantity ||
      right.revenueCents - left.revenueCents ||
      left.name.localeCompare(right.name)
  );

  return {
    bestSellingItems: ranked
      .filter((item) => item.quantity > 0)
      .slice(0, RANKING_LIMIT),
    leastSellingItems: [...ranked]
      .sort(
        (left, right) =>
          left.quantity - right.quantity ||
          left.revenueCents - right.revenueCents ||
          left.name.localeCompare(right.name)
      )
      .slice(0, RANKING_LIMIT),
  };
}
