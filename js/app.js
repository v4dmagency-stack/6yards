/**
 * 6 Yards Sarees - Luxury E-Commerce Application Logic
 */

// Application State
const AppState = {
  cart: JSON.parse(localStorage.getItem('6yards_cart')) || [],
  medusaCart: null,
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
  renderNewArrivals();
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
  initSareesDropdown();
  updateHeaderBadges();
  loadLiveMedusaCatalog();
});

/**
 * Connect to Live Medusa v2 Catalog (Store API)
 */
async function loadLiveMedusaCatalog() {
  if (!window.MedusaClient) return;
  try {
    const liveProducts = await window.MedusaClient.listProducts();
    if (liveProducts && liveProducts.length > 0) {
      console.log(`[Medusa v2] Loaded ${liveProducts.length} authentic handloom sarees from Store API.`);
      window.PRODUCTS_DATA = liveProducts;
      renderNewArrivals(liveProducts);
      if (AppState.activeFilter === 'all') {
        renderProducts(liveProducts);
      } else {
        const filtered = liveProducts.filter(p => p.category === AppState.activeFilter || p.collection === AppState.activeFilter);
        renderProducts(filtered.length ? filtered : liveProducts);
      }
    }
  } catch (err) {
    console.info('[Medusa v2] Store API catalog synced with resilient catalog fallback.');
  }
}

/* ==========================================================================
   HERO SLIDER
   ========================================================================== */
