(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // Production Express + TiDB Cloud API hosted on Vercel (used by GitHub Pages too via CORS)
  const PROD_API_URL = 'https://kynetix-collective.vercel.app/api';
  const IS_STATIC_HOST = /\.github\.io$/i.test(window.location.hostname);
  const IS_LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(window.location.hostname);

  // Backend API URL:
  // - GitHub Pages (*.github.io) -> live Vercel API (with CORS)
  // - Vercel / cloud hosts / local Node (port 3000) -> same-origin '/api'
  // - Local XAMPP Apache (port 80/443) -> ':3000/api'
  const API_BASE = IS_STATIC_HOST
    ? PROD_API_URL
    : (!IS_LOCAL_HOST || window.location.port === '3000')
      ? '/api'
      : `${window.location.protocol}//${window.location.hostname}:3000/api`;

  function getAuthToken() {
    try {
      const u = JSON.parse(localStorage.getItem('kynetixUser'));
      return u && u.loggedIn && u.token ? u.token : null;
    } catch (e) {
      return null;
    }
  }

  async function apiFetch(endpoint, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const token = getAuthToken();
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...(options.headers || {})
        }
      });
      const data = await res.json();
      return { ok: res.ok, data, error: !res.ok ? (data.message || 'Server error') : null };
    } catch (err) {
      return { ok: false, data: null, error: err.message, networkError: true };
    } finally {
      clearTimeout(timer);
    }
  }

  // Shows a spinner + label on a submit button while a request runs
  function setButtonLoading(btn, loading, label) {
    if (!btn) return;
    if (loading) {
      btn.dataset.label = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add('is-loading');
      btn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span>${label}`;
    } else {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
    }
  }

  function formatEGP(amount) {
    return `${Number(amount).toFixed(2)} EGP`;
  }

  // ---------- Sale helpers ----------
  function isOnSale(p) {
    return !!p && Number(p.oldPrice) > Number(p.price);
  }
  function discountPercent(p) {
    return isOnSale(p) ? Math.round((1 - Number(p.price) / Number(p.oldPrice)) * 100) : 0;
  }
  function formatEGPPrefix(amount) {
    return `EGP ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function variantKey(colorName, size) {
    return `${colorName}::${size}`;
  }

  function getVariantStock(product, colorName, size) {
    if (!product) return 0;
    if (product.variantStock && typeof product.variantStock === 'object') {
      const key = variantKey(colorName, size);
      if (key in product.variantStock) {
        return Math.max(0, Number(product.variantStock[key]) || 0);
      }
    }
    if (typeof product.stock === 'number') {
      return Math.max(0, Number(product.stock) || 0);
    }
    return 0;
  }

  function getTotalProductStock(product) {
    if (!product) return 0;
    const colors = product.colors || [];
    const sizes = product.sizes || [];
    if (!colors.length || !sizes.length) return 0;
    let total = 0;
    colors.forEach((c) => {
      sizes.forEach((s) => {
        total += getVariantStock(product, c.name, s);
      });
    });
    return total;
  }

  // ---------- Image fallbacks ----------
  const logoImg = $('#logoImg');
  if (logoImg) {
    logoImg.addEventListener('error', () => {
      logoImg.hidden = true;
      const logoFallback = $('#logoFallback');
      if (logoFallback) logoFallback.hidden = false;
    });
  }

  $$('.cat img').forEach((img) => {
    img.addEventListener('error', () => { img.style.visibility = 'hidden'; });
  });
  const heroImg = $('#heroImg');
  if (heroImg) {
    heroImg.addEventListener('error', function () { this.style.display = 'none'; });
  }

  if ($('#year')) $('#year').textContent = new Date().getFullYear();

  // ---------- Toast ----------
  const toast = $('#toast');
  let toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  // ---------- Mobile menu ----------
  const nav = $('#nav');
  const menuToggle = $('#menuToggle');
  if (nav && menuToggle) {
    menuToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', open);
    });
    nav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', false);
      }
    });
  }

  // ---------- Shared Product Storage (Mirrors MySQL Database) ----------
  // Catalog is loaded dynamically from MySQL via /api/products (no hardcoded products)
  const DEFAULT_PRODUCTS = {};

  function normalizeProductStock(p) {
    if (!p.variantStock || typeof p.variantStock !== 'object') {
      const fallback = typeof p.stock === 'number' ? Math.max(0, p.stock) : 5;
      p.variantStock = {};
      (p.colors || []).forEach((c) => {
        (p.sizes || []).forEach((s) => {
          p.variantStock[variantKey(c.name, s)] = fallback;
        });
      });
    }
    return p;
  }

  function getProducts() {
    try {
      if (localStorage.getItem('kynetixCatalogVersion') !== '5.0') {
        localStorage.setItem('kynetixCatalogVersion', '5.0');
        localStorage.removeItem('kynetixProducts');
        return {};
      }

      const saved = localStorage.getItem('kynetixProducts');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        Object.values(parsed).forEach(normalizeProductStock);
        return parsed;
      }
    } catch (e) {}
    return {};
  }

  function saveProducts(productsObj) {
    try {
      localStorage.setItem('kynetixProducts', JSON.stringify(productsObj));
    } catch (e) {}
  }

  async function syncProductsFromDB() {
    try {
      const res = await apiFetch('/products');
      if (res.ok && res.data && Array.isArray(res.data.data)) {
        const productsObj = {};
        res.data.data.forEach((p) => {
          const key = p.slug || p.id;
          productsObj[key] = {
            id: key,
            slug: p.slug,
            name: p.name,
            brand: p.brand,
            category: p.category,
            sub: p.sub,
            desc: p.desc || p.description || '',
            price: Number(p.price),
            oldPrice: p.oldPrice != null ? Number(p.oldPrice) : null,
            isNew: !!p.isNew,
            sizes: p.sizes || [],
            colors: p.colors || [],
            variantStock: p.variantStock || {}
          };
          normalizeProductStock(productsObj[key]);
        });
        saveProducts(productsObj);
        window.dispatchEvent(new CustomEvent('kynetix:catalog-synced', { detail: productsObj }));
        return productsObj;
      }
    } catch (e) {}
    return getProducts();
  }

  // Trigger non-blocking database catalog synchronization
  const catalogSyncPromise = syncProductsFromDB();

  // ---------- Shopping bag ----------
  const drawer = $('#bagDrawer');
  const overlay = $('#overlay');
  let bag = [];
  try { bag = JSON.parse(localStorage.getItem('kynetixBag')) || []; } catch (e) { bag = []; }

  function saveBag() {
    try { localStorage.setItem('kynetixBag', JSON.stringify(bag)); } catch (e) {}
  }

  function getBagItemStock(item) {
    const products = getProducts();
    if (item.productId && products[item.productId] && item.color && item.size) {
      return getVariantStock(products[item.productId], item.color, item.size);
    }
    const match = (item.name || '').match(/^(.+?)\s*\(([^,]+),\s*([^)]+)\)$/);
    if (match) {
      const [, , color, size] = match;
      const prod = Object.values(products).find((p) => p.name === match[1]);
      if (prod) return getVariantStock(prod, color.trim(), size.trim());
    }
    return 0;
  }

  function getQtyInBagForVariant(productId, color, size, fallbackName) {
    return bag.reduce((sum, item) => {
      if (productId && item.productId === productId && item.color === color && item.size === size) {
        return sum + item.qty;
      }
      if (!item.productId && fallbackName && item.name === fallbackName) {
        return sum + item.qty;
      }
      return sum;
    }, 0);
  }

  function renderBag() {
    const wrap = $('#bagItems');
    if (!wrap) return;
    const count = bag.reduce((n, i) => n + i.qty, 0);
    const total = bag.reduce((n, i) => n + i.qty * i.price, 0);

    const bagCount = $('#bagCount');
    if (bagCount) {
      bagCount.textContent = count;
      bagCount.classList.toggle('has-items', count > 0);
    }
    const bagTotal = $('#bagTotal');
    if (bagTotal) bagTotal.textContent = formatEGP(total);

    if (!bag.length) {
      wrap.innerHTML = '<p class="empty">Your bag is empty.</p>';
      return;
    }

    const products = getProducts();
    wrap.innerHTML = bag.map((i, idx) => {
      const maxStock = getBagItemStock(i);
      const atLimit = i.qty >= maxStock;
      const prod = i.productId ? products[i.productId] : null;
      const itemImg = i.img || (prod && prod.colors?.find((c) => c.name === i.color)?.img) || (prod && prod.colors?.[0]?.img) || 'images/hero-shoe.jpg';

      return `
      <div class="bag-item">
        <img src="${itemImg}" alt="${i.name}" style="width:52px; height:52px; object-fit:cover; background:var(--grey-100); border:1px solid var(--grey-300); flex-shrink:0;">
        <div style="flex:1; min-width:0;">
          <h4 style="font-size:14px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${i.name}</h4>
          <p style="font-size:13px; color:var(--grey-600);">${formatEGP(i.price)} each</p>
          ${maxStock === 0
            ? '<p class="bag-soldout-note">Sold Out</p>'
            : `<p class="bag-stock-note">In stock: ${maxStock}</p>`}
          <div class="bag-qty-controls">
            <button type="button" data-dec="${idx}" aria-label="Decrease quantity">&minus;</button>
            <span>${i.qty}</span>
            <button type="button" data-inc="${idx}" ${atLimit ? 'disabled' : ''} aria-label="Increase quantity">+</button>
          </div>
        </div>
        <button type="button" data-remove="${idx}">Remove</button>
      </div>`;
    }).join('');
  }

  if ($('#bagItems')) {
    $('#bagItems').addEventListener('click', (e) => {
      const removeIdx = e.target.dataset.remove;
      if (removeIdx !== undefined) {
        bag.splice(Number(removeIdx), 1);
        saveBag();
        renderBag();
        return;
      }

      const decIdx = e.target.dataset.dec;
      if (decIdx !== undefined) {
        const idx = Number(decIdx);
        if (bag[idx].qty > 1) {
          bag[idx].qty -= 1;
        } else {
          bag.splice(idx, 1);
        }
        saveBag();
        renderBag();
        return;
      }

      const incIdx = e.target.dataset.inc;
      if (incIdx !== undefined) {
        const idx = Number(incIdx);
        const item = bag[idx];
        const maxStock = getBagItemStock(item);

        if (maxStock <= 0) {
          showToast('This variant is sold out');
          return;
        }
        if (item.qty + 1 > maxStock) {
          showToast(`Only ${maxStock} left in stock for this option`);
          return;
        }
        item.qty += 1;
        saveBag();
        renderBag();
      }
    });
  }

  window.addToBag = function (item) {
    const products = getProducts();
    const prod = item.productId ? products[item.productId] : null;
    const maxStock = prod && item.color && item.size
      ? getVariantStock(prod, item.color, item.size)
      : getBagItemStock(item);

    if (maxStock <= 0) {
      showToast('This color & size is sold out');
      return;
    }

    const currentQty = getQtyInBagForVariant(item.productId, item.color, item.size, item.name);
    if (currentQty + 1 > maxStock) {
      showToast(`Cannot add more — only ${maxStock} in stock for ${item.color} (${item.size})`);
      return;
    }

    const itemImg = item.img || (prod && prod.colors?.find((c) => c.name === item.color)?.img) || (prod && prod.colors?.[0]?.img) || 'images/hero-shoe.jpg';

    const found = bag.find((b) =>
      (b.productId && b.productId === item.productId && b.color === item.color && b.size === item.size) ||
      (!b.productId && b.name === item.name)
    );

    if (found) {
      found.qty += 1;
      if (!found.img && itemImg) found.img = itemImg;
    } else {
      bag.push({
        productId: item.productId || null,
        color: item.color || '',
        size: item.size || '',
        name: item.name,
        price: item.price,
        qty: 1,
        img: itemImg
      });
    }
    saveBag();
    renderBag();
    console.log('Add to Bag successfully done | Item: ' + item.name + ' | Price: ' + item.price + ' EGP | Variant Stock: ' + maxStock + ' | Bag Qty: ' + bag.reduce((n, i) => n + i.qty, 0));
    showToast(item.name + ' added to bag');
  };

  function openBag() {
    if (!drawer) return;
    renderBag();
    drawer.classList.add('is-open');
    if (overlay) overlay.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
  }
  function closeBag() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  if ($('#bagBtn')) $('#bagBtn').addEventListener('click', openBag);
  if ($('#closeBag')) $('#closeBag').addEventListener('click', closeBag);
  if (overlay) overlay.addEventListener('click', () => { closeBag(); closeWishlist(); });

  if ($('#checkoutBtn')) {
    $('#checkoutBtn').addEventListener('click', () => {
      if (!bag.length) {
        const products = getProducts();
        const firstKey = Object.keys(products)[0] || 'nike-pegasus';
        const p = products[firstKey];
        if (p) {
          const color = p.colors[0]?.name || 'Volt / Black';
          const size = p.sizes[1] || p.sizes[0] || 'US 10';
          bag.push({
            productId: firstKey,
            color: color,
            size: size,
            name: `${p.name} (${color}, ${size})`,
            price: Number(p.price),
            qty: 1,
            img: p.colors[0]?.img || 'images/hero-shoe.jpg'
          });
          saveBag();
          renderBag();
          showToast('Added ' + p.name + ' to your bag for instant checkout!');
        }
      }
      closeBag();
      window.location.href = 'checkout.html';
    });
  }
  renderBag();

  // ---------- Wishlist System ----------
  let wishlist = [];
  try { wishlist = JSON.parse(localStorage.getItem('kynetixWishlist')) || []; } catch (e) { wishlist = []; }

  function saveWishlist() {
    try { localStorage.setItem('kynetixWishlist', JSON.stringify(wishlist)); } catch (e) {}
  }

  function isWishlisted(productId) {
    return wishlist.some((w) => w.productId === productId);
  }

  async function syncWishlistFromDB() {
    if (!getAuthToken()) return;
    const res = await apiFetch('/wishlist');
    if (res.ok && res.data && Array.isArray(res.data.data)) {
      wishlist = res.data.data.map((w) => ({
        productId: w.productId,
        name: w.name,
        brand: w.brand,
        price: Number(w.price),
        img: w.img || '',
        addedAt: w.addedAt ? new Date(w.addedAt).getTime() : Date.now()
      }));
      saveWishlist();
      updateWishlistCount();
      renderWishlistDrawer();
      updateWishlistButtons();
    }
  }

  function toggleWishlist(productId) {
    const products = getProducts();
    const p = products[productId];
    if (!p) return;
    const removing = isWishlisted(productId);
    if (removing) {
      wishlist = wishlist.filter((w) => w.productId !== productId);
      showToast('Removed from wishlist');
      if (getAuthToken()) {
        apiFetch(`/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE' });
      }
    } else {
      wishlist.push({
        productId,
        name: p.name,
        brand: p.brand,
        price: p.price,
        img: p.colors[0]?.img || '',
        addedAt: Date.now()
      });
      showToast(`${p.name} saved to wishlist`);
      if (getAuthToken()) {
        apiFetch('/wishlist', { method: 'POST', body: JSON.stringify({ productId }) });
      }
    }
    saveWishlist();
    updateWishlistCount();
    renderWishlistDrawer();
    updateWishlistButtons();
  }

  function updateWishlistCount() {
    const badge = $('#wishlistCount');
    if (badge) {
      badge.textContent = wishlist.length;
      badge.classList.toggle('has-items', wishlist.length > 0);
    }
  }

  function renderWishlistDrawer() {
    const wrap = $('#wishlistItems');
    if (!wrap) return;
    if (!wishlist.length) {
      wrap.innerHTML = '<p class="empty">Your wishlist is empty.</p>';
      return;
    }
    wrap.innerHTML = wishlist.map((w) => `
      <div class="wish-item">
        <img class="wish-item__img" src="${w.img}" alt="${w.name}" onerror="this.style.display='none'">
        <div class="wish-item__info">
          <div class="wish-item__brand">${w.brand}</div>
          <a class="wish-item__title" href="product.html?id=${w.productId}">${w.name}</a>
          <div class="wish-item__price">${formatEGP(w.price)}</div>
        </div>
        <div class="wish-item__actions">
          <button class="wish-item__move-btn" data-move-wish="${w.productId}">Add to Bag</button>
          <button class="wish-item__remove-btn" data-rm-wish="${w.productId}">Remove</button>
        </div>
      </div>
    `).join('');
  }

  function updateWishlistButtons() {
    document.querySelectorAll('[data-wish-id]').forEach((btn) => {
      const pid = btn.dataset.wishId;
      btn.classList.toggle('is-active', isWishlisted(pid));
    });
    const prodWishBtn = $('#prodWishlistBtn');
    if (prodWishBtn && prodWishBtn.dataset.wishId) {
      const pid = prodWishBtn.dataset.wishId;
      const isWished = isWishlisted(pid);
      prodWishBtn.classList.toggle('is-active', isWished);
      const txt = $('#prodWishlistText');
      if (txt) txt.textContent = isWished ? 'Saved to Wishlist \u2665' : 'Save to Wishlist';
    }
  }

  const wishlistDrawer = $('#wishlistDrawer');
  function openWishlist() {
    renderWishlistDrawer();
    if (wishlistDrawer) {
      wishlistDrawer.classList.add('is-open');
      wishlistDrawer.setAttribute('aria-hidden', 'false');
      if (overlay) overlay.classList.add('is-open');
    }
  }
  function closeWishlist() {
    if (wishlistDrawer) {
      wishlistDrawer.classList.remove('is-open');
      wishlistDrawer.setAttribute('aria-hidden', 'true');
      if (overlay && !drawer?.classList.contains('is-open')) {
        overlay.classList.remove('is-open');
      }
    }
  }
  if ($('#wishlistBtn')) $('#wishlistBtn').addEventListener('click', openWishlist);
  if ($('#closeWishlist')) $('#closeWishlist').addEventListener('click', closeWishlist);

  if (wishlistDrawer) {
    wishlistDrawer.addEventListener('click', (e) => {
      const moveId = e.target.dataset.moveWish;
      if (moveId) {
        const products = getProducts();
        const p = products[moveId];
        if (p) {
          window.addToBag({
            productId: moveId,
            color: p.colors[0]?.name || '',
            size: p.sizes[0] || '',
            name: `${p.name} (${p.colors[0]?.name || ''}, ${p.sizes[0] || ''})`,
            price: Number(p.price),
            img: p.colors[0]?.img || ''
          });
          wishlist = wishlist.filter((w) => w.productId !== moveId);
          saveWishlist();
          updateWishlistCount();
          renderWishlistDrawer();
          updateWishlistButtons();
          if (getAuthToken()) {
            apiFetch(`/wishlist/${encodeURIComponent(moveId)}`, { method: 'DELETE' });
          }
        }
        return;
      }
      const rmId = e.target.dataset.rmWish;
      if (rmId) {
        wishlist = wishlist.filter((w) => w.productId !== rmId);
        saveWishlist();
        updateWishlistCount();
        renderWishlistDrawer();
        updateWishlistButtons();
        if (getAuthToken()) {
          apiFetch(`/wishlist/${encodeURIComponent(rmId)}`, { method: 'DELETE' });
        }
      }
    });
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-wish-id]');
    if (btn && btn !== $('#prodWishlistBtn')) {
      e.preventDefault();
      e.stopPropagation();
      toggleWishlist(btn.dataset.wishId);
    }
  });

  updateWishlistCount();
  renderWishlistDrawer();

  // ---------- Live Search Autocomplete ----------
  const searchInput = $('#searchInput');
  const searchDropdown = $('#searchDropdown');

  if (searchInput) {
    function renderSearchDropdown(query) {
      if (!searchDropdown) return;
      if (!query) { searchDropdown.hidden = true; return; }
      const q = query.toLowerCase();
      const products = getProducts();
      const matches = Object.entries(products)
        .filter(([, p]) => {
          const hay = `${p.name} ${p.brand} ${p.category || ''} ${p.sub || ''} ${p.desc || ''} ${['Tops', 'Shirts'].includes(p.sub) ? 'tshirt t-shirt tee shirt top' : ''}`.toLowerCase();
          return hay.includes(q);
        })
        .slice(0, 5);

      if (!matches.length) {
        searchDropdown.innerHTML = `<div class="search-empty">No results for "${query}"</div>`;
        searchDropdown.hidden = false;
        return;
      }

      searchDropdown.innerHTML = matches.map(([id, p]) => `
        <a class="search-item" href="product.html?id=${id}">
          <img src="${p.colors[0]?.img || ''}" alt="${p.name}" onerror="this.style.display='none'">
          <div class="search-item__info">
            <div class="search-item__brand">${p.brand}</div>
            <div class="search-item__title">${p.name}</div>
          </div>
          <div class="search-item__price">${formatEGP(p.price)}</div>
        </a>
      `).join('') + `<a class="search-dropdown-footer" href="shop.html?q=${encodeURIComponent(query)}">See all results for "${query}" &rarr;</a>`;
      searchDropdown.hidden = false;
    }

    searchInput.addEventListener('input', () => renderSearchDropdown(searchInput.value.trim()));
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim()) renderSearchDropdown(searchInput.value.trim());
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchDropdown) searchDropdown.hidden = true;
    });
    document.addEventListener('click', (e) => {
      if (searchDropdown && searchInput && !searchInput.closest('form')?.contains(e.target)) {
        searchDropdown.hidden = true;
      }
    });
    const searchForm = searchInput.closest('form');
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (!q) return showToast('Type something to search');
        if (searchDropdown) searchDropdown.hidden = true;
        location.href = 'shop.html?q=' + encodeURIComponent(q);
      });
    }
  }

  // ---------- Account modal ----------
  const authModal = $('#authModal');
  function openAuth() { if (authModal) { authModal.classList.add('is-open'); authModal.setAttribute('aria-hidden', 'false'); } }
  function closeAuth() { if (authModal) { authModal.classList.remove('is-open'); authModal.setAttribute('aria-hidden', 'true'); } }
  if ($('#accountBtn')) $('#accountBtn').addEventListener('click', openAuth);
  if ($('#closeAuth')) $('#closeAuth').addEventListener('click', closeAuth);
  if (authModal) authModal.addEventListener('click', (e) => { if (e.target === authModal) closeAuth(); });

  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const isLogin = tab.dataset.tab === 'login';
      if ($('#loginForm')) $('#loginForm').hidden = !isLogin;
      if ($('#signupForm')) $('#signupForm').hidden = isLogin;
      const dashView = $('#authUserDashboard');
      if (dashView) dashView.hidden = true;
    });
  });

  function updateAuthState() {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('kynetixUser')); } catch (e) {}
    const guestView = $('#authGuestView');
    const dashView = $('#authUserDashboard');
    if (user && user.loggedIn) {
      if (guestView) guestView.hidden = true;
      if (dashView) dashView.hidden = false;
      if ($('#userDashName')) $('#userDashName').textContent = user.name || 'Athlete';
      if ($('#userDashEmail')) $('#userDashEmail').textContent = user.email || '';

      const isAdmin = user.role === 'admin' || (user.email && user.email.toLowerCase() === 'admin@kynetix.eg');
      let adminBadge = $('#userDashAdminBadge');
      if (isAdmin) {
        if (!adminBadge && $('#userDashName')) {
          adminBadge = document.createElement('a');
          adminBadge.id = 'userDashAdminBadge';
          adminBadge.href = 'admin.html';
          adminBadge.className = 'btn btn--black btn--full';
          adminBadge.style.cssText = 'margin-top:10px; margin-bottom:14px; text-align:center; display:block; text-decoration:none;';
          adminBadge.textContent = 'Open Admin Dashboard \u2192';
          $('#userDashName').parentElement.appendChild(adminBadge);
        }
      } else if (adminBadge) {
        adminBadge.remove();
      }

      const renderDashOrders = (list) => {
        const ordersWrap = $('#userDashOrders');
        if (!ordersWrap) return;
        ordersWrap.innerHTML = list.length
          ? list.slice(0, 5).map((o) => `
              <div class="dash-order-card">
                <strong>${o.orderId}</strong>
                <span>${o.orderDate}</span>
                <a href="track.html?order=${o.orderId}">Track</a>
              </div>`).join('')
          : '<p style="font-size:13px;color:var(--grey-600);">No orders yet.</p>';
      };

      const localOrders = [];
      try { localOrders.push(...(JSON.parse(localStorage.getItem('kynetixOrders')) || [])); } catch(e) {}
      renderDashOrders(localOrders);

      if (user.token) {
        apiFetch('/orders/my-orders').then((res) => {
          if (res.ok && res.data && Array.isArray(res.data.data) && res.data.data.length) {
            renderDashOrders(res.data.data);
          }
        });
        syncWishlistFromDB();
      }
    } else {
      if (guestView) guestView.hidden = false;
      if (dashView) dashView.hidden = true;
    }
  }

  // ---------- Local accounts (used only when the Node/MySQL backend is not available) ----------
  // Demo accounts from readme.txt, plus any account signed up in this browser.
  const DEMO_ACCOUNTS = [
    { email: 'ammar@kynetix.eg', name: 'Ammar', role: 'customer', password: 'kynetix' },
    { email: 'ammar@kynetix', name: 'Ammar', role: 'customer', password: 'kynetix' },
    { email: 'admin@kynetix.eg', name: 'Admin', role: 'admin', password: 'kynetix' }
  ];

  function getSavedAccounts() {
    try {
      const list = JSON.parse(localStorage.getItem('kynetixAccounts') || '[]');
      return Array.isArray(list) ? list : [];
    } catch (err) { return []; }
  }

  async function hashPassword(password) {
    const text = 'kynetix:' + password;
    if (window.crypto && window.crypto.subtle) {
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    // crypto.subtle is missing on plain-http LAN addresses; fall back to a simple hash
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    return 'h' + (h >>> 0).toString(16);
  }

  async function findLocalAccount(email) {
    const e = String(email || '').trim().toLowerCase();
    return DEMO_ACCOUNTS.find((a) => a.email === e) || getSavedAccounts().find((a) => a.email === e) || null;
  }

  async function checkLocalPassword(account, password) {
    if (account.password !== undefined) return account.password === password;
    return account.hash === (await hashPassword(password));
  }

  if ($('#loginForm')) {
    $('#loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailEl = $('#loginEmail');
      const passEl = $('#loginPassword');
      const email = emailEl ? emailEl.value.trim() : '';
      const password = passEl ? passEl.value : '';
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn && submitBtn.disabled) return;
      setButtonLoading(submitBtn, true, 'Logging in...');

      // Call Node.js MVC backend API
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setButtonLoading(submitBtn, false);

      let isAdmin = false;
      if (res.ok && res.data && res.data.success) {
        const role = res.data.user.role || (res.data.user.email === 'admin@kynetix.eg' ? 'admin' : 'customer');
        const user = {
          email: res.data.user.email,
          name: res.data.user.name,
          role,
          token: res.data.token,
          loggedIn: true
        };
        try { localStorage.setItem('kynetixUser', JSON.stringify(user)); } catch (err) {}
        closeAuth();
        updateAuthState();
        isAdmin = role === 'admin' || user.email.toLowerCase() === 'admin@kynetix.eg';
        console.log('Login successfully done | User: ' + user.name + ' (' + user.email + ') | Role: ' + user.role);
        showToast('Welcome back, ' + user.name + '!');
      } else if (res.networkError) {
        // No backend (e.g. Vercel): only demo accounts or accounts signed up in this browser can log in
        const account = await findLocalAccount(email);
        if (!account) {
          showToast('No account found for this email. Please sign up first.');
          return;
        }
        if (!(await checkLocalPassword(account, password))) {
          showToast('Incorrect email or password');
          return;
        }
        const user = { email: account.email, name: account.name, role: account.role, loggedIn: true };
        try { localStorage.setItem('kynetixUser', JSON.stringify(user)); } catch (err) {}
        closeAuth();
        updateAuthState();
        isAdmin = account.role === 'admin';
        showToast('Welcome back, ' + user.name + '!');
      } else {
        showToast(res.error || 'Invalid email or password');
        return;
      }

      // If admin user, instantly redirect to the admin dashboard
      if (isAdmin && !window.location.pathname.endsWith('admin.html')) {
        window.location.href = 'admin.html';
      }
    });
  }
  if ($('#signupForm')) {
    $('#signupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameEl = $('#signupName');
      const emailEl = $('#signupEmail');
      const passEl = $('#signupPassword');
      const name = nameEl ? nameEl.value.trim() : 'Athlete';
      const email = emailEl ? emailEl.value.trim() : '';
      const password = passEl ? passEl.value : '123456';
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn && submitBtn.disabled) return;
      setButtonLoading(submitBtn, true, 'Creating account...');

      // Call Node.js MVC backend API
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
      setButtonLoading(submitBtn, false);

      if (res.ok && res.data && res.data.success) {
        const role = res.data.user.role || 'customer';
        const user = {
          email: res.data.user.email,
          name: res.data.user.name,
          role,
          token: res.data.token,
          loggedIn: true
        };
        try { localStorage.setItem('kynetixUser', JSON.stringify(user)); } catch (err) {}
        closeAuth();
        updateAuthState();
        showToast('Account created! Welcome, ' + user.name + '!');

        if (role === 'admin' && !window.location.pathname.endsWith('admin.html')) {
          window.location.href = 'admin.html';
        }
      } else if (res.networkError) {
        // No backend (e.g. Vercel): save the account in this browser. New accounts are always customers.
        if (await findLocalAccount(email)) {
          showToast('An account with this email already exists. Please log in.');
          return;
        }
        const saved = getSavedAccounts();
        saved.push({ email: email.toLowerCase(), name: name || 'Athlete', role: 'customer', hash: await hashPassword(password) });
        try { localStorage.setItem('kynetixAccounts', JSON.stringify(saved)); } catch (err) {}
        const user = { email: email.toLowerCase(), name: name || 'Athlete', role: 'customer', loggedIn: true };
        try { localStorage.setItem('kynetixUser', JSON.stringify(user)); } catch (err) {}
        closeAuth();
        updateAuthState();
        showToast('Account created! Welcome, ' + user.name + '!');
      } else {
        showToast(res.error || 'Failed to create account');
      }
    });
  }
  if ($('#logoutBtn')) {
    $('#logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('kynetixUser');
      updateAuthState();
      closeAuth();
      showToast('Logged out successfully');
    });
  }
  updateAuthState();

  // ---------- Shared product card (shop grid + home rails) ----------
  function productCardHTML(p) {
    const isSoldOut = getTotalProductStock(p) <= 0;
    const sale = isOnSale(p);
    let badge = '';
    if (isSoldOut) badge = '<span class="p-card__badge p-card__badge--soldout">Sold Out</span>';
    else if (sale) badge = `<span class="p-card__badge p-card__badge--sale">-${discountPercent(p)}%</span>`;
    else if (p.isNew) badge = '<span class="p-card__badge p-card__badge--new">New</span>';
    return `
      <article class="p-card ${isSoldOut ? 'is-sold-out' : ''} ${sale ? 'is-on-sale' : ''}">
        <a href="product.html?id=${p.id}" class="p-card__img-wrap">
          <img src="${p.colors[0]?.img || ''}" alt="${p.name}" loading="lazy">
          ${badge}
          ${sale ? `
          <div class="price-tag" aria-label="Sale price">
            <span class="price-tag__now">${formatEGPPrefix(p.price)}</span>
            <s class="price-tag__was">${formatEGPPrefix(p.oldPrice)}</s>
          </div>` : ''}
          <button class="p-card__wish-btn ${isWishlisted(p.id) ? 'is-active' : ''}" data-wish-id="${p.id}" aria-label="Save to wishlist">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        </a>
        <div class="p-card__body">
          <span class="p-card__brand">${p.brand}</span>
          <h3 class="p-card__title"><a href="product.html?id=${p.id}">${p.name}</a></h3>
          ${sale ? '' : `<div class="p-card__foot"><span class="p-card__price">${formatEGP(p.price)}</span></div>`}
          <span class="p-card__meta">${p.category || ''}${p.colors.length > 1 ? ` &middot; ${p.colors.length} colors` : ''}</span>
        </div>
      </article>
    `;
  }

  // ---------- Home page rails: New Arrivals + Discounts ----------
  function renderHomeRails() {
    const newGrid = $('#newArrivalsGrid');
    const saleGrid = $('#saleGrid');
    if (!newGrid && !saleGrid) return;
    const all = Object.entries(getProducts()).map(([id, p]) => ({ id, ...p }));
    if (newGrid) {
      // Round-robin across categories so the rail shows a mix, not one section
      const byCat = {};
      all.filter((p) => p.isNew).forEach((p) => { (byCat[p.category] = byCat[p.category] || []).push(p); });
      const order = ['Kids', 'Men', 'Women', 'Kids', 'Accessories'];
      const picks = [];
      for (let i = 0; picks.length < 8 && i < 40; i++) {
        const next = (byCat[order[i % order.length]] || []).shift();
        if (next) picks.push(next);
      }
      newGrid.innerHTML = picks.map(productCardHTML).join('');
    }
    const saleMax = $('#saleMaxPercent');
    if (saleMax) saleMax.textContent = Math.max(0, ...all.map(discountPercent));
    if (saleGrid) {
      saleGrid.innerHTML = all.filter(isOnSale)
        .sort((a, b) => discountPercent(b) - discountPercent(a))
        .slice(0, 8).map(productCardHTML).join('');
    }
    updateWishlistButtons();
  }
  renderHomeRails();
  window.addEventListener('kynetix:catalog-synced', renderHomeRails);

  // ---------- Shop Catalog & Sidebar Filtering (shop.html) ----------
  if ($('#shopProductGrid')) {
    const productsObj = getProducts();
    let allProducts = Object.entries(productsObj).map(([id, p]) => ({ id, ...p }));
    const params = new URLSearchParams(window.location.search);

    window.addEventListener('kynetix:catalog-synced', (e) => {
      const updatedObj = e.detail || getProducts();
      allProducts = Object.entries(updatedObj).map(([id, p]) => ({ id, ...p }));
      if (typeof renderSidebarFilters === 'function') renderSidebarFilters();
      renderShop();
    });

    const SUB_ALIASES = {
      'tops': 'Tops',
      'top': 'Tops',
      't-shirts': 'Tops',
      't-shirt': 'Tops',
      'tshirts': 'Tops',
      'tshirt': 'Tops',
      'shirts': 'Tops',
      'shirt': 'Tops',
      'tees': 'Tops',
      'tee': 'Tops',
      'shoes': 'Shoes',
      'shoe': 'Shoes',
      'sneakers': 'Shoes',
      'runners': 'Shoes',
      'hoodies': 'Hoodies',
      'hoodie': 'Hoodies',
      'jackets': 'Hoodies',
      'jacket': 'Hoodies',
      'sweatshirts': 'Hoodies',
      'pants': 'Pants',
      'trousers': 'Pants',
      'shorts': 'Shorts',
      'short': 'Shorts',
      'leggings': 'Leggings',
      'tights': 'Leggings',
      'bras': 'Tops',
      'sports-bras': 'Tops',
      'bags': 'Bags',
      'bag': 'Bags',
      'backpacks': 'Bags',
      'duffels': 'Bags',
      'hats': 'Hats',
      'hat': 'Hats',
      'caps': 'Hats',
      'cap': 'Hats',
      'socks': 'Socks',
      'sock': 'Socks',
      'gear': 'Socks',
      'boys': 'Boys',
      'girls': 'Girls'
    };

    function canonicalSub(val) {
      if (!val) return '';
      const k = String(val).trim().toLowerCase();
      return SUB_ALIASES[k] || val;
    }

    function subDisplayLabel(sub) {
      const canonical = canonicalSub(sub);
      if (canonical === 'Tops') return 'Tops & T-Shirts';
      if (canonical === 'Hoodies') return 'Hoodies & Jackets';
      if (canonical === 'Pants') return 'Pants & Shorts';
      if (canonical === 'Leggings') return 'Leggings & Shorts';
      if (canonical === 'Bags') return 'Bags & Backpacks';
      if (canonical === 'Hats') return 'Hats & Caps';
      if (canonical === 'Socks') return 'Socks & Gear';
      if (canonical === 'Boys') return 'Boys Clothing';
      if (canonical === 'Girls') return 'Girls Clothing';
      return canonical;
    }

    const initialSub = params.get('sub') ? [canonicalSub(params.get('sub'))] : [];

    const state = {
      categories: new Set(params.get('category') ? [params.get('category')] : []),
      subs: new Set(initialSub),
      brands: new Set(params.get('brand') ? [params.get('brand')] : []),
      sizes: new Set(),
      maxPrice: 15000,
      search: (params.get('q') || '').toLowerCase(),
      special: ['new', 'sale'].includes(params.get('filter')) ? params.get('filter') : '',
      sort: 'featured'
    };

    if (state.search && $('#searchInput')) {
      $('#searchInput').value = params.get('q');
    }

    function renderCheckboxes(containerId, items, stateSet, type) {
      const wrap = $(containerId);
      if (!wrap) return;
      wrap.innerHTML = items.map((val) => `
        <label class="filter-check">
          <input type="checkbox" data-filter-type="${type}" value="${val}" ${stateSet.has(val) ? 'checked' : ''}>
          <span>${type === 'subs' ? subDisplayLabel(val) : val}</span>
        </label>
      `).join('');
    }

    const sizeWrap = $('#filterSizes');

    function renderSidebarFilters() {
      const uniqueCategories = [...new Set(allProducts.map((p) => p.category).filter(Boolean))];
      const uniqueSubs = [...new Set(allProducts.map((p) => canonicalSub(p.sub)).filter(Boolean))];
      const uniqueBrands = [...new Set(allProducts.map((p) => p.brand).filter(Boolean))];
      const uniqueSizes = [...new Set(allProducts.flatMap((p) => p.sizes || []))];

      renderCheckboxes('#filterCategories', uniqueCategories, state.categories, 'categories');
      renderCheckboxes('#filterSubcategories', uniqueSubs, state.subs, 'subs');
      renderCheckboxes('#filterBrands', uniqueBrands, state.brands, 'brands');

      if (sizeWrap) {
        sizeWrap.innerHTML = uniqueSizes.map((sz) => `
          <button type="button" class="filter-size-chip ${state.sizes.has(sz) ? 'is-active' : ''}" data-size-filter="${sz}">${sz}</button>
        `).join('');
      }
    }

    renderSidebarFilters();

    function updateHeading() {
      const parts = [];
      if (state.special === 'new') parts.push('New Arrivals');
      if (state.special === 'sale') parts.push('Discounts');
      if (state.categories.size) parts.push([...state.categories].join(', '));
      if (state.brands.size) parts.push([...state.brands].join(', '));
      if (state.subs.size) parts.push([...state.subs].map(subDisplayLabel).join(', '));
      if (state.search) parts.push(`"${params.get('q')}"`);
      const heading = $('#shopHeading');
      if (heading) heading.textContent = parts.length ? parts.join(' \u2022 ') : 'All Products';
    }

    function renderShop() {
      updateHeading();

      let filtered = allProducts.filter((p) => {
        if (state.special === 'new' && !p.isNew) return false;
        if (state.special === 'sale' && !isOnSale(p)) return false;
        if (state.categories.size && !state.categories.has(p.category)) return false;
        if (state.subs.size && !state.subs.has(canonicalSub(p.sub))) return false;
        if (state.brands.size && !state.brands.has(p.brand)) return false;
        if (state.sizes.size && !(p.sizes || []).some((s) => state.sizes.has(s))) return false;
        if (Number(p.price) > state.maxPrice) return false;
        if (state.search) {
          const hay = `${p.name} ${p.brand} ${p.category || ''} ${p.sub || ''} ${canonicalSub(p.sub)} ${subDisplayLabel(p.sub)} ${p.desc || ''} ${['Tops', 'Shirts'].includes(p.sub) ? 'tshirt t-shirt tee shirt top' : ''}`.toLowerCase();
          if (!hay.includes(state.search)) return false;
        }
        return true;
      });

      if (state.sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
      if (state.sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
      if (state.sort === 'name-asc') filtered.sort((a, b) => a.name.localeCompare(b.name));
      if (state.sort === 'discount') filtered.sort((a, b) => discountPercent(b) - discountPercent(a));

      const resultCount = $('#shopResultCount');
      if (resultCount) resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'item' : 'items'}`;
      console.log('Shop Filter successfully done | Matched: ' + filtered.length + ' of ' + allProducts.length + ' products | Sort: ' + state.sort);

      const grid = $('#shopProductGrid');
      if (!filtered.length) {
        grid.innerHTML = `
          <div class="empty-shop">
            <h3>No matching products</h3>
            <p style="color:var(--grey-600); margin-bottom:20px;">Try adjusting or clearing your active filters.</p>
            <button type="button" class="btn btn--black" id="emptyResetBtn">Reset Filters</button>
          </div>
        `;
        return;
      }

      grid.innerHTML = filtered.map(productCardHTML).join('');

      // Re-sync wishlist button states after re-render
      updateWishlistButtons();
    }

    const shopSidebar = $('.shop-sidebar');
    if (shopSidebar) {
      shopSidebar.addEventListener('change', (e) => {
        const type = e.target.dataset.filterType;
        if (!type) return;
        if (e.target.checked) state[type].add(e.target.value);
        else state[type].delete(e.target.value);
        renderShop();
      });
    }

    if (sizeWrap) {
      sizeWrap.addEventListener('click', (e) => {
        const sz = e.target.dataset.sizeFilter;
        if (!sz) return;
        if (state.sizes.has(sz)) state.sizes.delete(sz);
        else state.sizes.add(sz);
        e.target.classList.toggle('is-active');
        renderShop();
      });
    }

    const filterMaxPrice = $('#filterMaxPrice');
    if (filterMaxPrice) {
      filterMaxPrice.addEventListener('input', (e) => {
        state.maxPrice = Number(e.target.value);
        const label = $('#maxPriceLabel');
        if (label) label.textContent = state.maxPrice;
        renderShop();
      });
    }

    const shopSort = $('#shopSort');
    if (shopSort) {
      shopSort.addEventListener('change', (e) => {
        state.sort = e.target.value;
        renderShop();
      });
    }

    function clearAllFilters() {
      state.categories.clear();
      state.subs.clear();
      state.brands.clear();
      state.sizes.clear();
      state.maxPrice = 15000;
      state.search = '';
      state.special = '';
      if ($('#searchInput')) $('#searchInput').value = '';
      if (filterMaxPrice) filterMaxPrice.value = 15000;
      const label = $('#maxPriceLabel');
      if (label) label.textContent = '15000';
      $$('.shop-sidebar input[type="checkbox"]').forEach((cb) => (cb.checked = false));
      $$('.filter-size-chip').forEach((btn) => btn.classList.remove('is-active'));
      history.replaceState(null, '', 'shop.html');
      renderShop();
    }

    const clearFiltersBtn = $('#clearFiltersBtn');
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearAllFilters);

    const shopGrid = $('#shopProductGrid');
    if (shopGrid) {
      shopGrid.addEventListener('click', (e) => {
        if (e.target.id === 'emptyResetBtn') clearAllFilters();
      });
    }

    if ($('#mobileFilterToggle')) {
      $('#mobileFilterToggle').addEventListener('click', () => {
        if (shopSidebar) shopSidebar.classList.toggle('is-open');
      });
    }

    renderShop();
  }

  // ---------- Product Page Logic (product.html) ----------
  if ($('#prodTitle')) {
    (async function initProductPage() {
      let PRODUCTS = getProducts();
      const params = new URLSearchParams(window.location.search);
      const requestedId = params.get('id');

      if (!Object.keys(PRODUCTS).length || (requestedId && !PRODUCTS[requestedId])) {
        if (requestedId) {
          const singleRes = await apiFetch(`/products/${encodeURIComponent(requestedId)}`);
          if (singleRes.ok && singleRes.data && singleRes.data.data) {
            const p = singleRes.data.data;
            const key = p.slug || p.id;
            PRODUCTS[key] = normalizeProductStock({
              id: key,
              slug: p.slug,
              name: p.name,
              brand: p.brand,
              category: p.category,
              sub: p.sub,
              desc: p.desc || p.description || '',
              price: Number(p.price),
              oldPrice: p.oldPrice != null ? Number(p.oldPrice) : null,
              isNew: !!p.isNew,
              sizes: p.sizes || [],
              colors: p.colors || [],
              variantStock: p.variantStock || {}
            });
          }
        }
        if (!Object.keys(PRODUCTS).length) {
          PRODUCTS = await catalogSyncPromise;
        }
      }

      const prodId = (requestedId && PRODUCTS[requestedId]) ? requestedId : Object.keys(PRODUCTS)[0];
      const product = PRODUCTS[prodId];
      if (!product) {
        if ($('#prodTitle')) $('#prodTitle').textContent = 'Product not found';
        return;
      }

    let selectedColor = product.colors[0];
    let selectedSize = null;
    const totalStock = getTotalProductStock(product);
    const completelySoldOut = totalStock <= 0;

    document.title = `${product.name} | Kynetix Collective`;
    if ($('#prodBrand')) $('#prodBrand').textContent = `${product.brand}${product.category ? ' \u2022 ' + product.category : ''}`;
    if ($('#prodTitle')) $('#prodTitle').textContent = product.name;
    if ($('#prodPrice')) {
      $('#prodPrice').innerHTML = isOnSale(product)
        ? `<span class="prod-price--sale">${formatEGP(product.price)}</span>
           <s class="prod-price--was">${formatEGP(product.oldPrice)}</s>
           <span class="prod-price--off">-${discountPercent(product)}%</span>`
        : formatEGP(product.price);
    }
    if ($('#prodDesc')) $('#prodDesc').textContent = product.desc;

    const stockStatusEl = $('#prodStockStatus');
    const addToCartBtn = $('#addToCartBtn');

    function updateVariantAvailabilityUI() {
      if (!stockStatusEl || !addToCartBtn) return;

      if (completelySoldOut) {
        stockStatusEl.textContent = 'Sold Out';
        stockStatusEl.className = 'stock-status is-soldout';
        addToCartBtn.textContent = 'Sold Out';
        addToCartBtn.disabled = true;
        addToCartBtn.classList.add('is-disabled');
        return;
      }

      if (!selectedSize) {
        const colorTotal = product.sizes.reduce((sum, sz) => sum + getVariantStock(product, selectedColor.name, sz), 0);
        if (colorTotal <= 0) {
          stockStatusEl.textContent = `${selectedColor.name} \u2014 Sold Out in all sizes`;
          stockStatusEl.className = 'stock-status is-soldout';
          addToCartBtn.textContent = 'Sold Out';
          addToCartBtn.disabled = true;
          addToCartBtn.classList.add('is-disabled');
        } else {
          stockStatusEl.textContent = 'Select a size to check availability';
          stockStatusEl.className = 'stock-status';
          addToCartBtn.textContent = 'Add to Bag';
          addToCartBtn.disabled = false;
          addToCartBtn.classList.remove('is-disabled');
        }
        return;
      }

      const vStock = getVariantStock(product, selectedColor.name, selectedSize);
      if (vStock <= 0) {
        stockStatusEl.textContent = `${selectedColor.name} / ${selectedSize} \u2014 Sold Out`;
        stockStatusEl.className = 'stock-status is-soldout';
        addToCartBtn.textContent = 'Sold Out';
        addToCartBtn.disabled = true;
        addToCartBtn.classList.add('is-disabled');
      } else {
        stockStatusEl.textContent = `In Stock (${vStock} available in ${selectedColor.name}, ${selectedSize})`;
        stockStatusEl.className = 'stock-status is-instock';
        addToCartBtn.textContent = 'Add to Bag';
        addToCartBtn.disabled = false;
        addToCartBtn.classList.remove('is-disabled');
      }
    }

    function renderColors() {
      if ($('#selectedColorName')) $('#selectedColorName').textContent = selectedColor.name;
      const prodImg = $('#prodImg');
      if (prodImg) {
        prodImg.src = selectedColor.img;
        prodImg.alt = `${product.name} - ${selectedColor.name}`;
      }

      const colorOptions = $('#colorOptions');
      if (colorOptions) {
        colorOptions.innerHTML = product.colors.map((c, idx) => {
          const colorTotal = product.sizes.reduce((sum, sz) => sum + getVariantStock(product, c.name, sz), 0);
          return `
          <button type="button"
                  class="swatch ${c.name === selectedColor.name ? 'is-active' : ''} ${colorTotal <= 0 ? 'is-soldout' : ''}"
                  style="background-color: ${c.hex};"
                  data-color-idx="${idx}"
                  title="${c.name}${colorTotal <= 0 ? ' (Sold Out)' : ''}"
                  aria-label="${c.name}"></button>
        `;
        }).join('');
      }
    }

    function renderSizes() {
      const sizeOptions = $('#sizeOptions');
      if (sizeOptions) {
        sizeOptions.innerHTML = product.sizes.map((size) => {
          const vStock = getVariantStock(product, selectedColor.name, size);
          const soldOut = vStock <= 0;
          return `
          <button type="button"
                  class="size-btn ${size === selectedSize ? 'is-active' : ''} ${soldOut ? 'is-soldout' : ''}"
                  data-size="${size}"
                  title="${soldOut ? 'Sold Out' : `${vStock} in stock`}">${size}</button>
        `;
        }).join('');
      }
      updateVariantAvailabilityUI();
    }

    const colorOptionsEl = $('#colorOptions');
    if (colorOptionsEl) {
      colorOptionsEl.addEventListener('click', (e) => {
        const idx = e.target.dataset.colorIdx;
        if (idx === undefined) return;
        selectedColor = product.colors[Number(idx)];
        renderColors();
        renderSizes();
        // Update gallery thumb
        const galleryThumbs = $$('.gallery-thumb');
        galleryThumbs.forEach((t, i) => t.classList.toggle('is-active', i === Number(idx)));
      });
    }

    const sizeOptionsEl = $('#sizeOptions');
    if (sizeOptionsEl) {
      sizeOptionsEl.addEventListener('click', (e) => {
        const size = e.target.dataset.size;
        if (!size) return;
        selectedSize = size;
        renderSizes();
      });
    }

    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => {
        if (completelySoldOut) return showToast('This product is sold out');
        if (!selectedSize) return showToast('Please select a size first');
        const vStock = getVariantStock(product, selectedColor.name, selectedSize);
        if (vStock <= 0) return showToast('This color & size is sold out');

        window.addToBag({
          productId: prodId,
          color: selectedColor.name,
          size: selectedSize,
          name: `${product.name} (${selectedColor.name}, ${selectedSize})`,
          price: Number(product.price),
          img: selectedColor.img
        });
      });
    }

    renderColors();
    renderSizes();

    // Size Guide Modal
    if ($('#openSizeGuide')) {
      $('#openSizeGuide').addEventListener('click', () => {
        const modal = $('#sizeGuideModal');
        if (modal) { modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); }
      });
    }
    if ($('#closeSizeGuide')) {
      $('#closeSizeGuide').addEventListener('click', () => {
        const modal = $('#sizeGuideModal');
        if (modal) { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); }
      });
    }
    $$('.size-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.size-tab-btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const tab = btn.dataset.sizeTab;
        if ($('#sizeTableShoes')) $('#sizeTableShoes').hidden = tab !== 'shoes';
        if ($('#sizeTableApparel')) $('#sizeTableApparel').hidden = tab !== 'apparel';
      });
    });

    // Gallery Thumbnails
    const galleryThumbs = $('#galleryThumbs');
    const prodImgEl = $('#prodImg');
    if (galleryThumbs && prodImgEl) {
      galleryThumbs.innerHTML = product.colors.map((c, i) =>
        `<img class="gallery-thumb ${i === 0 ? 'is-active' : ''}" src="${c.img}" alt="${c.name}" data-thumb-idx="${i}">`
      ).join('');
      galleryThumbs.addEventListener('click', (e) => {
        const idx = e.target.dataset.thumbIdx;
        if (idx === undefined) return;
        prodImgEl.src = product.colors[Number(idx)].img;
        $$('.gallery-thumb').forEach((t) => t.classList.remove('is-active'));
        e.target.classList.add('is-active');
        selectedColor = product.colors[Number(idx)];
        renderColors();
        renderSizes();
      });
    }

    // Product Page Wishlist Button
    const prodWishBtn = $('#prodWishlistBtn');
    if (prodWishBtn) {
      prodWishBtn.dataset.wishId = prodId;
      updateWishlistButtons();
      prodWishBtn.addEventListener('click', () => toggleWishlist(prodId));
    }

    // Reviews
    const openReviewModalBtn = $('#openReviewModalBtn');
    const reviewModal = $('#reviewModal');
    const closeReviewModalBtn = $('#closeReviewModal');
    if (openReviewModalBtn) {
      openReviewModalBtn.addEventListener('click', () => {
        if (reviewModal) { reviewModal.classList.add('is-open'); reviewModal.setAttribute('aria-hidden', 'false'); }
      });
    }
    if (closeReviewModalBtn) {
      closeReviewModalBtn.addEventListener('click', () => {
        if (reviewModal) { reviewModal.classList.remove('is-open'); reviewModal.setAttribute('aria-hidden', 'true'); }
      });
    }
    const writeReviewForm = $('#writeReviewForm');
    if (writeReviewForm) {
      writeReviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const authorEl = $('#revAuthor');
        const starsEl = $('#revStars');
        const commentEl = $('#revComment');
        const author = authorEl ? authorEl.value.trim() : 'Anonymous';
        const stars = Number(starsEl ? starsEl.value : 5);
        const comment = commentEl ? commentEl.value.trim() : '';
        const starsStr = '\u2605'.repeat(stars) + '\u2606'.repeat(5 - stars);
        const card = document.createElement('div');
        card.className = 'review-card';
        card.innerHTML = `
          <div class="review-card__header">
            <strong>${author}</strong>
            <span class="review-stars">${starsStr}</span>
          </div>
          <p class="review-text">"${comment}"</p>
          <span class="review-date">Verified Purchase \u2022 Just now</span>
        `;
        const reviewsFeed = $('#reviewsFeed');
        if (reviewsFeed) reviewsFeed.prepend(card);
        if (reviewModal) { reviewModal.classList.remove('is-open'); reviewModal.setAttribute('aria-hidden', 'true'); }
        writeReviewForm.reset();

        // Sync review to MySQL database via Node.js MVC backend
        apiFetch('/reviews', {
          method: 'POST',
          body: JSON.stringify({
            productSlugOrId: prodId,
            authorName: author,
            rating: stars,
            comment: comment
          })
        });

        showToast('Review submitted \u2014 thank you!');
      });
    }

    // Load persisted reviews from MySQL backend
    async function loadProductReviews() {
      const reviewsFeed = $('#reviewsFeed');
      if (!reviewsFeed) return;
      const res = await apiFetch(`/reviews/${encodeURIComponent(prodId)}`);
      if (res.ok && res.data && Array.isArray(res.data.data) && res.data.data.length) {
        const list = res.data.data;
        reviewsFeed.innerHTML = list.map((rev) => {
          const rStars = '\u2605'.repeat(rev.rating) + '\u2606'.repeat(5 - rev.rating);
          return `
            <div class="review-card">
              <div class="review-card__header">
                <strong>${rev.author}</strong>
                <span class="review-stars">${rStars}</span>
              </div>
              <p class="review-text">"${rev.comment}"</p>
              <span class="review-date">${rev.isVerified ? 'Verified Purchase \u2022 ' : ''}${rev.date || ''}</span>
            </div>
          `;
        }).join('');
        const avg = (list.reduce((s, r) => s + Number(r.rating || 5), 0) / list.length).toFixed(1);
        if ($('#avgRatingHeader')) $('#avgRatingHeader').textContent = `${avg} (${list.length} ${list.length === 1 ? 'review' : 'reviews'})`;
      }
    }
    loadProductReviews();

    // Refresh variant stock when live database catalog finishes syncing
    window.addEventListener('kynetix:catalog-synced', (ev) => {
      const synced = ev.detail || getProducts();
      const updated = synced[prodId];
      if (updated) {
        product.price = updated.price;
        product.variantStock = updated.variantStock || product.variantStock;
        if ($('#prodPrice')) $('#prodPrice').textContent = formatEGP(product.price);
        if (typeof updateVariantAvailabilityUI === 'function') updateVariantAvailabilityUI();
      }
    });

    // Recommended Gear Grid
    const recommendedGrid = $('#recommendedGrid');
    if (recommendedGrid) {
      const otherProducts = Object.entries(PRODUCTS)
        .filter(([id]) => id !== prodId)
        .slice(0, 4);
      recommendedGrid.innerHTML = otherProducts.map(([id, p]) => {
        const totalStk = getTotalProductStock(p);
        const isSoldOut = totalStk <= 0;
        return `<article class="p-card ${isSoldOut ? 'is-sold-out' : ''}">
          <a href="product.html?id=${id}" class="p-card__img-wrap">
            <img src="${p.colors[0]?.img || ''}" alt="${p.name}" loading="lazy">
            ${p.category ? `<span class="p-card__badge">${p.category}</span>` : ''}
          </a>
          <div class="p-card__body">
            <span class="p-card__brand">${p.brand}</span>
            <h3 class="p-card__title"><a href="product.html?id=${id}">${p.name}</a></h3>
            <div class="p-card__foot">
              <span class="p-card__price">${formatEGP(p.price)}</span>
              <a href="product.html?id=${id}" class="btn-small">${isSoldOut ? 'Sold Out' : 'View'}</a>
            </div>
          </div>
        </article>`;
      }).join('');
    }
    })();
  }

  // ---------- Admin Dashboard Logic (admin.html) ----------
  if ($('#adminProductForm')) {
    const colorRowsContainer = $('#colorRowsContainer');
    const variantStockContainer = $('#variantStockContainer');

    function getCurrentFormColors() {
      return Array.from(colorRowsContainer.querySelectorAll('.color-row'))
        .map((row) => row.querySelector('.c-name').value.trim())
        .filter(Boolean);
    }

    function getCurrentFormSizes() {
      const sizesInput = $('#prodSizesInput');
      if (!sizesInput) return [];
      return sizesInput.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    function readCurrentMatrixValues() {
      const map = {};
      if (!variantStockContainer) return map;
      variantStockContainer.querySelectorAll('input[data-variant-key]').forEach((inp) => {
        map[inp.dataset.variantKey] = Math.max(0, parseInt(inp.value, 10) || 0);
      });
      return map;
    }

    function renderVariantStockMatrix(existingStockMap = null) {
      if (!variantStockContainer) return;
      const currentMap = existingStockMap || readCurrentMatrixValues();
      const colors = getCurrentFormColors();
      const sizes = getCurrentFormSizes();

      if (!colors.length || !sizes.length) {
        variantStockContainer.innerHTML = '<p style="font-size:13px; color:var(--grey-600);">Enter at least one color and one size to configure stock.</p>';
        return;
      }

      variantStockContainer.innerHTML = colors.map((color) => `
        <div class="variant-color-block">
          <div class="variant-color-title">${color}</div>
          <div class="variant-size-inputs">
            ${sizes.map((size) => {
              const key = variantKey(color, size);
              const val = key in currentMap ? currentMap[key] : 5;
              return `
                <label class="variant-cell">
                  <span>${size}</span>
                  <input type="number" min="0" step="1" data-variant-key="${key}" value="${val}">
                </label>
              `;
            }).join('')}
          </div>
        </div>
      `).join('');
    }

    function addColorRow(name = '', hex = '#0a0a0a', img = 'images/hero-shoe.jpg') {
      const row = document.createElement('div');
      row.className = 'color-row';
      row.innerHTML = `
        <input type="text" class="c-name" placeholder="Color name" value="${name}" required>
        <input type="color" class="c-hex" value="${hex}" title="Pick swatch color">
        <input type="text" class="c-img" placeholder="images/file.jpg" value="${img}" required>
        <button type="button" class="btn-small btn-danger remove-color-btn">&times;</button>
      `;
      colorRowsContainer.appendChild(row);
    }

    if ($('#addColorRowBtn')) {
      $('#addColorRowBtn').addEventListener('click', () => {
        addColorRow();
        renderVariantStockMatrix();
      });
    }

    colorRowsContainer.addEventListener('input', (e) => {
      if (e.target.classList.contains('c-name')) {
        renderVariantStockMatrix();
      }
    });

    const prodSizesInput = $('#prodSizesInput');
    if (prodSizesInput) {
      prodSizesInput.addEventListener('input', () => {
        renderVariantStockMatrix();
      });
    }

    if ($('#fillStockBtn')) {
      $('#fillStockBtn').addEventListener('click', () => {
        if (variantStockContainer) {
          variantStockContainer.querySelectorAll('input[data-variant-key]').forEach((inp) => {
            inp.value = 5;
          });
        }
      });
    }

    colorRowsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-color-btn')) {
        if (colorRowsContainer.children.length > 1) {
          e.target.closest('.color-row').remove();
          renderVariantStockMatrix();
        } else {
          showToast('At least one color is required');
        }
      }
    });

    function resetAdminForm() {
      const form = $('#adminProductForm');
      if (form) form.reset();
      if ($('#editOriginalId')) $('#editOriginalId').value = '';
      if ($('#adminFormTitle')) $('#adminFormTitle').textContent = 'Add New Product';
      if ($('#saveProdBtn')) $('#saveProdBtn').textContent = 'Save Product';
      if ($('#cancelEditBtn')) $('#cancelEditBtn').hidden = true;
      colorRowsContainer.innerHTML = '';
      addColorRow('Default Black', '#0a0a0a', 'images/hero-shoe.jpg');
      renderVariantStockMatrix({});
    }

    function renderAdminList() {
      const products = getProducts();
      const entries = Object.entries(products);
      if ($('#prodCount')) $('#prodCount').textContent = entries.length;

      const adminList = $('#adminProductList');
      if (!adminList) return;

      if (!entries.length) {
        adminList.innerHTML = '<p class="empty">No products found. Add one using the form.</p>';
        return;
      }

      adminList.innerHTML = entries.map(([id, p]) => {
        const totalStk = getTotalProductStock(p);
        const totalVariants = (p.colors?.length || 0) * (p.sizes?.length || 0);
        let soldOutVariants = 0;
        (p.colors || []).forEach((c) => {
          (p.sizes || []).forEach((s) => {
            if (getVariantStock(p, c.name, s) <= 0) soldOutVariants++;
          });
        });

        const stockBadge = totalStk === 0
          ? `<span class="admin-stock-tag is-soldout">Sold Out (0)</span>`
          : `<span class="admin-stock-tag">Total Stock: ${totalStk}${soldOutVariants > 0 ? ` (${soldOutVariants}/${totalVariants} sold out)` : ''}</span>`;

        return `
        <div class="admin-item">
          <div class="admin-item__left">
            <img src="${p.colors[0]?.img || ''}" alt="${p.name}" class="admin-item__img">
            <div class="admin-item__meta">
              <h4>${p.name} ${stockBadge}</h4>
              <p>${p.brand} &bull; ${p.category || 'Uncategorized'} (${p.sub || '-'}) &bull; ${formatEGP(p.price)}</p>
              <p>ID: <code>${id}</code> &bull; ${p.colors.length} color(s) &bull; ${p.sizes.length} size(s)</p>
            </div>
          </div>
          <div class="admin-item__actions">
            <a href="product.html?id=${id}" class="btn-small" target="_blank">View</a>
            <button type="button" class="btn-small" data-edit="${id}">Edit</button>
            <button type="button" class="btn-small btn-danger" data-delete="${id}">Delete</button>
          </div>
        </div>
      `;
      }).join('');
    }

    window.addEventListener('kynetix:catalog-synced', () => {
      renderAdminList();
    });

    $('#adminProductForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = $('#saveProdBtn');
      const originalText = saveBtn ? saveBtn.textContent : '';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
      }

      const products = getProducts();
      const originalId = $('#editOriginalId') ? $('#editOriginalId').value : '';
      const newIdEl = $('#prodIdInput');
      const newId = newIdEl ? newIdEl.value.trim().toLowerCase().replace(/\s+/g, '-') : '';

      const colors = Array.from(colorRowsContainer.querySelectorAll('.color-row')).map((row) => ({
        name: row.querySelector('.c-name').value.trim(),
        hex: row.querySelector('.c-hex').value,
        img: row.querySelector('.c-img').value.trim()
      }));

      const sizes = getCurrentFormSizes();
      const rawMatrix = readCurrentMatrixValues();
      const variantStock = {};
      colors.forEach((c) => {
        sizes.forEach((s) => {
          const key = variantKey(c.name, s);
          variantStock[key] = key in rawMatrix ? rawMatrix[key] : 0;
        });
      });

      const productPayload = {
        id: newId,
        slug: newId,
        originalId: originalId,
        category: $('#prodCategoryInput') ? $('#prodCategoryInput').value : 'Men',
        sub: $('#prodSubInput') ? $('#prodSubInput').value.trim() : 'Shoes',
        brand: $('#prodBrandInput') ? $('#prodBrandInput').value.trim() : '',
        name: $('#prodNameInput') ? $('#prodNameInput').value.trim() : '',
        price: parseFloat($('#prodPriceInput') ? $('#prodPriceInput').value : 0),
        desc: $('#prodDescInput') ? $('#prodDescInput').value.trim() : '',
        sizes: sizes,
        colors: colors,
        variantStock: variantStock
      };

      const endpoint = originalId ? `/products/${encodeURIComponent(originalId)}` : '/products';
      const method = originalId ? 'PUT' : 'POST';
      const apiRes = await apiFetch(endpoint, {
        method: method,
        body: JSON.stringify(productPayload)
      });

      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText || 'Save Product';
      }

      if (apiRes.networkError) {
        // No backend (e.g. Vercel): save the product in this browser's catalog instead
        if (!newId) { showToast('Please enter a product ID'); return; }
        if (newId !== originalId && products[newId]) { showToast(`A product with ID "${newId}" already exists`); return; }
        const previous = originalId ? (products[originalId] || {}) : {};
        if (originalId && originalId !== newId) delete products[originalId];
        products[newId] = {
          ...previous,
          id: newId,
          slug: newId,
          name: productPayload.name,
          brand: productPayload.brand,
          category: productPayload.category,
          sub: productPayload.sub,
          desc: productPayload.desc,
          price: productPayload.price,
          // keep sale/new flags when editing; products the admin adds show up in New Arrivals
          isNew: originalId ? !!previous.isNew : true,
          sizes,
          colors,
          variantStock
        };
        saveProducts(products);
        renderAdminList();
        resetAdminForm();
        showToast(originalId ? 'Product updated!' : 'Product added!');
        return;
      }

      if (!apiRes.ok || !apiRes.data || !apiRes.data.data) {
        showToast(apiRes.error || 'Could not save this product to the database');
        return;
      }

      const dbProd = apiRes.data.data;
      const key = dbProd.slug || dbProd.id || newId;
      if (originalId && originalId !== key) delete products[originalId];
      products[key] = {
        id: key,
        slug: dbProd.slug,
        name: dbProd.name,
        brand: dbProd.brand,
        category: dbProd.category,
        sub: dbProd.sub,
        desc: dbProd.desc || dbProd.description || '',
        price: Number(dbProd.price),
        oldPrice: dbProd.oldPrice != null ? Number(dbProd.oldPrice) : null,
        isNew: !!dbProd.isNew,
        sizes: dbProd.sizes || sizes,
        colors: dbProd.colors || colors,
        variantStock: dbProd.variantStock || variantStock
      };

      saveProducts(products);
      renderAdminList();
      resetAdminForm();
      showToast(originalId ? 'Product updated in database!' : 'Product saved to database!');
    });

    const adminProductList = $('#adminProductList');
    if (adminProductList) {
      adminProductList.addEventListener('click', async (e) => {
        const editId = e.target.dataset.edit;
        const deleteId = e.target.dataset.delete;

        if (editId) {
          const products = getProducts();
          const p = products[editId];
          if (!p) return;

          if ($('#editOriginalId')) $('#editOriginalId').value = editId;
          if ($('#prodIdInput')) $('#prodIdInput').value = editId;
          if ($('#prodCategoryInput')) $('#prodCategoryInput').value = p.category || 'Men';
          if ($('#prodSubInput')) $('#prodSubInput').value = p.sub || '';
          if ($('#prodBrandInput')) $('#prodBrandInput').value = p.brand;
          if ($('#prodNameInput')) $('#prodNameInput').value = p.name;
          if ($('#prodPriceInput')) $('#prodPriceInput').value = p.price;
          if ($('#prodDescInput')) $('#prodDescInput').value = p.desc;
          if ($('#prodSizesInput')) $('#prodSizesInput').value = p.sizes.join(', ');

          colorRowsContainer.innerHTML = '';
          p.colors.forEach((c) => addColorRow(c.name, c.hex, c.img));
          renderVariantStockMatrix(p.variantStock || {});

          if ($('#adminFormTitle')) $('#adminFormTitle').textContent = 'Edit Product';
          if ($('#saveProdBtn')) $('#saveProdBtn').textContent = 'Update Product';
          if ($('#cancelEditBtn')) $('#cancelEditBtn').hidden = false;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        if (deleteId) {
          if (!confirm(`Delete "${deleteId}"?`)) return;
          const apiRes = await apiFetch(`/products/${encodeURIComponent(deleteId)}`, { method: 'DELETE' });
          if (!apiRes.ok && !apiRes.networkError) {
            showToast(apiRes.error || 'Could not delete this product from the database');
            return;
          }

          // With no backend (e.g. Vercel) the product is removed from this browser's catalog only
          const products = getProducts();
          delete products[deleteId];
          saveProducts(products);
          renderAdminList();
          showToast(apiRes.networkError ? `"${deleteId}" deleted` : `"${deleteId}" removed from database`);
        }
      });
    }

    const cancelEditBtn = $('#cancelEditBtn');
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', resetAdminForm);

    const resetCatalogBtn = $('#resetCatalogBtn');
    if (resetCatalogBtn) {
      resetCatalogBtn.addEventListener('click', async () => {
        if (!confirm('Reload catalog directly from the MySQL database?')) return;
        localStorage.removeItem('kynetixProducts');
        await syncProductsFromDB();
        renderAdminList();
        resetAdminForm();
        showToast('Catalog synced from database');
      });
    }

    resetAdminForm();
    renderAdminList();
  }

  // ---------- Checkout Page Logic (checkout.html) ----------
  if ($('#checkoutPage')) {
    const checkoutContent = $('#checkoutContent');
    const orderConfirmation = $('#orderConfirmation');

    if ($('#crumbOpenBag')) $('#crumbOpenBag').addEventListener('click', openBag);

    // Auto-seed bag if empty so the user can test checkout immediately
    if (!bag.length) {
      const products = getProducts();
      const firstKey = Object.keys(products)[0] || 'nike-pegasus';
      const p = products[firstKey];
      if (p) {
        const color = p.colors[0]?.name || 'Volt / Black';
        const size = p.sizes[1] || p.sizes[0] || 'US 10';
        bag.push({
          productId: firstKey,
          color: color,
          size: size,
          name: `${p.name} (${color}, ${size})`,
          price: Number(p.price),
          qty: 1,
          img: p.colors[0]?.img || 'images/hero-shoe.jpg'
        });
        saveBag();
        renderBag();
      }
    }

    // State
    let selectedPayment = 'card';
    let selectedShipping = 'standard';
    let appliedCoupon = null;

    const COUPONS = {
      'KYNETIX10': { discountPercent: 0.10, label: '10% Off' },
      'WELCOME20': { discountPercent: 0.20, label: '20% Off' },
      'FREESHIP': { freeShipping: true, label: 'Free Shipping' }
    };

    function calculateCheckoutTotals() {
      const subtotal = bag.reduce((sum, item) => sum + (item.qty * item.price), 0);

      let shippingFee = 0;
      if (appliedCoupon && appliedCoupon.freeShipping) {
        shippingFee = 0;
      } else if (selectedShipping === 'express') {
        shippingFee = 120;
      } else {
        shippingFee = subtotal >= 1000 ? 0 : 60;
      }

      let discountAmount = 0;
      if (appliedCoupon && appliedCoupon.discountPercent) {
        discountAmount = subtotal * appliedCoupon.discountPercent;
      }

      const total = Math.max(0, subtotal - discountAmount + shippingFee);

      return { subtotal, shippingFee, discountAmount, total };
    }

    function renderCheckoutSummary() {
      const products = getProducts();
      const itemsList = $('#summaryItemsList');
      if (itemsList) {
        if (!bag.length) {
          itemsList.innerHTML = '<p class="empty" style="padding:20px 0;">No items in cart.</p>';
        } else {
          itemsList.innerHTML = bag.map((item) => {
            const prod = item.productId ? products[item.productId] : null;
            const img = item.img || (prod && prod.colors?.find((c) => c.name === item.color)?.img) || (prod && prod.colors?.[0]?.img) || 'images/hero-shoe.jpg';
            const brand = (prod && prod.brand) || 'Kynetix';
            return `
              <div class="summary-gear-item">
                <div class="gear-thumb-wrap">
                  <img src="${img}" alt="${item.name}">
                  <span class="gear-qty-tag">${item.qty}</span>
                </div>
                <div class="gear-info">
                  <span class="gear-brand">${brand}</span>
                  <div class="gear-name">${item.name}</div>
                  <div class="gear-variant">${item.color || ''}${item.color && item.size ? ' &bull; ' : ''}${item.size || ''}</div>
                </div>
                <div class="gear-price">${formatEGP(item.price * item.qty)}</div>
              </div>
            `;
          }).join('');
        }
      }

      const totals = calculateCheckoutTotals();
      const itemCount = bag.reduce((sum, i) => sum + i.qty, 0);

      if ($('#summaryCount')) $('#summaryCount').textContent = `${itemCount} ${itemCount === 1 ? 'Item' : 'Items'}`;
      if ($('#summarySubtotal')) $('#summarySubtotal').textContent = formatEGP(totals.subtotal);

      if ($('#standardShippingPrice')) {
        $('#standardShippingPrice').textContent = totals.subtotal >= 1000 ? 'Free' : '60.00 EGP';
      }

      if ($('#summaryShipping')) {
        $('#summaryShipping').textContent = totals.shippingFee === 0 ? 'FREE' : formatEGP(totals.shippingFee);
      }

      const discountRow = $('#summaryDiscountRow');
      if (discountRow) {
        if (totals.discountAmount > 0) {
          discountRow.hidden = false;
          if ($('#summaryDiscount')) $('#summaryDiscount').textContent = `-${formatEGP(totals.discountAmount)}`;
          if ($('#discountPercentText')) $('#discountPercentText').textContent = appliedCoupon ? appliedCoupon.label : '';
        } else {
          discountRow.hidden = true;
        }
      }

      if ($('#summaryTotal')) $('#summaryTotal').textContent = formatEGP(totals.total);
      if ($('#btnTotalDisplay')) $('#btnTotalDisplay').textContent = formatEGP(totals.total);
    }

    // Payment Selection
    const cardBox = $('#cardDetailsBox');
    const codBox = $('#codDetailsBox');
    const walletBox = $('#walletDetailsBox');
    const cardLabel = $('#paymentCardLabel');
    const codLabel = $('#paymentCodLabel');
    const walletLabel = $('#paymentWalletLabel');

    $$('.pay-tile').forEach((tile) => {
      tile.addEventListener('click', () => {
        const radio = tile.querySelector('input[name="paymentMethod"]');
        if (radio) radio.checked = true;
        selectedPayment = radio ? radio.value : 'card';

        if (cardLabel) cardLabel.classList.toggle('is-selected', selectedPayment === 'card');
        if (codLabel) codLabel.classList.toggle('is-selected', selectedPayment === 'cod');
        if (walletLabel) walletLabel.classList.toggle('is-selected', selectedPayment === 'wallet');

        if (cardBox) cardBox.hidden = selectedPayment !== 'card';
        if (codBox) codBox.hidden = selectedPayment !== 'cod';
        if (walletBox) walletBox.hidden = selectedPayment !== 'wallet';
      });
    });

    // Shipping Selection
    const stdLabel = $('#shippingStandardLabel');
    const expLabel = $('#shippingExpressLabel');

    $$('.athletic-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        const radio = opt.querySelector('input[name="shippingMethod"]');
        if (radio) {
          radio.checked = true;
          selectedShipping = radio.value;
          if (stdLabel) stdLabel.classList.toggle('is-selected', selectedShipping === 'standard');
          if (expLabel) expLabel.classList.toggle('is-selected', selectedShipping === 'express');
          renderCheckoutSummary();
        }
      });
    });

    // Demo Coupon Pills
    $$('.demo-code-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.code;
        if ($('#promoInput')) $('#promoInput').value = code;
        if ($('#applyPromoBtn')) $('#applyPromoBtn').click();
      });
    });

    // Promo Code Handler
    const promoInput = $('#promoInput');
    const applyPromoBtn = $('#applyPromoBtn');
    const promoAppliedTag = $('#promoAppliedTag');
    const removePromoBtn = $('#removePromoBtn');
    const promoMessage = $('#promoMessage');
    const appliedCodeName = $('#appliedCodeName');

    if (applyPromoBtn && promoInput) {
      applyPromoBtn.addEventListener('click', async () => {
        const code = promoInput.value.trim().toUpperCase();
        if (!code) {
          if (promoMessage) { promoMessage.textContent = 'Please enter a promo code'; promoMessage.className = 'promo-feedback is-error'; }
          return;
        }

        const currentSubtotal = bag.reduce((sum, item) => sum + (item.qty * item.price), 0);
        const apiRes = await apiFetch('/coupons/validate', {
          method: 'POST',
          body: JSON.stringify({ code, subtotal: currentSubtotal })
        });

        let matched = null;
        if (apiRes.ok && apiRes.data && apiRes.data.coupon) {
          const c = apiRes.data.coupon;
          matched = {
            code: c.code,
            label: c.label,
            discountPercent: c.discountType === 'percentage' ? Number(c.discountValue) : 0,
            fixedDiscount: c.discountType === 'fixed' ? Number(c.discountValue) : 0,
            freeShipping: !!c.freeShipping
          };
        } else if (apiRes.networkError && COUPONS[code]) {
          matched = { code, ...COUPONS[code] };
        }

        if (matched) {
          appliedCoupon = matched;
          if (promoMessage) { promoMessage.textContent = `Coupon "${matched.code}" applied successfully!`; promoMessage.className = 'promo-feedback is-success'; }
          if (appliedCodeName) appliedCodeName.textContent = matched.code;
          if (promoAppliedTag) promoAppliedTag.hidden = false;
          promoInput.value = '';
          renderCheckoutSummary();
          console.log('Promo Code successfully done | Code: ' + matched.code + ' (' + matched.label + ') | Discount: ' + calculateCheckoutTotals().discountAmount + ' EGP | Total: ' + calculateCheckoutTotals().total + ' EGP');
          showToast(`Coupon ${matched.code} applied!`);
        } else {
          if (promoMessage) { promoMessage.textContent = apiRes.error || 'Invalid promo code. Try "KYNETIX10" for 10% off.'; promoMessage.className = 'promo-feedback is-error'; }
        }
      });
    }

    if (removePromoBtn) {
      removePromoBtn.addEventListener('click', () => {
        appliedCoupon = null;
        if (promoAppliedTag) promoAppliedTag.hidden = true;
        if (promoMessage) { promoMessage.textContent = 'Coupon removed'; promoMessage.className = 'promo-feedback'; }
        renderCheckoutSummary();
        showToast('Coupon removed');
      });
    }

    // Card Input Auto-formatting & Brand Detection
    const cardNumberInput = $('#cardNumber');
    const cardTypeIndicator = $('#cardTypeIndicator');
    if (cardNumberInput) {
      cardNumberInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 16);
        let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
        e.target.value = formatted;

        if (cardTypeIndicator) {
          if (val.startsWith('4')) {
            cardTypeIndicator.textContent = 'VISA'; cardTypeIndicator.style.color = '#1a1f71';
          } else if (/^(5[1-5]|2[2-7])/.test(val)) {
            cardTypeIndicator.textContent = 'MC'; cardTypeIndicator.style.color = '#eb001b';
          } else if (/^(5078|6858|50)/.test(val)) {
            cardTypeIndicator.textContent = 'MEEZA'; cardTypeIndicator.style.color = '#005697';
          } else {
            cardTypeIndicator.textContent = 'CARD'; cardTypeIndicator.style.color = 'var(--grey-600)';
          }
        }
      });
    }

    // Card Expiry Formatting (MM / YY)
    const cardExpiryInput = $('#cardExpiry');
    if (cardExpiryInput) {
      cardExpiryInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 4);
        if (val.length >= 2) {
          let month = parseInt(val.slice(0, 2), 10);
          if (month > 12) month = 12;
          if (month === 0) month = 1;
          const monthStr = month < 10 ? '0' + month : '' + month;
          const yearStr = val.slice(2);
          e.target.value = yearStr ? `${monthStr} / ${yearStr}` : `${monthStr} / `;
        } else {
          e.target.value = val;
        }
      });
    }

    // CVV Formatting
    const cardCvvInput = $('#cardCvv');
    if (cardCvvInput) {
      cardCvvInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
      });
    }

    // Phone Formatting
    const custPhoneInput = $('#custPhone');
    if (custPhoneInput) {
      custPhoneInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^\d\s]/g, '');
      });
    }

    // Field Error Helpers
    function setFieldError(fieldId, errorId, message) {
      const field = $(fieldId);
      const errorEl = $(errorId);
      if (field) {
        field.classList.add('has-error');
        if (field.closest('.phone-input-wrap')) {
          field.closest('.phone-input-wrap').classList.add('has-error');
        }
      }
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
      }
    }

    function clearErrors() {
      $$('.has-error').forEach((el) => el.classList.remove('has-error'));
      $$('.field-error').forEach((el) => { el.textContent = ''; el.classList.remove('show'); });
    }

    // Form Submission & Order Placement
    const checkoutForm = $('#checkoutForm');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        if (!bag.length) {
          showToast('Your bag is empty');
          return;
        }

        let hasError = false;
        let firstErrorField = null;

        function markError(fieldId, errorId, msg) {
          setFieldError(fieldId, errorId, msg);
          hasError = true;
          if (!firstErrorField) firstErrorField = $(fieldId);
        }

        // Validate Email
        const email = $('#custEmail')?.value.trim() || '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
          markError('#custEmail', '#custEmailError', 'Email address is required');
        } else if (!emailRegex.test(email)) {
          markError('#custEmail', '#custEmailError', 'Please enter a valid email address');
        }

        // Validate Phone
        const phone = $('#custPhone')?.value.replace(/\s+/g, '') || '';
        if (!phone) {
          markError('#custPhone', '#custPhoneError', 'Phone number is required for courier delivery');
        } else if (phone.length < 10) {
          markError('#custPhone', '#custPhoneError', 'Enter a valid 11-digit phone number (e.g. 01012345678)');
        }

        // Validate Names
        const firstName = $('#custFirstName')?.value.trim() || '';
        if (!firstName) markError('#custFirstName', '#custFirstNameError', 'First name is required');
        const lastName = $('#custLastName')?.value.trim() || '';
        if (!lastName) markError('#custLastName', '#custLastNameError', 'Last name is required');

        // Validate Address
        const address = $('#custAddress')?.value.trim() || '';
        if (!address) markError('#custAddress', '#custAddressError', 'Street address & building number are required');

        // Validate City / Governorate
        const city = $('#custCity')?.value || '';
        if (!city) markError('#custCity', '#custCityError', 'Please select your governorate');

        // Validate Area
        const area = $('#custArea')?.value.trim() || '';
        if (!area) markError('#custArea', '#custAreaError', 'Area / district is required (e.g. El Sherouk, New Cairo)');

        // Validate Card Details
        if (selectedPayment === 'card') {
          const cardHolder = $('#cardHolder')?.value.trim() || '';
          if (!cardHolder) markError('#cardHolder', '#cardHolderError', 'Cardholder name is required');

          const rawCardNum = ($('#cardNumber')?.value || '').replace(/\D/g, '');
          if (!rawCardNum || rawCardNum.length < 15) markError('#cardNumber', '#cardNumberError', 'Enter a valid 16-digit card number');

          const rawExpiry = ($('#cardExpiry')?.value || '').replace(/\s+/g, '');
          const expiryMatch = rawExpiry.match(/^(\d{2})\/?(\d{2})$/);
          if (!expiryMatch) {
            markError('#cardExpiry', '#cardExpiryError', 'Enter expiry as MM / YY');
          } else {
            const expMonth = parseInt(expiryMatch[1], 10);
            const expYear = parseInt('20' + expiryMatch[2], 10);
            const now = new Date();
            if (expMonth < 1 || expMonth > 12) {
              markError('#cardExpiry', '#cardExpiryError', 'Month must be between 01 and 12');
            } else if (expYear < now.getFullYear() || (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)) {
              markError('#cardExpiry', '#cardExpiryError', 'Card has expired');
            }
          }

          const rawCvv = ($('#cardCvv')?.value || '').replace(/\D/g, '');
          if (!rawCvv || rawCvv.length < 3) markError('#cardCvv', '#cardCvvError', 'CVV must be 3 or 4 digits');
        }

        if (hasError) {
          if (firstErrorField) {
            firstErrorField.focus();
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          showToast('Please fill out all required fields correctly');
          return;
        }

        // Check Inventory Availability
        const products = getProducts();
        for (const item of bag) {
          if (item.productId && products[item.productId] && item.color && item.size) {
            const available = getVariantStock(products[item.productId], item.color, item.size);
            if (item.qty > available) {
              showToast(`Stock limit: Only ${available} left for ${item.name}`);
              return;
            }
          }
        }

        // Deduct Variant Stock locally
        bag.forEach((item) => {
          if (item.productId && products[item.productId] && item.color && item.size) {
            const key = variantKey(item.color, item.size);
            if (products[item.productId].variantStock && key in products[item.productId].variantStock) {
              products[item.productId].variantStock[key] = Math.max(0, products[item.productId].variantStock[key] - item.qty);
            }
          }
        });
        saveProducts(products);

        // Generate Order Object
        const totals = calculateCheckoutTotals();
        let orderId = 'KYN-' + Math.floor(100000 + Math.random() * 900000);
        let orderDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

        let paymentMethodLabel = 'Credit Card';
        if (selectedPayment === 'card') {
          const rawNum = ($('#cardNumber')?.value || '').replace(/\D/g, '');
          const last4 = rawNum.slice(-4) || '\u2022\u2022\u2022\u2022';
          paymentMethodLabel = `Credit Card (\u2022\u2022\u2022\u2022 ${last4})`;
        } else if (selectedPayment === 'cod') {
          paymentMethodLabel = 'Cash on Delivery';
        } else if (selectedPayment === 'wallet') {
          paymentMethodLabel = 'InstaPay / Mobile Wallet';
        }

        // Prepare order payload for Node.js MVC backend
        const orderPayload = {
          firstName,
          lastName,
          email,
          phone: '+20 ' + phone,
          address,
          apartment: $('#custApartment')?.value.trim() || '',
          city,
          area,
          postal: $('#custPostal')?.value.trim() || '',
          notes: $('#custNotes')?.value.trim() || '',
          shippingMethod: selectedShipping,
          shippingFee: totals.shippingFee,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          couponCode: appliedCoupon ? appliedCoupon.code : null,
          total: totals.total,
          paymentMethod: selectedPayment,
          cardNumber: selectedPayment === 'card' ? $('#cardNumber')?.value : '',
          items: JSON.parse(JSON.stringify(bag))
        };

        let savedToDb = false;
        try {
          // Send to Node.js MySQL backend API!
          const apiRes = await apiFetch('/orders', {
            method: 'POST',
            body: JSON.stringify(orderPayload)
          });

          if (apiRes.ok && apiRes.data && apiRes.data.success) {
            orderId = apiRes.data.data.orderNumber || orderId;
            orderDate = apiRes.data.data.orderDate || orderDate;
            savedToDb = true;
          }
        } catch (apiErr) {
          console.warn('Backend order sync offline:', apiErr);
        }

        const newOrder = {
          orderId,
          orderDate,
          customer: {
            firstName,
            lastName,
            email,
            phone: '+20 ' + phone,
            address,
            apartment: $('#custApartment')?.value.trim() || '',
            city,
            area,
            postal: $('#custPostal')?.value.trim() || '',
            notes: $('#custNotes')?.value.trim() || ''
          },
          shipping: { method: selectedShipping, fee: totals.shippingFee },
          payment: {
            method: selectedPayment,
            label: paymentMethodLabel,
            status: selectedPayment === 'cod' ? 'Payment upon delivery' : 'Paid & Confirmed'
          },
          items: JSON.parse(JSON.stringify(bag)),
          totals: totals
        };

        // Save order to history (client cache)
        try {
          const orders = JSON.parse(localStorage.getItem('kynetixOrders')) || [];
          orders.unshift(newOrder);
          localStorage.setItem('kynetixOrders', JSON.stringify(orders));
        } catch (err) {}

        // Populate Confirmation Screen
        if ($('#confirmCustomerHeading')) $('#confirmCustomerHeading').textContent = `Order Confirmed: Thank You, ${firstName}!`;
        if ($('#confirmOrderNumber')) $('#confirmOrderNumber').textContent = orderId;
        if ($('#confirmOrderDate')) $('#confirmOrderDate').textContent = orderDate;
        if ($('#confirmPaymentMethod')) $('#confirmPaymentMethod').textContent = paymentMethodLabel;
        if ($('#confirmDeliveryDate')) {
          $('#confirmDeliveryDate').textContent = selectedShipping === 'express' ? '1\u20132 Business Days' : '2\u20134 Business Days';
        }

        if ($('#confirmShippingDetails')) {
          const aptText = newOrder.customer.apartment ? `, ${newOrder.customer.apartment}` : '';
          $('#confirmShippingDetails').innerHTML = `
            <strong>${firstName} ${lastName}</strong> &bull; ${newOrder.customer.phone}<br>
            ${address}${aptText}, ${area}, ${city}, Egypt<br>
            <span style="color:var(--grey-600); font-size:12px;">Confirmation sent to: ${email}</span>
          `;
        }

        if ($('#confirmItemsList')) {
          $('#confirmItemsList').innerHTML = bag.map((i) => `
            <div class="receipt-item-row">
              <div>
                <strong>${i.name}</strong> &times; ${i.qty}
                <div style="font-size:12px; color:var(--grey-600);">${i.color || ''} / ${i.size || ''}</div>
              </div>
              <div><strong>${formatEGP(i.price * i.qty)}</strong></div>
            </div>
          `).join('');
        }

        if ($('#confirmPayStatus')) {
          $('#confirmPayStatus').textContent = selectedPayment === 'cod' ? 'Payment Upon Delivery' : 'Paid & Approved';
        }
        if ($('#confirmTotalPaid')) {
          $('#confirmTotalPaid').textContent = formatEGP(totals.total);
        }

        // Clear bag after successful order
        bag = [];
        saveBag();
        renderBag();

        // Switch to Order Confirmation View
        if (checkoutContent) checkoutContent.hidden = true;
        if (orderConfirmation) orderConfirmation.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Order confirmed successfully!');
      });
    }

    // Initial render of summary
    renderCheckoutSummary();
  }

  // ---------- Order Tracking Page (track.html) ----------
  if ($('#trackPage')) {
    const orders = [];
    try { orders.push(...(JSON.parse(localStorage.getItem('kynetixOrders')) || [])); } catch (e) {}

    // Populate recent order pills
    const pillsWrap = $('#recentOrdersPills');
    if (pillsWrap && orders.length) {
      pillsWrap.innerHTML = '<small>Recent:</small> ' + orders.slice(0, 5).map((o) =>
        `<button class="recent-order-pill" data-order-id="${o.orderId}">${o.orderId}</button>`
      ).join('');
      pillsWrap.querySelectorAll('.recent-order-pill').forEach((btn) => {
        btn.addEventListener('click', () => lookupOrder(btn.dataset.orderId, ''));
      });
    }

    async function lookupOrder(orderId, phone) {
      const notFound = $('#trackNotFound');
      const resultWrap = $('#trackResultWrap');
      let order = null;

      // First query MySQL database via Node.js backend
      try {
        const res = await apiFetch(`/orders/track/${encodeURIComponent(orderId)}`);
        if (res.ok && res.data && res.data.success) {
          order = res.data.data;
        }
      } catch (err) {}

      // Fallback to client cache
      if (!order) {
        order = orders.find((o) => o.orderId === orderId);
      }

      if (!order) {
        if (notFound) notFound.hidden = false;
        if (resultWrap) resultWrap.hidden = true;
        return;
      }

      if (notFound) notFound.hidden = true;
      if (resultWrap) resultWrap.hidden = false;
      console.log('Order Tracking successfully done | Order: ' + (order.orderId || order.orderNumber) + ' | Status: ' + order.orderStatus + ' | Courier: ' + (order.shipping && order.shipping.courierName ? order.shipping.courierName : 'Standard'));

      if ($('#resOrderNumber')) $('#resOrderNumber').textContent = order.orderId || order.orderNumber;
      if ($('#resStatusBadge')) {
        $('#resStatusBadge').textContent = order.payment?.status || order.orderStatus || 'Processing';
      }
      if ($('#resStep1Date')) $('#resStep1Date').textContent = order.orderDate || '';
      if ($('#resCourierName')) $('#resCourierName').textContent = order.shipping?.courierName || (order.shipping?.method === 'express' ? 'Aramex Express' : 'Bosta Standard');
      if ($('#resDeliveryDate')) {
        $('#resDeliveryDate').textContent = order.shipping?.estimatedDelivery || (order.shipping?.method === 'express' ? '1\u20132 Business Days' : '2\u20134 Business Days');
      }
      if ($('#resAddressText') && order.customer) {
        const c = order.customer;
        $('#resAddressText').textContent = `${c.address}${c.apartment ? ', ' + c.apartment : ''}, ${c.area}, ${c.city}, Egypt`;
      }
      if ($('#resPaymentText')) {
        $('#resPaymentText').textContent = order.payment?.label || order.payment?.method || 'N/A';
      }
      if ($('#resItemsList') && order.items) {
        $('#resItemsList').innerHTML = order.items.map((i) => `
          <div class="receipt-item-row">
            <div><strong>${i.name}</strong> &times; ${i.qty}</div>
            <div>${formatEGP(i.price * i.qty)}</div>
          </div>
        `).join('');
      }
    }

    const trackForm = $('#trackForm');
    if (trackForm) {
      trackForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const orderIdEl = $('#trackOrderId');
        const phoneEl = $('#trackPhone');
        lookupOrder(
          orderIdEl ? orderIdEl.value.trim().toUpperCase() : '',
          phoneEl ? phoneEl.value.trim() : ''
        );
      });
    }

    // Auto-lookup from URL param ?order=KYN-XXXXXX
    const urlOrder = new URLSearchParams(window.location.search).get('order');
    if (urlOrder) {
      const orderIdInput = $('#trackOrderId');
      if (orderIdInput) orderIdInput.value = urlOrder;
      lookupOrder(urlOrder, '');
    }
  }

  // ---------- Contact Page (contact.html) ----------
  const contactForm = $('#contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#cName')?.value.trim() || '';
      const email = $('#cEmail')?.value.trim() || '';
      const phone = $('#cPhone')?.value.trim() || '';
      const topic = $('#cTopic')?.value || 'General Inquiry';
      const message = $('#cMsg')?.value.trim() || '';

      const res = await apiFetch('/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, subject: topic, message })
      });

      contactForm.reset();
      showToast('Thank you! Your message has been sent to our team.');
    });
  }

  // ---------- Global Keydown ----------
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeBag();
      closeWishlist();
      closeAuth();
    }
  });
})();
