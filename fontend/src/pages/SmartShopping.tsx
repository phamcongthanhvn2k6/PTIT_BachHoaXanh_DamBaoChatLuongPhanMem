import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { addToCartAsync } from '../slices/cartSlice';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import { toast } from '../components/Toast/toastEvent';
import { useBranchData } from '../hooks/useBranchData';
import { useTranslation } from 'react-i18next';
import { getProductUrl } from '../utils/productUrl';

// ─── Recipe data (Vietnamese grocery recipes) ────
const RECIPES = [
  { id:'pho', nameKey:'smartShopping.recipePhoName', descKey:'smartShopping.recipePhoDesc', icon:'🍜' },
  { id:'banhmi', nameKey:'smartShopping.recipeBanhMiName', descKey:'smartShopping.recipeBanhMiDesc', icon:'🥖' },
  { id:'buncha', nameKey:'smartShopping.recipeBunChaName', descKey:'smartShopping.recipeBunChaDesc', icon:'🥗' },
  { id:'comtam', nameKey:'smartShopping.recipeComTamName', descKey:'smartShopping.recipeComTamDesc', icon:'🍚' },
  { id:'goicuon', nameKey:'smartShopping.recipeGoiCuonName', descKey:'smartShopping.recipeGoiCuonDesc', icon:'🥬' },
  { id:'caritga', nameKey:'smartShopping.recipeCaRiGaName', descKey:'smartShopping.recipeCaRiGaDesc', icon:'🍛' },
];

