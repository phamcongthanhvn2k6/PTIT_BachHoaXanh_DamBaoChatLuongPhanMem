// src/pages/Products.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store';
import { addToCartAsync } from '../slices/cartSlice';
import { addCompareItem, compareMaxItems, removeCompareItem, selectCompareIds } from '../slices/compareSlice';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import { toast } from '../components/Toast/toastEvent';
import { productService } from '../services/productService';
import { normalizeCategories, normalizeProductLike } from '../utils/productNormalization';
import { getProductUrl } from '../utils/productUrl';

const Products: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'best-seller' | 'price-low' | 'price-high' | 'rating'>('newest');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [likedProducts, setLikedProducts] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector(state => state.auth);
  const compareIds = useAppSelector(selectCompareIds);
  const redirectToLogin = useAuthRedirect();
  
  // Branch awareness
  const { currentBranch } = useAppSelector(state => state.branch);
  const currentBranchId = currentBranch ? String(currentBranch.id || (currentBranch as any)?._id || '') : '';

  // Removed old branchProducts from store since we are now API driven.
  // We keep categories from store as a cached dictionary or fetch it directly.
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageSize = 9; 

  React.useEffect(() => {
    // Fetch categories on mount
    productService.getCategories().then((data: any) => setCategories(normalizeCategories(data || [])));
  }, []);

  React.useEffect(() => {
    let active = true;
    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await productService.getProducts({
          page: currentPage,
          limit: pageSize,
          search: searchTerm,
          sort: sortBy,
          category: activeCategory || undefined,
          branchId: currentBranchId || undefined // Uses selected branch from Redux
        });
        
        if (active && res) {
          setProducts((res.data || []).map((item: any) => normalizeProductLike(item)));
          setTotalFiltered(res.pagination?.total || 0);
          setTotalPages(res.pagination?.totalPages || 1);
        }
      } catch (err: any) {
        if (active) setError(err?.toString() || t('common.error'));
      } finally {
        if (active) setLoading(false);
      }
    };
    
    // Add small debounce for search typing
    const timer = setTimeout(fetchItems, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [currentPage, pageSize, searchTerm, sortBy, activeCategory, currentBranchId, t]);

  const toggleLike = (id: string | number) => {
    const safeId = String(id);
    setLikedProducts((prev) =>
      prev.includes(safeId) ? prev.filter((x) => x !== safeId) : [...prev, safeId]
    );
  };

  const handleAddToCart = async (item: any) => {
    if (!currentBranchId) {
      toast.error(t('common.selectBranchFirst'));
      return;
    }
    if (item.stock <= 0) {
      toast.error(t('product.outOfStock'));
      return;
    }
    if (!isAuthenticated) {
      redirectToLogin({
        action: 'add_to_cart',
        branch_product_id: String(item.id),
        price: item.price,
        qty: 1,
        product: item
      });
      return;
    }
    try {
      await dispatch(addToCartAsync({
        branchId: currentBranchId,
        branch_product_id: String(item.branch_product_id || item.id),
        price: item.price,
        unit_price: item.price,
        quantity: 1,
        product_name: item.name,
        product_image: item.images?.[0] || '',
        branchProduct: item,
      })).unwrap();
      toast.success(t('product.addedToCart', { name: item.name }));
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : (error?.message || t('common.addToCartError')));
    }
  };

  const handleCategoryClick = (catId: string | null) => {
    setActiveCategory(catId);
    setCurrentPage(1);
  };

  const handleToggleCompare = (item: any) => {
    const productId = String(item.product_id || item.id || item._id || '');
    if (!productId) {
      toast.error(t('compare.cannotAdd'));
      return;
    }

    const isSelected = compareIds.includes(productId);
    if (isSelected) {
      dispatch(removeCompareItem(productId));
      toast.success(t('compare.removed'));
      return;
    }

    if (compareIds.length >= compareMaxItems) {
      toast.error(t('compare.maxItems', { max: compareMaxItems }));
      return;
    }

    dispatch(addCompareItem({
      product_id: productId,
      branch_product_id: String(item.branch_product_id || item.id || ''),
      name: item.name || t('common.product'),
      image: item.images?.[0] || item.thumbnail || '',
      price: Number(item.price) || 0,
      original_price: Number(item.original_price) || 0,
      discount_percent: Number(item.discount_percent) || 0,
      brand: item.brand || '',
    }));
    toast.success(t('compare.added'));
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as any);
    setCurrentPage(1);
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  const renderPagination = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <main className="max-w-[1200px] mx-auto w-full px-4 lg:px-6 py-8">
      {/* Page Header Card */}
      <div className="relative overflow-hidden bg-white dark:bg-white/5 rounded-xl p-8 mb-8 border border-primary/5 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              🛍️ {t('product.products')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg">
              {t('product.discoverProducts')}
            </p>
            <div className="h-1 w-24 bg-gradient-to-r from-primary to-primary/20 rounded-full mt-4"></div>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <span>{t('common.breadcrumbHome')}</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary">{t('product.products')}</span>
          </div>
        </div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-72 flex-shrink-0">
          <div className="sticky top-24 space-y-6">
            {/* Search & Sorting */}
            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md rounded-xl p-5 border border-primary/10 shadow-sm">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {t('product.search')}
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border-primary/10 bg-white/50 dark:bg-background-dark/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                      placeholder={t('product.productName')}
                    />
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 group-focus-within:text-primary transition-colors">
                      search
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {t('product.sort')}
                  </label>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={handleSortChange}
                      className="w-full pl-3 pr-10 py-2.5 rounded-lg border-primary/10 bg-white/50 dark:bg-background-dark/50 focus:border-primary focus:ring-4 focus:ring-primary/10 appearance-none text-sm transition-all"
                    >
                      <option value="newest">{t('product.newest')}</option>
                      <option value="best-seller">{t('product.bestSeller')}</option>
                      <option value="price-low">{t('product.priceLowToHigh')}</option>
                      <option value="price-high">{t('product.priceHighToLow')}</option>
                      <option value="rating">{t('product.highestRated')}</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md rounded-xl p-5 border border-primary/10 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">category</span>
                {t('product.category')}
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => handleCategoryClick(null)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left ${
                    activeCategory === null ? 'bg-primary text-white shadow-md shadow-primary/20' : 'hover:bg-primary/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">apps</span>
                  <span className="text-sm font-semibold">{t('product.all')}</span>
                </button>

                {categories.map((cat: any) => {
                  const categoryId = String(cat._id || cat.id || '');
                  const isActive = activeCategory === categoryId;
                  return (
                    <button
                      key={categoryId}
                      onClick={() => handleCategoryClick(categoryId)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all w-full text-left group ${
                        isActive ? 'bg-primary text-white shadow-md shadow-primary/20' : 'hover:bg-primary/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`material-symbols-outlined text-[20px] transition-colors ${isActive ? 'text-white' : 'group-hover:text-primary'}`}
                        >
                          {cat.name.includes('Thực phẩm') ? 'set_meal' : 'category'}
                        </span>
                        <span className="text-sm font-medium">{cat.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Product Grid Area */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 px-1">
            <p className="text-sm text-slate-500 font-medium">
              {t('product.showing')} <span className="text-slate-900 dark:text-white font-bold">{loading ? '...' : products.length}</span> / {totalFiltered} {t('product.products')} – {t('product.page')}{' '}
              <span className="text-slate-900 dark:text-white font-bold">{currentPage}</span>/{totalPages}
            </p>

            {/* Chọn bố cục */}
            <div className="flex items-center bg-white dark:bg-white/5 rounded-lg p-1 border border-primary/5">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400'}`}
              >
                <span className="material-symbols-outlined text-[20px]">grid_view</span>
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400'}`}
              >
                <span className="material-symbols-outlined text-[20px]">list</span>
              </button>
            </div>
          </div>

          {/* Danh sách sản phẩm */}
          {error ? (
             <div className="col-span-full py-12 text-center text-red-500">{error}</div>
          ) : loading ? (
             <div className="col-span-full py-12 text-center text-slate-500">{t('product.loadingProducts')}</div>
          ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'
                : 'flex flex-col gap-6'
            }
          >
            {products.length > 0 ? (
              products.map((item: any) => {
                const isOutOfStock = item.stock <= 0;
                const discount = item.discount_percent || 0;
                const hasEco = item.eco_label || item.tags?.includes('ECO');
                const isLiked = likedProducts.includes(String(item.id));
                const compareProductId = String(item.product_id || item.id || item._id || '');
                const isCompared = compareIds.includes(compareProductId);
                const compareDisabled = !isCompared && compareIds.length >= compareMaxItems;

                // Link đến trang chi tiết sản phẩm (dùng product_id để khớp với products master)
                const productLink = getProductUrl(item);

                return (
                  <Link
                    key={String(item.id || item._id)}
                    to={productLink}
                    className={`group relative flex flex-col bg-white dark:bg-white/5 rounded-xl border border-primary/5 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer ${
                      isOutOfStock ? 'grayscale-[0.3]' : ''
                    } ${viewMode === 'list' ? 'flex-row gap-6 p-6' : ''}`}
                  >
                    {/* Ảnh */}
                    <div className={`relative overflow-hidden rounded-xl bg-slate-50 dark:bg-background-dark/50 ${viewMode === 'list' ? 'w-48 flex-shrink-0 aspect-square' : 'aspect-square'}`}>
                      <img
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        alt={item.name}
                        src={item.images?.[0] || 'https://via.placeholder.com/400x400?text=San+pham'}
                      />

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        {discount > 0 && (
                          <span className="bg-primary text-white text-[10px] font-extrabold px-2 py-1 rounded shadow-lg">
                            -{discount}%
                          </span>
                        )}
                        {hasEco && (
                          <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-1 rounded shadow-lg flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px] fill-1">eco</span>
                            ECO
                          </span>
                        )}
                        {item.is_new && (
                          <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2 py-1 rounded shadow-lg">
                            🆕 {t('product.badgeNew')}
                          </span>
                        )}
                        {item.is_best_seller && (
                          <span className="bg-primary text-white text-[10px] font-extrabold px-2 py-1 rounded shadow-lg">
                            🔥 {t('product.badgeBestSeller')}
                          </span>
                        )}
                        {item.promotions && item.promotions.map((p: any, idx: number) => (
                           <span key={idx} className="bg-red-500 text-white text-[10px] font-extrabold px-2 py-1 rounded shadow-lg">
                             {p.badge_text || 'PROMO'}
                           </span>
                        ))}
                      </div>

                      {/* Favorite - Ngăn chuyển trang khi bấm */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleLike(item.id);
                        }}
                        className="absolute top-3 right-3 p-2 bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-full transition-colors"
                      >
                        <span className={`material-symbols-outlined text-[20px] ${isLiked ? 'text-red-500' : 'text-slate-400'}`}>
                          {isLiked ? 'favorite' : 'favorite_border'}
                        </span>
                      </button>

                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-white/90 dark:bg-background-dark/90 text-slate-900 dark:text-white px-4 py-2 rounded-full font-bold text-sm tracking-wide">
                            {t('product.outOfStock')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Nội dung */}
                    <div className={`flex-1 ${viewMode === 'list' ? 'flex flex-col justify-between' : 'p-5'} ${isOutOfStock ? 'opacity-70' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                          {item.brand || 'Lotte Selection'}
                        </span>
                        {item.average_rating > 0 && (
                          <div className="flex items-center gap-0.5 text-amber-400">
                            <span className="material-symbols-outlined text-xs fill-1">star</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {Number(item.average_rating).toFixed(1)}
                            </span>
                            <span className="text-[10px] text-slate-400">({item.review_count || 0})</span>
                          </div>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug mb-3">
                        {item.name}
                      </h3>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {item.unit && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500">
                            {item.unit}
                          </span>
                        )}
                        {item.tags?.slice(0, 2).map((tag: string, i: number) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="mt-auto">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xl font-extrabold text-primary">
                            {item.price > 0 ? `${item.price.toLocaleString('vi-VN')}đ` : t('product.contactPrice')}
                          </span>
                          {item.original_price && item.original_price > item.price && item.price > 0 && (
                            <span className="text-sm text-slate-400 line-through">
                              {item.original_price.toLocaleString('vi-VN')}đ
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              isOutOfStock
                                ? 'text-red-600 bg-red-50 dark:bg-red-500/10'
                                : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10'
                            }`}
                          >
                            {isOutOfStock ? t('product.outOfStock') : `${t('product.inStock')} ${item.stock}`}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleToggleCompare(item);
                              }}
                              disabled={compareDisabled}
                              className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${
                                isCompared
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : compareDisabled
                                    ? 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-slate-500'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200'
                              }`}
                              title={compareDisabled ? t('compare.maxTooltip', { max: compareMaxItems }) : t('compare.addTooltip')}
                            >
                              <span className="material-symbols-outlined text-[16px]">balance</span>
                              {isCompared ? t('compare.selected') : t('compare.compare')}
                            </button>

                            {/* Nút giỏ hàng - Ngăn chuyển trang */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddToCart(item);
                              }}
                              disabled={isOutOfStock}
                              className={`flex items-center gap-1 p-2 rounded-lg transition-colors ${
                                isOutOfStock
                                  ? 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
                                  : 'bg-primary hover:bg-primary/90 text-white'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {isOutOfStock ? 'notifications' : 'add_shopping_cart'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 text-slate-500">
                {t('product.noProducts')}
              </div>
            )}
          </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12 mb-8">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-primary/10 hover:bg-primary/5 text-slate-500 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>

              {renderPagination().map((page, idx) => (
                <React.Fragment key={idx}>
                  {page === '...' ? (
                    <span className="text-slate-400 px-2">...</span>
                  ) : (
                    <button
                      onClick={() => setCurrentPage(page as number)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                        page === currentPage
                          ? 'bg-gradient-to-br from-primary to-primary/80 text-white font-bold shadow-lg shadow-primary/20'
                          : 'border border-primary/10 hover:bg-primary/5 text-slate-700 dark:text-slate-300 font-semibold'
                      }`}
                    >
                      {page}
                    </button>
                  )}
                </React.Fragment>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-primary/10 hover:bg-primary/5 text-slate-500 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default Products;