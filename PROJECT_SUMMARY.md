# Kynetix Collective — Project Summary & Technical Guide

## 1. What This Project Is About

**Kynetix Collective** is a full-stack e-commerce web application for an Egyptian multi-brand athletic sportswear store based in Cairo. It curates authentic footwear, apparel, and accessories from **Nike, Adidas, Puma, Under Armour, and Reebok** across four main categories (**Men, Women, Kids, and Accessories**).

The platform is localized for the Egyptian market:
- **Currency:** Egyptian Pound (`EGP`)
- **Shipping & Couriers:** Egyptian governorates and districts (e.g., Cairo, Giza, Alexandria, Maadi, New Cairo) with **Bosta Standard** (60 EGP, free over 1,000 EGP) and **Aramex Express** (120 EGP)
- **Payment Methods:** Credit/Debit Cards (Visa, MasterCard, Meeza), Cash on Delivery (COD), and InstaPay / Mobile Wallets
- **Full Storefront + Admin Panel:** Includes product browsing, filtering, live search, multi-variant (color × size) stock management, shopping bag, wishlist, checkout, order tracking, product reviews, contact inquiries, and an admin catalog dashboard.

---

## 2. Tech Stack & Architecture

The project follows a classic **Node.js MVC (Model–View–Controller)** architecture paired with a **Vanilla JavaScript** frontend and a **MySQL / MariaDB** relational database (configured for XAMPP).

| Layer | Technology |
| :--- | :--- |
| **Frontend (Views & Client Logic)** | HTML5, CSS3 (mobile-first responsive, Barlow / Barlow Condensed typography), Vanilla ES6+ JavaScript (`script.js`) |
| **Backend Server** | Node.js + Express (`server.js`, `app.js`) running on port `3000` |
| **Database** | MySQL / MariaDB (`mysql2/promise` connection pool) via XAMPP on port `3306`, database `kynetix_collective` (`utf8mb4`) |
| **Authentication & Security** | `bcryptjs` password hashing, `jsonwebtoken` (JWT Bearer tokens), CORS, `dotenv` |

### Request & Data Flow

```text
Browser (HTML + CSS + script.js)
   │
   ├── Page Requests (/, /shop, /product, /checkout, /track, /admin, ...)
   │      └── Express Static + routes/pageRoutes.js ──► Serves HTML/CSS/JS/images
   │
   └── API Requests (/api/products, /api/orders, /api/auth, /api/coupons, ...)
          └── routes/api/* ──► middleware (JWT auth) ──► controllers/* ──► models/* ──► MySQL Pool (config/db.js)
```

---

## 3. Project Folder Structure

