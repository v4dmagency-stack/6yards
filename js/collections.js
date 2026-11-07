/**
 * 6 Yards Sarees - Collections & Catalog Controller (Kalyan Silks Inspired)
 */

const CollectionsState = {
  products: [],
  filteredProducts: [],
  cart: JSON.parse(localStorage.getItem('6yards_cart')) || [],
  wishlist: JSON.parse(localStorage.getItem('6yards_wishlist')) || [],
  medusaCart: null,
  activeCollection: null,
  activeSort: 'featured',
  priceRange: { min: 1000, max: 30000 },
  appliedDiscount: 0,
  appliedCoupon: null,
  freeShippingThreshold: 5000
};

document.addEventListener('DOMContentLoaded', () => {
  // Load products data
  if (typeof PRODUCTS_DATA !== 'undefined' && Array.isArray(PRODUCTS_DATA)) {
    CollectionsState.products = [...PRODUCTS_DATA];
  }

  // Parse URL Parameters (e.g. ?collection=adaa, ?fabric=Kanjivaram)
  parseUrlParams();

  // Initialize UI components
  applyFilters();
  initCart();
  initWishlist();
  initMobileNav();
  updateHeaderBadges();

  // Sync with live Medusa catalog if available
  if (window.MedusaClient) {
    window.MedusaClient.listProducts().then(liveList => {
      if (liveList && liveList.length > 0) {
        CollectionsState.products = liveList;
        applyFilters();
      }
    }).catch(() => {});
  }
});

/**
 * Read query string parameters to preset filters or page title
 */
function parseUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const col = urlParams.get('collection');
  const fab = urlParams.get('fabric');
  const pat = urlParams.get('pattern');
  const occ = urlParams.get('occasion');

  if (col) {
    CollectionsState.activeCollection = col.toLowerCase();
    const titleEl = document.getElementById('catalog-title-text');
    const labelEl = document.getElementById('breadcrumb-current-label');
    const colName = col.toUpperCase();
    if (titleEl) titleEl.innerText = `${colName} COLLECTION`;
    if (labelEl) labelEl.innerText = `${colName} Edit`;
    updateCollectionChipsUI();
    updateCollectionCheckboxesUI();
  }

  if (fab) {
    const checkbox = document.querySelector(`input[name="filter-fabric"][value*="${fab}"]`);
    if (checkbox) checkbox.checked = true;
  }

  if (pat) {
    const checkbox = document.querySelector(`input[name="filter-pattern"][value*="${pat}"]`);
    if (checkbox) checkbox.checked = true;
  }

  if (occ) {
    const titleEl = document.getElementById('catalog-title-text');
    if (titleEl && !col) titleEl.innerText = `${occ.toUpperCase()} SAREES`;
    const labelEl = document.getElementById('breadcrumb-current-label');
    if (labelEl && !col) labelEl.innerText = `${occ} Edit`;

    // Check matching occasion checkbox (e.g. Wedding, Casual, Comfort, Festive)
    const targetOccLower = occ.toLowerCase();
    const checkboxes = document.querySelectorAll('input[name="filter-occasion"]');
    checkboxes.forEach(cb => {
      const cbVal = cb.value.toLowerCase();
      if (cbVal === targetOccLower || 
          (targetOccLower === 'wedding' && cbVal === 'bridal') ||
          (targetOccLower === 'bridal' && cbVal === 'wedding')) {
        cb.checked = true;
        const parentAcc = cb.closest('.filter-accordion-item');
        if (parentAcc) parentAcc.classList.add('open');
      }
    });
  }
}

/**
 * Filter and Sort Products
 */
