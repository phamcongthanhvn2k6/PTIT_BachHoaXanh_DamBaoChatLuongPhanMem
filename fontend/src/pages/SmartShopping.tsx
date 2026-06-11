import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { addToCartAsync } from '../slices/cartSlice';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import { toast } from '../components/Toast/toastEvent';
import { useBranchData } from '../hooks/useBranchData';
import { useTranslation } from 'react-i18next';
import { getProductUrl } from '../utils/productUrl';
import { recommendationService, priceWatchService } from '../services';
import type { SmartRecommendations } from '../services/recommendationService';
import type { PriceWatchRecord } from '../services/priceWatchService';

// ─── Recipe data (Vietnamese grocery recipes) ────
const RECIPES = [
  { id: 'pho', nameKey: 'smartShopping.recipePhoName', descKey: 'smartShopping.recipePhoDesc', icon: '🍜' },
  { id: 'banhmi', nameKey: 'smartShopping.recipeBanhMiName', descKey: 'smartShopping.recipeBanhMiDesc', icon: '🥖' },
  { id: 'buncha', nameKey: 'smartShopping.recipeBunChaName', descKey: 'smartShopping.recipeBunChaDesc', icon: '🥗' },
  { id: 'comtam', nameKey: 'smartShopping.recipeComTamName', descKey: 'smartShopping.recipeComTamDesc', icon: '🍚' },
  { id: 'goicuon', nameKey: 'smartShopping.recipeGoiCuonName', descKey: 'smartShopping.recipeGoiCuonDesc', icon: '🥬' },
  { id: 'caritga', nameKey: 'smartShopping.recipeCaRiGaName', descKey: 'smartShopping.recipeCaRiGaDesc', icon: '🍛' },
];

