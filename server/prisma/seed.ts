import crypto from "node:crypto";
import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { env } from "../src/config/env";

if (process.env.NODE_ENV === "production") {
  console.error("[seed] Refusing to run the development seed in production.");
  process.exit(1);
}

const prisma = new PrismaClient();

const image = (id: string, width = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;

const categories = [
  {
    slug: "hot-drinks",
    name: "Hot Drinks",
    description: "Slow-brewed coffee and warming classics.",
    sortOrder: 1,
    items: [
      {
        slug: "espresso",
        name: "Double Espresso",
        description: "Rich, velvety crema with notes of dark chocolate.",
        priceCents: 350,
        imageUrl: image("photo-1509042239860-f550ce710b93"),
        featured: true,
        sortOrder: 1,
      },
      {
        slug: "cappuccino",
        name: "Cappuccino",
        description: "Silky microfoam, a double shot, and a dusting of cocoa.",
        priceCents: 450,
        imageUrl: image("photo-1572442388796-11668a67e53d"),
        featured: true,
        sortOrder: 2,
      },
      {
        slug: "flat-white",
        name: "Flat White",
        description: "Smooth ristretto and steamed milk in perfect balance.",
        priceCents: 475,
        imageUrl: image("photo-1517701604599-bb29b565090c"),
        sortOrder: 3,
      },
      {
        slug: "moroccan-mint-tea",
        name: "Moroccan Mint Tea",
        description: "Gunpowder green tea, fresh mint, and honey.",
        priceCents: 400,
        imageUrl: image("photo-1544787219-7f47ccb76574"),
        sortOrder: 4,
      },
      {
        slug: "hot-chocolate",
        name: "Belgian Hot Chocolate",
        description: "Dark chocolate, steamed milk, and vanilla cream.",
        priceCents: 425,
        imageUrl: image("photo-1542990253-0d0f5be5f0ed"),
        sortOrder: 5,
      },
    ],
  },
  {
    slug: "cold-drinks",
    name: "Cold Drinks",
    description: "Iced, shaken, and freshly squeezed.",
    sortOrder: 2,
    items: [
      {
        slug: "iced-latte",
        name: "Iced Vanilla Latte",
        description: "Espresso, cold milk, vanilla, and crystal-clear ice.",
        priceCents: 500,
        imageUrl: image("photo-1461023058943-07fcbe16d735"),
        featured: true,
        sortOrder: 1,
      },
      {
        slug: "orange-juice",
        name: "Fresh Orange Juice",
        description: "Squeezed to order. Nothing added.",
        priceCents: 450,
        imageUrl: image("photo-1600271886742-f049cd451bba"),
        sortOrder: 2,
      },
      {
        slug: "berry-lemonade",
        name: "Berry Lemonade",
        description: "House lemonade, raspberry, and a hint of basil.",
        priceCents: 475,
        imageUrl: image("photo-1523677011781-c91d1bbe2f9e"),
        sortOrder: 3,
      },
      {
        slug: "sparkling-water",
        name: "Sparkling Water",
        description: "Chilled sparkling mineral water with lime.",
        priceCents: 300,
        imageUrl: image("photo-1548839140-29a749e1cf4d"),
        sortOrder: 4,
      },
    ],
  },
  {
    slug: "desserts",
    name: "Desserts",
    description: "Made in-house every morning.",
    sortOrder: 3,
    items: [
      {
        slug: "basque-cheesecake",
        name: "Basque Cheesecake",
        description: "Burnt top, creamy centre, and a berry compote.",
        priceCents: 650,
        imageUrl: image("photo-1533134242443-d4fd215305ad"),
        featured: true,
        sortOrder: 1,
      },
      {
        slug: "chocolate-fondant",
        name: "Chocolate Fondant",
        description: "Warm dark chocolate cake with a molten centre.",
        priceCents: 700,
        imageUrl: image("photo-1606313564200-e75d5e30476c"),
        sortOrder: 2,
      },
      {
        slug: "tiramisu",
        name: "Classic Tiramisu",
        description: "Espresso-soaked savoiardi and mascarpone cream.",
        priceCents: 625,
        imageUrl: image("photo-1571877227200-a0d98ea607e9"),
        sortOrder: 3,
      },
      {
        slug: "pistachio-baklava",
        name: "Pistachio Baklava",
        description: "Crisp filo, pistachio, and orange blossom syrup.",
        priceCents: 550,
        imageUrl: image("photo-1519676867240-f03562e64548"),
        sortOrder: 4,
      },
    ],
  },
  {
    slug: "shisha",
    name: "Shisha",
    description: "Prepared by our shisha sommelier. 18+ only.",
    sortOrder: 4,
    items: [
      {
        slug: "mint-fresh",
        name: "Mint Fresh",
        description: "Cool mint, lemon, and a clean finish.",
        priceCents: 1800,
        imageUrl: image("photo-1527661591475-527312dd65f5"),
        featured: true,
        sortOrder: 1,
      },
      {
        slug: "double-apple",
        name: "Double Apple",
        description: "The classic — green apple, anise, and a touch of honey.",
        priceCents: 1800,
        imageUrl: image("photo-1527661591475-527312dd65f5"),
        sortOrder: 2,
      },
      {
        slug: "blue-mist",
        name: "Blue Mist",
        description: "Blueberry, mint, and a soft floral finish.",
        priceCents: 1900,
        imageUrl: image("photo-1527661591475-527312dd65f5"),
        sortOrder: 3,
      },
      {
        slug: "love-66",
        name: "Love 66",
        description: "Melon, mint, and tropical fruit. A house favourite.",
        priceCents: 2000,
        imageUrl: image("photo-1527661591475-527312dd65f5"),
        sortOrder: 4,
      },
    ],
  },
  {
    slug: "food",
    name: "Kitchen",
    description: "Fresh plates for a proper pause.",
    sortOrder: 5,
    items: [
      {
        slug: "avocado-toast",
        name: "Avocado Toast",
        description: "Sourdough, smashed avocado, chilli, and lime.",
        priceCents: 850,
        imageUrl: image("photo-1525351484163-7529414344d8"),
        sortOrder: 1,
      },
      {
        slug: "chicken-club",
        name: "Chicken Club",
        description: "Grilled chicken, smoked bacon, tomato, and aioli.",
        priceCents: 1050,
        imageUrl: image("photo-1528735602780-2552fd46c7af"),
        featured: true,
        sortOrder: 2,
      },
      {
        slug: "halloumi-wrap",
        name: "Halloumi Wrap",
        description: "Grilled halloumi, roasted peppers, and herb yoghurt.",
        priceCents: 925,
        imageUrl: image("photo-1626700051175-6818013e1d4f"),
        sortOrder: 3,
      },
      {
        slug: "truffle-fries",
        name: "Truffle Fries",
        description: "Crispy fries, truffle oil, parmesan, and rosemary.",
        priceCents: 550,
        imageUrl: image("photo-1573080496219-bb080dd4f877"),
        sortOrder: 4,
      },
    ],
  },
];

async function seedUsers() {
  const users: Array<{
    name: string;
    email: string;
    password: string;
    role: Role;
  }> = [
    {
      name: "Café Admin",
      email: env.SEED_ADMIN_EMAIL,
      password: env.SEED_ADMIN_PASSWORD,
      role: "ADMIN",
    },
  ];

  // Remove the demo manager/waiter accounts created by earlier versions of
  // this project. The dashboard is admin-only now.
  await prisma.user.deleteMany({
    where: {
      email: { in: ["manager@cafe.local", "waiter@cafe.local"] },
    },
  });

  for (const user of users) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
    });

    if (existing) {
      continue;
    }

    const passwordHash = await bcrypt.hash(user.password, 12);
    await prisma.user.create({
      data: {
        name: user.name,
        email: user.email.toLowerCase(),
        role: user.role,
        passwordHash,
      },
    });
  }

  return users;
}

