> **Superseded:** see [HANDOVER.md](./HANDOVER.md) for the current setup and go-live steps. This file is kept for reference.

# 6 YARDS SAREES — MEDUSA v2 BACKEND SETUP GUIDE

This guide provides the complete setup, configuration, and execution instructions for running the Medusa v2 commerce engine for **6 Yards Sarees**.

---

## 1. Environment & Architecture Overview

The backend uses **Medusa v2** (`@medusajs/medusa` v2.22+), structured as an enterprise commerce workspace with PostgreSQL and Redis.

```
       +------------------------------------+
       |   6 Yards Sarees Storefront UI     |
       |   (Glassmorphic Vanilla / Next.js) |
       +-----------------+------------------+
                         |  Store API (x-publishable-api-key)
                         v
       +------------------------------------+
       |   Medusa v2 Backend Engine         |
       |   (apps/backend on port 9000)      |
       +-----------------+------------------+
                         |
           +-------------+-------------+
           |                           |
           v                           v
  +-----------------+         +-----------------+
  |   PostgreSQL    |         |      Redis      |
  |   (Data & Tax)  |         | (Events/Cache)  |
  +-----------------+         +-----------------+
```

---

## 2. Environment Variables & Secrets Reference

Create `backend/apps/backend/.env` based on `backend/apps/backend/.env.template`:

| Variable | Description | Public / Secret | Example Value |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | **Secret** | `postgres://postgres:postgres@localhost:5432/medusa_6yards` or Neon/Supabase pooler |
| `REDIS_URL` | Redis connection URL | **Secret** | `redis://localhost:6379` or Upstash Redis URL |
| `JWT_SECRET` | Secret for signing JWT authentication tokens | **Secret** | 64+ char random hex string |
| `COOKIE_SECRET` | Secret for signing session cookies | **Secret** | 64+ char random hex string |
| `STORE_CORS` | Allowed CORS origins for customer storefront | Config | `http://localhost:3000,http://localhost:8000,https://6yards.vercel.app` |
| `ADMIN_CORS` | Allowed CORS origins for admin dashboard | Config | `http://localhost:5173,http://localhost:9000` |
| `AUTH_CORS` | Allowed CORS origins for authentication routes | Config | `http://localhost:3000,http://localhost:8000,http://localhost:5173,http://localhost:9000` |
| `RAZORPAY_KEY_ID` | Razorpay Key ID | **Public** (Frontend) / Config | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret | **Secret** | `...` |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook Verification Secret | **Secret** | `...` |
| `RESEND_API_KEY` | Resend API key for order confirmation emails | **Secret** | `re_...` |

---

## 3. Database & Redis Requirements

Medusa v2 requires **PostgreSQL (16+)** and **Redis (7+)**.

### Options for Local / Managed Deployment:
1. **Managed Cloud (Zero-installation / Recommended for Dev & Prod)**:
   - **PostgreSQL**: Neon ([neon.tech](https://neon.tech)) or Supabase ([supabase.com](https://supabase.com)) — Free tier PostgreSQL database with connection string provided instantly.
   - **Redis**: Upstash ([upstash.com](https://upstash.com)) — Free serverless Redis instance.
2. **Docker (Local)**:
   ```bash
   docker run --name 6yards-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=medusa_6yards -p 5432:5432 -d postgres:16
   docker run --name 6yards-redis -p 6379:6379 -d redis:7-alpine
   ```

---

## 4. Initializing the Database & Running Migrations

Once `DATABASE_URL` is configured in `backend/apps/backend/.env`:

```bash
# Navigate to backend app
cd backend/apps/backend

# Run database migrations
npx medusa db:migrate
```

---

## 5. Creating Admin User

To access the Medusa v2 Admin Dashboard at `http://localhost:9000/app`:

```bash
# In backend/apps/backend:
npx medusa user --email admin@6yardssarees.com --password YourStrongPassword123!
```

---

## 6. Seeding 6 Yards Store Data (Idempotent)

The dedicated seed script sets up:
- **Default Currency**: `INR` (`₹`)
- **Region**: India (`in`), GST tax-inclusive
- **Default Sales Channel**: `6 Yards Sarees Storefront`
- **Publishable API Key**: `pk_6yards_storefront` linked to the sales channel
- **Stock Location**: Central Handloom Hub, Varanasi
- **Shipping Profile & Options**:
  - `Standard Handloom Delivery`: Flat ₹150 (Free for orders over ₹5,000)
- **5 Heritage Collections**:
  - `Adaa` (Curated stories, woven in six yards)
  - `Roop` (Vibrant palettes and rich jewel tones)
  - `Vastra` (Pure geometric patterns celebrating traditional forms)
  - `Leher` (Whispering silks, lightweight organzas and airy chiffons)
  - `Riwayat` (Royal Kanjivarams and Banarasi heirlooms)
- **35 Handcrafted Sarees**:
  - Mapped with high-res multi-angle assets, authentic weave descriptions, blouse piece specifications, and pricing.

To run the seed:
```bash
# In backend/apps/backend:
npx medusa exec ./src/scripts/seed-6yards.ts
```

---

## 7. Starting the Server

### Development Mode (with Admin Dashboard):
```bash
# In root backend workspace:
npm run backend:dev

# Or in backend/apps/backend directly:
npx medusa develop
```
- Store API: `http://localhost:9000/store`
- Admin Dashboard: `http://localhost:9000/app`

### Production Server vs Worker Mode:
- **Server Mode (HTTP API & Admin)**:
  ```bash
  MEDUSA_WORKER_MODE=server npx medusa start
  ```
- **Worker Mode (Subscribers, Background Workflows, Emails)**:
  ```bash
  MEDUSA_WORKER_MODE=worker npx medusa start
  ```
