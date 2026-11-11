/**
 * 6 Yards Sarees - Medusa v2 Store API client
 *
 * Thin REST client for the Medusa Store API. Every page awaits
 * `window.MedusaClient.ready` before deciding whether to use the live backend
 * or the bundled catalog in js/products.js (used when the backend is offline).
 */
(function () {
  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  const MEDUSA_CONFIG = {
    baseUrl: window.MEDUSA_BACKEND_URL || (isLocalHost ? 'http://localhost:9000' : window.location.origin),
    publishableApiKey: window.MEDUSA_PUBLISHABLE_KEY || '',
    cartStorageKey: '6yards_medusa_cart_id',
    currencyCode: 'inr',
    countryCode: 'in',
    healthTimeoutMs: 4000,
  };

  const PRODUCT_FIELDS = '*variants,*variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory,*collection,*categories,*images,+metadata';

  function staticCatalog() {
    return Array.isArray(window.PRODUCTS_DATA) ? window.PRODUCTS_DATA : [];
  }

  class MedusaStoreClient {
    constructor(config = {}) {
      this.config = { ...MEDUSA_CONFIG, ...config };
      this.isBackendAvailable = false;
      this.regionId = null;
      this.cart = null;
      this.cartId = safeStorageGet(this.config.cartStorageKey);
      this._productsCache = null;
      this.ready = this.init();
    }

    async init() {
      if (!this.config.publishableApiKey) {
        console.info('[Medusa] No publishable key configured; using the bundled catalog.');
        return this;
      }
      await this.checkBackendStatus();
      return this;
    }

    async request(endpoint, options = {}) {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': this.config.publishableApiKey,
          ...(options.headers || {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const err = new Error(errorData.message || `Store API error (${response.status})`);
        err.status = response.status;
        err.data = errorData;
        throw err;
      }
      return response.json();
    }

    async checkBackendStatus() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.healthTimeoutMs);
        const res = await fetch(`${this.config.baseUrl}/store/regions?limit=50`, {
          headers: { 'x-publishable-api-key': this.config.publishableApiKey },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const region = (data.regions || []).find(
            (r) => r.currency_code?.toLowerCase() === this.config.currencyCode
          );
          this.regionId = region?.id || null;
          this.isBackendAvailable = Boolean(this.regionId);
          if (!this.regionId) {
            console.warn('[Medusa] Backend reachable but no INR region exists; using the bundled catalog.');
          }
        } else {
          this.isBackendAvailable = false;
        }
      } catch (e) {
        this.isBackendAvailable = false;
      }
      console.info(`[Medusa] Backend ${this.isBackendAvailable ? 'online' : 'offline - using bundled catalog'} (${this.config.baseUrl})`);
      return this.isBackendAvailable;
    }

    /* ---------------------------------------------------------------------
       Catalog
       --------------------------------------------------------------------- */

    /** All published products, normalized to the storefront shape. */
    async listProducts() {
      await this.ready;
      if (!this.isBackendAvailable) return staticCatalog();
      if (this._productsCache) return this._productsCache;

      try {
        const products = [];
        const limit = 100;
        let offset = 0;
        // Paginate so catalogs larger than one page are fully listed.
        for (;;) {
          const query = new URLSearchParams({
            region_id: this.regionId,
            fields: PRODUCT_FIELDS,
            limit: String(limit),
            offset: String(offset),
          });
          const data = await this.request(`/store/products?${query}`);
          products.push(...(data.products || []));
          offset += limit;
          if (!data.count || offset >= data.count) break;
        }
        const normalized = this.normalizeMedusaProducts(products);
        this._productsCache = normalized.length ? normalized : staticCatalog();
        return this._productsCache;
      } catch (err) {
        console.warn('[Medusa] Product list failed; using the bundled catalog.', err);
        return staticCatalog();
      }
    }

    /** One product by storefront id or Medusa handle. */
    async getProduct(idOrHandle) {
      const list = await this.listProducts();
      return list.find((p) => p.id === idOrHandle || p.handle === idOrHandle || p.medusaId === idOrHandle) || null;
    }

    /**
     * Medusa products merged over the bundled catalog entry with the same
     * handle (or title), so storefront ids, occasions and copy stay stable even
     * if a product was created in the admin without the custom metadata.
     */
    normalizeMedusaProducts(medusaProducts) {
      const catalog = staticCatalog();
      return medusaProducts.map((mp) => {
        const meta = mp.metadata || {};
        const base =
          catalog.find((p) => p.id === meta.storefront_id) ||
          catalog.find((p) => p.id === mp.handle) ||
          catalog.find((p) => p.name?.toLowerCase() === mp.title?.toLowerCase()) ||
          {};

        const variant = (mp.variants || []).find((v) => v.calculated_price) || mp.variants?.[0] || {};
        const calculated = variant.calculated_price?.calculated_amount;
        const original = variant.calculated_price?.original_amount;
        const price = typeof calculated === 'number' ? calculated : (base.price ?? meta.price ?? 0);
        const compareAt = Number(meta.originalPrice) || (original > price ? original : null) || base.originalPrice || null;

        const imageUrls = (mp.images || []).map((img) => img.url).filter(Boolean);
        const image = mp.thumbnail || imageUrls[0] || base.image;
        const gallery = imageUrls.length ? imageUrls : (base.gallery || (image ? [image] : []));
        const collectionHandle = mp.collection?.handle || meta.collection || base.collection || '';
        const inStock = variant.manage_inventory === false || variant.inventory_quantity == null || variant.inventory_quantity > 0;

        return {
          ...base,
          id: base.id || meta.storefront_id || mp.handle || mp.id,
          handle: mp.handle,
          medusaId: mp.id,
          variantId: variant.id,
          inStock,
          name: mp.title || base.name,
          description: mp.description || base.description || '',
          category: collectionHandle || base.category,
          collection: collectionHandle,
          collectionName: mp.collection?.title
            ? `${mp.collection.title} - Curated stories, woven in six yards.`
            : (meta.collectionName || base.collectionName || ''),
          price,
          originalPrice: compareAt && compareAt > price ? compareAt : null,
          rating: meta.rating ?? base.rating,
          reviewsCount: meta.reviewsCount ?? base.reviewsCount,
          isBestSeller: meta.isBestSeller ?? base.isBestSeller ?? false,
          isNew: meta.isNew ?? base.isNew ?? false,
          tag: meta.tag || base.tag || (mp.categories?.[0]?.name || 'Handloom'),
          color: meta.color || base.color || '',
          fabric: meta.fabric || base.fabric || '',
          weave: meta.weave || base.weave || '',
          length: meta.length || base.length || '6.3 Meters (includes unstitched blouse piece)',
          origin: meta.origin || base.origin || '',
          occasion: meta.occasion || base.occasion || '',
          details: Array.isArray(meta.details) ? meta.details : (base.details || []),
          image,
          hoverImage: imageUrls[1] || base.hoverImage || image,
          gallery,
          thumbnail: meta.thumbnail || base.thumbnail || image,
        };
      });
    }

    /* ---------------------------------------------------------------------
       Cart
       --------------------------------------------------------------------- */

    async retrieveCart() {
      await this.ready;
      if (!this.isBackendAvailable || !this.cartId) return null;
      try {
        const { cart } = await this.request(`/store/carts/${this.cartId}`);
        if (cart.completed_at) {
          this.forgetCart();
          return null;
        }
        this.cart = cart;
        return cart;
      } catch (err) {
        if (err.status === 404) this.forgetCart();
        throw err;
      }
    }

    async getOrCreateCart() {
      const existing = await this.retrieveCart().catch(() => null);
      if (existing) return existing;

      const { cart } = await this.request('/store/carts', {
        method: 'POST',
        body: JSON.stringify({ region_id: this.regionId }),
      });
      this.cart = cart;
      this.cartId = cart.id;
      safeStorageSet(this.config.cartStorageKey, cart.id);
      return cart;
    }

    forgetCart() {
      this.cart = null;
      this.cartId = null;
      safeStorageRemove(this.config.cartStorageKey);
    }

    async addLineItem(variantId, quantity = 1) {
      const cart = await this.getOrCreateCart();
      const res = await this.request(`/store/carts/${cart.id}/line-items`, {
        method: 'POST',
        body: JSON.stringify({ variant_id: variantId, quantity }),
      });
      this.cart = res.cart;
      return this.cart;
    }

    async updateLineItem(lineItemId, quantity) {
      if (quantity <= 0) return this.removeLineItem(lineItemId);
      const res = await this.request(`/store/carts/${this.cartId}/line-items/${lineItemId}`, {
        method: 'POST',
        body: JSON.stringify({ quantity }),
      });
      this.cart = res.cart;
      return this.cart;
    }

    async removeLineItem(lineItemId) {
      const res = await this.request(`/store/carts/${this.cartId}/line-items/${lineItemId}`, {
        method: 'DELETE',
      });
      this.cart = res.parent || (await this.retrieveCart());
      return this.cart;
    }

    async applyPromoCode(code) {
      const cart = await this.getOrCreateCart();
      const res = await this.request(`/store/carts/${cart.id}/promotions`, {
        method: 'POST',
        body: JSON.stringify({ promo_codes: [code] }),
      });
      this.cart = res.cart;
      const applied = (res.cart.promotions || []).some((p) => p.code?.toUpperCase() === code.toUpperCase());
      return { applied, cart: res.cart };
    }

    async removePromoCode(code) {
      const res = await this.request(`/store/carts/${this.cartId}/promotions`, {
        method: 'DELETE',
        body: JSON.stringify({ promo_codes: [code] }),
      });
      this.cart = res.cart;
      return res.cart;
    }

    /* ---------------------------------------------------------------------
       Checkout
       --------------------------------------------------------------------- */

    async updateCartDetails({ email, address }) {
      const shippingAddress = {
        first_name: address.first_name,
        last_name: address.last_name,
        address_1: address.address_1,
        address_2: address.address_2 || '',
        city: address.city,
        province: address.province,
        postal_code: address.postal_code,
        country_code: this.config.countryCode,
        phone: address.phone,
      };
      const { cart } = await this.request(`/store/carts/${this.cartId}`, {
        method: 'POST',
        body: JSON.stringify({
          email,
          shipping_address: shippingAddress,
          billing_address: shippingAddress,
        }),
      });
      this.cart = cart;
      return cart;
    }

    async listShippingOptions() {
      const { shipping_options } = await this.request(`/store/shipping-options?cart_id=${this.cartId}`);
      return shipping_options || [];
    }

    async setShippingMethod(optionId) {
      const { cart } = await this.request(`/store/carts/${this.cartId}/shipping-methods`, {
        method: 'POST',
        body: JSON.stringify({ option_id: optionId }),
      });
      this.cart = cart;
      return cart;
    }

    async listPaymentProviders() {
      const { payment_providers } = await this.request(`/store/payment-providers?region_id=${this.regionId}`);
      return payment_providers || [];
    }

    async initPaymentSession(providerId) {
      const cart = this.cart || (await this.retrieveCart());
      let collectionId = cart.payment_collection?.id;
      if (!collectionId) {
        const { payment_collection } = await this.request('/store/payment-collections', {
          method: 'POST',
          body: JSON.stringify({ cart_id: cart.id }),
        });
        collectionId = payment_collection.id;
      }
      const { payment_collection } = await this.request(`/store/payment-collections/${collectionId}/payment-sessions`, {
        method: 'POST',
        body: JSON.stringify({ provider_id: providerId }),
      });
      return payment_collection;
    }

    /** Completes the cart. Resolves to the created order or throws. */
    async completeCart() {
      const res = await this.request(`/store/carts/${this.cartId}/complete`, { method: 'POST' });
      if (res.type !== 'order' || !res.order) {
        const err = new Error(res.error?.message || 'The order could not be completed. Please try again.');
        err.data = res;
        throw err;
      }
      this.forgetCart();
      return res.order;
    }
  }

  function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeStorageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
  }
  function safeStorageRemove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
  }

  window.MedusaClient = new MedusaStoreClient();
})();