async function main() {
  console.log("[seed] Seeding café menu...");

  for (const category of categories) {
    const savedCategory =
      (await prisma.category.findUnique({ where: { slug: category.slug } })) ??
      (await prisma.category.create({
        data: {
          slug: category.slug,
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder,
        },
      }));

    for (const item of category.items) {
      const existingItem = await prisma.menuItem.findUnique({
        where: { slug: item.slug },
      });

      if (!existingItem) {
        await prisma.menuItem.create({
          data: {
            categoryId: savedCategory.id,
            slug: item.slug,
            name: item.name,
            description: item.description,
            priceCents: item.priceCents,
            imageUrl: item.imageUrl,
            featured: item.featured ?? false,
            sortOrder: item.sortOrder,
            available: true,
          },
        });
      }
    }
  }

  const tableNames = [
    "Window",
    "Terrace",
    "Garden",
    "Bar",
    "Lounge",
    "Corner",
  ];

  for (let number = 1; number <= 12; number += 1) {
    const existingTable = await prisma.diningTable.findUnique({
      where: { number },
    });

    if (!existingTable) {
      await prisma.diningTable.create({
        data: {
          number,
          name: tableNames[(number - 1) % tableNames.length],
          qrToken: crypto.randomBytes(24).toString("base64url"),
          active: true,
        },
      });
    }
  }

  const users = await seedUsers();

  // The guest location gate is off by default. Keep any settings an admin
  // already saved when re-running the seed.
  await prisma.cafeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  console.log("[seed] Done.");
  console.log("[seed] Admin account:");
  for (const user of users) {
    console.log(`  ${user.role.padEnd(8)} ${user.email}`);
  }
  console.log("[seed] Tables 1–12 are ready. Open /table/1 to try the guest flow.");
}

main()
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
