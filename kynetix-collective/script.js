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
  const DEFAULT_PRODUCTS = {
    "nike-tech-fleece-kids-hoodie": {
      "category": "Kids",
      "sub": "Boys",
      "brand": "Nike",
      "name": "Sportswear Tech Fleece Kids Full-Zip Hoodie",
      "price": 4950,
      "isNew": true,
      "desc": "Lightweight Tech Fleece warmth with a streamlined fit, zip chest pocket and bonded seams for school runs and weekend training.",
      "sizes": [
        "S (8-10)",
        "M (10-12)",
        "L (12-14)",
        "XL (14-16)"
      ],
      "colors": [
        {
          "name": "Burgundy Crush",
          "hex": "#6b2e2a",
          "img": "images/products/nike-tech-fleece-kids-hoodie.webp"
        }
      ],
      "variantStock": {
        "Burgundy Crush::S (8-10)": 6,
        "Burgundy Crush::M (10-12)": 11,
        "Burgundy Crush::L (12-14)": 16,
        "Burgundy Crush::XL (14-16)": 7
      }
    },
    "nike-tech-fleece-kids-joggers": {
      "category": "Kids",
      "sub": "Boys",
      "brand": "Nike",
      "name": "Sportswear Tech Fleece Kids Joggers",
      "price": 4250,
      "isNew": true,
      "desc": "Tapered Tech Fleece joggers with ribbed cuffs and a zip side pocket. Warm without the bulk.",
      "sizes": [
        "S (8-10)",
        "M (10-12)",
        "L (12-14)",
        "XL (14-16)"
      ],
      "colors": [
        {
          "name": "Burgundy Crush",
          "hex": "#6b2e2a",
          "img": "images/products/nike-tech-fleece-kids-joggers.webp"
        }
      ],
      "variantStock": {
        "Burgundy Crush::S (8-10)": 13,
        "Burgundy Crush::M (10-12)": 18,
        "Burgundy Crush::L (12-14)": 9,
        "Burgundy Crush::XL (14-16)": 14
      }
    },
    "nike-solo-swoosh-kids-hoodie": {
      "category": "Kids",
      "sub": "Boys",
      "brand": "Nike",
      "name": "Solo Swoosh Kids Fleece Pullover Hoodie",
      "price": 2950,
      "isNew": true,
      "desc": "Brushed-back fleece hoodie with a clean embroidered Swoosh and a roomy kangaroo pocket.",
      "sizes": [
        "S (8-10)",
        "M (10-12)",
        "L (12-14)",
        "XL (14-16)"
      ],
      "colors": [
        {
          "name": "Vintage Green",
          "hex": "#3f5a43",
          "img": "images/products/nike-solo-swoosh-kids-hoodie.webp"
        }
      ],
      "variantStock": {
        "Vintage Green::S (8-10)": 6,
        "Vintage Green::M (10-12)": 11,
        "Vintage Green::L (12-14)": 16,
        "Vintage Green::XL (14-16)": 7
      }
    },
    "nike-adp-kids-puffer": {
      "category": "Kids",
      "sub": "Boys",
      "brand": "Nike",
      "name": "All Day Play Therma-FIT Kids Puffer Jacket",
      "price": 4650,
      "isNew": true,
      "desc": "Loose-fit puffer with Therma-FIT insulation that traps body heat on cold winter mornings.",
      "sizes": [
        "S (8-10)",
        "M (10-12)",
        "L (12-14)",
        "XL (14-16)"
      ],
      "colors": [
        {
          "name": "Black",
          "hex": "#111111",
          "img": "images/products/nike-adp-kids-puffer.webp"
        }
      ],
      "variantStock": {
        "Black::S (8-10)": 13,
        "Black::M (10-12)": 18,
        "Black::L (12-14)": 9,
        "Black::XL (14-16)": 14
      }
    },
    "adidas-firebird-dot-kids-jacket": {
      "category": "Kids",
      "sub": "Boys",
      "brand": "Adidas",
      "name": "Firebird Dot Print Kids Track Jacket",
      "price": 2950,
      "isNew": true,
      "desc": "The classic Firebird track jacket in an all-over dot print, with a full zip and ribbed cuffs.",
      "sizes": [
        "S (8-10)",
        "M (10-12)",
        "L (12-14)",
        "XL (14-16)"
      ],
      "colors": [
        {
          "name": "Grey",
          "hex": "#9a9a9a",
          "img": "images/products/adidas-firebird-dot-kids-jacket.webp"
        }
      ],
      "variantStock": {
        "Grey::S (8-10)": 6,
        "Grey::M (10-12)": 11,
        "Grey::L (12-14)": 16,
        "Grey::XL (14-16)": 7
      }
    },
    "nike-studio-girls-oversized-hoodie": {
      "category": "Kids",
      "sub": "Girls",
      "brand": "Nike",
      "name": "Sportswear Studio Girls Oversized Fleece Hoodie",
      "price": 2700,
      "isNew": true,
      "desc": "Soft oversized fleece hoodie with dropped shoulders for a relaxed, cozy fit.",
      "sizes": [
        "S (8-10)",
        "M (10-12)",
        "L (12-14)",
        "XL (14-16)"
      ],
      "colors": [
        {
          "name": "Coconut Milk",
          "hex": "#efe8d6",
          "img": "images/products/nike-studio-girls-oversized-hoodie.webp"
        }
      ],
      "variantStock": {
        "Coconut Milk::S (8-10)": 13,
        "Coconut Milk::M (10-12)": 18,
        "Coconut Milk::L (12-14)": 9,
        "Coconut Milk::XL (14-16)": 14
      }
    },
    "nike-studio-girls-open-hem-pants": {
      "category": "Kids",
      "sub": "Girls",
      "brand": "Nike",
      "name": "Sportswear Studio Girls Fleece Open-Hem Pants",
      "price": 2450,
      "isNew": true,
      "desc": "Matching open-hem fleece pants with an easy elastic waistband.",
      "sizes": [
        "S (8-10)",
        "M (10-12)",
        "L (12-14)",
        "XL (14-16)"
      ],
      "colors": [
        {
          "name": "Coconut Milk",
          "hex": "#efe8d6",
          "img": "images/products/nike-studio-girls-open-hem-pants.webp"
        }
      ],
      "variantStock": {
        "Coconut Milk::S (8-10)": 6,
        "Coconut Milk::M (10-12)": 11,
        "Coconut Milk::L (12-14)": 16,
        "Coconut Milk::XL (14-16)": 7
      }
    },
    "nike-pro-girls-fz-hoodie": {
      "category": "Kids",
      "sub": "Girls",
      "brand": "Nike",
      "name": "Nike Pro Girls Dri-FIT Full-Zip Hoodie",
      "price": 2550,
      "isNew": true,
      "desc": "Sweat-wicking Dri-FIT fleece hoodie for training sessions and warm-ups.",
      "sizes": [
        "S (8-10)",
        "M (10-12)",
        "L (12-14)",
        "XL (14-16)"
      ],
      "colors": [
        {
          "name": "Burgundy Crush",
          "hex": "#6b2e2a",
          "img": "images/products/nike-pro-girls-fz-hoodie.webp"
        }
      ],
      "variantStock": {
        "Burgundy Crush::S (8-10)": 13,
        "Burgundy Crush::M (10-12)": 18,
        "Burgundy Crush::L (12-14)": 9,
        "Burgundy Crush::XL (14-16)": 14
      }
    },
    "nike-girls-cropped-tee": {
      "category": "Kids",
      "sub": "Girls",
      "brand": "Nike",
      "name": "Sportswear Girls Cropped T-Shirt",
      "price": 1450,
      "isNew": true,
      "desc": "Soft cotton cropped tee with a modern boxy fit.",
      "sizes": [
        "S (8-10)",
        "M (10-12)",
        "L (12-14)",
        "XL (14-16)"
      ],
      "colors": [
        {
          "name": "White",
          "hex": "#ffffff",
          "img": "images/products/nike-girls-cropped-tee.webp"
        }
      ],
      "variantStock": {
        "White::S (8-10)": 6,
        "White::M (10-12)": 11,
        "White::L (12-14)": 16,
        "White::XL (14-16)": 7
      }
    },
    "adidas-firebird-dot-kids-set": {
      "category": "Kids",
      "sub": "Girls",
      "brand": "Adidas",
      "name": "Firebird Dot Print Jacket & Wide Leg Pant Set",
      "price": 3200,
      "isNew": true,
      "desc": "Two-piece Firebird set: dot-print track jacket with matching wide-leg pants.",
      "sizes": [
        "S (8-10)",
        "M (10-12)",
        "L (12-14)",
        "XL (14-16)"
      ],
      "colors": [
        {
          "name": "Burgundy",
          "hex": "#6d1f2f",
          "img": "images/products/adidas-firebird-dot-kids-set.webp"
        }
      ],
      "variantStock": {
        "Burgundy::S (8-10)": 13,
        "Burgundy::M (10-12)": 18,
        "Burgundy::L (12-14)": 9,
        "Burgundy::XL (14-16)": 14
      }
    },
    "nike-dunk-low-kids": {
      "category": "Kids",
      "sub": "Shoes",
      "brand": "Nike",
      "name": "Dunk Low Big Kids Shoes",
      "price": 4450,
      "isNew": true,
      "desc": "The 80s basketball icon with a padded low-cut collar and durable leather overlays.",
      "sizes": [
        "33",
        "34",
        "35",
        "36",
        "37",
        "38"
      ],
      "colors": [
        {
          "name": "White / Black",
          "hex": "#f2f2f2",
          "img": "images/products/nike-dunk-low-kids.webp"
        }
      ],
      "variantStock": {
        "White / Black::33": 6,
        "White / Black::34": 11,
        "White / Black::35": 16,
        "White / Black::36": 7,
        "White / Black::37": 12,
        "White / Black::38": 17
      }
    },
    "nike-air-force-1-le-kids": {
      "category": "Kids",
      "sub": "Shoes",
      "brand": "Nike",
      "name": "Air Force 1 LE Big Kids Shoes",
      "price": 4400,
      "isNew": true,
      "desc": "Crisp leather, Nike Air cushioning and the timeless AF1 silhouette, sized for kids.",
      "sizes": [
        "33",
        "34",
        "35",
        "36",
        "37",
        "38"
      ],
      "colors": [
        {
          "name": "Triple White",
          "hex": "#ffffff",
          "img": "images/products/nike-air-force-1-le-kids.webp"
        }
      ],
      "variantStock": {
        "Triple White::33": 13,
        "Triple White::34": 18,
        "Triple White::35": 9,
        "Triple White::36": 14,
        "Triple White::37": 19,
        "Triple White::38": 10
      }
    },
    "adidas-samba-jane-kids": {
      "category": "Kids",
      "sub": "Shoes",
      "brand": "Adidas",
      "name": "Samba Jane Kids Shoes",
      "price": 3450,
      "isNew": true,
      "desc": "The Samba reimagined as a Mary Jane with a hook-and-loop strap and gum outsole.",
      "sizes": [
        "33",
        "34",
        "35",
        "36",
        "37",
        "38"
      ],
      "colors": [
        {
          "name": "Red",
          "hex": "#c8102e",
          "img": "images/products/adidas-samba-jane-kids.webp"
        }
      ],
      "variantStock": {
        "Red::33": 6,
        "Red::34": 11,
        "Red::35": 16,
        "Red::36": 7,
        "Red::37": 12,
        "Red::38": 17
      }
    },
    "adidas-anthony-edwards-3-junior": {
      "category": "Kids",
      "sub": "Shoes",
      "brand": "Adidas",
      "name": "Anthony Edwards 3 Junior Basketball Shoes",
      "price": 4950,
      "isNew": true,
      "desc": "Ant Edwards signature hoops shoe with responsive cushioning and multidirectional grip.",
      "sizes": [
        "33",
        "34",
        "35",
        "36",
        "37",
        "38"
      ],
      "colors": [
        {
          "name": "Orange",
          "hex": "#f26b1d",
          "img": "images/products/adidas-anthony-edwards-3-junior.webp"
        }
      ],
      "variantStock": {
        "Orange::33": 13,
        "Orange::34": 18,
        "Orange::35": 9,
        "Orange::36": 14,
        "Orange::37": 19,
        "Orange::38": 10
      }
    },
    "adidas-vl-court-3-kids": {
      "category": "Kids",
      "sub": "Shoes",
      "brand": "Adidas",
      "name": "VL Court 3.0 Kids Shoes",
      "price": 2950,
      "isNew": true,
      "desc": "Skate-inspired suede trainers with a cushioned insole for all-day comfort.",
      "sizes": [
        "33",
        "34",
        "35",
        "36",
        "37",
        "38"
      ],
      "colors": [
        {
          "name": "Core Black",
          "hex": "#111111",
          "img": "images/products/adidas-vl-court-3-kids.webp"
        }
      ],
      "variantStock": {
        "Core Black::33": 6,
        "Core Black::34": 11,
        "Core Black::35": 16,
        "Core Black::36": 7,
        "Core Black::37": 12,
        "Core Black::38": 17
      }
    },
    "puma-speedcat-og-kids": {
      "category": "Kids",
      "sub": "Shoes",
      "brand": "Puma",
      "name": "Speedcat OG Big Kids Sneakers",
      "price": 3950,
      "isNew": true,
      "desc": "Motorsport heritage in a slim suede profile with the iconic Formstrip.",
      "sizes": [
        "33",
        "34",
        "35",
        "36",
        "37",
        "38"
      ],
      "colors": [
        {
          "name": "Inky Depths / Warm White",
          "hex": "#1d2a44",
          "img": "images/products/puma-speedcat-og-kids.webp"
        }
      ],
      "variantStock": {
        "Inky Depths / Warm White::33": 13,
        "Inky Depths / Warm White::34": 18,
        "Inky Depths / Warm White::35": 9,
        "Inky Depths / Warm White::36": 14,
        "Inky Depths / Warm White::37": 19,
        "Inky Depths / Warm White::38": 10
      }
    },
    "puma-electrify-nitro-5-kids": {
      "category": "Kids",
      "sub": "Shoes",
      "brand": "Puma",
      "name": "Electrify NITRO 5 Big Kids Running Shoes",
      "price": 3650,
      "isNew": true,
      "desc": "NITRO foam cushioning in a lightweight runner built for sports day and the playground.",
      "sizes": [
        "33",
        "34",
        "35",
        "36",
        "37",
        "38"
      ],
      "colors": [
        {
          "name": "Sunny Lime / Black",
          "hex": "#c9f031",
          "img": "images/products/puma-electrify-nitro-5-kids.webp"
        }
      ],
      "variantStock": {
        "Sunny Lime / Black::33": 6,
        "Sunny Lime / Black::34": 11,
        "Sunny Lime / Black::35": 16,
        "Sunny Lime / Black::36": 7,
        "Sunny Lime / Black::37": 12,
        "Sunny Lime / Black::38": 17
      }
    },
    "puma-mb06-hills-kids": {
      "category": "Kids",
      "sub": "Shoes",
      "brand": "Puma",
      "name": "MB.06 Hills Big Kids Basketball Shoes",
      "price": 5400,
      "isNew": true,
      "desc": "LaMelo Ball signature model with NITRO cushioning and a supportive high-traction outsole.",
      "sizes": [
        "33",
        "34",
        "35",
        "36",
        "37",
        "38"
      ],
      "colors": [
        {
          "name": "Cool Mid Gray / Lime Smash",
          "hex": "#9aa0a6",
          "img": "images/products/puma-mb06-hills-kids.webp"
        }
      ],
      "variantStock": {
        "Cool Mid Gray / Lime Smash::33": 13,
        "Cool Mid Gray / Lime Smash::34": 18,
        "Cool Mid Gray / Lime Smash::35": 9,
        "Cool Mid Gray / Lime Smash::36": 14,
        "Cool Mid Gray / Lime Smash::37": 19,
        "Cool Mid Gray / Lime Smash::38": 10
      }
    },
    "nike-air-max-metro": {
      "category": "Men",
      "sub": "Shoes",
      "brand": "Nike",
      "name": "Air Max Metro",
      "price": 6400,
      "isNew": true,
      "desc": "Visible Air cushioning and a sleek layered upper made for city miles.",
      "sizes": [
        "41",
        "42",
        "43",
        "44",
        "45"
      ],
      "colors": [
        {
          "name": "White / University Red / Black",
          "hex": "#f2f2f2",
          "img": "images/products/nike-air-max-metro.webp"
        }
      ],
      "variantStock": {
        "White / University Red / Black::41": 6,
        "White / University Red / Black::42": 11,
        "White / University Red / Black::43": 16,
        "White / University Red / Black::44": 7,
        "White / University Red / Black::45": 12
      }
    },
    "air-jordan-1-low": {
      "category": "Men",
      "sub": "Shoes",
      "brand": "Nike",
      "name": "Air Jordan 1 Low",
      "price": 5850,
      "isNew": true,
      "desc": "The AJ1 in a low-cut build with encapsulated Air and premium leather.",
      "sizes": [
        "41",
        "42",
        "43",
        "44",
        "45"
      ],
      "colors": [
        {
          "name": "White / Midnight Navy",
          "hex": "#f2f2f2",
          "img": "images/products/air-jordan-1-low.webp"
        }
      ],
      "variantStock": {
        "White / Midnight Navy::41": 13,
        "White / Midnight Navy::42": 18,
        "White / Midnight Navy::43": 9,
        "White / Midnight Navy::44": 14,
        "White / Midnight Navy::45": 19
      }
    },
    "nike-standard-issue-hoodie": {
      "category": "Men",
      "sub": "Hoodies",
      "brand": "Nike",
      "name": "Standard Issue Dri-FIT Basketball Hoodie",
      "price": 5800,
      "isNew": true,
      "desc": "Stretchy Dri-FIT fleece hoodie for warm-ups and courtside chill.",
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ],
      "colors": [
        {
          "name": "Sail",
          "hex": "#efe9dc",
          "img": "images/products/nike-standard-issue-hoodie.webp"
        }
      ],
      "variantStock": {
        "Sail::S": 6,
        "Sail::M": 11,
        "Sail::L": 16,
        "Sail::XL": 7
      }
    },
    "nike-standard-issue-pants": {
      "category": "Men",
      "sub": "Pants",
      "brand": "Nike",
      "name": "Standard Issue Dri-FIT Basketball Pants",
      "price": 4950,
      "isNew": true,
      "desc": "Open-hem Dri-FIT pants that move with you on and off the court.",
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ],
      "colors": [
        {
          "name": "Sail",
          "hex": "#efe9dc",
          "img": "images/products/nike-standard-issue-pants.webp"
        }
      ],
      "variantStock": {
        "Sail::S": 13,
        "Sail::M": 18,
        "Sail::L": 9,
        "Sail::XL": 14
      }
    },
    "nike-acg-wolf-tree-jacket": {
      "category": "Men",
      "sub": "Hoodies",
      "brand": "Nike",
      "name": "ACG Wolf Tree Full-Zip Printed Jacket",
      "price": 6900,
      "isNew": true,
      "desc": "Outdoor-ready ACG fleece jacket with an all-over printed pattern.",
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ],
      "colors": [
        {
          "name": "Printed Burgundy",
          "hex": "#5a2a24",
          "img": "images/products/nike-acg-wolf-tree-jacket.webp"
        }
      ],
      "variantStock": {
        "Printed Burgundy::S": 6,
        "Printed Burgundy::M": 11,
        "Printed Burgundy::L": 16,
        "Printed Burgundy::XL": 7
      }
    },
    "nike-total-90-women": {
      "category": "Women",
      "sub": "Shoes",
      "brand": "Nike",
      "name": "Total 90 Women's Shoes",
      "price": 6150,
      "isNew": true,
      "desc": "Football-terrace style from the T90 archive, rebuilt as an everyday lifestyle shoe.",
      "sizes": [
        "37",
        "38",
        "39",
        "40",
        "41"
      ],
      "colors": [
        {
          "name": "Burgundy Crush",
          "hex": "#5b2027",
          "img": "images/products/nike-total-90-women.webp"
        }
      ],
      "variantStock": {
        "Burgundy Crush::37": 13,
        "Burgundy Crush::38": 18,
        "Burgundy Crush::39": 9,
        "Burgundy Crush::40": 14,
        "Burgundy Crush::41": 19
      }
    },
    "nike-air-superfly-shift": {
      "category": "Women",
      "sub": "Shoes",
      "brand": "Nike",
      "name": "Air Superfly Shift Women's Shoes",
      "price": 4950,
      "isNew": true,
      "desc": "Retro runner lines with Air cushioning and a lightweight mesh upper.",
      "sizes": [
        "37",
        "38",
        "39",
        "40",
        "41"
      ],
      "colors": [
        {
          "name": "Light Bone",
          "hex": "#d9d6cf",
          "img": "images/products/nike-air-superfly-shift.webp"
        }
      ],
      "variantStock": {
        "Light Bone::37": 6,
        "Light Bone::38": 11,
        "Light Bone::39": 16,
        "Light Bone::40": 7,
        "Light Bone::41": 12
      }
    },
    "nike-studio-fleece-crew": {
      "category": "Women",
      "sub": "Hoodies",
      "brand": "Nike",
      "name": "Studio Fleece Oversized Crew",
      "price": 4200,
      "isNew": true,
      "desc": "Midweight brushed fleece crew with an oversized, slouchy fit.",
      "sizes": [
        "XS",
        "S",
        "M",
        "L"
      ],
      "colors": [
        {
          "name": "Black Print",
          "hex": "#111111",
          "img": "images/products/nike-studio-fleece-crew.webp"
        }
      ],
      "variantStock": {
        "Black Print::XS": 13,
        "Black Print::S": 18,
        "Black Print::M": 9,
        "Black Print::L": 14
      }
    },
    "nike-studio-fleece-wide-leg": {
      "category": "Women",
      "sub": "Pants",
      "brand": "Nike",
      "name": "Studio Fleece Mid-Rise Wide-Leg Pants",
      "price": 3450,
      "isNew": true,
      "desc": "Relaxed wide-leg fleece pants with a soft mid-rise waistband.",
      "sizes": [
        "XS",
        "S",
        "M",
        "L"
      ],
      "colors": [
        {
          "name": "Pink Oxford",
          "hex": "#e8c4c4",
          "img": "images/products/nike-studio-fleece-wide-leg.webp"
        }
      ],
      "variantStock": {
        "Pink Oxford::XS": 6,
        "Pink Oxford::S": 11,
        "Pink Oxford::M": 16,
        "Pink Oxford::L": 7
      }
    },
    "nike-chill-knit-crop-top": {
      "category": "Women",
      "sub": "Tops",
      "brand": "Nike",
      "name": "Chill Knit Slim Long-Sleeve Cropped Top",
      "price": 1850,
      "isNew": true,
      "desc": "Smooth, stretchy rib-knit cropped top with a slim fit.",
      "sizes": [
        "XS",
        "S",
        "M",
        "L"
      ],
      "colors": [
        {
          "name": "Burgundy Crush",
          "hex": "#6b2e2a",
          "img": "images/products/nike-chill-knit-crop-top.webp"
        }
      ],
      "variantStock": {
        "Burgundy Crush::XS": 13,
        "Burgundy Crush::S": 18,
        "Burgundy Crush::M": 9,
        "Burgundy Crush::L": 14
      }
    },
    "nike-varsity-elite-backpack": {
      "category": "Accessories",
      "sub": "Bags",
      "brand": "Nike",
      "name": "Varsity Elite Backpack (32L)",
      "price": 4650,
      "isNew": true,
      "desc": "Team-ready 32L backpack with a padded laptop sleeve and shoe compartment.",
      "sizes": [
        "One Size"
      ],
      "colors": [
        {
          "name": "Black",
          "hex": "#111111",
          "img": "images/products/nike-varsity-elite-backpack.webp"
        }
      ],
      "variantStock": {
        "Black::One Size": 6
      }
    },
    "nike-everyday-elevated-crew-6p": {
      "category": "Accessories",
      "sub": "Socks",
      "brand": "Nike",
      "name": "Everyday Elevated Crew Socks (6 Pairs)",
      "price": 1450,
      "isNew": true,
      "desc": "Cushioned crew socks with arch support, six pairs per pack.",
      "sizes": [
        "M (38-42)",
        "L (42-46)"
      ],
      "colors": [
        {
          "name": "White / Black",
          "hex": "#ffffff",
          "img": "images/products/nike-everyday-elevated-crew-6p.webp"
        }
      ],
      "variantStock": {
        "White / Black::M (38-42)": 13,
        "White / Black::L (42-46)": 18
      }
    },
    "nike-everyday-elevated-ankle-6p": {
      "category": "Accessories",
      "sub": "Socks",
      "brand": "Nike",
      "name": "Everyday Elevated Ankle Socks (6 Pairs)",
      "price": 1350,
      "isNew": true,
      "desc": "Low-profile ankle socks with targeted cushioning, six pairs per pack.",
      "sizes": [
        "M (38-42)",
        "L (42-46)"
      ],
      "colors": [
        {
          "name": "White / Black",
          "hex": "#ffffff",
          "img": "images/products/nike-everyday-elevated-ankle-6p.webp"
        }
      ],
      "variantStock": {
        "White / Black::M (38-42)": 6,
        "White / Black::L (42-46)": 11
      }
    },
    "ua-performance-no-show-socks": {
      "category": "Accessories",
      "sub": "Socks",
      "brand": "Under Armour",
      "name": "HeatGear Performance No-Show Socks (3 Pairs)",
      "price": 750,
      "desc": "Seamless toe construction and embedded arch support reduces foot fatigue. Anti-odor technology prevents the growth of odor-causing microbes.",
      "sizes": [
        "M (38-42)",
        "L (42-46)"
      ],
      "colors": [
        {
          "name": "Black Heather",
          "hex": "#262626",
          "img": "images/heatgear-noshow-black.png"
        },
        {
          "name": "Steel Grey",
          "hex": "#737373",
          "img": "images/heatgear-noshow-grey.png"
        }
      ],
      "variantStock": {
        "Black Heather::M (38-42)": 15,
        "Black Heather::L (42-46)": 20,
        "Steel Grey::M (38-42)": 12,
        "Steel Grey::L (42-46)": 16
      }
    },
    "nike-everyday-cushioned-crew": {
      "category": "Accessories",
      "sub": "Socks",
      "brand": "Nike",
      "name": "Everyday Cushioned Training Crew Socks (3 Pairs)",
      "price": 850,
      "desc": "Power through your training with thick terry sole cushioning for extra comfort on foot drills and lifts. Dri-FIT moisture wicking.",
      "sizes": [
        "M (38-42)",
        "L (42-46)"
      ],
      "colors": [
        {
          "name": "White / Black Swoosh",
          "hex": "#ffffff",
          "img": "images/crewsocks-white.png"
        },
        {
          "name": "Black / White Swoosh",
          "hex": "#111111",
          "img": "images/crewsocks-black.png"
        }
      ],
      "variantStock": {
        "White / Black Swoosh::M (38-42)": 20,
        "White / Black Swoosh::L (42-46)": 25,
        "Black / White Swoosh::M (38-42)": 18,
        "Black / White Swoosh::L (42-46)": 22
      }
    },
    "adidas-aeroready-baseball-cap": {
      "category": "Accessories",
      "sub": "Hats",
      "brand": "Adidas",
      "name": "Aeroready 3-Stripes Baseball Cap",
      "price": 950,
      "desc": "Curved brim with UV 50 factor protection and moisture-absorbing sweatband. Built for sunny outdoor miles and training sessions.",
      "sizes": [
        "One Size"
      ],
      "colors": [
        {
          "name": "Black / White",
          "hex": "#0a0a0a",
          "img": "images/adidas-cap-black.png"
        },
        {
          "name": "Navy / White",
          "hex": "#1e3a8a",
          "img": "images/adidas-cap-navy.png"
        }
      ],
      "variantStock": {
        "Black / White::One Size": 15,
        "Navy / White::One Size": 10
      }
    },
    "nike-club-metal-swoosh-cap": {
      "category": "Accessories",
      "sub": "Hats",
      "brand": "Nike",
      "name": "Club Metal Swoosh Adjustable Cap",
      "price": 1100,
      "desc": "Classic mid-depth 6-panel cap with polished metal Swoosh ingot on the crown. Adjustable metal tri-glide closure for custom fit.",
      "sizes": [
        "One Size"
      ],
      "colors": [
        {
          "name": "Black / Silver Ingot",
          "hex": "#111111",
          "img": "images/nike-cap.png"
        }
      ],
      "variantStock": {
        "Black / Silver Ingot::One Size": 14
      }
    },
    "adidas-linear-core-backpack": {
      "category": "Accessories",
      "sub": "Bags",
      "brand": "Adidas",
      "name": "Linear Classic Daily Backpack",
      "price": 1650,
      "desc": "Roomy training backpack with front zip pocket, side slip-in water bottle pockets, and ergonomic padded shoulder straps.",
      "sizes": [
        "One Size"
      ],
      "colors": [
        {
          "name": "Black / White Logo",
          "hex": "#0a0a0a",
          "img": "images/adidas-backpack.png"
        }
      ],
      "variantStock": {
        "Black / White Logo::One Size": 12
      },
      "oldPrice": 2299
    },
    "nike-brasilia-duffel": {
      "category": "Accessories",
      "sub": "Bags",
      "brand": "Nike",
      "name": "Brasilia 9.5 Training Duffel Bag (Medium)",
      "price": 2100,
      "desc": "Heavyweight 600D polyester with water-resistant coated bottom. Features a dedicated exterior ventilated compartment for running shoes.",
      "sizes": [
        "One Size"
      ],
      "colors": [
        {
          "name": "Midnight Black",
          "hex": "#111111",
          "img": "images/nike-duffel.png"
        },
        {
          "name": "Iron Grey",
          "hex": "#52525b",
          "img": "images/nike-duffel-grey.png"
        }
      ],
      "variantStock": {
        "Midnight Black::One Size": 15,
        "Iron Grey::One Size": 10
      },
      "oldPrice": 2999
    },
    "adidas-girls-flower-print-tee": {
      "category": "Kids",
      "sub": "Girls",
      "brand": "Adidas",
      "name": "Aeroready Girls Graphic Sports Tee",
      "price": 950,
      "desc": "Lightweight, cheerful training tee with floral Badge of Sport logo and sweat-absorbing AEROREADY performance.",
      "sizes": [
        "S (8-10)",
        "M (10-12)",
        "L (12-14)",
        "XL (14-16)"
      ],
      "colors": [
        {
          "name": "Lilac",
          "hex": "#c084fc",
          "img": "images/adidas-girls-tee.png"
        }
      ],
      "variantStock": {
        "Lilac::S (8-10)": 4,
        "Lilac::M (10-12)": 7,
        "Lilac::L (12-14)": 9,
        "Lilac::XL (14-16)": 5
      },
      "oldPrice": 1499
    },
    "nike-trophy-girls-biker-shorts": {
      "category": "Kids",
      "sub": "Girls",
      "brand": "Nike",
      "name": "Trophy Dri-FIT Girls Training Shorts",
      "price": 1150,
      "desc": "Made to move, the Nike Trophy Shorts feature a wide elastic waistband with Dri-FIT moisture wicking for gymnastics, dance, or track.",
      "sizes": [
        "S (8-10)",
        "M (10-12)",
        "L (12-14)",
        "XL (14-16)"
      ],
      "colors": [
        {
          "name": "Black",
          "hex": "#111111",
          "img": "images/girls-shorts.png"
        }
      ],
      "variantStock": {
        "Black::S (8-10)": 5,
        "Black::M (10-12)": 8,
        "Black::L (12-14)": 9,
        "Black::XL (14-16)": 6
      },
      "oldPrice": 1699
    },
    "adidas-boys-essentials-tracksuit": {
      "category": "Kids",
      "sub": "Boys",
      "brand": "Adidas",
      "name": "Essentials 3-Stripes Boys Tracksuit",
      "price": 2800,
      "desc": "Classic 2-piece jacket and pants set made with smooth recycled tricot. Complete with full-zip front and signature 3-Stripes tape.",
      "sizes": [
        "S (8-10)",
        "M (10-12)",
        "L (12-14)",
        "XL (14-16)"
      ],
      "colors": [
        {
          "name": "Black / White",
          "hex": "#0a0a0a",
          "img": "images/adidas-boys-tracksuit.png"
        },
        {
          "name": "Royal Blue",
          "hex": "#1c4ed8",
          "img": "images/adidas-boys-tracksuit.png"
        }
      ],
      "variantStock": {
        "Black / White::S (8-10)": 4,
        "Black / White::M (10-12)": 7,
        "Black / White::L (12-14)": 8,
        "Black / White::XL (14-16)": 5,
        "Royal Blue::S (8-10)": 3,
        "Royal Blue::M (10-12)": 6,
        "Royal Blue::L (12-14)": 7,
        "Royal Blue::XL (14-16)": 4
      },
      "oldPrice": 3999
    },
    "nike-dri-fit-boys-top": {
      "category": "Kids",
      "sub": "Boys",
      "brand": "Nike",
      "name": "Dri-FIT Academy Boys Training Top",
      "price": 1250,
      "desc": "Football training top made with sweat-wicking fabric and breathable mesh panels to keep boys cool and dry during football drills.",
      "sizes": [
        "S (8-10)",
        "M (10-12)",
        "L (12-14)",
        "XL (14-16)"
      ],
      "colors": [
        {
          "name": "Navy / Volt",
          "hex": "#10223d",
          "img": "images/nike-boys-academy-top.png"
        },
        {
          "name": "Bright Crimson",
          "hex": "#ff2d55",
          "img": "images/nike-boys-academy-top.png"
        }
      ],
      "variantStock": {
        "Navy / Volt::S (8-10)": 5,
        "Navy / Volt::M (10-12)": 8,
        "Navy / Volt::L (12-14)": 10,
        "Navy / Volt::XL (14-16)": 6,
        "Bright Crimson::S (8-10)": 4,
        "Bright Crimson::M (10-12)": 7,
        "Bright Crimson::L (12-14)": 8,
        "Bright Crimson::XL (14-16)": 5
      }
    },
    "reebok-classic-leather-kids": {
      "category": "Kids",
      "sub": "Shoes",
      "brand": "Reebok",
      "name": "Classic Leather Junior",
      "price": 2250,
      "desc": "Timeless athletic heritage re-engineered for young athletes. Ultra-soft garment leather upper and high-abrasion rubber outsole.",
      "sizes": [
        "33",
        "34",
        "35",
        "36",
        "37",
        "38"
      ],
      "colors": [
        {
          "name": "Classic White",
          "hex": "#fafafa",
          "img": "images/reebok-classic-kids.png"
        },
        {
          "name": "Classic Black",
          "hex": "#1a1a1a",
          "img": "images/airforce1-triple-black.png"
        }
      ],
      "variantStock": {
        "Classic White::33": 5,
        "Classic White::34": 7,
        "Classic White::35": 9,
        "Classic White::36": 8,
        "Classic White::37": 6,
        "Classic White::38": 4,
        "Classic Black::33": 4,
        "Classic Black::34": 6,
        "Classic Black::35": 7,
        "Classic Black::36": 6,
        "Classic Black::37": 5,
        "Classic Black::38": 3
      },
      "oldPrice": 3299
    },
    "nike-revolution-7-kids": {
      "category": "Kids",
      "sub": "Shoes",
      "brand": "Nike",
      "name": "Revolution 7 Junior Road Runners",
      "price": 2450,
      "desc": "Loaded with the sort of soft cushioning and support your young runner needs to take on school races and playground sprints with confidence.",
      "sizes": [
        "33",
        "34",
        "35",
        "36",
        "37",
        "38"
      ],
      "colors": [
        {
          "name": "Racer Blue",
          "hex": "#1a56db",
          "img": "images/nike-revolution-7-kids.png"
        },
        {
          "name": "Triple Black",
          "hex": "#111111",
          "img": "images/airforce1-triple-black.png"
        }
      ],
      "variantStock": {
        "Racer Blue::33": 4,
        "Racer Blue::34": 6,
        "Racer Blue::35": 8,
        "Racer Blue::36": 7,
        "Racer Blue::37": 5,
        "Racer Blue::38": 3,
        "Triple Black::33": 3,
        "Triple Black::34": 5,
        "Triple Black::35": 7,
        "Triple Black::36": 6,
        "Triple Black::37": 4,
        "Triple Black::38": 2
      },
      "oldPrice": 3499
    },
    "adidas-essentials-linear-hoodie": {
      "category": "Women",
      "sub": "Hoodies",
      "brand": "Adidas",
      "name": "Essentials 3-Stripes French Terry Hoodie",
      "price": 2900,
      "desc": "Soft cotton-blend French terry hoodie with iconic 3-Stripes down the sleeves. A comfortable layer before, during, or after workouts.",
      "sizes": [
        "XS",
        "S",
        "M",
        "L"
      ],
      "colors": [
        {
          "name": "Wonder White",
          "hex": "#eeebe2",
          "img": "images/adidas-essentials-hoodie.png"
        },
        {
          "name": "Legend Ink",
          "hex": "#131e2e",
          "img": "images/adidas-essentials-hoodie.png"
        }
      ],
      "variantStock": {
        "Wonder White::XS": 4,
        "Wonder White::S": 6,
        "Wonder White::M": 8,
        "Wonder White::L": 4,
        "Legend Ink::XS": 3,
        "Legend Ink::S": 5,
        "Legend Ink::M": 7,
        "Legend Ink::L": 3
      }
    },
    "nike-sportswear-phoenix-fleece": {
      "category": "Women",
      "sub": "Hoodies",
      "brand": "Nike",
      "name": "Phoenix Fleece Oversized Pullover",
      "price": 3600,
      "desc": "Rise up and transform your fleece wardrobe with strong cozy vibes. Extra-wide ribbing at the hem and cuffs adds structured style.",
      "sizes": [
        "XS",
        "S",
        "M",
        "L"
      ],
      "colors": [
        {
          "name": "Oatmeal Heather",
          "hex": "#d6cdb7",
          "img": "images/nike-phoenix-fleece.png"
        },
        {
          "name": "Black",
          "hex": "#111111",
          "img": "images/nike-phoenix-fleece.png"
        }
      ],
      "variantStock": {
        "Oatmeal Heather::XS": 4,
        "Oatmeal Heather::S": 7,
        "Oatmeal Heather::M": 9,
        "Oatmeal Heather::L": 5,
        "Black::XS": 3,
        "Black::S": 6,
        "Black::M": 8,
        "Black::L": 4
      }
    },
    "nike-pro-dri-fit-leggings": {
      "category": "Women",
      "sub": "Leggings",
      "brand": "Nike",
      "name": "Nike Pro Mid-Rise Tights",
      "price": 2850,
      "desc": "Stretchy fabric with sweat-wicking technology hugs your body to keep you feeling supported and cool from warmups through cooldowns.",
      "sizes": [
        "XS",
        "S",
        "M",
        "L"
      ],
      "colors": [
        {
          "name": "Black",
          "hex": "#0a0a0a",
          "img": "images/nike-pro-tights.png"
        },
        {
          "name": "Smoke Grey",
          "hex": "#484848",
          "img": "images/nike-pro-tights.png"
        }
      ],
      "variantStock": {
        "Black::XS": 5,
        "Black::S": 10,
        "Black::M": 12,
        "Black::L": 7,
        "Smoke Grey::XS": 4,
        "Smoke Grey::S": 7,
        "Smoke Grey::M": 9,
        "Smoke Grey::L": 5
      }
    },
    "ua-rush-compression-leggings": {
      "category": "Women",
      "sub": "Leggings",
      "brand": "Under Armour",
      "name": "UA RUSH SmartForm Leggings",
      "price": 3900,
      "desc": "Mineral-infused fabric captures your body emitted heat and reflects it back into tissues, improving endurance, strength, and recovery.",
      "sizes": [
        "XS",
        "S",
        "M",
        "L"
      ],
      "colors": [
        {
          "name": "Black / Iridescent",
          "hex": "#1a1a24",
          "img": "images/ua-rush-leggings.png"
        },
        {
          "name": "Dark Maroon",
          "hex": "#4a1525",
          "img": "images/ua-rush-leggings.png"
        }
      ],
      "variantStock": {
        "Black / Iridescent::XS": 4,
        "Black / Iridescent::S": 8,
        "Black / Iridescent::M": 10,
        "Black / Iridescent::L": 6,
        "Dark Maroon::XS": 3,
        "Dark Maroon::S": 6,
        "Dark Maroon::M": 8,
        "Dark Maroon::L": 4
      },
      "oldPrice": 5499
    },
    "ua-crossback-sports-bra": {
      "category": "Women",
      "sub": "Tops",
      "brand": "Under Armour",
      "name": "HeatGear Armour Crossback Bra",
      "price": 1750,
      "desc": "Delivers strategic support tailored for medium-impact activities like cycling, weight training, and boxing. Super-smooth HeatGear fabric.",
      "sizes": [
        "XS",
        "S",
        "M",
        "L"
      ],
      "colors": [
        {
          "name": "Mod Grey",
          "hex": "#5c5c5c",
          "img": "images/ua-crossback-bra.png"
        },
        {
          "name": "Midnight Navy",
          "hex": "#111d33",
          "img": "images/ua-crossback-bra.png"
        }
      ],
      "variantStock": {
        "Mod Grey::XS": 4,
        "Mod Grey::S": 8,
        "Mod Grey::M": 10,
        "Mod Grey::L": 4,
        "Midnight Navy::XS": 3,
        "Midnight Navy::S": 6,
        "Midnight Navy::M": 8,
        "Midnight Navy::L": 4
      }
    },
    "nike-swoosh-medium-bra": {
      "category": "Women",
      "sub": "Tops",
      "brand": "Nike",
      "name": "Dri-FIT Swoosh Medium-Support Sports Bra",
      "price": 1950,
      "desc": "Classic racerback silhouette with non-padded compression design keeps everything comfortably in place during gym training and spin classes.",
      "sizes": [
        "XS",
        "S",
        "M",
        "L"
      ],
      "colors": [
        {
          "name": "Black / White",
          "hex": "#0a0a0a",
          "img": "images/nike-swoosh-bra.png"
        },
        {
          "name": "Desert Berry",
          "hex": "#8e3a59",
          "img": "images/nike-swoosh-bra.png"
        }
      ],
      "variantStock": {
        "Black / White::XS": 5,
        "Black / White::S": 9,
        "Black / White::M": 12,
        "Black / White::L": 6,
        "Desert Berry::XS": 4,
        "Desert Berry::S": 7,
        "Desert Berry::M": 9,
        "Desert Berry::L": 5
      },
      "oldPrice": 2799
    },
    "nike-invincible-3": {
      "category": "Women",
      "sub": "Shoes",
      "brand": "Nike",
      "name": "Invincible 3 Road Running Shoes",
      "price": 7900,
      "desc": "Maximum cushioning and bounce for everyday recovery runs. Features ultra-responsive ZoomX foam and a wider midsole base for stable strides.",
      "sizes": [
        "37",
        "38",
        "39",
        "40",
        "41"
      ],
      "colors": [
        {
          "name": "Platinum Violet",
          "hex": "#b8a9c9",
          "img": "images/nike-invincible-3.png"
        },
        {
          "name": "Pure White",
          "hex": "#ffffff",
          "img": "images/nike-invincible-3.png"
        }
      ],
      "variantStock": {
        "Platinum Violet::37": 4,
        "Platinum Violet::38": 6,
        "Platinum Violet::39": 8,
        "Platinum Violet::40": 5,
        "Platinum Violet::41": 3,
        "Pure White::37": 3,
        "Pure White::38": 5,
        "Pure White::39": 7,
        "Pure White::40": 4,
        "Pure White::41": 2
      }
    },
    "adidas-ultraboost-light": {
      "category": "Women",
      "sub": "Shoes",
      "brand": "Adidas",
      "name": "Ultraboost Light Running Shoes",
      "price": 8500,
      "desc": "Experience epic energy return with the lightest Ultraboost ever made. Built with 30% lighter Boost capsule material and foot-hugging Primeknit.",
      "sizes": [
        "37",
        "38",
        "39",
        "40",
        "41"
      ],
      "colors": [
        {
          "name": "Core Black / Violet",
          "hex": "#1b1b2f",
          "img": "images/adidas-ultraboost-light.png"
        },
        {
          "name": "Cloud White",
          "hex": "#f0f0f0",
          "img": "images/afc1-white.png"
        }
      ],
      "variantStock": {
        "Core Black / Violet::37": 4,
        "Core Black / Violet::38": 7,
        "Core Black / Violet::39": 9,
        "Core Black / Violet::40": 6,
        "Core Black / Violet::41": 3,
        "Cloud White::37": 3,
        "Cloud White::38": 6,
        "Cloud White::39": 8,
        "Cloud White::40": 5,
        "Cloud White::41": 2
      },
      "oldPrice": 11999
    },
    "nike-club-fleece-joggers": {
      "category": "Men",
      "sub": "Pants",
      "brand": "Nike",
      "name": "Club Fleece Athletic Joggers",
      "price": 2650,
      "desc": "Smooth brushed-back fleece with ribbed cuffs lets you show off your kicks. Features an elastic waistband with drawcord for a personalized fit.",
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ],
      "colors": [
        {
          "name": "Dark Grey",
          "hex": "#2c2c2c",
          "img": "images/nike-fleece-joggers.png"
        },
        {
          "name": "Black",
          "hex": "#0a0a0a",
          "img": "images/nike-fleece-joggers.png"
        }
      ],
      "variantStock": {
        "Dark Grey::S": 4,
        "Dark Grey::M": 8,
        "Dark Grey::L": 10,
        "Dark Grey::XL": 5,
        "Black::S": 5,
        "Black::M": 9,
        "Black::L": 11,
        "Black::XL": 6
      }
    },
    "adidas-tiro-24-pants": {
      "category": "Men",
      "sub": "Pants",
      "brand": "Adidas",
      "name": "Tiro 24 Track Training Pants",
      "price": 2400,
      "desc": "Signature tapered athletic silhouette with ankle zips for quick on-and-off over boots. AEROREADY moisture management keeps you dry.",
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ],
      "colors": [
        {
          "name": "Black / White",
          "hex": "#0a0a0a",
          "img": "images/adidas-tiro-pants.png"
        },
        {
          "name": "Team Navy",
          "hex": "#1b2a4a",
          "img": "images/adidas-tiro-pants.png"
        }
      ],
      "variantStock": {
        "Black / White::S": 5,
        "Black / White::M": 10,
        "Black / White::L": 12,
        "Black / White::XL": 6,
        "Team Navy::S": 4,
        "Team Navy::M": 7,
        "Team Navy::L": 9,
        "Team Navy::XL": 5
      },
      "oldPrice": 3299
    },
    "puma-essentials-fleece-hoodie": {
      "category": "Men",
      "sub": "Hoodies",
      "brand": "Puma",
      "name": "Essentials Big Logo Fleece Hoodie",
      "price": 2750,
      "desc": "Soft French terry fabric with bold PUMA No. 1 chest logo. Tailored for warmup track sessions and casual everyday recovery.",
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ],
      "colors": [
        {
          "name": "Puma Navy",
          "hex": "#1a2332",
          "img": "images/puma-fleece-hoodie.png"
        },
        {
          "name": "Medium Grey",
          "hex": "#6b7280",
          "img": "images/puma-fleece-hoodie.png"
        }
      ],
      "variantStock": {
        "Puma Navy::S": 4,
        "Puma Navy::M": 6,
        "Puma Navy::L": 8,
        "Puma Navy::XL": 5,
        "Medium Grey::S": 3,
        "Medium Grey::M": 5,
        "Medium Grey::L": 7,
        "Medium Grey::XL": 4
      },
      "oldPrice": 3999
    },
    "nike-club-fleece-hoodie": {
      "category": "Men",
      "sub": "Hoodies",
      "brand": "Nike",
      "name": "Club Fleece Pullover Hoodie",
      "price": 3200,
      "desc": "A wardrobe staple, Club Fleece is brushed on the inside for added warmth and softness. Features a classic kangaroo pocket and ribbed hem.",
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ],
      "colors": [
        {
          "name": "Black",
          "hex": "#111111",
          "img": "images/nike-club-hoodie.png"
        },
        {
          "name": "Heather Grey",
          "hex": "#8a8a8a",
          "img": "images/nike-club-hoodie.png"
        }
      ],
      "variantStock": {
        "Black::S": 4,
        "Black::M": 7,
        "Black::L": 9,
        "Black::XL": 5,
        "Heather Grey::S": 3,
        "Heather Grey::M": 6,
        "Heather Grey::L": 8,
        "Heather Grey::XL": 4
      },
      "oldPrice": 4599
    },
    "adidas-aeroready-tee": {
      "category": "Men",
      "sub": "Tops",
      "brand": "Adidas",
      "name": "Aeroready Designed for Movement Tee",
      "price": 1450,
      "desc": "Stay focused on your workout with moisture-absorbing AEROREADY tech and iconic 3-Stripes styling across the shoulders.",
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ],
      "colors": [
        {
          "name": "Lucid Cyan",
          "hex": "#00c3e3",
          "img": "images/adidas-aeroready-tee.png"
        },
        {
          "name": "White",
          "hex": "#f8f8f8",
          "img": "images/adidas-aeroready-tee.png"
        }
      ],
      "variantStock": {
        "Lucid Cyan::S": 6,
        "Lucid Cyan::M": 9,
        "Lucid Cyan::L": 12,
        "Lucid Cyan::XL": 7,
        "White::S": 5,
        "White::M": 8,
        "White::L": 10,
        "White::XL": 6
      }
    },
    "nike-miler-running-top": {
      "category": "Men",
      "sub": "Tops",
      "brand": "Nike",
      "name": "Dri-FIT Miler Running Top",
      "price": 1850,
      "desc": "Ultralight, breathable Dri-FIT fabric with UVA/UVB protection and rolled-forward shoulder seams for unrestricted arm swing during long-distance miles.",
      "sizes": [
        "S",
        "M",
        "L",
        "XL",
        "XXL"
      ],
      "colors": [
        {
          "name": "Volt Glow",
          "hex": "#c8ff00",
          "img": "images/nike-miler-top.png"
        },
        {
          "name": "Obsidian Black",
          "hex": "#111111",
          "img": "images/nike-miler-top.png"
        }
      ],
      "variantStock": {
        "Volt Glow::S": 5,
        "Volt Glow::M": 8,
        "Volt Glow::L": 10,
        "Volt Glow::XL": 6,
        "Volt Glow::XXL": 4,
        "Obsidian Black::S": 4,
        "Obsidian Black::M": 7,
        "Obsidian Black::L": 9,
        "Obsidian Black::XL": 5,
        "Obsidian Black::XXL": 3
      }
    },
    "nike-air-force-1": {
      "category": "Men",
      "sub": "Shoes",
      "brand": "Nike",
      "name": "Air Force 1 07",
      "price": 5499,
      "desc": "The legend lives on in the Nike Air Force 1 07. Hardwood court comfort meets street heritage with premium stitched leather and Nike Air cushioning.",
      "sizes": [
        "40",
        "41",
        "42",
        "43",
        "44",
        "45"
      ],
      "colors": [
        {
          "name": "Triple White",
          "hex": "#ffffff",
          "img": "images/afc1-white.png"
        },
        {
          "name": "Triple Black",
          "hex": "#0a0a0a",
          "img": "images/airforce1-triple-black.png"
        }
      ],
      "variantStock": {
        "Triple White::40": 8,
        "Triple White::41": 12,
        "Triple White::42": 15,
        "Triple White::43": 10,
        "Triple White::44": 6,
        "Triple White::45": 4,
        "Triple Black::40": 5,
        "Triple Black::41": 9,
        "Triple Black::42": 11,
        "Triple Black::43": 8,
        "Triple Black::44": 5,
        "Triple Black::45": 3
      },
      "oldPrice": 7999
    },
    "nike-pegasus-41": {
      "category": "Men",
      "sub": "Shoes",
      "brand": "Nike",
      "name": "Air Zoom Pegasus 41",
      "price": 6800,
      "desc": "Engineered with dual Air Zoom units and ReactX foam, the Pegasus 41 delivers an energized, responsive ride for everyday road running across Cairo.",
      "sizes": [
        "41",
        "42",
        "43",
        "44",
        "45"
      ],
      "colors": [
        {
          "name": "Volt / Black",
          "hex": "#c8ff00",
          "img": "images/hero-shoe.jpg"
        },
        {
          "name": "Pure Platinum",
          "hex": "#e5e5e5",
          "img": "images/afc1-white.png"
        }
      ],
      "variantStock": {
        "Volt / Black::41": 6,
        "Volt / Black::42": 8,
        "Volt / Black::43": 10,
        "Volt / Black::44": 7,
        "Volt / Black::45": 5,
        "Pure Platinum::41": 4,
        "Pure Platinum::42": 6,
        "Pure Platinum::43": 8,
        "Pure Platinum::44": 5,
        "Pure Platinum::45": 3
      }
    }
  };

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
      // Migrate to new 28-product catalog
      if (localStorage.getItem('kynetixCatalogVersion') !== '4.0') {
        localStorage.setItem('kynetixCatalogVersion', '4.0');
        const initial = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
        saveProducts(initial);
        return initial;
      }

      const saved = localStorage.getItem('kynetixProducts');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        Object.values(parsed).forEach(normalizeProductStock);
        return parsed;
      }
    } catch (e) {}
    const defaults = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
    saveProducts(defaults);
    return defaults;
  }

  function saveProducts(productsObj) {
    try {
      localStorage.setItem('kynetixProducts', JSON.stringify(productsObj));
    } catch (e) {}
  }

  async function syncProductsFromDB() {
    try {
      const res = await apiFetch('/products');
      if (res.ok && res.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        const productsObj = {};
        res.data.data.forEach((p) => {
          const key = p.slug || p.id;
          const fallback = DEFAULT_PRODUCTS[key] || {};
          productsObj[key] = {
            id: key,
            slug: p.slug,
            name: p.name,
            brand: p.brand,
            category: p.category,
            sub: p.sub,
            desc: p.desc || p.description || '',
            price: Number(p.price),
            // Sale / new flags come from the DB once kynetix_update_v4.sql is imported, otherwise from the built-in catalog
            oldPrice: p.oldPrice != null ? Number(p.oldPrice) : (fallback.oldPrice || null),
            isNew: p.isNew || !!fallback.isNew,
            sizes: p.sizes || [],
            colors: p.colors || [],
            variantStock: p.variantStock || {}
          };
          normalizeProductStock(productsObj[key]);
        });
        // Products added in v4 that are not in an older database yet still show up
        Object.entries(DEFAULT_PRODUCTS).forEach(([key, p]) => {
          if (!productsObj[key] && p.isNew) productsObj[key] = normalizeProductStock(JSON.parse(JSON.stringify(p)));
        });
        saveProducts(productsObj);
        window.dispatchEvent(new CustomEvent('kynetix:catalog-synced', { detail: productsObj }));
        return productsObj;
      }
    } catch (e) {}
    return getProducts();
  }

  // Trigger non-blocking database catalog synchronization
  syncProductsFromDB();

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

    const uniqueCategories = [...new Set(allProducts.map((p) => p.category).filter(Boolean))];
    const uniqueSubs = [...new Set(allProducts.map((p) => canonicalSub(p.sub)).filter(Boolean))];
    const uniqueBrands = [...new Set(allProducts.map((p) => p.brand).filter(Boolean))];
    const uniqueSizes = [...new Set(allProducts.flatMap((p) => p.sizes || []))];

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

    renderCheckboxes('#filterCategories', uniqueCategories, state.categories, 'categories');
    renderCheckboxes('#filterSubcategories', uniqueSubs, state.subs, 'subs');
    renderCheckboxes('#filterBrands', uniqueBrands, state.brands, 'brands');

    const sizeWrap = $('#filterSizes');
    if (sizeWrap) {
      sizeWrap.innerHTML = uniqueSizes.map((sz) => `
        <button type="button" class="filter-size-chip ${state.sizes.has(sz) ? 'is-active' : ''}" data-size-filter="${sz}">${sz}</button>
      `).join('');
    }

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
    const PRODUCTS = getProducts();
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get('id');
    const prodId = (requestedId && PRODUCTS[requestedId]) ? requestedId : Object.keys(PRODUCTS)[0];
    const product = PRODUCTS[prodId];

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
      resetCatalogBtn.addEventListener('click', () => {
        if (!confirm('Reset catalog back to the default sample products?')) return;
        localStorage.removeItem('kynetixProducts');
        localStorage.removeItem('kynetixCatalogVersion');
        renderAdminList();
        resetAdminForm();
        showToast('Catalog reset to defaults');
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