function applyFilters() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetCollection = (CollectionsState.activeCollection !== null) ? CollectionsState.activeCollection : (urlParams.get('collection') ? urlParams.get('collection').toLowerCase() : null);
  const targetOccasion = urlParams.get('occasion');

  const minPrice = parseFloat(document.getElementById('filter-price-min')?.value) || 0;
  const maxPrice = parseFloat(document.getElementById('filter-price-max')?.value) || 999999;

  // Selected Fabrics
  const selectedFabrics = Array.from(document.querySelectorAll('input[name="filter-fabric"]:checked')).map(cb => cb.value.toLowerCase());
  
  // Selected Colors
  const selectedColors = Array.from(document.querySelectorAll('input[name="filter-color"]:checked')).map(cb => cb.value.toLowerCase());

  // Selected Patterns
  const selectedPatterns = Array.from(document.querySelectorAll('input[name="filter-pattern"]:checked')).map(cb => cb.value.toLowerCase());

  // Selected Techniques
  const selectedTechniques = Array.from(document.querySelectorAll('input[name="filter-technique"]:checked')).map(cb => cb.value.toLowerCase());

  // Selected Occasions
  let selectedOccasions = Array.from(document.querySelectorAll('input[name="filter-occasion"]:checked')).map(cb => cb.value.toLowerCase());
  if (selectedOccasions.length === 0 && targetOccasion) {
    selectedOccasions = [targetOccasion.toLowerCase()];
  }

  let results = CollectionsState.products.filter(item => {
    // Collection Filter (Adaa, Roop, Vastra, Leher, Riwayat)
    if (targetCollection && targetCollection !== 'all') {
      const targetColLower = targetCollection.toLowerCase();
      const itemCol = (item.collection || '').toLowerCase();
      const itemCat = (item.category || '').toLowerCase();
      if (itemCol !== targetColLower && itemCat !== targetColLower) {
        return false;
      }
    }

    // Price Filter
    if (item.price < minPrice || item.price > maxPrice) {
      return false;
    }

    // Fabric Filter
    if (selectedFabrics.length > 0) {
      const matchFabric = selectedFabrics.some(fab => 
        (item.fabric && item.fabric.toLowerCase().includes(fab)) ||
        (item.name && item.name.toLowerCase().includes(fab))
      );
      if (!matchFabric) return false;
    }

    // Color Filter
    if (selectedColors.length > 0) {
      const matchColor = selectedColors.some(col => 
        (item.color && item.color.toLowerCase().includes(col)) ||
        (item.name && item.name.toLowerCase().includes(col))
      );
      if (!matchColor) return false;
    }

    // Pattern Filter
    if (selectedPatterns.length > 0) {
      const matchPattern = selectedPatterns.some(pat => 
        (item.weave && item.weave.toLowerCase().includes(pat)) ||
        (item.tag && item.tag.toLowerCase().includes(pat)) ||
        (item.description && item.description.toLowerCase().includes(pat))
      );
      if (!matchPattern) return false;
    }

    // Technique Filter
    if (selectedTechniques.length > 0) {
      const matchTech = selectedTechniques.some(tech => 
        (item.weave && item.weave.toLowerCase().includes(tech)) ||
        (item.fabric && item.fabric.toLowerCase().includes(tech)) ||
        (item.description && item.description.toLowerCase().includes(tech))
      );
      if (!matchTech) return false;
    }

    // Occasion Filter (Manifest-Driven: Wedding, Casual, Comfort, Festive)
    if (selectedOccasions.length > 0) {
      const matchOcc = selectedOccasions.some(occ => {
        const occLower = occ.toLowerCase();
        // 1. Exact match on item.occasion
        if (item.occasion) {
          const itemOccLower = item.occasion.toLowerCase();
          if (itemOccLower === occLower) return true;
          if ((occLower === 'wedding' || occLower === 'bridal') && 
              (itemOccLower === 'wedding' || itemOccLower === 'bridal')) {
            return true;
          }
        }
        // 2. Resilient text & keyword matching
        const text = `${item.description || ''} ${(item.details || []).join(' ')} ${item.tag || ''} ${item.fabric || ''} ${item.weave || ''}`.toLowerCase();
        if (occLower === 'wedding' || occLower === 'bridal') {
          return text.includes('wedding') || text.includes('bridal') || text.includes('kanjivaram') || text.includes('kadwa');
        }
        if (occLower === 'casual') {
          return text.includes('casual') || text.includes('linen') || text.includes('cotton') || text.includes('slub');
        }
        if (occLower === 'comfort') {
          return text.includes('comfort') || text.includes('breathable') || text.includes('tussar');
        }
        if (occLower === 'festive') {
          return text.includes('festive') || text.includes('pichwai') || text.includes('temple') || text.includes('brocade');
        }
        return false;
      });
      if (!matchOcc) return false;
    }

    return true;
  });

  // Sort
  results = sortProductList(results, CollectionsState.activeSort);
  CollectionsState.filteredProducts = results;

  renderCatalogGrid(results);
}

/**
 * Sort product array
 */
