# Crust &amp; Craft — Pizza Delivery &amp; Inventory Platform

A full-stack MERN application for an artisan pizza brand: build your own pizza,
order it, pay online, and track it live — while admins manage orders and
ingredient stock in real time.

Built as **OIBSIP Level 3** deliverable. The whole flow works end-to-end locally
with a clearly-labelled **mock payment provider** (no real money moves).

---

## Features

### Storefront
- Marketing home page, full menu and a 4-step **pizza builder** (base → sauce →
  cheese → vegetables) with live price calculation.
- Cart with quantity controls, persisted to `sessionStorage`.
- Auth: register, email verification, login, forgot/reset password, profile.
- Checkout with an address form and live totals (subtotal, delivery, tax).
- Order history, order detail page with a live **status tracker**.
- Real-time status updates and cancel-while-pending.

### Admin dashboard
- KPI dashboard (revenue, order counts, low-stock alerts).
- Order management with status transitions and payment info.
- Inventory management: adjust stock, view movement history, trigger
  low-stock/out-of-stock checks.
- Customer list and notification log.

### Platform
- JWT auth with **httpOnly, rotated refresh cookies** and CSRF protection.
- **Stock is reserved atomically at order creation**, consumed on verified
  payment, and released on cancel/failure/expiry (30-minute reservation).
- Idempotent payment verification (atomic flag flips — duplicate verify is safe).
- Background **inventory monitor** (cron) that logs low-stock/out-of-stock
  notifications.
- Socket.IO live order updates.
- Centralised error handling, request logging and rate limiting.

---

## Tech stack

| Layer     | Choices |
|-----------|---------|
| Frontend  | React 19, Vite, React Router 7, axios, socket.io-client, lucide-react, plain CSS design tokens |
| Backend   | Node.js, Express 4, Mongoose 8, JWT, bcrypt, helmet, zod, Socket.IO, node-cron, Nodemailer |
| Payments  | Razorpay (server-side signature verification) + local mock provider |
| Testing   | Vitest, Supertest, mongodb-memory-server, @testing-library/react |
| Tooling   | oxlint, nodemon |

---

## Project structure

```
LEVEL3/
├─ server/                  # Express API
│  ├─ src/
│  │  ├─ config/            # env, database, constants
│  │  ├─ models/            # User, Pizza, Ingredient, Order, Payment, ...
│  │  ├─ services/          # pricing, inventory, order, payment, auth logic
│  │  ├─ controllers/
│  │  ├─ routes/
│  │  ├─ validators/        # zod schemas
│  │  ├─ middleware/        # auth, csrf, validate, rateLimit, errorHandler
│  │  ├─ sockets/           # Socket.IO setup
│  │  ├─ jobs/              # inventoryMonitor cron
│  │  ├─ scripts/           # seedMenu, createAdmin
│  │  └─ data/              # menu seed data
│  └─ tests/                # vitest unit + api tests
└─ client/                  # React + Vite SPA
   └─ src/
      ├─ components/        # ui, common, layout, pizza, orders
      ├─ context/           # Auth, Cart, Config, Socket, Toast
      ├─ hooks/
      ├─ lib/               # api client, formatters, constants
      ├─ pages/             # customer + admin pages
      ├─ services/          # typed API wrappers
      ├─ styles/            # tokens, global, components, layout, pages
      └─ test/              # vitest setup
```

---

## Getting started

### Prerequisites
- Node.js 18+ and npm
- MongoDB running locally (e.g. `mongodb://127.0.0.1:27017`) — **or** rely on
  mongodb-memory-server for tests.

### 1. Backend

```bash
cd server
npm install
cp .env.example .env      # then edit values
npm run seed              # seed 21 ingredients + 8 pizzas
npm run create:admin      # create the admin account from ADMIN_* env vars
npm run dev               # http://localhost:5000
```

