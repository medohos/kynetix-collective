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

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- 9. INITIAL SEED DATA (AUTHENTIC SPORTSWEAR CATALOG)
-- ==============================================================================

-- A. Categories
INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `image_url`) VALUES
(1, 'Men', 'men', 'High-performance men athletic footwear and training apparel', 'images/cat-men.png'),
(2, 'Women', 'women', 'Engineered compression wear, runners, and studio essentials', 'images/cat-women.jpg'),
(3, 'Kids', 'kids', 'Durable, lightweight athletic gear built for junior athletes', 'images/cat-kids.png'),
(4, 'Accessories', 'accessories', 'Training duffels, athletic caps, and performance accessories', 'images/cat-accessories.jpg');

-- B. Subcategories
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
(15, 4, 'Socks', 'socks-accessories');

-- C. Brands
INSERT INTO `brands` (`id`, `name`, `slug`) VALUES
(1, 'Nike', 'nike'),
(2, 'Adidas', 'adidas'),
(3, 'Puma', 'puma'),
(4, 'Under Armour', 'under-armour'),
(5, 'Reebok', 'reebok');

-- D. Products Catalog (28 Famous Products)
INSERT INTO `products` (`id`, `slug`, `category_id`, `subcategory_id`, `brand_id`, `name`, `description`, `price`, `is_active`) VALUES
(1, 'nike-pegasus-41', 1, 1, 1, 'Air Zoom Pegasus 41', 'Engineered with dual Air Zoom units and ReactX foam, the Pegasus 41 delivers an energized, responsive ride for everyday road running across Cairo.', 6800.00, 1),
(2, 'nike-air-force-1', 1, 1, 1, 'Air Force 1 07', 'The legend lives on in the Nike Air Force 1 07. Hardwood court comfort meets street heritage with premium stitched leather and Nike Air cushioning.', 5499.00, 1),
(3, 'nike-miler-running-top', 1, 3, 1, 'Dri-FIT Miler Running Top', 'Ultralight, breathable Dri-FIT fabric with UVA/UVB protection and rolled-forward shoulder seams for unrestricted arm swing during long-distance miles.', 1850.00, 1),
(4, 'adidas-aeroready-tee', 1, 3, 2, 'Aeroready Designed for Movement Tee', 'Stay focused on your workout with moisture-absorbing AEROREADY tech and iconic 3-Stripes styling across the shoulders.', 1450.00, 1),
(5, 'nike-club-fleece-hoodie', 1, 2, 1, 'Club Fleece Pullover Hoodie', 'A wardrobe staple, Club Fleece is brushed on the inside for added warmth and softness. Features a classic kangaroo pocket and ribbed hem.', 3200.00, 1),
(6, 'puma-essentials-fleece-hoodie', 1, 2, 3, 'Essentials Big Logo Fleece Hoodie', 'Soft French terry fabric with bold PUMA No. 1 chest logo. Tailored for warmup track sessions and casual everyday recovery.', 2750.00, 1),
(7, 'adidas-tiro-24-pants', 1, 4, 2, 'Tiro 24 Track Training Pants', 'Signature tapered athletic silhouette with ankle zips for quick on-and-off over boots. AEROREADY moisture management keeps you dry.', 2400.00, 1),
(8, 'nike-club-fleece-joggers', 1, 4, 1, 'Club Fleece Athletic Joggers', 'Smooth brushed-back fleece with ribbed cuffs lets you show off your kicks. Features an elastic waistband with drawcord for a personalized fit.', 2650.00, 1),
(9, 'adidas-ultraboost-light', 2, 5, 2, 'Ultraboost Light Running Shoes', 'Experience epic energy return with the lightest Ultraboost ever made. Built with 30% lighter Boost capsule material and foot-hugging Primeknit.', 8500.00, 1),
(10, 'nike-invincible-3', 2, 5, 1, 'Invincible 3 Road Running Shoes', 'Maximum cushioning and bounce for everyday recovery runs. Features ultra-responsive ZoomX foam and a wider midsole base for stable strides.', 7900.00, 1),
(11, 'nike-swoosh-medium-bra', 2, 10, 1, 'Dri-FIT Swoosh Medium-Support Sports Bra', 'Classic racerback silhouette with non-padded compression design keeps everything comfortably in place during gym training and spin classes.', 1950.00, 1),
(12, 'ua-crossback-sports-bra', 2, 10, 4, 'HeatGear Armour Crossback Bra', 'Delivers strategic support tailored for medium-impact activities like cycling, weight training, and boxing. Super-smooth HeatGear fabric.', 1750.00, 1),
(13, 'ua-rush-compression-leggings', 2, 6, 4, 'UA RUSH SmartForm Leggings', 'Mineral-infused fabric captures your body emitted heat and reflects it back into tissues, improving endurance, strength, and recovery.', 3900.00, 1),
(14, 'nike-pro-dri-fit-leggings', 2, 6, 1, 'Nike Pro Mid-Rise Tights', 'Stretchy fabric with sweat-wicking technology hugs your body to keep you feeling supported and cool from warmups through cooldowns.', 2850.00, 1),
(15, 'nike-sportswear-phoenix-fleece', 2, 11, 1, 'Phoenix Fleece Oversized Pullover', 'Rise up and transform your fleece wardrobe with strong cozy vibes. Extra-wide ribbing at the hem and cuffs adds structured style.', 3600.00, 1),
(16, 'adidas-essentials-linear-hoodie', 2, 11, 2, 'Essentials 3-Stripes French Terry Hoodie', 'Soft cotton-blend French terry hoodie with iconic 3-Stripes down the sleeves. A comfortable layer before, during, or after workouts.', 2900.00, 1),
(17, 'nike-revolution-7-kids', 3, 8, 1, 'Revolution 7 Junior Road Runners', 'Loaded with the sort of soft cushioning and support your young runner needs to take on school races and playground sprints with confidence.', 2450.00, 1),
(18, 'reebok-classic-leather-kids', 3, 8, 5, 'Classic Leather Junior', 'Timeless athletic heritage re-engineered for young athletes. Ultra-soft garment leather upper and high-abrasion rubber outsole.', 2250.00, 1),
(19, 'nike-dri-fit-boys-top', 3, 12, 1, 'Dri-FIT Academy Boys Training Top', 'Football training top made with sweat-wicking fabric and breathable mesh panels to keep boys cool and dry during football drills.', 1250.00, 1),
(20, 'adidas-boys-essentials-tracksuit', 3, 12, 2, 'Essentials 3-Stripes Boys Tracksuit', 'Classic 2-piece jacket and pants set made with smooth recycled tricot. Complete with full-zip front and signature 3-Stripes tape.', 2800.00, 1),
(21, 'nike-trophy-girls-biker-shorts', 3, 13, 1, 'Trophy Dri-FIT Girls Training Shorts', 'Made to move, the Nike Trophy Shorts feature a wide elastic waistband with Dri-FIT moisture wicking for gymnastics, dance, or track.', 1150.00, 1),
(22, 'adidas-girls-flower-print-tee', 3, 13, 2, 'Aeroready Girls Graphic Sports Tee', 'Lightweight, cheerful training tee with floral Badge of Sport logo and sweat-absorbing AEROREADY performance.', 950.00, 1),
(23, 'nike-brasilia-duffel', 4, 9, 1, 'Brasilia 9.5 Training Duffel Bag (Medium)', 'Heavyweight 600D polyester with water-resistant coated bottom. Features a dedicated exterior ventilated compartment for running shoes.', 2100.00, 1),
(24, 'adidas-linear-core-backpack', 4, 9, 2, 'Linear Classic Daily Backpack', 'Roomy training backpack with front zip pocket, side slip-in water bottle pockets, and ergonomic padded shoulder straps.', 1650.00, 1),
(25, 'nike-club-metal-swoosh-cap', 4, 14, 1, 'Club Metal Swoosh Adjustable Cap', 'Classic mid-depth 6-panel cap with polished metal Swoosh ingot on the crown. Adjustable metal tri-glide closure for custom fit.', 1100.00, 1),
(26, 'adidas-aeroready-baseball-cap', 4, 14, 2, 'Aeroready 3-Stripes Baseball Cap', 'Curved brim with UV 50 factor protection and moisture-absorbing sweatband. Built for sunny outdoor miles and training sessions.', 950.00, 1),
(27, 'nike-everyday-cushioned-crew', 4, 15, 1, 'Everyday Cushioned Training Crew Socks (3 Pairs)', 'Power through your training with thick terry sole cushioning for extra comfort on foot drills and lifts. Dri-FIT moisture wicking.', 850.00, 1),
(28, 'ua-performance-no-show-socks', 4, 15, 4, 'HeatGear Performance No-Show Socks (3 Pairs)', 'Seamless toe construction and embedded arch support reduces foot fatigue. Anti-odor technology prevents the growth of odor-causing microbes.', 750.00, 1);