function sortProductList(list, sortMode) {
  const sorted = [...list];
  switch (sortMode) {
    case 'price-low-high':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-high-low':
      return sorted.sort((a, b) => b.price - a.price);
    case 'alphabetical-az':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'alphabetical-za':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case 'bestselling':
      return sorted.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
    case 'featured':
    default:
      return sorted;
  }
}

function handleSortChange(sortValue) {
  CollectionsState.activeSort = sortValue;
  applyFilters();
}

function handlePriceSlider(val) {
  const maxInput = document.getElementById('filter-price-max');
  if (maxInput) maxInput.value = val;
  applyFilters();
}

/**
 * Collection Filter Controllers (Adaa, Roop, Vastra, Leher, Riwayat)
 */
function selectCollectionFilter(colId) {
  const normalized = (colId === 'all') ? null : colId.toLowerCase();
  CollectionsState.activeCollection = normalized;

  // Sync URL search parameters cleanly without page refresh
  const url = new URL(window.location.href);
  if (normalized) {
    url.searchParams.set('collection', normalized);
  } else {
    url.searchParams.delete('collection');
  }
  window.history.pushState({}, '', url.toString());

  // Update Page Title and Breadcrumb
  const titleEl = document.getElementById('catalog-title-text');
  const labelEl = document.getElementById('breadcrumb-current-label');
  if (normalized) {
    const colName = normalized.toUpperCase();
    if (titleEl) titleEl.innerText = `${colName} COLLECTION`;
    if (labelEl) labelEl.innerText = `${colName} Edit`;
  } else {
    const occ = url.searchParams.get('occasion');
    if (occ) {
      if (titleEl) titleEl.innerText = `${occ.toUpperCase()} SAREES`;
      if (labelEl) labelEl.innerText = `${occ} Edit`;
    } else {
      if (titleEl) titleEl.innerText = 'SILK SAREES';
      if (labelEl) labelEl.innerText = 'Silk Sarees';
    }
  }

  updateCollectionChipsUI();
  updateCollectionCheckboxesUI();
  applyFilters();
}

function handleCollectionCheckbox(checkbox) {
  if (checkbox.checked) {
    // Uncheck other collection checkboxes to keep single active collection
    document.querySelectorAll('input[name="filter-collection"]').forEach(cb => {
      if (cb !== checkbox) cb.checked = false;
    });
    selectCollectionFilter(checkbox.value);
  } else {
    selectCollectionFilter('all');
  }
}

