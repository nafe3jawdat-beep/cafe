import { describe, expect, it } from "vitest";
import { createCategorySchema } from "./index";

describe("createCategorySchema", () => {
  it("trims and accepts a category name", () => {
    expect(createCategorySchema.parse({ name: "  Seasonal Drinks  " })).toEqual({
      name: "Seasonal Drinks",
    });
  });

  it.each(["", "   "])("rejects an empty category name", (name) => {
    expect(() => createCategorySchema.parse({ name })).toThrow();
  });

  it("rejects names longer than 80 characters", () => {
    expect(() =>
      createCategorySchema.parse({ name: "a".repeat(81) })
    ).toThrow();
  });
});