-- E. Product Colors
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
(41, 21, 'Pink Foam', '#f472b6', 'images/girls-shorts.png', 1),
(42, 21, 'Black', '#111111', 'images/girls-shorts.png', 0),
(43, 22, 'Lilac', '#c084fc', 'images/adidas-girls-tee.png', 1),
(44, 22, 'Cloud White', '#fafafa', 'images/adidas-girls-tee.png', 0),
(45, 23, 'Midnight Black', '#111111', 'images/nike-duffel.png', 1),
(46, 23, 'Iron Grey', '#52525b', 'images/nike-duffel-grey.png', 0),
(47, 24, 'Black / White Logo', '#0a0a0a', 'images/adidas-backpack.png', 1),
(48, 24, 'Legend Ink', '#172554', 'images/adidas-backpack.png', 0),
(49, 25, 'Black / Silver Ingot', '#111111', 'images/nike-cap.png', 1),
(50, 25, 'White / Silver Ingot', '#f5f5f5', 'images/nike-cap.png', 0),
(51, 26, 'Black / White', '#0a0a0a', 'images/adidas-cap-black.png', 1),
(52, 26, 'Navy / White', '#1e3a8a', 'images/adidas-cap-navy.png', 0),
(53, 27, 'White / Black Swoosh', '#ffffff', 'images/crewsocks-white.png', 1),
(54, 27, 'Black / White Swoosh', '#111111', 'images/crewsocks-black.png', 0),
(55, 28, 'Black Heather', '#262626', 'images/heatgear-noshow-black.png', 1),
(56, 28, 'Steel Grey', '#737373', 'images/heatgear-noshow-grey.png', 0);