function updateCollectionChipsUI() {
  const activeCol = CollectionsState.activeCollection || 'all';
  document.querySelectorAll('.collection-circle-filter, .collection-chip').forEach(chip => {
    const chipCol = chip.getAttribute('data-col');
    if (chipCol === activeCol) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

function updateCollectionCheckboxesUI() {
  const activeCol = CollectionsState.activeCollection;
  document.querySelectorAll('input[name="filter-collection"]').forEach(cb => {
    cb.checked = activeCol ? (cb.value.toLowerCase() === activeCol) : false;
  });
}

function clearAllFilters() {
  document.querySelectorAll('aside.filters-sidebar input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });
  const withBlouseCb = document.querySelector('input[name="filter-blouse"]');
  if (withBlouseCb) withBlouseCb.checked = true;

  const minInput = document.getElementById('filter-price-min');
  const maxInput = document.getElementById('filter-price-max');
  const slider = document.getElementById('filter-price-slider');

  if (minInput) minInput.value = 1000;
  if (maxInput) maxInput.value = 30000;
  if (slider) slider.value = 30000;

  CollectionsState.activeCollection = null;
  updateCollectionChipsUI();
  updateCollectionCheckboxesUI();

  if (window.location.search) {
    window.history.pushState({}, '', window.location.pathname);
    const titleEl = document.getElementById('catalog-title-text');
    const labelEl = document.getElementById('breadcrumb-current-label');
    if (titleEl) titleEl.innerText = 'SILK SAREES';
    if (labelEl) labelEl.innerText = 'Silk Sarees';
  }

  applyFilters();
  showToast('Filters cleared');
}

/**
 * Render 3-Column Catalog Grid (Image 2 Style)
 */
function renderCatalogGrid(products) {
  const container = document.getElementById('catalog-products-grid');
  const noResults = document.getElementById('catalog-no-results');
  const counter = document.getElementById('catalog-products-counter');

  if (!container) return;

  if (counter) {
    counter.innerText = `${products.length} products`;
  }

  if (products.length === 0) {
    container.style.display = 'none';
    if (noResults) noResults.style.display = 'block';
    return;
  }

  container.style.display = 'grid';
  if (noResults) noResults.style.display = 'none';

  container.innerHTML = products.map(product => {
    const isWishlisted = CollectionsState.wishlist.some(item => item.id === product.id);
    const formattedPrice = Number(product.price).toLocaleString('en-IN');
    const formattedOriginal = product.originalPrice ? Number(product.originalPrice).toLocaleString('en-IN') : null;
    const hoverImg = product.hoverImage || (product.gallery && product.gallery[1]) || product.image;

    return `
      <div class="catalog-saree-card" data-product-id="${product.id}">
        <!-- Image Box linking to product.html -->
        <a href="product.html?id=${encodeURIComponent(product.id)}" class="catalog-card-image-box" aria-label="View ${product.name}">
          <img src="${product.image}" alt="${product.name}" class="img-main" loading="lazy" onerror="this.src='${product.thumbnail || product.image}'" />
          <img src="${hoverImg}" alt="${product.name} drape angle" class="img-hover" loading="lazy" onerror="this.src='${product.thumbnail || product.image}'" />
          
          <span class="product-badge-tag">${product.tag || 'Handloom'}</span>
          
          <button class="wishlist-heart-btn ${isWishlisted ? 'active' : ''}" 
                  type="button"
                  data-product-id="${product.id}" 
                  title="Save to Wishlist" 
                  aria-label="Wishlist ${product.name}"
                  onclick="handleWishlistClick(event, '${product.id}')">
            <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
        </a>

        <!-- Content Box -->
        <div class="catalog-card-content">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span class="catalog-card-tag">${product.collectionName ? product.collectionName.split(' - ')[0] : 'Pure Silk'}</span>
            ${product.occasion ? `<span style="font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-gold); background: #FAF5EE; padding: 2px 7px; border-radius: 3px; border: 1px solid rgba(197, 154, 63, 0.25);">${product.occasion}</span>` : ''}
          </div>
          <a href="product.html?id=${encodeURIComponent(product.id)}" class="catalog-card-title" title="${product.name}">
            ${product.name}
          </a>
          <div class="catalog-card-price-row">
            <span class="catalog-card-price">Rs. ${formattedPrice}.00</span>
            ${formattedOriginal ? `<span class="catalog-card-original-price">Rs. ${formattedOriginal}.00</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Filter Accordion Toggle
 */
function toggleFilterAccordion(buttonEl) {
  const item = buttonEl.closest('.filter-accordion-item');
  if (item) {
    item.classList.toggle('open');
  }
}

/**
 * Mobile Filter Sidebar Toggle
 */
function toggleMobileFilters() {
  const sidebar = document.getElementById('filters-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('mobile-open');
  }
}

/* ==========================================================================
   CART & WISHLIST MANAGEMENT
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
  const existingIndex = CollectionsState.cart.findIndex(i => i.id === product.id);
  if (existingIndex > -1) {
    CollectionsState.cart[existingIndex].quantity += quantity;
  } else {
    CollectionsState.cart.push({
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
  showToast(`Added "${product.name}" to your shopping bag.`);

  // Sync to Medusa v2 Cart
  if (window.MedusaClient) {
    window.MedusaClient.addLineItem(product.id, quantity).catch(err => {
      console.warn('[Medusa v2] Line item sync status:', err.message);
    });
  }
}

function updateCartItemQty(productId, delta) {
  const itemIndex = CollectionsState.cart.findIndex(i => i.id === productId);
  if (itemIndex > -1) {
    CollectionsState.cart[itemIndex].quantity += delta;
    if (CollectionsState.cart[itemIndex].quantity <= 0) {
      CollectionsState.cart.splice(itemIndex, 1);
    }
    saveCart();
    renderCart();
    updateHeaderBadges();
  }
}

function removeFromCart(productId) {
  CollectionsState.cart = CollectionsState.cart.filter(i => i.id !== productId);
  saveCart();
  renderCart();
  updateHeaderBadges();
}

function saveCart() {
  localStorage.setItem('6yards_cart', JSON.stringify(CollectionsState.cart));
}

function renderCart() {
  const container = document.getElementById('cart-items-container');
  const emptyState = document.getElementById('cart-empty-state');
  const footerContent = document.getElementById('cart-footer-content');
  const subtotalEl = document.getElementById('cart-subtotal-price');
  const totalEl = document.getElementById('cart-final-total');
  const shippingText = document.getElementById('shipping-tracker-text');
  const shippingBar = document.getElementById('shipping-progress-bar');
  const discountRow = document.getElementById('cart-discount-row');
  const discountVal = document.getElementById('cart-discount-value');

  if (!container) return;

  if (CollectionsState.cart.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    if (footerContent) footerContent.style.opacity = '0.5';
    if (subtotalEl) subtotalEl.innerText = '₹ 0';
    if (totalEl) totalEl.innerText = '₹ 0';
    if (shippingBar) shippingBar.style.width = '0%';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (footerContent) footerContent.style.opacity = '1';

  let subtotal = 0;
  container.innerHTML = CollectionsState.cart.map(item => {
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

  const discountAmount = Math.round(subtotal * (CollectionsState.appliedDiscount / 100));
  const finalTotal = subtotal - discountAmount;

  if (subtotalEl) subtotalEl.innerText = `₹ ${subtotal.toLocaleString('en-IN')}`;
  if (totalEl) totalEl.innerText = `₹ ${finalTotal.toLocaleString('en-IN')}`;

  if (CollectionsState.appliedDiscount > 0 && discountRow && discountVal) {
    discountRow.style.display = 'flex';
    discountVal.innerText = `- ₹ ${discountAmount.toLocaleString('en-IN')} (${CollectionsState.appliedDiscount}%)`;
  }

  // Free shipping progress
  const progressPercent = Math.min(100, Math.round((subtotal / CollectionsState.freeShippingThreshold) * 100));
  if (shippingBar) shippingBar.style.width = `${progressPercent}%`;
  if (shippingText) {
    if (subtotal >= CollectionsState.freeShippingThreshold) {
      shippingText.innerHTML = `🎉 <strong>Congratulations!</strong> You unlocked <strong>FREE Insured Express Shipping</strong>.`;
    } else {
      const remaining = CollectionsState.freeShippingThreshold - subtotal;
      shippingText.innerHTML = `Add <strong>₹ ${remaining.toLocaleString('en-IN')}</strong> more to unlock <strong>FREE Express Shipping</strong>!`;
    }
  }
}

function applyPromoCode() {
  const input = document.getElementById('promo-input-field');
  if (!input) return;
  const code = input.value.trim().toUpperCase();

  if (code === 'WELCOME10') {
    CollectionsState.appliedDiscount = 10;
    CollectionsState.appliedCoupon = code;
    showToast('Promo code WELCOME10 applied (10% OFF)!');
    renderCart();
  } else if (code === 'UTSAV20' && getCartSubtotal() >= 5000) {
    CollectionsState.appliedDiscount = 20;
    CollectionsState.appliedCoupon = code;
    showToast('Promo code UTSAV20 applied (20% OFF)!');
    renderCart();
  } else {
    showToast('Invalid or ineligible promo code. Try WELCOME10.');
  }
}

function getCartSubtotal() {
  return CollectionsState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

/* ==========================================================================
   CHECKOUT (Medusa v2 + Razorpay Integration)
   ========================================================================== */
async function handleCheckout() {
  if (CollectionsState.cart.length === 0) {
    showToast('Your shopping bag is empty.');
    return;
  }

  const subtotal = getCartSubtotal();
  const discount = Math.round(subtotal * (CollectionsState.appliedDiscount / 100));
  const finalAmount = subtotal - discount;

  showToast('Initiating secure checkout with Medusa v2...');

  if (typeof Razorpay !== 'undefined') {
    const options = {
      key: "rzp_test_6YardsHandloomDemo",
      amount: finalAmount * 100, // in paise
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

  CollectionsState.cart = [];
  saveCart();
  renderCart();
  updateHeaderBadges();
}

function closeOrderSuccessModal() {
  const modal = document.getElementById('order-success-backdrop');
  if (modal) modal.classList.remove('open');
}

/* ==========================================================================
   WISHLIST MANAGEMENT
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

function handleWishlistClick(event, productId) {
  event.preventDefault();
  event.stopPropagation();
  const product = CollectionsState.products.find(p => p.id === productId);
  if (!product) return;

  const btn = event.currentTarget;
  const isPresent = CollectionsState.wishlist.some(p => p.id === productId);

  if (isPresent) {
    CollectionsState.wishlist = CollectionsState.wishlist.filter(p => p.id !== productId);
    btn.classList.remove('active');
    btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
    showToast(`Removed from saved list.`);
  } else {
    CollectionsState.wishlist.push(product);
    btn.classList.add('active');
    btn.innerHTML = '<i class="fa-solid fa-heart"></i>';
    showToast(`Saved "${product.name}" to your wishlist.`);
  }

  localStorage.setItem('6yards_wishlist', JSON.stringify(CollectionsState.wishlist));
  updateHeaderBadges();
  renderWishlist();
}

function renderWishlist() {
  const container = document.getElementById('wishlist-items-container');
  const emptyState = document.getElementById('wishlist-empty-state');
  if (!container) return;

  if (CollectionsState.wishlist.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = CollectionsState.wishlist.map(item => `
    <div style="display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--color-border);">
      <img src="${item.image}" alt="${item.name}" style="width: 64px; height: 84px; object-fit: cover; border-radius: 4px;" />
      <div style="flex: 1;">
        <h5 style="font-size: 0.9rem; font-weight: 500; margin-bottom: 4px;">${item.name}</h5>
        <div style="font-size: 0.85rem; color: var(--color-maroon); font-weight: 600; margin-bottom: 8px;">₹ ${Number(item.price).toLocaleString('en-IN')}</div>
        <div style="display: flex; gap: 8px;">
          <button onclick="addToCartFromWishlist('${item.id}')" style="padding: 6px 12px; background: var(--color-maroon); color: #FFF; font-size: 0.78rem; border-radius: 4px;">Move to Cart</button>
          <button onclick="removeWishlistItem('${item.id}')" style="color: var(--color-text-light); font-size: 0.78rem;">Remove</button>
        </div>
      </div>
    </div>
  `).join('');
}

function addToCartFromWishlist(productId) {
  const product = CollectionsState.wishlist.find(p => p.id === productId);
  if (product) {
    CollectionsState.wishlist = CollectionsState.wishlist.filter(p => p.id !== productId);
    localStorage.setItem('6yards_wishlist', JSON.stringify(CollectionsState.wishlist));
    updateHeaderBadges();
    renderWishlist();
    closeWishlistDrawer();
    addToCart(product);
    applyFilters();
  }
}

function removeWishlistItem(productId) {
  CollectionsState.wishlist = CollectionsState.wishlist.filter(p => p.id !== productId);
  localStorage.setItem('6yards_wishlist', JSON.stringify(CollectionsState.wishlist));
  updateHeaderBadges();
  renderWishlist();
  applyFilters();
}

/* ==========================================================================
   HEADER BADGES & TOAST
   ========================================================================== */
function updateHeaderBadges() {
  const cartBadge = document.getElementById('cart-badge-count');
  const wishlistBadge = document.getElementById('wishlist-badge-count');

  const totalCartCount = CollectionsState.cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartBadge) {
    cartBadge.innerText = totalCartCount;
    cartBadge.style.display = totalCartCount > 0 ? 'flex' : 'none';
  }

  if (wishlistBadge) {
    wishlistBadge.innerText = CollectionsState.wishlist.length;
    wishlistBadge.style.display = CollectionsState.wishlist.length > 0 ? 'flex' : 'none';
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

  // Sarees dropdown toggle with smooth hover bridge & delay
  const dropdownItem = document.getElementById('nav-sarees-item') || document.querySelector('.nav-item-dropdown');
  const dropdownLink = document.getElementById('nav-sarees-link') || dropdownItem?.querySelector('.nav-link');
  const megaCard = dropdownItem?.querySelector('.sarees-mega-card');
  if (dropdownItem && dropdownLink) {
    let closeTimer = null;
    function showDropdown() {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      dropdownItem.classList.add('open');
    }
    function hideDropdownWithDelay() {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        dropdownItem.classList.remove('open');
      }, 280);
    }

    dropdownItem.addEventListener('mouseenter', showDropdown);
    dropdownItem.addEventListener('mouseleave', hideDropdownWithDelay);
    if (megaCard) {
      megaCard.addEventListener('mouseenter', showDropdown);
      megaCard.addEventListener('mouseleave', hideDropdownWithDelay);
    }

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
