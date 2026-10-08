/**
 * 6 Yards Sarees - Luxury E-Commerce Application Logic
 */

// Application State
const AppState = {
  cart: JSON.parse(localStorage.getItem('6yards_cart')) || [],
  wishlist: JSON.parse(localStorage.getItem('6yards_wishlist')) || [],
  activeHeroIndex: 0,
  heroTimer: null,
  activeFilter: 'all',
  appliedDiscount: 0, // percentage
  appliedCoupon: null,
  freeShippingThreshold: 5000
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initHeroSlider();
  renderCollections();
  renderProducts(PRODUCTS_DATA);
  initCategoryFilters();
  initSearch();
  initCart();
  initWishlist();
  initPromoCodeBox();
  initNewsletter();
  initScrollTop();
  initHeaderScroll();
  initMobileNav();
  updateHeaderBadges();
});

/* ==========================================================================
   HERO SLIDER
   ========================================================================== */
function initHeroSlider() {
  const slides = document.querySelectorAll('.hero-slide');
  const pageBtns = document.querySelectorAll('.hero-page-btn');
  const prevBtn = document.getElementById('hero-prev-btn');
  const nextBtn = document.getElementById('hero-next-btn');

  if (slides.length === 0) {
    // If background video is used without slides, ensure video plays smoothly
    const bgVideo = document.querySelector('.hero-background-video');
    const soundBtn = document.getElementById('hero-sound-toggle-btn');
    const soundIcon = document.getElementById('hero-sound-icon');

    if (bgVideo) {
      bgVideo.play().catch(() => {});

      if (soundBtn && soundIcon) {
        soundBtn.addEventListener('click', () => {
          bgVideo.muted = !bgVideo.muted;
          if (bgVideo.muted) {
            soundIcon.className = 'fa-solid fa-volume-xmark';
            showToast('Video audio muted');
          } else {
            soundIcon.className = 'fa-solid fa-volume-high';
            showToast('Video audio playing');
          }
        });
      }
    }
    return;
  }

  function goToSlide(index) {
    slides.forEach((slide, idx) => {
      slide.classList.toggle('active', idx === index);
    });
    pageBtns.forEach((btn, idx) => {
      btn.classList.toggle('active', idx === index);
    });
    AppState.activeHeroIndex = index;
  }

  function nextSlide() {
    let nextIndex = (AppState.activeHeroIndex + 1) % slides.length;
    goToSlide(nextIndex);
  }

  function prevSlide() {
    let prevIndex = (AppState.activeHeroIndex - 1 + slides.length) % slides.length;
    goToSlide(prevIndex);
  }

  pageBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
      goToSlide(idx);
      resetHeroTimer();
    });
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevSlide();
      resetHeroTimer();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextSlide();
      resetHeroTimer();
    });
  }

  function startHeroTimer() {
    AppState.heroTimer = setInterval(nextSlide, 5000);
  }

  function resetHeroTimer() {
    clearInterval(AppState.heroTimer);
    startHeroTimer();
  }

  startHeroTimer();
}

/* ==========================================================================
   COLLECTIONS ("Sutra")
   ========================================================================== */
