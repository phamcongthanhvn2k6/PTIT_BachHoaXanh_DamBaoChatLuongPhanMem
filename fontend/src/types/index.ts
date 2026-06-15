export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions?: string[];
  is_active?: boolean;
  created_at?: string;
}

export interface User {
  id: number | string;
  _id?: string;
  username: string;
  full_name?: string;
  email?: string | null;
  password?: string;
  password_hash?: string | null;
  phone?: string;
  avatar: string | null;
  role_id: number;
  branch_id: string | number | null;
  lotte_points: number;
  membership_level: string;
  signup_method?: string;
  login_provider?: 'local' | 'google' | 'facebook' | 'phone';
  auth_provider?: 'LOCAL' | 'GOOGLE' | 'FACEBOOK' | 'PHONE' | 'LOCAL_GOOGLE_LINKED' | 'LOCAL_FACEBOOK_LINKED';
  has_password?: boolean;
  password_changed_at?: string;
  email_verified?: boolean;
  provider?: string;
  googleId?: string | null;
  facebookId?: string | null;
  is_active?: boolean;
  status?: string;
  dob?: string;
  gender?: string;
  address?: string;
  bio?: string;
  note?: string;
  tags?: string[];
  profile_completed?: boolean;
  default_payment_method?: { type: string; last4: string; brand: string; card_id: string };
  wallet_balance?: number;
  social_links?: { facebook: string | null; google: string | null };
  social_providers?: Array<{ provider: string; provider_user_id: string }>;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
  preferences?: {
    newsletter?: boolean;
    sms_alerts?: boolean;
    language?: string;
    receive_promotions?: boolean;
    eco_prefer?: boolean;
    favorite_categories?: number[];
    preferred_store?: number;
    notification_email_promo?: boolean;
    notification_sms_order?: boolean;
    notification_push_order?: boolean;
    notification_promo?: boolean;
    notification_system?: boolean;
  };
  security?: {
    two_factor_enabled?: boolean;
    two_factor_method?: 'EMAIL' | 'TOTP' | null;
    last_login_device?: string;
    last_login_ip?: string;
    last_login_at?: string;
  };
  settings?: {
    language?: string;
    dark_mode?: boolean;
    privacy_profile_visible?: boolean;
    marketing_opt_in?: boolean;
    sms_opt_in?: boolean;
  };
  gamification_lock?: {
    is_locked?: boolean;
    scope?: 'spin' | 'checkin' | 'all' | string;
    reason?: string;
    expires_at?: string | null;
  };
}

export interface AuthToken {
  id: number;
  user_id: number;
  access_token: string;
  refresh_token: string;
  device: string;
  expires_at: string;
  created_at: string;
}

export interface OtpLog {
  id: number;
  target: string;
  otp: string;
  type: string;
  expires_at: string;
  status: string;
  created_at: string;
}

export interface NotificationSubscription {
  id: number;
  user_id: number;
  provider: string;
  device_token: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  icon: string | null;
  image: string | null;
  banner: string | null;
  description: string;
  display_order: number;
  sort_order?: number;
  is_active: boolean;
  product_count: number;
  created_by?: number | string;
}

export interface Product {
  id: number;
  _id?: string;
  name: string;
  slug: string;
  category_id: number;
  sku: string;
  brand: string;
  origin?: string;
  origin_country?: string;
  origin_flag?: string;
  short_description: string;
  description: string;
  eco_label?: boolean | string;
  images: string[];
  gallery?: string[];
  ar_model_url?: string;
  thumbnail?: string;
  unit: string;
  weight: string;
  dimensions: string;
  barcode: string;
  tags: string[];
  price?: number;
  original_price?: number;
  discount_percent?: number;
  import_price?: number;
  vat_included?: boolean;
  shipping_excluded?: boolean;
  average_rating: number;
  rating?: number;
  total_reviews?: number;
  review_count?: number;
  sold_count?: number;
  specifications: Array<{ label: string; value: string }> | Record<string, string>;
  highlights?: string[];
  product_details?: string[];
  usage_guide?: string;
  nutrition_info?: Record<string, any> | null;
  storage_guide?: string;
  storage_instructions?: string;
  notes?: string;
  recipe_suggestions?: string[];
  rating_breakdown?: Record<string, number>;
  related_product_ids?: Array<number | string>;
  frequently_bought_together?: Array<number | string>;
  created_by?: number | string;
  is_active: boolean;
  master_id?: string;
  category_name?: string;
  supplier_name?: string;
  manufacture_date?: string;
  expiry_date?: string;
  batch_code?: string;
  is_expiring_soon?: boolean;
  is_expired?: boolean;
  categoryShop?: string;
  image?: string;
  isOutOfStock?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: number;
  product_id: number;
  url: string;
  is_primary: boolean;
  is_360: boolean;
  sort_order: number;
}

