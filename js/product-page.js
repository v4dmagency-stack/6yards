/**
 * 6 Yards Sarees - Product Detail Page Controller (Image 3 Style)
 */

const PdpState = {
  product: null,
  quantity: 1,
  activeImageIndex: 0,
  cart: JSON.parse(localStorage.getItem('6yards_cart')) || [],
  wishlist: JSON.parse(localStorage.getItem('6yards_wishlist')) || [],
  appliedDiscount: 0,
  appliedCoupon: null,
};

document.addEventListener('DOMContentLoaded', () => {
  initProductPage();
  initCart();
  initWishlist();
  initMobileNav();
  updateHeaderBadges();
});

/**
 * Initialize PDP with URL Query Parameter (?id=saree-01)
 */
function initProductPage() {
  const urlParams = new URLSearchParams(window.location.search);
  let productId = urlParams.get('id');

  if (typeof PRODUCTS_DATA === 'undefined' || !Array.isArray(PRODUCTS_DATA)) {
    console.error('PRODUCTS_DATA not loaded');
    return;
  }

  // Find product or fallback to saree-01
  let product = PRODUCTS_DATA.find(p => p.id === productId);
  if (!product && PRODUCTS_DATA.length > 0) {
    product = PRODUCTS_DATA[0];
  }

  if (!product) return;
  PdpState.product = product;

  // Sync with live Medusa catalog if available
  if (window.MedusaClient) {
    window.MedusaClient.listProducts().then(liveList => {
      if (liveList && liveList.length > 0) {
        const liveMatch = liveList.find(p => p.id === productId);
        if (liveMatch) {
          PdpState.product = liveMatch;
          renderProductDetails(liveMatch);
          renderRecommendations(liveList, liveMatch);
        }
      }
    }).catch(() => {});
  }

  renderProductDetails(product);
  renderRecommendations(PRODUCTS_DATA, product);
}

/**
 * Populate Product Information on PDP (Image 3)
 */
