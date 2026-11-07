# 6 YARDS SAREES — OPERATIONAL RUNBOOK

This operational runbook provides quick commands and diagnostic procedures for store managers, administrators, and developers maintaining the **6 Yards Sarees** platform.

---

## 1. Quick Development Commands

### Start Storefront Locally (Port 3000)
```bash
# In repository root:
python -m http.server 3000
# Accessible at: http://localhost:3000
```

### Start Medusa Backend (Port 9000)
```bash
# In backend/apps/backend:
npx medusa develop
# Store API: http://localhost:9000/store
# Admin Dashboard: http://localhost:9000/app
```

---

## 2. Store Seeding & Product Synchronization

To re-seed or sync all 35 authentic sarees and 5 collections idempotently:
```bash
cd backend/apps/backend
npx medusa exec ./src/scripts/seed-6yards.ts
```

What the seed script performs:
1. Creates or verifies Sales Channel `6 Yards Storefront`
2. Creates or links Publishable API Key `6 Yards Sarees Web Key`
3. Sets default currency to `INR`
4. Creates Region `India` (INR) with tax-inclusive GST
5. Sets up Central Handloom Hub warehouse with standard (₹150) and express (₹350) shipping options
6. Creates all 5 collections (`Adaa`, `Roop`, `Vastra`, `Leher`, `Riwayat`)
7. Imports all 35 handcrafted sarees with multi-angle photography, fabric details, and variant pricing

---

## 3. User & Admin Management

### Create New Admin User
```bash
cd backend/apps/backend
npx medusa user --email admin@6yardssarees.com --password YourSecurePassword123!
```

### Reset Admin Password
```bash
cd backend/apps/backend
npx medusa user --email admin@6yardssarees.com --password NewSecurePassword123!
```

---

## 4. Database Migrations

When upgrading Medusa v2 modules or adding custom data models:
```bash
cd backend/apps/backend
npx medusa db:migrate
```

---

## 5. End-to-End Verification Checklist

| Flow | Test Action | Expected Result |
| :--- | :--- | :--- |
| **Catalog Listing** | Visit `http://localhost:3000` | All 35 sarees render with image hover, prices, tags, and ratings |
| **Collection Filtering** | Click on any collection circle (e.g. `Adaa` or `Roop`) | Grid filters to the collection with a toast notification |
| **Search** | Type "Pichwai" or "Silk" in the search bar | Results update dynamically in real time |
| **Quick View Modal** | Click "Quick View" on any saree card | Modal opens with thumbnail gallery, saree specifications, and "Add to Bag" |
| **Cart Drawer** | Add saree to bag | Drawer slides open; shows items, quantity controls, and free shipping progress |
| **Discounts** | Apply promo code `FESTIVE10` or `WELCOME10` | 10% discount subtracted from subtotal |
| **Checkout & Razorpay** | Click "Proceed to Checkout" | Razorpay standard checkout popup opens with brand theme (`#6B1426`) |
| **Order Confirmation** | Complete test payment | Confirmation modal opens with order ID (`#6YD-...`) and bag resets |

---

## 6. Troubleshooting & Diagnostics

### Issue: CORS Error in Browser Console
- **Symptom**: `Access to fetch at 'http://localhost:9000/store/products' from origin 'http://localhost:3000' has been blocked by CORS policy`
- **Fix**: Check `STORE_CORS` in `backend/apps/backend/.env`. Ensure `http://localhost:3000` is listed with no trailing slash. Restart Medusa server.

### Issue: "Database connection failed"
- **Symptom**: `Connection refused at localhost:5432`
- **Fix**: Verify your PostgreSQL service is running or check the Neon/Supabase connection string in `DATABASE_URL`. Ensure `?sslmode=require` is present for cloud PostgreSQL.

### Issue: Port 9000 Already in Use
- **Fix**: Find and kill the process occupying port 9000:
  ```powershell
  Get-NetTCPConnection -LocalPort 9000 | Select-Object OwningProcess
  Stop-Process -Id <PID> -Force
  ```
