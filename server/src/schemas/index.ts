import { z } from "zod";

export const tableNumberParamsSchema = z.object({
  number: z.coerce.number().int().positive().max(100000),
});

export const createTableSchema = z.object({
  number: z.coerce.number().int().positive().max(100000),
  name: z.string().trim().max(80).optional().or(z.literal("")),
});

export const tableKeyQuerySchema = z.object({
  key: z.string().min(1).max(200).optional(),
});

export const tableReferenceSchema = z.object({
  tableNumber: z.coerce.number().int().positive().max(100000),
  tableKey: z.string().min(1).max(200).optional(),
});

export const orderItemInputSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20),
  notes: z.string().trim().max(160).optional().or(z.literal("")),
});

export const createOrderSchema = tableReferenceSchema.extend({
  clientRequestId: z.string().uuid(),
  customerName: z.string().trim().max(80).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  items: z.array(orderItemInputSchema).min(1).max(50),
});

export const createCallSchema = tableReferenceSchema.extend({
  type: z.enum(["WAITER", "WATER", "CLEAN_TABLE", "OTHER"]),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

export const requestBillSchema = tableReferenceSchema;

export const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "PREPARING",
    "READY",
    "DELIVERED",
    "CANCELLED",
  ]),
});

export const updateCallSchema = z.object({
  status: z.enum(["ACKNOWLEDGED", "RESOLVED"]),
});

export const updateAvailabilitySchema = z.object({
  available: z.boolean(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
});

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((value) => {
    const parsedDate = new Date(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(parsedDate.getTime()) &&
      parsedDate.toISOString().slice(0, 10) === value
    );
  }, "Use a valid date.");

export const financialReportQuerySchema = z
  .object({
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
  })
  .refine((range) => range.startDate <= range.endDate, {
    message: "Start date must be on or before end date.",
    path: ["startDate"],
  });

export const createExpenseSchema = z.object({
  date: dateOnlySchema,
  description: z.string().trim().min(1).max(200),
  amountCents: z.coerce.number().int().positive().max(100_000_000),
});

const menuItemSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and hyphens only."
  );

const menuItemImageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (
      /^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(
        value
      )
    ) {
      return true;
    }

    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return value === "";
    }
  }, "Enter a valid image URL.");

const menuItemFields = {
  categoryId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  imageUrl: menuItemImageUrlSchema.optional(),
  priceCents: z.coerce.number().int().min(0).max(1_000_000),
  available: z.boolean().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
  slug: menuItemSlugSchema.optional(),
};

export const createMenuItemSchema = z.object(menuItemFields);

export const updateMenuItemSchema = z
  .object(menuItemFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const staffOrdersQuerySchema = z.object({
  scope: z.enum(["active", "today", "all"]).default("active"),
});

export const staffCallsQuerySchema = z.object({
  scope: z.enum(["open", "all"]).default("open"),
});

export const staffBillsQuerySchema = z.object({
  scope: z.enum(["open", "all"]).default("open"),
});
