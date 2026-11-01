# Café QR Ordering System

A production-ready QR table-ordering system for cafés and restaurants. Guests scan a table QR code to browse the menu, order without an account, call a waiter, and request the bill. The venue owner gets a single authenticated, real-time admin dashboard for orders, service calls, bills, menu management, and table QR codes.

## Highlights

- **Table-bound guest flow** — `/table/:tableNumber?key=<qrToken>` with optional QR-token enforcement.
- **Categorized digital menu** — images, descriptions, prices, availability, featured items, and notes/customizations.
- **Guest cart and checkout** — no account required, server-side price/availability validation, idempotent order submission.
- **Real-time service** — Socket.io rooms for each table and the admin dashboard.
- **Live kitchen pipeline** — `PENDING → PREPARING → READY → DELIVERED`, with admin-only cancellation.
- **Service calls** — waiter, water, clean table, and other requests with acknowledge/resolve workflow.
- **Bill requests and settlement** — bill totals are tied to the table; the admin settles bills from the dashboard.
- **Admin-only dashboard** — live orders, stats, calls, bills, table QR codes, and full menu management.
- **Menu editor** — add items, change prices and descriptions, toggle availability, feature items, and delete items. Changes are pushed to open guest menus in real time.
- **Security baseline** — httpOnly JWT cookies, admin-only access, rate limiting, Helmet CSP, origin guard, input validation, and server-authoritative pricing.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 6, Tailwind CSS 3, TanStack Query, Socket.io Client |
| Backend | Node.js, Express 4, Socket.io, Zod |
| Database | PostgreSQL 16+ with Prisma 6 |
| Auth | httpOnly JWT session cookie, bcrypt password hashes |
| Tooling | npm workspaces, TypeScript, Vitest, Docker Compose |

## Architecture

```text
Guest phone                         Admin browser
    │                                    │
    │ HTTPS / Socket.io                  │ HTTPS / Socket.io
    ▼                                    ▼
┌────────────────────────────────────────────────────┐
│                  React + Vite client                │
│  Guest menu/cart/status      Admin dashboard        │
└──────────────────────┬─────────────────────────────┘
                       │ /api + /socket.io
                       ▼
┌────────────────────────────────────────────────────┐
│                 Express API + Socket.io             │
│  public routes        admin routes       auth       │
│  pricing/order svc    calls/bills svc    JWT cookie │
└──────────────────────┬─────────────────────────────┘
                       │ Prisma
                       ▼
┌────────────────────────────────────────────────────┐
│                     PostgreSQL                     │
│ users, tables, categories, items, orders, calls,   │
│ bills                                              │
└────────────────────────────────────────────────────┘
```

Socket rooms:

- `table:<tableId>` — guests at one table receive updates for their orders, calls, and bill.
- `staff` — the authenticated admin dashboard receives every order, call, bill, and menu event.

## Project Layout

```text
cafe-qr-ordering/
├─ client/                     React guest and admin app
│  └─ src/
│     ├─ pages/                guest pages + admin pages
│     ├─ components/           cart, item sheet, dialogs, UI
│     ├─ hooks/                auth and realtime hooks
│     └─ lib/                  API client, sockets, formatting
├─ server/                     Express API and Socket.io
│  ├─ prisma/
│  │  ├─ schema.prisma         database schema
│  │  ├─ migrations/           checked-in SQL migrations
│  │  └─ seed.ts               demo menu, tables, admin account
│  ├─ scripts/dev-db.ts        optional embedded PostgreSQL
│  └─ src/
│     ├─ routes/               public, admin/staff, auth
│     ├─ services/             pricing, orders, calls, bills, menu
│     ├─ middleware/           auth, errors, rate limits, origin guard
│     ├─ realtime/             Socket.io rooms and events
│     └─ schemas/              Zod request schemas
├─ docker-compose.yml          PostgreSQL for local development
└─ package.json                workspace scripts
```

## Quick Start

### Prerequisites

- Node.js 20.19 or newer
- npm 10+
- PostgreSQL 16+ **or** Docker **or** the bundled embedded PostgreSQL option

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the server

```bash
cp server/.env.example server/.env
```

On Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
```

The default values match the Docker Compose database and are safe for local development. Change `JWT_SECRET` before deploying.

### 3. Start PostgreSQL

Option A — Docker:

```bash
docker compose up -d
```

Option B — no Docker, embedded PostgreSQL:

```bash
npm run dev:db
```

Keep the embedded database terminal running. It stores data in `server/data/pg`, which is ignored by Git. The embedded cluster is initialized as UTF-8 so menu text and migrations work on Windows.

### 4. Create the schema and demo data

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Or run the whole setup after installing dependencies:

```bash
npm run setup
```

### 5. Run the app

```bash
npm run dev
```

- Guest app: <http://localhost:5173/table/1>
- Admin login: <http://localhost:5173/admin/login>
- API health: <http://localhost:4000/api/health>

The old `/staff` URLs redirect to `/admin` so existing bookmarks keep working.

### Demo admin account

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@cafe.local` | `Admin123!` |

Development seed credentials come from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `server/.env`. The seed is development-only and does not overwrite existing menu, table, or admin data. Production administrators must be created with `npm run admin:create`; the password prompt is hidden.

## Configuration

All server configuration lives in `server/.env`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, or `production` |
| `PORT` | `4000` | API port |
| `DATABASE_URL` | local PostgreSQL URL | Prisma connection string |
| `JWT_SECRET` | placeholder | Session signing key; production requires at least 48 random characters |
| `SESSION_TTL_HOURS` | `12` | Admin session lifetime |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed browser origin for CORS, cookies, and Socket.io |
| `COOKIE_SECURE` | `false` | Set `true` behind HTTPS |
| `REQUIRE_TABLE_KEY` | `false` | Require the table's `?key=<qrToken>` on guest and socket requests |
| `TRUST_PROXY_HOPS` | `1` | Number of reverse proxies; must be explicitly set in production |
| `RATE_LIMIT_PER_IP` | `60` | Per-minute order/service request cap per IP |
| `CURRENCY` | `USD` | ISO currency code shown in the UI |
| `TAX_RATE` | `0` | Decimal tax rate, e.g. `0.08` |
| `SERVICE_CHARGE_RATE` | `0` | Decimal service charge, e.g. `0.10` |
| `UPLOAD_DIR` | `uploads/` in the project root | Local directory for menu item images |

Money is stored as integer cents. Order totals are calculated on the server from the current menu prices; the browser cannot override prices.

The admin session cookie uses `SameSite=Lax`: this blocks most cross-site cookie sends while preserving normal top-level navigation to the café app. Production also requires `TRUST_PROXY_HOPS` to be set explicitly; set it to the exact number of trusted reverse proxies.

### Table QR keys

Every table has a unique `qrToken`. The admin Tables page generates QR codes containing:

```text
/table/<number>?key=<qrToken>
```

Set `REQUIRE_TABLE_KEY=true` in production so a guessed table number is not enough to place orders. Keep it `false` only for local testing convenience.

## Guest Flow

1. Scan a table QR code or open `/table/1`.
2. Browse categories and available menu items.
3. Open an item, choose quantity, and add a note if needed.
4. Review the cart, add an order note/name, and place the order.
5. Track live status on `/table/1/status`.
6. Use the service sheet to call a waiter, request water, or ask for a clean table.
7. Request the bill; the admin settles it from the Bills page.

## Admin Flow

1. Sign in at `/admin/login`.
2. Watch new orders arrive on the live dashboard.
3. Advance orders through `Preparing → Ready → Delivered`.
4. Acknowledge and resolve service calls.
5. Open a bill, review the table's orders, and settle it.
6. Open **Menu** to add items, change prices, edit descriptions, toggle availability, feature items, or delete items.
7. Open **Finance** to review date-range profit and loss, add expenses, and compare best- and least-selling items.
8. Open **Tables & QR** to print or display per-table QR codes.

The Finance page calculates sales from delivered orders' item subtotals (excluding tax and service charges), subtracts manually recorded expenses for the selected dates, and ranks items by quantity sold. The date range is applied to order placement dates; expenses use their entered expense dates. Expenses are stored in the database.

Only users with the `ADMIN` role can sign in. The database role enum keeps legacy `MANAGER` and `WAITER` values for compatibility, but those accounts are rejected at login and blocked from every admin API route.

## Menu Management

The admin **Menu** page supports:

- Creating menu categories; newly created empty categories are shown in admin and can be populated with items.
- Adding a new item to any existing category.
- Uploading JPEG, PNG, or WebP item images (up to 5 MB), with a local preview.
- Changing the item name, description, price, availability, and featured flag.
- Deleting an item permanently. Existing orders keep the item name and price snapshot recorded at order time.
- Searching the menu and toggling availability directly from the list.