function renderCollections() {
  const container = document.getElementById('collections-grid-container');
  if (!container) return;

  container.innerHTML = COLLECTIONS_DATA.map(col => `
    <div class="collection-circle-card" data-collection-id="${col.id}">
      <div class="collection-num">${col.number}</div>
      <div class="collection-avatar-wrap">
        <img src="${col.image}" alt="${col.name}" loading="lazy" />
      </div>
      <h4 class="collection-name">${col.name}</h4>
      <p class="collection-subtext">${col.tagline}</p>
    </div>
  `).join('');

  // Add click listener to filter products or trigger scroll
  container.querySelectorAll('.collection-circle-card').forEach(card => {
    card.addEventListener('click', () => {
      const colId = card.getAttribute('data-collection-id');
      filterProductsByCollection(colId);
      const productSection = document.getElementById('products-section');
      if (productSection) {
        productSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

function filterProductsByCollection(colId) {
  const filtered = PRODUCTS_DATA.filter(p => p.collection === colId);
  // Update pills UI
  document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
  renderProducts(filtered.length ? filtered : PRODUCTS_DATA);
  showToast(`Showing collection: ${colId.toUpperCase()}`);
}

/* ==========================================================================
   PRODUCTS RENDERING & FILTERING
   ========================================================================== */
function renderProducts(products) {
  const container = document.getElementById('products-grid-container');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: rgba(255,255,255,0.6); border-radius: 8px;">
        <h4 style="font-family: var(--font-serif); font-size: 1.5rem; color: var(--color-maroon);">No Sarees Found</h4>
        <p style="color: var(--color-text-muted); margin-top: 8px;">Try selecting another category or clearing your search term.</p>
        <button onclick="resetFilters()" style="margin-top: 16px; padding: 8px 20px; background: var(--color-maroon); color: var(--color-cream); border-radius: 4px; font-weight: 500;">View All Sarees</button>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(product => {
    const isWishlisted = AppState.wishlist.some(item => item.id === product.id);
    const formattedPrice = Number(product.price).toLocaleString('en-IN');
    const formattedOriginalPrice = product.originalPrice ? Number(product.originalPrice).toLocaleString('en-IN') : null;

    return `
      <div class="product-card" data-product-id="${product.id}">
        <div class="product-image-container">
          ${product.tag ? `<span class="product-badge-tag">${product.tag}</span>` : ''}
          <button class="wishlist-heart-btn ${isWishlisted ? 'active' : ''}" 
                  data-product-id="${product.id}" 
                  title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
            <i class="fa-${isWishlisted ? 'solid' : 'regular'} fa-heart"></i>
          </button>
          
          <img src="${product.image}" alt="${product.name}" class="product-img-primary" loading="lazy" />
          <img src="${product.hoverImage || product.image}" alt="${product.name} alternate view" class="product-img-hover" loading="lazy" />
          
          <button class="quick-view-overlay-btn" data-product-id="${product.id}">
            Quick View
          </button>
        </div>

        <div class="product-info-wrap">
          <h4 class="product-title" title="${product.name}">${product.name}</h4>
          
          <div class="product-price-row">
            <span class="product-current-price">₹ ${formattedPrice}</span>
            ${formattedOriginalPrice ? `<span class="product-original-price">₹ ${formattedOriginalPrice}</span>` : ''}
          </div>

          <div class="product-rating-row">
            <span class="star-icon"><i class="fa-solid fa-star"></i></span>
            <span style="font-weight: 600; color: var(--color-text-main);">${product.rating}</span>
            <span>(${product.reviewsCount})</span>
          </div>

          <button class="add-to-cart-btn" data-product-id="${product.id}">
            Add to Cart
          </button>
        </div>
      </div>
    `;
  }).join('');

  attachProductCardEvents();
}

function attachProductCardEvents() {
  // Add to Cart Buttons
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pId = e.currentTarget.getAttribute('data-product-id');
      const product = PRODUCTS_DATA.find(p => p.id === pId);
      if (product) {
        addToCart(product);
      }
    });
  });

  // Wishlist Buttons
  document.querySelectorAll('.wishlist-heart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pId = e.currentTarget.getAttribute('data-product-id');
      const product = PRODUCTS_DATA.find(p => p.id === pId);
      if (product) {
        toggleWishlist(product, e.currentTarget);
      }
    });
  });

  // Quick View Buttons
  document.querySelectorAll('.quick-view-overlay-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pId = e.currentTarget.getAttribute('data-product-id');
      const product = PRODUCTS_DATA.find(p => p.id === pId);
      if (product) {
        openQuickViewModal(product);
      }
    });
  });
}

function initCategoryFilters() {
  const filterPills = document.querySelectorAll('.filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      filterPills.forEach(p => p.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const category = e.currentTarget.getAttribute('data-category');
      AppState.activeFilter = category;

      if (category === 'all') {
        renderProducts(PRODUCTS_DATA);
      } else {
        const filtered = PRODUCTS_DATA.filter(p => p.category === category);
        renderProducts(filtered);
      }
    });
  });
}