-- F. Product Color x Size Inventory Variants
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
(67, 8, 15, 'L', 'P8-C15-S2-L', 10),
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
(104, 12, 23, 'L', 'P12-C23-S3-L', 5),
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
(119, 14, 27, 'M', 'P14-C27-S2-M', 12),
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
(181, 21, 41, 'S (8-10)', 'P21-C41-S0-S810', 4),
(182, 21, 41, 'M (10-12)', 'P21-C41-S1-M1012', 7),
(183, 21, 41, 'L (12-14)', 'P21-C41-S2-L1214', 8),
(184, 21, 41, 'XL (14-16)', 'P21-C41-S3-XL1416', 5),
(185, 21, 42, 'S (8-10)', 'P21-C42-S0-S810', 5),
(186, 21, 42, 'M (10-12)', 'P21-C42-S1-M1012', 8),
(187, 21, 42, 'L (12-14)', 'P21-C42-S2-L1214', 9),
(188, 21, 42, 'XL (14-16)', 'P21-C42-S3-XL1416', 6),
(189, 22, 43, 'S (8-10)', 'P22-C43-S0-S810', 4),
(190, 22, 43, 'M (10-12)', 'P22-C43-S1-M1012', 7),
(191, 22, 43, 'L (12-14)', 'P22-C43-S2-L1214', 9),
(192, 22, 43, 'XL (14-16)', 'P22-C43-S3-XL1416', 5),
(193, 22, 44, 'S (8-10)', 'P22-C44-S0-S810', 4),
(194, 22, 44, 'M (10-12)', 'P22-C44-S1-M1012', 6),
(195, 22, 44, 'L (12-14)', 'P22-C44-S2-L1214', 8),
(196, 22, 44, 'XL (14-16)', 'P22-C44-S3-XL1416', 4),
(197, 23, 45, 'One Size', 'P23-C45-S0-ONESIZE', 15),
(198, 23, 46, 'One Size', 'P23-C46-S0-ONESIZE', 10),
(199, 24, 47, 'One Size', 'P24-C47-S0-ONESIZE', 12),
(200, 24, 48, 'One Size', 'P24-C48-S0-ONESIZE', 8),
(201, 25, 49, 'One Size', 'P25-C49-S0-ONESIZE', 14),
(202, 25, 50, 'One Size', 'P25-C50-S0-ONESIZE', 9),
(203, 26, 51, 'One Size', 'P26-C51-S0-ONESIZE', 15),
(204, 26, 52, 'One Size', 'P26-C52-S0-ONESIZE', 10),
(205, 27, 53, 'M (38-42)', 'P27-C53-S0-M3842', 20),
(206, 27, 53, 'L (42-46)', 'P27-C53-S1-L4246', 25),
(207, 27, 54, 'M (38-42)', 'P27-C54-S0-M3842', 18),
(208, 27, 54, 'L (42-46)', 'P27-C54-S1-L4246', 22),
(209, 28, 55, 'M (38-42)', 'P28-C55-S0-M3842', 15),
(210, 28, 55, 'L (42-46)', 'P28-C55-S1-L4246', 20),
(211, 28, 56, 'M (38-42)', 'P28-C56-S0-M3842', 12),
(212, 28, 56, 'L (42-46)', 'P28-C56-S1-L4246', 16);