function renderProductDetails(product) {
  // Page Meta
  document.title = `${product.name} | 6 Yards Luxury Handlooms`;
  const metaDesc = document.getElementById('page-meta-desc');
  if (metaDesc) metaDesc.content = product.description || `Handcrafted ${product.name} at 6 Yards.`;

  // Breadcrumbs
  const crumbCol = document.getElementById('pdp-crumb-collection');
  const crumbTitle = document.getElementById('pdp-crumb-title');
  if (crumbCol) {
    const colName = product.collectionName ? product.collectionName.split(' - ')[0] : 'Silk Sarees';
    crumbCol.innerText = colName;
    crumbCol.href = `collections.html?collection=${encodeURIComponent(product.collection || product.category)}`;
  }
  if (crumbTitle) crumbTitle.innerText = product.name;

  // Title, Brand & Ratings
  const brandCol = document.getElementById('pdp-brand-collection');
  const titleEl = document.getElementById('pdp-saree-title');
  const ratingEl = document.getElementById('pdp-rating-val');
  const reviewEl = document.getElementById('pdp-review-count');

  if (brandCol) {
    const colPart = product.collectionName ? product.collectionName.split(' - ')[0].toUpperCase() : 'HEIRLOOM SILK';
    const occPart = product.occasion ? ` • ${product.occasion.toUpperCase()} EDIT` : '';
    brandCol.innerText = `6 YARDS • ${colPart}${occPart}`;
  }
  if (titleEl) titleEl.innerText = product.name;
  if (ratingEl) ratingEl.innerText = product.rating || '4.9';
  if (reviewEl) reviewEl.innerText = `(${product.reviewsCount || 88} Verified Patron Reviews)`;

  // Pricing
  const currentPriceEl = document.getElementById('pdp-current-price');
  const origPriceEl = document.getElementById('pdp-original-price');
  const discountTag = document.getElementById('pdp-discount-tag');

  const formattedPrice = Number(product.price).toLocaleString('en-IN');
  if (currentPriceEl) currentPriceEl.innerText = `Rs. ${formattedPrice}.00`;

  if (product.originalPrice && product.originalPrice > product.price) {
    const formattedOrig = Number(product.originalPrice).toLocaleString('en-IN');
    if (origPriceEl) {
      origPriceEl.innerText = `Rs. ${formattedOrig}.00`;
      origPriceEl.style.display = 'inline';
    }
    const percent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    if (discountTag) {
      discountTag.innerText = `Save ${percent}%`;
      discountTag.style.display = 'inline-block';
    }
  } else {
    if (origPriceEl) origPriceEl.style.display = 'none';
    if (discountTag) discountTag.style.display = 'none';
  }

  // SKU / Item Code
  const skuEl = document.getElementById('pdp-item-code');
  const itemCodeDetail = product.details ? product.details.find(d => d.includes('Item Code:')) : null;
  if (skuEl) skuEl.innerText = itemCodeDetail ? itemCodeDetail : `Item Code: 6YD-${product.id.toUpperCase()}`;

  // Gallery Setup
  setupGallery(product);

  // Specifications Accordion Table
  const specFabric = document.getElementById('spec-fabric');
  const specWeave = document.getElementById('spec-weave');
  const specColor = document.getElementById('spec-color');
  const specLength = document.getElementById('spec-length');
  const specOrigin = document.getElementById('spec-origin');

  if (specFabric) specFabric.innerText = product.fabric || 'Pure Handloom Silk';
  if (specWeave) specWeave.innerText = product.weave || 'Traditional Loomcraft';
  if (specColor) specColor.innerText = product.color || 'Royal Handloom Palette';
  if (specLength) specLength.innerText = product.length || '6.3 Meters (includes unstitched blouse piece)';
  if (specOrigin) specOrigin.innerText = product.origin || 'Varanasi, Uttar Pradesh';

  // Design Description & Bullets
  const descEl = document.getElementById('pdp-design-desc');
  const bulletsEl = document.getElementById('pdp-details-bullets');
  if (descEl) descEl.innerText = product.description || '';

  if (bulletsEl && product.details) {
    bulletsEl.innerHTML = product.details.map(bullet => `<li>${bullet}</li>`).join('');
  }
}

/**
 * Photoshoot Multi-Angle Gallery
 */
function setupGallery(product) {
  const mainImg = document.getElementById('pdp-main-image');
  const thumbStrip = document.getElementById('pdp-thumbnail-strip');
  const badgeEl = document.getElementById('pdp-photo-badge');

  if (badgeEl) {
    badgeEl.innerHTML = `<i class="fa-solid fa-certificate"></i> ${product.tag || 'Pure Handloom Silk'}`;
  }

  // Build full photo angles array
  let photos = [];
  if (product.gallery && product.gallery.length > 0) {
    photos = [...product.gallery];
  } else {
    photos = [product.image];
    if (product.hoverImage) photos.push(product.hoverImage);
  }

  // Ensure primary image is first
  if (!photos.includes(product.image)) {
    photos.unshift(product.image);
  }

  // Set main image
  if (mainImg) {
    mainImg.src = photos[0];
    mainImg.alt = `${product.name} Photoshoot Drape`;
    if (product.thumbnail) {
      mainImg.onerror = () => { mainImg.src = product.thumbnail; };
    }
  }

  // Render thumbnails
  if (thumbStrip) {
    thumbStrip.innerHTML = photos.map((src, index) => `
      <div class="pdp-thumb-item ${index === 0 ? 'active' : ''}" onclick="switchPdpPhoto('${src}', this)" title="Angle ${index + 1}">
        <img src="${src}" alt="${product.name} angle ${index + 1}" loading="lazy" />
      </div>
    `).join('');
  }
}

function switchPdpPhoto(newSrc, thumbEl) {
  const mainImg = document.getElementById('pdp-main-image');
  if (mainImg) {
    mainImg.style.opacity = '0.4';
    setTimeout(() => {
      mainImg.src = newSrc;
      mainImg.style.opacity = '1';
    }, 150);
  }

  document.querySelectorAll('.pdp-thumb-item').forEach(el => el.classList.remove('active'));
  if (thumbEl) thumbEl.classList.add('active');
}

