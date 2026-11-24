-- ==============================================================================
-- KYNETIX COLLECTIVE - DATABASE SCHEMA & PRODUCTION SEED DATA
-- Target RDBMS: MariaDB / MySQL (XAMPP / phpMyAdmin compatible)
-- Character Set: utf8mb4 (Full Unicode support for English & Arabic)
-- Description: E-commerce database schema for Kynetix Collective Sportswear
-- ==============================================================================

-- 1. DATABASE CREATION & SELECTION
CREATE DATABASE IF NOT EXISTS `kynetix_collective`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `kynetix_collective`;

-- Disable foreign key checks during schema creation
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 2. DROP TABLES (Reverse dependency order)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `contact_messages`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `wishlists`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `coupons`;
DROP TABLE IF EXISTS `product_variants`;
DROP TABLE IF EXISTS `product_colors`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `brands`;
DROP TABLE IF EXISTS `subcategories`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `user_addresses`;
DROP TABLE IF EXISTS `users`;

-- ------------------------------------------------------------------------------
-- 3. CORE IDENTITY & AUTHENTICATION
-- ------------------------------------------------------------------------------

-- Users table (Customers and Store Administrators)
CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `role` ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Saved Addresses (Egyptian Governorates & Local Districts)
CREATE TABLE `user_addresses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `street_address` TEXT NOT NULL,
  `apartment` VARCHAR(100) DEFAULT NULL,
  `city` VARCHAR(100) NOT NULL COMMENT 'Egyptian Governorate, e.g. Cairo, Giza, Alexandria',
  `area` VARCHAR(100) NOT NULL COMMENT 'District/Neighborhood, e.g. Maadi, New Cairo, Dokki',
  `postal_code` VARCHAR(20) DEFAULT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_user_addresses_user` (`user_id`),
  CONSTRAINT `fk_user_addresses_user` FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TAXONOMY (CATEGORIES, SUBCATEGORIES & BRANDS)
-- ------------------------------------------------------------------------------