const SmartShopping: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useAppSelector(s => s.auth);
  const redirectToLogin = useAuthRedirect();
  const { currentBranchId, availableProducts } = useBranchData();

  const [smartMode, setSmartMode] = useState(() => localStorage.getItem('lotte_smart_mode') === '1');
  const [activeTab, setActiveTab] = useState<'smart' | 'recipe' | 'pricewatch'>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('tab') as any) || 'smart';
  });

  // State for backend recommendations
  const [recommData, setRecommData] = useState<SmartRecommendations>({
    buyAgain: [],
    recommendedForYou: [],
    frequentlyBoughtTogether: [],
    seasonalRecommendations: []
  });
  const [loadingRecomms, setLoadingRecomms] = useState(false);

  // State for price watches
  const [priceWatches, setPriceWatches] = useState<PriceWatchRecord[]>([]);
  const [loadingWatches, setLoadingWatches] = useState(false);

  // State for setting up a watch
  const [selectedWatchItem, setSelectedWatchItem] = useState<any>(null);
  const [watchTargetPrice, setWatchTargetPrice] = useState<number>(0);
  const [watchPref, setWatchPref] = useState<'in_app' | 'email' | 'both'>('both');
  const [isWatchSubmitting, setIsWatchSubmitting] = useState(false);

  // Toggle smart mode
  const toggleSmart = () => {
    const next = !smartMode;
    setSmartMode(next);
    localStorage.setItem('lotte_smart_mode', next ? '1' : '0');
    toast.success(next ? t('smartShopping.smartModeTurnedOn') : t('smartShopping.smartModeTurnedOff'));
  };

  // Fetch recommendations
  const fetchRecommendations = async () => {
    if (!currentBranchId) return;
    setLoadingRecomms(true);
    try {
      const data = await recommendationService.getRecommendations(currentBranchId);
      setRecommData(data);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoadingRecomms(false);
    }
  };

  // Fetch price watches
  const fetchPriceWatches = async () => {
    if (!isAuthenticated) return;
    setLoadingWatches(true);
    try {
      const list = await priceWatchService.list();
      setPriceWatches(list);
    } catch (err) {
      console.error('Error fetching price watches:', err);
    } finally {
      setLoadingWatches(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [currentBranchId, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPriceWatches();
    }
  }, [isAuthenticated, activeTab]);

  const pid = (p: any) => String(p?.branch_product_id || p?.id || p?._id || '');

  // Helper: check if product is watched
  const getWatchRecord = (item: any) => {
    const id = pid(item);
    return priceWatches.find(w => String(w.branch_product_id) === id && w.status === 'active');
  };

  // Handle watch button click
  const handleWatchToggle = async (item: any) => {
    if (!isAuthenticated) {
      redirectToLogin({ action: 'watch_price' });
      return;
    }

    const existing = getWatchRecord(item);
    if (existing) {
      try {
        await priceWatchService.delete(existing._id);
        toast.success(t('smartShopping.unwatchedSuccess', { defaultValue: 'Đã ngừng theo dõi giá sản phẩm này.' }));
        fetchPriceWatches();
      } catch (err) {
        toast.error(t('common.error'));
      }
    } else {
      setSelectedWatchItem(item);
      setWatchTargetPrice(Math.round((item.price || 0) * 0.9)); // 10% discount default
      setWatchPref('both');
    }
  };

  const handleSaveWatch = async () => {
    if (!selectedWatchItem) return;
    if (watchTargetPrice <= 0 || watchTargetPrice >= selectedWatchItem.price) {
      toast.error(t('smartShopping.invalidTargetPrice', { defaultValue: 'Giá mục tiêu phải thấp hơn giá hiện tại.' }));
      return;
    }

    setIsWatchSubmitting(true);
    try {
      await priceWatchService.create(pid(selectedWatchItem), watchTargetPrice, watchPref);
      toast.success(t('smartShopping.watchCreatedSuccess', { defaultValue: 'Đã thiết lập theo dõi giá thành công!' }));
      setSelectedWatchItem(null);
      fetchPriceWatches();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setIsWatchSubmitting(false);
    }
  };

  const addToCart = async (item: any) => {
    if (!currentBranchId) {
      toast.error(t('common.selectBranchFirst'));
      return;
    }
    if (!isAuthenticated) {
      redirectToLogin({ action: 'add_to_cart' });
      return;
    }
    try {
      await dispatch(addToCartAsync({
        branchId: currentBranchId,
        branch_product_id: pid(item),
        price: Number(item?.price || 0),
        unit_price: Number(item?.price || 0),
        quantity: 1,
        product_name: item?.name,
        product_image: item?.image || item?.thumbnail || '',
        branchProduct: item,
      })).unwrap();
      toast.success(t('product.addedToCart', { name: item?.name }));
    } catch (e: any) {
      toast.error(e?.message || t('common.error'));
    }
  };

  const fmt = (n: number) => n.toLocaleString('vi-VN');

  // Unified ProductCard Component
  const ProductCard = ({ item, showWatch = false }: { item: any, showWatch?: boolean }) => {
    const isWatched = !!getWatchRecord(item);
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden group hover:shadow-xl transition-shadow border border-slate-100 dark:border-slate-700">
        <Link to={getProductUrl(item)} className="block">
          <div className="aspect-square bg-slate-50 overflow-hidden relative">
            <img
              src={item?.image || 'https://via.placeholder.com/300'}
              alt={item?.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            {item?.is_best_seller && (
              <span className="absolute top-2 left-2 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                {t('smartShopping.hot')}
              </span>
            )}
          </div>
        </Link>
        <div className="p-4">
          <p className="text-xs text-slate-400 font-bold mb-1">{item?.brand || 'Lotte'}</p>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-2 h-10 mb-2">{item?.name}</h3>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-lg font-black text-rose-600">{fmt(Number(item?.price || 0))}₫</span>
              {item?.original_price > item?.price && (
                <span className="text-xs text-slate-400 line-through">{fmt(Number(item.original_price))}₫</span>
              )}
            </div>
            <div className="flex gap-1">
              {showWatch && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleWatchToggle(item);
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    isWatched ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                  } hover:scale-110 transition-transform`}
                >
                  {isWatched ? '🔔' : '🔕'}
                </button>
              )}
              <button
                onClick={() => addToCart(item)}
                className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition-colors"
              >
                <span className="material-symbols-outlined !text-base">add_shopping_cart</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`.smart-glow{box-shadow:0 0 30px rgba(99,102,241,.15)}`}</style>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-20">
        {/* Header + Smart Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <span className="material-symbols-outlined !text-4xl text-indigo-600">auto_awesome</span>
              {t('smartShopping.title')}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{t('smartShopping.description')}</p>
          </div>
          <button
            onClick={toggleSmart}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
              smartMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 smart-glow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="material-symbols-outlined !text-xl">{smartMode ? 'psychology' : 'psychology_alt'}</span>
            {smartMode ? t('smartShopping.smartModeOn') : t('smartShopping.smartModeOff')}
            <div className={`w-10 h-5 rounded-full relative transition-colors ${smartMode ? 'bg-indigo-400' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${smartMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
          {([
            ['smart', t('smartShopping.tabSmartFeed')],
            ['recipe', t('smartShopping.tabRecipes')],
            ['pricewatch', t('smartShopping.tabPriceWatch')]
          ] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setActiveTab(k as any)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === k ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Loading Indicator */}
        {loadingRecomms && activeTab === 'smart' && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
          </div>
        )}

        {/* TAB: Smart Feed */}
        {activeTab === 'smart' && !loadingRecomms && (
          <div className="space-y-12">
            {smartMode && (
              <>
                {/* 1. Recommended for you */}
                {recommData.recommendedForYou.length > 0 && (
                  <section>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-500">recommend</span>
                      {t('smartShopping.suggestedForYou')}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {recommData.recommendedForYou.map((p: any, i: number) => (
                        <ProductCard key={i} item={p} showWatch />
                      ))}
                    </div>
                  </section>
                )}

                {/* 2. Buy again */}
                {recommData.buyAgain.length > 0 && (
                  <section>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-500">replay</span>
                      {t('smartShopping.buyAgain')}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {recommData.buyAgain.map((p: any, i: number) => (
                        <ProductCard key={i} item={p} />
                      ))}
                    </div>
                  </section>
                )}

                {/* 3. Frequently bought together */}
                {recommData.frequentlyBoughtTogether.length > 0 && (
                  <section>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-500">layers</span>
                      {t('smartShopping.frequentlyBoughtTogether', { defaultValue: 'Sản phẩm mua cùng nhau' })}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {recommData.frequentlyBoughtTogether.map((p: any, i: number) => (
                        <ProductCard key={i} item={p} showWatch />
                      ))}
                    </div>
                  </section>
                )}

                {/* 4. Seasonal */}
                {recommData.seasonalRecommendations.length > 0 && (
                  <section>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sky-500">wb_sunny</span>
                      {t('smartShopping.seasonalRecommendations', { defaultValue: 'Gợi ý theo mùa và sự kiện' })}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {recommData.seasonalRecommendations.map((p: any, i: number) => (
                        <ProductCard key={i} item={p} showWatch />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* Fallback trending list */}
            {(!smartMode || recommData.recommendedForYou.length === 0) && (
              <section>
                <h2 className="text-xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-500">trending_up</span>
                  {t('smartShopping.trendingBranch')}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(availableProducts || []).slice(0, 12).map((p: any, i: number) => (
                    <ProductCard key={i} item={p} showWatch />
                  ))}
                </div>
              </section>
            )}

            {!smartMode && (
              <div className="text-center py-16 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 rounded-3xl border-2 border-dashed border-indigo-200">
                <span className="material-symbols-outlined !text-6xl text-indigo-300 mb-4 block">psychology</span>
                <p className="text-lg font-bold text-indigo-400">{t('smartShopping.turnOnSmartMode')}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: Recipe to Cart */}
        {activeTab === 'recipe' && (
          <div>
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-500">search</span>
                    {t('smartShopping.findOrGenerateRecipe')}
                  </h3>
                  <p className="text-sm text-slate-500">{t('smartShopping.recipeDesc')}</p>
                </div>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = (e.currentTarget.elements.namedItem('recipeQ') as HTMLInputElement).value.trim();
                  if (val) {
                    const norm = val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    navigate(`/recipes/${norm}`);
                  } else {
                    toast.error(t('smartShopping.pleaseEnterDish'));
                  }
                }}
                className="flex gap-2"
              >
                <input
                  name="recipeQ"
                  type="text"
                  placeholder={t('smartShopping.recipePlaceholder')}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm font-bold text-slate-900 dark:text-white"
                />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors">
                  <span className="material-symbols-outlined !text-lg">robot_2</span> {t('smartShopping.create')}
                </button>
              </form>
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4">{t('smartShopping.popularDishes')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {RECIPES.map(r => (
                <Link
                  key={r.id}
                  to={`/recipes/${r.id}`}
                  className="p-4 rounded-2xl text-center transition-all bg-white dark:bg-slate-800 border border-slate-200 hover:border-indigo-300 hover:shadow-md block text-slate-800 dark:text-white"
                >
                  <div className="text-3xl mb-2">{r.icon}</div>
                  <div className="font-bold text-sm">{t(r.nameKey)}</div>
                  <div className="text-xs mt-1 text-slate-400">{t(r.descKey)}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* TAB: Price Watch */}
        {activeTab === 'pricewatch' && (
          <div>
            {!isAuthenticated ? (
              <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-3xl">
                <span className="text-5xl block mb-3">🔒</span>
                <p className="font-bold text-slate-400">Vui lòng đăng nhập</p>
                <p className="text-sm text-slate-400 mt-1">Đăng nhập để quản lý và nhận thông báo theo dõi giá sản phẩm.</p>
                <button
                  onClick={() => redirectToLogin({ action: 'view_pricewatch' })}
                  className="mt-4 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition-colors"
                >
                  Đăng nhập ngay
                </button>
              </div>
            ) : loadingWatches ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined !text-3xl text-amber-500">notifications_active</span>
                  <div>
                    <p className="font-bold text-slate-700 dark:text-white">
                      {t('smartShopping.watchingCount', { count: priceWatches.length })}
                    </p>
                    <p className="text-xs text-slate-500">
                      Hệ thống sẽ gửi email và thông báo khi giá sản phẩm giảm xuống bằng hoặc thấp hơn giá mục tiêu.
                    </p>
                  </div>
                </div>

                {priceWatches.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {priceWatches.map((w) => {
                      const item = {
                        ...w.product,
                        price: w.branchProduct?.price || w.current_price,
                        original_price: w.branchProduct?.original_price || w.initial_price,
                        branch_product_id: w.branch_product_id
                      };
                      return (
                        <div key={w._id} className="relative">
                          <ProductCard item={item} showWatch />
                          <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                            Mục tiêu: {fmt(w.target_price)}₫
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-3xl">
                    <span className="text-5xl block mb-3">🔕</span>
                    <p className="font-bold text-slate-400">{t('smartShopping.noWatchedProducts')}</p>
                    <p className="text-sm text-slate-400 mt-1">{t('smartShopping.noWatchedDesc')}</p>
                  </div>
                )}

                {/* Explore with watch option */}
                <h3 className="text-lg font-black text-slate-800 dark:text-white mt-10 mb-4">
                  {t('smartShopping.exploreProducts')}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(availableProducts || []).slice(0, 12).map((p: any, i: number) => (
                    <ProductCard key={i} item={p} showWatch />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* SETUP WATCH MODAL (Glassmorphism & premium UI style) */}
      {selectedWatchItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-850 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 transform scale-100 transition-all duration-350">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">notifications_active</span>
                Theo dõi giá sản phẩm
              </h3>
              <button
                onClick={() => setSelectedWatchItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl mb-4">
              <img
                src={selectedWatchItem.image || 'https://via.placeholder.com/300'}
                alt={selectedWatchItem.name}
                className="w-16 h-16 object-cover rounded-xl"
              />
              <div>
                <p className="text-xs text-slate-400 font-bold">{selectedWatchItem.brand || 'Lotte'}</p>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-2">{selectedWatchItem.name}</h4>
                <p className="text-sm font-black text-rose-600 mt-1">Giá hiện tại: {fmt(selectedWatchItem.price)}₫</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-wide">
                  Giá mục tiêu nhận thông báo (₫)
                </label>
                <input
                  type="number"
                  value={watchTargetPrice}
                  onChange={(e) => setWatchTargetPrice(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900 dark:text-white font-bold"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Giá mục tiêu phải thấp hơn giá hiện tại ({fmt(selectedWatchItem.price)}₫).
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-wide">
                  Hình thức nhận thông báo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ['in_app', '🔔 In-App'],
                    ['email', '📧 Email'],
                    ['both', '🔔+📧 Cả hai']
                  ] as const).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setWatchPref(v)}
                      className={`py-2.5 rounded-xl font-bold text-xs border text-center transition-all ${
                        watchPref === v
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setSelectedWatchItem(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveWatch}
                  disabled={isWatchSubmitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  {isWatchSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                  ) : (
                    'Bắt đầu theo dõi'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SmartShopping;
