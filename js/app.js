/**
 * 6 Yards Sarees - Home page
 *
 * Cart, wishlist, navigation and modals live in js/store.js. This file only
 * renders home page content: the hero video, collection circles and the
 * featured "New Arrivals" frames.
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeroVideo();
  renderCollections();
  renderNewArrivals(window.PRODUCTS_DATA || []);
  window.Store.getCatalog().then(renderNewArrivals);
  initStoryModal();
});

/* --------------------------------------------------------------------------
   Hero video: muted autoplay, with an explicit sound toggle
   -------------------------------------------------------------------------- */
function initHeroVideo() {
  const video = document.querySelector('.hero-background-video');
  if (!video) return;

  const mobileQuery = window.matchMedia('(max-width: 768px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  video.muted = true;
  video.playsInline = true;

  function loadSourceForViewport() {
    const isMobile = mobileQuery.matches;
    const source = isMobile ? video.dataset.mobileSrc : video.dataset.desktopSrc;
    const poster = isMobile ? video.dataset.mobilePoster : video.dataset.desktopPoster;
    if (poster) video.poster = poster;
    if (!source || video.getAttribute('src') === source) return;
    video.src = source;
    video.load();
    if (!reduceMotion.matches) video.play().catch(() => {});
  }

  loadSourceForViewport();
  mobileQuery.addEventListener?.('change', loadSourceForViewport);

  // Sound toggle button (sound never starts without an explicit tap).
  const hero = document.getElementById('hero-banner');
  const soundBtn = document.getElementById('hero-sound-toggle');
  function setSound(on) {
    video.muted = !on;
    if (on) video.play().catch(() => {});
    if (soundBtn) {
      soundBtn.setAttribute('aria-pressed', String(on));
      soundBtn.setAttribute('aria-label', on ? 'Mute video' : 'Play video with sound');
      soundBtn.innerHTML = `<i class="fa-solid ${on ? 'fa-volume-high' : 'fa-volume-xmark'}"></i>`;
    }
  }
  soundBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSound(video.muted);
  });

  // Pause off-screen / in background tabs and mute when leaving the hero.
  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (!reduceMotion.matches) video.play().catch(() => {});
      } else {
        video.pause();
        if (!video.muted) setSound(false);
      }
    }, { threshold: 0.15 }).observe(hero);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
    else if (!reduceMotion.matches) video.play().catch(() => {});
  });
}

/* --------------------------------------------------------------------------
   Collection circles
   -------------------------------------------------------------------------- */
function renderCollections() {
  const container = document.getElementById('collections-grid-container');
  if (!container || !Array.isArray(window.COLLECTIONS_DATA)) return;
  const { escapeHtml } = window.Store;

  container.innerHTML = window.COLLECTIONS_DATA.map((col) => `
    <a href="collections.html?collection=${encodeURIComponent(col.id)}" class="collection-circle-card" data-collection-id="${escapeHtml(col.id)}">
      <div class="collection-avatar-wrap">
        <img src="${escapeHtml(col.image)}" alt="${escapeHtml(col.name)} collection" loading="lazy" />
      </div>
      <h3 class="collection-name">${escapeHtml(col.name)}</h3>
    </a>
  `).join('');
}

/* --------------------------------------------------------------------------
   New Arrivals: 4 featured sarees in artisan frames
   -------------------------------------------------------------------------- */
const FEATURED_IDS = ['saree-01', 'saree-10', 'saree-04', 'saree-riwayat-teal-purple'];

function renderNewArrivals(catalog) {
  const container = document.getElementById('new-arrivals-grid');
  if (!container || !catalog?.length) return;
  const { escapeHtml, formatINR, productUrl } = window.Store;

  let selected = FEATURED_IDS.map((id) => catalog.find((p) => p.id === id)).filter(Boolean);
  if (selected.length < 4) {
    const newest = catalog.filter((p) => p.isNew && !selected.includes(p));
    const rest = catalog.filter((p) => !selected.includes(p) && !newest.includes(p));
    selected = selected.concat(newest, rest).slice(0, 4);
  }

  container.innerHTML = selected.map((product) => {
    const url = escapeHtml(productUrl(product));
    const collectionLabel = product.collectionName
      ? `${product.collectionName.split(' - ')[0]} Sutra`
      : 'Sutra Collection';
    const meta = [product.weave, product.origin].filter(Boolean).map(escapeHtml).join(' • ');

    return `
      <article class="saree-frame-card" data-product-id="${escapeHtml(product.id)}">
        <div class="saree-frame-inner">
          <span class="saree-frame-badge">${escapeHtml(product.tag || 'Handloom')}</span>
          <div class="saree-frame-img-box">
            <a href="${url}" aria-label="${escapeHtml(product.name)}">
              <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />
            </a>
          </div>
        </div>
        <div class="saree-frame-caption">
          <span class="saree-frame-collection">${escapeHtml(collectionLabel)}</span>
          <h3 class="saree-frame-title"><a href="${url}">${escapeHtml(product.name)}</a></h3>
          ${meta ? `<span class="saree-frame-weave-tag">${meta}</span>` : ''}
          <div class="saree-frame-price-row">
            <span class="saree-frame-price">${formatINR(product.price)}</span>
            ${product.originalPrice > product.price ? `<span class="saree-frame-original-price">${formatINR(product.originalPrice)}</span>` : ''}
          </div>
          <a href="${url}" class="saree-frame-cta">View Saree Details</a>
        </div>
      </article>`;
  }).join('');
}

/* --------------------------------------------------------------------------
   "Our craft" story modal
   -------------------------------------------------------------------------- */
function initStoryModal() {
  const backdrop = document.getElementById('story-backdrop');
  if (!backdrop) return;
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-story-close]')) closeStoryModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeStoryModal();
  });
}

function openStoryModal() {
  const backdrop = document.getElementById('story-backdrop');
  if (!backdrop) return;
  backdrop.classList.add('active');
  window.Store.syncScrollLock();
  backdrop.querySelector('.modal-close-icon')?.focus();
}

function closeStoryModal() {
  document.getElementById('story-backdrop')?.classList.remove('active');
  window.Store.syncScrollLock();
}
