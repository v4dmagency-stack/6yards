> **Superseded:** see [HANDOVER.md](./HANDOVER.md) for the current setup and go-live steps. This file is kept for reference.

# MEDUSA v2 STORE API REFERENCE & NOTES: 6 YARDS SAREES

This document records the exact Store API endpoints, query structures, headers, payloads, and response shapes used by the 6 Yards Sarees storefront.

---

## 1. Authentication & Headers

Every request to the Medusa v2 Store API (`/store/*`) must include:
```http
x-publishable-api-key: <pk_6yards_storefront>
Content-Type: application/json
```
For customer authenticated routes, Medusa v2 uses Bearer tokens:
```http
Authorization: Bearer <customer_jwt_token>
```

---

## 2. Product Catalog (`/store/products`)

### List Products
- **Endpoint**: `GET /store/products`
- **Query Parameters**:
  - `limit`: `number` (default: 50)
  - `offset`: `number` (default: 0)
  - `collection_id`: `string[]` (filter by collection ID)
  - `category_id`: `string[]` (filter by category ID)
  - `q`: `string` (free text search across title, description, material)
  - `order`: `created_at` | `-created_at` | `title`
  - `fields`: `*variants,*variants.calculated_price,*categories,*collection,*images`
- **Response Shape**:
  ```json
  {
    "products": [
      {
        "id": "prod_01J...",
        "title": "Gulabi Mauve Pichwai Silk Saree",
        "handle": "saree-01",
        "description": "...",
        "thumbnail": "assets/catalog/adaa/adaa-01-primary.jpg",
        "collection_id": "pcol_...",
        "collection": { "id": "pcol_...", "title": "Adaa" },
        "categories": [{ "id": "pcat_...", "name": "Silk" }],
        "images": [{ "url": "assets/catalog/..." }],
        "variants": [
          {
            "id": "variant_01J...",
            "title": "Standard Handloom Drape",
            "calculated_price": {
              "calculated_amount": 2700,
              "currency_code": "inr"
            }
          }
        ],
        "metadata": {
          "rating": 4.9,
          "reviewsCount": 94,
          "isBestSeller": true,
          "color": "Mauve Rose & Gold Zari Geometric Pallu",
          "fabric": "Fine Handloom Silk Cotton Blend",
          "weave": "Pichwai Kamdhenu, Lotus & Tassel Finish",
          "length": "6.3 Meters",
          "origin": "Varanasi, Uttar Pradesh"
        }
      }
    ],
    "count": 35,
    "offset": 0,
    "limit": 50
  }
  ```

### Retrieve Single Product
- **Endpoint**: `GET /store/products/:id`
- **Fields**: `*variants,*variants.calculated_price,*categories,*collection,*images`

---

## 3. Collections (`/store/collections`)

- **Endpoint**: `GET /store/collections`
- **Returns**: Array of collections:
  - `Adaa` (ID: `adaa`)
  - `Roop` (ID: `roop`)
  - `Vastra` (ID: `vastra`)
  - `Leher` (ID: `leher`)
  - `Riwayat` (ID: `riwayat`)

---

## 4. Cart Lifecycle (`/store/carts`)

The storefront preserves cart session by storing `cart_id` in localStorage (`6yards_medusa_cart_id`).

### Create Cart
- **Endpoint**: `POST /store/carts`
- **Payload**:
  ```json
  {
    "region_id": "reg_india",
    "sales_channel_id": "sc_6yards"
  }
  ```

### Retrieve Cart
- **Endpoint**: `GET /store/carts/:id`
- **Query**: `fields=*items,*items.variant,*shipping_methods`
- **Response Shape**:
  ```json
  {
    "cart": {
      "id": "cart_01J...",
      "items": [
        {
          "id": "item_01J...",
          "title": "Gulabi Mauve Pichwai Silk Saree",
          "variant_id": "variant_01J...",
          "quantity": 1,
          "unit_price": 2700,
          "total": 2700,
          "thumbnail": "assets/catalog/adaa/adaa-01-primary.jpg"
        }
      ],
      "subtotal": 2700,
      "tax_total": 0,
      "shipping_total": 150,
      "discount_total": 0,
      "total": 2850
    }
  }
  ```

### Add Line Item
- **Endpoint**: `POST /store/carts/:id/line-items`
- **Payload**:
  ```json
  {
    "variant_id": "variant_01J...",
    "quantity": 1
  }
  ```

### Update Line Item
- **Endpoint**: `POST /store/carts/:id/line-items/:line_id`
- **Payload**:
  ```json
  {
    "quantity": 2
  }
  ```

### Remove Line Item
- **Endpoint**: `DELETE /store/carts/:id/line-items/:line_id`

### Add Promotions / Coupons
- **Endpoint**: `POST /store/carts/:id/promotions`
- **Payload**:
  ```json
  {
    "promo_codes": ["FESTIVE10", "WELCOME6"]
  }
  ```

### Update Shipping & Customer Address
- **Endpoint**: `POST /store/carts/:id`
- **Payload**:
  ```json
  {
    "email": "customer@example.com",
    "shipping_address": {
      "first_name": "Priya",
      "last_name": "Sharma",
      "address_1": "123 Heritage Lane",
      "city": "Mumbai",
      "country_code": "in",
      "postal_code": "400001",
      "phone": "+91 98765 43210"
    }
  }
  ```

### Select Shipping Method
- **Endpoint**: `POST /store/carts/:id/shipping-methods`
- **Payload**:
  ```json
  {
    "option_id": "so_standard_delivery"
  }
  ```

---

## 5. Payments (`/store/payment-collections`)

### Initiate Payment Session
- **Endpoint**: `POST /store/payment-collections`
- **Payload**:
  ```json
  {
    "cart_id": "cart_01J..."
  }
  ```
- Followed by `POST /store/payment-collections/:id/payment-sessions` with provider:
  - Razorpay: `"provider_id": "pp_razorpay"`
  - Cash on Delivery: `"provider_id": "pp_system_default"`

### Authorize Payment Session
- For Razorpay:
  ```json
  {
    "data": {
      "razorpay_payment_id": "pay_...",
      "razorpay_order_id": "order_...",
      "razorpay_signature": "..."
    }
  }
  ```

### Complete Cart & Generate Order
- **Endpoint**: `POST /store/carts/:id/complete`
- **Response**:
  ```json
  {
    "type": "order",
    "order": {
      "id": "order_01J...",
      "display_id": 1001,
      "status": "pending",
      "total": 2850
    }
  }
  ```

---

## 6. Gotchas & Best Practices Discovered
1. **Never compute prices on the frontend**: Always read `cart.total`, `cart.subtotal`, and `cart.shipping_total` directly from the Medusa cart response.
2. **Publishable API Key is safe in the browser**: Scoped to the `6 Yards Storefront` sales channel.
3. **Local Dev Fallback**: Storefront includes automatic fallback to `PRODUCTS_DATA` if the Medusa backend is not active, ensuring zero downtime during storefront development or offline preview.