export interface ARModel {
  id: number;
  product_id: number;
  url: string;
  format: string;
}

export interface Branch {
  id: string | number;
  _id?: string;
  code?: string;
  name: string;
  address: string;
  city: string;
  district?: string;
  ward?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  phone: string;
  manager?: string;
  operating_hours?: string;
  opening_hours?: string;
  manager_user_id?: number | null;
  branch_product_ids?: (string | number)[];
  is_active?: boolean;
  coverage_radius_km?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BranchProduct {
  id: string | number;
  branch_id: string | number;
  product_id: number;
  price: number;
  original_price: number;
  discount_percent: number;
  stock: number;
  sold_count?: number;
  max_purchase_limit: number | null;
  status: string;
  last_updated: string;
  created_at?: string;
  is_featured?: boolean;
  is_best_seller?: boolean;
  is_new?: boolean;
  is_active?: boolean;
  product?: Product;
  master_id?: string;
  sku?: string;
  category_name?: string;
  supplier_name?: string;
  manufacture_date?: string;
  expiry_date?: string;
  batch_code?: string;
  import_price?: number;
  is_expiring_soon?: boolean;
  is_expired?: boolean;
  categoryShop?: string;
  image?: string;
  isOutOfStock?: boolean;
}

export interface InventoryTransaction {
  id: number;
  branch_product_id: string;
  quantity: number;
  transaction_type: string;
  reference_id: string;
  note: string;
  created_at: string;
  created_by: number;
}

export interface DeliverySlot {
  id: number;
  branch_id: string;
  date: string;
  time_start: string;
  time_end: string;
  capacity: number;
  booked: number;
  is_available: boolean;
}

export interface UserAddress {
  id: number;
  user_id: number;
  name: string;
  phone: string;
  city: string;
  district: string;
  ward: string;
  street: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Wishlist {
  id: number;
  user_id: number;
  branch_product_id: string;
  created_at: string;
}

export interface ProductQuestion {
  id: number;
  product_id: number;
  user_id: number;
  question: string;
  answer: string;
  status: string;
  answered_by?: number | null;
  created_at: string;
  answered_at: string | null;
}

export interface SearchHistory {
  id: number;
  user_id: number;
  keyword: string;
  search_count: number;
  last_searched: string;
}

export interface CartItem {
  branch_product_id: string; // Used as the unique identifier for cart item
  quantity: number;
  price: number;
  unit_price: number;
  product_name?: string;
  product_image?: string;
  branchProduct?: BranchProduct; // Populated from server
}

export interface Cart {
  id: string;
  user_id: number;
  branch_id?: string;
  items?: CartItem[];
  itemsByBranch: { [branchId: string]: CartItem[] };
  updated_at: string;
}

export interface Promotion {
  id: string | number;
  _id?: string;
  title: string;
  description: string;
  type?: 'percent' | 'fixed_amount' | 'bogo' | 'free_shipping' | 'points_multiplier' | 'gift_item' | 'flash_deal';
  discount_type?: string;
  discount_value?: number;
  value?: number; // legacy
  status?: 'draft' | 'active' | 'scheduled' | 'expired' | 'paused';
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  priority?: number;
  scope?: 'all' | 'product' | 'category' | 'branch';
  target_product_ids?: Array<string | number>;
  target_category_ids?: Array<string | number>;
  target_branch_ids?: Array<string | number>;
  excluded_product_ids?: Array<string | number>;
  excluded_category_ids?: Array<string | number>;
  
  is_auto_generated?: boolean;
  source?: 'manual' | 'expiry_alert' | 'admin_tool';
  suggested_by_system?: boolean;
  
  total_quantity?: number | null;
  remaining_quantity?: number | null;
  claimed_count?: number;
  
  hide_after_expired_hours?: number;
  auto_hide_after_expired?: boolean;
  notification_sent?: boolean;
  