Menu writes are validated on the server, and every change emits a `menu:updated` Socket.io event so open guest menus refresh immediately.

## API Reference

Base URL: `http://localhost:4000`

### Public

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/public/tables/:number/menu?key=` | Table menu and pricing config |
| `GET` | `/api/public/tables/:number/session?key=` | Table orders, open bill, active calls |
| `POST` | `/api/public/orders` | Create an order |
| `POST` | `/api/public/calls` | Create a service call |
| `POST` | `/api/public/bills` | Request the table bill |

Example order payload:

```json
{
  "tableNumber": 1,
  "tableKey": "optional-table-token",
  "clientRequestId": "6b7b1f70-5d4b-4b1e-a3c2-5c9d9e40a1b2",
  "customerName": "Sam",
  "note": "Allergies: no nuts",
  "items": [
    {
      "menuItemId": "menu_item_id",
      "quantity": 2,
      "notes": "Extra hot"
    }
  ]
}
```

`clientRequestId` must be a UUID. Retrying the same UUID returns the original order instead of creating a duplicate.

### Authentication

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Sign in as an admin and set the session cookie |
| `GET` | `/api/auth/me` | Current admin user |
| `POST` | `/api/auth/logout` | Clear the session cookie |

### Admin (authenticated)

All routes below require an `ADMIN` session.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/staff/stats` | Dashboard counters |
| `GET` | `/api/staff/orders?scope=active\|today\|all` | List orders |
| `PATCH` | `/api/staff/orders/:id/status` | Update status; cancellation is admin-only |
| `GET` | `/api/staff/calls?scope=open\|all` | List service calls |
| `PATCH` | `/api/staff/calls/:id` | Acknowledge or resolve a call |
| `GET` | `/api/staff/bills?scope=open\|all` | List bills |
| `PATCH` | `/api/staff/bills/:id/settle` | Settle a bill |
| `GET` | `/api/staff/finance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | Date-range profit and loss, item rankings, and expenses |
| `POST` | `/api/staff/expenses` | Record an expense |
| `DELETE` | `/api/staff/expenses/:id` | Delete an expense |
| `GET` | `/api/staff/menu` | Full menu, including unavailable items |
| `POST` | `/api/staff/menu/categories` | Create a menu category |
| `POST` | `/api/staff/menu/items` | Add a menu item |
| `PATCH` | `/api/staff/menu/items/:id` | Update a menu item |
| `DELETE` | `/api/staff/menu/items/:id` | Delete a menu item |
| `PATCH` | `/api/staff/menu/items/:id/availability` | Toggle item availability |
| `GET` | `/api/staff/tables` | Tables with QR tokens and live counts |

Example create-menu-item payload:

```json
{
  "categoryId": "category_id",
  "name": "Iced Vanilla Latte",
  "description": "Double espresso, milk, vanilla, and ice.",
  "imageUrl": "https://example.com/latte.jpg",
  "priceCents": 450,
  "available": true,
  "featured": false
}
```

`priceCents` is an integer. `slug` is optional; the server generates a unique slug from the item name when it is omitted. `POST` returns `201`, `PATCH` returns `200`, and `DELETE` returns `204`.

Errors use a consistent shape:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Order cannot move from READY to PENDING.",
    "details": { "allowed": ["DELIVERED"] }
  }
}
```

## Socket.io Events

Connect to the same origin as the API. Guests join a table room; the admin with a valid session cookie automatically joins the admin room.

| Direction | Event | Payload |
| --- | --- | --- |
| Client → server | `table:join` | `{ tableNumber, tableKey? }` with optional ack |
| Client → server | `staff:join` | Optional ack; requires an admin session |
| Server → client | `order:created` | Order with table and items |
| Server → client | `order:updated` | Updated order |
| Server → client | `call:created` | New service call |
| Server → client | `call:updated` | Acknowledged/resolved call |
| Server → client | `bill:created` | New bill request |
| Server → client | `bill:updated` | Settled bill |
| Server → client | `menu:updated` | `{ action: "created" \| "updated" \| "deleted", itemId }` |

Table-scoped events are emitted only to `table:<tableId>` and the admin room. The guest and admin clients reconnect automatically and TanStack Query refetches on socket events.

