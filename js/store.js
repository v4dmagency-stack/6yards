/**
 * 6 Yards Sarees - shared storefront shell
 *
 * Loaded on every page after products.js, medusa-config.js and
 * medusa-client.js. Owns everything that is the same on every page: the cart
 * (Medusa cart when the backend is online, a local cart otherwise), wishlist,
 * drawers, header/mobile navigation, toasts, newsletter and policy modal.
 * Page scripts (app.js, collections.js, product-page.js, checkout.js) only
 * render their own content and call into `window.Store`.
 */
(function () {
  const STORAGE = {
    cart: '6yards_cart',
    wishlist: '6yards_wishlist',
    promo: '6yards_promo',
  };

  const SHOP = {
    whatsapp: '919845714481',
    phoneDisplay: '+91 98457 14481',
    email: 'sixyardsilksarees@gmail.com',
    freeShippingThreshold: 5000,
    flatShipping: 150,
    // Codes honoured when orders are confirmed manually (backend offline).
    // When Medusa is online, promotions come from Medusa Admin → Promotions.
    offlinePromos: { WELCOME10: 10 },
  };

  /* ------------------------------------------------------------------------
     Utilities
     ------------------------------------------------------------------------ */
  const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => escapeMap[ch]);
  }

  function formatINR(amount) {
    const value = Number(amount) || 0;
    return `₹ ${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage full or blocked */ }
  }

  function staticCatalog() {
    return Array.isArray(window.PRODUCTS_DATA) ? window.PRODUCTS_DATA : [];
  }

  function productUrl(product) {
    return `product.html?id=${encodeURIComponent(product.id)}`;
  }

  /* ------------------------------------------------------------------------
     Catalog (live Medusa catalog when available, bundled otherwise)
     ------------------------------------------------------------------------ */
  let catalogPromise = null;
  function getCatalog() {
    if (!catalogPromise) {
      catalogPromise = window.MedusaClient
        ? window.MedusaClient.listProducts().catch(() => staticCatalog())
        : Promise.resolve(staticCatalog());
    }
    return catalogPromise;
  }

  async function findProduct(id) {
    const catalog = await getCatalog();
    return catalog.find((p) => p.id === id || p.handle === id) || staticCatalog().find((p) => p.id === id) || null;
  }

  function isOnline() {
    return Boolean(window.MedusaClient?.isBackendAvailable);
  }

  /* ------------------------------------------------------------------------
     Toasts
     ------------------------------------------------------------------------ */
  function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.setAttribute('role', 'status');
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }

    const icons = {
      success: 'fa-circle-check',
      error: 'fa-triangle-exclamation',
      info: 'fa-circle-info',
    };
    const toast = document.createElement('div');
    toast.className = `app-toast-item toast-${type}`;
    const icon = document.createElement('i');
    icon.className = `fa-solid ${icons[type] || icons.info}`;
    const text = document.createElement('span');
    text.textContent = message;
    toast.append(icon, text);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'all 0.25s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 260);
    }, 3800);
  }

  /* ------------------------------------------------------------------------
     Body scroll lock shared by drawers / modals / mobile nav
     ------------------------------------------------------------------------ */
  function syncScrollLock() {
    const anyOpen = document.querySelector(
      '.slide-drawer.active, .modal-backdrop.active, .policy-modal-backdrop.active, .nav-menu.mobile-open'
    );
    document.body.style.overflow = anyOpen ? 'hidden' : '';
  }

  /* ------------------------------------------------------------------------
     Cart
     ------------------------------------------------------------------------ */
  const Cart = {
    mode: 'local', // 'medusa' | 'local'
    items: [],
    medusaCart: null,
    promoCode: null,
    busy: false,

    async init() {
      this.items = readJSON(STORAGE.cart, []).filter((i) => i && i.id && i.quantity > 0);
      this.promoCode = readJSON(STORAGE.promo, null);
      this.render();

      if (!window.MedusaClient) return;
      await window.MedusaClient.ready;
      if (!isOnline()) return;

      this.mode = 'medusa';
      try {
        const cart = await window.MedusaClient.retrieveCart();
        const localItems = this.items.filter((i) => !i.lineItemId);
        if (cart) this.syncFromMedusa(cart);
        if (localItems.length) await this.migrateLocalItems(localItems);
        if (!cart && !localItems.length) this.syncFromMedusa(null);
      } catch (err) {
        console.warn('[Cart] Could not load the Medusa cart.', err);
      }
      this.render();
    },

    /** Moves items added while offline into the Medusa cart. */
    async migrateLocalItems(localItems) {
      for (const item of localItems) {
        const product = await findProduct(item.id);
        if (!product?.variantId) continue;
        try {
          const cart = await window.MedusaClient.addLineItem(product.variantId, item.quantity);
          this.syncFromMedusa(cart);
        } catch (err) {
          showToast(`"${item.name}" is no longer available and was removed from your bag.`, 'error');
        }
      }
      if (!this.medusaCart) this.syncFromMedusa(null);
    },

    syncFromMedusa(cart) {
      this.medusaCart = cart;
      const catalog = staticCatalog();
      this.items = (cart?.items || []).map((item) => {
        const handle = item.product_handle || item.variant?.product?.handle;
        const match = catalog.find((p) => p.id === handle) || catalog.find((p) => p.name === item.product_title);
        return {
          id: match?.id || handle || item.product_id,
          lineItemId: item.id,
          variantId: item.variant_id,
          name: item.product_title || item.title,
          price: item.unit_price,
          image: item.thumbnail || match?.image || '',
          quantity: item.quantity,
        };
      });
      const codes = (cart?.promotions || []).map((p) => p.code).filter(Boolean);
      this.promoCode = codes[0] || null;
      this.persist();
    },

    persist() {
      writeJSON(STORAGE.cart, this.items);
      writeJSON(STORAGE.promo, this.promoCode);
    },

    count() {
      return this.items.reduce((sum, item) => sum + item.quantity, 0);
    },

    totals() {
      if (this.mode === 'medusa' && this.medusaCart) {
        const c = this.medusaCart;
        const subtotal = c.item_subtotal ?? c.subtotal ?? 0;
        const discount = c.discount_total ?? 0;
        return {
          subtotal,
          discount,
          shipping: c.shipping_methods?.length ? c.shipping_total : null,
          total: c.total ?? subtotal - discount,
        };
      }
      const subtotal = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const percent = SHOP.offlinePromos[this.promoCode] || 0;
      const discount = Math.round(subtotal * (percent / 100));
      return { subtotal, discount, shipping: null, total: subtotal - discount };
    },

    estimatedShipping(subtotalAfterDiscount) {
      return subtotalAfterDiscount >= SHOP.freeShippingThreshold || subtotalAfterDiscount === 0 ? 0 : SHOP.flatShipping;
    },

    async add(product, quantity = 1) {
      if (!product) return false;
      if (product.inStock === false) {
        showToast(`"${product.name}" is currently sold out.`, 'error');
        return false;
      }
      if (this.busy) return false;
      this.busy = true;
      try {
        if (this.mode === 'medusa') {
          let variantId = product.variantId;
          if (!variantId) variantId = (await findProduct(product.id))?.variantId;
          if (!variantId) throw new Error('This saree is not available for online purchase right now.');
          const cart = await window.MedusaClient.addLineItem(variantId, quantity);
          this.syncFromMedusa(cart);
        } else {
          const existing = this.items.find((i) => i.id === product.id);
          if (existing) {
            existing.quantity += quantity;
          } else {
            this.items.push({
              id: product.id,
              variantId: product.variantId || null,
              name: product.name,
              price: product.price,
              image: product.image,
              quantity,
            });
          }
          this.persist();
        }
        this.render();
        showToast(`Added "${product.name}" to your bag.`, 'success');
        openDrawer('cart');
        return true;
      } catch (err) {
        showToast(friendlyError(err, 'Could not add this saree to your bag. Please try again.'), 'error');
        return false;
      } finally {
        this.busy = false;
      }
    },

    async setQuantity(key, quantity) {
      const item = this.items.find((i) => (i.lineItemId || i.id) === key);
      if (!item) return;
      try {
        if (this.mode === 'medusa' && item.lineItemId) {
          const cart = quantity <= 0
            ? await window.MedusaClient.removeLineItem(item.lineItemId)
            : await window.MedusaClient.updateLineItem(item.lineItemId, quantity);
          this.syncFromMedusa(cart);
        } else {
          if (quantity <= 0) this.items = this.items.filter((i) => i !== item);
          else item.quantity = quantity;
          this.persist();
        }
      } catch (err) {
        showToast(friendlyError(err, 'Could not update your bag.'), 'error');
      }
      this.render();
    },

    changeQuantity(key, delta) {
      const item = this.items.find((i) => (i.lineItemId || i.id) === key);
      if (item) return this.setQuantity(key, item.quantity + delta);
    },

    remove(key) {
      return this.setQuantity(key, 0).then(() => showToast('Removed from your bag.'));
    },

    async applyPromo(rawCode) {
      const code = String(rawCode || '').trim().toUpperCase();
      if (!code) return;
      if (this.mode === 'medusa') {
        try {
          const { applied, cart } = await window.MedusaClient.applyPromoCode(code);
          this.syncFromMedusa(cart);
          this.render();
          showToast(applied ? `Promo code ${code} applied.` : `${code} is not valid for this bag.`, applied ? 'success' : 'error');
        } catch (err) {
          showToast(friendlyError(err, `${code} is not a valid promo code.`), 'error');
        }
        return;
      }
      if (SHOP.offlinePromos[code]) {
        this.promoCode = code;
        this.persist();
        this.render();
        showToast(`Promo code ${code} applied (${SHOP.offlinePromos[code]}% off).`, 'success');
      } else {
        showToast(`${code} is not a valid promo code.`, 'error');
      }
    },

    async removePromo() {
      if (!this.promoCode) return;
      if (this.mode === 'medusa') {
        try {
          const cart = await window.MedusaClient.removePromoCode(this.promoCode);
          this.syncFromMedusa(cart);
        } catch (err) {
          showToast(friendlyError(err, 'Could not remove the promo code.'), 'error');
        }
      } else {
        this.promoCode = null;
        this.persist();
      }
      this.render();
    },

    clear() {
      this.items = [];
      this.medusaCart = null;
      this.promoCode = null;
      this.persist();
      this.render();
    },

    render() {
      updateBadges();
      const container = document.getElementById('cart-items-container');
      if (!container) return;
      const emptyState = document.getElementById('cart-empty-state');
      const footer = document.getElementById('cart-footer-content');

      if (!this.items.length) {
        container.innerHTML = '';
        if (emptyState) emptyState.hidden = false;
        if (footer) footer.hidden = true;
        return;
      }
      if (emptyState) emptyState.hidden = true;
      if (footer) footer.hidden = false;

      container.innerHTML = this.items.map((item) => {
        const key = escapeHtml(item.lineItemId || item.id);
        return `
          <div class="cart-item-row">
            <a href="${escapeHtml(productUrl(item))}"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="cart-item-img" loading="lazy" /></a>
            <div class="cart-item-info">
              <h5><a href="${escapeHtml(productUrl(item))}">${escapeHtml(item.name)}</a></h5>
              <div class="cart-item-price">${formatINR(item.price)}</div>
              <div class="quantity-control">
                <button type="button" class="qty-btn" data-cart-qty="-1" data-key="${key}" aria-label="Decrease quantity">−</button>
                <span class="qty-value" aria-live="polite">${item.quantity}</span>
                <button type="button" class="qty-btn" data-cart-qty="1" data-key="${key}" aria-label="Increase quantity">+</button>
              </div>
            </div>
            <button type="button" class="remove-cart-item" data-cart-remove data-key="${key}" aria-label="Remove ${escapeHtml(item.name)}">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>`;
      }).join('');

      const t = this.totals();
      const shipping = t.shipping ?? this.estimatedShipping(t.total);
      setText('cart-subtotal-price', formatINR(t.subtotal));
      const discountRow = document.getElementById('cart-discount-row');
      if (discountRow) discountRow.hidden = !(t.discount > 0);
      setText('cart-discount-value', `− ${formatINR(t.discount)}`);
      setText('cart-promo-label', this.promoCode ? `Promo (${this.promoCode})` : 'Promo discount');
      setText('cart-shipping-value', shipping === 0 ? 'Free' : formatINR(shipping));
      setText('cart-final-total', formatINR(t.total + (t.shipping == null ? shipping : 0)));

      const remaining = SHOP.freeShippingThreshold - t.total;
      setText('cart-shipping-note', remaining > 0
        ? `Add ${formatINR(remaining)} more for free shipping.`
        : 'You have unlocked free shipping.');

      const promoRemove = document.getElementById('cart-promo-remove');
      if (promoRemove) promoRemove.hidden = !this.promoCode;
    },
  };

  function friendlyError(err, fallback) {
    const msg = err?.message || '';
    if (/inventory|stock/i.test(msg)) return 'Sorry, we do not have that many in stock. Please try a smaller quantity.';
    if (!msg || /Store API error|Failed to fetch|NetworkError/i.test(msg)) return fallback;
    return msg;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /* ------------------------------------------------------------------------
     Wishlist
     ------------------------------------------------------------------------ */
  const Wishlist = {
    items: [],

    init() {
      this.items = readJSON(STORAGE.wishlist, []).filter((i) => i && i.id);
      this.render();
    },

    has(id) {
      return this.items.some((i) => i.id === id);
    },

    toggle(product) {
      if (!product) return;
      if (this.has(product.id)) {
        this.items = this.items.filter((i) => i.id !== product.id);
        showToast(`Removed "${product.name}" from your wishlist.`);
      } else {
        this.items.push({ id: product.id, name: product.name, price: product.price, image: product.image });
        showToast(`Saved "${product.name}" to your wishlist.`, 'success');
      }
      this.save();
    },

    remove(id) {
      this.items = this.items.filter((i) => i.id !== id);
      this.save();
    },

    save() {
      writeJSON(STORAGE.wishlist, this.items);
      this.render();
    },

    render() {
      updateBadges();
      syncWishlistButtons();
      const container = document.getElementById('wishlist-items-container');
      if (!container) return;
      const emptyState = document.getElementById('wishlist-empty-state');
      if (!this.items.length) {
        container.innerHTML = '';
        if (emptyState) emptyState.hidden = false;
        return;
      }
      if (emptyState) emptyState.hidden = true;
      container.innerHTML = this.items.map((item) => `
        <div class="cart-item-row">
          <a href="${escapeHtml(productUrl(item))}"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="cart-item-img" loading="lazy" /></a>
          <div class="cart-item-info">
            <h5><a href="${escapeHtml(productUrl(item))}">${escapeHtml(item.name)}</a></h5>
            <div class="cart-item-price">${formatINR(item.price)}</div>
            <button type="button" class="wishlist-move-btn" data-wishlist-move="${escapeHtml(item.id)}">Move to Bag</button>
          </div>
          <button type="button" class="remove-cart-item" data-wishlist-remove="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)} from wishlist">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>`).join('');
    },
  };

  /** Keeps every heart button on the page in sync with the wishlist. */
  function syncWishlistButtons() {
    document.querySelectorAll('[data-wishlist-toggle]').forEach((btn) => {
      const active = Wishlist.has(btn.getAttribute('data-wishlist-toggle'));
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
      const icon = btn.querySelector('i');
      if (icon) icon.className = `${active ? 'fa-solid' : 'fa-regular'} fa-heart`;
    });
  }

  function updateBadges() {
    const cartCount = Cart.count();
    const wishCount = Wishlist.items.length;
    const cartBadge = document.getElementById('cart-badge-count');
    const wishBadge = document.getElementById('wishlist-badge-count');
    if (cartBadge) {
      cartBadge.textContent = cartCount;
      cartBadge.hidden = cartCount === 0;
    }
    if (wishBadge) {
      wishBadge.textContent = wishCount;
      wishBadge.hidden = wishCount === 0;
    }
  }

  /* ------------------------------------------------------------------------
     Drawers (markup is injected so every page shares one implementation)
     ------------------------------------------------------------------------ */
  function injectShellMarkup() {
    ['cart-backdrop', 'cart-drawer', 'wishlist-backdrop', 'wishlist-drawer', 'order-success-backdrop', 'quickview-backdrop']
      .forEach((id) => document.getElementById(id)?.remove());

    const shell = document.createElement('div');
    shell.id = 'store-shell';
    shell.innerHTML = `
      <div class="drawer-backdrop" id="cart-backdrop" data-close-drawer></div>
      <aside class="slide-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" aria-hidden="true">
        <div class="drawer-header">
          <h3 class="font-serif" id="cart-drawer-title">Shopping Bag</h3>
          <button class="drawer-close-btn" type="button" data-close-drawer aria-label="Close shopping bag"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="drawer-body">
          <div id="cart-empty-state" class="drawer-empty-state" hidden>
            <i class="fa-solid fa-bag-shopping"></i>
            <h4 class="font-serif">Your bag is empty</h4>
            <p>Discover six yards of grace waiting for you.</p>
            <a href="collections.html" class="drawer-empty-cta">Shop Sarees</a>
          </div>
          <div id="cart-items-container"></div>
        </div>
        <div class="drawer-footer" id="cart-footer-content" hidden>
          <form class="cart-promo-form" id="cart-promo-form">
            <label for="promo-input-field" class="visually-hidden">Promo code</label>
            <input type="text" id="promo-input-field" placeholder="Promo code" autocomplete="off" />
            <button type="submit">Apply</button>
          </form>
          <div class="cart-summary-line"><span>Subtotal</span><span id="cart-subtotal-price">₹ 0</span></div>
          <div class="cart-summary-line cart-summary-discount" id="cart-discount-row" hidden>
            <span><span id="cart-promo-label">Promo discount</span> <button type="button" id="cart-promo-remove" class="cart-promo-remove" hidden>Remove</button></span>
            <span id="cart-discount-value">− ₹ 0</span>
          </div>
          <div class="cart-summary-line"><span>Shipping</span><span id="cart-shipping-value">—</span></div>
          <p class="cart-shipping-note" id="cart-shipping-note"></p>
          <div class="cart-summary-line cart-summary-total"><span>Total</span><span id="cart-final-total">₹ 0</span></div>
          <a href="checkout.html" class="checkout-btn" id="checkout-btn">Proceed to Checkout <i class="fa-solid fa-arrow-right"></i></a>
        </div>
      </aside>

      <div class="drawer-backdrop" id="wishlist-backdrop" data-close-drawer></div>
      <aside class="slide-drawer" id="wishlist-drawer" role="dialog" aria-modal="true" aria-labelledby="wishlist-drawer-title" aria-hidden="true">
        <div class="drawer-header">
          <h3 class="font-serif" id="wishlist-drawer-title">Saved Sarees</h3>
          <button class="drawer-close-btn" type="button" data-close-drawer aria-label="Close wishlist"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="drawer-body">
          <div id="wishlist-empty-state" class="drawer-empty-state" hidden>
            <i class="fa-regular fa-heart"></i>
            <h4 class="font-serif">No saved sarees yet</h4>
            <p>Tap the heart on any saree to save it for later.</p>
          </div>
          <div id="wishlist-items-container"></div>
        </div>
      </aside>`;
    document.body.appendChild(shell);
  }

  let lastFocused = null;
  function openDrawer(name) {
    closeDrawers(false);
    closeMobileNav();
    const drawer = document.getElementById(`${name}-drawer`);
    if (!drawer) return;
    lastFocused = document.activeElement;
    drawer.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
    document.getElementById(`${name}-backdrop`)?.classList.add('active');
    syncScrollLock();
    setTimeout(() => drawer.querySelector('.drawer-close-btn')?.focus(), 50);
  }

  function closeDrawers(restoreFocus = true) {
    document.querySelectorAll('.slide-drawer.active').forEach((d) => {
      d.classList.remove('active');
      d.setAttribute('aria-hidden', 'true');
    });
    document.querySelectorAll('.drawer-backdrop.active').forEach((b) => b.classList.remove('active'));
    syncScrollLock();
    if (restoreFocus && lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  /* ------------------------------------------------------------------------
     Header: mobile nav, Sarees dropdown, scroll styles
     ------------------------------------------------------------------------ */
  function closeMobileNav() {
    const navMenu = document.getElementById('nav-menu-list');
    if (!navMenu || !navMenu.classList.contains('mobile-open')) return;
    navMenu.classList.remove('open', 'mobile-open');
    document.getElementById('mobile-nav-backdrop')?.classList.remove('active');
    document.body.classList.remove('mobile-nav-open');
    document.getElementById('mobile-nav-toggle-btn')?.setAttribute('aria-expanded', 'false');
    syncScrollLock();
  }

  function initMobileNav() {
    const toggleBtn = document.getElementById('mobile-nav-toggle-btn');
    const navMenu = document.getElementById('nav-menu-list');
    if (!toggleBtn || !navMenu) return;
    if (!document.getElementById('mobile-nav-backdrop')) {
      const backdrop = document.createElement('div');
      backdrop.className = 'mobile-nav-backdrop';
      backdrop.id = 'mobile-nav-backdrop';
      document.body.appendChild(backdrop);
    }
    const backdrop = document.getElementById('mobile-nav-backdrop');

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navMenu.classList.contains('mobile-open')) {
        closeMobileNav();
        return;
      }
      closeDrawers(false);
      navMenu.classList.add('open', 'mobile-open');
      backdrop.classList.add('active');
      document.body.classList.add('mobile-nav-open');
      toggleBtn.setAttribute('aria-expanded', 'true');
      syncScrollLock();
    });
    document.getElementById('mobile-nav-close-btn')?.addEventListener('click', closeMobileNav);
    backdrop.addEventListener('click', closeMobileNav);
    navMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', (e) => {
        // On mobile the "Sarees" link expands its submenu instead of navigating.
        if (link.id === 'nav-sarees-link' && window.matchMedia('(max-width: 992px)').matches) {
          const item = document.getElementById('nav-sarees-item');
          if (item && !item.classList.contains('open')) {
            e.preventDefault();
            item.classList.add('open');
            link.setAttribute('aria-expanded', 'true');
            return;
          }
        }
        closeMobileNav();
      });
    });
  }

  function initSareesDropdown() {
    const item = document.getElementById('nav-sarees-item');
    const link = document.getElementById('nav-sarees-link');
    if (!item || !link) return;
    link.setAttribute('aria-haspopup', 'true');
    link.setAttribute('aria-expanded', 'false');
    let closeTimer = null;
    const isDesktop = () => window.matchMedia('(min-width: 993px)').matches;
    const open = () => {
      clearTimeout(closeTimer);
      item.classList.add('open');
      link.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      item.classList.remove('open');
      link.setAttribute('aria-expanded', 'false');
    };
    item.addEventListener('mouseenter', () => { if (isDesktop()) open(); });
    item.addEventListener('mouseleave', () => {
      if (!isDesktop()) return;
      clearTimeout(closeTimer);
      closeTimer = setTimeout(close, 250);
    });
    item.addEventListener('focusin', () => { if (isDesktop()) open(); });
    item.addEventListener('focusout', (e) => {
      if (isDesktop() && !item.contains(e.relatedTarget)) close();
    });
    document.addEventListener('click', (e) => {
      if (!item.contains(e.target)) close();
    });
  }

  function initHeaderScroll() {
    const header = document.querySelector('.header-main');
    if (!header) return;
    const hero = document.getElementById('hero-banner');
    const update = () => {
      if (hero) {
        const headerHeight = header.offsetHeight || 82;
        header.classList.toggle('header-glass', hero.getBoundingClientRect().bottom > headerHeight + 20);
      } else {
        header.classList.remove('header-glass');
      }
      header.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------------
     Newsletter (stored as a Medusa customer with newsletter opt-in)
     ------------------------------------------------------------------------ */
  function initNewsletter() {
    document.querySelectorAll('#newsletter-form, .newsletter-form').forEach((form) => {
      if (form.dataset.bound) return;
      form.dataset.bound = 'true';
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = form.querySelector('input[type="email"]');
        const email = input?.value.trim() || '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          showToast('Please enter a valid email address.', 'error');
          return;
        }
        const button = form.querySelector('button[type="submit"]');
        if (button) button.disabled = true;
        try {
          await window.MedusaClient?.ready;
          if (!isOnline()) throw new Error('offline');
          await window.MedusaClient.request('/store/newsletter', {
            method: 'POST',
            body: JSON.stringify({ email }),
          });
          showToast('Thank you for subscribing! Use WELCOME10 for 10% off your first order.', 'success');
          if (input) input.value = '';
        } catch (err) {
          showToast(`We couldn't subscribe you right now. Please email ${SHOP.email} and we'll add you.`, 'error');
        } finally {
          if (button) button.disabled = false;
        }
      });
    });
  }

  /* ------------------------------------------------------------------------
     Customer care / policy modal
     ------------------------------------------------------------------------ */
  const POLICY_TABS = [
    ['shipping', 'Shipping'],
    ['returns', 'Returns & Exchanges'],
    ['size', 'Size Guide'],
    ['faq', 'FAQs'],
    ['terms', 'Terms'],
    ['privacy', 'Privacy'],
  ];

  function policyContent() {
    return {
      shipping: `
        <h4>Shipping Across India</h4>
        <ul>
          <li><strong>Free shipping</strong> on all orders of ${formatINR(SHOP.freeShippingThreshold)} and above. A flat ${formatINR(SHOP.flatShipping)} applies to smaller orders.</li>
          <li><strong>Dispatch:</strong> within 1–2 business days of order confirmation.</li>
          <li><strong>Delivery:</strong> metro cities in 2–3 business days, rest of India in 3–5 business days.</li>
          <li><strong>Tracking:</strong> you will receive tracking details by SMS/WhatsApp and email once your saree ships.</li>
          <li>Every saree is wrapped in muslin to keep it protected in transit.</li>
        </ul>`,
      returns: `
        <h4>7-Day Returns & Exchanges</h4>
        <p>If you are not delighted with your saree, contact us within 7 days of delivery for an exchange or refund.</p>
        <ul>
          <li><strong>Condition:</strong> unused, unwashed and unaltered, with all original tags and packaging.</li>
          <li><strong>How:</strong> WhatsApp or call ${SHOP.phoneDisplay}, or email ${SHOP.email}, with your order number.</li>
          <li><strong>Refunds:</strong> issued to the original payment method (or UPI for cash-on-delivery orders) within 5–7 business days after the return is inspected.</li>
        </ul>`,
      size: `
        <h4>Saree Size Guide</h4>
        <ul>
          <li><strong>Saree length:</strong> approx. 5.5 metres.</li>
          <li><strong>Blouse piece:</strong> approx. 0.8 metres, unstitched (total length approx. 6.3 metres).</li>
          <li><strong>Width:</strong> approx. 45–48 inches (114–122 cm).</li>
          <li><strong>Care:</strong> dry clean only. Store folded in a breathable cotton or muslin cloth, away from direct sunlight.</li>
        </ul>
        <p>Handwoven sarees can vary slightly in length and colour; this is a natural part of handloom craft.</p>`,
      faq: `
        <h4>Frequently Asked Questions</h4>
        <ul>
          <li><strong>What fabric is my saree?</strong> The exact fabric, weave and origin are listed on every product page under “Product Details”.</li>
          <li><strong>Do the colours match the photos?</strong> We photograph each saree in natural light, but screens vary. Message us for extra photos or a video call before you buy.</li>
          <li><strong>Can I see a saree on video first?</strong> Yes. WhatsApp ${SHOP.phoneDisplay} to book a private video preview.</li>
          <li><strong>Which payment methods do you accept?</strong> Payment options are shown at checkout.</li>
        </ul>`,
      terms: `
        <h4>Terms & Authenticity</h4>
        <p>Our sarees are sourced from handloom weaving clusters across India. Minor irregularities in weave, slub and colour are natural hallmarks of handloom work and are not defects.</p>
        <p>Prices are in Indian Rupees and inclusive of applicable taxes. We reserve the right to cancel an order if an item is unavailable, in which case any payment is refunded in full.</p>`,
      privacy: `
        <h4>Privacy Policy</h4>
        <p>We use your name, contact details and address only to process and deliver your order and to respond to your enquiries. If you subscribe to our newsletter we will email you about new arrivals and offers; you can unsubscribe at any time.</p>
        <p>We never sell your personal information. Card and banking details are handled by our payment partner and are never stored on our servers.</p>`,
    };
  }

  function openCarePolicyModal(tab = 'shipping') {
    let modal = document.getElementById('care-policy-modal');
    if (!modal) {
      const content = policyContent();
      modal = document.createElement('div');
      modal.id = 'care-policy-modal';
      modal.className = 'policy-modal-backdrop';
      modal.innerHTML = `
        <div class="policy-modal-card" role="dialog" aria-modal="true" aria-labelledby="policy-modal-title">
          <div class="policy-modal-header">
            <h3 id="policy-modal-title">Customer Care</h3>
            <button class="policy-modal-close-btn" type="button" data-policy-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="policy-modal-tabs" role="tablist">
            ${POLICY_TABS.map(([id, label]) => `<button class="policy-tab-btn" type="button" role="tab" data-tab="${id}">${label}</button>`).join('')}
          </div>
          <div class="policy-modal-body">
            ${POLICY_TABS.map(([id]) => `<div class="policy-tab-pane" id="pane-${id}" role="tabpanel">${content[id]}</div>`).join('')}
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('[data-policy-close]')) closeCarePolicyModal();
        const tabBtn = e.target.closest('.policy-tab-btn');
        if (tabBtn) switchPolicyTab(tabBtn.dataset.tab);
      });
    }
    modal.classList.add('active');
    switchPolicyTab(tab);
    syncScrollLock();
    modal.querySelector('.policy-modal-close-btn')?.focus();
  }

  function closeCarePolicyModal() {
    document.getElementById('care-policy-modal')?.classList.remove('active');
    syncScrollLock();
  }

  function switchPolicyTab(tabId) {
    document.querySelectorAll('.policy-tab-btn').forEach((btn) => {
      const active = btn.dataset.tab === tabId;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.policy-tab-pane').forEach((pane) => {
      pane.classList.toggle('active', pane.id === `pane-${tabId}`);
    });
  }

  /* ------------------------------------------------------------------------
     Global event delegation
     ------------------------------------------------------------------------ */
  function initDelegatedEvents() {
    document.addEventListener('click', async (e) => {
      const target = e.target;

      if (target.closest('#cart-toggle-btn')) { openDrawer('cart'); return; }
      if (target.closest('#wishlist-toggle-btn')) { openDrawer('wishlist'); return; }
      if (target.closest('[data-close-drawer]')) { closeDrawers(); return; }

      const qtyBtn = target.closest('[data-cart-qty]');
      if (qtyBtn) { Cart.changeQuantity(qtyBtn.dataset.key, Number(qtyBtn.dataset.cartQty)); return; }

      const removeBtn = target.closest('[data-cart-remove]');
      if (removeBtn) { Cart.remove(removeBtn.dataset.key); return; }

      if (target.closest('#cart-promo-remove')) { Cart.removePromo(); return; }

      const heart = target.closest('[data-wishlist-toggle]');
      if (heart) {
        e.preventDefault();
        e.stopPropagation();
        Wishlist.toggle(await findProduct(heart.getAttribute('data-wishlist-toggle')));
        return;
      }

      const addBtn = target.closest('[data-add-to-cart]');
      if (addBtn) {
        e.preventDefault();
        Cart.add(await findProduct(addBtn.getAttribute('data-add-to-cart')));
        return;
      }

      const moveBtn = target.closest('[data-wishlist-move]');
      if (moveBtn) {
        const id = moveBtn.getAttribute('data-wishlist-move');
        const added = await Cart.add(await findProduct(id));
        if (added) Wishlist.remove(id);
        return;
      }

      const wishRemove = target.closest('[data-wishlist-remove]');
      if (wishRemove) { Wishlist.remove(wishRemove.getAttribute('data-wishlist-remove')); return; }

      const policyLink = target.closest('[data-policy]');
      if (policyLink) { e.preventDefault(); openCarePolicyModal(policyLink.getAttribute('data-policy')); return; }

      if (target.closest('#scroll-top-btn')) { window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });

    document.addEventListener('submit', (e) => {
      if (e.target.id === 'cart-promo-form') {
        e.preventDefault();
        const input = document.getElementById('promo-input-field');
        Cart.applyPromo(input?.value).then(() => { if (input) input.value = ''; });
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      closeDrawers();
      closeMobileNav();
      closeCarePolicyModal();
    });

    // Keep tabs in sync when the bag changes in another tab.
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE.cart && Cart.mode === 'local') {
        Cart.items = readJSON(STORAGE.cart, []);
        Cart.render();
      }
      if (e.key === STORAGE.wishlist) {
        Wishlist.items = readJSON(STORAGE.wishlist, []);
        Wishlist.render();
      }
    });
  }

  function markActiveNav() {
    const page = (window.location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
    document.querySelectorAll('.nav-menu .nav-link').forEach((link) => {
      const target = (link.getAttribute('href') || '').split('?')[0].replace(/\.html$/, '');
      const active = target === page || (page === 'product' && target === 'collections');
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */
  function boot() {
    injectShellMarkup();
    initDelegatedEvents();
    initMobileNav();
    initSareesDropdown();
    initHeaderScroll();
    initNewsletter();
    markActiveNav();
    Wishlist.init();
    Cart.init().finally(resolveReady);
  }

  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });

  window.Store = {
    ready,
    SHOP,
    Cart,
    Wishlist,
    escapeHtml,
    formatINR,
    getCatalog,
    findProduct,
    isOnline,
    productUrl,
    showToast,
    openDrawer,
    closeDrawers,
    syncWishlistButtons,
    syncScrollLock,
  };

  // Globals kept for inline handlers that already exist in the HTML.
  window.showToast = showToast;
  window.openCarePolicyModal = openCarePolicyModal;
  window.closeCarePolicyModal = closeCarePolicyModal;
  window.switchPolicyTab = switchPolicyTab;
  window.openCartDrawer = () => openDrawer('cart');
  window.closeCartDrawer = () => closeDrawers();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