  usage_limit?: number | null;
  max_redemptions?: number | null;
  usage_count?: number;
  usage_per_user?: number;
  min_order_amount?: number;
  min_quantity?: number;
  gift_quantity?: number;
  max_discount_amount?: number | null;
  gift_product_id?: string | number | null;
  points_multiplier?: number;
  
  badge_text?: string;
  badge?: string;
  banner_image?: string;
  image?: string;
  image_url?: string;
  banner_url?: string;
  claim_campaign?: boolean;
  stackable?: boolean;

  // Legacy frontend mappings
  branch_id?: string | null;
  applicable_branch_product_ids?: number[];
  sold_count?: number;
  original_price?: number | null;
  category?: string;
  thumbs?: string[];
  is_sold_out?: boolean;
  is_expired?: boolean;
  expired_grace_until?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Coupon {
  id: string | number;
  _id?: string;
  code: string;
  title?: string;
  description: string;
  image?: string;
  banner_image?: string;
  discount_type?: string;
  type?: 'percent' | 'fixed_amount' | 'free_shipping' | 'points';
  discount_value: number;
  min_order_value?: number;
  min_order_amount?: number;
  min_quantity?: number;
  max_discount_value?: number;
  max_discount_amount?: number | null;
  total_quantity?: number | null;
  remaining_quantity?: number | null;
  claimed_count?: number;
  hide_after_expired_hours?: number;
  auto_hide_after_expired?: boolean;
  start_date?: string;
  end_date?: string;
  usage_limit?: number | null;
  usage_per_user?: number;
  used_count?: number;
  is_active?: boolean;
  status?: 'draft' | 'active' | 'scheduled' | 'expired' | 'paused';
  claim_campaign?: boolean;
  badge_text?: string;
  scope?: 'all' | 'product' | 'category' | 'branch';
  eligible_branch_ids?: string[];
  target_product_ids?: Array<string | number>;
  target_category_ids?: Array<string | number>;
  target_branch_ids?: Array<string | number>;
  excluded_product_ids?: Array<string | number>;
  excluded_category_ids?: Array<string | number>;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  is_sold_out?: boolean;
  is_expired?: boolean;
  expired_grace_until?: string | null;
}

export interface Event {
  id: number;
  title: string;
  image: string;
  description: string;
  start_date: string;
  end_date: string;
  type: string;
  applicable_branch_ids: string[];
}

export interface EventCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface EventPost {
  id: number;
  category_id: number;
  title: string;
  slug: string;
  thumbnail: string;
  excerpt: string;
  author: string;
  views: number;
  status: string;
  published_at: string;
}

export interface EventPostDetail {
  post_id: number;
  content_blocks: Array<{
    type: string;
    content?: string;
    url?: string;
    caption?: string;
    level?: number;
    items?: string[];
    author?: string;
  }>;
  read_time?: number;
  updated_at?: string;
}

export interface OrderItem {
  branch_product_id: string;
  product_id?: string;
  quantity: number;
  price: number;
  final_price?: number;
  discount_amount?: number;
  is_gift?: boolean;
  product_name: string;
  product_image: string;
  sku?: string;
  category_name?: string;
  supplier_name?: string;
  expiry_date?: string;
  discount_applied?: number;
  purchased_price?: number;
  original_price_at_purchase?: number;
  discount_percent_at_purchase?: number;
  pricing_source_at_purchase?: string;
}

export interface Order {
  id: string;
  user_id: number | string;
  user?: any;
  branch_id: string;
  branch_name?: string;
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  total_amount: number;
  points_earned?: number;
  status: string;
  payment_method: string;
  payment_status: string;
  shipping_method: string;
  note: string;
  items: OrderItem[];
  pricing_breakdown?: {
    subtotal?: number;
    item_discounts?: number;
    promotion_discount?: number;
    coupon_discount?: number;
    shipping_fee?: number;
    free_shipping_applied?: boolean;
    points_earned?: number;
    final_total?: number;
  };
  applied_promotions?: Array<{
    promotion_id: string;
    title: string;
    type?: string;
    discount_amount?: number;
  }>;
  applied_coupon?: {
    code?: string;
    discount_amount?: number;
    type?: string;
  };
  tracking?: {
    courier?: string;
    carrier?: string;
    tracking_number?: string;
    dispatch_branch?: string;
    dispatch_branch_name?: string;
    history?: Array<{
      status: string;
      note?: string;
      timestamp: string;
      location?: string;
    }>;
  };
  order_address?: {
    receiver_name: string;
    phone: string;
    full_address: string;
    city?: string;
    district?: string;
    ward?: string;
    street?: string;
    note?: string;
    lat?: number;
    lng?: number;
  };
  payment?: {
    method: string;
    transaction_id?: string;
    status: string;
  };
  vat_percent?: number;
  vat_amount?: number;
  customer_note?: string;
  admin_note?: string;
  staff_note?: string;
  cancel_reason?: string;
  refund_status?: string;
  refund_reason?: string;
  invoice_number?: string;
  applied_coupon_code?: string;
  delivery_type?: string;
  shipping_provider?: string;
  tracking_number?: string;
  updated_by?: number;
  timeline?: Array<{
    status: string;
    note?: string;
    timestamp: string;
    location?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface OrderAddress {
  order_id: string;
  receiver_name: string;
  phone: string;
  address: string;
}

export interface PaymentTransaction {
  id: string;
  transaction_id?: string;
  order_id: string;
  provider: string;
  amount: number;
  status: string;
  created_at: string;
  completed_at: string;
}

export interface PurchaseHistory {
  id: string;
  user_id: number;
  order_id: string;
  branch_product_id: string;
  price: number;
  quantity: number;
  total_amount: number;
  created_at: string;
}

export interface ReviewReply {
  id: string;
  user_id: number;
  text: string;
  created_at: string;
}

export interface Review {
  id: number | string;
  _id?: string | number;
  user_id: number | string;
  product_id: number | string;
  branch_product_id?: string | number;
  rating: number;
  content?: string;
  comment?: string;
  user_name?: string;
  avatar?: string;
  user_avatar?: string;
  images?: string[];
  likes?: number;
  status?: string;
  replies?: ReviewReply[];
  reply?: {
    content?: string;
    admin_name?: string;
    replied_at?: string;
  };
  created_at: string;
}

export interface Comment {
  id: number;
  user_id: number;
  branch_product_id: string;
  content: string;
  parent_id: number | null;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  _id?: string;
  ticket_code?: string;
  user_id: number | string;
  subject: string;
  status: string;
  priority?: string;
  category?: string;
  order_id?: string | number | null;
  attachments?: string[];
  thread?: any[];
  assigned_to?: number | null;
  assigned_agent_id?: number | string | null;
  assigned_agent_name?: string;
  closed_at?: string | null;
  internal_note?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number | string;
  _id?: string | number;
  ticket_id: string;
  sender_type: string;
  sender?: string;
  sender_name?: string;
  sender_id: number | string;
  content: string;
  attachments?: string[];
  created_at: string;
}

export interface Notification {
  id: number | string;
  user_id: number | string;
  title: string;
  message: string;
  type?: string;
  icon?: string;
  link?: string;
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, any>;
  sent_by?: number | null;
  read_at?: string | null;
  created_at: string;
}

export interface RecommendationLog {
  id: number;
  user_id: number;
  product_id: number;
  score: number;
  source: string;
  created_at: string;
}

export interface HotDeal {
  id: string | number;
  branch_id?: string;
  branch_product_id?: number;
  title?: string;
  discount_percent?: number;
  valid_until?: string;
  end_time?: string;
  limit_quantity?: number;
  sold_quantity?: number;
  image_url?: string;
  price?: number;
  original_price?: number;
}

export interface FeaturedCollection {
  id: number;
  name: string;
  banner: string;
  branch_product_ids: string[];
}

export interface PromoBanner {
  id: number;
  title: string;
  description: string;
  image: string;
  link: string;
  bg_color: string;
  starts_at: string;
  ends_at: string;
}

export interface HomeBanner {
  id: number;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  bg_color: string;
  bg_image: string;
}

export interface HomeSection {
  type: string;
  title: string;
  action_text: string;
  action_link: string;
  items?: string[] | number[]; // branch_product_ids or post_ids
}

export interface ProductPolicy {
  id: number;
  icon: string;
  title: string;
  description: string;
}

export interface LoyaltyTransaction {
  id: number | string;
  user_id: number;
  points: number;
  type: string;
  source: string;
  reference_id: string;
  description?: string;
  created_by?: number | null;
  created_at: string;
}

export interface EventComment {
  id: number | string;
  post_id: number;
  user_id: number;
  content: string;
  likes: number;
  status?: string;
  user_name?: string;
  user_avatar?: string;
  created_at: string;
}

export interface EventTag {
  id: number;
  name: string;
  slug: string;
}

export interface FeaturedEvent {
  id: number;
  post_id: number;
  priority: number;
  layout: string;
}

export interface FilterSchema {
  price_ranges: Array<{ min: number; max: number; label: string }>;
  brands: string[];
  ratings: number[];
}

export interface PaymentMethod {
  id: string;
  user_id: number;
  type: string;
  last4: string;
  brand: string;
  expiry?: string;
  holder_name?: string;
  phone?: string;
  is_default: boolean;
}

export interface CouponUsage {
  id: string;
  user_id: number;
  coupon_id: string | number;
  order_id?: string | number | null;
  discount_applied?: number;
  used_at: string;
}

// ═══════════════════════════════════════════════
// NEW TYPES FOR ADMIN SYSTEM
// ═══════════════════════════════════════════════


export interface MembershipTier {
  id: number;
  name: string;
  slug: string;
  min_points: number;
  max_points: number | null;
  color: string;
  discount_percent: number;
  benefits: string[];
  badge_icon: string;
  is_active: boolean;
}

export interface LoyaltyRule {
  id: number;
  action_type: string;
  points_per_unit: number;
  unit: string;
  description: string;
  min_order: number;
  is_active: boolean;
  created_at: string;
}

export interface NotificationTemplate {
  id: number;
  name: string;
  title_template: string;
  body_template: string;
  type: string;
  is_active: boolean;
}

export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: string | number;
  description: string;
  old_data: string | null;
  new_data: string | null;
  ip?: string;
  device?: string;
  branch_id?: number | null;
  created_at: string;
}

export interface AdminSetting {
  id?: number | string;
  key: string;
  value: any;
  updated_at?: string;
}

export interface Supplier {
  id?: string | number;
  _id?: string;
  code?: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_code?: string;
  payment_terms?: string;
  note?: string;
  total_debt?: number;
  is_active?: boolean;
}

export interface InventoryBatch {
  id?: string | number;
  _id?: string;
  product_id: string | number;
  branch_product_id: string | number;
  branch_id?: string | number;
  batch_code: string;
  supplier_id?: string | number;
  supplier_name?: string;
  quantity: number;
  initial_quantity?: number;
  import_price: number;
  expiry_date?: string;
  manufacture_date?: string;
  is_active?: boolean;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ImportOrderItem {
  id?: string | number;
  _id?: string;
  product_id: string | number;
  branch_product_id?: string | number;
  sku?: string;
  product_name?: string;
  quantity_ordered: number;
  quantity_received?: number;
  unit_cost: number;
  subtotal?: number;
  batch_code?: string;
  expiry_date?: string;
  note?: string;
}

export interface ImportOrder {
  id?: string | number;
  _id?: string;
  order_code: string;
  supplier_id: string | number;
  supplier?: Supplier;
  branch_id: string | number;
  status: 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
  expected_date?: string;
  ordered_date?: string;
  received_date?: string;
  items: ImportOrderItem[];
  total_amount?: number;
  total_received_amount?: number;
  note?: string;
  created_by?: string | number;
  created_at?: string;
  updated_at?: string;
}

export interface ImportReceiptItem {
  id?: string | number;
  _id?: string;
  import_order_item_id?: string | number;
  product_id: string | number;
  branch_product_id: string | number;
  product_name?: string;
  quantity_received: number;
  unit_cost: number;
  subtotal?: number;
  batch_code?: string;
  expiry_date?: string;
  note?: string;
}

export interface ImportReceipt {
  id?: string | number;
  _id?: string;
  receipt_code: string;
  import_order_id: string | number;
  importOrder?: ImportOrder;
  supplier_id: string | number;
  supplier?: Supplier;
  branch_id: string | number;
  received_date?: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  items: ImportReceiptItem[];
  total_amount?: number;
  note?: string;
  created_by?: string | number;
  created_at?: string;
  updated_at?: string;
}

export interface StockMovement {
  id?: string | number;
  _id?: string;
  branch_id: string | number;
  branch_name?: string;
  product_id: string | number;
  product_name?: string;
  branch_product_id: string | number;
  batch_code?: string;
  movement_type: 'inbound' | 'outbound' | 'sale' | 'adjustment' | 'transfer' | 'return' | 'cancel' | 'restock';
  quantity: number;
  before_stock: number;
  after_stock: number;
  reference_type?: string;
  reference_id?: string | number;
  created_by?: string | number;
  note?: string;
  created_at?: string;
  updated_at?: string;
}