```text
OSPROJECT/
├── .gitignore
├── readme.txt                          # Setup & mobile Wi-Fi testing guide
├── PROJECT_SUMMARY.md                  # This project summary
└── kynetix-collective/
    ├── server.js                       # Server entry point (tests DB connection & listens on PORT 3000)
    ├── app.js                          # Express app setup (CORS, JSON parsing, static files, routes, error handlers)
    ├── package.json                    # Dependencies & npm scripts (start, dev)
    ├── start-server.bat                # Windows one-click server launcher
    ├── kynetix_schema.sql              # Full 14-table MySQL schema + seed data (28 products, 212 variants)
    ├── .env / .env.example             # Environment variables (PORT, DB_*, JWT_SECRET)
    │
    ├── config/
    │   └── db.js                       # MySQL2 connection pool & startup connectivity check
    ├── middleware/
    │   ├── authMiddleware.js           # JWT verification (`protect`) & role guard (`adminOnly`)
    │   └── errorMiddleware.js          # 404 handler & centralized JSON error handler
    ├── models/                         # Database access layer (raw parameterized SQL & ACID transactions)
    │   ├── Product.js                  # Catalog queries, filtering, variant stock, transactional upsert/delete
    │   ├── Order.js                    # Transactional order creation with row locking & stock deduction
    │   ├── User.js                     # User registration, smart email lookup, bcrypt password comparison
    │   ├── Coupon.js                   # Promo code lookup & discount calculation
    │   ├── Review.js                   # Product reviews CRUD
    │   ├── Wishlist.js                 # User saved products
    │   └── Contact.js                  # Customer support inquiries
    ├── controllers/                    # Business logic & request validation
    │   ├── authController.js
    │   ├── productController.js
    │   ├── orderController.js
    │   ├── couponController.js
    │   ├── reviewController.js
    │   ├── wishlistController.js
    │   └── contactController.js
    ├── routes/
    │   ├── pageRoutes.js               # Clean URL routes for HTML pages
    │   └── api/                        # REST API route definitions mounted under /api
    │       ├── index.js                # Aggregates all API routers + /api/health
    │       ├── authRoutes.js
    │       ├── productRoutes.js
    │       ├── orderRoutes.js
    │       ├── couponRoutes.js
    │       ├── reviewRoutes.js
    │       ├── wishlistRoutes.js
    │       └── contactRoutes.js
    │
    ├── index.html                      # Home page (Hero, Categories, Brands)
    ├── shop.html                       # Product catalog with sidebar filters & sorting
    ├── product.html                    # Product detail page (gallery, color/size pickers, stock, reviews)
    ├── checkout.html                   # Full checkout flow (shipping, coupons, payment, confirmation)
    ├── track.html                      # Live order tracker (KYN-XXXXXX lookup & progress bar)
    ├── admin.html                      # Product catalog & inventory admin dashboard
    ├── about.html                      # Brand story & mission
    ├── contact.html                    # Support inquiry form
    ├── faq.html                        # Accordion FAQ (authenticity, delivery, 14-day returns, payments)
    ├── style.css                       # Global design system & responsive layouts
    ├── script.js                       # Unified client-side app logic for all pages (~3,300 lines)
    └── images/                         # Product photos, category banners, hero image, and logo
```

---

## 4. Website Pages & Features

### Storefront & Support Pages
- **Home (`index.html` / `/`):** Full-bleed hero banner, announcement bar (free shipping over 1,000 EGP), Shop by Category grid (Men, Women, Kids, Accessories), Brands showcase, and expanded footer with Egyptian payment badges.
- **Shop (`shop.html` / `/shop`):** Dynamic product grid supporting URL query parameters (`?category=`, `?sub=`, `?brand=`, `?search=`) plus a sidebar filter panel for **Category, Subcategory, Brand, Size, and Max Price slider** (up to 15,000 EGP), along with sorting (Featured, Price Low–High, Price High–Low, Name A–Z).
- **Product Detail (`product.html` / `/product`):** Multi-angle image gallery, interactive color swatches (which switch the product image and update size stock), size grid with a **Size Chart** modal, live stock indicator per `Color::Size` variant, **Add to Bag**, **Save to Wishlist**, store perks, and customer **Reviews & Star Ratings**.
- **Checkout (`checkout.html` / `/checkout`):** Complete order form with Egyptian governorate/area fields, shipping method selector (Standard vs. Express), promo code validation, payment method selector (Card, COD, InstaPay/Wallet), live order summary, and order confirmation screen with generated `KYN-XXXXXX` reference number.
- **Order Tracking (`track.html` / `/track`):** Looks up orders by reference number (`KYN-XXXXXX`) and displays a 4-stage visual progress bar (*Order Confirmed → Processing & Quality Check → Out for Delivery → Delivered*), courier details, and itemized breakdown.
- **Admin Dashboard (`admin.html` / `/admin`):** Lets administrators create, edit, and delete products, manage multiple colorways with hex swatches and image paths, configure per-variant (`Color × Size`) inventory counts in a live matrix, or reset defaults.
- **Informational Pages:** `about.html` (brand story), `faq.html` (interactive `<details>` FAQ accordion), and `contact.html` (inquiry form saved to MySQL).

