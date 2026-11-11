# 6 Yards Sarees — Handover & Go-Live Guide

This is the current, authoritative guide. Older documents in `docs/` (ARCHITECTURE, DEPLOYMENT,
BACKEND_SETUP, RUNBOOK, API_NOTES) describe earlier plans (Railway, Next.js) and are kept for reference only.

## 1. What the project is

| Part | Where | Notes |
| --- | --- | --- |
| Storefront | repo root: `*.html`, `css/`, `js/`, `assets/` | Static HTML/CSS/JS, no framework |
| Commerce backend | `backend/apps/backend` | Medusa v2.22 (Postgres + Redis), Admin at `/app` |
| Deployment | `vercel.json` | One Vercel project, two services: static storefront + Medusa container. `/store`, `/admin`, `/app`, `/auth`, `/health` are routed to Medusa |

### Storefront JavaScript

| File | Job |
| --- | --- |
| `js/products.js` | Bundled catalog (38 sarees, 5 collections). Used when the backend is offline and to fill copy for Medusa products |
| `js/medusa-config.js` | Backend URL + publishable key (key is injected at build time from `MEDUSA_PUBLISHABLE_KEY`) |
| `js/medusa-client.js` | Medusa Store API client: products, cart, promotions, shipping, payment, order completion |
| `js/store.js` | Shared on every page: cart, wishlist, drawers, header/mobile nav, toasts, newsletter, policy modal |
| `js/app.js` | Home page only (hero video, collections, New Arrivals) |
| `js/collections.js` | Catalog filters/sort/grid |
| `js/product-page.js` | Product page |
| `js/checkout.js` | Checkout page (`checkout.html`) |
| `js/contact.js` | Contact form (sends the enquiry via WhatsApp) |

**How ordering works**