function initHeroSlider() {
  const slides = document.querySelectorAll('.hero-slide');
  const pageBtns = document.querySelectorAll('.hero-page-btn');
  const prevBtn = document.getElementById('hero-prev-btn');
  const nextBtn = document.getElementById('hero-next-btn');

  if (slides.length === 0) {
    // Background video with continuous loop & smooth scroll playback
    const bgVideo = document.querySelector('.hero-background-video');

    if (bgVideo) {
      bgVideo.loop = true;
      // Start muted for instant, butter-smooth, hardware-decoded zero-glitch loading
      bgVideo.muted = true;
      bgVideo.playsInline = true;
      const heroVideoBreakpoint = window.matchMedia('(max-width: 768px)');
      const desktopVideoSource = bgVideo.dataset.desktopSrc;
      const mobileVideoSource = bgVideo.dataset.mobileSrc;
      const desktopPoster = bgVideo.dataset.desktopPoster || bgVideo.poster;
      const mobilePoster = bgVideo.dataset.mobilePoster || desktopPoster;

      function loadHeroVideoForViewport() {
        const isMobile = heroVideoBreakpoint.matches;
        const source = isMobile ? mobileVideoSource : desktopVideoSource;
        if (!source) {
          console.error(`[Hero] Missing ${isMobile ? 'mobile' : 'desktop'} video source.`);
          return;
        }
        if (bgVideo.getAttribute('src') === source) return;

        bgVideo.pause();
        bgVideo.src = source;
        bgVideo.poster = isMobile ? mobilePoster : desktopPoster;
        bgVideo.load();
      }

      loadHeroVideoForViewport();

      const collectionsSection = document.getElementById('collections-section');
      const heroBanner = document.getElementById('hero-banner') || bgVideo.closest('.hero-video-anchor');
      let audioAllowedByUser = false;

      // Play immediately with muted audio (guaranteed zero browser glitch/stall)
      bgVideo.play().catch(() => {});

      function isUserInHero() {
        if (!heroBanner) return window.scrollY < 450;
        const rect = heroBanner.getBoundingClientRect();
        // Considered in hero only when top is near top and bottom has not scrolled past nav
        return rect.bottom > 120 && window.scrollY < (heroBanner.offsetHeight - 50);
      }

      function updateHeroAudioState() {
        if (!bgVideo) return;

        const inHero = isUserInHero();
        const isTabVisible = !document.hidden;

        // Cut sound immediately if scrolled past hero OR if tab/app is switched
        if (!inHero || !isTabVisible) {
          if (!bgVideo.muted) {
            bgVideo.muted = true;
          }
        } else if (audioAllowedByUser && inHero && isTabVisible) {
          // In hero and user allowed sound: enable sound
          if (bgVideo.muted) {
            bgVideo.muted = false;
            bgVideo.volume = 1.0;
          }
        }
      }

      const handleHeroVideoBreakpointChange = () => {
        loadHeroVideoForViewport();
        bgVideo.play().catch(() => {});
        updateHeroAudioState();
      };
      if (heroVideoBreakpoint.addEventListener) {
        heroVideoBreakpoint.addEventListener('change', handleHeroVideoBreakpointChange);
      } else {
        heroVideoBreakpoint.addListener(handleHeroVideoBreakpointChange);
      }

      // Smooth loop continuity without stutter
      bgVideo.addEventListener('ended', () => {
        bgVideo.currentTime = 0;
        bgVideo.play().catch(() => {});
      });

      // User interaction listener to gracefully unlock audio when inside hero
      const enableHeroAudio = () => {
        if (isUserInHero() && !document.hidden) {
          audioAllowedByUser = true;
          bgVideo.muted = false;
          bgVideo.volume = 1.0;
          bgVideo.play().catch(() => {});
        }
      };

      window.addEventListener('click', enableHeroAudio, { passive: true });
      window.addEventListener('touchstart', enableHeroAudio, { passive: true });
      window.addEventListener('keydown', enableHeroAudio, { passive: true });

      // Scroll listener: instant mute when scrolled past hero section
      window.addEventListener('scroll', () => {
        if (bgVideo.paused && isUserInHero() && !document.hidden) {
          bgVideo.play().catch(() => {});
        }
        updateHeroAudioState();
      }, { passive: true });

      // Intersection Observer on Collections section to guarantee instant audio cut
      if ('IntersectionObserver' in window && collectionsSection) {
        const collectionsObserver = new IntersectionObserver((entries) => {
          entries.forEach(() => updateHeroAudioState());
        }, {
          threshold: [0, 0.05, 0.1, 0.2, 0.5],
          rootMargin: "0px 0px 0px 0px"
        });
        collectionsObserver.observe(collectionsSection);
      }

      // TAB / WINDOW SWITCHING CONTROL:
      // When website is switched (background tab, app minimized, window lost focus)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // Cut audio immediately & pause video
          bgVideo.muted = true;
          bgVideo.pause();
        } else {
          // Tab focused again
          bgVideo.play().catch(() => {});
          updateHeroAudioState();
        }
      });

      window.addEventListener('blur', () => {
        bgVideo.muted = true;
      });

      window.addEventListener('focus', () => {
        updateHeroAudioState();
      });

      window.addEventListener('pagehide', () => {
        bgVideo.muted = true;
      });

      // Initial state check
      updateHeroAudioState();
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
    <a href="collections.html?collection=${col.id}" class="collection-circle-card" data-collection-id="${col.id}" style="text-decoration: none; color: inherit; display: flex; flex-direction: column; align-items: center;">
      <div class="collection-avatar-wrap">
        <img src="${col.image}" alt="${col.name}" loading="lazy" />
      </div>
      <h4 class="collection-name">${col.name}</h4>
    </a>
  `).join('');
}

function filterProductsByCollection(colId) {
  const filtered = PRODUCTS_DATA.filter(p => p.collection === colId);
  // Update pills UI
  document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
  renderProducts(filtered.length ? filtered : PRODUCTS_DATA);
  showToast(`Showing collection: ${colId.toUpperCase()}`);
}

/* ==========================================================================
   NEW ARRIVALS RENDERING (Curated Best Sarees Framed Showcase)
   ========================================================================== */
function renderNewArrivals(customCatalog) {
  const container = document.getElementById('new-arrivals-grid');
  if (!container) return;

  const catalog = (customCatalog && customCatalog.length) 
    ? customCatalog 
    : (typeof PRODUCTS_DATA !== 'undefined' ? PRODUCTS_DATA : (window.PRODUCTS_DATA || []));
  if (!catalog || catalog.length === 0) return;

  // 4 Curated Standout Best Sarees in Artisan Frame Situation
  const targetIds = [
    'saree-01',
    'saree-10',
    'saree-04',
    'saree-riwayat-teal-purple'
  ];

  let selected = [];
  targetIds.forEach(id => {
    const found = catalog.find(p => p.id === id);
    if (found) selected.push(found);
  });

  if (selected.length < 4) {
    const remaining = catalog.filter(p => !selected.some(s => s.id === p.id));
    selected = selected.concat(remaining.slice(0, 4 - selected.length));
  }

  container.className = 'framed-sarees-grid';
  container.innerHTML = selected.map(product => {
    const formattedPrice = Number(product.price).toLocaleString('en-IN');
    const formattedOriginalPrice = product.originalPrice ? Number(product.originalPrice).toLocaleString('en-IN') : null;
    const colName = product.collectionName ? product.collectionName.split(' - ')[0] + ' Sutra' : (product.collection ? product.collection.toUpperCase() + ' Sutra' : 'Sutra Collection');

    return `
      <article class="saree-frame-card" data-product-id="${product.id}">
        <div class="saree-frame-inner">
          <span class="saree-frame-badge">${product.tag || 'Masterpiece Weave'}</span>
          <div class="saree-frame-img-box">
            <a href="product.html?id=${encodeURIComponent(product.id)}" style="display: block; width: 100%; height: 100%;">
              <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='${product.thumbnail || product.image}'" />
            </a>
          </div>
        </div>
        <div class="saree-frame-caption">
          <span class="saree-frame-collection">${colName}</span>
          <h3 class="saree-frame-title">
            <a href="product.html?id=${encodeURIComponent(product.id)}" style="color: inherit; text-decoration: none;">
              ${product.name}
            </a>
          </h3>
          <span class="saree-frame-weave-tag">${product.weave || 'Authentic Handloom Weave'} • ${product.origin || 'Varanasi & Kanchipuram'}</span>
          <div class="saree-frame-price-row">
            <span class="saree-frame-price">₹ ${formattedPrice}</span>
            ${formattedOriginalPrice ? `<span class="saree-frame-original-price">₹ ${formattedOriginalPrice}</span>` : ''}
          </div>
          <a href="product.html?id=${encodeURIComponent(product.id)}" class="saree-frame-cta">View Saree Details</a>
        </div>
      </article>
    `;
  }).join('');
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

    const gallery = product.gallery && product.gallery.length ? product.gallery : [product.image];
    const angleDotsHtml = gallery.length > 1 ? `
      <div class="product-card-angle-nav" onclick="event.stopPropagation()">
        ${gallery.map((img, idx) => `
          <button class="angle-dot ${idx === 0 ? 'active' : ''}" 
                  data-img-src="${img}" 
                  data-card-id="${product.id}"
                  title="View angle ${idx + 1}"
                  aria-label="View angle ${idx + 1}"></button>
        `).join('')}
      </div>
    ` : '';

    return `
      <div class="product-card" data-product-id="${product.id}">
        <div class="product-image-container">
          ${product.tag ? `<span class="product-badge-tag">${product.tag}</span>` : ''}
          <button class="wishlist-heart-btn ${isWishlisted ? 'active' : ''}" 
                  data-product-id="${product.id}" 
                  title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
            <i class="fa-${isWishlisted ? 'solid' : 'regular'} fa-heart"></i>
          </button>
          
          <a href="product.html?id=${encodeURIComponent(product.id)}" style="display: block; width: 100%; height: 100%;">
            <img src="${product.image}" alt="${product.name}" class="product-img-primary" id="card-img-${product.id}" loading="lazy" onerror="this.src='${product.thumbnail || product.image}'" />
            <img src="${product.hoverImage || product.image}" alt="${product.name} alternate view" class="product-img-hover" loading="lazy" onerror="this.src='${product.thumbnail || product.image}'" />
          </a>
          
          <a href="product.html?id=${encodeURIComponent(product.id)}" class="quick-view-overlay-btn" style="text-align: center; text-decoration: none;">
            View Details
          </a>
        </div>

        <div class="product-info-wrap">
          ${angleDotsHtml}
          <h4 class="product-title" title="${product.name}" style="margin-top: 8px;">
            <a href="product.html?id=${encodeURIComponent(product.id)}" style="color: inherit; text-decoration: none;">
              ${product.name}
            </a>
          </h4>
          
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

  // Kalyan Silks Multi-Angle Dot Nav Switcher
  document.querySelectorAll('.angle-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      const newSrc = e.currentTarget.getAttribute('data-img-src');
      const cardId = e.currentTarget.getAttribute('data-card-id');
      const primaryImg = document.getElementById(`card-img-${cardId}`);
      if (primaryImg && newSrc) {
        primaryImg.src = newSrc;
      }
      // Update active dot in this card
      const parentNav = e.currentTarget.closest('.product-card-angle-nav');
      if (parentNav) {
        parentNav.querySelectorAll('.angle-dot').forEach(d => d.classList.remove('active'));
        e.currentTarget.classList.add('active');
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

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !document.querySelector('.slide-drawer.active')) return;
    closeCartDrawer();
    closeWishlistDrawer();
  });

  renderCart();
}

