/**
 * 6 Yards Sarees - Product detail page (product.html?id=<product id>)
 *
 * Renders one saree from the live Medusa catalog (or the bundled catalog when
 * the backend is offline). Cart and wishlist are handled by js/store.js.
 */

const PdpState = {
  product: null,
  quantity: 1,
};

document.addEventListener('DOMContentLoaded', async () => {
  const id = new URLSearchParams(window.location.search).get('id');

  // Wait for the live catalog (Admin -> Sarees) so customers never see old
  // prices or details. Offline, getCatalog() returns the bundled catalog.
  try {
    const catalog = await window.Store.getCatalog();
    const product = catalog.find((p) => p.id === id || p.handle === id);
    if (product) renderProduct(product, catalog);
    else renderNotFound();
  } catch (err) {
    console.error(err);
    renderNotFound();
  } finally {
    document.body.classList.remove('pdp-is-loading');
  }
  setupDeliveryCheck();
});

/* --------------------------------------------------------------------------
   Delivery check by PIN code (Shiprocket). Shown only when it works.
   -------------------------------------------------------------------------- */
const DELIVERY_PIN_KEY = '6yards_delivery_pincode';

async function setupDeliveryCheck() {
  const form = document.getElementById('pdp-delivery-check');
  if (!form || !window.MedusaClient?.deliveryEstimate) return;
  const status = await window.MedusaClient.deliveryEstimate();
  if (!status?.available) return;
  form.hidden = false;

  const input = document.getElementById('pdp-delivery-pincode');
  try {
    const saved = localStorage.getItem(DELIVERY_PIN_KEY);
    if (saved && /^[1-9]\d{5}$/.test(saved)) input.value = saved;
  } catch (e) { /* storage unavailable */ }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    checkDelivery(input.value.trim());
  });
  if (input.value) checkDelivery(input.value);
}

async function checkDelivery(pincode) {
  const result = document.getElementById('pdp-delivery-result');
  const button = document.getElementById('pdp-delivery-btn');
  const show = (text, bad) => {
    result.textContent = text;
    result.classList.toggle('is-bad', Boolean(bad));
    result.hidden = false;
  };
  if (!/^[1-9]\d{5}$/.test(pincode)) {
    show('Enter a valid 6-digit PIN code.', true);
    return;
  }
  button.disabled = true;
  show('Checking…');
  try {
    const r = await window.MedusaClient.deliveryEstimate(pincode);
    if (!r?.available) {
      show('We deliver across India. WhatsApp us to confirm delivery to your PIN code.');
      return;
    }
    try { localStorage.setItem(DELIVERY_PIN_KEY, pincode); } catch (e) { /* storage unavailable */ }
    if (!r.serviceable) {
      show(`Sorry, our couriers don't deliver to ${pincode} yet. WhatsApp us and we'll find a way.`, true);
      return;
    }
    const when = r.days
      ? `Usually delivered in ${r.days} ${r.days === 1 ? 'day' : 'days'}${r.etd ? ` (by ${r.etd})` : ''}`
      : 'Delivery available';
    show(`${when}.${r.cod ? ' Cash on delivery available.' : ''}`);
  } finally {
    button.disabled = false;
  }
}

// Shown when a saree has no text of its own for these rows (same defaults as Admin -> Sarees).
const PDP_DEFAULTS = {
  length: '6.3 Meters (includes unstitched blouse piece)',
  blousePiece: 'Included, unstitched (approx. 80 cm)',
  care: [
    'Dry clean only, preferably by a specialist experienced with silk and zari.',
    'Never spray alcohol-based perfumes or deodorants directly onto gold zari threads.',
    'Store folded in the muslin cloth it arrives in, away from direct sunlight.',
    'Change folds every 3 months to prevent creasing of heavy zari brocade.',
    'Iron on the reverse side only using low to medium silk temperature settings.',
  ],
};

function fillList(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '';
  items.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    el.appendChild(li);
  });
}