### Global UI Components (Shared Across Pages)
- **Sticky Navigation Header:** Category mega-dropdowns on desktop and a collapsible mobile menu.
- **Live Search Autocomplete:** Queries products as you type and shows top matches with thumbnails and prices.
- **Slide-Out Shopping Bag Drawer:** Persisted in `localStorage` (`kynetixBag`), enforces real-time variant stock limits, allows quantity adjustments/removal, and links to checkout.
- **Slide-Out Wishlist Drawer:** Saves favorite items (backed by `localStorage` and `/api/wishlist` for authenticated users).
- **Account Modal:** Login / Sign-up tabs, logged-in athlete dashboard with recent order links, and a direct **Open Admin Dashboard** button for admin users.
- **Toast Notification System:** Non-blocking status feedback for actions like adding to bag, applying coupons, or login.

---

## 5. How It Works Under the Hood

### 1. API Auto-Detection & Offline Fallback (`script.js`)
- `script.js` automatically detects whether the site is loaded from Node (`port 3000`) or XAMPP Apache (`port 80`), pointing `API_BASE` to `/api` or `http://<hostname>:3000/api` respectively so mobile devices on the same Wi-Fi network can connect seamlessly.
- On page load, `syncProductsFromDB()` fetches the live catalog from `GET /api/products`, caches it in `localStorage` (`kynetixProducts`), and dispatches a `kynetix:catalog-synced` custom event so active pages re-render with live database data.
- If the backend is offline, the frontend gracefully falls back to `DEFAULT_PRODUCTS` and `localStorage` for browsing, cart, auth, and testing.

### 2. Multi-Variant Inventory & ACID Order Processing
- Every product has **colors** (`product_colors`) and **color × size variants** (`product_variants`), indexed on the frontend by `"Color Name::Size"`.
- When an order is placed (`POST /api/orders`), `Order.create()` runs inside a **MySQL ACID transaction**:
  1. Locks each requested variant row using `SELECT ... FOR UPDATE` and verifies sufficient stock.
  2. Generates a unique `KYN-XXXXXX` order number and inserts the master record into `orders`.
  3. Inserts each line item into `order_items`.
  4. Deducts `stock_quantity` from `product_variants` via `Product.deductVariantStock()`.
  5. Commits the transaction (or rolls back completely if any item is out of stock or fails).

### 3. Transactional Product Upsert (`Product.save`)
- Saving a product from `admin.html` (`POST /api/products` or `PUT /api/products/:slugOrId`) runs inside a MySQL transaction that resolves or auto-creates categories, subcategories, and brands, updates/inserts colors in place (preserving foreign key links to existing order items), and upserts the full `color × size` stock matrix with auto-generated SKUs.

### 4. Authentication & Role Routing
- Registration (`POST /api/auth/register`) hashes passwords with `bcryptjs` and returns a 30-day JWT.
- Login (`POST /api/auth/login`) verifies credentials and returns the user profile + JWT.
- Protected endpoints (`/api/auth/profile`, `/api/orders/my-orders`, `/api/wishlist/*`) use `authMiddleware.protect` to validate `Authorization: Bearer <token>`.
- Signing in as an admin (`role: 'admin'`, e.g., `admin@kynetix.eg`) automatically redirects to `admin.html`.

---

## 6. Database Schema (`kynetix_schema.sql`)

The `kynetix_collective` database contains **14 InnoDB tables** (`utf8mb4_unicode_ci`):

| Domain | Tables | Purpose |
| :--- | :--- | :--- |
| **Identity** | `users`, `user_addresses` | Customer & admin accounts (`customer` / `admin` roles) and saved Egyptian addresses |
| **Taxonomy** | `categories`, `subcategories`, `brands` | 4 categories, 15 subcategories, 5 brands |
| **Catalog & Stock** | `products`, `product_colors`, `product_variants` | 28 seeded products, 56 colorways, 212 SKU/stock variants |
| **Promotions** | `coupons` | Percentage, fixed, and free-shipping promo codes (`KYNETIX10`, `WELCOME20`, `FREESHIP`) |
| **Orders** | `orders`, `order_items` | Full order records (customer, shipping, courier, EGP totals, payment, fulfillment status) & line items |
| **Engagement** | `wishlists`, `reviews`, `contact_messages` | Saved items, verified 1–5 star product reviews, and support inquiries |