const SmartShopping: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useAppSelector(s => s.auth);
  const redirectToLogin = useAuthRedirect();
  const { currentBranchId, availableProducts } = useBranchData();

  const [smartMode, setSmartMode] = useState(() => localStorage.getItem('lotte_smart_mode') === '1');
  const [activeTab, setActiveTab] = useState<'smart'|'recipe'|'pricewatch'>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('tab') as any) || 'smart';
  });
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('lotte_pricewatch')||'[]'); } catch { return []; }
  });

  // Toggle smart mode
  const toggleSmart = () => {
    const next = !smartMode;
    setSmartMode(next);
    localStorage.setItem('lotte_smart_mode', next ? '1' : '0');
    toast.success(next ? t('smartShopping.smartModeTurnedOn') : t('smartShopping.smartModeTurnedOff'));
  };

  // Save watchlist
  useEffect(() => { localStorage.setItem('lotte_pricewatch', JSON.stringify(watchlist)); }, [watchlist]);

  // Derive smart sections
  const trendingProducts = useMemo(() =>
    [...(availableProducts||[])].sort((a:any,b:any) => (b?.sold_count||0)-(a?.sold_count||0)).slice(0,8)
  , [availableProducts]);

  const recentlyBought = useMemo(() =>
    [...(availableProducts||[])].filter((_:any,i:number) => i%3===0).slice(0,6) // simulated from available
  , [availableProducts]);

  const recommended = useMemo(() =>
    [...(availableProducts||[])].sort((a:any,b:any) => (b?.rating||0)-(a?.rating||0)).slice(0,8)
  , [availableProducts]);

  // Price watch products
  const watchedProducts = useMemo(() =>
    (availableProducts||[]).filter((p:any) => watchlist.includes(String(p?.branch_product_id||p?.id||p?._id)))
  , [availableProducts, watchlist]);

  const addToCart = async (item: any) => {
    if (!currentBranchId) { toast.error(t('common.selectBranchFirst')); return; }
    if (!isAuthenticated) { redirectToLogin({ action:'add_to_cart' }); return; }
    try {
      await dispatch(addToCartAsync({
        branchId: currentBranchId,
        branch_product_id: String(item?.branch_product_id||item?._id||item?.id),
        price: Number(item?.price||0), unit_price: Number(item?.price||0), quantity: 1,
        product_name: item?.name, product_image: item?.images?.[0]||item?.thumbnail||'',
        branchProduct: item,
      })).unwrap();
      toast.success(t('product.addedToCart', { name: item?.name }));
    } catch(e:any) { toast.error(e?.message||t('common.error')); }
  };

  const toggleWatch = (id: string) => {
    setWatchlist(p => p.includes(id) ? p.filter(x => x!==id) : [...p, id]);
  };

  const fmt = (n:number) => n.toLocaleString('vi-VN');
  const pid = (p:any) => String(p?.branch_product_id||p?.id||p?._id||'');

  const ProductCard = ({ item, showWatch=false }: { item:any, showWatch?:boolean }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden group hover:shadow-xl transition-shadow border border-slate-100 dark:border-slate-700">
      <Link to={getProductUrl(item)} className="block">
        <div className="aspect-square bg-slate-50 overflow-hidden relative">
          <img src={item?.images?.[0]||item?.thumbnail||'https://via.placeholder.com/300'} alt={item?.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
          {item?.is_best_seller&&<span className="absolute top-2 left-2 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{t('smartShopping.hot')}</span>}
        </div>
      </Link>
      <div className="p-4">
        <p className="text-xs text-slate-400 font-bold mb-1">{item?.brand||'Lotte'}</p>
        <h3 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-2 h-10 mb-2">{item?.name}</h3>
        <div className="flex items-center justify-between">
          <span className="text-lg font-black text-rose-600">{fmt(Number(item?.price||0))}₫</span>
          <div className="flex gap-1">
            {showWatch&&<button onClick={e=>{e.preventDefault();toggleWatch(pid(item))}} className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${watchlist.includes(pid(item))?'bg-amber-100 text-amber-600':'bg-slate-100 text-slate-400'} hover:scale-110 transition-transform`}>
              {watchlist.includes(pid(item))?'🔔':'🔕'}
            </button>}
            <button onClick={()=>addToCart(item)} className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition-colors">
              <span className="material-symbols-outlined !text-base">add_shopping_cart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (<>
    <style>{`.smart-glow{box-shadow:0 0 30px rgba(99,102,241,.15)}`}</style>
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-20">
      {/* Header + Smart Toggle */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <span className="material-symbols-outlined !text-4xl text-indigo-600">auto_awesome</span>
            {t('smartShopping.title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t('smartShopping.description')}</p>
        </div>
        <button onClick={toggleSmart} className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${smartMode?'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 smart-glow':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          <span className="material-symbols-outlined !text-xl">{smartMode?'psychology':'psychology_alt'}</span>
          {smartMode ? t('smartShopping.smartModeOn') : t('smartShopping.smartModeOff')}
          <div className={`w-10 h-5 rounded-full relative transition-colors ${smartMode?'bg-indigo-400':'bg-slate-300'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${smartMode?'translate-x-5':'translate-x-0.5'}`}/>
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
        {([['smart', t('smartShopping.tabSmartFeed')],['recipe', t('smartShopping.tabRecipes')],['pricewatch', t('smartShopping.tabPriceWatch')]] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setActiveTab(k as any)} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab===k?'bg-white dark:bg-slate-700 shadow-md text-indigo-600':'text-slate-500 hover:text-slate-700'}`}>{l}</button>
        ))}
      </div>

      {/* TAB: Smart Feed */}
      {activeTab==='smart'&&<div className="space-y-12">
        {smartMode&&<>
          <section>
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-indigo-500">recommend</span>{t('smartShopping.suggestedForYou')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{recommended.map((p:any,i:number)=><ProductCard key={i} item={p} showWatch/>)}</div>
          </section>
          <section>
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-green-500">replay</span>{t('smartShopping.buyAgain')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{recentlyBought.map((p:any,i:number)=><ProductCard key={i} item={p}/>)}</div>
          </section>
        </>}
        <section>
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-rose-500">trending_up</span>{t('smartShopping.trendingBranch')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{trendingProducts.map((p:any,i:number)=><ProductCard key={i} item={p} showWatch/>)}</div>
        </section>
        {!smartMode&&<div className="text-center py-16 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 rounded-3xl border-2 border-dashed border-indigo-200">
          <span className="material-symbols-outlined !text-6xl text-indigo-300 mb-4 block">psychology</span>
          <p className="text-lg font-bold text-indigo-400">{t('smartShopping.turnOnSmartMode')}</p>
        </div>}
      </div>}

      {/* TAB: Recipe to Cart */}
      {activeTab==='recipe'&&<div>
        {/* Custom Recipe Search */}
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
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm font-bold"
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors">
              <span className="material-symbols-outlined !text-lg">robot_2</span> {t('smartShopping.create')}
            </button>
          </form>
        </div>
        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4">{t('smartShopping.popularDishes')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {RECIPES.map(r=>(
            <Link key={r.id} to={`/recipes/${r.id}`} className={`p-4 rounded-2xl text-center transition-all bg-white dark:bg-slate-800 border border-slate-200 hover:border-indigo-300 hover:shadow-md block`}>
              <div className="text-3xl mb-2">{r.icon}</div>
              <div className="font-bold text-sm">{t(r.nameKey)}</div>
              <div className={`text-xs mt-1 text-slate-400`}>{t(r.descKey)}</div>
            </Link>
          ))}
        </div>
      </div>}

      {/* TAB: Price Watch */}
      {activeTab==='pricewatch'&&<div>
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined !text-3xl text-amber-500">notifications_active</span>
          <div><p className="font-bold text-slate-700 dark:text-white">{t('smartShopping.watchingCount', { count: watchlist.length })}</p><p className="text-xs text-slate-500">{t('smartShopping.watchDesc')}</p></div>
        </div>
        {watchedProducts.length>0?
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{watchedProducts.map((p:any,i:number)=><ProductCard key={i} item={p} showWatch/>)}</div>
          :<div className="text-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-3xl"><span className="text-5xl block mb-3">🔕</span><p className="font-bold text-slate-400">{t('smartShopping.noWatchedProducts')}</p><p className="text-sm text-slate-400 mt-1">{t('smartShopping.noWatchedDesc')}</p></div>
        }
        {/* Browse all with watch */}
        <h3 className="text-lg font-black text-slate-800 dark:text-white mt-10 mb-4">{t('smartShopping.exploreProducts')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{(availableProducts||[]).slice(0,12).map((p:any,i:number)=><ProductCard key={i} item={p} showWatch/>)}</div>
      </div>}
    </main>
  </>);
};
export default SmartShopping;