/** "Save X%" for a regular price above the selling price, else 0. */
function discountPercent(product) {
  const regular = Number(product.originalPrice);
  const price = Number(product.price);
  if (!(regular > price) || !(price > 0)) return 0;
  return Math.round(((regular - price) / regular) * 100);
}

function renderProduct(product, catalog) {
  PdpState.product = product;
  renderProductDetails(product);
  setupGallery(product);
  renderRecommendations(catalog, product);
  updateStructuredData(product);
  window.Store.syncWishlistButtons();
}

function renderNotFound() {
  const stage = document.querySelector('.pdp-stage');
  const recs = document.querySelector('.pdp-recommendations-section');
  if (recs) recs.hidden = true;
  if (stage) {
    stage.innerHTML = `
      <div class="pdp-not-found">
        <i class="fa-solid fa-gem"></i>
        <h1 class="font-serif">This saree could not be found</h1>
        <p>It may have sold out or the link may be incorrect. Explore our current collection instead.</p>
        <a href="collections.html" class="checkout-btn">Browse All Sarees</a>
      </div>`;
  }
  document.getElementById('pdp-crumb-title').textContent = 'Not found';
  document.title = 'Saree not found | 6 Yards Sarees';
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderProductDetails(product) {
  const { formatINR } = window.Store;
  const collectionTitle = product.collectionName ? product.collectionName.split(' - ')[0] : 'Sarees';

  document.title = `${product.name} | 6 Yards Sarees`;
  const description = product.description || `Handcrafted ${product.name} from 6 Yards Sarees.`;
  document.getElementById('page-meta-desc')?.setAttribute('content', description);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', product.name);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
  document.querySelector('meta[property="og:image"]')?.setAttribute('content', new URL(product.image, window.location.href).href);

  // Breadcrumbs
  const crumbCol = document.getElementById('pdp-crumb-collection');
  if (crumbCol) {
    crumbCol.textContent = collectionTitle;
    crumbCol.href = `collections.html?collection=${encodeURIComponent(product.collection || product.category || '')}`;
  }
  setText('pdp-crumb-title', product.name);

  setText('pdp-brand-collection', `6 YARDS • ${collectionTitle.toUpperCase()}`);
  setText('pdp-saree-title', product.name);

  // Pricing: the selling price; with a higher regular price (Admin -> Sarees),
  // also the struck-out regular price and "Save X%".
  setText('pdp-current-price', formatINR(product.price));
  const percent = discountPercent(product);
  const origEl = document.getElementById('pdp-original-price');
  const discountTag = document.getElementById('pdp-discount-tag');
  if (origEl) { origEl.textContent = percent ? formatINR(product.originalPrice) : ''; origEl.hidden = !percent; }
  if (discountTag) { discountTag.textContent = percent ? `Save ${percent}%` : ''; discountTag.hidden = !percent; }

  // Item code = the SKU in Medusa (editable in Admin -> Inventory or the saree's
  // variant), read live on every page load. Placeholder SKUs ("6YD-...") are not
  // shown. Offline, the code from the bundled catalog is used.
  let itemCode = '';
  if (typeof product.sku === 'string') {
    itemCode = /^6YD-/i.test(product.sku.trim()) ? '' : product.sku.trim();
  } else {
    const line = (product.details || []).find((d) => d.startsWith('Item Code:'));
    itemCode = line ? line.slice('Item Code:'.length).replace(/\(.*$/, '').trim() : '';
  }
  setText('pdp-item-code', itemCode ? ` · Item Code: ${itemCode}` : '');

  // Specifications
  // Specifications (each row is hidden when the saree has nothing for it)
  const specRow = (id, value) => {
    setText(id, value || '');
    const row = document.getElementById(id)?.closest('tr');
    if (row) row.hidden = !value;
  };
  specRow('spec-fabric', product.fabric || product.material);
  specRow('spec-weave', product.weave);
  specRow('spec-color', product.color || (product.colors || []).join(', '));
  specRow('spec-length', product.length || PDP_DEFAULTS.length);
  specRow('spec-blouse', product.blousePiece || PDP_DEFAULTS.blousePiece);
  specRow('spec-origin', product.origin);

  // Colour tags (Admin -> Sarees -> Colours)
  const colorsEl = document.getElementById('pdp-colors');
  if (colorsEl) {
    const colors = product.colors || [];
    colorsEl.hidden = !colors.length;
    colorsEl.innerHTML = colors.length
      ? `<span class="pdp-colors-label">Colours:</span>${colors.map((c) => `<span class="pdp-color-chip">${window.Store.escapeHtml(c)}</span>`).join('')}`
      : '';
  }

  // Care instructions (one per line in Admin), else the standard silk care.
  fillList('pdp-care-list', product.care?.length ? product.care : PDP_DEFAULTS.care);

  // Design story
  setText('pdp-design-desc', product.description || '');
  fillList('pdp-details-bullets', (product.details || []).filter((d) => !/^item code:/i.test(d)));

  // Wishlist button + stock state
  document.getElementById('pdp-wishlist-btn')?.setAttribute('data-wishlist-toggle', product.id);
  const soldOut = product.inStock === false;
  ['pdp-add-to-cart-btn', 'pdp-buy-now-btn'].forEach((btnId) => {
    const btn = document.getElementById(btnId);
    if (btn) btn.disabled = soldOut;
  });
  const stockNote = document.getElementById('pdp-stock-note');
  if (stockNote) {
    stockNote.hidden = !soldOut;
    stockNote.textContent = soldOut ? 'This saree is currently sold out. WhatsApp us to be notified when it is back.' : '';
  }
}

/* --------------------------------------------------------------------------
   Gallery
   -------------------------------------------------------------------------- */
function setupGallery(product) {
  const { escapeHtml } = window.Store;
  const mainImg = document.getElementById('pdp-main-image');
  const thumbStrip = document.getElementById('pdp-thumbnail-strip');
  const badge = document.getElementById('pdp-photo-badge');

  if (badge) badge.innerHTML = `<i class="fa-solid fa-certificate"></i> ${escapeHtml(product.tag || 'Handloom')}`;

  const photos = [];
  [product.image, ...(product.gallery || []), product.hoverImage].forEach((src) => {
    if (src && !photos.includes(src)) photos.push(src);
  });

  if (mainImg) {
    mainImg.src = photos[0] || '';
    mainImg.alt = product.name;
    // A photo that fails to load falls back to the next one.
    mainImg.onerror = () => {
      const current = photos.indexOf(mainImg.getAttribute('src'));
      const next = photos[current + 1];
      if (next) mainImg.src = next;
      else mainImg.onerror = null;
    };
  }

  if (thumbStrip) {
    thumbStrip.hidden = photos.length < 2;
    thumbStrip.innerHTML = photos.map((src, index) => `
      <button type="button" class="pdp-thumb-item ${index === 0 ? 'active' : ''}" data-photo="${escapeHtml(src)}" aria-label="Show photo ${index + 1} of ${photos.length}">
        <img src="${escapeHtml(src)}" alt="" loading="lazy" />
      </button>`).join('');
    thumbStrip.onclick = (e) => {
      const thumb = e.target.closest('.pdp-thumb-item');
      if (thumb) switchPdpPhoto(thumb.dataset.photo, thumb);
    };
  }
}

function switchPdpPhoto(newSrc, thumbEl) {
  const mainImg = document.getElementById('pdp-main-image');
  if (mainImg && mainImg.getAttribute('src') !== newSrc) {
    mainImg.style.opacity = '0.4';
    setTimeout(() => {
      mainImg.src = newSrc;
      mainImg.style.opacity = '1';
    }, 150);
  }
  document.querySelectorAll('.pdp-thumb-item').forEach((el) => el.classList.toggle('active', el === thumbEl));
}

/* --------------------------------------------------------------------------
   Actions
   -------------------------------------------------------------------------- */
function changePdpQty(delta) {
  PdpState.quantity = Math.min(10, Math.max(1, PdpState.quantity + delta));
  setText('pdp-qty-val', String(PdpState.quantity));
}

function handlePdpAddToCart() {
  if (PdpState.product) window.Store.Cart.add(PdpState.product, PdpState.quantity);
}

async function handlePdpBuyNow() {
  if (!PdpState.product) return;
  const added = await window.Store.Cart.add(PdpState.product, PdpState.quantity);
  if (added) window.location.href = 'checkout.html';
}

function togglePdpAccordion(buttonEl) {
  const item = buttonEl.closest('.pdp-accordion-item');
  if (!item) return;
  item.classList.toggle('open');
  buttonEl.setAttribute('aria-expanded', String(item.classList.contains('open')));
}

/* --------------------------------------------------------------------------
   "You May Also Like"
   -------------------------------------------------------------------------- */
function renderRecommendations(allProducts, current) {
  const container = document.getElementById('pdp-recommendations-container');
  if (!container) return;
  const { escapeHtml, formatINR, productUrl, Wishlist } = window.Store;

  const others = allProducts.filter((p) => p.id !== current.id);
  const related = others.filter((p) => p.collection === current.collection || p.occasion === current.occasion);
  // In-stock sarees first, so recommendations don't lead with sold-out pieces.
  const inStockFirst = (list) => [...list.filter((p) => p.inStock !== false), ...list.filter((p) => p.inStock === false)];
  const picks = inStockFirst([...related, ...others.filter((p) => !related.includes(p))]).slice(0, 4);

  container.innerHTML = picks.map((item) => {
    const url = escapeHtml(productUrl(item));
    const name = escapeHtml(item.name);
    const hoverImg = item.hoverImage || item.gallery?.[1] || item.image;
    const wished = Wishlist.has(item.id);
    const soldOut = item.inStock === false;
    return `
      <div class="catalog-saree-card${soldOut ? ' is-sold-out' : ''}" data-product-id="${escapeHtml(item.id)}">
        <div class="catalog-card-image-box">
          <a href="${url}" class="catalog-card-image-link" aria-label="View ${name}${soldOut ? ' (sold out)' : ''}">
            <img src="${escapeHtml(item.image)}" alt="${name}" class="img-main" loading="lazy" />
            ${hoverImg && hoverImg !== item.image ? `<img src="${escapeHtml(hoverImg)}" alt="" class="img-hover" loading="lazy" aria-hidden="true" />` : ''}
          </a>
          <span class="product-badge-tag${soldOut ? ' is-sold-out' : ''}">${escapeHtml(soldOut ? 'Sold Out' : (item.tag || 'Handloom'))}</span>
          <button class="wishlist-heart-btn ${wished ? 'active' : ''}" type="button"
                  data-wishlist-toggle="${escapeHtml(item.id)}" aria-pressed="${wished}" aria-label="Save ${name} to wishlist">
            <i class="${wished ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
        </div>
        <div class="catalog-card-content">
          <span class="catalog-card-tag">${escapeHtml(item.collectionName ? item.collectionName.split(' - ')[0] : '')}</span>
          <a href="${url}" class="catalog-card-title" title="${name}">${name}</a>
          <div class="catalog-card-price-row">
            <span class="catalog-card-price">${formatINR(item.price)}</span>
            ${discountPercent(item) ? `<span class="catalog-card-original-price">${formatINR(item.originalPrice)}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

/* --------------------------------------------------------------------------
   SEO: schema.org Product structured data
   -------------------------------------------------------------------------- */
function updateStructuredData(product) {
  let script = document.getElementById('pdp-structured-data');
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'pdp-structured-data';
    document.head.appendChild(script);
  }
  const images = [product.image, ...(product.gallery || [])]
    .filter(Boolean)
    .map((src) => new URL(src, window.location.href).href);
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: [...new Set(images)],
    sku: (product.sku && !/^6YD-/i.test(product.sku) ? product.sku : '') || product.prod_code || product.id,
    brand: { '@type': 'Brand', name: '6 Yards Sarees' },
    offers: {
      '@type': 'Offer',
      url: window.location.href,
      priceCurrency: 'INR',
      price: product.price,
      availability: product.inStock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  });
}
