export const endpoints = {
  // ═══════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    google: '/auth/google',
    facebook: '/auth/facebook',
    facebookCallback: '/auth/facebook/callback',
    otpSend: '/auth/otp/send',
    otpVerify: '/auth/otp/verify',
    emailRequestOtp: '/auth/email/request-otp',
    emailResendOtp: '/auth/email/resend-otp',
    emailVerifyOtp: '/auth/email/verify-otp',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    profile: '/auth/profile',
    updateProfile: '/auth/profile',
    changePassword: '/auth/change-password',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verify: '/auth/verify',
    logoutAll: '/auth/logout-all',
    profileSummary: '/auth/profile/summary',
  },
  adminAuth: {
    login: '/admin/auth/login',
    verify: '/admin/auth/verify',
  },

  // ═══════════════════════════════════════════════
  // USERS / CUSTOMERS
  // ═══════════════════════════════════════════════
  users: {
    list: '/users',
    me: '/users/me',
    detail: (id: string | number) => `/users/${id}`,
    update: (id: string | number) => `/users/${id}`,
    toggleStatus: (id: string | number) => `/users/${id}/toggle-status`,
    resetPassword: (id: string | number) => `/users/${id}/reset-password`,
    adjustPoints: (id: string | number) => `/users/${id}/adjust-points`,
    updateMembership: (id: string | number) => `/users/${id}/membership`,
    settings: (id: string | number) => `/users/${id}/settings`,
    addresses: (id: string | number) => `/users/${id}/addresses`,
    reviews: (id: string | number) => `/users/${id}/reviews`,
    wishlist: (id: string | number) => `/users/${id}/wishlist`,
    tickets: (id: string | number) => `/users/${id}/tickets`,
    couponUsage: (id: string | number) => `/users/${id}/coupon-usage`,
    loyaltyTransactions: (id: string | number) => `/users/${id}/loyalty-transactions`,
    loginHistory: (id: string | number) => `/users/${id}/login-history`,
  },

  // ═══════════════════════════════════════════════
  // PRODUCTS
  // ═══════════════════════════════════════════════
  products: {
    list: '/products',
    detail: (id: string | number) => `/products/${id}`,
    compare: '/products/compare',
    create: '/products',
    update: (id: string | number) => `/products/${id}`,
    delete: (id: string | number) => `/products/${id}`,
    search: '/products/search',
    related: (id: string | number) => `/products/${id}/related`,
    recommendations: (id: string | number) => `/products/${id}/recommendations`,
    questions: (id: string | number) => `/products/${id}/questions`,
    askQuestion: (id: string | number) => `/products/${id}/questions`,
    replyQuestion: (id: string | number, questionId: string | number) => `/products/${id}/questions/${questionId}/reply`,
    promotions: (id: string | number) => `/products/${id}/promotions`,
    coupons: (id: string | number) => `/products/${id}/coupons`,
    policies: '/products/policies',
    summary: (id: string | number) => `/products/${id}/summary`,
  },

  compare: {
    summary: '/compare/summary',
    summaryStatus: '/compare/summary/status',
  },

  // ═══════════════════════════════════════════════
  // BRANCH PRODUCTS / INVENTORY
  // ═══════════════════════════════════════════════
  branchProducts: {
    list: '/branch-products',
    detail: (id: string | number) => `/branch-products/${id}`,
    create: '/branch-products',
    update: (id: string | number) => `/branch-products/${id}`,
    delete: (id: string | number) => `/branch-products/${id}`,
    adjustStock: (id: string | number) => `/branch-products/${id}/adjust-stock`,
  },

  // ═══════════════════════════════════════════════
  // INVENTORY BATCHES & ALERTS
  // ═══════════════════════════════════════════════
  inventoryBatches: {
    list: '/inventory-batches',
    detail: (id: string | number) => `/inventory-batches/${id}`,
    create: '/inventory-batches',
    update: (id: string | number) => `/inventory-batches/${id}`,
    alertsLowStock: '/inventory-batches/alerts/low-stock',
    alertsExpiring: '/inventory-batches/alerts/expiring',
    draftPromotion: '/inventory-batches/draft-promotion',
  },

  suppliers: {
    list: '/suppliers',
    detail: (id: string | number) => `/suppliers/${id}`,
    create: '/suppliers',
    update: (id: string | number) => `/suppliers/${id}`,
    delete: (id: string | number) => `/suppliers/${id}`,
  },

  importOrders: {
    list: '/import-orders',
    detail: (id: string | number) => `/import-orders/${id}`,
    create: '/import-orders',
    update: (id: string | number) => `/import-orders/${id}`,
    updateStatus: (id: string | number) => `/import-orders/${id}/status`,
  },

  importReceipts: {
    list: '/import-receipts',
    detail: (id: string | number) => `/import-receipts/${id}`,
    create: '/import-receipts',
    update: (id: string | number) => `/import-receipts/${id}`,
  },

  stockMovements: {
    list: '/stock-movements',
    detail: (id: string | number) => `/stock-movements/${id}`,
    summary: '/stock-movements/summary',
  },

  permissions: {
    list: '/permissions',
  },

  // ═══════════════════════════════════════════════
  // CATEGORIES
  // ═══════════════════════════════════════════════
  categories: {
    list: '/categories',
    detail: (id: string | number) => `/categories/${id}`,
    create: '/categories',
    update: (id: string | number) => `/categories/${id}`,
    delete: (id: string | number) => `/categories/${id}`,
  },

  // ═══════════════════════════════════════════════
  // CART
  // ═══════════════════════════════════════════════
  cart: {
    get: '/cart',             // GET /api/cart?branch_id=xxx
    allBranches: '/cart/all-branches', // GET /api/cart/all-branches
    add: '/cart/items',       // POST /api/cart/items { branch_id, branch_product_id, quantity, price, ... }
    update: (id: string | number) => `/cart/items/${id}`, // PUT
    remove: (id: string | number) => `/cart/items/${id}`, // DELETE ?branch_id=xxx
    clear: '/cart/clear',     // POST { branch_id }
  },

  // ═══════════════════════════════════════════════
  // ORDERS
  // ═══════════════════════════════════════════════
  orders: {
    list: '/orders',
    detail: (id: string | number) => `/orders/${id}`,
    create: '/orders',
    createFromCart: '/orders/create-from-cart',
    cancel: (id: string | number) => `/orders/${id}/cancel`,
    tracking: (id: string | number) => `/orders/${id}/tracking`,
    updateStatus: (id: string | number) => `/orders/${id}/status`,
    refund: (id: string | number) => `/orders/${id}/refund`,
    assignTracking: (id: string | number) => `/orders/${id}/tracking-number`,
    reorder: (id: string | number) => `/orders/${id}/reorder`,
    invoice: (id: string | number) => `/orders/${id}/invoice`,
  },

  // ═══════════════════════════════════════════════
  // PAYMENTS
  // ═══════════════════════════════════════════════
  payments: {
    methods: '/payments/methods',
    addMethod: '/payments/methods',
    updateMethod: (id: string | number) => `/payments/methods/${id}`,
    deleteMethod: (id: string | number) => `/payments/methods/${id}`,
    setDefault: (id: string | number) => `/payments/methods/${id}/default`,
    process: '/payments/process',
    transactions: '/payments/transactions',
    providers: '/payments/providers',
    updateProviders: '/payments/providers',
    status: (id: string | number) => `/payments/${id}/status`,
  },

  // ═══════════════════════════════════════════════
  // PROMOTIONS
  // ═══════════════════════════════════════════════
  promotions: {
    list: '/promotions',
    detail: (id: string | number) => `/promotions/${id}`,
    create: '/promotions',
    update: (id: string | number) => `/promotions/${id}`,
    delete: (id: string | number) => `/promotions/${id}`,
    activate: (id: string | number) => `/promotions/${id}/activate`,
    pause: (id: string | number) => `/promotions/${id}/pause`,
    calculate: '/promotions/calculate',
    applicable: '/promotions/applicable',
    claims: '/promotions/claims',
    myWallet: '/promotions/my-wallet',
    claim: (id: string | number) => `/promotions/${id}/claim`,
    usage: (id: string | number) => `/promotions/${id}/usage`,
  },

  // ═══════════════════════════════════════════════
  // COUPONS
  // ═══════════════════════════════════════════════
  coupons: {
    list: '/coupons',
    detail: (code: string) => `/coupons/${code}`,
    validate: '/coupons/validate',
    apply: '/coupons/apply',
    remove: '/coupons/remove',
    usage: '/coupons/usage',
    myWallet: '/coupons/my-wallet',
    claim: (id: string | number) => `/coupons/${id}/claim`,
    create: '/coupons',
    update: (id: string | number) => `/coupons/${id}`,
    delete: (id: string | number) => `/coupons/${id}`,
  },

  checkout: {
    calculate: '/checkout/calculate',
    preview: '/checkout/preview',
  },

  uploads: {
    promotionImage: '/uploads/promotion-image',
    reviewImages: '/uploads/review-images',
    evidenceImages: '/uploads/evidence-images',
    eventImage: '/uploads/event-image',
  },

  wishlist: {
    list: '/wishlist',
    add: '/wishlist',
    toggle: '/wishlist/toggle',
    remove: (id: string | number) => `/wishlist/${id}`,
    clear: '/wishlist/clear',
  },

  viewHistory: {
    list: '/view-history',
    track: '/view-history',
    merge: '/view-history/merge',
    remove: (id: string | number) => `/view-history/${id}`,
    clear: '/view-history',
    clearLegacy: '/view-history/clear',
  },

  returnRequests: {
    list: '/return-requests',
    detail: (id: string | number) => `/return-requests/${id}`,
    create: '/return-requests',
    cancel: (id: string | number) => `/return-requests/${id}/cancel`,
    updateStatus: (id: string | number) => `/return-requests/${id}/status`,
  },

  // ═══════════════════════════════════════════════
  // RECIPES
  // ═══════════════════════════════════════════════
  recipes: {
    list: '/recipes',
    search: '/recipes/search',
    detail: (id: string | number) => `/recipes/${id}`,
    byName: (name: string) => `/recipes/by-name/${name}`,
    generate: '/recipes/generate',
    preview: '/recipes/preview',
    save: '/recipes/save',
  },

  // ═══════════════════════════════════════════════
  // REVIEWS
  // ═══════════════════════════════════════════════
  reviews: {
    list: '/reviews',
    forProduct: (productId: string | number) => `/products/${productId}/reviews`,
    create: (productId: string | number) => `/products/${productId}/reviews`,
    update: (id: string | number) => `/reviews/${id}`,
    delete: (id: string | number) => `/reviews/${id}`,
    reply: (id: string | number) => `/reviews/${id}/reply`,
  },

  // ═══════════════════════════════════════════════
  // SUPPORT
  // ═══════════════════════════════════════════════
  support: {
    tickets: '/support/tickets',
    create: '/support/tickets',
    detail: (id: string | number) => `/support/tickets/${id}`,
    messages: (id: string | number) => `/support/tickets/${id}/messages`,
    sendMessage: (id: string | number) => `/support/tickets/${id}/messages`,
    reply: (id: string | number) => `/support/tickets/${id}/reply`,
    updateStatus: (id: string | number) => `/support/tickets/${id}/status`,
  },

  // ═══════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════
  notifications: {
    list: '/notifications',
    broadcast: '/notifications/broadcast',
    markRead: (id: string | number) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
    delete: (id: string | number) => `/notifications/${id}`,
  },

  // ═══════════════════════════════════════════════
  // LOYALTY
  // ═══════════════════════════════════════════════
  loyalty: {
    transactions: '/loyalty/transactions',
    rules: '/loyalty/rules',
    updateRules: '/loyalty/rules',
    redeem: '/loyalty/redeem',
  },

  // ═══════════════════════════════════════════════
  // ADDRESSES
  // ═══════════════════════════════════════════════
  addresses: {
    list: '/addresses',
    create: '/addresses',
    update: (id: string | number) => `/addresses/${id}`,
    delete: (id: string | number) => `/addresses/${id}`,
    setDefault: (id: string | number) => `/addresses/${id}/default`,
  },

  // ═══════════════════════════════════════════════
  // BRANCHES
  // ═══════════════════════════════════════════════
  branches: {
    list: '/branches',
    detail: (id: string | number) => `/branches/${id}`,
    create: '/branches',
    update: (id: string | number) => `/branches/${id}`,
    delete: (id: string | number) => `/branches/${id}`,
    nearby: '/branches/nearby',
  },

  // ═══════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════
  events: {
    list: '/events',
    published: '/events/published',
    featured: '/events/featured',
    detail: (id: string | number) => `/events/${id}`,
    create: '/events',
    update: (id: string | number) => `/events/${id}`,
    delete: (id: string | number) => `/events/${id}`,
    publish: (id: string | number) => `/events/${id}/publish`,
    unpublish: (id: string | number) => `/events/${id}/unpublish`,
    toggleFeatured: (id: string | number) => `/events/${id}/toggle-featured`,
    bulkDelete: '/events/bulk-delete',
    categories: '/events/categories',
    comments: (id: string | number) => `/events/${id}/comments`,
    addComment: (id: string | number) => `/events/${id}/comments`,
    related: (id: string | number) => `/events/${id}/related`,
    postDetail: (id: string | number) => `/events/${id}/detail`,
    like: (id: string | number) => `/events/${id}/like`,
    likeComment: (postId: string | number, commentId: string | number) => `/events/${postId}/comments/${commentId}/like`,
  },

  // ═══════════════════════════════════════════════
  // BANNERS / HOT DEALS / FEATURED COLLECTIONS
  // ═══════════════════════════════════════════════
  banners: {
    list: '/banners',
    home: '/banners/home',
    promo: '/banners/promo',
    create: '/banners',
    update: (id: string | number) => `/banners/${id}`,
    delete: (id: string | number) => `/banners/${id}`,
  },
  hotDeals: {
    list: '/hot-deals',
    create: '/hot-deals',
    detail: (id: string | number) => `/hot-deals/${id}`,
    update: (id: string | number) => `/hot-deals/${id}`,
    delete: (id: string | number) => `/hot-deals/${id}`,
  },
  flashDeals: {
    list: '/flash-deals',
    create: '/flash-deals',
    detail: (id: string | number) => `/flash-deals/${id}`,
    update: (id: string | number) => `/flash-deals/${id}`,
    delete: (id: string | number) => `/flash-deals/${id}`,
    toggle: (id: string | number) => `/flash-deals/${id}/toggle`,
  },
  featuredCollections: {
    list: '/featured-collections',
  },

  // ═══════════════════════════════════════════════
  // DELIVERY SLOTS
  // ═══════════════════════════════════════════════
  deliverySlots: {
    list: '/delivery-slots',
  },

  // ═══════════════════════════════════════════════
  // ADMIN SETTINGS / SYSTEM
  // ═══════════════════════════════════════════════
  adminSettings: {
    get: '/admin/settings',
    update: '/admin/settings',
    reset: '/admin/settings/reset',
  },
  system: {
    maintenanceStatus: '/system/maintenance-status',
  },
  notificationTemplates: {
    list: '/admin/notification-templates',
    update: (id: string) => `/admin/notification-templates/${id}`,
  },

  // ═══════════════════════════════════════════════
  // AUDIT LOGS
  // ═══════════════════════════════════════════════
  auditLogs: {
    list: '/audit-logs',
    detail: (id: string | number) => `/audit-logs/${id}`,
  },

  // ═══════════════════════════════════════════════
  // ROLES / MEMBERSHIP
  // ═══════════════════════════════════════════════
  roles: {
    list: '/roles',
    detail: (id: string | number) => `/roles/${id}`,
    create: '/roles',
    update: (id: string | number) => `/roles/${id}`,
    assign: '/roles/assign',
    me: '/roles/me',
  },
  membershipTiers: {
    list: '/membership-tiers',
  },

  // ═══════════════════════════════════════════════
  // SEARCH / HISTORY
  // ═══════════════════════════════════════════════
  search: {
    products: '/search/products',
    history: (userId: string | number) => `/search/history/${userId}`,
  },
  purchaseHistory: {
    list: (userId: string | number) => `/purchase-history/${userId}`,
  },

  // ═══════════════════════════════════════════════
  // ADMIN ANALYTICS
  // ═══════════════════════════════════════════════
  analytics: {
    dashboard: '/admin/analytics/dashboard',
  },
  recommendations: {
    get: '/recommendations',
  },
  priceWatch: {
    list: '/price-watch',
    create: '/price-watch',
    update: (id: string | number) => `/price-watch/${id}`,
    delete: (id: string | number) => `/price-watch/${id}`,
  },
};
