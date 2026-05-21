// src/pages/SearchResults.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store';
import { addToCartAsync } from '../slices/cartSlice';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import { toast } from '../components/Toast/toastEvent';
import { useBranchData } from '../hooks/useBranchData';
import { productService } from '../services/productService';
import { resolveImageUrl } from '../utils/imageUrl';
const SearchResults: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('q')?.trim() || '';

  // State cho bộ lọc
  const [sortBy, setSortBy] = useState<string>('Mới nhất');
  const [selectedCategories, setSelectedCategories] = useState<Array<number | string>>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<{
    sortBy: string;
    categories: Array<number | string>;
    priceRanges: string[];
  }>({ sortBy: 'Mới nhất', categories: [], priceRanges: [] });

  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const pageSize = 9;

  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector(state => state.auth);
  const redirectToLogin = useAuthRedirect();
  const { categories, currentBranchId } = useBranchData();
  const [searchedProducts, setSearchedProducts] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const resolvedBranchId = useMemo(() => {
    if (currentBranchId) return String(currentBranchId);
    try {
      const raw = localStorage.getItem('lotte_current_branch');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return String(parsed?.id || parsed?._id || '');
    } catch {
      return '';
    }
  }, [currentBranchId]);

  useEffect(() => {
    let active = true;

    const mapSortToApi = (label: string) => {
      switch (label) {
        case 'Mới nhất':
          return 'newest';
        case 'Bán chạy':
          return 'best-seller';
        case 'Giá: Thấp đến Cao':
          return 'price-low';
        case 'Giá: Cao đến Thấp':
          return 'price-high';
        case 'Đánh giá tốt nhất':
          return 'rating';
        default:
          return 'newest';
      }
    };

    const fetchSearchResults = async () => {
      if (!searchQuery) {
        if (active) setSearchedProducts([]);
        return;
      }

      setSearchLoading(true);
      try {
        const params: any = {
          sort: mapSortToApi(appliedFilters.sortBy),
        };
        if (resolvedBranchId) params.branchId = resolvedBranchId;
        if (appliedFilters.categories.length === 1) params.category = String(appliedFilters.categories[0]);

        const res = await productService.searchProducts(searchQuery, params);
        const safeData = Array.isArray(res?.data) ? res.data : [];
        if (active) setSearchedProducts(safeData);
      } catch {
        if (active) setSearchedProducts([]);
      } finally {
        if (active) setSearchLoading(false);
      }
    };

    fetchSearchResults();

    return () => {
      active = false;
    };
  }, [searchQuery, appliedFilters.sortBy, appliedFilters.categories, resolvedBranchId]);

  // Áp dụng bộ lọc
  const filteredProducts = useMemo(() => {
    let result = [...searchedProducts];

    // Lọc danh mục
    if (appliedFilters.categories.length > 0) {
      const categorySet = new Set(appliedFilters.categories.map((c) => String(c)));
      result = result.filter((p: any) => categorySet.has(String(p.category_id)));
    }

    // Lọc khoảng giá (dựa trên giá sau giảm)
    if (appliedFilters.priceRanges.length > 0) {
      result = result.filter((p: any) => {
        const safePrice = Number(p.price || 0);
        const finalPrice = safePrice * (1 - (Number(p.discount_percent || 0)) / 100);
        return appliedFilters.priceRanges.some((range) => {
          if (range === 'Dưới 50.000đ') return finalPrice < 50000;
          if (range === '50.000đ - 100.000đ') return finalPrice >= 50000 && finalPrice <= 100000;
          if (range === '100.000đ - 200.000đ') return finalPrice > 100000 && finalPrice <= 200000;
          if (range === 'Trên 200.000đ') return finalPrice > 200000;
          return false;
        });
      });
    }

    // Sắp xếp
    result = [...result].sort((a: any, b: any) => {
      switch (appliedFilters.sortBy) {
        case 'Mới nhất':
          const da = a.created_at ? new Date(a.created_at).getTime() : 0;
          const db = b.created_at ? new Date(b.created_at).getTime() : 0;
          return db - da;
        case 'Bán chạy':
          return (b.sold_count || 0) - (a.sold_count || 0);
        case 'Giá: Thấp đến Cao':
          return (a.price || 0) - (b.price || 0);
        case 'Giá: Cao đến Thấp':
          return (b.price || 0) - (a.price || 0);
        case 'Đánh giá tốt nhất':
          return (b.average_rating || 0) - (a.average_rating || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [searchedProducts, appliedFilters]);

  // Phân trang
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  if (safePage !== currentPage) setCurrentPage(safePage);

  const displayedProducts = filteredProducts.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

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

  const handleAddToCart = async (item: any) => {
    if (!resolvedBranchId) {
      toast.error(t('common.selectBranchFirst'));
      return;
    }
    if (Number(item.stock || 0) <= 0) {
      toast.error(t('product.outOfStock'));
      return;
    }
    if (!isAuthenticated) {
      redirectToLogin({ action: 'add_to_cart', branch_product_id: String(item.branch_product_id || item.id || item._id), price: item.price, qty: 1, product: item });
      return;
    }
    try {
      await dispatch(addToCartAsync({
        branchId: resolvedBranchId,
        branch_product_id: String(item.branch_product_id || item.id || item._id),
        price: item.price,
        unit_price: item.price,
        quantity: 1,
        product_name: item.name,
        product_image: resolveImageUrl(item.images?.[0] || ''),
        branchProduct: item.branchProduct || item,
      })).unwrap();
      toast.success(t('cart.addedToCart', { name: item.name }));
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : (error?.message || t('common.addToCartError')));
    }
  };

  // Xử lý áp dụng bộ lọc
  const applyFilters = () => {
    setAppliedFilters({ sortBy, categories: selectedCategories, priceRanges: selectedPriceRanges });
    setCurrentPage(1);
  };

  // Xóa tất cả bộ lọc
  const clearFilters = () => {
    setSortBy('Mới nhất');
    setSelectedCategories([]);
    setSelectedPriceRanges([]);
    setAppliedFilters({ sortBy: 'Mới nhất', categories: [], priceRanges: [] });
    setCurrentPage(1);
  };

  return (
    <main className="max-w-[1200px] mx-auto w-full px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/" className="hover:text-primary transition-colors">
          {t('common.breadcrumbHome')}
        </Link>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="text-slate-900 font-medium dark:text-slate-100">
          {t('search.title', 'Kết quả tìm kiếm')}
        </span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar bộ lọc */}
        <aside className="w-full lg:w-[280px] flex-shrink-0">
          <div className="sticky top-28 space-y-6">
            <div className="glass-panel p-6 rounded-xl shadow-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">filter_list</span>
                {t('product.sort')}
              </h3>
              <div className="space-y-6">
                {/* Sắp xếp theo */}
                <div>
                  <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    {t('common.sortBy')}
                  </p>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full h-11 pl-4 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg appearance-none focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="Mới nhất">{t('product.newest', 'Mới nhất')}</option>
                      <option value="Bán chạy">{t('product.bestSeller', 'Bán chạy')}</option>
                      <option value="Giá: Thấp đến Cao">{t('product.priceLowToHigh', 'Giá: Thấp đến Cao')}</option>
                      <option value="Giá: Cao đến Thấp">{t('product.priceHighToLow', 'Giá: Cao đến Thấp')}</option>
                      <option value="Đánh giá tốt nhất">{t('product.highestRated', 'Đánh giá tốt nhất')}</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Danh mục */}
                <div>
                  <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    {t('product.category', 'Danh mục')}
                  </p>
                  <div className="space-y-1">
                    {(categories || []).map((cat: any) => {
                      const count = filteredProducts.filter((p: any) => String(p.category_id) === String(cat.id)).length;
                      const isSelected = selectedCategories.includes(cat.id);

                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategories((prev) =>
                              isSelected ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                            );
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-lg transition-all w-full text-left ${
                            isSelected
                              ? 'bg-primary/5 text-primary font-medium'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">eco</span>
                            {cat.name}
                          </span>
                          <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Khoảng giá */}
                <div>
                  <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    {t('search.priceRange', 'Khoảng giá')}
                  </p>
                  <div className="space-y-3">
                    {[
                      { label: t('search.under50k', 'Dưới 50.000đ'), value: 'Dưới 50.000đ' },
                      { label: '50.000đ - 100.000đ', value: '50.000đ - 100.000đ' },
                      { label: '100.000đ - 200.000đ', value: '100.000đ - 200.000đ' },
                      { label: t('search.above200k', 'Trên 200.000đ'), value: 'Trên 200.000đ' },
                    ].map((range) => (
                      <label key={range.value} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedPriceRanges.includes(range.value)}
                          onChange={() => {
                            setSelectedPriceRanges((prev) =>
                              prev.includes(range.value)
                                ? prev.filter((r) => r !== range.value)
                                : [...prev, range.value]
                            );
                          }}
                          className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary/20"
                        />
                        <span className="text-slate-700 dark:text-slate-300 text-sm group-hover:text-primary">
                          {range.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Nút áp dụng & xóa */}
                <div className="space-y-3">
                  <button
                    onClick={applyFilters}
                    className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-transform active:scale-95 shadow-lg shadow-primary/20"
                  >
                    {t('product.applyFilters', 'Áp dụng bộ lọc')}
                  </button>
                  <button
                    onClick={clearFilters}
                    className="w-full py-2 text-slate-500 text-sm font-medium hover:text-primary transition-colors"
                  >
                    {t('product.clearFilters')}
                  </button>
                </div>
              </div>
            </div>


          </div>
        </aside>

        {/* Danh sách sản phẩm */}
        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {searchLoading
                  ? t('search.searching', 'Đang tìm kiếm sản phẩm...')
                  : filteredProducts.length > 0
                  ? t('common.resultsFound', { count: filteredProducts.length })
                  : t('common.noResults')}
              </h2>
              <p className="text-slate-500">
                {t('search.resultsFor', 'Kết quả cho từ khóa')} '
                <span className="text-primary font-medium italic">{searchQuery || '...'}</span>'
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start">
              <button
                onClick={() => setViewMode('grid')}
                className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                  viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'
                } transition-colors`}
              >
                <span className="material-symbols-outlined">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                  viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'
                } transition-colors`}
              >
                <span className="material-symbols-outlined">list</span>
              </button>
            </div>
          </div>

          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'
                : 'flex flex-col gap-6'
            }
          >
            {displayedProducts.length > 0 ? (
              displayedProducts.map((item: any) => {
                const isOutOfStock = item.stock <= 0;
                const discount = item.discount_percent || 0;
                const hasEco = item.eco_label || item.tags?.includes('ECO');

                return (
                  <Link
                    key={item.id || item._id}
                    to={`/products/${item.id || item._id}`}
                    className={`product-card group bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 dark:border-slate-700 cursor-pointer ${
                      viewMode === 'list' ? 'flex flex-row gap-6' : ''
                    } ${isOutOfStock ? 'grayscale-[0.3]' : ''}`}
                  >
                    {/* Ảnh + Badges */}
                    <div className={`relative aspect-square rounded-xl overflow-hidden bg-slate-50 mb-4 ${viewMode === 'list' ? 'w-48 flex-shrink-0' : ''}`}>
                      {item.images?.[0] ? (
                        <img
                          className="zoom-img w-full h-full object-cover transition-transform duration-500"
                          alt={item.name}
                          src={resolveImageUrl(item.images[0])}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center text-slate-300 ${item.images?.[0] ? 'hidden' : ''}`}>
                        <span className="material-symbols-outlined text-5xl">image</span>
                      </div>

                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                        {discount > 0 && (
                          <span className="px-2 py-1 bg-primary text-white text-[10px] font-bold rounded uppercase">
                            SALE -{discount}%
                          </span>
                        )}
                        {hasEco && (
                          <span className="px-2 py-1 bg-green-500 text-white text-[10px] font-bold rounded uppercase">
                            ECO
                          </span>
                        )}
                        {item.is_new && (
                          <span className="px-2 py-1 bg-amber-500 text-white text-[10px] font-bold rounded uppercase">
                            {t('product.badgeNew')}
                          </span>
                        )}
                        {item.is_best_seller && (
                          <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded uppercase">
                            {t('product.badgeBestSeller')}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toast.info(t('product.addedWishlist'));
                        }}
                        className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined text-xl">favorite</span>
                      </button>

                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="px-3 py-1 bg-slate-800/80 text-white font-bold rounded-lg text-sm">
                            {t('common.outOfStock')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Nội dung */}
                    <div className={`space-y-2 flex-1 ${viewMode === 'list' ? 'flex flex-col justify-between' : ''}`}>
                      <div className="flex items-center gap-1">
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className="material-symbols-outlined text-xs fill-1">
                              star
                            </span>
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400">({item.review_count || 0})</span>
                      </div>

                      <h3 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug h-10">
                        {item.name}
                      </h3>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-[10px] font-medium rounded-full text-slate-600 dark:text-slate-300">
                          {isOutOfStock ? t('common.outOfStock') : t('common.inStock')}
                        </span>
                      </div>

                      <div className="flex flex-col pt-1">
                        {item.original_price && item.original_price > item.price && (
                          <span className="text-slate-400 line-through text-xs font-medium">
                            {item.original_price.toLocaleString('vi-VN')}đ
                          </span>
                        )}
                        <span className="text-primary text-xl font-extrabold">
                          {item.price.toLocaleString('vi-VN')}đ
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddToCart(item);
                        }}
                        disabled={isOutOfStock}
                        className={`w-full h-11 ${
                          isOutOfStock
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-primary/10 hover:bg-primary text-primary hover:text-white'
                        } font-bold rounded-xl flex items-center justify-center gap-2 transition-all group/btn`}
                      >
                        <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
                        {isOutOfStock ? t('common.outOfStock') : t('common.addToCart')}
                      </button>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="text-center py-20 text-slate-500">
                {t('search.noResultsMatch', { query: searchQuery })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>

              {renderPagination().map((page, idx) => (
                <React.Fragment key={idx}>
                  {page === '...' ? (
                    <span className="px-2 text-slate-400">...</span>
                  ) : (
                    <button
                      onClick={() => setCurrentPage(page as number)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                        page === currentPage
                          ? 'bg-primary text-white font-bold'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
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
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default SearchResults;