## Data Model

- `User` — admin identity, bcrypt hash, active flag, and last login. The role enum retains legacy values, but only `ADMIN` can sign in.
- `DiningTable` — table number, optional label, unique QR token, active flag.
- `Category` — menu grouping with sort order and active flag.
- `MenuItem` — price in cents, image, description, availability, featured flag.
- `Order` — table, status, totals, guest name/note, optional bill, idempotency key.
- `OrderItem` — price/name snapshot, quantity, notes, line total.
- `StaffCall` — table, type, status, timestamps, resolving staff member.
- `BillRequest` — table totals, status, settlement metadata, related orders.

Schema: [`server/prisma/schema.prisma`](server/prisma/schema.prisma)

## Scripts

Run from the repository root:

| Command | Description |
| --- | --- |
| `npm run dev` | Start API and client together |
| `npm run dev:db` | Start embedded PostgreSQL |
| `npm run build` | Build server and client |
| `npm run start -w server` | Run the built server |
| `npm run typecheck` | Type-check both workspaces |
| `npm test` | Run server unit tests |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Apply checked-in migrations |
| `npm run db:migrate:dev` | Create a migration in development |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

## Testing

```bash
npm run typecheck
npm test
npm run build
```

Unit tests cover pricing/rounding and the order status state machine. A full manual smoke test:

1. Open `/table/1` and add two items with notes.
2. Place the order and confirm it appears on `/admin` in real time.
3. Move the order through `Preparing → Ready → Delivered`.
4. Request water from the guest status page and resolve it on the Calls page.
5. Request the bill and settle it as `admin@cafe.local`.
6. Open `/admin/menu`, add an item, change its price, and confirm the guest menu updates.
7. Delete the item and confirm it disappears from the admin menu and guest menu.
8. Confirm a legacy manager or waiter account cannot sign in.

## Production Deployment

1. Build the client and server:

   ```bash
   npm ci
   npm run db:generate
   npm run build
   ```

2. Set production environment variables:
   - `NODE_ENV=production`
   - A random `JWT_SECRET` at least 48 characters long
   - `COOKIE_SECURE=true` behind HTTPS
   - `REQUIRE_TABLE_KEY=true`
   - The real `CLIENT_ORIGIN`
   - A managed PostgreSQL `DATABASE_URL`
   - `TRUST_PROXY_HOPS` set to the exact number of reverse proxies
   - Leave `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` unset

3. Apply migrations and create the initial administrator:

   ```bash
   npm run db:migrate
   npm run admin:create
   ```

   The command prompts for the admin email and hidden password. Avoid passing `--password` because command-line arguments can be retained in shell history.

4. Start the API:

   ```bash
   npm run start -w server
   ```

The Express server automatically serves `client/dist` when it exists, so a single-origin deployment works after `npm run build`. Put a reverse proxy (Caddy, Nginx, or a platform load balancer) in front for TLS and WebSocket upgrades.

Recommended production hardening:

- Use a managed PostgreSQL instance with backups and restricted network access.
- Rotate `JWT_SECRET` and the admin seed password.
- Set `REQUIRE_TABLE_KEY=true` and regenerate QR codes if a token leaks.
- Restrict the admin dashboard to the venue network or an identity-aware proxy if needed.
- Keep `npm audit` clean and update dependencies regularly.
- Add structured request logging and error monitoring in front of the existing request ID header.

## Troubleshooting

**`P1001: Can't reach database server`** — Start PostgreSQL with `docker compose up -d` or `npm run dev:db`, then retry.

**`character ... has no equivalent in encoding "WIN1252"`** — An old embedded PostgreSQL data directory was created with the Windows ANSI code page. Stop the database, delete `server/data/pg`, and restart `npm run dev:db` so it initializes as UTF-8.

**Socket events do not arrive** — Confirm the client and API share an origin or that `CLIENT_ORIGIN` matches the browser origin. In development, Vite proxies `/api` and `/socket.io` to port 4000.

**Admin login succeeds but API calls return 401** — Check that cookies are enabled and `CLIENT_ORIGIN` matches the URL in the browser exactly (including port). Use `COOKIE_SECURE=false` only on local HTTP.

**Bill settlement returns 403** — The session must belong to an active `ADMIN` account.

**Old `/staff` link redirects to `/admin`** — This is intentional. Use `/admin/login` for new bookmarks.
