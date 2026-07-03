-- Auto-generated SQL schema for Bach Hoa Xanh / Lotte Mart from Mongoose Models
-- Generated on 2026-06-24T07:14:55.127Z
-- Table mode: Core Business Tables Only

CREATE TABLE `addresses` (
  `user_id` JSON NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(255) DEFAULT '',
  `street` VARCHAR(255) DEFAULT '',
  `ward` VARCHAR(255) DEFAULT '',
  `district` VARCHAR(255) DEFAULT '',
  `city` VARCHAR(255) DEFAULT '',
  `full_address` VARCHAR(255) DEFAULT '',
  `is_default` BOOLEAN DEFAULT FALSE,
  `label` VARCHAR(255) DEFAULT 'home',
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `branches` (
  `name` VARCHAR(255) NOT NULL,
  `address` VARCHAR(255) DEFAULT '',
  `city` VARCHAR(255) DEFAULT '',
  `phone` VARCHAR(255) DEFAULT '',
  `manager` VARCHAR(255) DEFAULT '',
  `is_active` BOOLEAN DEFAULT TRUE,
  `operating_hours` VARCHAR(255) DEFAULT '08:00 - 22:00',
  `coordinates` JSON DEFAULT NULL,
  `coverage_radius_km` INT DEFAULT 5,
  `_id` VARCHAR(24) PRIMARY KEY,
  `createdAt` TIMESTAMP DEFAULT NULL,
  `updatedAt` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `branchproducts` (
  `product_id` JSON NOT NULL,
  `master_id` VARCHAR(255) DEFAULT '',
  `sku` VARCHAR(255) DEFAULT '',
  `category_id` JSON DEFAULT NULL,
  `category_name` VARCHAR(255) DEFAULT '',
  `supplier_id` JSON DEFAULT NULL,
  `supplier_name` VARCHAR(255) DEFAULT '',
  `branch_id` JSON NOT NULL,
  `price` DECIMAL(12, 2) DEFAULT 0,
  `original_price` DECIMAL(12, 2) DEFAULT 0,
  `import_price` DECIMAL(12, 2) DEFAULT 0,
  `discount_percent` DECIMAL(12, 2) DEFAULT 0,
  `stock` INT DEFAULT 0,
  `reserved_quantity` INT DEFAULT 0,
  `min_stock` INT DEFAULT 0,
  `max_purchase_limit` INT DEFAULT 0,
  `is_available` BOOLEAN DEFAULT TRUE,
  `sold_count` INT DEFAULT 0,
  `manufacture_date` TIMESTAMP DEFAULT null,
  `expiry_date` TIMESTAMP DEFAULT null,
  `batch_code` VARCHAR(255) DEFAULT '',
  `is_expiring_soon` BOOLEAN DEFAULT FALSE,
  `is_expired` BOOLEAN DEFAULT FALSE,
  `promotion_tag` VARCHAR(255) DEFAULT '',
  `promotion_end_date` TIMESTAMP DEFAULT null,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `carts` (
  `user_id` VARCHAR(24) NOT NULL,
  `branch_id` VARCHAR(255) NOT NULL,
  `items` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `categories` (
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) DEFAULT '',
  `icon` VARCHAR(255) DEFAULT '',
  `icon_type` VARCHAR(255) DEFAULT 'material_icon',
  `icon_url` TEXT DEFAULT '',
  `icon_name` VARCHAR(255) DEFAULT '',
  `icon_emoji` VARCHAR(255) DEFAULT '',
  `image` TEXT DEFAULT '',
  `banner` VARCHAR(255) DEFAULT '',
  `description` TEXT DEFAULT '',
  `parent_id` JSON DEFAULT NULL,
  `sort_order` INT DEFAULT 0,
  `display_order` INT DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `product_count` INT DEFAULT 0,
  `created_by` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `createdAt` TIMESTAMP DEFAULT NULL,
  `updatedAt` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `coupons` (
  `code` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) DEFAULT '',
  `description` TEXT DEFAULT '',
  `image` TEXT DEFAULT '',
  `type` VARCHAR(255) DEFAULT 'percent',
  `voucher_type` VARCHAR(255) DEFAULT 'product',
  `discount_value` DECIMAL(12, 2) DEFAULT 0,
  `min_order_amount` DECIMAL(12, 2) DEFAULT 0,
  `min_quantity` INT DEFAULT 0,
  `max_discount_amount` DECIMAL(12, 2) DEFAULT null,
  `total_quantity` DECIMAL(12, 2) DEFAULT null,
  `remaining_quantity` INT DEFAULT null,
  `claimed_count` INT DEFAULT 0,
  `hide_after_expired_hours` INT DEFAULT 24,
  `auto_hide_after_expired` BOOLEAN DEFAULT TRUE,
  `start_date` TIMESTAMP DEFAULT null,
  `end_date` TIMESTAMP DEFAULT null,
  `usage_limit` INT DEFAULT null,
  `usage_per_user` INT DEFAULT 1,
  `used_count` INT DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `status` VARCHAR(255) DEFAULT 'active',
  `claim_campaign` BOOLEAN DEFAULT FALSE,
  `badge_text` VARCHAR(255) DEFAULT '',
  `banner_image` TEXT DEFAULT '',
  `scope` VARCHAR(255) DEFAULT 'all',
  `target_product_ids` JSON DEFAULT NULL,
  `target_category_ids` JSON DEFAULT NULL,
  `target_branch_ids` JSON DEFAULT NULL,
  `excluded_product_ids` JSON DEFAULT NULL,
  `excluded_category_ids` JSON DEFAULT NULL,
  `created_by` VARCHAR(24) DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `couponusages` (
  `coupon_id` JSON NOT NULL,
  `user_id` JSON NOT NULL,
  `order_id` JSON DEFAULT NULL,
  `discount_amount` DECIMAL(12, 2) DEFAULT 0,
  `_id` VARCHAR(24) PRIMARY KEY,
  `used_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `couponclaims` (
  `coupon_id` JSON NOT NULL,
  `user_id` JSON NOT NULL,
  `claimed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(255) DEFAULT 'claimed',
  `used_order_id` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `event_posts` (
  `title` VARCHAR(255) DEFAULT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `category_id` INT DEFAULT NULL,
  `thumbnail` VARCHAR(255) DEFAULT NULL,
  `thumbnail_alt` VARCHAR(255) DEFAULT NULL,
  `excerpt` VARCHAR(255) DEFAULT NULL,
  `author_name` VARCHAR(255) DEFAULT NULL,
  `author_avatar` TEXT DEFAULT NULL,
  `published_at` TIMESTAMP DEFAULT NULL,
  `read_time` INT DEFAULT NULL,
  `views` INT DEFAULT NULL,
  `likes` INT DEFAULT 0,
  `liked_by` VARCHAR(24) DEFAULT NULL,
  `tags` JSON DEFAULT NULL,
  `start_date` TIMESTAMP DEFAULT NULL,
  `end_date` TIMESTAMP DEFAULT NULL,
  `is_featured` BOOLEAN DEFAULT NULL,
  `is_top_featured` BOOLEAN DEFAULT FALSE,
  `featured_priority` INT DEFAULT 0,
  `featured_order` INT DEFAULT 0,
  `hero_title_override` VARCHAR(255) DEFAULT '',
  `hero_excerpt_override` VARCHAR(255) DEFAULT '',
  `hero_image_override` TEXT DEFAULT '',
  `is_published` BOOLEAN DEFAULT NULL,
  `related_post_ids` JSON DEFAULT NULL,
  `content_blocks` JSON DEFAULT NULL,
  `status` VARCHAR(255) DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `branch` VARCHAR(255) DEFAULT null,
  `banner` VARCHAR(255) DEFAULT null,
  `promotion_id` VARCHAR(24) DEFAULT null,
  `summary` VARCHAR(255) DEFAULT '',
  `description` TEXT DEFAULT '',
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `eventcomments` (
  `event_id` JSON NOT NULL,
  `user_id` JSON NOT NULL,
  `user_name` VARCHAR(255) DEFAULT '',
  `user_avatar` TEXT DEFAULT null,
  `content` TEXT NOT NULL,
  `parent_id` JSON DEFAULT NULL,
  `likes` INT DEFAULT 0,
  `liked_by` VARCHAR(24) DEFAULT NULL,
  `status` VARCHAR(255) DEFAULT 'active',
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updatedAt` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `familycarts` (
  `roomCode` VARCHAR(255) NOT NULL,
  `roomName` VARCHAR(255) DEFAULT 'Giỏ Hàng Gia Đình',
  `shoppingGoal` VARCHAR(255) DEFAULT 'Mua sắm gia đình',
  `budgetLimit` INT DEFAULT 2000000,
  `createdBy` VARCHAR(255) NOT NULL,
  `members` JSON DEFAULT NULL,
  `items` JSON DEFAULT NULL,
  `checklist` JSON DEFAULT NULL,
  `chatMessages` JSON DEFAULT NULL,
  `approvals` JSON DEFAULT '[]',
  `activities` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `banners` (
  `title` VARCHAR(255) DEFAULT '',
  `subtitle` VARCHAR(255) DEFAULT '',
  `image` TEXT DEFAULT '',
  `image_url` TEXT DEFAULT '',
  `mobile_image_url` TEXT DEFAULT '',
  `alt_text` VARCHAR(255) DEFAULT '',
  `link` VARCHAR(255) DEFAULT '',
  `link_type` VARCHAR(255) DEFAULT 'url',
  `position` VARCHAR(255) DEFAULT 'home',
  `sort_order` INT DEFAULT 0,
  `priority` INT DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `start_date` TIMESTAMP DEFAULT null,
  `end_date` TIMESTAMP DEFAULT null,
  `branch_id` JSON DEFAULT NULL,
  `category_id` JSON DEFAULT NULL,
  `product_id` JSON DEFAULT NULL,
  `text_color` VARCHAR(255) DEFAULT '#ffffff',
  `overlay_color` VARCHAR(255) DEFAULT 'rgba(0,0,0,0.3)',
  `text_shadow` BOOLEAN DEFAULT TRUE,
  `created_by` VARCHAR(24) DEFAULT null,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `hotdeals` (
  `title` VARCHAR(255) DEFAULT '',
  `description` TEXT DEFAULT '',
  `image_url` TEXT DEFAULT '',
  `badge_text` VARCHAR(255) DEFAULT '',
  `product_id` JSON NOT NULL,
  `branch_product_id` JSON DEFAULT NULL,
  `branch_id` JSON DEFAULT NULL,
  `type` VARCHAR(255) DEFAULT 'percent',
  `discount_value` DECIMAL(12, 2) DEFAULT 0,
  `discount_percent` DECIMAL(12, 2) DEFAULT 0,
  `deal_price` DECIMAL(12, 2) DEFAULT 0,
  `original_price` DECIMAL(12, 2) DEFAULT 0,
  `target_product_ids` JSON DEFAULT NULL,
  `target_category_ids` JSON DEFAULT NULL,
  `target_branch_ids` JSON DEFAULT NULL,
  `start_date` TIMESTAMP DEFAULT null,
  `end_date` TIMESTAMP DEFAULT null,
  `stock_limit` INT DEFAULT 0,
  `total_quantity` DECIMAL(12, 2) DEFAULT null,
  `remaining_quantity` INT DEFAULT null,
  `sold_count` INT DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `status` VARCHAR(255) DEFAULT 'active',
  `priority` INT DEFAULT 0,
  `created_by` VARCHAR(24) DEFAULT null,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `featuredcollections` (
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT '',
  `image` TEXT DEFAULT '',
  `product_ids` JSON DEFAULT NULL,
  `sort_order` INT DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `_id` VARCHAR(24) PRIMARY KEY,
  `createdAt` TIMESTAMP DEFAULT NULL,
  `updatedAt` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `gamificationcampaigns` (
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT '',
  `type` VARCHAR(255) NOT NULL,
  `start_date` TIMESTAMP NOT NULL,
  `end_date` TIMESTAMP NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `rewards` JSON DEFAULT NULL,
  `checkin_schedule` JSON DEFAULT NULL,
  `streak_bonuses` JSON DEFAULT NULL,
  `max_spins_per_user_day` INT DEFAULT 1,
  `max_spins_per_user_total` DECIMAL(12, 2) DEFAULT null,
  `created_by` VARCHAR(24) DEFAULT null,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `importorders` (
  `order_code` VARCHAR(255) NOT NULL,
  `supplier_id` VARCHAR(24) NOT NULL,
  `branch_id` JSON NOT NULL,
  `status` VARCHAR(255) DEFAULT 'draft',
  `expected_date` TIMESTAMP DEFAULT null,
  `ordered_date` TIMESTAMP DEFAULT null,
  `received_date` TIMESTAMP DEFAULT null,
  `currency` VARCHAR(255) DEFAULT 'VND',
  `items` JSON DEFAULT '[]',
  `total_amount` DECIMAL(12, 2) DEFAULT 0,
  `total_received_amount` DECIMAL(12, 2) DEFAULT 0,
  `note` TEXT DEFAULT '',
  `timeline` JSON DEFAULT '[]',
  `created_by` JSON DEFAULT NULL,
  `updated_by` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `importreceipts` (
  `receipt_code` VARCHAR(255) NOT NULL,
  `import_order_id` VARCHAR(24) NOT NULL,
  `supplier_id` VARCHAR(24) NOT NULL,
  `branch_id` JSON NOT NULL,
  `received_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(255) DEFAULT 'confirmed',
  `items` JSON DEFAULT '[]',
  `total_amount` DECIMAL(12, 2) DEFAULT 0,
  `note` TEXT DEFAULT '',
  `created_by` JSON DEFAULT NULL,
  `updated_by` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `inventorybatches` (
  `branch_product_id` JSON NOT NULL,
  `batch_code` VARCHAR(255) DEFAULT '',
  `quantity` INT DEFAULT 0 NOT NULL,
  `exp_date` TIMESTAMP DEFAULT null,
  `manufacture_date` TIMESTAMP DEFAULT null,
  `received_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `cost_price` DECIMAL(12, 2) DEFAULT 0,
  `supplier_id` JSON DEFAULT NULL,
  `supplier_name` VARCHAR(255) DEFAULT '',
  `note` TEXT DEFAULT '',
  `purchase_order_id` JSON DEFAULT NULL,
  `import_receipt_id` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `loyaltytransactions` (
  `user_id` JSON NOT NULL,
  `type` VARCHAR(255) DEFAULT 'earn',
  `points` INT NOT NULL,
  `source` VARCHAR(255) DEFAULT 'purchase',
  `description` TEXT DEFAULT '',
  `order_id` JSON DEFAULT NULL,
  `balance_after` DECIMAL(12, 2) DEFAULT 0,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updatedAt` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `loyaltyrules` (
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT '',
  `type` VARCHAR(255) DEFAULT 'earn',
  `points_per_unit` INT DEFAULT 0,
  `min_order_value` INT DEFAULT 0,
  `multiplier` INT DEFAULT 1,
  `is_active` BOOLEAN DEFAULT TRUE,
  `_id` VARCHAR(24) PRIMARY KEY,
  `createdAt` TIMESTAMP DEFAULT NULL,
  `updatedAt` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `membershiptiers` (
  `level` VARCHAR(255) NOT NULL,
  `min_points` INT NOT NULL,
  `discount_rate` DECIMAL(12, 2) DEFAULT 0,
  `benefits` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `createdAt` TIMESTAMP DEFAULT NULL,
  `updatedAt` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `notifications` (
  `user_id` JSON NOT NULL,
  `type` VARCHAR(255) DEFAULT 'info',
  `title` VARCHAR(255) NOT NULL,
  `message` VARCHAR(255) DEFAULT '',
  `icon` VARCHAR(255) DEFAULT 'info',
  `link` VARCHAR(255) DEFAULT null,
  `is_read` BOOLEAN DEFAULT FALSE,
  `metadata` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `orders` (
  `user_id` JSON NOT NULL,
  `items` JSON DEFAULT NULL,
  `order_address` JSON DEFAULT NULL,
  `status` VARCHAR(255) DEFAULT 'PENDING',
  `subtotal` DECIMAL(12, 2) DEFAULT 0,
  `shipping_fee` DECIMAL(12, 2) DEFAULT 0,
  `discount_amount` DECIMAL(12, 2) DEFAULT 0,
  `total_amount` DECIMAL(12, 2) DEFAULT 0,
  `coupon_code` VARCHAR(255) DEFAULT null,
  `points_earned` INT DEFAULT 0,
  `payment` JSON DEFAULT NULL,
  `tracking` JSON DEFAULT NULL,
  `delivery_slot` JSON DEFAULT NULL,
  `branch_id` JSON DEFAULT NULL,
  `branch_name` VARCHAR(255) DEFAULT '',
  `pricing_breakdown` JSON DEFAULT NULL,
  `applied_promotions` JSON DEFAULT NULL,
  `applied_coupon` JSON DEFAULT NULL,
  `gift_items` JSON DEFAULT NULL,
  `note` TEXT DEFAULT '',
  `cancel_reason` VARCHAR(255) DEFAULT null,
  `generated_invoice_url` TEXT DEFAULT null,
  `email_notification_status` VARCHAR(255) DEFAULT 'PENDING',
  `email_notification_sent_at` TIMESTAMP DEFAULT null,
  `email_notification_error` VARCHAR(255) DEFAULT null,
  `idempotency_key` TEXT DEFAULT null,
  `is_deleted` BOOLEAN DEFAULT FALSE,
  `product_voucher_applied` JSON DEFAULT NULL,
  `shipping_voucher_applied` JSON DEFAULT NULL,
  `is_inventory_restored` BOOLEAN DEFAULT FALSE,
  `is_coupon_restored` BOOLEAN DEFAULT FALSE,
  `is_promotion_restored` BOOLEAN DEFAULT FALSE,
  `is_hot_deal_restored` BOOLEAN DEFAULT FALSE,
  `is_wallet_refunded` BOOLEAN DEFAULT FALSE,
  `is_points_reversed` BOOLEAN DEFAULT FALSE,
  `timeline` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `paymentmethods` (
  `user_id` JSON NOT NULL,
  `type` VARCHAR(255) DEFAULT 'card',
  `provider` VARCHAR(255) DEFAULT '',
  `brand` VARCHAR(255) DEFAULT '',
  `last4` VARCHAR(255) DEFAULT '',
  `holder_name` VARCHAR(255) DEFAULT '',
  `card_number` VARCHAR(255) DEFAULT '',
  `card_holder` VARCHAR(255) DEFAULT '',
  `expiry` VARCHAR(255) DEFAULT '',
  `phone` VARCHAR(255) DEFAULT '',
  `is_default` BOOLEAN DEFAULT FALSE,
  `icon` VARCHAR(255) DEFAULT '',
  `_id` VARCHAR(24) PRIMARY KEY,
  `createdAt` TIMESTAMP DEFAULT NULL,
  `updatedAt` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `paymenttransactions` (
  `order_id` JSON DEFAULT NULL,
  `user_id` JSON DEFAULT NULL,
  `provider` VARCHAR(255) DEFAULT '',
  `method_id` VARCHAR(255) DEFAULT '',
  `transaction_id` VARCHAR(255) DEFAULT '',
  `amount` DECIMAL(12, 2) DEFAULT 0,
  `currency` VARCHAR(255) DEFAULT 'VND',
  `status` VARCHAR(255) DEFAULT 'PENDING',
  `qr_data` JSON DEFAULT NULL,
  `paid_at` TIMESTAMP DEFAULT null,
  `expired_at` TIMESTAMP DEFAULT null,
  `metadata` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `paymentproviders` (
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(255) NOT NULL,
  `icon` VARCHAR(255) DEFAULT '',
  `is_active` BOOLEAN DEFAULT TRUE,
  `config` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `createdAt` TIMESTAMP DEFAULT NULL,
  `updatedAt` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `permissions` (
  `key` TEXT NOT NULL,
  `label` VARCHAR(255) DEFAULT '',
  `group` VARCHAR(255) DEFAULT 'general',
  `description` TEXT DEFAULT '',
  `is_active` BOOLEAN DEFAULT TRUE,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `popupads` (
  `title` VARCHAR(255) NOT NULL,
  `subtitle` VARCHAR(255) DEFAULT '',
  `description` TEXT DEFAULT '',
  `image_url` TEXT NOT NULL,
  `cta_text` VARCHAR(255) DEFAULT '',
  `cta_link` VARCHAR(255) DEFAULT '',
  `campaign_type` VARCHAR(255) DEFAULT 'general',
  `target_branch` VARCHAR(255) DEFAULT 'all',
  `target_audience` VARCHAR(255) DEFAULT 'all',
  `start_date` TIMESTAMP DEFAULT null,
  `end_date` TIMESTAMP DEFAULT null,
  `priority` INT DEFAULT 0,
  `status` VARCHAR(255) DEFAULT 'active',
  `show_once_per_day` BOOLEAN DEFAULT TRUE,
  `display_limit` INT DEFAULT null,
  `created_by` VARCHAR(24) DEFAULT null,
  `updated_by` VARCHAR(24) DEFAULT null,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `pricehistories` (
  `branch_product_id` JSON NOT NULL,
  `old_price` DECIMAL(12, 2) NOT NULL,
  `new_price` DECIMAL(12, 2) NOT NULL,
  `changed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `_id` VARCHAR(24) PRIMARY KEY
);

CREATE TABLE `pricewatches` (
  `user_id` JSON NOT NULL,
  `branch_product_id` JSON NOT NULL,
  `target_price` DECIMAL(12, 2) NOT NULL,
  `initial_price` DECIMAL(12, 2) NOT NULL,
  `current_price` DECIMAL(12, 2) NOT NULL,
  `notification_preference` VARCHAR(255) DEFAULT 'both',
  `status` VARCHAR(255) DEFAULT 'active',
  `last_notified_at` TIMESTAMP DEFAULT null,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `products` (
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) DEFAULT '',
  `short_code` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT '',
  `short_description` TEXT DEFAULT '',
  `eco_label` JSON DEFAULT NULL,
  `category_id` JSON DEFAULT NULL,
  `category_name` VARCHAR(255) DEFAULT '',
  `supplier_id` JSON DEFAULT NULL,
  `supplier_name` VARCHAR(255) DEFAULT '',
  `master_id` VARCHAR(255) DEFAULT '',
  `brand` VARCHAR(255) DEFAULT '',
  `origin` VARCHAR(255) DEFAULT '',
  `origin_country` VARCHAR(255) DEFAULT '',
  `origin_flag` VARCHAR(255) DEFAULT '',
  `unit` VARCHAR(255) DEFAULT 'cái',
  `weight` VARCHAR(255) DEFAULT '',
  `barcode` VARCHAR(255) DEFAULT '',
  `sku` VARCHAR(255) DEFAULT '',
  `price` DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  `original_price` DECIMAL(12, 2) DEFAULT 0,
  `import_price` DECIMAL(12, 2) DEFAULT 0,
  `discount_percent` DECIMAL(12, 2) DEFAULT 0,
  `images` JSON DEFAULT NULL,
  `gallery` JSON DEFAULT NULL,
  `ar_model_url` TEXT DEFAULT '',
  `thumbnail` VARCHAR(255) DEFAULT '',
  `tags` JSON DEFAULT NULL,
  `vat_included` BOOLEAN DEFAULT TRUE,
  `shipping_excluded` BOOLEAN DEFAULT FALSE,
  `is_active` BOOLEAN DEFAULT TRUE,
  `is_featured` BOOLEAN DEFAULT FALSE,
  `is_best_seller` BOOLEAN DEFAULT FALSE,
  `is_new` BOOLEAN DEFAULT FALSE,
  `rating` DECIMAL(3, 2) DEFAULT 0,
  `review_count` INT DEFAULT 0,
  `total_reviews` DECIMAL(12, 2) DEFAULT 0,
  `rating_breakdown` JSON DEFAULT NULL,
  `stock` INT DEFAULT 0,
  `sold_count` INT DEFAULT 0,
  `manufacture_date` TIMESTAMP DEFAULT null,
  `expiry_date` TIMESTAMP DEFAULT null,
  `expiry_warning_days` INT DEFAULT 7,
  `batch_code` VARCHAR(255) DEFAULT '',
  `is_expiring_soon` BOOLEAN DEFAULT FALSE,
  `is_expired` BOOLEAN DEFAULT FALSE,
  `highlights` JSON DEFAULT NULL,
  `product_details` JSON DEFAULT NULL,
  `specifications` JSON DEFAULT NULL,
  `nutrition_info` JSON DEFAULT NULL,
  `usage_guide` TEXT DEFAULT '',
  `storage_instructions` TEXT DEFAULT '',
  `storage_guide` TEXT DEFAULT '',
  `notes` TEXT DEFAULT '',
  `recipe_suggestions` JSON DEFAULT NULL,
  `related_product_ids` JSON DEFAULT NULL,
  `frequently_bought_together` JSON DEFAULT NULL,
  `created_by` JSON DEFAULT NULL,
  `qa_mode` VARCHAR(255) DEFAULT 'default',
  `is_deleted` BOOLEAN DEFAULT FALSE,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `productquestions` (
  `product_id` JSON NOT NULL,
  `user_id` JSON NOT NULL,
  `user_name` VARCHAR(255) DEFAULT 'Khach hang',
  `question` VARCHAR(255) NOT NULL,
  `status` VARCHAR(255) DEFAULT 'pending',
  `is_pinned` BOOLEAN DEFAULT FALSE,
  `is_official_answer` BOOLEAN DEFAULT FALSE,
  `answer` JSON DEFAULT NULL,
  `answer_source` VARCHAR(255) DEFAULT 'admin',
  `ai_model_used` VARCHAR(255) DEFAULT '',
  `ai_status` VARCHAR(255) DEFAULT 'pending',
  `confidence_score` DECIMAL(3, 2) DEFAULT 1,
  `reviewed_at` TIMESTAMP DEFAULT null,
  `reviewed_by` JSON DEFAULT NULL,
  `moderated_flag` BOOLEAN DEFAULT FALSE,
  `qa_mode` VARCHAR(255) DEFAULT 'ai',
  `ai_attempt_count` INT DEFAULT 0,
  `published_at` TIMESTAMP DEFAULT null,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `promotions` (
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT '',
  `type` VARCHAR(255) NOT NULL,
  `voucher_type` VARCHAR(255) DEFAULT 'product',
  `status` VARCHAR(255) DEFAULT 'active',
  `start_date` TIMESTAMP DEFAULT null,
  `end_date` TIMESTAMP DEFAULT null,
  `is_active` BOOLEAN DEFAULT TRUE,
  `priority` INT DEFAULT 0,
  `scope` VARCHAR(255) DEFAULT 'all',
  `target_product_ids` JSON DEFAULT NULL,
  `target_category_ids` JSON DEFAULT NULL,
  `target_branch_ids` JSON DEFAULT NULL,
  `is_auto_generated` BOOLEAN DEFAULT FALSE,
  `source` VARCHAR(255) DEFAULT 'manual',
  `suggested_by_system` BOOLEAN DEFAULT FALSE,
  `total_quantity` DECIMAL(12, 2) DEFAULT null,
  `remaining_quantity` INT DEFAULT null,
  `claimed_count` INT DEFAULT 0,
  `hide_after_expired_hours` INT DEFAULT 24,
  `auto_hide_after_expired` BOOLEAN DEFAULT TRUE,
  `notification_sent` BOOLEAN DEFAULT FALSE,
  `usage_limit` INT DEFAULT null,
  `max_redemptions` INT DEFAULT null,
  `usage_count` INT DEFAULT 0,
  `usage_per_user` INT DEFAULT 1,
  `min_order_amount` DECIMAL(12, 2) DEFAULT 0,
  `min_quantity` INT DEFAULT 0,
  `gift_quantity` INT DEFAULT 0,
  `discount_value` DECIMAL(12, 2) DEFAULT 0,
  `max_discount_amount` DECIMAL(12, 2) DEFAULT null,
  `gift_product_id` JSON DEFAULT NULL,
  `points_multiplier` INT DEFAULT 1,
  `badge_text` VARCHAR(255) DEFAULT '',
  `banner_image` TEXT DEFAULT '',
  `image` TEXT DEFAULT '',
  `banner_url` TEXT DEFAULT '',
  `claim_campaign` BOOLEAN DEFAULT FALSE,
  `stackable` BOOLEAN DEFAULT FALSE,
  `excluded_product_ids` JSON DEFAULT NULL,
  `excluded_category_ids` JSON DEFAULT NULL,
  `created_by` VARCHAR(24) DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `promotionclaims` (
  `promotion_id` JSON NOT NULL,
  `user_id` JSON NOT NULL,
  `branch_id` JSON DEFAULT NULL,
  `claimed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(255) DEFAULT 'claimed',
  `used_order_id` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `promotionusages` (
  `promotion_id` JSON NOT NULL,
  `user_id` JSON DEFAULT NULL,
  `order_id` JSON NOT NULL,
  `discount_amount` DECIMAL(12, 2) DEFAULT 0,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `recipes` (
  `title` VARCHAR(255) NOT NULL,
  `normalized_name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT '',
  `ingredients` JSON DEFAULT NULL,
  `steps` JSON DEFAULT NULL,
  `prep_time` VARCHAR(255) DEFAULT '',
  `cook_time` VARCHAR(255) DEFAULT '',
  `servings` INT DEFAULT 2,
  `difficulty` VARCHAR(255) DEFAULT 'Trung bình',
  `tips` JSON DEFAULT NULL,
  `notes` JSON DEFAULT NULL,
  `tags` JSON DEFAULT NULL,
  `image_url` TEXT DEFAULT '',
  `source_type` VARCHAR(255) DEFAULT 'ai_generated',
  `ai_generated` BOOLEAN DEFAULT FALSE,
  `created_by` VARCHAR(24) DEFAULT NULL,
  `status` VARCHAR(255) DEFAULT 'active',
  `access_count` INT DEFAULT 0,
  `last_accessed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `canonical_key` TEXT DEFAULT NULL,
  `aliases` JSON DEFAULT NULL,
  `completeness_status` VARCHAR(255) DEFAULT 'complete',
  `last_checked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `source_product_ids` JSON DEFAULT NULL,
  `nutrition` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `createdAt` TIMESTAMP DEFAULT NULL,
  `updatedAt` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `returnrequests` (
  `user_id` JSON NOT NULL,
  `order_id` JSON NOT NULL,
  `branch_id` JSON DEFAULT NULL,
  `status` VARCHAR(255) DEFAULT 'pending',
  `reason` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT '',
  `refund_method` VARCHAR(255) DEFAULT 'original_payment',
  `contact_phone` VARCHAR(255) DEFAULT '',
  `amount_requested` DECIMAL(12, 2) DEFAULT 0,
  `evidence_images` JSON DEFAULT '[]',
  `items` JSON DEFAULT NULL,
  `admin_note` TEXT DEFAULT '',
  `resolved_by` JSON DEFAULT NULL,
  `resolved_at` TIMESTAMP DEFAULT null,
  `is_returned_to_stock` BOOLEAN DEFAULT FALSE,
  `is_refunded` BOOLEAN DEFAULT FALSE,
  `timeline` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `reviews` (
  `user_id` JSON NOT NULL,
  `user_name` VARCHAR(255) DEFAULT '',
  `user_avatar` TEXT DEFAULT null,
  `product_id` JSON NOT NULL,
  `product_name` VARCHAR(255) DEFAULT '',
  `branch_id` JSON DEFAULT NULL,
  `branch_name` VARCHAR(255) DEFAULT '',
  `order_id` JSON DEFAULT NULL,
  `rating` DECIMAL(3, 2) NOT NULL,
  `title` VARCHAR(255) DEFAULT '',
  `content` TEXT DEFAULT '',
  `images` JSON DEFAULT NULL,
  `status` VARCHAR(255) DEFAULT 'pending',
  `is_verified_purchase` BOOLEAN DEFAULT FALSE,
  `helpful_count` INT DEFAULT 0,
  `reported_count` INT DEFAULT 0,
  `is_featured` BOOLEAN DEFAULT FALSE,
  `is_hidden` BOOLEAN DEFAULT FALSE,
  `is_deleted` BOOLEAN DEFAULT FALSE,
  `admin_notes` TEXT DEFAULT '',
  `moderation_reason` VARCHAR(255) DEFAULT '',
  `reply` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `roles` (
  `key` TEXT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT '',
  `role_id` INT DEFAULT null,
  `level` INT DEFAULT 99,
  `permissions` JSON DEFAULT '[]',
  `is_system` BOOLEAN DEFAULT FALSE,
  `is_active` BOOLEAN DEFAULT TRUE,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `stockmovements` (
  `branch_id` JSON NOT NULL,
  `branch_name` VARCHAR(255) DEFAULT '',
  `product_id` JSON NOT NULL,
  `product_name` VARCHAR(255) DEFAULT '',
  `branch_product_id` JSON NOT NULL,
  `batch_code` VARCHAR(255) DEFAULT '',
  `movement_type` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL,
  `before_stock` INT NOT NULL,
  `after_stock` INT NOT NULL,
  `reference_type` VARCHAR(255) DEFAULT 'manual',
  `reference_id` JSON DEFAULT NULL,
  `created_by` JSON DEFAULT NULL,
  `note` TEXT DEFAULT '',
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `suppliers` (
  `code` VARCHAR(255) DEFAULT '',
  `name` VARCHAR(255) NOT NULL,
  `contact_name` VARCHAR(255) DEFAULT '',
  `email` VARCHAR(255) DEFAULT '',
  `phone` VARCHAR(255) DEFAULT '',
  `address` VARCHAR(255) DEFAULT '',
  `tax_code` VARCHAR(255) DEFAULT '',
  `payment_terms` VARCHAR(255) DEFAULT '',
  `note` TEXT DEFAULT '',
  `total_debt` DECIMAL(12, 2) DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `supporttickets` (
  `ticket_code` VARCHAR(255) DEFAULT NULL,
  `user_id` JSON NOT NULL,
  `user_name` VARCHAR(255) DEFAULT '',
  `user_email` VARCHAR(255) DEFAULT '',
  `user_avatar` TEXT DEFAULT null,
  `branch_id` JSON DEFAULT NULL,
  `branch_name` VARCHAR(255) DEFAULT '',
  `order_id` JSON DEFAULT NULL,
  `category` VARCHAR(255) DEFAULT 'general',
  `priority` VARCHAR(255) DEFAULT 'medium',
  `status` VARCHAR(255) DEFAULT 'open',
  `subject` VARCHAR(255) NOT NULL,
  `message` VARCHAR(255) DEFAULT '',
  `attachments` JSON DEFAULT NULL,
  `thread` JSON DEFAULT NULL,
  `messages` JSON DEFAULT NULL,
  `internal_notes` JSON DEFAULT NULL,
  `assigned_agent_id` JSON DEFAULT NULL,
  `assigned_agent_name` VARCHAR(255) DEFAULT '',
  `assigned_to` JSON DEFAULT NULL,
  `sla_due_at` TIMESTAMP DEFAULT null,
  `first_response_at` TIMESTAMP DEFAULT null,
  `resolved_at` TIMESTAMP DEFAULT null,
  `closed_at` TIMESTAMP DEFAULT null,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `users` (
  `username` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) DEFAULT '',
  `email` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(255) DEFAULT '',
  `password_hash` VARCHAR(255) DEFAULT null,
  `avatar` TEXT DEFAULT null,
  `role_id` INT DEFAULT 3,
  `role_key` TEXT DEFAULT null,
  `permissions` JSON DEFAULT '[]',
  `branch_id` JSON DEFAULT NULL,
  `lotte_points` INT DEFAULT 0,
  `membership_level` VARCHAR(255) DEFAULT 'Đồng',
  `signup_method` VARCHAR(255) DEFAULT 'email',
  `login_provider` VARCHAR(255) DEFAULT 'local',
  `authProviders` JSON DEFAULT '[]',
  `googleId` VARCHAR(255) DEFAULT null,
  `facebookId` VARCHAR(255) DEFAULT null,
  `facebook_id` VARCHAR(255) DEFAULT null,
  `social_providers` JSON DEFAULT NULL,
  `social_links` JSON DEFAULT NULL,
  `status` VARCHAR(255) DEFAULT 'ACTIVE',
  `is_active` BOOLEAN DEFAULT TRUE,
  `profile_completed` BOOLEAN DEFAULT FALSE,
  `wallet_balance` DECIMAL(12, 2) DEFAULT 0,
  `default_payment_method` JSON DEFAULT NULL,
  `email_verified` BOOLEAN DEFAULT FALSE,
  `email_verification_code` VARCHAR(255) DEFAULT null,
  `email_verification_expires_at` TIMESTAMP DEFAULT null,
  `email_verification_attempts` INT DEFAULT 0,
  `email_otp_last_sent_at` TIMESTAMP DEFAULT null,
  `dob` VARCHAR(255) DEFAULT null,
  `gender` VARCHAR(255) DEFAULT null,
  `address` VARCHAR(255) DEFAULT null,
  `bio` TEXT DEFAULT null,
  `note` TEXT DEFAULT '',
  `tags` JSON DEFAULT NULL,
  `preferences` JSON DEFAULT NULL,
  `password_changed_at` TIMESTAMP DEFAULT null,
  `security` JSON DEFAULT NULL,
  `settings` JSON DEFAULT NULL,
  `gamification_lock` JSON DEFAULT NULL,
  `last_login_at` TIMESTAMP DEFAULT null,
  `refresh_token` VARCHAR(255) DEFAULT null,
  `is_deleted` BOOLEAN DEFAULT FALSE,
  `force_password_change` BOOLEAN DEFAULT FALSE,
  `employee_info` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

CREATE TABLE `wishlistitems` (
  `user_id` JSON NOT NULL,
  `product_id` JSON DEFAULT NULL,
  `branch_product_id` JSON DEFAULT NULL,
  `_id` VARCHAR(24) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT NULL
);

-- Foreign Key Constraints
ALTER TABLE `carts` ADD CONSTRAINT `fk_carts_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`_id`);
ALTER TABLE `coupons` ADD CONSTRAINT `fk_coupons_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`_id`);
ALTER TABLE `event_posts` ADD CONSTRAINT `fk_event_posts_liked_by` FOREIGN KEY (`liked_by`) REFERENCES `users`(`_id`);
ALTER TABLE `event_posts` ADD CONSTRAINT `fk_event_posts_promotion_id` FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`_id`);
ALTER TABLE `eventcomments` ADD CONSTRAINT `fk_eventcomments_liked_by` FOREIGN KEY (`liked_by`) REFERENCES `users`(`_id`);
ALTER TABLE `banners` ADD CONSTRAINT `fk_banners_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`_id`);
ALTER TABLE `hotdeals` ADD CONSTRAINT `fk_hotdeals_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`_id`);
ALTER TABLE `gamificationcampaigns` ADD CONSTRAINT `fk_gamificationcampaigns_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`_id`);
ALTER TABLE `importorders` ADD CONSTRAINT `fk_importorders_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`_id`);
ALTER TABLE `importreceipts` ADD CONSTRAINT `fk_importreceipts_import_order_id` FOREIGN KEY (`import_order_id`) REFERENCES `importorders`(`_id`);
ALTER TABLE `importreceipts` ADD CONSTRAINT `fk_importreceipts_supplier_id` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`_id`);
ALTER TABLE `popupads` ADD CONSTRAINT `fk_popupads_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`_id`);
ALTER TABLE `popupads` ADD CONSTRAINT `fk_popupads_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users`(`_id`);
ALTER TABLE `promotions` ADD CONSTRAINT `fk_promotions_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`_id`);
ALTER TABLE `recipes` ADD CONSTRAINT `fk_recipes_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`_id`);