/**
 * Quantity Controller
 */
function changePdpQty(delta) {
  const qtyEl = document.getElementById('pdp-qty-val');
  let current = PdpState.quantity + delta;
  if (current < 1) current = 1;
  if (current > 10) current = 10;
  PdpState.quantity = current;
  if (qtyEl) qtyEl.innerText = current;
}

/**
 * Add To Cart from PDP
 */
function handlePdpAddToCart() {
  if (!PdpState.product) return;
  addToCart(PdpState.product, PdpState.quantity);
}

/**
 * Buy It Now from PDP (Image 3)
 */
function handlePdpBuyNow() {
  if (!PdpState.product) return;
  addToCart(PdpState.product, PdpState.quantity);
  handleCheckout();
}

/**
 * Accordion Expand / Collapse
 */
function togglePdpAccordion(buttonEl) {
  const item = buttonEl.closest('.pdp-accordion-item');
  if (item) {
    item.classList.toggle('open');
  }
}

/**
 * Render "You May Also Like" 4-Card Recommendations Section (Image 3)
 */
function renderRecommendations(allProducts, currentProduct) {
  const container = document.getElementById('pdp-recommendations-container');
  if (!container) return;

  // Filter recommendations: same collection or category, excluding current product
  let related = allProducts.filter(p => p.id !== currentProduct.id && (p.collection === currentProduct.collection || p.category === currentProduct.category));

  // If fewer than 4, fill with other best sellers
  if (related.length < 4) {
    const others = allProducts.filter(p => p.id !== currentProduct.id && !related.some(r => r.id === p.id));
    related = [...related, ...others];
  }

  const selectedFour = related.slice(0, 4);

  container.innerHTML = selectedFour.map(item => {
    const isWishlisted = PdpState.wishlist.some(w => w.id === item.id);
    const formattedPrice = Number(item.price).toLocaleString('en-IN');
    const hoverImg = item.hoverImage || (item.gallery && item.gallery[1]) || item.image;

    return `
      <div class="catalog-saree-card" data-product-id="${item.id}">
        <a href="product.html?id=${encodeURIComponent(item.id)}" class="catalog-card-image-box" aria-label="View ${item.name}">
          <img src="${item.image}" alt="${item.name}" class="img-main" loading="lazy" />
          <img src="${hoverImg}" alt="${item.name} drape" class="img-hover" loading="lazy" />
          
          <span class="product-badge-tag">${item.tag || 'Handloom'}</span>
          
          <button class="wishlist-heart-btn ${isWishlisted ? 'active' : ''}" 
                  type="button" 
                  title="Save to Wishlist" 
                  aria-label="Wishlist ${item.name}"
                  onclick="handlePdpWishlistClick(event, '${item.id}')">
            <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
        </a>

        <div class="catalog-card-content">
          <span class="catalog-card-tag">${item.collectionName ? item.collectionName.split(' - ')[0] : 'Pure Silk'}</span>
          <a href="product.html?id=${encodeURIComponent(item.id)}" class="catalog-card-title" title="${item.name}">
            ${item.name}
          </a>
          <div class="catalog-card-price-row">
            <span class="catalog-card-price">Rs. ${formattedPrice}.00</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handlePdpWishlistClick(event, productId) {
  event.preventDefault();
  event.stopPropagation();
  const product = PRODUCTS_DATA.find(p => p.id === productId);
  if (!product) return;

  const btn = event.currentTarget;
  const isPresent = PdpState.wishlist.some(p => p.id === productId);

  if (isPresent) {
    PdpState.wishlist = PdpState.wishlist.filter(p => p.id !== productId);
    btn.classList.remove('active');
    btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
    showToast(`Removed from saved list.`);
  } else {
    PdpState.wishlist.push(product);
    btn.classList.add('active');
    btn.innerHTML = '<i class="fa-solid fa-heart"></i>';
    showToast(`Saved "${product.name}" to your wishlist.`);
  }

  localStorage.setItem('6yards_wishlist', JSON.stringify(PdpState.wishlist));
  updateHeaderBadges();
  renderWishlist();
}

/* ==========================================================================
   CART & WISHLIST CONTROLS
   ========================================================================== */
function initCart() {
  const cartBtn = document.getElementById('cart-toggle-btn');
  const cartCloseBtn = document.getElementById('cart-close-btn');
  const cartBackdrop = document.getElementById('cart-backdrop');
  const checkoutBtn = document.getElementById('checkout-btn');
  const promoBtn = document.getElementById('apply-promo-btn');

  if (cartBtn) cartBtn.addEventListener('click', openCartDrawer);
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCartDrawer);
  if (cartBackdrop) cartBackdrop.addEventListener('click', closeCartDrawer);
  if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);
  if (promoBtn) promoBtn.addEventListener('click', applyPromoCode);

  renderCart();
}

function openCartDrawer() {
  closeWishlistDrawer();
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (drawer) drawer.classList.add('active');
  if (backdrop) backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (drawer) drawer.classList.remove('active');
  if (backdrop) backdrop.classList.remove('active');
  document.body.style.overflow = '';
}

function addToCart(product, quantity = 1) {
  const existingIndex = PdpState.cart.findIndex(i => i.id === product.id);
  if (existingIndex > -1) {
    PdpState.cart[existingIndex].quantity += quantity;
  } else {
    PdpState.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      fabric: product.fabric,
      weave: product.weave,
      quantity: quantity
    });
  }

  saveCart();
  renderCart();
  updateHeaderBadges();
  openCartDrawer();
  showToast(`Added ${quantity}x "${product.name}" to your shopping bag.`);

  // Medusa v2 Sync
  if (window.MedusaClient) {
    window.MedusaClient.addLineItem(product.id, quantity).catch(err => {
      console.warn('[Medusa v2] Line item sync status:', err.message);
    });
  }
}

function updateCartItemQty(productId, delta) {
  const itemIndex = PdpState.cart.findIndex(i => i.id === productId);
  if (itemIndex > -1) {
    PdpState.cart[itemIndex].quantity += delta;
    if (PdpState.cart[itemIndex].quantity <= 0) {
      PdpState.cart.splice(itemIndex, 1);
    }
    saveCart();
    renderCart();
    updateHeaderBadges();
  }
}

function removeFromCart(productId) {
  PdpState.cart = PdpState.cart.filter(i => i.id !== productId);
  saveCart();
  renderCart();
  updateHeaderBadges();
}

function saveCart() {
  localStorage.setItem('6yards_cart', JSON.stringify(PdpState.cart));
}

function renderCart() {
  const container = document.getElementById('cart-items-container');
  const emptyState = document.getElementById('cart-empty-state');
  const footerContent = document.getElementById('cart-footer-content');
  const subtotalEl = document.getElementById('cart-subtotal-price');
  const totalEl = document.getElementById('cart-final-total');
  const discountRow = document.getElementById('cart-discount-row');
  const discountVal = document.getElementById('cart-discount-value');

  if (!container) return;

  if (PdpState.cart.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    if (footerContent) footerContent.style.opacity = '0.5';
    if (subtotalEl) subtotalEl.innerText = '₹ 0';
    if (totalEl) totalEl.innerText = '₹ 0';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (footerContent) footerContent.style.opacity = '1';

  let subtotal = 0;
  container.innerHTML = PdpState.cart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div class="cart-item-row" style="display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--color-border);">
        <img src="${item.image}" alt="${item.name}" style="width: 64px; height: 84px; object-fit: cover; border-radius: 4px;" />
        <div style="flex: 1;">
          <h5 style="font-size: 0.9rem; font-weight: 500; margin-bottom: 4px;">${item.name}</h5>
          <div style="font-size: 0.85rem; color: var(--color-maroon); font-weight: 600; margin-bottom: 8px;">₹ ${Number(item.price).toLocaleString('en-IN')}</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button onclick="updateCartItemQty('${item.id}', -1)" style="width: 24px; height: 24px; border: 1px solid var(--color-border); border-radius: 2px;">-</button>
            <span style="font-size: 0.85rem; font-weight: 600; min-width: 18px; text-align: center;">${item.quantity}</span>
            <button onclick="updateCartItemQty('${item.id}', 1)" style="width: 24px; height: 24px; border: 1px solid var(--color-border); border-radius: 2px;">+</button>
            <button onclick="removeFromCart('${item.id}')" style="margin-left: auto; color: var(--color-text-light); font-size: 0.8rem; text-decoration: underline;">Remove</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const discountAmount = Math.round(subtotal * (PdpState.appliedDiscount / 100));
  const finalTotal = subtotal - discountAmount;

  if (subtotalEl) subtotalEl.innerText = `₹ ${subtotal.toLocaleString('en-IN')}`;
  if (totalEl) totalEl.innerText = `₹ ${finalTotal.toLocaleString('en-IN')}`;

  if (PdpState.appliedDiscount > 0 && discountRow && discountVal) {
    discountRow.style.display = 'flex';
    discountVal.innerText = `- ₹ ${discountAmount.toLocaleString('en-IN')} (${PdpState.appliedDiscount}%)`;
  }

}

function applyPromoCode() {
  const input = document.getElementById('promo-input-field');
  if (!input) return;
  const code = input.value.trim().toUpperCase();

  if (code === 'WELCOME10') {
    PdpState.appliedDiscount = 10;
    PdpState.appliedCoupon = code;
    showToast('Promo code WELCOME10 applied (10% OFF)!');
    renderCart();
  } else if (code === 'UTSAV20' && getCartSubtotal() >= 5000) {
    PdpState.appliedDiscount = 20;
    PdpState.appliedCoupon = code;
    showToast('Promo code UTSAV20 applied (20% OFF)!');
    renderCart();
  } else {
    showToast('Invalid or ineligible promo code. Try WELCOME10.');
  }
}

function getCartSubtotal() {
  return PdpState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

/* ==========================================================================
   CHECKOUT (Razorpay & Medusa v2 Integration)
   ========================================================================== */
async function handleCheckout() {
  if (PdpState.cart.length === 0) {
    showToast('Your shopping bag is empty.');
    return;
  }

  const subtotal = getCartSubtotal();
  const discount = Math.round(subtotal * (PdpState.appliedDiscount / 100));
  const finalAmount = subtotal - discount;

  showToast('Initiating secure checkout with Medusa v2...');

  if (typeof Razorpay !== 'undefined') {
    const options = {
      key: "rzp_test_6YardsHandloomDemo",
      amount: finalAmount * 100,
      currency: "INR",
      name: "6 Yards Sarees",
      description: "Authentic Handloom Saree Order",
      image: "assets/brand-logo-peacock-clean.png",
      handler: function (response) {
        completeOrderSuccess(response.razorpay_payment_id || 'RZP_DEMO_98234');
      },
      prefill: {
        name: "Valued Patron",
        email: "patron@example.com",
        contact: "9845714481"
      },
      theme: {
        color: "#6B1426"
      }
    };
    try {
      const rzp = new Razorpay(options);
      rzp.open();
    } catch (e) {
      completeOrderSuccess('RZP_MANUAL_' + Date.now().toString().slice(-6));
    }
  } else {
    completeOrderSuccess('6YD_ORDER_' + Date.now().toString().slice(-6));
  }
}

function completeOrderSuccess(paymentId) {
  closeCartDrawer();
  const orderId = '6YD-' + Math.floor(1000 + Math.random() * 9000);
  const idEl = document.getElementById('confirmed-order-id');
  if (idEl) idEl.innerText = `#${orderId}`;

  const modal = document.getElementById('order-success-backdrop');
  if (modal) modal.classList.add('open');

  PdpState.cart = [];
  saveCart();
  renderCart();
  updateHeaderBadges();
}

function closeOrderSuccessModal() {
  const modal = document.getElementById('order-success-backdrop');
  if (modal) modal.classList.remove('open');
}

/* ==========================================================================
   WISHLIST DRAWER
   ========================================================================== */
function initWishlist() {
  const toggleBtn = document.getElementById('wishlist-toggle-btn');
  const closeBtn = document.getElementById('wishlist-close-btn');
  const backdrop = document.getElementById('wishlist-backdrop');

  if (toggleBtn) toggleBtn.addEventListener('click', openWishlistDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeWishlistDrawer);
  if (backdrop) backdrop.addEventListener('click', closeWishlistDrawer);

  renderWishlist();
}

function openWishlistDrawer() {
  closeCartDrawer();
  const drawer = document.getElementById('wishlist-drawer');
  const backdrop = document.getElementById('wishlist-backdrop');
  if (drawer) drawer.classList.add('active');
  if (backdrop) backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeWishlistDrawer() {
  const drawer = document.getElementById('wishlist-drawer');
  const backdrop = document.getElementById('wishlist-backdrop');
  if (drawer) drawer.classList.remove('active');
  if (backdrop) backdrop.classList.remove('active');
  document.body.style.overflow = '';
}

function renderWishlist() {
  const container = document.getElementById('wishlist-items-container');
  const emptyState = document.getElementById('wishlist-empty-state');
  if (!container) return;

  if (PdpState.wishlist.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = PdpState.wishlist.map(item => `
    <div style="display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--color-border);">
      <img src="${item.image}" alt="${item.name}" style="width: 64px; height: 84px; object-fit: cover; border-radius: 4px;" />
      <div style="flex: 1;">
        <h5 style="font-size: 0.9rem; font-weight: 500; margin-bottom: 4px;">${item.name}</h5>
        <div style="font-size: 0.85rem; color: var(--color-maroon); font-weight: 600; margin-bottom: 8px;">₹ ${Number(item.price).toLocaleString('en-IN')}</div>
        <div style="display: flex; gap: 8px;">
          <button onclick="addToCartFromWishlist('${item.id}')" style="padding: 6px 12px; background: var(--color-maroon); color: #FFF; font-size: 0.78rem; border-radius: 4px;">Add to Bag</button>
          <button onclick="removeWishlistItem('${item.id}')" style="color: var(--color-text-light); font-size: 0.78rem;">Remove</button>
        </div>
      </div>
    </div>
  `).join('');
}

function addToCartFromWishlist(productId) {
  const product = PdpState.wishlist.find(p => p.id === productId);
  if (product) {
    addToCart(product);
    closeWishlistDrawer();
  }
}

function removeWishlistItem(productId) {
  PdpState.wishlist = PdpState.wishlist.filter(p => p.id !== productId);
  localStorage.setItem('6yards_wishlist', JSON.stringify(PdpState.wishlist));
  updateHeaderBadges();
  renderWishlist();
}

function updateHeaderBadges() {
  const cartBadge = document.getElementById('cart-badge-count');
  const wishlistBadge = document.getElementById('wishlist-badge-count');

  const totalCartCount = PdpState.cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartBadge) {
    cartBadge.innerText = totalCartCount;
    cartBadge.style.display = totalCartCount > 0 ? 'flex' : 'none';
  }

  if (wishlistBadge) {
    wishlistBadge.innerText = PdpState.wishlist.length;
    wishlistBadge.style.display = PdpState.wishlist.length > 0 ? 'flex' : 'none';
  }
}

function initMobileNav() {
  const toggleBtn = document.getElementById('mobile-nav-toggle-btn');
  const navMenu = document.getElementById('nav-menu-list');
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('mobile-open');
    });
  }

  // Sarees dropdown toggle
  const dropdownItem = document.getElementById('nav-sarees-item') || document.querySelector('.nav-item-dropdown');
  const dropdownLink = document.getElementById('nav-sarees-link') || dropdownItem?.querySelector('.nav-link');
  if (dropdownItem && dropdownLink) {
    dropdownLink.addEventListener('click', (e) => {
      if (window.innerWidth <= 992) {
        e.preventDefault();
        dropdownItem.classList.toggle('open');
      }
    });

    document.addEventListener('click', (e) => {
      if (!dropdownItem.contains(e.target)) {
        dropdownItem.classList.remove('open');
      }
    });
  }
}

