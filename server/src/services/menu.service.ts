import type { Prisma } from "@prisma/client";
import { env } from "../config/env";
import { badRequest, conflict, notFound } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { publicTable } from "./table.service";

export async function getPublicMenu(table: {
  id: string;
  number: number;
  name: string | null;
}) {
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });

  return {
    table: publicTable(table),
    categories: categories.filter((category) => category.items.length > 0),
    pricing: {
      currency: env.CURRENCY,
      taxRate: env.TAX_RATE,
      serviceChargeRate: env.SERVICE_CHARGE_RATE,
    },
  };
}

export async function getStaffMenu() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });

  return {
    categories,
    pricing: {
      currency: env.CURRENCY,
      taxRate: env.TAX_RATE,
      serviceChargeRate: env.SERVICE_CHARGE_RATE,
    },
  };
}

export async function setMenuItemAvailability(
  itemId: string,
  available: boolean
) {
  return prisma.menuItem.update({
    where: { id: itemId },
    data: { available },
  });
}

export interface CreateMenuItemInput {
  categoryId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  priceCents: number;
  available?: boolean;
  featured?: boolean;
  sortOrder?: number;
  slug?: string;
}

export type UpdateMenuItemInput = Partial<CreateMenuItemInput>;

function slugify(value: string, fallback = "menu-item") {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return slug || fallback;
}

export async function createCategory(input: { name: string }) {
  const baseSlug = slugify(input.name, "category");
  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.category.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const aggregate = await prisma.category.aggregate({
    _max: { sortOrder: true },
  });

  return prisma.category.create({
    data: {
      name: input.name.trim(),
      slug,
      sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
    },
  });
}

async function uniqueSlug(base: string) {
  let candidate = base;
  let suffix = 2;

  while (await prisma.menuItem.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function assertCategory(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });

  if (!category) throw badRequest("Choose a valid menu category.");
}

export async function createMenuItem(input: CreateMenuItemInput) {
  await assertCategory(input.categoryId);

  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const aggregate = await prisma.menuItem.aggregate({
      where: { categoryId: input.categoryId },
      _max: { sortOrder: true },
    });
    sortOrder = (aggregate._max.sortOrder ?? -1) + 1;
  }

  let slug: string;
  if (input.slug) {
    const existing = await prisma.menuItem.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (existing) throw conflict("That menu item URL is already in use.");
    slug = input.slug;
  } else {
    slug = await uniqueSlug(slugify(input.name));
  }

  return prisma.menuItem.create({
    data: {
      categoryId: input.categoryId,
      slug,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      priceCents: input.priceCents,
      available: input.available ?? true,
      featured: input.featured ?? false,
      sortOrder,
    },
  });
}

export async function updateMenuItem(
  itemId: string,
  input: UpdateMenuItemInput
) {
  const existing = await prisma.menuItem.findUnique({
    where: { id: itemId },
    select: { id: true, slug: true },
  });
  if (!existing) throw notFound("Menu item not found.");

  if (input.categoryId) await assertCategory(input.categoryId);

  if (input.slug && input.slug !== existing.slug) {
    const duplicate = await prisma.menuItem.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (duplicate) throw conflict("That menu item URL is already in use.");
  }

  const data: Prisma.MenuItemUpdateInput = {};
  if (input.categoryId !== undefined) {
    data.category = { connect: { id: input.categoryId } };
  }
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.description !== undefined) {
    data.description = input.description.trim() || null;
  }
  if (input.imageUrl !== undefined) {
    data.imageUrl = input.imageUrl.trim() || null;
  }
  if (input.priceCents !== undefined) data.priceCents = input.priceCents;
  if (input.available !== undefined) data.available = input.available;
  if (input.featured !== undefined) data.featured = input.featured;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.slug !== undefined) data.slug = input.slug;

  return prisma.menuItem.update({
    where: { id: itemId },
    data,
  });
}

export async function deleteMenuItem(itemId: string) {
  const existing = await prisma.menuItem.findUnique({
    where: { id: itemId },
    select: { id: true, name: true },
  });
  if (!existing) throw notFound("Menu item not found.");

  await prisma.menuItem.delete({ where: { id: itemId } });
  return existing;
}