Health + runtime config:
- `GET /api/health`
- `GET /api/config` (public, no secrets — pricing + payment availability)

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env      # optional; empty = use Vite dev proxy
npm run dev               # http://localhost:5173
```

The Vite dev server proxies `/api` and `/socket.io` (WebSocket) to
`http://localhost:5000`, so leave `VITE_API_URL` empty for local development.

Default admin (from `.env.example`):
`admin@crustandcraft.test` / `ChangeMe_Str0ng!Pass`

---

## Environment variables (`server/.env`)

| Variable | Purpose |
|----------|---------|
| `PORT`, `NODE_ENV`, `CLIENT_URL` | Server + CORS origin |
| `MONGODB_URI` | Mongo connection string |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`, `COOKIE_SECRET`, `COOKIE_SECURE` | Auth/security |
| `EMAIL_TOKEN_TTL_MINUTES`, `RESET_TOKEN_TTL_MINUTES` | Token lifetimes |
| `SMTP_*`, `MAIL_FROM` | Nodemailer; leave `SMTP_HOST` empty to log emails to console (not delivered). See [Email delivery](#email-delivery) |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used only by `npm run create:admin` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Test-mode Razorpay |
| `PIZZA_BASE_PRICE`, `DELIVERY_FEE`, `FREE_DELIVERY_THRESHOLD`, `TAX_RATE` | Pricing |
| `INVENTORY_CRON`, `ENABLE_INVENTORY_SCHEDULER` | Background inventory monitor |
| `ENABLE_MOCK_PAYMENTS` | Local payment simulator (**dev only**) |

---

## API overview

Base URL: `http://localhost:5000/api`. Success responses are
`{ success: true, data, meta? }`; errors are `{ success: false, error }`.

### Public
- `GET /health`, `GET /config`
- `GET /pizzas`, `GET /pizzas/:id`, `GET /ingredients`

### Auth (`/auth`)
- `POST /register`, `POST /verify-email`, `POST /resend-verification`
- `POST /login`, `POST /refresh`, `POST /logout`
- `GET /me`, `PATCH /me`
- `POST /forgot-password`, `POST /reset-password`

### Orders (`/orders`, authenticated)
- `POST /preview` — price a cart (server authoritative)
- `POST /` — create order (verified email required)
- `GET /my`, `GET /:id`, `POST /:id/cancel`

### Payments (`/payments`, authenticated)
- `POST /webhook` — Razorpay webhook (signature verified, raw body)
- `POST /create-order`, `POST /verify`, `POST /failed`
- `POST /verify-mock` — mock provider (only when `ENABLE_MOCK_PAYMENTS=true`)

### Admin (`/admin`)
- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- `GET /dashboard`
- `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status`
- `GET /inventory`, `GET /inventory/movements`, `PATCH /inventory/:id`,
  `POST /inventory/check-alerts`
- `GET /notifications`, `GET /customers`

The admin console uses a **separate cookie namespace** (`cc_admin_access` /
`cc_admin_refresh`) from the storefront (`cc_access` / `cc_refresh`). The two
sessions can coexist in one browser without shadowing each other, and admin
routes read *only* the admin namespace — a customer session can never
authenticate an admin request.

### Socket.IO
Connect with the `cc_access` cookie (or `cc_admin_access` for an admin session).
Clients emit `join:order` with an order id; the server emits `order:updated`
when the status changes.

---

## Inventory &amp; ordering model

1. **Create** — stock is reserved atomically for every required ingredient
   (30-minute hold). Insufficient stock returns `409`.
2. **Pay (verified)** — reservation is consumed (stock permanently reduced) and
   an `InventoryMovement` is recorded.
3. **Fail / cancel / expire** — the reservation is released back to stock.

Idempotency is enforced with atomic flag flips, so duplicate payment
verifications return the original result with `duplicate: true` instead of
double-charging or double-consuming.

---

## Payments

- **Razorpay (test mode):** set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
  Signatures are verified server-side; the webhook is verified with
  `RAZORPAY_WEBHOOK_SECRET`.
