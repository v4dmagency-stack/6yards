/**
 * 6 Yards Sarees - Collections / catalog page
 *
 * Filtering, sorting and rendering of the saree grid. Cart, wishlist and
 * navigation are handled by js/store.js.
 */

const CollectionsState = {
  products: [],
  activeCollection: null,
  activeSort: 'featured',
  priceBounds: { min: 0, max: 30000 },
};

const OCCASION_KEYWORDS = {
  wedding: ['wedding', 'bridal', 'kanjivaram', 'kadwa'],
  casual: ['casual', 'linen', 'cotton', 'slub'],
  comfort: ['comfort', 'breathable', 'tussar'],
  festive: ['festive', 'pichwai', 'temple', 'brocade'],
};

const COLLECTION_TITLES = {
  adaa: 'Adaa', roop: 'Roop', vastra: 'Vastra', leher: 'Leher', riwayat: 'Riwayat',
};

document.addEventListener('DOMContentLoaded', () => {
  setProducts(Array.isArray(window.PRODUCTS_DATA) ? window.PRODUCTS_DATA : []);
  parseUrlParams();
  applyFilters();

  window.Store.getCatalog().then((live) => {
    if (live?.length && live !== window.PRODUCTS_DATA) {
      setProducts(live);
      applyFilters();
    }
  });

  window.addEventListener('popstate', () => {
    parseUrlParams();
    applyFilters();
  });
});

function setProducts(list) {
  CollectionsState.products = list;
  initPriceBounds();
  updateFilterCounts();
}

/* --------------------------------------------------------------------------
   URL parameters (?collection=adaa, ?occasion=Wedding, ?fabric=..., ?pattern=...)
   -------------------------------------------------------------------------- */
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const col = params.get('collection');
  CollectionsState.activeCollection = col && col !== 'all' ? col.toLowerCase() : null;

  document.querySelectorAll('input[name="filter-occasion"]').forEach((cb) => { cb.checked = false; });
  const occ = params.get('occasion');
  if (occ) {
    const target = occ.toLowerCase() === 'bridal' ? 'wedding' : occ.toLowerCase();
    document.querySelectorAll('input[name="filter-occasion"]').forEach((cb) => {
      if (cb.value.toLowerCase() === target) {
        cb.checked = true;
        cb.closest('.filter-accordion-item')?.classList.add('open');
      }
    });
  }

  ['fabric', 'pattern', 'color', 'technique'].forEach((key) => {
    const value = params.get(key);
    if (!value) return;
    document.querySelectorAll(`input[name="filter-${key}"]`).forEach((cb) => {
      if (cb.value.toLowerCase() === value.toLowerCase()) cb.checked = true;
    });
  });

  updateHeading();
  updateCollectionChipsUI();
  updateCollectionCheckboxesUI();
}

function updateHeading() {
  const params = new URLSearchParams(window.location.search);
  const occ = params.get('occasion');
  const col = CollectionsState.activeCollection;
  let title = 'Silk Sarees';
  let crumb = 'All Sarees';
  if (col) {
    const name = COLLECTION_TITLES[col] || col;
    title = `${name} Collection`;
    crumb = name;
  } else if (occ) {
    const name = occ.charAt(0).toUpperCase() + occ.slice(1).toLowerCase();
    title = `${name} Sarees`;
    crumb = `${name} Edit`;
  }
  const titleEl = document.getElementById('catalog-title-text');
  const crumbEl = document.getElementById('breadcrumb-current-label');
  if (titleEl) titleEl.textContent = title;
  if (crumbEl) crumbEl.textContent = crumb;
  document.title = `${title} | 6 Yards Sarees`;
}

/* --------------------------------------------------------------------------
   Matching helpers (shared by filtering and the per-option counts)
   -------------------------------------------------------------------------- */
function includesAny(haystack, needle) {
  return String(haystack || '').toLowerCase().includes(needle.toLowerCase());
}