function resetFilters() {
  AppState.activeFilter = 'all';
  document.querySelectorAll('.filter-pill').forEach((pill, idx) => {
    pill.classList.toggle('active', idx === 0);
  });
  renderProducts(PRODUCTS_DATA);
}

/* ==========================================================================
   LIVE SEARCH
   ========================================================================== */
function initSearch() {
  const searchInput = document.getElementById('header-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderProducts(PRODUCTS_DATA);
      return;
    }
    const results = PRODUCTS_DATA.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.fabric.toLowerCase().includes(query) ||
      p.color.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.origin.toLowerCase().includes(query)
    );
    renderProducts(results);
  });
}

/* ==========================================================================
   CART SYSTEM & SLIDE-OVER DRAWER
   ========================================================================== */
function initCart() {
  const cartToggleBtn = document.getElementById('cart-toggle-btn');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartBackdrop = document.getElementById('cart-backdrop');
  const cartCloseBtn = document.getElementById('cart-close-btn');
  const applyPromoBtn = document.getElementById('apply-promo-btn');
  const checkoutBtn = document.getElementById('checkout-btn');

  if (cartToggleBtn) {
    cartToggleBtn.addEventListener('click', openCartDrawer);
  }
  if (cartCloseBtn) {
    cartCloseBtn.addEventListener('click', closeCartDrawer);
  }
  if (cartBackdrop) {
    cartBackdrop.addEventListener('click', closeCartDrawer);
  }

  if (applyPromoBtn) {
    applyPromoBtn.addEventListener('click', applyPromoCode);
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', handleCheckout);
  }

  renderCart();
}

function openCartDrawer() {
  document.getElementById('cart-drawer')?.classList.add('active');
  document.getElementById('cart-backdrop')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  document.getElementById('cart-drawer')?.classList.remove('active');
  document.getElementById('cart-backdrop')?.classList.remove('active');
  document.body.style.overflow = '';
}

function addToCart(product, quantity = 1) {
  const existingItemIndex = AppState.cart.findIndex(item => item.id === product.id);
  if (existingItemIndex > -1) {
    AppState.cart[existingItemIndex].quantity += quantity;
  } else {
    AppState.cart.push({
      ...product,
      quantity: quantity
    });
  }
  saveCart();
  renderCart();
  updateHeaderBadges();
  showToast(`Added "${product.name}" to your bag!`);
  openCartDrawer();
}

function updateCartQuantity(productId, delta) {
  const index = AppState.cart.findIndex(item => item.id === productId);
  if (index > -1) {
    AppState.cart[index].quantity += delta;
    if (AppState.cart[index].quantity <= 0) {
      AppState.cart.splice(index, 1);
    }
  }
  saveCart();
  renderCart();
  updateHeaderBadges();
}

function removeCartItem(productId) {
  AppState.cart = AppState.cart.filter(item => item.id !== productId);
  saveCart();
  renderCart();
  updateHeaderBadges();
  showToast("Item removed from bag.");
}

function saveCart() {
  localStorage.setItem('6yards_cart', JSON.stringify(AppState.cart));
}