-- Main Target Categories (Men, Women, Kids, Accessories)
CREATE TABLE `categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `slug` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255) DEFAULT NULL,
  `image_url` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product Subcategories (Shoes, Hoodies, Leggings, Bags, Shirts, Pants, Shorts, etc.)
CREATE TABLE `subcategories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `slug` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cat_sub` (`category_id`, `slug`),
  CONSTRAINT `fk_subcategories_category` FOREIGN KEY (`category_id`) 
    REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Brands (Nike, Adidas, Puma, Under Armour, Reebok)
CREATE TABLE `brands` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. CATALOG & MULTI-VARIANT INVENTORY
-- ------------------------------------------------------------------------------

-- Products Table
CREATE TABLE `products` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(100) NOT NULL UNIQUE COMMENT 'URL slug identifier, e.g. nike-pegasus',
  `category_id` INT UNSIGNED NOT NULL,
  `subcategory_id` INT UNSIGNED DEFAULT NULL,
  `brand_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `old_price` DECIMAL(10,2) DEFAULT NULL COMMENT 'Original price when on sale (price = sale price)',
  `is_new` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Shown in New Arrivals',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_products_category` (`category_id`),
  KEY `fk_products_subcategory` (`subcategory_id`),
  KEY `fk_products_brand` (`brand_id`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `fk_products_subcategory` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_products_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product Colors & Image Galleries
CREATE TABLE `product_colors` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` INT UNSIGNED NOT NULL,
  `color_name` VARCHAR(100) NOT NULL,
  `hex_code` VARCHAR(10) NOT NULL DEFAULT '#0a0a0a',
  `image_url` VARCHAR(255) NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `fk_product_colors_product` (`product_id`),
  CONSTRAINT `fk_product_colors_product` FOREIGN KEY (`product_id`) 
    REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product Variants Matrix (Color + Size Stock Matrix)
CREATE TABLE `product_variants` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` INT UNSIGNED NOT NULL,
  `color_id` INT UNSIGNED NOT NULL,
  `size` VARCHAR(20) NOT NULL COMMENT 'US 8, US 9, S, M, L, One Size, etc.',
  `sku` VARCHAR(100) DEFAULT NULL UNIQUE,
  `stock_quantity` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_variant` (`product_id`, `color_id`, `size`),
  KEY `fk_variants_color` (`color_id`),
  CONSTRAINT `fk_variants_product` FOREIGN KEY (`product_id`) 
    REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_variants_color` FOREIGN KEY (`color_id`) 
    REFERENCES `product_colors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. PROMOTIONS & COUPONS
-- ------------------------------------------------------------------------------

CREATE TABLE `coupons` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `discount_type` ENUM('percentage', 'free_shipping', 'fixed') NOT NULL,
  `discount_value` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '0.10 for 10% or fixed EGP amount',
  `label` VARCHAR(100) NOT NULL,
  `min_spend` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_coupons_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. ORDERS, SHIPMENTS & ORDER ITEMS
-- ------------------------------------------------------------------------------

-- Orders Master Table
CREATE TABLE `orders` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(30) NOT NULL UNIQUE COMMENT 'KYN-XXXXXX public tracking reference',
  `user_id` INT UNSIGNED DEFAULT NULL COMMENT 'NULL for guest checkout',
  
  -- Customer Contact
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  
  -- Egyptian Shipping Details
  `shipping_address` TEXT NOT NULL,
  `shipping_apartment` VARCHAR(100) DEFAULT NULL,
  `shipping_city` VARCHAR(100) NOT NULL,
  `shipping_area` VARCHAR(100) NOT NULL,
  `shipping_postal` VARCHAR(20) DEFAULT NULL,
  `delivery_notes` TEXT DEFAULT NULL,
  
  -- Shipping Method & Courier Details
  `shipping_method` ENUM('standard', 'express') NOT NULL DEFAULT 'standard',
  `shipping_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `courier_name` VARCHAR(100) NOT NULL DEFAULT 'Bosta Standard',
  `tracking_number` VARCHAR(100) DEFAULT NULL,
  `estimated_delivery` VARCHAR(100) NOT NULL DEFAULT '2-4 Business Days',
  
  -- Financial Totals (EGP)
  `subtotal` DECIMAL(10,2) NOT NULL,
  `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `coupon_code` VARCHAR(50) DEFAULT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  
  -- Payment
  `payment_method` ENUM('card', 'cod', 'wallet') NOT NULL DEFAULT 'card',
  `payment_label` VARCHAR(100) NOT NULL DEFAULT 'Credit Card',
  `payment_status` ENUM('pending', 'paid', 'payment_upon_delivery', 'refunded') NOT NULL DEFAULT 'pending',
  
  -- Fulfillment Status
  `order_status` ENUM('placed', 'processing', 'dispatched', 'out_for_delivery', 'delivered', 'cancelled') NOT NULL DEFAULT 'placed',
  
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_orders_order_number` (`order_number`),
  INDEX `idx_orders_user` (`user_id`),
  INDEX `idx_orders_phone` (`phone`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Line Items in an Order
CREATE TABLE `order_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED DEFAULT NULL,
  `variant_id` INT UNSIGNED DEFAULT NULL,
  `product_name` VARCHAR(200) NOT NULL,
  `color_name` VARCHAR(100) NOT NULL,
  `size` VARCHAR(20) NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `total_price` DECIMAL(10,2) NOT NULL,
  `image_url` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_order_items_order` (`order_id`),
  KEY `fk_order_items_product` (`product_id`),
  KEY `fk_order_items_variant` (`variant_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) 
    REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) 
    REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_order_items_variant` FOREIGN KEY (`variant_id`) 
    REFERENCES `product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. CUSTOMER ENGAGEMENT (WISHLISTS, REVIEWS & INQUIRIES)
-- ------------------------------------------------------------------------------

-- Saved Wishlist Items
CREATE TABLE `wishlists` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_wishlist` (`user_id`, `product_id`),
  KEY `fk_wishlists_product` (`product_id`),
  CONSTRAINT `fk_wishlists_user` FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wishlists_product` FOREIGN KEY (`product_id`) 
    REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verified Reviews & Star Ratings
CREATE TABLE `reviews` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `author_name` VARCHAR(100) NOT NULL,
  `rating` TINYINT UNSIGNED NOT NULL CHECK (`rating` BETWEEN 1 AND 5),
  `comment` TEXT NOT NULL,
  `is_verified` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_reviews_product` (`product_id`),
  KEY `fk_reviews_user` (`user_id`),
  CONSTRAINT `fk_reviews_product` FOREIGN KEY (`product_id`) 
    REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_user` FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contact Messages from contact.html
CREATE TABLE `contact_messages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `subject` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('unread', 'read', 'replied') NOT NULL DEFAULT 'unread',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 9. DATA SEED (COMPLETE STOREFRONT, NEW ARRIVALS, DISCOUNTS & ORDER DATA)
-- ==============================================================================

-- Table: categories (4 rows)
INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `image_url`) VALUES
(1, 'Men', 'men', 'High-performance men athletic footwear and training apparel', 'images/cat-men.png'),
(2, 'Women', 'women', 'Engineered compression wear, runners, and studio essentials', 'images/cat-women.jpg'),
(3, 'Kids', 'kids', 'Durable, lightweight athletic gear built for junior athletes', 'images/cat-kids.png'),
(4, 'Accessories', 'accessories', 'Training duffels, athletic caps, and performance accessories', 'images/cat-accessories.jpg');

-- Table: subcategories (16 rows)
INSERT INTO `subcategories` (`id`, `category_id`, `name`, `slug`) VALUES
(1, 1, 'Shoes', 'shoes-men'),
(2, 1, 'Hoodies', 'hoodies-men'),
(3, 1, 'Tops', 'tops-men'),
(4, 1, 'Pants', 'pants-men'),
(5, 2, 'Shoes', 'shoes-women'),
(6, 2, 'Leggings', 'leggings-women'),
(7, 2, 'Shorts', 'shorts-women'),
(8, 3, 'Shoes', 'shoes-kids'),
(9, 4, 'Bags', 'bags-accessories'),
(10, 2, 'Tops', 'tops-women'),
(11, 2, 'Hoodies', 'hoodies-women'),
(12, 3, 'Boys', 'boys-kids'),
(13, 3, 'Girls', 'girls-kids'),
(14, 4, 'Hats', 'hats-accessories'),
(15, 4, 'Socks', 'socks-accessories'),
(16, 2, 'Pants', 'pants-women');

-- Table: brands (5 rows)
INSERT INTO `brands` (`id`, `name`, `slug`) VALUES
(1, 'Nike', 'nike'),
(2, 'Adidas', 'adidas'),
(3, 'Puma', 'puma'),
(4, 'Under Armour', 'under-armour'),
(5, 'Reebok', 'reebok');

-- Table: products (59 rows)
INSERT INTO `products` (`id`, `slug`, `category_id`, `subcategory_id`, `brand_id`, `name`, `description`, `price`, `old_price`, `is_new`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'nike-pegasus-41', 1, 1, 1, 'Air Zoom Pegasus 41', 'Engineered with dual Air Zoom units and ReactX foam, the Pegasus 41 delivers an energized, responsive ride for everyday road running across Cairo.', '6800.00', NULL, 0, 1, '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(2, 'nike-air-force-1', 1, 1, 1, 'Air Force 1 07', 'The legend lives on in the Nike Air Force 1 07. Hardwood court comfort meets street heritage with premium stitched leather and Nike Air cushioning.', '5499.00', '7999.00', 0, 1, '2026-11-20 01:24:20', '2026-11-24 22:13:00'),
(3, 'nike-miler-running-top', 1, 3, 1, 'Dri-FIT Miler Running Top', 'Ultralight, breathable Dri-FIT fabric with UVA/UVB protection and rolled-forward shoulder seams for unrestricted arm swing during long-distance miles.', '1850.00', NULL, 0, 1, '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(4, 'adidas-aeroready-tee', 1, 3, 2, 'Aeroready Designed for Movement Tee', 'Stay focused on your workout with moisture-absorbing AEROREADY tech and iconic 3-Stripes styling across the shoulders.', '1450.00', NULL, 0, 1, '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(5, 'nike-club-fleece-hoodie', 1, 2, 1, 'Club Fleece Pullover Hoodie', 'A wardrobe staple, Club Fleece is brushed on the inside for added warmth and softness. Features a classic kangaroo pocket and ribbed hem.', '3200.00', '4599.00', 0, 1, '2026-11-20 01:24:20', '2026-11-24 22:13:00'),
(6, 'puma-essentials-fleece-hoodie', 1, 2, 3, 'Essentials Big Logo Fleece Hoodie', 'Soft French terry fabric with bold PUMA No. 1 chest logo. Tailored for warmup track sessions and casual everyday recovery.', '2750.00', '3999.00', 0, 1, '2026-11-20 01:24:20', '2026-11-24 22:13:00'),
(7, 'adidas-tiro-24-pants', 1, 4, 2, 'Tiro 24 Track Training Pants', 'Signature tapered athletic silhouette with ankle zips for quick on-and-off over boots. AEROREADY moisture management keeps you dry.', '2400.00', '3299.00', 0, 1, '2026-11-20 01:24:20', '2026-11-24 22:13:00'),
(8, 'nike-club-fleece-joggers', 1, 4, 1, 'Club Fleece Athletic Joggers', 'Smooth brushed-back fleece with ribbed cuffs lets you show off your kicks. Features an elastic waistband with drawcord for a personalized fit.', '2650.00', NULL, 0, 1, '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(9, 'adidas-ultraboost-light', 2, 5, 2, 'Ultraboost Light Running Shoes', 'Experience epic energy return with the lightest Ultraboost ever made. Built with 30% lighter Boost capsule material and foot-hugging Primeknit.', '8500.00', '11999.00', 0, 1, '2026-11-20 01:24:20', '2026-11-24 22:13:00'),
(10, 'nike-invincible-3', 2, 5, 1, 'Invincible 3 Road Running Shoes', 'Maximum cushioning and bounce for everyday recovery runs. Features ultra-responsive ZoomX foam and a wider midsole base for stable strides.', '7900.00', NULL, 0, 1, '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(11, 'nike-swoosh-medium-bra', 2, 10, 1, 'Dri-FIT Swoosh Medium-Support Sports Bra', 'Classic racerback silhouette with non-padded compression design keeps everything comfortably in place during gym training and spin classes.', '1950.00', '2799.00', 0, 1, '2026-11-20 01:24:20', '2026-11-24 22:13:00'),
(12, 'ua-crossback-sports-bra', 2, 10, 4, 'HeatGear Armour Crossback Bra', 'Delivers strategic support tailored for medium-impact activities like cycling, weight training, and boxing. Super-smooth HeatGear fabric.', '1750.00', NULL, 0, 1, '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(13, 'ua-rush-compression-leggings', 2, 6, 4, 'UA RUSH SmartForm Leggings', 'Mineral-infused fabric captures your body emitted heat and reflects it back into tissues, improving endurance, strength, and recovery.', '3900.00', '5499.00', 0, 1, '2026-11-20 01:24:20', '2026-11-24 22:13:00'),
(14, 'nike-pro-dri-fit-leggings', 2, 6, 1, 'Nike Pro Mid-Rise Tights', 'Stretchy fabric with sweat-wicking technology hugs your body to keep you feeling supported and cool from warmups through cooldowns.', '2850.00', NULL, 0, 1, '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(15, 'nike-sportswear-phoenix-fleece', 2, 11, 1, 'Phoenix Fleece Oversized Pullover', 'Rise up and transform your fleece wardrobe with strong cozy vibes. Extra-wide ribbing at the hem and cuffs adds structured style.', '3600.00', NULL, 0, 1, '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(16, 'adidas-essentials-linear-hoodie', 2, 11, 2, 'Essentials 3-Stripes French Terry Hoodie', 'Soft cotton-blend French terry hoodie with iconic 3-Stripes down the sleeves. A comfortable layer before, during, or after workouts.', '2900.00', NULL, 0, 1, '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(17, 'nike-revolution-7-kids', 3, 8, 1, 'Revolution 7 Junior Road Runners', 'Loaded with the sort of soft cushioning and support your young runner needs to take on school races and playground sprints with confidence.', '2450.00', '3499.00', 0, 1, '2026-11-20 01:24:20', '2026-11-24 22:13:00'),
(18, 'reebok-classic-leather-kids', 3, 8, 5, 'Classic Leather Junior', 'Timeless athletic heritage re-engineered for young athletes. Ultra-soft garment leather upper and high-abrasion rubber outsole.', '2250.00', '3299.00', 0, 1, '2026-11-20 01:24:20', '2026-11-24 22:13:00'),
(19, 'nike-dri-fit-boys-top', 3, 12, 1, 'Dri-FIT Academy Boys Training Top', 'Football training top made with sweat-wicking fabric and breathable mesh panels to keep boys cool and dry during football drills.', '1250.00', NULL, 0, 1, '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(20, 'adidas-boys-essentials-tracksuit', 3, 12, 2, 'Essentials 3-Stripes Boys Tracksuit', 'Classic 2-piece jacket and pants set made with smooth recycled tricot. Complete with full-zip front and signature 3-Stripes tape.', '2800.00', '3999.00', 0, 1, '2026-11-20 01:24:20', '2026-11-24 22:13:00'),
(21, 'nike-trophy-girls-biker-shorts', 3, 13, 1, 'Trophy Dri-FIT Girls Training Shorts', 'Made to move, the Nike Trophy Shorts feature a wide elastic waistband with Dri-FIT moisture wicking for gymnastics, dance, or track.', '1150.00', '1699.00', 0, 1, '2026-11-20 01:24:20', '2026-11-24 22:13:00'),
(22, 'adidas-girls-flower-print-tee', 3, 13, 2, 'Aeroready Girls Graphic Sports Tee', 'Lightweight, cheerful training tee with floral Badge of Sport logo and sweat-absorbing AEROREADY performance.', '950.00', '1499.00', 0, 1, '2026-11-20 01:24:20', '2026-11-24 22:13:00'),
(23, 'nike-brasilia-duffel', 4, 9, 1, 'Brasilia 9.5 Training Duffel Bag (Medium)', 'Heavyweight 600D polyester with water-resistant coated bottom. Features a dedicated exterior ventilated compartment for running shoes.', '2100.00', '2999.00', 0, 1, '2026-11-20 01:24:20', '2026-11-24 22:13:00'),
(24, 'adidas-linear-core-backpack', 4, 9, 2, 'Linear Classic Daily Backpack', 'Roomy training backpack with front zip pocket, side slip-in water bottle pockets, and ergonomic padded shoulder straps.', '1650.00', '2299.00', 0, 1, '2026-11-20 01:24:20', '2026-11-24 22:13:00'),
(25, 'nike-club-metal-swoosh-cap', 4, 14, 1, 'Club Metal Swoosh Adjustable Cap', 'Classic mid-depth 6-panel cap with polished metal Swoosh ingot on the crown. Adjustable metal tri-glide closure for custom fit.', '1100.00', NULL, 0, 1, '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(26, 'adidas-aeroready-baseball-cap', 4, 14, 2, 'Aeroready 3-Stripes Baseball Cap', 'Curved brim with UV 50 factor protection and moisture-absorbing sweatband. Built for sunny outdoor miles and training sessions.', '950.00', NULL, 0, 1, '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(27, 'nike-everyday-cushioned-crew', 4, 15, 1, 'Everyday Cushioned Training Crew Socks (3 Pairs)', 'Power through your training with thick terry sole cushioning for extra comfort on foot drills and lifts. Dri-FIT moisture wicking.', '850.00', NULL, 0, 1, '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(28, 'ua-performance-no-show-socks', 4, 15, 4, 'HeatGear Performance No-Show Socks (3 Pairs)', 'Seamless toe construction and embedded arch support reduces foot fatigue. Anti-odor technology prevents the growth of odor-causing microbes.', '750.00', NULL, 0, 1, '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(29, 'nike-tech-fleece-kids-hoodie', 3, 12, 1, 'Sportswear Tech Fleece Kids Full-Zip Hoodie', 'Lightweight Tech Fleece warmth with a streamlined fit, zip chest pocket and bonded seams for school runs and weekend training.', '4950.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(30, 'nike-tech-fleece-kids-joggers', 3, 12, 1, 'Sportswear Tech Fleece Kids Joggers', 'Tapered Tech Fleece joggers with ribbed cuffs and a zip side pocket. Warm without the bulk.', '4250.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(31, 'nike-solo-swoosh-kids-hoodie', 3, 12, 1, 'Solo Swoosh Kids Fleece Pullover Hoodie', 'Brushed-back fleece hoodie with a clean embroidered Swoosh and a roomy kangaroo pocket.', '2950.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(32, 'nike-adp-kids-puffer', 3, 12, 1, 'All Day Play Therma-FIT Kids Puffer Jacket', 'Loose-fit puffer with Therma-FIT insulation that traps body heat on cold winter mornings.', '4650.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(33, 'adidas-firebird-dot-kids-jacket', 3, 12, 2, 'Firebird Dot Print Kids Track Jacket', 'The classic Firebird track jacket in an all-over dot print, with a full zip and ribbed cuffs.', '2950.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(34, 'nike-studio-girls-oversized-hoodie', 3, 13, 1, 'Sportswear Studio Girls Oversized Fleece Hoodie', 'Soft oversized fleece hoodie with dropped shoulders for a relaxed, cozy fit.', '2700.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(35, 'nike-studio-girls-open-hem-pants', 3, 13, 1, 'Sportswear Studio Girls Fleece Open-Hem Pants', 'Matching open-hem fleece pants with an easy elastic waistband.', '2450.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(36, 'nike-pro-girls-fz-hoodie', 3, 13, 1, 'Nike Pro Girls Dri-FIT Full-Zip Hoodie', 'Sweat-wicking Dri-FIT fleece hoodie for training sessions and warm-ups.', '2550.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(37, 'nike-girls-cropped-tee', 3, 13, 1, 'Sportswear Girls Cropped T-Shirt', 'Soft cotton cropped tee with a modern boxy fit.', '1450.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(38, 'adidas-firebird-dot-kids-set', 3, 13, 2, 'Firebird Dot Print Jacket & Wide Leg Pant Set', 'Two-piece Firebird set: dot-print track jacket with matching wide-leg pants.', '3200.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(39, 'nike-dunk-low-kids', 3, 8, 1, 'Dunk Low Big Kids Shoes', 'The 80s basketball icon with a padded low-cut collar and durable leather overlays.', '4450.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(40, 'nike-air-force-1-le-kids', 3, 8, 1, 'Air Force 1 LE Big Kids Shoes', 'Crisp leather, Nike Air cushioning and the timeless AF1 silhouette, sized for kids.', '4400.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(41, 'adidas-samba-jane-kids', 3, 8, 2, 'Samba Jane Kids Shoes', 'The Samba reimagined as a Mary Jane with a hook-and-loop strap and gum outsole.', '3450.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(42, 'adidas-anthony-edwards-3-junior', 3, 8, 2, 'Anthony Edwards 3 Junior Basketball Shoes', 'Ant Edwards signature hoops shoe with responsive cushioning and multidirectional grip.', '4950.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(43, 'adidas-vl-court-3-kids', 3, 8, 2, 'VL Court 3.0 Kids Shoes', 'Skate-inspired suede trainers with a cushioned insole for all-day comfort.', '2950.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(44, 'puma-speedcat-og-kids', 3, 8, 3, 'Speedcat OG Big Kids Sneakers', 'Motorsport heritage in a slim suede profile with the iconic Formstrip.', '3950.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(45, 'puma-electrify-nitro-5-kids', 3, 8, 3, 'Electrify NITRO 5 Big Kids Running Shoes', 'NITRO foam cushioning in a lightweight runner built for sports day and the playground.', '3650.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(46, 'puma-mb06-hills-kids', 3, 8, 3, 'MB.06 Hills Big Kids Basketball Shoes', 'LaMelo Ball signature model with NITRO cushioning and a supportive high-traction outsole.', '5400.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(47, 'nike-air-max-metro', 1, 1, 1, 'Air Max Metro', 'Visible Air cushioning and a sleek layered upper made for city miles.', '6400.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(48, 'air-jordan-1-low', 1, 1, 1, 'Air Jordan 1 Low', 'The AJ1 in a low-cut build with encapsulated Air and premium leather.', '5850.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(49, 'nike-standard-issue-hoodie', 1, 2, 1, 'Standard Issue Dri-FIT Basketball Hoodie', 'Stretchy Dri-FIT fleece hoodie for warm-ups and courtside chill.', '5800.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(50, 'nike-standard-issue-pants', 1, 4, 1, 'Standard Issue Dri-FIT Basketball Pants', 'Open-hem Dri-FIT pants that move with you on and off the court.', '4950.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(51, 'nike-acg-wolf-tree-jacket', 1, 2, 1, 'ACG Wolf Tree Full-Zip Printed Jacket', 'Outdoor-ready ACG fleece jacket with an all-over printed pattern.', '6900.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(52, 'nike-total-90-women', 2, 5, 1, 'Total 90 Women\'s Shoes', 'Football-terrace style from the T90 archive, rebuilt as an everyday lifestyle shoe.', '6150.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(53, 'nike-air-superfly-shift', 2, 5, 1, 'Air Superfly Shift Women\'s Shoes', 'Retro runner lines with Air cushioning and a lightweight mesh upper.', '4950.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(54, 'nike-studio-fleece-crew', 2, 11, 1, 'Studio Fleece Oversized Crew', 'Midweight brushed fleece crew with an oversized, slouchy fit.', '4200.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(55, 'nike-studio-fleece-wide-leg', 2, 16, 1, 'Studio Fleece Mid-Rise Wide-Leg Pants', 'Relaxed wide-leg fleece pants with a soft mid-rise waistband.', '3450.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(56, 'nike-chill-knit-crop-top', 2, 10, 1, 'Chill Knit Slim Long-Sleeve Cropped Top', 'Smooth, stretchy rib-knit cropped top with a slim fit.', '1850.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(57, 'nike-varsity-elite-backpack', 4, 9, 1, 'Varsity Elite Backpack (32L)', 'Team-ready 32L backpack with a padded laptop sleeve and shoe compartment.', '4650.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(58, 'nike-everyday-elevated-crew-6p', 4, 15, 1, 'Everyday Elevated Crew Socks (6 Pairs)', 'Cushioned crew socks with arch support, six pairs per pack.', '1450.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00'),
(59, 'nike-everyday-elevated-ankle-6p', 4, 15, 1, 'Everyday Elevated Ankle Socks (6 Pairs)', 'Low-profile ankle socks with targeted cushioning, six pairs per pack.', '1350.00', NULL, 1, 1, '2026-11-24 22:13:00', '2026-11-24 22:13:00');

-- Table: product_colors (83 rows)
INSERT INTO `product_colors` (`id`, `product_id`, `color_name`, `hex_code`, `image_url`, `is_default`) VALUES
(1, 1, 'Volt / Black', '#c8ff00', 'images/hero-shoe.jpg', 1),
(2, 1, 'Pure Platinum', '#e5e5e5', 'images/afc1-white.png', 0),
(3, 2, 'Triple White', '#ffffff', 'images/afc1-white.png', 1),
(4, 2, 'Triple Black', '#0a0a0a', 'images/airforce1-triple-black.png', 0),
(5, 3, 'Volt Glow', '#c8ff00', 'images/nike-miler-top.png', 1),
(6, 3, 'Obsidian Black', '#111111', 'images/nike-miler-top.png', 0),
(7, 4, 'Lucid Cyan', '#00c3e3', 'images/adidas-aeroready-tee.png', 1),
(8, 4, 'White', '#f8f8f8', 'images/adidas-aeroready-tee.png', 0),
(9, 5, 'Black', '#111111', 'images/nike-club-hoodie.png', 1),
(10, 5, 'Heather Grey', '#8a8a8a', 'images/nike-club-hoodie.png', 0),
(11, 6, 'Puma Navy', '#1a2332', 'images/puma-fleece-hoodie.png', 1),
(12, 6, 'Medium Grey', '#6b7280', 'images/puma-fleece-hoodie.png', 0),
(13, 7, 'Black / White', '#0a0a0a', 'images/adidas-tiro-pants.png', 1),
(14, 7, 'Team Navy', '#1b2a4a', 'images/adidas-tiro-pants.png', 0),
(15, 8, 'Dark Grey', '#2c2c2c', 'images/nike-fleece-joggers.png', 1),
(16, 8, 'Black', '#0a0a0a', 'images/nike-fleece-joggers.png', 0),
(17, 9, 'Core Black / Violet', '#1b1b2f', 'images/adidas-ultraboost-light.png', 1),
(18, 9, 'Cloud White', '#f0f0f0', 'images/afc1-white.png', 0),
(19, 10, 'Platinum Violet', '#b8a9c9', 'images/nike-invincible-3.png', 1),
(20, 10, 'Pure White', '#ffffff', 'images/nike-invincible-3.png', 0),
(21, 11, 'Black / White', '#0a0a0a', 'images/nike-swoosh-bra.png', 1),
(22, 11, 'Desert Berry', '#8e3a59', 'images/nike-swoosh-bra.png', 0),
(23, 12, 'Mod Grey', '#5c5c5c', 'images/ua-crossback-bra.png', 1),
(24, 12, 'Midnight Navy', '#111d33', 'images/ua-crossback-bra.png', 0),
(25, 13, 'Black / Iridescent', '#1a1a24', 'images/ua-rush-leggings.png', 1),
(26, 13, 'Dark Maroon', '#4a1525', 'images/ua-rush-leggings.png', 0),
(27, 14, 'Black', '#0a0a0a', 'images/nike-pro-tights.png', 1),
(28, 14, 'Smoke Grey', '#484848', 'images/nike-pro-tights.png', 0),
(29, 15, 'Oatmeal Heather', '#d6cdb7', 'images/nike-phoenix-fleece.png', 1),
(30, 15, 'Black', '#111111', 'images/nike-phoenix-fleece.png', 0),
(31, 16, 'Wonder White', '#eeebe2', 'images/adidas-essentials-hoodie.png', 1),
(32, 16, 'Legend Ink', '#131e2e', 'images/adidas-essentials-hoodie.png', 0),
(33, 17, 'Racer Blue', '#1a56db', 'images/nike-revolution-7-kids.png', 1),
(34, 17, 'Triple Black', '#111111', 'images/airforce1-triple-black.png', 0),
(35, 18, 'Classic White', '#fafafa', 'images/reebok-classic-kids.png', 1),
(36, 18, 'Classic Black', '#1a1a1a', 'images/airforce1-triple-black.png', 0),
(37, 19, 'Navy / Volt', '#10223d', 'images/nike-boys-academy-top.png', 1),
(38, 19, 'Bright Crimson', '#ff2d55', 'images/nike-boys-academy-top.png', 0),
(39, 20, 'Black / White', '#0a0a0a', 'images/adidas-boys-tracksuit.png', 1),
(40, 20, 'Royal Blue', '#1c4ed8', 'images/adidas-boys-tracksuit.png', 0),
(42, 21, 'Black', '#111111', 'images/girls-shorts.png', 1),
(43, 22, 'Lilac', '#c084fc', 'images/adidas-girls-tee.png', 1),
(45, 23, 'Midnight Black', '#111111', 'images/nike-duffel.png', 1),
(46, 23, 'Iron Grey', '#52525b', 'images/nike-duffel-grey.png', 0),
(47, 24, 'Black / White Logo', '#0a0a0a', 'images/adidas-backpack.png', 1),
(49, 25, 'Black / Silver Ingot', '#111111', 'images/nike-cap.png', 1),
(51, 26, 'Black / White', '#0a0a0a', 'images/adidas-cap-black.png', 1),
(52, 26, 'Navy / White', '#1e3a8a', 'images/adidas-cap-navy.png', 0),
(53, 27, 'White / Black Swoosh', '#ffffff', 'images/crewsocks-white.png', 1),
(54, 27, 'Black / White Swoosh', '#111111', 'images/crewsocks-black.png', 0),
(55, 28, 'Black Heather', '#262626', 'images/heatgear-noshow-black.png', 1),
(56, 28, 'Steel Grey', '#737373', 'images/heatgear-noshow-grey.png', 0),
(57, 29, 'Burgundy Crush', '#6b2e2a', 'images/products/nike-tech-fleece-kids-hoodie.webp', 1),
(58, 30, 'Burgundy Crush', '#6b2e2a', 'images/products/nike-tech-fleece-kids-joggers.webp', 1),
(59, 31, 'Vintage Green', '#3f5a43', 'images/products/nike-solo-swoosh-kids-hoodie.webp', 1),
(60, 32, 'Black', '#111111', 'images/products/nike-adp-kids-puffer.webp', 1),
(61, 33, 'Grey', '#9a9a9a', 'images/products/adidas-firebird-dot-kids-jacket.webp', 1),
(62, 34, 'Coconut Milk', '#efe8d6', 'images/products/nike-studio-girls-oversized-hoodie.webp', 1),
(63, 35, 'Coconut Milk', '#efe8d6', 'images/products/nike-studio-girls-open-hem-pants.webp', 1),
(64, 36, 'Burgundy Crush', '#6b2e2a', 'images/products/nike-pro-girls-fz-hoodie.webp', 1),
(65, 37, 'White', '#ffffff', 'images/products/nike-girls-cropped-tee.webp', 1),
(66, 38, 'Burgundy', '#6d1f2f', 'images/products/adidas-firebird-dot-kids-set.webp', 1),
(67, 39, 'White / Black', '#f2f2f2', 'images/products/nike-dunk-low-kids.webp', 1),
(68, 40, 'Triple White', '#ffffff', 'images/products/nike-air-force-1-le-kids.webp', 1),
(69, 41, 'Red', '#c8102e', 'images/products/adidas-samba-jane-kids.webp', 1),
(70, 42, 'Orange', '#f26b1d', 'images/products/adidas-anthony-edwards-3-junior.webp', 1),
(71, 43, 'Core Black', '#111111', 'images/products/adidas-vl-court-3-kids.webp', 1),
(72, 44, 'Inky Depths / Warm White', '#1d2a44', 'images/products/puma-speedcat-og-kids.webp', 1),
(73, 45, 'Sunny Lime / Black', '#c9f031', 'images/products/puma-electrify-nitro-5-kids.webp', 1),
(74, 46, 'Cool Mid Gray / Lime Smash', '#9aa0a6', 'images/products/puma-mb06-hills-kids.webp', 1),
(75, 47, 'White / University Red / Black', '#f2f2f2', 'images/products/nike-air-max-metro.webp', 1),
(76, 48, 'White / Midnight Navy', '#f2f2f2', 'images/products/air-jordan-1-low.webp', 1),
(77, 49, 'Sail', '#efe9dc', 'images/products/nike-standard-issue-hoodie.webp', 1),
(78, 50, 'Sail', '#efe9dc', 'images/products/nike-standard-issue-pants.webp', 1),
(79, 51, 'Printed Burgundy', '#5a2a24', 'images/products/nike-acg-wolf-tree-jacket.webp', 1),
(80, 52, 'Burgundy Crush', '#5b2027', 'images/products/nike-total-90-women.webp', 1),
(81, 53, 'Light Bone', '#d9d6cf', 'images/products/nike-air-superfly-shift.webp', 1),
(82, 54, 'Black Print', '#111111', 'images/products/nike-studio-fleece-crew.webp', 1),
(83, 55, 'Pink Oxford', '#e8c4c4', 'images/products/nike-studio-fleece-wide-leg.webp', 1),
(84, 56, 'Burgundy Crush', '#6b2e2a', 'images/products/nike-chill-knit-crop-top.webp', 1),
(85, 57, 'Black', '#111111', 'images/products/nike-varsity-elite-backpack.webp', 1),
(86, 58, 'White / Black', '#ffffff', 'images/products/nike-everyday-elevated-crew-6p.webp', 1),
(87, 59, 'White / Black', '#ffffff', 'images/products/nike-everyday-elevated-ankle-6p.webp', 1);

-- Table: product_variants (339 rows)
INSERT INTO `product_variants` (`id`, `product_id`, `color_id`, `size`, `sku`, `stock_quantity`) VALUES
(1, 1, 1, '41', 'P1-C1-S0-41', 6),
(2, 1, 1, '42', 'P1-C1-S1-42', 8),
(3, 1, 1, '43', 'P1-C1-S2-43', 10),
(4, 1, 1, '44', 'P1-C1-S3-44', 7),
(5, 1, 1, '45', 'P1-C1-S4-45', 5),
(6, 1, 2, '41', 'P1-C2-S0-41', 4),
(7, 1, 2, '42', 'P1-C2-S1-42', 6),
(8, 1, 2, '43', 'P1-C2-S2-43', 8),
(9, 1, 2, '44', 'P1-C2-S3-44', 5),
(10, 1, 2, '45', 'P1-C2-S4-45', 3),
(11, 2, 3, '40', 'P2-C3-S0-40', 8),
(12, 2, 3, '41', 'P2-C3-S1-41', 12),
(13, 2, 3, '42', 'P2-C3-S2-42', 15),
(14, 2, 3, '43', 'P2-C3-S3-43', 10),
(15, 2, 3, '44', 'P2-C3-S4-44', 6),
(16, 2, 3, '45', 'P2-C3-S5-45', 4),
(17, 2, 4, '40', 'P2-C4-S0-40', 5),
(18, 2, 4, '41', 'P2-C4-S1-41', 9),
(19, 2, 4, '42', 'P2-C4-S2-42', 11),
(20, 2, 4, '43', 'P2-C4-S3-43', 8),
(21, 2, 4, '44', 'P2-C4-S4-44', 5),
(22, 2, 4, '45', 'P2-C4-S5-45', 3),
(23, 3, 5, 'S', 'P3-C5-S0-S', 5),
(24, 3, 5, 'M', 'P3-C5-S1-M', 8),
(25, 3, 5, 'L', 'P3-C5-S2-L', 10),
(26, 3, 5, 'XL', 'P3-C5-S3-XL', 6),
(27, 3, 5, 'XXL', 'P3-C5-S4-XXL', 4),
(28, 3, 6, 'S', 'P3-C6-S0-S', 4),
(29, 3, 6, 'M', 'P3-C6-S1-M', 7),
(30, 3, 6, 'L', 'P3-C6-S2-L', 9),
(31, 3, 6, 'XL', 'P3-C6-S3-XL', 5),
(32, 3, 6, 'XXL', 'P3-C6-S4-XXL', 3),
(33, 4, 7, 'S', 'P4-C7-S0-S', 6),
(34, 4, 7, 'M', 'P4-C7-S1-M', 9),
(35, 4, 7, 'L', 'P4-C7-S2-L', 12),
(36, 4, 7, 'XL', 'P4-C7-S3-XL', 7),
(37, 4, 8, 'S', 'P4-C8-S0-S', 5),
(38, 4, 8, 'M', 'P4-C8-S1-M', 8),
(39, 4, 8, 'L', 'P4-C8-S2-L', 10),
(40, 4, 8, 'XL', 'P4-C8-S3-XL', 6),
(41, 5, 9, 'S', 'P5-C9-S0-S', 4),
(42, 5, 9, 'M', 'P5-C9-S1-M', 7),
(43, 5, 9, 'L', 'P5-C9-S2-L', 9),
(44, 5, 9, 'XL', 'P5-C9-S3-XL', 5),
(45, 5, 10, 'S', 'P5-C10-S0-S', 3),
(46, 5, 10, 'M', 'P5-C10-S1-M', 6),
(47, 5, 10, 'L', 'P5-C10-S2-L', 8),
(48, 5, 10, 'XL', 'P5-C10-S3-XL', 4),
(49, 6, 11, 'S', 'P6-C11-S0-S', 4),
(50, 6, 11, 'M', 'P6-C11-S1-M', 6),
(51, 6, 11, 'L', 'P6-C11-S2-L', 8),
(52, 6, 11, 'XL', 'P6-C11-S3-XL', 5),
(53, 6, 12, 'S', 'P6-C12-S0-S', 3),
(54, 6, 12, 'M', 'P6-C12-S1-M', 5),
(55, 6, 12, 'L', 'P6-C12-S2-L', 7),
(56, 6, 12, 'XL', 'P6-C12-S3-XL', 4),
(57, 7, 13, 'S', 'P7-C13-S0-S', 5),
(58, 7, 13, 'M', 'P7-C13-S1-M', 10),
(59, 7, 13, 'L', 'P7-C13-S2-L', 12),
(60, 7, 13, 'XL', 'P7-C13-S3-XL', 6),
(61, 7, 14, 'S', 'P7-C14-S0-S', 4),
(62, 7, 14, 'M', 'P7-C14-S1-M', 7),
(63, 7, 14, 'L', 'P7-C14-S2-L', 9),
(64, 7, 14, 'XL', 'P7-C14-S3-XL', 5),
(65, 8, 15, 'S', 'P8-C15-S0-S', 4),
(66, 8, 15, 'M', 'P8-C15-S1-M', 8),
(67, 8, 15, 'L', 'P8-C15-S2-L', 9),
(68, 8, 15, 'XL', 'P8-C15-S3-XL', 5),
(69, 8, 16, 'S', 'P8-C16-S0-S', 5),
(70, 8, 16, 'M', 'P8-C16-S1-M', 9),
(71, 8, 16, 'L', 'P8-C16-S2-L', 11),
(72, 8, 16, 'XL', 'P8-C16-S3-XL', 6),
(73, 9, 17, '37', 'P9-C17-S0-37', 4),
(74, 9, 17, '38', 'P9-C17-S1-38', 7),
(75, 9, 17, '39', 'P9-C17-S2-39', 9),
(76, 9, 17, '40', 'P9-C17-S3-40', 6),
(77, 9, 17, '41', 'P9-C17-S4-41', 3),
(78, 9, 18, '37', 'P9-C18-S0-37', 3),
(79, 9, 18, '38', 'P9-C18-S1-38', 6),
(80, 9, 18, '39', 'P9-C18-S2-39', 8),
(81, 9, 18, '40', 'P9-C18-S3-40', 5),
(82, 9, 18, '41', 'P9-C18-S4-41', 2),
(83, 10, 19, '37', 'P10-C19-S0-37', 4),
(84, 10, 19, '38', 'P10-C19-S1-38', 6),
(85, 10, 19, '39', 'P10-C19-S2-39', 8),
(86, 10, 19, '40', 'P10-C19-S3-40', 5),
(87, 10, 19, '41', 'P10-C19-S4-41', 3),
(88, 10, 20, '37', 'P10-C20-S0-37', 3),
(89, 10, 20, '38', 'P10-C20-S1-38', 5),
(90, 10, 20, '39', 'P10-C20-S2-39', 7),
(91, 10, 20, '40', 'P10-C20-S3-40', 4),
(92, 10, 20, '41', 'P10-C20-S4-41', 2),
(93, 11, 21, 'XS', 'P11-C21-S0-XS', 5),
(94, 11, 21, 'S', 'P11-C21-S1-S', 9),
(95, 11, 21, 'M', 'P11-C21-S2-M', 12),
(96, 11, 21, 'L', 'P11-C21-S3-L', 6),
(97, 11, 22, 'XS', 'P11-C22-S0-XS', 4),
(98, 11, 22, 'S', 'P11-C22-S1-S', 7),
(99, 11, 22, 'M', 'P11-C22-S2-M', 9),
(100, 11, 22, 'L', 'P11-C22-S3-L', 5),
(101, 12, 23, 'XS', 'P12-C23-S0-XS', 4),
(102, 12, 23, 'S', 'P12-C23-S1-S', 8),
(103, 12, 23, 'M', 'P12-C23-S2-M', 10),
(104, 12, 23, 'L', 'P12-C23-S3-L', 4),
(105, 12, 24, 'XS', 'P12-C24-S0-XS', 3),
(106, 12, 24, 'S', 'P12-C24-S1-S', 6),
(107, 12, 24, 'M', 'P12-C24-S2-M', 8),
(108, 12, 24, 'L', 'P12-C24-S3-L', 4),
(109, 13, 25, 'XS', 'P13-C25-S0-XS', 4),
(110, 13, 25, 'S', 'P13-C25-S1-S', 8),
(111, 13, 25, 'M', 'P13-C25-S2-M', 10),
(112, 13, 25, 'L', 'P13-C25-S3-L', 6),
(113, 13, 26, 'XS', 'P13-C26-S0-XS', 3),
(114, 13, 26, 'S', 'P13-C26-S1-S', 6),
(115, 13, 26, 'M', 'P13-C26-S2-M', 8),
(116, 13, 26, 'L', 'P13-C26-S3-L', 4),
(117, 14, 27, 'XS', 'P14-C27-S0-XS', 5),
(118, 14, 27, 'S', 'P14-C27-S1-S', 10),
(119, 14, 27, 'M', 'P14-C27-S2-M', 11),
(120, 14, 27, 'L', 'P14-C27-S3-L', 7),
(121, 14, 28, 'XS', 'P14-C28-S0-XS', 4),
(122, 14, 28, 'S', 'P14-C28-S1-S', 7),
(123, 14, 28, 'M', 'P14-C28-S2-M', 9),
(124, 14, 28, 'L', 'P14-C28-S3-L', 5),
(125, 15, 29, 'XS', 'P15-C29-S0-XS', 4),
(126, 15, 29, 'S', 'P15-C29-S1-S', 7),
(127, 15, 29, 'M', 'P15-C29-S2-M', 9),
(128, 15, 29, 'L', 'P15-C29-S3-L', 5),
(129, 15, 30, 'XS', 'P15-C30-S0-XS', 3),
(130, 15, 30, 'S', 'P15-C30-S1-S', 6),
(131, 15, 30, 'M', 'P15-C30-S2-M', 8),
(132, 15, 30, 'L', 'P15-C30-S3-L', 4),
(133, 16, 31, 'XS', 'P16-C31-S0-XS', 4),
(134, 16, 31, 'S', 'P16-C31-S1-S', 6),
(135, 16, 31, 'M', 'P16-C31-S2-M', 8),
(136, 16, 31, 'L', 'P16-C31-S3-L', 4),
(137, 16, 32, 'XS', 'P16-C32-S0-XS', 3),
(138, 16, 32, 'S', 'P16-C32-S1-S', 5),
(139, 16, 32, 'M', 'P16-C32-S2-M', 7),
(140, 16, 32, 'L', 'P16-C32-S3-L', 3),
(141, 17, 33, '33', 'P17-C33-S0-33', 4),
(142, 17, 33, '34', 'P17-C33-S1-34', 6),
(143, 17, 33, '35', 'P17-C33-S2-35', 8),
(144, 17, 33, '36', 'P17-C33-S3-36', 7),
(145, 17, 33, '37', 'P17-C33-S4-37', 5),
(146, 17, 33, '38', 'P17-C33-S5-38', 3),
(147, 17, 34, '33', 'P17-C34-S0-33', 3),
(148, 17, 34, '34', 'P17-C34-S1-34', 5),
(149, 17, 34, '35', 'P17-C34-S2-35', 7),
(150, 17, 34, '36', 'P17-C34-S3-36', 6),
(151, 17, 34, '37', 'P17-C34-S4-37', 4),
(152, 17, 34, '38', 'P17-C34-S5-38', 2),
(153, 18, 35, '33', 'P18-C35-S0-33', 5),
(154, 18, 35, '34', 'P18-C35-S1-34', 7),
(155, 18, 35, '35', 'P18-C35-S2-35', 9),
(156, 18, 35, '36', 'P18-C35-S3-36', 8),
(157, 18, 35, '37', 'P18-C35-S4-37', 6),
(158, 18, 35, '38', 'P18-C35-S5-38', 4),
(159, 18, 36, '33', 'P18-C36-S0-33', 4),
(160, 18, 36, '34', 'P18-C36-S1-34', 6),
(161, 18, 36, '35', 'P18-C36-S2-35', 7),
(162, 18, 36, '36', 'P18-C36-S3-36', 6),
(163, 18, 36, '37', 'P18-C36-S4-37', 5),
(164, 18, 36, '38', 'P18-C36-S5-38', 3),
(165, 19, 37, 'S (8-10)', 'P19-C37-S0-S810', 5),
(166, 19, 37, 'M (10-12)', 'P19-C37-S1-M1012', 8),
(167, 19, 37, 'L (12-14)', 'P19-C37-S2-L1214', 10),
(168, 19, 37, 'XL (14-16)', 'P19-C37-S3-XL1416', 6),
(169, 19, 38, 'S (8-10)', 'P19-C38-S0-S810', 4),
(170, 19, 38, 'M (10-12)', 'P19-C38-S1-M1012', 7),
(171, 19, 38, 'L (12-14)', 'P19-C38-S2-L1214', 8),
(172, 19, 38, 'XL (14-16)', 'P19-C38-S3-XL1416', 5),
(173, 20, 39, 'S (8-10)', 'P20-C39-S0-S810', 4),
(174, 20, 39, 'M (10-12)', 'P20-C39-S1-M1012', 7),
(175, 20, 39, 'L (12-14)', 'P20-C39-S2-L1214', 8),
(176, 20, 39, 'XL (14-16)', 'P20-C39-S3-XL1416', 5),
(177, 20, 40, 'S (8-10)', 'P20-C40-S0-S810', 3),
(178, 20, 40, 'M (10-12)', 'P20-C40-S1-M1012', 6),
(179, 20, 40, 'L (12-14)', 'P20-C40-S2-L1214', 7),
(180, 20, 40, 'XL (14-16)', 'P20-C40-S3-XL1416', 4),
(185, 21, 42, 'S (8-10)', 'P21-C42-S0-S810', 5),
(186, 21, 42, 'M (10-12)', 'P21-C42-S1-M1012', 8),
(187, 21, 42, 'L (12-14)', 'P21-C42-S2-L1214', 9),
(188, 21, 42, 'XL (14-16)', 'P21-C42-S3-XL1416', 6),
(189, 22, 43, 'S (8-10)', 'P22-C43-S0-S810', 4),
(190, 22, 43, 'M (10-12)', 'P22-C43-S1-M1012', 7),
(191, 22, 43, 'L (12-14)', 'P22-C43-S2-L1214', 9),
(192, 22, 43, 'XL (14-16)', 'P22-C43-S3-XL1416', 5),
(197, 23, 45, 'One Size', 'P23-C45-S0-ONESIZE', 15),
(198, 23, 46, 'One Size', 'P23-C46-S0-ONESIZE', 10),
(199, 24, 47, 'One Size', 'P24-C47-S0-ONESIZE', 12),
(201, 25, 49, 'One Size', 'P25-C49-S0-ONESIZE', 14),
(203, 26, 51, 'One Size', 'P26-C51-S0-ONESIZE', 15),
(204, 26, 52, 'One Size', 'P26-C52-S0-ONESIZE', 10),
(205, 27, 53, 'M (38-42)', 'P27-C53-S0-M3842', 20),
(206, 27, 53, 'L (42-46)', 'P27-C53-S1-L4246', 25),
(207, 27, 54, 'M (38-42)', 'P27-C54-S0-M3842', 18),
(208, 27, 54, 'L (42-46)', 'P27-C54-S1-L4246', 22),
(209, 28, 55, 'M (38-42)', 'P28-C55-S0-M3842', 15),
(210, 28, 55, 'L (42-46)', 'P28-C55-S1-L4246', 20),
(211, 28, 56, 'M (38-42)', 'P28-C56-S0-M3842', 12),
(212, 28, 56, 'L (42-46)', 'P28-C56-S1-L4246', 16),
(213, 29, 57, 'S (8-10)', 'P29-C57-S0-S810', 6),
(214, 29, 57, 'M (10-12)', 'P29-C57-S1-M1012', 11),
(215, 29, 57, 'L (12-14)', 'P29-C57-S2-L1214', 16),
(216, 29, 57, 'XL (14-16)', 'P29-C57-S3-XL1416', 7),
(217, 30, 58, 'S (8-10)', 'P30-C58-S0-S810', 13),
(218, 30, 58, 'M (10-12)', 'P30-C58-S1-M1012', 18),
(219, 30, 58, 'L (12-14)', 'P30-C58-S2-L1214', 9),
(220, 30, 58, 'XL (14-16)', 'P30-C58-S3-XL1416', 14),
(221, 31, 59, 'S (8-10)', 'P31-C59-S0-S810', 6),
(222, 31, 59, 'M (10-12)', 'P31-C59-S1-M1012', 11),
(223, 31, 59, 'L (12-14)', 'P31-C59-S2-L1214', 16),
(224, 31, 59, 'XL (14-16)', 'P31-C59-S3-XL1416', 7),
(225, 32, 60, 'S (8-10)', 'P32-C60-S0-S810', 13),
(226, 32, 60, 'M (10-12)', 'P32-C60-S1-M1012', 18),
(227, 32, 60, 'L (12-14)', 'P32-C60-S2-L1214', 9),
(228, 32, 60, 'XL (14-16)', 'P32-C60-S3-XL1416', 14),
(229, 33, 61, 'S (8-10)', 'P33-C61-S0-S810', 6),
(230, 33, 61, 'M (10-12)', 'P33-C61-S1-M1012', 11),
(231, 33, 61, 'L (12-14)', 'P33-C61-S2-L1214', 16),
(232, 33, 61, 'XL (14-16)', 'P33-C61-S3-XL1416', 7),
(233, 34, 62, 'S (8-10)', 'P34-C62-S0-S810', 13),
(234, 34, 62, 'M (10-12)', 'P34-C62-S1-M1012', 18),
(235, 34, 62, 'L (12-14)', 'P34-C62-S2-L1214', 9),
(236, 34, 62, 'XL (14-16)', 'P34-C62-S3-XL1416', 14),
(237, 35, 63, 'S (8-10)', 'P35-C63-S0-S810', 6),
(238, 35, 63, 'M (10-12)', 'P35-C63-S1-M1012', 11),
(239, 35, 63, 'L (12-14)', 'P35-C63-S2-L1214', 16),
(240, 35, 63, 'XL (14-16)', 'P35-C63-S3-XL1416', 7),
(241, 36, 64, 'S (8-10)', 'P36-C64-S0-S810', 13),
(242, 36, 64, 'M (10-12)', 'P36-C64-S1-M1012', 18),
(243, 36, 64, 'L (12-14)', 'P36-C64-S2-L1214', 9),
(244, 36, 64, 'XL (14-16)', 'P36-C64-S3-XL1416', 14),
(245, 37, 65, 'S (8-10)', 'P37-C65-S0-S810', 6),
(246, 37, 65, 'M (10-12)', 'P37-C65-S1-M1012', 11),
(247, 37, 65, 'L (12-14)', 'P37-C65-S2-L1214', 16),
(248, 37, 65, 'XL (14-16)', 'P37-C65-S3-XL1416', 7),
(249, 38, 66, 'S (8-10)', 'P38-C66-S0-S810', 13),
(250, 38, 66, 'M (10-12)', 'P38-C66-S1-M1012', 18),
(251, 38, 66, 'L (12-14)', 'P38-C66-S2-L1214', 9),
(252, 38, 66, 'XL (14-16)', 'P38-C66-S3-XL1416', 14),
(253, 39, 67, '33', 'P39-C67-S0-33', 6),
(254, 39, 67, '34', 'P39-C67-S1-34', 11),
(255, 39, 67, '35', 'P39-C67-S2-35', 16),
(256, 39, 67, '36', 'P39-C67-S3-36', 7),
(257, 39, 67, '37', 'P39-C67-S4-37', 12),
(258, 39, 67, '38', 'P39-C67-S5-38', 17),
(259, 40, 68, '33', 'P40-C68-S0-33', 13),
(260, 40, 68, '34', 'P40-C68-S1-34', 18),
(261, 40, 68, '35', 'P40-C68-S2-35', 9),
(262, 40, 68, '36', 'P40-C68-S3-36', 14),
(263, 40, 68, '37', 'P40-C68-S4-37', 19),
(264, 40, 68, '38', 'P40-C68-S5-38', 10),
(265, 41, 69, '33', 'P41-C69-S0-33', 6),
(266, 41, 69, '34', 'P41-C69-S1-34', 11),
(267, 41, 69, '35', 'P41-C69-S2-35', 16),
(268, 41, 69, '36', 'P41-C69-S3-36', 7),
(269, 41, 69, '37', 'P41-C69-S4-37', 12),
(270, 41, 69, '38', 'P41-C69-S5-38', 17),
(271, 42, 70, '33', 'P42-C70-S0-33', 13),
(272, 42, 70, '34', 'P42-C70-S1-34', 18),
(273, 42, 70, '35', 'P42-C70-S2-35', 9),
(274, 42, 70, '36', 'P42-C70-S3-36', 14),
(275, 42, 70, '37', 'P42-C70-S4-37', 19),
(276, 42, 70, '38', 'P42-C70-S5-38', 10),
(277, 43, 71, '33', 'P43-C71-S0-33', 6),
(278, 43, 71, '34', 'P43-C71-S1-34', 11),
(279, 43, 71, '35', 'P43-C71-S2-35', 16),
(280, 43, 71, '36', 'P43-C71-S3-36', 7),
(281, 43, 71, '37', 'P43-C71-S4-37', 12),
(282, 43, 71, '38', 'P43-C71-S5-38', 17),
(283, 44, 72, '33', 'P44-C72-S0-33', 13),
(284, 44, 72, '34', 'P44-C72-S1-34', 18),
(285, 44, 72, '35', 'P44-C72-S2-35', 9),
(286, 44, 72, '36', 'P44-C72-S3-36', 14),
(287, 44, 72, '37', 'P44-C72-S4-37', 19),
(288, 44, 72, '38', 'P44-C72-S5-38', 10),
(289, 45, 73, '33', 'P45-C73-S0-33', 6),
(290, 45, 73, '34', 'P45-C73-S1-34', 11),
(291, 45, 73, '35', 'P45-C73-S2-35', 16),
(292, 45, 73, '36', 'P45-C73-S3-36', 7),
(293, 45, 73, '37', 'P45-C73-S4-37', 12),
(294, 45, 73, '38', 'P45-C73-S5-38', 17),
(295, 46, 74, '33', 'P46-C74-S0-33', 13),
(296, 46, 74, '34', 'P46-C74-S1-34', 18),
(297, 46, 74, '35', 'P46-C74-S2-35', 9),
(298, 46, 74, '36', 'P46-C74-S3-36', 14),
(299, 46, 74, '37', 'P46-C74-S4-37', 19),
(300, 46, 74, '38', 'P46-C74-S5-38', 10),
(301, 47, 75, '41', 'P47-C75-S0-41', 6),
(302, 47, 75, '42', 'P47-C75-S1-42', 11),
(303, 47, 75, '43', 'P47-C75-S2-43', 16),
(304, 47, 75, '44', 'P47-C75-S3-44', 7),
(305, 47, 75, '45', 'P47-C75-S4-45', 12),
(306, 48, 76, '41', 'P48-C76-S0-41', 13),
(307, 48, 76, '42', 'P48-C76-S1-42', 18),
(308, 48, 76, '43', 'P48-C76-S2-43', 9),
(309, 48, 76, '44', 'P48-C76-S3-44', 14),
(310, 48, 76, '45', 'P48-C76-S4-45', 19),
(311, 49, 77, 'S', 'P49-C77-S0-S', 6),
(312, 49, 77, 'M', 'P49-C77-S1-M', 11),
(313, 49, 77, 'L', 'P49-C77-S2-L', 16),
(314, 49, 77, 'XL', 'P49-C77-S3-XL', 7),
(315, 50, 78, 'S', 'P50-C78-S0-S', 13),
(316, 50, 78, 'M', 'P50-C78-S1-M', 18),
(317, 50, 78, 'L', 'P50-C78-S2-L', 9),
(318, 50, 78, 'XL', 'P50-C78-S3-XL', 14),
(319, 51, 79, 'S', 'P51-C79-S0-S', 6),
(320, 51, 79, 'M', 'P51-C79-S1-M', 11),
(321, 51, 79, 'L', 'P51-C79-S2-L', 16),
(322, 51, 79, 'XL', 'P51-C79-S3-XL', 7),
(323, 52, 80, '37', 'P52-C80-S0-37', 13),
(324, 52, 80, '38', 'P52-C80-S1-38', 18),
(325, 52, 80, '39', 'P52-C80-S2-39', 9),
(326, 52, 80, '40', 'P52-C80-S3-40', 14),
(327, 52, 80, '41', 'P52-C80-S4-41', 19),
(328, 53, 81, '37', 'P53-C81-S0-37', 6),
(329, 53, 81, '38', 'P53-C81-S1-38', 11),
(330, 53, 81, '39', 'P53-C81-S2-39', 16),
(331, 53, 81, '40', 'P53-C81-S3-40', 7),
(332, 53, 81, '41', 'P53-C81-S4-41', 12),
(333, 54, 82, 'XS', 'P54-C82-S0-XS', 13),
(334, 54, 82, 'S', 'P54-C82-S1-S', 18),
(335, 54, 82, 'M', 'P54-C82-S2-M', 9),
(336, 54, 82, 'L', 'P54-C82-S3-L', 14),
(337, 55, 83, 'XS', 'P55-C83-S0-XS', 6),
(338, 55, 83, 'S', 'P55-C83-S1-S', 11),
(339, 55, 83, 'M', 'P55-C83-S2-M', 16),
(340, 55, 83, 'L', 'P55-C83-S3-L', 7),
(341, 56, 84, 'XS', 'P56-C84-S0-XS', 13),
(342, 56, 84, 'S', 'P56-C84-S1-S', 18),
(343, 56, 84, 'M', 'P56-C84-S2-M', 9),
(344, 56, 84, 'L', 'P56-C84-S3-L', 14),
(345, 57, 85, 'One Size', 'P57-C85-S0-OneSize', 6),
(346, 58, 86, 'M (38-42)', 'P58-C86-S0-M3842', 13),
(347, 58, 86, 'L (42-46)', 'P58-C86-S1-L4246', 18),
(348, 59, 87, 'M (38-42)', 'P59-C87-S0-M3842', 6),
(349, 59, 87, 'L (42-46)', 'P59-C87-S1-L4246', 11);

-- Table: coupons (3 rows)
INSERT INTO `coupons` (`id`, `code`, `discount_type`, `discount_value`, `label`, `min_spend`, `is_active`, `created_at`) VALUES
(1, 'KYNETIX10', 'percentage', '0.10', '10% Off', '0.00', 1, '2026-11-20 01:24:20'),
(2, 'WELCOME20', 'percentage', '0.20', '20% Off', '0.00', 1, '2026-11-20 01:24:20'),
(3, 'FREESHIP', 'free_shipping', '0.00', 'Free Shipping', '0.00', 1, '2026-11-20 01:24:20');

-- Table: users (3 rows)
INSERT INTO `users` (`id`, `email`, `password_hash`, `first_name`, `last_name`, `phone`, `role`, `created_at`, `updated_at`) VALUES
(1, 'admin@kynetix.eg', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Kynetix', '+20 114 075 3312', 'admin', '2026-11-20 01:24:20', '2026-11-24 22:12:59'),
(2, 'athlete@cairo.eg', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Karim', 'Nour', '+20 101 234 5678', 'customer', '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(30002, 'ammar@kynetix.eg', '$2a$10$iA/a8ewJKyIMk3OgnxQH/eDO4If5W4tjufYM0/gHh2FCIb9gk6GPW', 'Ammar', '', '', 'customer', '2026-11-20 03:02:05', '2026-11-20 03:02:05');

-- Table: user_addresses (1 rows)
INSERT INTO `user_addresses` (`id`, `user_id`, `street_address`, `apartment`, `city`, `area`, `postal_code`, `is_default`, `created_at`) VALUES
(1, 2, 'The British University in Egypt, Building A', 'Building A', 'Cairo', 'El Sherouk City', '11837', 1, '2026-11-20 01:24:20');

-- Table: orders (5 rows)
INSERT INTO `orders` (`id`, `order_number`, `user_id`, `first_name`, `last_name`, `email`, `phone`, `shipping_address`, `shipping_apartment`, `shipping_city`, `shipping_area`, `shipping_postal`, `delivery_notes`, `shipping_method`, `shipping_fee`, `courier_name`, `tracking_number`, `estimated_delivery`, `subtotal`, `discount_amount`, `coupon_code`, `total_amount`, `payment_method`, `payment_label`, `payment_status`, `order_status`, `created_at`, `updated_at`) VALUES
(1, 'KYN-842910', 2, 'Karim', 'Nour', 'athlete@cairo.eg', '+20 101 234 5678', 'The British University in Egypt, Building A', 'Building A', 'Cairo', 'El Sherouk City', '11837', NULL, 'express', '120.00', 'Aramex Express', 'ARX-CAI-99382', '1–2 Business Days', '6800.00', '680.00', 'KYNETIX10', '6240.00', 'card', 'Credit Card (•••• 4242)', 'paid', 'out_for_delivery', '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(2, 'KYN-512930', 2, 'Karim', 'Nour', 'athlete@cairo.eg', '+20 101 234 5678', 'The British University in Egypt, Building A', 'Building A', 'Cairo', 'El Sherouk City', '11837', NULL, 'standard', '0.00', 'Bosta Standard', 'BST-EG-44019', '2–4 Business Days', '2100.00', '0.00', NULL, '2100.00', 'cod', 'Cash on Delivery', 'payment_upon_delivery', 'dispatched', '2026-11-20 01:24:20', '2026-11-20 01:24:20'),
(30002, 'KYN-370085', 30002, 'Mohamed', 'Gamal', 'mohamed@gmail.com', '+20 201140753312', 'El tagamo3', '1', 'Cairo', 'Tagamo3', '17272', 'Shhshs', 'express', '0.00', 'Aramex Express', NULL, '1–2 Business Days', '2850.00', '0.00', 'FREESHIP', '2850.00', 'card', 'Credit Card (•••• 5541)', 'paid', 'placed', '2026-11-21 12:28:09', '2026-11-21 12:28:09'),
(60002, 'KYN-759298', NULL, 'Karim', 'Mansour', 'demo.customer@example.com', '+20 01012345678', '14 El-Nasr Street, Tower B', 'Apt 9, Floor 3', 'Cairo', 'New Cairo', '', '', 'standard', '0.00', 'Bosta Standard', NULL, '2–4 Business Days', '2650.00', '265.00', 'KYNETIX10', '2385.00', 'cod', 'Cash on Delivery', 'payment_upon_delivery', 'placed', '2026-11-24 18:48:13', '2026-11-24 18:48:13'),
(90002, 'KYN-498363', NULL, 'Ziad', 'Yasser', 'dr.ziadyasser@gmail.com', '+20 201142497521', 'Elsadat Road 87', '', 'Cairo', 'Cairo', '11837', '', 'standard', '0.00', 'Bosta Standard', NULL, '2–4 Business Days', '4995.00', '499.50', 'KYNETIX10', '4495.50', 'card', 'Credit Card (•••• 2352)', 'paid', 'placed', '2026-11-24 21:55:15', '2026-11-24 21:55:15');

-- Table: order_items (5 rows)
INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `variant_id`, `product_name`, `color_name`, `size`, `unit_price`, `quantity`, `total_price`, `image_url`) VALUES
(1, 1, 1, 3, 'Air Zoom Pegasus 41', 'Volt / Black', 'US 10', '6800.00', 1, '6800.00', 'images/hero-shoe.jpg'),
(2, 2, 7, 56, 'Brasilia 9.5 Training Duffel', 'Black / White', 'One Size', '2100.00', 1, '2100.00', 'images/cat-accessories.jpg'),
(305639, 30002, 14, 119, 'Nike Pro Mid-Rise Tights (Black, M)', 'Black', 'M', '2850.00', 1, '2850.00', 'images/nike-pro-tights.png'),
(335639, 60002, 8, 67, 'Club Fleece Athletic Joggers (Dark Grey, L)', 'Dark Grey', 'L', '2650.00', 1, '2650.00', 'images/nike-fleece-joggers.png'),
(365639, 90002, NULL, NULL, 'Database (Default Black, Pdodo)', 'Default Black', 'Pdodo', '999.00', 5, '4995.00', 'images/hero-shoe.jpg');

-- Table: reviews (5 rows)
INSERT INTO `reviews` (`id`, `product_id`, `user_id`, `author_name`, `rating`, `comment`, `is_verified`, `created_at`) VALUES
(1, 1, 2, 'Youssef M.', 5, 'Best running shoes I have owned in Cairo. Extremely responsive on asphalt and road running.', 1, '2026-11-20 01:24:20'),
(2, 1, NULL, 'Mariam H.', 5, 'Super light and breathable. The Volt colorway looks even sharper in person.', 1, '2026-11-20 01:24:20'),
(3, 2, NULL, 'Omar S.', 5, 'Cleanest Air Force 1s in town. Leather is premium and the fit is true to size.', 1, '2026-11-20 01:24:20'),
(4, 3, NULL, 'Farida K.', 5, 'Unmatched comfort for 10K daily miles. Worth every Egyptian pound.', 1, '2026-11-20 01:24:20'),
(495962, 14, 30002, 'Marwan khaled', 4, 'I dont like the female model', 1, '2026-11-21 12:23:54');

-- Table: contact_messages (1 rows)
INSERT INTO `contact_messages` (`id`, `name`, `email`, `phone`, `subject`, `message`, `status`, `created_at`) VALUES
(1, 'Amr Tarek', 'amr@athletics.eg', '+20 109 876 5432', 'Custom Team Sizing', 'Inquiring about bulk team uniforms for our track squad in New Cairo.', 'unread', '2026-11-20 01:24:20');

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- END OF SCHEMA
-- ==============================================================================