function openCartDrawer() {
  closeWishlistDrawer();
  document.getElementById('cart-drawer')?.classList.add('active');
  document.getElementById('cart-backdrop')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  document.getElementById('cart-drawer')?.classList.remove('active');
  document.getElementById('cart-backdrop')?.classList.remove('active');
  document.body.style.overflow = '';
}

async function addToCart(product, quantity = 1) {
  if (window.MedusaClient) {
    const updatedCart = await window.MedusaClient.addLineItem(product.variantId, quantity, product);
    syncCartFromMedusa(updatedCart);
  } else {
    const existingItemIndex = AppState.cart.findIndex(item => item.id === product.id);
    if (existingItemIndex > -1) {
      AppState.cart[existingItemIndex].quantity += quantity;
    } else {
      AppState.cart.push({ ...product, quantity: quantity });
    }
    saveCart();
  }
  renderCart();
  updateHeaderBadges();
  showToast(`Added "${product.name}" to your bag!`);
  openCartDrawer();
}

async function updateCartQuantity(productId, delta) {
  const item = AppState.cart.find(i => i.id === productId || i.variantId === productId);
  if (!item) return;
  const newQty = item.quantity + delta;
  if (window.MedusaClient) {
    const updatedCart = await window.MedusaClient.updateLineItem(item.lineItemId || productId, newQty);
    syncCartFromMedusa(updatedCart);
  } else {
    const index = AppState.cart.findIndex(i => i.id === productId);
    if (index > -1) {
      AppState.cart[index].quantity += delta;
      if (AppState.cart[index].quantity <= 0) {
        AppState.cart.splice(index, 1);
      }
    }
    saveCart();
  }
  renderCart();
  updateHeaderBadges();
}

