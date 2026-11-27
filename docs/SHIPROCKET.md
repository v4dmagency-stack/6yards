# Shiprocket — setup and daily use

The website sends orders to Shiprocket through Shiprocket's API, and Shiprocket
sends courier updates back to the website. Nothing changes on the website until
the settings below are added in Vercel.

## How it works

| What happens | Where |
|---|---|
| Customer places an order | Website → Medusa (Orders) |
| Your team confirms payment, then clicks **Yes, paid** or **No, cash on delivery** in the order's **Shiprocket** box | Medusa Admin → Orders → the order |
| The order appears in Shiprocket under **Orders → New**, channel **Custom** | Shiprocket |
| You assign a courier, print the label, schedule pickup | Shiprocket (as usual) |
| Courier status (picked up, in transit, out for delivery, delivered) comes back automatically | Medusa order page + the customer's **Track Your Order** page |
| Picked up → the Medusa order is marked **Shipped** (with the AWB); delivered → **Delivered** | Medusa |

- **Do not** add a channel on Shiprocket's *Channels → Add a New Channel* page. Medusa isn't listed
  there, and it isn't needed: orders sent through the API go into Shiprocket's built-in **Custom** channel.
- Orders paid online (Razorpay, once added) are sent automatically as **Prepaid**.
- Cancelling an order in Medusa also cancels it in Shiprocket (if the courier hasn't picked it up yet).
- The product page shows **Check delivery to your PIN code**. Checkout stops only when Shiprocket clearly
  says it can't deliver to the PIN code.

## One-time setup (about 15 minutes)

### 1. Pickup address (in Shiprocket)
*Settings → Pickup Addresses.* Make sure the shop's pickup address is there and verified. Note its
**nickname** exactly (for example `Home` or `Shop`).

### 2. API user (in Shiprocket)
*Settings → API → Add New API User → Create API User.*
- **Email:** a different email from the one you sign in to Shiprocket with (for example `api@yourdomain.com`
  or a Gmail "+" address like `sixyardsilksarees+api@gmail.com`).
- **Modules to access:** select all (at least Orders, Couriers, Tracking and Settings/Pickup).
- **Buyer's details access:** **Allowed** (needed to send customer names and addresses).
- Click **Create User** and copy the password straight away (Shiprocket shows it only once).

### 3. Settings (in Vercel)
*Vercel → the 6yards project → Settings → Environment Variables.* Add these for **Production**:

| Name | Value |
|---|---|
| `SHIPROCKET_EMAIL` | the API user's email from step 2 |
| `SHIPROCKET_PASSWORD` | the API user's password from step 2 |
| `SHIPROCKET_PICKUP_LOCATION` | the pickup nickname from step 1, exactly |
| `SHIPROCKET_WEBHOOK_TOKEN` | any long random text you make up (for example 40 letters and numbers); you will paste the same text in step 5 |
| `SHIPROCKET_PACKAGE_WEIGHT_KG` | optional, packed weight of one saree (default `0.8`) |
| `SHIPROCKET_PACKAGE_SIZE_CM` | optional, packed box size of one saree, `LxBxH` (default `35x28x4`) |

Then *Deployments → the latest one → ⋯ → Redeploy*, so the server picks up the new settings.

### 4. Test the connection (in Medusa Admin)
*Settings → Shiprocket → Test connection.* All four lines should say **OK**. If the pickup location is
wrong, the page lists the names Shiprocket has.

### 5. Courier updates (in Shiprocket)
*Settings → API → Webhooks.*
- **URL:** copy it from Medusa Admin → Settings → Shiprocket. Today that is
  `https://6yards-chi.vercel.app/hooks/delivery-updates` (it changes if you add your own domain;
  Shiprocket refuses URLs containing "shiprocket", "kartrocket", "sr" or "kr").
- **Security token:** the same text as `SHIPROCKET_WEBHOOK_TOKEN`.
- Turn the toggle **on** and save.

### 6. One real test
Place a small order on the website to your own address. In Medusa open the order → Shiprocket box →
**Yes, paid — send to Shiprocket**. Check it appears in Shiprocket under Orders → New (channel Custom) with
the right address, phone, amount and pickup location. Then click **Cancel in Shiprocket** and cancel the
order in Medusa.

## Daily use

1. A new order arrives (Medusa → Orders). Confirm payment with the customer as you do today.
2. Open the order. In the **Shiprocket** box choose:
   - **Yes, paid — send to Shiprocket** if the customer already paid (UPI, bank transfer), or
   - **No, cash on delivery** to have the courier collect the order total.
3. In Shiprocket: *Orders → New → Ship Now* (pick a courier), print the label and schedule the pickup.
4. Everything after that updates by itself. **Refresh** in the box asks Shiprocket for the latest status.
   **Track parcel** opens the courier tracking page.
5. Sent the wrong payment type? Click **Cancel in Shiprocket** (only before pickup), then send again
   (Shiprocket gives it a new number, e.g. `1024-2`).

Customers can follow their order at **Track Your Order** (footer of every page, and a button after
checkout): they enter the order number and their email.

## Troubleshooting

| Message | What to do |
|---|---|
| "Shiprocket isn't connected yet" | Step 3 not done, or not redeployed after adding the settings. |
| "Shiprocket rejected the login" | Use the **API user's** email and password, not your normal Shiprocket login. |
| "No pickup location called …" | `SHIPROCKET_PICKUP_LOCATION` must match the nickname in Shiprocket exactly. |
| "The delivery address is missing …" | Fix the order's shipping address in Medusa, then send again. |
| Status never changes after sending | Check step 5 (webhook URL, token, toggle on). Use **Refresh** meanwhile. |
| "…could not be marked as shipped in Medusa" | The courier status is still saved; mark the fulfilment in Medusa by hand. |

## Technical notes

- Code: `backend/apps/backend/src/lib/shiprocket.ts` (API client), `src/lib/order-shipping.ts`
  (send, cancel, tracking → fulfilment), `src/api/hooks/delivery-updates` (webhook),
  `src/api/admin/orders/[id]/shiprocket`, `src/api/admin/shiprocket/status`,
  `src/api/store/delivery-estimate`, `src/api/store/order-tracking`, `src/subscribers/shiprocket-*.ts`,
  `src/admin/widgets/order-shiprocket.tsx`, `src/admin/routes/settings/shiprocket`.
  Website: `track-order.html`, `js/track-order.js`, the delivery check in `js/product-page.js`,
  and the PIN code check in `js/checkout.js`.
- Everything Shiprocket-related is stored on the order as `metadata.shiprocket` (Shiprocket order id,
  shipment id, AWB, courier, status, last 30 tracking events, last error).
- Shiprocket order number = Medusa order number (`1024`); after a cancel-and-resend, `1024-2`.
- COD amount = order total (`sub_total` = total − shipping, plus `shipping_charges`).
- `/hooks/*` is routed to Medusa in `vercel.json`.
