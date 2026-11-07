# 6 YARDS SAREES — PRODUCTION DEPLOYMENT GUIDE

This guide details the end-to-end production deployment architecture for the **6 Yards Sarees** luxury e-commerce platform.

---

## 1. Production Architecture Overview

```
                      Browser / Mobile Patron
                                 |
                                 v
                     +-----------------------+
                     |  Storefront (Vercel)  |
                     |  https://6yards.in    |
                     +-----------+-----------+
                                 |  Store API (x-publishable-api-key)
                                 v
            +-----------------------------------------+
            |      Railway / Render Cloud Engine      |
            |                                         |
            |  +-----------------------------------+  |
            |  | Medusa v2 HTTP Server (server)    |  |
            |  | (API, Admin Dashboard /app)       |  |
            |  +-----------------+-----------------+  |
            |                    |                    |
            |  +-----------------+-----------------+  |
            |  | Medusa v2 Event Worker (worker)   |  |
            |  | (Subscribers, Workflows, Emails)  |  |
            |  +-----------------+-----------------+  |
            +--------------------+--------------------+
                                 |
                 +---------------+---------------+
                 |                               |
                 v                               v
      +--------------------+          +--------------------+
      |  PostgreSQL 16+    |          |  Redis 7+          |
      |  (Neon / Supabase) |          |  (Upstash / Cloud) |
      +--------------------+          +--------------------+
```

---

## 2. Environment Variables Matrix

### Storefront Environment (Vercel)
Set in **Vercel Project Settings -> Environment Variables**:

| Variable Name | Environment | Value Description |
| :--- | :--- | :--- |
| `MEDUSA_BACKEND_URL` | Production & Preview | URL of your deployed Medusa backend (e.g. `https://api.6yards.in` or `https://backend-production.up.railway.app`) |
| `MEDUSA_PUBLISHABLE_KEY` | Production & Preview | Scoped publishable key (e.g. `pk_6yards_storefront`) |
| `RAZORPAY_KEY_ID` | Production | Live Razorpay Key ID (`rzp_live_...`) |

### Medusa Backend Environment (Railway / Render / VPS)
Set in your backend hosting environment:

| Variable Name | Type | Value Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | **Secret** | Pooled PostgreSQL URL (`postgres://user:pass@host:5432/dbname?sslmode=require`) |
| `REDIS_URL` | **Secret** | Redis connection string (`rediss://default:token@host:6379`) |
| `JWT_SECRET` | **Secret** | 64+ char random hex string (generated via `openssl rand -hex 32`) |
| `COOKIE_SECRET` | **Secret** | 64+ char random hex string |
| `STORE_CORS` | Config | Exact storefront domain: `https://6yards.in,https://6yards.vercel.app` |
| `ADMIN_CORS` | Config | Exact admin domain: `https://admin.6yards.in,https://backend-production.up.railway.app` |
| `AUTH_CORS` | Config | `https://6yards.in,https://admin.6yards.in,https://backend-production.up.railway.app` |
| `RAZORPAY_KEY_ID` | Config | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | **Secret** | Live Razorpay Key Secret |
| `RAZORPAY_WEBHOOK_SECRET`| **Secret** | Webhook verification secret from Razorpay Dashboard |
| `RESEND_API_KEY` | **Secret** | `re_...` Resend API key for transactional emails |

---

## 3. Two-Process Production Separation

Medusa v2 runs in two dedicated operational roles sharing the same database and Redis:

1. **HTTP Server Mode**:
   Handles incoming HTTP requests from the Store API and Admin dashboard.
   - Start Command: `MEDUSA_WORKER_MODE=server npx medusa start`
2. **Worker Mode**:
   Processes asynchronous jobs, cart cleanup, subscribers, order confirmation emails, and scheduled workflows.
   - Start Command: `MEDUSA_WORKER_MODE=worker npx medusa start`

---

## 4. Deploying Backend to Railway (Recommended)

1. **Create New Project on Railway**:
   - Add a **PostgreSQL** database plugin.
   - Add a **Redis** database plugin.
2. **Deploy Medusa Server**:
   - Link your GitHub repository.
   - Set Root Directory: `backend/apps/backend`
   - Set Build Command: `npm run build`
   - Set Start Command: `npx medusa db:migrate && MEDUSA_WORKER_MODE=server npx medusa start`
   - Add all environment variables from Section 2.
3. **Deploy Medusa Worker**:
   - Add a second service from the same GitHub repo.
   - Set Root Directory: `backend/apps/backend`
   - Set Start Command: `MEDUSA_WORKER_MODE=worker npx medusa start`
   - Share the same environment variables.
4. **Run Seed in Railway CLI / Console**:
   ```bash
   railway run npx medusa exec ./src/scripts/seed-6yards.ts
   ```

---

## 5. Deploying Storefront to Vercel

1. **Import Git Repository**:
   - In Vercel, select `6yards`.
   - Framework Preset: `Other` (or `Next.js` if deploying the App Router version).
   - Root Directory: `./` (or `storefront` if separated).
2. **Configure Environment Variables**:
   - Add `MEDUSA_BACKEND_URL`, `MEDUSA_PUBLISHABLE_KEY`, and `RAZORPAY_KEY_ID`.
3. **Deploy & Verify**:
   - Trigger deployment.
   - Test catalog loading, Quick View modal, cart drawer line items, and Razorpay payment popup.

---

## 6. SSL & Custom Domain Setup
- Point `6yards.in` CNAME to `cname.vercel-dns.com`
- Point `api.6yards.in` CNAME to Railway / Render custom domain DNS target
- Point `admin.6yards.in` to the Medusa Admin Dashboard route