function showToast(message) {
  let toast = document.getElementById('app-toast-box');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast-box';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background-color: var(--color-navy);
      color: var(--color-cream-light);
      padding: 12px 22px;
      border-radius: 4px;
      font-size: 0.88rem;
      border-left: 4px solid var(--color-gold);
      box-shadow: 0 8px 24px rgba(7, 22, 44, 0.3);
      z-index: 9999;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--color-gold);"></i> <span>${message}</span>`;
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
  }, 3200);
}


/* ==========================================================================
   CUSTOMER CARE POLICY MODAL & UNIVERSAL NOTIFICATIONS
   ========================================================================== */
function openCarePolicyModal(defaultTab) {
  defaultTab = defaultTab || 'shipping';
  let modal = document.getElementById('care-policy-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'care-policy-modal';
    modal.className = 'policy-modal-backdrop';
    modal.innerHTML = `
      <div class="policy-modal-card">
        <div class="policy-modal-header">
          <h3>Customer Care & Atelier Policies</h3>
          <button class="policy-modal-close-btn" onclick="closeCarePolicyModal()" aria-label="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="policy-modal-tabs">
          <button class="policy-tab-btn" data-tab="shipping" onclick="switchPolicyTab('shipping')">Shipping Policy</button>
          <button class="policy-tab-btn" data-tab="returns" onclick="switchPolicyTab('returns')">Returns & Exchanges</button>
          <button class="policy-tab-btn" data-tab="size" onclick="switchPolicyTab('size')">Saree Drape Guide</button>
          <button class="policy-tab-btn" data-tab="faq" onclick="switchPolicyTab('faq')">FAQs</button>
          <button class="policy-tab-btn" data-tab="terms" onclick="switchPolicyTab('terms')">Authenticity & Terms</button>
          <button class="policy-tab-btn" data-tab="privacy" onclick="switchPolicyTab('privacy')">Privacy Policy</button>
        </div>
        <div class="policy-modal-body">
          <div class="policy-tab-pane" id="pane-shipping">
            <h4>Complimentary Insured Express Delivery Across India</h4>
            <p>Every 6 Yards saree is a delicate handloom masterwork. To ensure it arrives in pristine, uncompressed condition, we ship via temperature-controlled air freight.</p>
            <ul>
              <li><strong>Free Shipping:</strong> All domestic orders above ₹5,000 receive complimentary express shipping.</li>
              <li><strong>Dispatch Timeline:</strong> Orders are dispatched within 24 to 48 business hours from our Varanasi and Bangalore ateliers.</li>
              <li><strong>Delivery Window:</strong> Metro cities: 2–3 business days. Rest of India: 3–5 business days.</li>
              <li><strong>Real-Time Tracking:</strong> Tracking link and SMS dispatch updates are sent via BlueDart / Delhivery.</li>
            </ul>
          </div>
          <div class="policy-tab-pane" id="pane-returns">
            <h4>7-Day Seamless Reverse Pickup Guarantee</h4>
            <p>We take pride in our authentic handlooms. If you are not completely delighted with your drape, we offer a hassle-free 7-day exchange or refund.</p>
            <ul>
              <li><strong>Condition:</strong> The saree must remain unworn, unpleated, with the Silk Mark authentication tag and seal intact.</li>
              <li><strong>Reverse Pickup:</strong> Our courier partner will collect the parcel from your doorstep at zero extra fee.</li>
              <li><strong>Refund Process:</strong> Refunds are processed back to your original payment method (or UPI) within 3–5 business days after inspection.</li>
            </ul>
          </div>
          <div class="policy-tab-pane" id="pane-size">
            <h4>Authentic Six Yards Standard Drape & Blouse Piece</h4>
            <p>All sarees at 6 Yards conform to generational Indian handloom standards:</p>
            <ul>
              <li><strong>Saree Length:</strong> 5.5 meters (Six Yards) full authentic drape length.</li>
              <li><strong>Width:</strong> 45 to 48 inches (114–122 cm) for generous pleating and graceful floor fall.</li>
              <li><strong>Blouse Piece:</strong> 0.8 meters unstitched matching pure silk fabric attached at the running pallu end.</li>
              <li><strong>Care Instructions:</strong> Strictly dry clean only. Store draped in breathable cotton or unbleached muslin cloth away from direct sunlight.</li>
            </ul>
          </div>
          <div class="policy-tab-pane" id="pane-faq">
            <h4>Frequently Asked Questions</h4>
            <ul>
              <li><strong>Are all sarees 100% pure silk?</strong> Yes. Every piece carries Silk Mark certification and is woven from pure mulberry, tussar, or katan silk filaments.</li>
              <li><strong>Is the zari genuine silver/gold?</strong> Our bridal Kadwa and Kanjivaram sarees use authentic 2G electroplated gold and silver metallic wire.</li>
              <li><strong>Can I book a video styling consultation?</strong> Absolutely. Click our "WhatsApp Concierge" button or call +91 98457 14481 to schedule a 1-on-1 private video preview.</li>
            </ul>
          </div>
          <div class="policy-tab-pane" id="pane-terms">
            <h4>Authenticity Guarantee & Atelier Terms</h4>
            <p>Every saree purchased from 6 Yards directly supports master artisan weaver clusters across Varanasi, Kanchipuram, Chanderi, and Yeola. Minor loom variations, slub nuances, and hand-tucked edge threads are organic hallmarks of genuine pit loom weaving, not defects.</p>
          </div>
          <div class="policy-tab-pane" id="pane-privacy">
            <h4>Strict Customer Privacy & Payment Security</h4>
            <p>We respect your privacy. All payment transactions are encrypted end-to-end via Razorpay PCI-DSS Level 1 compliant gateways. We do not store credit card or banking credentials, and we never sell your personal information to third parties.</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCarePolicyModal();
    });
  }

  modal.classList.add('active');
  switchPolicyTab(defaultTab);
}

function closeCarePolicyModal() {
  const modal = document.getElementById('care-policy-modal');
  if (modal) modal.classList.remove('active');
}

function switchPolicyTab(tabId) {
  document.querySelectorAll('.policy-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.policy-tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `pane-${tabId}`);
  });
}

function showToast(message, type) {
  type = type || 'info';
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'app-toast-item toast-' + type;
  
  let iconHtml = '<i class="fa-solid fa-circle-info"></i>';
  if (type === 'success') iconHtml = '<i class="fa-solid fa-circle-check"></i>';
  if (type === 'error') iconHtml = '<i class="fa-solid fa-triangle-exclamation"></i>';

  toast.innerHTML = iconHtml + ' <span>' + message + '</span>';
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 260);
  }, 3800);
}


// Setup universal mobile menu drawer & backdrop
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('mobile-nav-toggle-btn');
  const navMenu = document.getElementById('nav-menu-list');
  const backdrop = document.getElementById('mobile-nav-backdrop');
  const closeBtn = document.getElementById('mobile-nav-close-btn');

  function openMobileNav() {
    if (navMenu) {
      navMenu.classList.add('open');
      navMenu.classList.add('mobile-open');
    }
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    if (navMenu) {
      navMenu.classList.remove('open');
      navMenu.classList.remove('mobile-open');
    }
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navMenu && (navMenu.classList.contains('open') || navMenu.classList.contains('mobile-open'))) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', closeMobileNav);
  if (backdrop) backdrop.addEventListener('click', closeMobileNav);
});