---

## 7. REST API Endpoints

All endpoints are prefixed with `/api`:

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Server health check |
| `GET` | `/api/products` | Public | List products (supports `category`, `subcategory`, `brand`, `search`, `sort`, `maxPrice`) |
| `GET` | `/api/products/search/autocomplete?q=` | Public | Top 5 live search suggestions |
| `GET` | `/api/products/:slugOrId` | Public | Single product with colors, sizes, variants & stock matrix |
| `POST` | `/api/products` | Admin* | Create product with colors & variant stock |
| `PUT` | `/api/products/:slugOrId` | Admin* | Update existing product & variant stock |
| `DELETE` | `/api/products/:slugOrId` | Admin* | Delete product (cascades to colors & variants) |
| `POST` | `/api/orders` | Public / Auth | Place order (validates & deducts variant stock in a transaction) |
| `GET` | `/api/orders/track/:orderNumber` | Public | Track order by `KYN-XXXXXX` reference |
| `GET` | `/api/orders/my-orders` | Private (JWT) | Logged-in user's order history |
| `POST` | `/api/auth/register` | Public | Register new customer account & return JWT |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT |
| `GET` | `/api/auth/profile` | Private (JWT) | Get authenticated user profile & recent orders |
| `POST` | `/api/coupons/validate` | Public | Validate promo code & calculate discount |
| `GET` | `/api/reviews/:productSlugOrId` | Public | Get reviews for a product |
| `POST` | `/api/reviews` | Public | Submit a new product review |
| `GET` | `/api/wishlist` | Private (JWT) | Get user's wishlist |
| `POST` | `/api/wishlist` | Private (JWT) | Add product to wishlist |
| `DELETE` | `/api/wishlist/:productId` | Private (JWT) | Remove product from wishlist |
| `POST` | `/api/contact` | Public | Submit a contact form inquiry |

*\*Note on product write routes: see Section 9 below.*

---

## 8. How to Run Locally

1. **Start MySQL in XAMPP:** Open XAMPP Control Panel and start **MySQL** (and Apache if using phpMyAdmin).
2. **Import the Database:** Open `http://localhost/phpmyadmin/`, create or import `kynetix-collective/kynetix_schema.sql` to initialize `kynetix_collective` and its seed data.
3. **Configure Environment:** Ensure `kynetix-collective/.env` matches your MySQL credentials (default XAMPP: `DB_HOST=localhost`, `DB_PORT=3306`, `DB_USER=root`, `DB_PASSWORD=`, `DB_NAME=kynetix_collective`).
4. **Install Dependencies & Start Server:**
   ```bash
   cd kynetix-collective
   npm install
   npm start
   ```
   *(On Windows, you can also double-click `start-server.bat`.)*
5. **Open in Browser:** Visit `http://localhost:3000/` (or `http://<your-local-ip>:3000/` from a phone on the same Wi-Fi).

---

## 9. Technical Notes & Potential Improvements

While scanning the codebase, a few helpful implementation details stood out if you plan to harden this for production:
- **Admin Route Protection:** `middleware/authMiddleware.js` defines `protect` and `adminOnly`, but `routes/api/productRoutes.js` does not currently attach them to `POST`, `PUT`, and `DELETE /api/products` (which makes local demo editing easy, though production should require admin JWT auth).
- **Demo Password Fallbacks:** `models/User.js` (`comparePassword`) includes convenience fallback passwords (`kynetix`, `Admin@123`, `User@123`, `123456`, etc.) for easy demo login alongside standard `bcryptjs` verification—these should be removed before any public deployment.
- **Coupon Code Sync:** `kynetix_schema.sql` and `script.js` seed `KYNETIX10`, `WELCOME20`, and `FREESHIP`, whereas `readme.txt` mentions `EGYPT10`, `RUNFAST`, and `WELCOME`.
- **Temporary Script:** `kynetix-collective/_tmp_verify_product_save.js` appears to be a temporary verification script that can be removed when no longer needed.
