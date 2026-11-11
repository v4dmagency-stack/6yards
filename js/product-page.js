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
  const fallbackList = Array.isArray(window.PRODUCTS_DATA) ? window.PRODUCTS_DATA : [];

  // Render instantly from the bundled catalog, then refresh with live data.
  const local = fallbackList.find((p) => p.id === id);
  if (local) renderProduct(local, fallbackList);

  const catalog = await window.Store.getCatalog();
  const live = catalog.find((p) => p.id === id || p.handle === id);
  if (live) renderProduct(live, catalog);
  else if (!local) renderNotFound();
});

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

  const occasion = product.occasion ? ` • ${product.occasion.toUpperCase()} EDIT` : '';
  setText('pdp-brand-collection', `6 YARDS • ${collectionTitle.toUpperCase()}${occasion}`);
  setText('pdp-saree-title', product.name);

  // Pricing
  setText('pdp-current-price', formatINR(product.price));
  const origEl = document.getElementById('pdp-original-price');
  const discountTag = document.getElementById('pdp-discount-tag');
  if (product.originalPrice && product.originalPrice > product.price) {
    const percent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    if (origEl) { origEl.textContent = formatINR(product.originalPrice); origEl.hidden = false; }
    if (discountTag) { discountTag.textContent = `Save ${percent}%`; discountTag.hidden = false; }
  } else {
    if (origEl) origEl.hidden = true;
    if (discountTag) discountTag.hidden = true;
  }

  // Item code
  const itemCode = (product.details || []).find((d) => d.startsWith('Item Code:'));
  setText('pdp-item-code', itemCode || `Item Code: ${product.prod_code || product.id.toUpperCase()}`);

  // Specifications
  setText('spec-fabric', product.fabric || '—');
  setText('spec-weave', product.weave || '—');
  setText('spec-color', product.color || '—');
  setText('spec-length', product.length || '6.3 Meters (includes unstitched blouse piece)');
  setText('spec-origin', product.origin || '—');

  // Design story
  setText('pdp-design-desc', product.description || '');
  const bullets = document.getElementById('pdp-details-bullets');
  if (bullets) {
    bullets.innerHTML = '';
    (product.details || []).filter((d) => !d.startsWith('Item Code:')).forEach((d) => {
      const li = document.createElement('li');
      li.textContent = d;
      bullets.appendChild(li);
    });
  }

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
    mainImg.onerror = () => {
      if (product.thumbnail && mainImg.src.indexOf(product.thumbnail) === -1) mainImg.src = product.thumbnail;
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
  const picks = [...related, ...others.filter((p) => !related.includes(p))].slice(0, 4);

  container.innerHTML = picks.map((item) => {
    const url = escapeHtml(productUrl(item));
    const name = escapeHtml(item.name);
    const hoverImg = item.hoverImage || item.gallery?.[1] || item.image;
    const wished = Wishlist.has(item.id);
    return `
      <div class="catalog-saree-card" data-product-id="${escapeHtml(item.id)}">
        <div class="catalog-card-image-box">
          <a href="${url}" class="catalog-card-image-link" aria-label="View ${name}">
            <img src="${escapeHtml(item.image)}" alt="${name}" class="img-main" loading="lazy" />
            ${hoverImg && hoverImg !== item.image ? `<img src="${escapeHtml(hoverImg)}" alt="" class="img-hover" loading="lazy" aria-hidden="true" />` : ''}
          </a>
          <span class="product-badge-tag">${escapeHtml(item.tag || 'Handloom')}</span>
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
            ${item.originalPrice > item.price ? `<span class="catalog-card-original-price">${formatINR(item.originalPrice)}</span>` : ''}
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
    sku: product.prod_code || product.id,
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