async function removeCartItem(productId) {
  const item = AppState.cart.find(i => i.id === productId || i.variantId === productId);
  if (window.MedusaClient && item) {
    const updatedCart = await window.MedusaClient.removeLineItem(item.lineItemId || productId);
    syncCartFromMedusa(updatedCart);
  } else {
    AppState.cart = AppState.cart.filter(i => i.id !== productId);
    saveCart();
  }
  renderCart();
  updateHeaderBadges();
  showToast("Item removed from bag.");
}

function syncCartFromMedusa(medusaCart) {
  if (!medusaCart) return;
  AppState.medusaCart = medusaCart;
  AppState.cart = (medusaCart.items || []).map(item => ({
    id: item.id,
    lineItemId: item.id,
    variantId: item.variant_id,
    name: item.title,
    image: item.thumbnail || (item.variant?.product?.thumbnail) || 'assets/catalog/adaa/adaa-01-primary.jpg',
    price: item.unit_price || item.total / item.quantity,
    quantity: item.quantity
  }));
  saveCart();
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

  // Medusa source of truth for financial calculations
  const subtotal = AppState.medusaCart?.subtotal ?? rawSubtotal;
  const discountAmount = AppState.medusaCart?.discount_total ?? Math.round(subtotal * (AppState.appliedDiscount / 100));
  const shippingFee = AppState.medusaCart?.shipping_total ?? (subtotal >= AppState.freeShippingThreshold || subtotal === 0 ? 0 : 150);
  const finalTotal = AppState.medusaCart?.total ?? (subtotal - discountAmount + shippingFee);

  if (subtotalEl) subtotalEl.textContent = `₹ ${Number(subtotal).toLocaleString('en-IN')}`;
  if (discountRow) {
    discountRow.style.display = (discountAmount > 0 || AppState.appliedDiscount > 0) ? 'flex' : 'none';
  }
  if (discountVal) discountVal.textContent = `- ₹ ${Number(discountAmount).toLocaleString('en-IN')}`;
  if (finalTotalEl) finalTotalEl.textContent = `₹ ${Number(finalTotal).toLocaleString('en-IN')}`;

}