-- G. Promotional Coupons
INSERT INTO `coupons` (`code`, `discount_type`, `discount_value`, `label`, `min_spend`, `is_active`) VALUES
('KYNETIX10', 'percentage', 0.10, '10% Off', 0.00, 1),
('WELCOME20', 'percentage', 0.20, '20% Off', 0.00, 1),
('FREESHIP', 'free_shipping', 0.00, 'Free Shipping', 0.00, 1);

-- H. Sample Users (Admin and Customer)
INSERT INTO `users` (`id`, `email`, `password_hash`, `first_name`, `last_name`, `phone`, `role`) VALUES
(1, 'admin@kynetix.eg', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Kynetix', '+20 114 075 3312', 'admin'),
(2, 'athlete@cairo.eg', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Karim', 'Nour', '+20 101 234 5678', 'customer');

-- I. Customer Default Address
INSERT INTO `user_addresses` (`user_id`, `street_address`, `apartment`, `city`, `area`, `postal_code`, `is_default`) VALUES
(2, 'The British University in Egypt, Building A', 'Building A', 'Cairo', 'El Sherouk City', '11837', 1);

-- J. Sample Orders for Order Tracking (track.html)
INSERT INTO `orders` (`id`, `order_number`, `user_id`, `first_name`, `last_name`, `email`, `phone`, `shipping_address`, `shipping_apartment`, `shipping_city`, `shipping_area`, `shipping_postal`, `shipping_method`, `shipping_fee`, `courier_name`, `tracking_number`, `estimated_delivery`, `subtotal`, `discount_amount`, `coupon_code`, `total_amount`, `payment_method`, `payment_label`, `payment_status`, `order_status`) VALUES
(1, 'KYN-842910', 2, 'Karim', 'Nour', 'athlete@cairo.eg', '+20 101 234 5678', 'The British University in Egypt, Building A', 'Building A', 'Cairo', 'El Sherouk City', '11837', 'express', 120.00, 'Aramex Express', 'ARX-CAI-99382', '1–2 Business Days', 6800.00, 680.00, 'KYNETIX10', 6240.00, 'card', 'Credit Card (•••• 4242)', 'paid', 'out_for_delivery'),
(2, 'KYN-512930', 2, 'Karim', 'Nour', 'athlete@cairo.eg', '+20 101 234 5678', 'The British University in Egypt, Building A', 'Building A', 'Cairo', 'El Sherouk City', '11837', 'standard', 0.00, 'Bosta Standard', 'BST-EG-44019', '2–4 Business Days', 2100.00, 0.00, NULL, 2100.00, 'cod', 'Cash on Delivery', 'payment_upon_delivery', 'dispatched');

-- K. Order Items for the sample orders
INSERT INTO `order_items` (`order_id`, `product_id`, `variant_id`, `product_name`, `color_name`, `size`, `unit_price`, `quantity`, `total_price`, `image_url`) VALUES
(1, 1, 3, 'Air Zoom Pegasus 41', 'Volt / Black', 'US 10', 6800.00, 1, 6800.00, 'images/hero-shoe.jpg'),
(2, 7, 56, 'Brasilia 9.5 Training Duffel', 'Black / White', 'One Size', 2100.00, 1, 2100.00, 'images/cat-accessories.jpg');

-- L. Product Reviews (product.html)
INSERT INTO `reviews` (`product_id`, `user_id`, `author_name`, `rating`, `comment`, `is_verified`) VALUES
(1, 2, 'Youssef M.', 5, 'Best running shoes I have owned in Cairo. Extremely responsive on asphalt and road running.', 1),
(1, NULL, 'Mariam H.', 5, 'Super light and breathable. The Volt colorway looks even sharper in person.', 1),
(2, NULL, 'Omar S.', 5, 'Cleanest Air Force 1s in town. Leather is premium and the fit is true to size.', 1),
(3, NULL, 'Farida K.', 5, 'Unmatched comfort for 10K daily miles. Worth every Egyptian pound.', 1);

-- M. Sample Contact Inquiries
INSERT INTO `contact_messages` (`name`, `email`, `phone`, `subject`, `message`, `status`) VALUES
( 'Amr Tarek', 'amr@athletics.eg', '+20 109 876 5432', 'Custom Team Sizing', 'Inquiring about bulk team uniforms for our track squad in New Cairo.', 'unread');

-- ==============================================================================
-- END OF SCHEMA
-- ==============================================================================
