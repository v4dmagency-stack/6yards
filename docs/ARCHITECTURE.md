> **Superseded:** see [HANDOVER.md](./HANDOVER.md) for the current setup and go-live steps. This file is kept for reference.

# ARCHITECTURE & AUDIT PLAN: Medusa v2 Integration for 6 Yards Sarees

## 1. Project Inputs & Safest Assumptions

| Input Field | Current Value / Assumed Strategy |
| :--- | :--- |
| **PROJECT_NAME** | 6 Yards Sarees (`6yards`) |
| **FRONTEND_FRAMEWORK** | Static Vanilla HTML/CSS/JS (Active) -> Next.js 14 App Router migration planned for full SSR/SEO & Medusa SDK integration |
| **UI_LIBRARY** | Custom Vanilla CSS with Design Tokens (`#6B1426` Maroon, `#B08A4A` Antique Gold, `#F2E4D6` Cream) |
| **PACKAGE_MANAGER** | `npm` |
| **REPO_LAYOUT** | Monorepo (`apps/backend` for Medusa v2 + root or `apps/storefront`) |
| **FRONTEND_HOST** | Vercel (or GitHub Pages for static, Vercel recommended for Next.js) |
| **BACKEND_HOST** | Railway / Render (PostgreSQL + Redis + Medusa v2) |
| **DATABASE** | PostgreSQL 16+ |
| **REDIS** | Redis 7+ (Railway or Upstash) |
| **CURRENCY / REGIONS** | `INR` / India (`in`) |
| **TAX** | GST (prices tax-inclusive) |
| **PAYMENT_GATEWAY** | Razorpay + COD (Cash on Delivery) |
| **SHIPPING** | Flat Rate (₹150 standard, free over ₹5,000 threshold) |
| **CUSTOMER_ACCOUNTS** | Guest checkout + optional customer login |
| **EMAIL_PROVIDER** | Resend |
| **FILE_STORAGE** | S3 / Cloudinary / Supabase Storage (local dev provider for local testing) |
| **PRODUCT_SOURCE** | Seeded from `js/products.js` (35 handloom sarees across 5 collections) |

---

## 2. Storefront Audit & Inventory

### Existing Pages & UI Components
- **`index.html`**:
  - **Hero Section**: Video background & marquee banner.
  - **Brand Navigation Header**: Simple glassmorphic navbar with logo, Home, Shop, Journal, Wishlist, Cart.
  - **Featured Collections**: 5 Collections (`Adaa`, `Roop`, `Vastra`, `Leher`, `Riwayat`).
  - **Product Catalog Grid**: Filterable by category, tags, sorting, search modal.
  - **Quick View Modal (`#quickview-modal`)**: Multi-angle image preview thumbnails, price, specifications, "Add to Bag", Wishlist.
  - **Slide-out Cart Drawer (`#cart-drawer`)**: Quantity +/- controls, coupon code box, subtotal, checkout button.
  - **Story Modal (`#story-modal`)**: Heritage brand story.
- **State Management**:
  - `cart`: Stored in `localStorage.getItem('6yards_cart')`
  - `wishlist`: Stored in `localStorage.getItem('6yards_wishlist')`
  - `products`: Loaded from global `PRODUCTS_DATA` in `js/products.js`

---

## 3. Architecture & Integration Plan

### Direct Integration Path
1. **Medusa Backend (`apps/backend`)**:
   - Initialize Medusa v2 project (`medusa-config.ts`).
   - Configure PostgreSQL, Redis, CORS origins for storefront.
   - Seed regions (`in`, INR), sales channel, tax rates (GST), shipping options, categories, and all 35 authentic sarees from `js/products.js`.
   - Setup Razorpay payment provider module and manual COD provider.
   - Setup Resend notification provider for order confirmation emails.
2. **Storefront SDK Client (`js/medusa-client.js`)**:
   - Use official `@medusajs/js-sdk` (via CDN or bundled module).
   - Initialize Medusa client with `publishableApiKey` and `baseUrl`.
   - Implement `cart.ts` / `cart.js` syncing Medusa cart session instead of bare localStorage.
   - Bind catalog filters, Quick View modal, and cart operations to Medusa Store API endpoints (`/store/products`, `/store/carts`, `/store/payment-collections`).
   - Implement checkout flow with Razorpay standard modal integration.