- **Backend online:** the bag is a real Medusa cart. Checkout collects contact + address, shows Medusa's
  shipping options and payment providers, and completes the cart. The order appears in **Admin → Orders**.
  Payment is "Cash on Delivery / Pay on confirmation" (Medusa's built-in manual provider) until Razorpay is added (section 5).
- **Backend offline:** the site still works from the bundled catalog. Checkout sends the full order to the
  shop's WhatsApp (+91 98457 14481) for manual confirmation. Nothing is charged or shown as "paid".

## 2. Go-live checklist (new GitHub + Vercel account)

1. **Create a Postgres database and a Redis instance** (e.g. Neon/Supabase Postgres, Upstash Redis).
2. **Push this folder to the new GitHub repo.** `.gitignore` keeps ~650 MB of raw photoshoot originals
   (`assets/raw_sarees*`, `assets/photoshoot`, `Categorized_Sarees`, `Saree`, ...) out of Git — back those up separately.
3. **Import the repo in Vercel** (new account). `vercel.json` defines both services.
4. **Set environment variables** in Vercel → Settings → Environment Variables:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Postgres connection string |
   | `REDIS_URL` | Redis connection string |
   | `JWT_SECRET`, `COOKIE_SECRET` | two different long random strings |
   | `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` | `https://<domain>,https://www.<domain>` |
   | `SITE_URL` | `https://www.<domain>` (used for sitemap.xml / robots.txt) |
   | `MEDUSA_PUBLISHABLE_KEY` | set after step 6 |
   | `S3_*` (optional, recommended) | S3/R2 bucket for images uploaded in Admin (see `.env.template`) |

5. **Initialise the database** (from `backend/apps/backend`, with `DATABASE_URL` pointing at the new DB):
   ```bash
   npm ci
   npx medusa db:migrate        # creates tables AND seeds the 6 Yards store on a fresh DB
   npx medusa user -e <client-email> -p <strong-password>
   ```
   On a fresh database `db:migrate` creates: India region (INR), GST tax region, stock location,
   Standard ₹150 / Express ₹350 shipping (free from ₹5,000), the 5 collections, all 38 sarees with
   5 units of stock each, and the `WELCOME10` promotion.
6. **Publishable key:** Admin → Settings → Publishable API Keys → copy the "6 Yards Sarees Web Key" token
   into the `MEDUSA_PUBLISHABLE_KEY` env var and redeploy.
7. **Domain:** Vercel → Settings → Domains → add the domain and set the DNS records Vercel shows.
   Then update `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` / `SITE_URL` and redeploy.
8. **Smoke test:** open the site, add a saree, check out with a test address, confirm the order in Admin → Orders,
   then cancel it.

### Existing database (the current deployment)

The old database already ran the original starter seed, so run these once instead:
```bash
npx medusa exec ./src/scripts/seed-6yards.ts     # adds anything missing (idempotent)
npx medusa exec ./src/scripts/prepare-store.ts   # INR store, channel links, stock, free shipping, WELCOME10
```
Remove the starter T-shirts if present: `npx medusa exec ./src/scripts/clean-starter-products.ts`.

## 3. Day-to-day for the client (Medusa Admin at `/app`)

- **Products:** Products → edit title, price, images, stock. New products should be added to the
  "6 Yards Storefront" sales channel and a collection. Optional metadata keys the site understands:
  `occasion` (Wedding/Casual/Comfort/Festive), `originalPrice`, `tag`, `fabric`, `weave`, `color`, `origin`, `length`, `details` (list).
- **Stock:** Inventory → set the real quantity of each saree (seeded as 5).
- **Orders:** Orders → confirm, mark paid when payment arrives, create fulfillment and add tracking.
- **Promotions:** Promotions → create codes. `WELCOME10` is advertised on the newsletter signup.
- **Newsletter subscribers:** Customers with metadata `newsletter_opt_in = true`.

## 4. What was fixed in this handover

**Ordering & cart**
- Checkout was fake: hardcoded customer, placeholder Razorpay key, no Medusa order, and an always-"PAID" success modal. Replaced by `checkout.html` (real Medusa order, or WhatsApp order when offline).
- Cart code was duplicated in three files with different rules; Add to Cart on product pages saved quantity ×2; promo codes differed per page and were not honoured by the backend. Now one shared cart (`js/store.js`).
- The live Medusa catalog was never used (requested before the backend check finished). Fixed with a `ready` promise.
- Products added from the home/catalog pages never reached the Medusa cart (missing variant ids).

**Medusa backend**
- `initial-data-seed.ts` was Medusa's EUR/T-shirt starter; a fresh DB ended up with a EUR store. Now seeds 6 Yards.
- Seeded variants had no stock, so adding to cart failed. `prepare-store.ts` adds stock levels.
- Seed created products outside the storefront sales channel and only 35 of 38 sarees; 3 sarees had handles that did not match the site.
- Product search index used EUR/USD prices; now INR. Region policy defaults now match India (₹150 shipping, 7-day returns).
- New `POST /store/newsletter` (subscribers saved as customers). Optional S3 image storage.

**Pages / UI**
- Collections: counts were hardcoded, the ₹1,000 minimum price hid 3 sarees, mobile filter panel had no close button.
- Product page: fabricated "142 Verified Patron Reviews" star ratings removed; "100% certified silk" claims on silk-cotton sarees and "International shipping via DHL" removed; not-found state; sold-out state; wishlist button; SEO structured data.
- Mobile menu: the Sarees submenu now opens on mobile.
- Hero video no longer turns on sound at full volume on the first click anywhere; there is a sound button instead.
- About page announcement bar was hidden under the header; stray `<link>` tags inside `<header>`.
- Contact form and newsletter pretended to submit and discarded the data. Contact now opens WhatsApp; newsletter saves to Medusa.
- Logo: 541 KB PNG replaced with a 54 KB version. 404 page works at any URL depth.
- Accessibility: focus outlines, ARIA on drawers/menus, button types, reduced-motion support.

**Deployment**
- Build copied ~700 MB (unused raw photos) into every deploy; now ~28 MB. Adds `robots.txt` and `sitemap.xml`.

### Verified end to end (local Medusa 2.22 + fresh Postgres, 11 Nov 2026)

- `medusa db:migrate` on an empty database created the full store: 38 sarees, stock of 5 each, INR region,
  Standard free from ₹5,000 (Express stays paid), WELCOME10.
- Add to bag created a Medusa cart; WELCOME10 applied (10%), an invalid code was rejected, quantity changes recalculated.
- Checkout placed order #1: ₹29,700 (2 × ₹16,500 − ₹3,300), address saved, payment "authorized" (COD), 2 units reserved.
- Requesting more than the available stock is refused with a clear message.
- `POST /store/newsletter` saves subscribers, rejects invalid emails and requests without the publishable key.
- With the backend stopped, the site falls back to the bundled catalog and WhatsApp ordering.

Note: the database must use UTF-8 encoding (hosted Postgres providers do by default); product copy contains "₹".

## 5. Still open (needs client input or accounts)

1. **Online payments (Razorpay):** needs the client's Razorpay account/keys and a Medusa Razorpay payment
   plugin. Until then orders are placed as "pay on confirmation / COD".
2. **Order emails:** no email provider is configured, so customers get no automatic confirmation email.
   Add a Medusa notification provider (e.g. Resend) with the client's domain.
3. **Social links** in the footer point to generic instagram.com / facebook.com etc. — replace with the real profiles.
4. **Brand claims** in `about.html` / `journal.html` ("100% Silk Mark certified", "zero blends") conflict with
   silk-cotton sarees in the catalog. The client should confirm or soften this copy.
5. **Product images uploaded in Admin** are lost on redeploy unless `S3_*` variables are set.