const MATCHERS = {
  collection: (item, value) => (item.collection || item.category || '').toLowerCase() === value.toLowerCase(),
  fabric: (item, value) => includesAny(item.fabric, value) || includesAny(item.name, value),
  color: (item, value) => includesAny(item.color, value) || includesAny(item.name, value),
  pattern: (item, value) => includesAny(item.weave, value) || includesAny(item.tag, value) || includesAny(item.description, value),
  technique: (item, value) => includesAny(item.weave, value) || includesAny(item.fabric, value) || includesAny(item.description, value),
  occasion: (item, value) => {
    const target = value.toLowerCase();
    const occasion = (item.occasion || '').toLowerCase();
    if (occasion) return occasion === target || (target === 'wedding' && occasion === 'bridal');
    const text = `${item.description || ''} ${(item.details || []).join(' ')} ${item.tag || ''} ${item.fabric || ''} ${item.weave || ''}`.toLowerCase();
    return (OCCASION_KEYWORDS[target] || []).some((kw) => text.includes(kw));
  },
  blouse: () => true,
};

function checkedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="filter-${name}"]:checked`)).map((cb) => cb.value);
}

/* --------------------------------------------------------------------------
   Filtering & sorting
   -------------------------------------------------------------------------- */
function currentPriceRange() {
  const minInput = document.getElementById('filter-price-min');
  const maxInput = document.getElementById('filter-price-max');
  let min = parseFloat(minInput?.value);
  let max = parseFloat(maxInput?.value);
  if (!Number.isFinite(min) || min < 0) min = 0;
  if (!Number.isFinite(max) || max <= 0) max = Infinity;
  if (min > max) [min, max] = [max, min];
  return { min, max };
}

function applyFilters() {
  const { min, max } = currentPriceRange();
  const groups = ['fabric', 'color', 'pattern', 'technique', 'occasion']
    .map((name) => [name, checkedValues(name)])
    .filter(([, values]) => values.length);

  let results = CollectionsState.products.filter((item) => {
    if (CollectionsState.activeCollection && !MATCHERS.collection(item, CollectionsState.activeCollection)) return false;
    if (item.price < min || item.price > max) return false;
    return groups.every(([name, values]) => values.some((value) => MATCHERS[name](item, value)));
  });

  results = sortProductList(results, CollectionsState.activeSort);
  renderCatalogGrid(results);
}

function sortProductList(list, sortMode) {
  const sorted = [...list];
  switch (sortMode) {
    case 'price-low-high': return sorted.sort((a, b) => a.price - b.price);
    case 'price-high-low': return sorted.sort((a, b) => b.price - a.price);
    case 'alphabetical-az': return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'alphabetical-za': return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case 'bestselling': return sorted.sort((a, b) => Number(Boolean(b.isBestSeller)) - Number(Boolean(a.isBestSeller)));
    default: return sorted;
  }
}

function handleSortChange(sortValue) {
  CollectionsState.activeSort = sortValue;
  applyFilters();
}

/* --------------------------------------------------------------------------
   Price range
   -------------------------------------------------------------------------- */
function initPriceBounds() {
  const prices = CollectionsState.products.map((p) => Number(p.price)).filter(Number.isFinite);
  if (!prices.length) return;
  const max = Math.ceil(Math.max(...prices) / 500) * 500;
  CollectionsState.priceBounds = { min: 0, max };

  const minInput = document.getElementById('filter-price-min');
  const maxInput = document.getElementById('filter-price-max');
  const slider = document.getElementById('filter-price-slider');
  [minInput, maxInput, slider].forEach((el) => {
    if (!el) return;
    el.min = '0';
    el.max = String(max);
  });
  if (minInput && !minInput.dataset.touched) minInput.value = '0';
  if (maxInput && !maxInput.dataset.touched) maxInput.value = String(max);
  if (slider && !slider.dataset.touched) slider.value = String(max);
  [minInput, maxInput].forEach((el) => el?.addEventListener('input', () => { el.dataset.touched = 'true'; }, { once: true }));
}

function handlePriceSlider(val) {
  const maxInput = document.getElementById('filter-price-max');
  const slider = document.getElementById('filter-price-slider');
  if (maxInput) {
    maxInput.value = val;
    maxInput.dataset.touched = 'true';
  }
  if (slider) slider.dataset.touched = 'true';
  applyFilters();
}

/* --------------------------------------------------------------------------
   Filter option counts (computed from the catalog, not hardcoded)
   -------------------------------------------------------------------------- */
function updateFilterCounts() {
  const products = CollectionsState.products;
  document.querySelectorAll('.filter-checkbox-label').forEach((label) => {
    const input = label.querySelector('input[type="checkbox"]');
    const countEl = label.querySelector('.filter-item-count');
    if (!input || !countEl) return;
    const group = input.name.replace('filter-', '');
    const matcher = MATCHERS[group];
    if (!matcher) return;
    const count = products.filter((p) => matcher(p, input.value)).length;
    countEl.textContent = `(${count})`;
    label.hidden = count === 0 && !input.checked;
  });

  document.querySelectorAll('.collection-circle-filter').forEach((chip) => {
    const col = chip.getAttribute('data-col');
    const countEl = chip.querySelector('.col-circle-count');
    if (!countEl) return;
    const count = col === 'all' ? products.length : products.filter((p) => MATCHERS.collection(p, col)).length;
    countEl.textContent = `${count} ${count === 1 ? 'Saree' : 'Sarees'}`;
  });
}

/* --------------------------------------------------------------------------
   Collection selection
   -------------------------------------------------------------------------- */
function selectCollectionFilter(colId) {
  const normalized = colId === 'all' ? null : colId.toLowerCase();
  CollectionsState.activeCollection = normalized;

  const url = new URL(window.location.href);
  if (normalized) url.searchParams.set('collection', normalized);
  else url.searchParams.delete('collection');
  window.history.pushState({}, '', url.toString());

  updateHeading();
  updateCollectionChipsUI();
  updateCollectionCheckboxesUI();
  applyFilters();
}

function handleCollectionCheckbox(checkbox) {
  if (checkbox.checked) {
    document.querySelectorAll('input[name="filter-collection"]').forEach((cb) => {
      if (cb !== checkbox) cb.checked = false;
    });
    selectCollectionFilter(checkbox.value);
  } else {
    selectCollectionFilter('all');
  }
}

function updateCollectionChipsUI() {
  const activeCol = CollectionsState.activeCollection || 'all';
  document.querySelectorAll('.collection-circle-filter, .collection-chip').forEach((chip) => {
    const active = chip.getAttribute('data-col') === activeCol;
    chip.classList.toggle('active', active);
    chip.setAttribute('aria-pressed', String(active));
  });
}

function updateCollectionCheckboxesUI() {
  const activeCol = CollectionsState.activeCollection;
  document.querySelectorAll('input[name="filter-collection"]').forEach((cb) => {
    cb.checked = Boolean(activeCol) && cb.value.toLowerCase() === activeCol;
  });
}

function clearAllFilters() {
  document.querySelectorAll('#filters-sidebar input[type="checkbox"], aside.filters-sidebar input[type="checkbox"]').forEach((cb) => {
    cb.checked = cb.name === 'filter-blouse';
  });

  const { max } = CollectionsState.priceBounds;
  const minInput = document.getElementById('filter-price-min');
  const maxInput = document.getElementById('filter-price-max');
  const slider = document.getElementById('filter-price-slider');
  if (minInput) { minInput.value = '0'; delete minInput.dataset.touched; }
  if (maxInput) { maxInput.value = String(max); delete maxInput.dataset.touched; }
  if (slider) { slider.value = String(max); delete slider.dataset.touched; }

  CollectionsState.activeCollection = null;
  if (window.location.search) window.history.pushState({}, '', window.location.pathname);
  updateHeading();
  updateCollectionChipsUI();
  updateCollectionCheckboxesUI();
  applyFilters();
  window.Store.showToast('Filters cleared');
}

/* --------------------------------------------------------------------------
   Grid rendering
   -------------------------------------------------------------------------- */
function renderCatalogGrid(products) {
  const container = document.getElementById('catalog-products-grid');
  const noResults = document.getElementById('catalog-no-results');
  const counter = document.getElementById('catalog-products-counter');
  if (!container) return;
  const { escapeHtml, formatINR, productUrl, Wishlist } = window.Store;

  if (counter) counter.textContent = `${products.length} ${products.length === 1 ? 'product' : 'products'}`;

  if (!products.length) {
    container.innerHTML = '';
    container.style.display = 'none';
    if (noResults) noResults.style.display = 'block';
    return;
  }
  container.style.display = '';
  if (noResults) noResults.style.display = 'none';

  container.innerHTML = products.map((product) => {
    const url = escapeHtml(productUrl(product));
    const name = escapeHtml(product.name);
    const hoverImg = product.hoverImage || product.gallery?.[1] || product.image;
    const wished = Wishlist.has(product.id);
    const collectionLabel = product.collectionName ? product.collectionName.split(' - ')[0] : '';
    const soldOut = product.inStock === false;

    return `
      <div class="catalog-saree-card" data-product-id="${escapeHtml(product.id)}">
        <div class="catalog-card-image-box">
          <a href="${url}" class="catalog-card-image-link" aria-label="View ${name}">
            <img src="${escapeHtml(product.image)}" alt="${name}" class="img-main" loading="lazy" />
            ${hoverImg && hoverImg !== product.image ? `<img src="${escapeHtml(hoverImg)}" alt="" class="img-hover" loading="lazy" aria-hidden="true" />` : ''}
          </a>
          <span class="product-badge-tag">${escapeHtml(soldOut ? 'Sold Out' : (product.tag || 'Handloom'))}</span>
          <button class="wishlist-heart-btn ${wished ? 'active' : ''}" type="button"
                  data-wishlist-toggle="${escapeHtml(product.id)}"
                  aria-pressed="${wished}" aria-label="Save ${name} to wishlist">
            <i class="${wished ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
        </div>
        <div class="catalog-card-content">
          <div class="catalog-card-meta-row">
            ${collectionLabel ? `<span class="catalog-card-tag">${escapeHtml(collectionLabel)}</span>` : '<span></span>'}
            ${product.occasion ? `<span class="catalog-card-occasion">${escapeHtml(product.occasion)}</span>` : ''}
          </div>
          <a href="${url}" class="catalog-card-title" title="${name}">${name}</a>
          <div class="catalog-card-price-row">
            <span class="catalog-card-price">${formatINR(product.price)}</span>
            ${product.originalPrice > product.price ? `<span class="catalog-card-original-price">${formatINR(product.originalPrice)}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

/* --------------------------------------------------------------------------
   Sidebar UI
   -------------------------------------------------------------------------- */
function toggleFilterAccordion(buttonEl) {
  const item = buttonEl.closest('.filter-accordion-item');
  if (!item) return;
  item.classList.toggle('open');
  buttonEl.setAttribute('aria-expanded', String(item.classList.contains('open')));
}

function toggleMobileFilters(forceOpen) {
  const sidebar = document.getElementById('filters-sidebar');
  if (!sidebar) return;
  const open = typeof forceOpen === 'boolean' ? forceOpen : !sidebar.classList.contains('mobile-open');
  sidebar.classList.toggle('mobile-open', open);
  document.querySelector('.mobile-filter-trigger-btn')?.setAttribute('aria-expanded', String(open));
}