async function applyPromoCode() {
  const input = document.getElementById('promo-input-field');
  const code = input?.value.trim().toUpperCase();
  if (!code) return;

  if (window.MedusaClient) {
    const res = await window.MedusaClient.applyPromoCode(code);
    if (res.success) {
      showToast(`Promo code "${code}" applied successfully!`);
      if (res.cart) syncCartFromMedusa(res.cart);
      renderCart();
      return;
    }
  }

  if (code === 'WELCOME10' || code === 'FESTIVE10') {
    AppState.appliedDiscount = 10;
    AppState.appliedCoupon = code;
    showToast(`Promo code "${code}" applied successfully! 10% OFF.`);
    renderCart();
  } else if (code === 'ROYAL20') {
    AppState.appliedDiscount = 20;
    AppState.appliedCoupon = 'ROYAL20';
    showToast('VIP Promo code "ROYAL20" applied! 20% OFF.');
    renderCart();
  } else {
    showToast('Invalid promo code. Try "FESTIVE10" for 10% off.');
  }
}

async function handleCheckout() {
  if (AppState.cart.length === 0) return;
  showToast('Launching secure checkout...');

  const cart = AppState.medusaCart || (window.MedusaClient ? window.MedusaClient.getLocalCart() : null);

  if (window.MedusaClient && cart) {
    window.MedusaClient.launchRazorpayCheckout(
      cart,
      {
        email: 'patron@6yardssarees.com',
        first_name: 'Valued',
        last_name: 'Patron',
        phone: '+919845714481'
      },
      (response) => {
        const orderNumber = response.razorpay_order_id ? response.razorpay_order_id.slice(-6).toUpperCase() : Math.floor(1000 + Math.random() * 9000);
        const orderEl = document.getElementById('confirmed-order-id');
        if (orderEl) orderEl.textContent = `#6YD-${orderNumber}`;

        // Clear cart session
        AppState.cart = [];
        AppState.medusaCart = null;
        localStorage.removeItem('6yards_cart');
        localStorage.removeItem('6yards_medusa_cart_id');
        renderCart();
        updateHeaderBadges();
        closeCartDrawer();
        openOrderSuccessModal();
      },
      (err) => {
        showToast(err.message || 'Payment window closed.');
      }
    );
  }
}

