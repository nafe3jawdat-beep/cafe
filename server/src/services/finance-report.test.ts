import { describe, expect, it } from "vitest";
import { rankMenuItems } from "./finance-report";

describe("rankMenuItems", () => {
  it("ranks by quantity and includes unsold current menu items at the bottom", () => {
    const result = rankMenuItems(
      [
        { id: "coffee", name: "Coffee" },
        { id: "tea", name: "Tea" },
        { id: "cake", name: "Cake" },
      ],
      [
        {
          menuItemId: "coffee",
          name: "Coffee",
          quantity: 3,
          revenueCents: 900,
        },
        {
          menuItemId: "tea",
          name: "Tea",
          quantity: 8,
          revenueCents: 800,
        },
      ]
    );

    expect(result.bestSellingItems.map((item) => item.name)).toEqual([
      "Tea",
      "Coffee",
    ]);
    expect(result.leastSellingItems.map((item) => item.name)).toEqual([
      "Cake",
      "Coffee",
      "Tea",
    ]);
    expect(result.leastSellingItems[0]?.quantity).toBe(0);
  });

  it("combines sales for the same item and keeps deleted-item snapshots", () => {
    const result = rankMenuItems(
      [{ id: "coffee", name: "Coffee" }],
      [
        {
          menuItemId: "coffee",
          name: "Old Coffee Name",
          quantity: 2,
          revenueCents: 500,
        },
        {
          menuItemId: "coffee",
          name: "Coffee",
          quantity: 1,
          revenueCents: 250,
        },
        {
          menuItemId: null,
          name: "Retired Cake",
          quantity: 4,
          revenueCents: 1000,
        },
      ]
    );

    expect(result.bestSellingItems).toEqual([
      {
        menuItemId: null,
        name: "Retired Cake",
        quantity: 4,
        revenueCents: 1000,
      },
      {
        menuItemId: "coffee",
        name: "Coffee",
        quantity: 3,
        revenueCents: 750,
      },
    ]);
  });

  it("limits both rankings to five entries", () => {
    const items = Array.from({ length: 7 }, (_, index) => ({
      id: `item-${index}`,
      name: `Item ${index}`,
    }));
    const sales = items.map((item, index) => ({
      menuItemId: item.id,
      name: item.name,
      quantity: index + 1,
      revenueCents: (index + 1) * 100,
    }));

    const result = rankMenuItems(items, sales);

    expect(result.bestSellingItems).toHaveLength(5);
    expect(result.leastSellingItems).toHaveLength(5);
  });
});