- **Mock provider:** set `ENABLE_MOCK_PAYMENTS=true` (never in production).
  This locally simulates a successful/failed payment so the full flow can be
  exercised without real keys. The UI labels mock checkout clearly — it is
  **not** Razorpay and never fakes a real charge.

> The frontend publicly reports availability via `GET /api/config`
> (`payments.razorpayConfigured`, `payments.mockEnabled`).

---

## Email delivery

The backend sends verification and password-reset emails through Nodemailer.

- **No SMTP configured (`SMTP_HOST` empty):** the app uses Nodemailer's JSON
  transport. Emails are **not delivered** — the subject is logged and the body
  (including the verification link) is logged at debug level in non-production.
  This is intentional: it never fakes a successful send.
- **SMTP configured:** the message is delivered and a `messageId` is logged.

Registration responds with `emailDelivered: true|false`. When delivery fails the
account is still created but **left unverified**, and the user is told to use
"Resend verification". An account is only ever marked verified by a valid,
unexpired token.

Diagnose SMTP connectivity and authentication (never prints credentials):

```bash
cd server
npm run mail:check
```

Configure Gmail as the sender in `server/.env`:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=you@gmail.com
SMTP_PASS=your-16-char-google-app-password   # NOT your normal password
MAIL_FROM="Crust & Craft <you@gmail.com>"    # must match SMTP_USER for Gmail
CLIENT_URL=http://localhost:5173             # origin used to build the link
```

> Gmail requires a **Google App Password** (enable 2-Step Verification →
> Account → Security → App passwords). A normal account password will be
> rejected with `535 Authentication failed`.

To test delivery end-to-end: set the values above, run `npm run mail:check`
(expect "succeeded"), start the client + server, register a new account, and
open the link from the inbox (`CLIENT_URL/verify-email?token=...`). Verification
tokens are stored SHA-256-hashed and expire after `EMAIL_TOKEN_TTL_MINUTES`.

---

## Testing

### Backend
```bash
cd server
npm test          # vitest run — unit + API tests (mongodb-memory-server)
```
Covers pricing, inventory reservation math, the order/payment API flow
(create → reserve → mock verify → consume) including the cancel path, the
registration/validation flow, and email delivery (transporter success/failure,
credential redaction, single-send, and unverified-on-failure).


### Frontend
```bash
cd client
npm test          # vitest run — jsdom + Testing Library
npm run lint      # oxlint
npm run build     # production build
```

---

## Security notes

- Passwords are hashed with bcrypt; refresh tokens rotate on every use.
- `helmet`, rate limiting, and a global error handler are enabled.
- CSRF uses a double-submit cookie (`cc_csrf` cookie + `x-csrf-token` header) on
  cookie-authenticated mutating requests.
- Admin and storefront sessions use separate cookie namespaces, so a customer
  session can never be used to authenticate an admin-console request.
- All prices are recalculated on the server; client-sent prices are ignored.
- No secrets are ever sent to the client; only the public Razorpay key id is
  exposed via `/api/config`.

---

## Scripts

| Location | Command | Description |
|----------|---------|-------------|
| `server` | `npm run dev` | Start API with nodemon |
| `server` | `npm start` | Start API (production) |
| `server` | `npm run seed` | Seed ingredients + pizzas |
| `server` | `npm run create:admin` | Provision admin from env |
| `server` | `npm run mail:check` | Diagnose SMTP connectivity/auth |
| `server` | `npm test` | Run backend tests |
| `client` | `npm run dev` | Start Vite dev server |
| `client` | `npm run build` | Production build |
| `client` | `npm run lint` | Lint with oxlint |
| `client` | `npm test` | Run frontend tests |

---

## Notes / limitations

- Real Razorpay checkout and real SMTP delivery require credentials; without
  them the app uses the mock provider and logs emails to the server console.
- This project is intended for local/educational use.