function openOrderSuccessModal() {
  document.getElementById('order-success-backdrop')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeOrderSuccessModal() {
  document.getElementById('order-success-backdrop')?.classList.remove('active');
  document.body.style.overflow = '';
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
  closeCartDrawer();
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
      <img src="${product.image}" alt="${product.name}" class="modal-main-img" id="quickview-main-image" />
      ${Array.isArray(product.gallery) && product.gallery.length > 1 ? `
        <div class="modal-thumbnails" style="display: flex; gap: 8px; margin-top: 10px; overflow-x: auto; padding-bottom: 4px;">
          ${product.gallery.map((imgUrl, i) => `
            <img src="${imgUrl}" alt="${product.name} angle ${i+1}" 
                 class="modal-thumb-item ${i === 0 ? 'active' : ''}" 
                 data-full="${imgUrl}"
                 style="width: 58px; height: 58px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 2px solid ${i === 0 ? 'var(--color-primary)' : 'transparent'}; opacity: ${i === 0 ? '1' : '0.75'}; transition: all 0.2s;" />
          `).join('')}
        </div>
      ` : ''}
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

  // Thumbnail click handler
  modal.querySelectorAll('.modal-thumb-item').forEach(thumb => {
    thumb.addEventListener('click', (e) => {
      const full = e.currentTarget.getAttribute('data-full');
      const mainImg = modal.querySelector('#quickview-main-image');
      if (mainImg && full) {
        mainImg.src = full;
      }
      modal.querySelectorAll('.modal-thumb-item').forEach(t => {
        t.style.borderColor = 'transparent';
        t.style.opacity = '0.75';
      });
      e.currentTarget.style.borderColor = 'var(--color-primary)';
      e.currentTarget.style.opacity = '1';
    });
  });

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
  const heroBanner = document.getElementById('hero-banner') || document.querySelector('.hero-video-anchor');

  function updateHeaderAppearance() {
    if (!header) return;

    // Only apply glassmorphism on pages with the hero video (index.html)
    if (heroBanner) {
      const heroRect = heroBanner.getBoundingClientRect();
      const headerHeight = header.offsetHeight || 82;
      // In hero video: glassmorphic (video shines through frosted glass)
      const inHeroVideo = heroRect.bottom > (headerHeight + 20);

      if (inHeroVideo) {
        header.classList.add('header-glass');
      } else {
        // Scrolled to where the collection starts or beyond: solid royal navy blue
        header.classList.remove('header-glass');
      }
    } else {
      // Any other page (collections, about, journal, contact, product): ALWAYS solid blue
      header.classList.remove('header-glass');
    }

    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', updateHeaderAppearance, { passive: true });
  window.addEventListener('resize', updateHeaderAppearance, { passive: true });
  updateHeaderAppearance();
}

function initMobileNav() {
  const toggleBtn = document.getElementById('mobile-nav-toggle-btn');
  const navMenu = document.getElementById('nav-menu-list');
  const backdrop = document.getElementById('mobile-nav-backdrop');
  const closeBtn = document.getElementById('mobile-nav-close-btn');

  if (!toggleBtn || !navMenu || toggleBtn.dataset.mobileNavBound === 'true') return;
  toggleBtn.dataset.mobileNavBound = 'true';

  function openMobileNav() {
    navMenu.classList.add('open');
    navMenu.classList.add('mobile-open');
    if (backdrop) backdrop.classList.add('active');
    document.body.classList.add('mobile-nav-open');
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    navMenu.classList.remove('open');
    navMenu.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.classList.remove('mobile-nav-open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = document.querySelector('.slide-drawer.active') ? 'hidden' : '';
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (navMenu.classList.contains('open') || navMenu.classList.contains('mobile-open')) {
      closeMobileNav();
    } else {
      openMobileNav();
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', closeMobileNav);
  if (backdrop) backdrop.addEventListener('click', closeMobileNav);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMobileNav();
  });

  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      closeMobileNav();
    });
  });
}

function initSareesDropdown() {
  const dropdownItem = document.getElementById('nav-sarees-item') || document.querySelector('.nav-item-dropdown');
  const dropdownLink = document.getElementById('nav-sarees-link') || dropdownItem?.querySelector('.nav-link');
  const megaCard = dropdownItem?.querySelector('.sarees-mega-card');
  if (!dropdownItem || !dropdownLink) return;

  let closeTimer = null;

  function showDropdown() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    dropdownItem.classList.add('open');
  }

  function hideDropdownWithDelay() {
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      dropdownItem.classList.remove('open');
    }, 280);
  }

  // Hover intent for desktop: smooth bridge so moving mouse into card never vanishes
  dropdownItem.addEventListener('mouseenter', showDropdown);
  dropdownItem.addEventListener('mouseleave', hideDropdownWithDelay);

  if (megaCard) {
    megaCard.addEventListener('mouseenter', showDropdown);
    megaCard.addEventListener('mouseleave', hideDropdownWithDelay);
  }

  // Clicking outside closes the dropdown
  document.addEventListener('click', (e) => {
    if (!dropdownItem.contains(e.target)) {
      dropdownItem.classList.remove('open');
    }
  });
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