function renderCart() {
  const container = document.getElementById('cart-items-container');
  const subtotalEl = document.getElementById('cart-subtotal-price');
  const discountRow = document.getElementById('cart-discount-row');
  const discountVal = document.getElementById('cart-discount-value');
  const finalTotalEl = document.getElementById('cart-final-total');
  const freeShippingText = document.getElementById('shipping-tracker-text');
  const freeShippingBar = document.getElementById('shipping-progress-bar');
  const emptyState = document.getElementById('cart-empty-state');
  const footerContent = document.getElementById('cart-footer-content');

  if (!container) return;

  if (AppState.cart.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    if (footerContent) footerContent.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (footerContent) footerContent.style.display = 'block';

  let rawSubtotal = 0;

  container.innerHTML = AppState.cart.map(item => {
    const itemTotal = item.price * item.quantity;
    rawSubtotal += itemTotal;

    return `
      <div class="cart-item-row">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
        <div class="cart-item-info">
          <h5>${item.name}</h5>
          <div class="cart-item-price">₹ ${Number(item.price).toLocaleString('en-IN')}</div>
          <div class="quantity-control">
            <button class="qty-btn" onclick="updateCartQuantity('${item.id}', -1)">-</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" onclick="updateCartQuantity('${item.id}', 1)">+</button>
          </div>
        </div>
        <button class="remove-cart-item" onclick="removeCartItem('${item.id}')" title="Remove">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    `;
  }).join('');

  // Calculations
  const discountAmount = Math.round(rawSubtotal * (AppState.appliedDiscount / 100));
  const finalTotal = rawSubtotal - discountAmount;

  if (subtotalEl) subtotalEl.textContent = `₹ ${rawSubtotal.toLocaleString('en-IN')}`;
  if (discountRow) {
    discountRow.style.display = AppState.appliedDiscount > 0 ? 'flex' : 'none';
  }
  if (discountVal) discountVal.textContent = `- ₹ ${discountAmount.toLocaleString('en-IN')} (${AppState.appliedDiscount}%)`;
  if (finalTotalEl) finalTotalEl.textContent = `₹ ${finalTotal.toLocaleString('en-IN')}`;

  // Free shipping tracker
  const remainingForFree = AppState.freeShippingThreshold - rawSubtotal;
  if (freeShippingText && freeShippingBar) {
    if (remainingForFree <= 0) {
      freeShippingText.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #2E7D32;"></i> <strong>Congratulations!</strong> You qualify for <strong>FREE Shipping</strong>!`;
      freeShippingBar.style.width = '100%';
    } else {
      const progress = Math.min(100, Math.round((rawSubtotal / AppState.freeShippingThreshold) * 100));
      freeShippingText.innerHTML = `Add <strong>₹ ${remainingForFree.toLocaleString('en-IN')}</strong> more to get <strong>FREE Express Shipping</strong>!`;
      freeShippingBar.style.width = `${progress}%`;
    }
  }
}

function applyPromoCode() {
  const input = document.getElementById('promo-input-field');
  const code = input?.value.trim().toUpperCase();

  if (code === 'WELCOME10') {
    AppState.appliedDiscount = 10;
    AppState.appliedCoupon = 'WELCOME10';
    showToast('Promo code "WELCOME10" applied successfully! 10% OFF.');
    renderCart();
  } else if (code === 'ROYAL20') {
    AppState.appliedDiscount = 20;
    AppState.appliedCoupon = 'ROYAL20';
    showToast('VIP Promo code "ROYAL20" applied! 20% OFF.');
    renderCart();
  } else {
    showToast('Invalid promo code. Try "WELCOME10" for 10% off.');
  }
}

function handleCheckout() {
  if (AppState.cart.length === 0) return;
  showToast('Processing order securely with 256-bit encryption...');
  setTimeout(() => {
    alert('Thank you for choosing 6 Yards Sarees! Your order has been placed successfully. A confirmation with tracking details has been sent to your email.');
    AppState.cart = [];
    saveCart();
    renderCart();
    updateHeaderBadges();
    closeCartDrawer();
  }, 1200);
}

/* ==========================================================================
   WISHLIST DRAWER
   ========================================================================== */
function initWishlist() {
  const wishlistToggleBtn = document.getElementById('wishlist-toggle-btn');
  const wishlistDrawer = document.getElementById('wishlist-drawer');
  const wishlistBackdrop = document.getElementById('wishlist-backdrop');
  const wishlistCloseBtn = document.getElementById('wishlist-close-btn');

  if (wishlistToggleBtn) {
    wishlistToggleBtn.addEventListener('click', openWishlistDrawer);
  }
  if (wishlistCloseBtn) {
    wishlistCloseBtn.addEventListener('click', closeWishlistDrawer);
  }
  if (wishlistBackdrop) {
    wishlistBackdrop.addEventListener('click', closeWishlistDrawer);
  }

  renderWishlist();
}

function openWishlistDrawer() {
  document.getElementById('wishlist-drawer')?.classList.add('active');
  document.getElementById('wishlist-backdrop')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeWishlistDrawer() {
  document.getElementById('wishlist-drawer')?.classList.remove('active');
  document.getElementById('wishlist-backdrop')?.classList.remove('active');
  document.body.style.overflow = '';
}

function toggleWishlist(product, btnEl) {
  const index = AppState.wishlist.findIndex(item => item.id === product.id);
  if (index > -1) {
    AppState.wishlist.splice(index, 1);
    if (btnEl) {
      btnEl.classList.remove('active');
      btnEl.innerHTML = '<i class="fa-regular fa-heart"></i>';
    }
    showToast(`Removed "${product.name}" from Wishlist.`);
  } else {
    AppState.wishlist.push(product);
    if (btnEl) {
      btnEl.classList.add('active');
      btnEl.innerHTML = '<i class="fa-solid fa-heart"></i>';
    }
    showToast(`Saved "${product.name}" to your Wishlist!`);
  }
  localStorage.setItem('6yards_wishlist', JSON.stringify(AppState.wishlist));
  updateHeaderBadges();
  renderWishlist();
}

function renderWishlist() {
  const container = document.getElementById('wishlist-items-container');
  const emptyState = document.getElementById('wishlist-empty-state');
  if (!container) return;

  if (AppState.wishlist.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = AppState.wishlist.map(item => `
    <div class="cart-item-row">
      <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
      <div class="cart-item-info">
        <h5>${item.name}</h5>
        <div class="cart-item-price">₹ ${Number(item.price).toLocaleString('en-IN')}</div>
        <button class="add-to-cart-btn" style="padding: 4px 10px; margin-top: 4px; display: inline-block; width: auto;" onclick="moveWishlistToCart('${item.id}')">
          Move to Bag
        </button>
      </div>
      <button class="remove-cart-item" onclick="removeWishlistItem('${item.id}')" title="Remove">
        <i class="fa-regular fa-trash-can"></i>
      </button>
    </div>
  `).join('');
}

function moveWishlistToCart(productId) {
  const product = AppState.wishlist.find(p => p.id === productId);
  if (product) {
    addToCart(product);
    AppState.wishlist = AppState.wishlist.filter(p => p.id !== productId);
    localStorage.setItem('6yards_wishlist', JSON.stringify(AppState.wishlist));
    renderWishlist();
    updateHeaderBadges();
    // Re-render product grid to update heart icon state
    renderProducts(PRODUCTS_DATA);
  }
}

function removeWishlistItem(productId) {
  AppState.wishlist = AppState.wishlist.filter(p => p.id !== productId);
  localStorage.setItem('6yards_wishlist', JSON.stringify(AppState.wishlist));
  renderWishlist();
  updateHeaderBadges();
  renderProducts(PRODUCTS_DATA);
  showToast('Removed from Wishlist.');
}

function updateHeaderBadges() {
  const totalCartCount = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartBadge = document.getElementById('cart-badge-count');
  if (cartBadge) cartBadge.textContent = totalCartCount;

  const wishlistBadge = document.getElementById('wishlist-badge-count');
  if (wishlistBadge) wishlistBadge.textContent = AppState.wishlist.length;
}

/* ==========================================================================
   PROMO CODE CLICK TO COPY
   ========================================================================== */
function initPromoCodeBox() {
  const promoBox = document.getElementById('promo-coupon-trigger');
  if (!promoBox) return;

  promoBox.addEventListener('click', () => {
    navigator.clipboard.writeText('WELCOME10').then(() => {
      showToast('Coupon code "WELCOME10" copied to clipboard! (10% Off)');
      // Pre-fill cart coupon input
      const promoInput = document.getElementById('promo-input-field');
      if (promoInput) promoInput.value = 'WELCOME10';
    }).catch(() => {
      showToast('Use coupon code "WELCOME10" at checkout!');
    });
  });
}

/* ==========================================================================
   QUICK VIEW MODAL
   ========================================================================== */
function openQuickViewModal(product) {
  const modal = document.getElementById('quickview-modal');
  const backdrop = document.getElementById('quickview-backdrop');
  if (!modal || !backdrop) return;

  const formattedPrice = Number(product.price).toLocaleString('en-IN');
  const formattedOriginal = product.originalPrice ? Number(product.originalPrice).toLocaleString('en-IN') : null;

  modal.innerHTML = `
    <button class="modal-close-icon" id="quickview-close-btn">
      <i class="fa-solid fa-xmark"></i>
    </button>
    <div class="modal-gallery-col">
      <img src="${product.image}" alt="${product.name}" class="modal-main-img" />
    </div>
    <div class="modal-details-col">
      <span class="modal-badge">${product.collectionName || 'Artisanal Craft'}</span>
      <h2 class="modal-product-title font-serif">${product.name}</h2>
      
      <div class="modal-price-box">
        <span class="modal-current-price">₹ ${formattedPrice}</span>
        ${formattedOriginal ? `<span class="modal-original-price">₹ ${formattedOriginal}</span>` : ''}
        <span style="font-size: 0.8rem; color: #2E7D32; font-weight: 500; background: #E8F5E9; padding: 2px 8px; border-radius: 4px;">Inclusive of all taxes</span>
      </div>

      <p style="font-size: 0.9rem; color: var(--color-text-muted); line-height: 1.6; margin-bottom: 16px;">
        ${product.description}
      </p>

      <ul class="modal-specs-list">
        <li><span class="spec-label">Fabric</span><span class="spec-val">${product.fabric}</span></li>
        <li><span class="spec-label">Weave</span><span class="spec-val">${product.weave}</span></li>
        <li><span class="spec-label">Color</span><span class="spec-val">${product.color}</span></li>
        <li><span class="spec-label">Origin</span><span class="spec-val">${product.origin}</span></li>
        <li><span class="spec-label">Length</span><span class="spec-val">${product.length}</span></li>
      </ul>

      <div style="display: flex; gap: 12px; margin-top: auto;">
        <button class="checkout-btn" id="modal-add-cart-btn" style="flex: 1;">
          Add to Bag
        </button>
        <button class="action-icon-btn" id="modal-wishlist-btn" style="border: 1px solid var(--color-border); width: 50px; height: 50px; border-radius: 4px;">
          <i class="fa-regular fa-heart"></i>
        </button>
      </div>
    </div>
  `;

  backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Attach modal close & CTA events
  document.getElementById('quickview-close-btn')?.addEventListener('click', closeQuickViewModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeQuickViewModal();
  });

  document.getElementById('modal-add-cart-btn')?.addEventListener('click', () => {
    addToCart(product);
    closeQuickViewModal();
  });

  document.getElementById('modal-wishlist-btn')?.addEventListener('click', (e) => {
    toggleWishlist(product, e.currentTarget);
  });
}

function closeQuickViewModal() {
  document.getElementById('quickview-backdrop')?.classList.remove('active');
  document.body.style.overflow = '';
}

/* ==========================================================================
   OUR STORY MODAL
   ========================================================================== */
function openStoryModal() {
  const modal = document.getElementById('story-modal');
  const backdrop = document.getElementById('story-backdrop');
  if (modal && backdrop) {
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeStoryModal() {
  const backdrop = document.getElementById('story-backdrop');
  if (backdrop) {
    backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/* ==========================================================================
   NEWSLETTER
   ========================================================================== */
function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('newsletter-email-input');
    const email = emailInput?.value.trim();
    if (email && email.includes('@')) {
      showToast(`Thank you for subscribing! Your 10% welcome coupon is WELCOME10.`);
      emailInput.value = '';
    } else {
      showToast('Please enter a valid email address.');
    }
  });
}

/* ==========================================================================
   SCROLL TO TOP & HEADER EFFECTS
   ========================================================================== */
function initScrollTop() {
  const btn = document.getElementById('scroll-top-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

function initHeaderScroll() {
  const header = document.querySelector('.header-main');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  });
}

function initMobileNav() {
  const toggleBtn = document.getElementById('mobile-nav-toggle-btn');
  const navMenu = document.getElementById('nav-menu-list');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });

    // Close when clicking link
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
    });
  }
}

/* ==========================================================================
   TOAST NOTIFICATION ENGINE
   ========================================================================== */
function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.innerHTML = `<i class="fa-solid fa-gem" style="color: var(--color-gold-light);"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}
