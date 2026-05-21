import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { bannerService } from '../services/bannerService';
import { hotDealService } from '../services/hotDealService';
import { promotionService } from '../services/promotionService';
import { couponService } from '../services/couponService';
import { useAppSelector, store } from '../store';
import { useTranslation } from 'react-i18next';
import { HotDealCountdown } from '../components/HotDealCountdown/HotDealCountdown';
import { InlineVoucherBadge } from '../components/PromotionImageFallback/PromotionImageFallback';
import PromotionImageDisplay from '../components/PromotionImageFallback/PromotionImageFallback';

const Promotions: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [toastMessage, setToastMessage] = useState('');
  
  // Data States
  const [heroBanner, setHeroBanner] = useState<any>(null);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [hotDeals, setHotDeals] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [myWallet, setMyWallet] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'product' | 'shipping' | 'my_wallet'>('all');
  const [sortOption, setSortOption] = useState('newest');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal State
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resBanners, resPromos, resHotDeals, resCoupons, resCouponWallet, resPromoWallet] = await Promise.all([
        bannerService.getBanners(),
        promotionService.getPromotions(),
        hotDealService.getHotDeals(),
        couponService.getCoupons(),
        user ? couponService.getMyWallet() : Promise.resolve({ success: true, data: [] }),
        user ? promotionService.getMyPromotionWallet() : Promise.resolve({ success: true, data: [] }),
      ]);
      
      const activeBanners = ((resBanners as any)?.data || resBanners || []).filter((b: any) => b.is_active);
      if (activeBanners.length > 0) setHeroBanner(activeBanners[0]);
      
      setPromotions(((resPromos as any)?.data || resPromos || []).filter((p: any) => p.is_active));
      
      const dealData = (resHotDeals as any)?.data || resHotDeals || [];
      setHotDeals(dealData.filter((d: any) => d.is_active).map((deal: any) => ({
        ...deal,
        id: deal.id || deal._id,
        title: deal.title || deal.product_name || `Hot Deal #${String(deal.id || deal._id || '').slice(-6)}`,
        price: Number(deal.price ?? deal.deal_price ?? 0),
        image_url: deal.image_url || deal.image || '',
      })));
      
      setCoupons(((resCoupons as any)?.data || resCoupons || []).filter((c: any) => c.is_active));
      
      // Merge coupon wallet + promotion wallet into unified wallet
      const couponWalletItems = ((resCouponWallet as any)?.data || []).map((w: any) => ({
        ...w,
        id: w.id || w._id,
        walletItemType: 'coupon',
      }));
      const promoWalletItems = ((resPromoWallet as any)?.data || []).map((w: any) => ({
        ...w,
        id: w.id || w._id,
        walletItemType: 'promotion',
      }));
      setMyWallet([...couponWalletItems, ...promoWalletItems]);

    } catch (err) {
      console.error('Lỗi tải dữ liệu khuyến mãi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Combined List for Left Column
  const combinedList = useMemo(() => {
    // If My Wallet tab is active, only show wallet items
    if (activeTab === 'my_wallet') {
      let list = [...myWallet].map(w => ({
         ...w,
         id: w.id || w._id,
         itemType: w.code ? 'coupon' : 'promotion',
         title: w.title || w.code || 'Voucher',
         image_url: w.image || w.image_url || w.banner_image || '',
         badge: w.voucher_type === 'shipping' ? t('promotions.shippingVoucher') : t('promotions.productVoucher'),
         voucher_type: w.voucher_type || 'product',
         user_claimed: true,
      }));
      return list;
    }

    const p = promotions.map(pr => ({ 
      ...pr, 
      id: pr.id || pr._id, 
      itemType: 'promotion', 
      image_url: pr.image_url || pr.image || pr.banner_image || '', 
      badge: pr.voucher_type === 'shipping' ? t('promotions.shippingVoucher') : t('promotions.productVoucher'),
      voucher_type: pr.voucher_type || 'product',
      user_claimed: myWallet.some(w => (w.walletItemType === 'promotion') && (String(w.id) === String(pr._id) || String(w.id) === String(pr.id)))
    }));

    const c = coupons.map(cu => ({ 
      ...cu, 
      id: cu.id || cu._id,
      itemType: 'coupon', 
      title: cu.title || cu.code, 
      description: cu.description || t('promotions.couponAutoDesc', {
        value: Number(cu.discount_value || 0).toLocaleString('vi-VN'),
        unit: String(cu.type || '').toLowerCase() === 'percent' ? '%' : 'đ',
        min: Number(cu.min_order_amount || cu.min_order_value || 0).toLocaleString('vi-VN'),
        defaultValue: `Giảm ${Number(cu.discount_value || 0).toLocaleString('vi-VN')}${String(cu.type || '').toLowerCase() === 'percent' ? '%' : 'đ'} cho đơn từ ${Number(cu.min_order_amount || cu.min_order_value || 0).toLocaleString('vi-VN')}đ`
      }), 
      start_date: cu.start_date || cu.valid_from, 
      end_date: cu.end_date || cu.valid_until, 
      image_url: cu.image || cu.image_url || cu.banner_image || '', 
      badge: cu.voucher_type === 'shipping' ? t('promotions.shippingVoucher') : t('promotions.productVoucher'),
      voucher_type: cu.voucher_type || 'product',
      user_claimed: myWallet.some(w => (w.walletItemType === 'coupon') && (String(w.id) === String(cu._id) || String(w.id) === String(cu.id)))
    }));
    
    let list = [...p, ...c];
    
    // 2. Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        (item.title?.toLowerCase().includes(q) || 
         item.description?.toLowerCase().includes(q) || 
         item.code?.toLowerCase().includes(q))
      );
    }

    // 3. Filter by Tab (Product vs Shipping)
    if (activeTab === 'product') {
      list = list.filter(item => item.voucher_type === 'product');
    } else if (activeTab === 'shipping') {
      list = list.filter(item => item.voucher_type === 'shipping');
    }

    // 5. Sort
    list.sort((a, b) => {
       if (sortOption === 'newest') return new Date(b.created_at || b.start_date || 0).getTime() - new Date(a.created_at || a.start_date || 0).getTime();
       if (sortOption === 'discount') return (b.value || b.discount_value || 0) - (a.value || a.discount_value || 0);
       if (sortOption === 'ending_soon') return new Date(a.end_date || a.valid_until || 9999999999999).getTime() - new Date(b.end_date || b.valid_until || 9999999999999).getTime();
       return 0;
    });

    return list;
  }, [promotions, coupons, myWallet, searchQuery, activeTab, sortOption]);

  // Pagination Logic
  const totalPages = Math.ceil(combinedList.length / itemsPerPage);
  const currentItems = combinedList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, sortOption]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${t('promotions.copied')} ${text}`);
  };

  const handleHeroBuy = () => {
    document.getElementById('promotion-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
  };

  const handleClaim = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const { isAuthenticated, user: authUser } = store.getState().auth;
    if (!isAuthenticated && !authUser && !user) {
      showToast(t('promotions.loginToClaim'));
      return;
    }

    const id = item.id || item._id;
    setClaimingId(id);
    try {
      let res: any;
      if (item.itemType === 'coupon') {
        res = await couponService.claimCoupon(id);
      } else {
        // Promotion claim
        const claimResult = await promotionService.claimPromotion(id);
        res = { success: !!claimResult?.success, message: claimResult?.message };
      }
      if (res.success) {
        showToast(t('promotions.claimSuccess'));
        await fetchData(); // Refresh wallet
      } else {
        showToast(res.message || t('promotions.claimFailed'));
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || t('common.error');
      showToast(errMsg);
    } finally {
      setClaimingId(null);
    }
  };

  const bannerImg = heroBanner?.image_url || heroBanner?.image || "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?q=80&w=1200";

  return (
    <div className="relative min-h-screen bg-[#F5F5F7] dark:bg-background-dark font-sans text-gray-900 dark:text-slate-100 antialiased">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Terminate Hero Banner if not needed */}
        {heroBanner && (
          <section className="mb-10 relative h-62.5 md:h-100 rounded-xl overflow-hidden shadow-sm">
            <img
              alt="Promotion Banner"
              className="w-full h-full object-cover"
              src={bannerImg}
            />
            <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/50 to-transparent flex items-center px-6 md:px-12">
              <div className="max-w-lg text-white">
                <span className="bg-lotteYellow text-black font-bold px-3 py-1 rounded text-sm uppercase mb-4 inline-block shadow-sm">
                  {heroBanner.promotion_badge || t('promotions.heroBadge')}
                </span>
                <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight shadow-sm text-white drop-shadow-lg" dangerouslySetInnerHTML={{__html: heroBanner.title}}></h1>
                <p className="text-lg md:text-xl opacity-100 font-medium mb-8 drop-shadow-md text-white/90" dangerouslySetInnerHTML={{__html: heroBanner.description}}></p>
                <div className="flex space-x-4">
                  <button onClick={handleHeroBuy} className="bg-lotteRed hover:bg-red-700 text-white font-bold py-3 px-6 md:px-8 rounded-xl transition duration-300 shadow-lg cursor-pointer">
                    {t('promotions.huntVoucher')}
                  </button>
                  {heroBanner.link && (
                    <button onClick={() => navigate(heroBanner.link)} className="bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-md text-white font-bold py-3 px-6 md:px-8 rounded-xl transition duration-300 cursor-pointer">
                      {t('promotions.viewDetail')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Voucher Center Title */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4" id="promotion-section">
           <div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('promotions.voucherCenter')}</h2>
              <p className="text-gray-500 font-medium mt-1">{t('promotions.voucherCenterDesc')}</p>
           </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:w-2/3 max-w-full overflow-hidden">
            
            {/* Search & Filter Section */}
            <section className="mb-8 bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
              
              <div className="flex flex-wrap border-b border-gray-100 pb-2">
                 <button 
                  onClick={() => setActiveTab('all')} 
                  className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'all' ? 'border-lotteRed text-lotteRed' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                 >
                    {t('promotions.allPromotions')}
                 </button>
                 <button 
                  onClick={() => setActiveTab('product')} 
                  className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'product' ? 'border-lotteRed text-lotteRed' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                 >
                    <span className="material-symbols-outlined text-[18px]">shopping_bag</span> {t('promotions.productVoucher')}
                 </button>
                 <button 
                  onClick={() => setActiveTab('shipping')} 
                  className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'shipping' ? 'border-lotteRed text-lotteRed' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                 >
                    <span className="material-symbols-outlined text-[18px]">local_shipping</span> {t('promotions.shippingVoucher')}
                 </button>
                 <button 
                  onClick={() => setActiveTab('my_wallet')} 
                  className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ml-auto ${activeTab === 'my_wallet' ? 'border-black text-black dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                 >
                    <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span> {t('promotions.myWallet')} ({myWallet.length})
                 </button>
              </div>

              <div className="flex flex-col md:flex-row gap-4 justify-between items-center px-2 pb-2">
                <div className="relative w-full md:w-1/2">
                   <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                   <input 
                     type="text" 
                     placeholder={t('promotions.searchPlaceholder')} 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-transparent focus:bg-white focus:border-lotteRed rounded-lg outline-none transition-all text-sm"
                   />
                </div>
                <div className="flex items-center space-x-2 text-sm w-full md:w-auto">
                  <span className="text-gray-500 whitespace-nowrap font-medium">{t('common.sortBy')}:</span>
                  <select 
                    value={sortOption} 
                    onChange={(e) => setSortOption(e.target.value)}
                    className="border border-gray-200 bg-white dark:bg-slate-800 rounded-lg py-1.5 px-3 text-sm outline-none font-semibold w-full md:w-auto"
                  >
                    <option value="newest">{t('promotions.sortNewest')}</option>
                    <option value="discount">{t('promotions.sortDiscount')}</option>
                    <option value="ending_soon">{t('promotions.sortEndingSoon')}</option>
                  </select>
                </div>
              </div>

            </section>

            {/* Combined List Grid */}
            {loading ? (
                <div className="grid grid-cols-1 gap-4 opacity-60 pointer-events-none">
                   {[1,2,3,4].map(n => (
                      <div key={n} className="bg-white rounded-xl h-36 animate-pulse border border-gray-100 flex overflow-hidden">
                         <div className="w-36 h-full bg-gray-200"></div>
                         <div className="p-4 flex flex-col flex-1">
                           <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                           <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                           <div className="mt-auto h-8 bg-gray-200 rounded w-24 self-end"></div>
                         </div>
                      </div>
                   ))}
                </div>
            ) : currentItems.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl shadow-sm text-gray-500 flex flex-col items-center border border-gray-100">
                   <span className="material-symbols-outlined text-6xl mb-4 text-gray-200">confirmation_number</span>
                   <p className="font-bold text-lg mb-1">{t('promotions.noVouchers')}</p>
                   {activeTab === 'my_wallet' ? (
                     <p className="text-sm">{t('promotions.noVouchersWallet')}</p>
                   ) : (
                     <p className="text-sm">{t('promotions.noVouchersSearch')}</p>
                   )}
                   <button onClick={() => { setSearchQuery(''); setActiveTab('all'); }} className="mt-6 px-6 py-2 bg-lotteRed text-white rounded-lg font-bold hover:bg-red-700 transition">{t('promotions.exploreVouchers')}</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 relative">
                  {currentItems.map((item: any) => {
                    const itemId = item.id || item._id;
                    const now = Date.now();
                    const endRaw = item.end_date || item.valid_until;
                    const endTs = endRaw ? new Date(endRaw).getTime() : null;
                    const isExpired = Boolean(endTs && now > endTs);
                    const total = Number(item.total_quantity || item.usage_limit || 0);
                    const used = Number(item.claimed_count || item.used_count || item.sold_count || 0);
                    const remaining = item.remaining_quantity !== undefined && item.remaining_quantity !== null
                      ? Number(item.remaining_quantity)
                      : (total > 0 ? Math.max(0, total - used) : null);
                    const isSoldOut = Boolean(item.is_sold_out || (remaining !== null && remaining <= 0));
                    
                    const isLocked = isSoldOut || isExpired;
                    const isClaimed = item.user_claimed;

                     return (
                        <article 
                          key={`${item.itemType}_${String(itemId)}`} 
                        className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-shadow flex overflow-hidden border ${item.voucher_type === 'shipping' ? 'border-teal-100' : 'border-red-100'} cursor-pointer h-36 relative`}
                           onClick={() => handleItemClick(item)}
                        >
                           {/* Left Graphic — shows uploaded image or fallback */}
                            <div className="relative h-full flex shrink-0">
                               <InlineVoucherBadge
                                 imageUrl={item.image_url}
                                 voucherType={item.voucher_type}
                                 type={item.type}
                               />
                               {item.badge_text && (
                                 <div className="absolute top-0 left-0 bg-lotteRed text-white px-2 py-0.5 rounded-br-lg text-[10px] font-black z-10 shadow-sm uppercase">
                                   {item.badge_text}
                                 </div>
                               )}
                            </div>

                           {/* Body */}
                            <div className="p-4 flex-1 flex flex-col justify-between overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white to-gray-50 dark:from-slate-800 dark:to-slate-900">
                               <div className="flex justify-between items-start gap-4">
                                  <div>
                                     <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1 mb-1 text-base">
                                         {item.title}
                                     </h3>
                                     <p className="text-gray-500 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed">
                                         {item.description}
                                     </p>
                                  </div>
                               </div>

                               <div className="flex items-end justify-between mt-auto pt-2">
                                  <div className="flex flex-col">
                                     {total > 0 && !isSoldOut && (
                                       <div className="w-32 mb-1.5">
                                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden mb-1">
                                             <div className={`h-full rounded-full ${remaining !== null && (remaining / total) < 0.2 ? 'bg-red-500' : 'bg-lotteRed'}`} style={{ width: `${Math.min(100, Math.max(0, ((total - (remaining||0)) / total) * 100))}%` }}></div>
                                          </div>
                                          <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                                            <span>Đã dùng {total - (remaining||0)}</span>
                                            <span className="text-lotteRed">Còn {remaining}</span>
                                          </div>
                                       </div>
                                     )}
                                     <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
                                        {isSoldOut ? t('promotions.soldOut') : isExpired ? t('promotions.expired') : endRaw ? `HSD: ${new Date(endRaw).toLocaleDateString('vi-VN')}` : t('promotions.unlimited')}
                                     </span>
                                  </div>
                                  
                                  {/* Claim Button */}
                                  {activeTab === 'my_wallet' ? (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); showToast(t('promotions.inWalletMsg')); }}
                                      className="px-5 py-1.5 bg-black text-white text-xs font-bold rounded hover:bg-gray-800 transition shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
                                    >
                                      {t('promotions.inWallet')}
                                    </button>
                                  ) : isClaimed ? (
                                    <button 
                                      onClick={(e) => e.stopPropagation()}
                                      className="px-5 py-1.5 bg-green-50 text-green-700 border border-green-200 text-xs font-bold rounded transition whitespace-nowrap cursor-default"
                                    >
                                      ✓ {t('promotions.claimed')}
                                    </button>
                                  ) : isLocked ? (
                                    <button 
                                      disabled
                                      className="px-5 py-1.5 bg-gray-100 text-gray-400 text-xs font-bold rounded cursor-not-allowed whitespace-nowrap"
                                    >
                                      {t('promotions.locked')}
                                    </button>
                                  ) : (item.itemType === 'promotion' && !item.claim_campaign) ? (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); navigate('/products'); }}
                                      className="px-5 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 text-xs font-bold rounded transition whitespace-nowrap cursor-pointer"
                                    >
                                      {t('promotions.buyNow')}
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={(e) => handleClaim(e, item)}
                                      disabled={claimingId === itemId}
                                      className={`px-5 py-1.5 text-white text-xs font-bold rounded hover:bg-red-700 transition shadow-sm active:scale-95 whitespace-nowrap ${claimingId === itemId ? 'bg-red-400 cursor-wait' : 'bg-lotteRed'}`}
                                    >
                                      {claimingId === itemId ? t('promotions.claiming') : t('promotions.claimVoucher')}
                                    </button>
                                  )}
                               </div>
                            </div>
                        </article>
                     );
                  })}
                </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
               <div className="mt-8 mb-8 flex items-center justify-center gap-2">
                  <button 
                     onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); document.getElementById('promotion-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                     disabled={currentPage === 1}
                     className="size-8 flex items-center justify-center bg-white border border-gray-200 rounded-full text-sm font-bold disabled:opacity-50 hover:bg-gray-50 transition"
                  >
                     <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  {[...Array(totalPages)].map((_, i) => {
                     // Simple pagination rendering
                     if (totalPages > 5 && i !== 0 && i !== totalPages - 1 && Math.abs(i + 1 - currentPage) > 1) {
                         if (i + 1 === currentPage - 2 || i + 1 === currentPage + 2) {
                             return <span key={i} className="px-1 text-gray-400">...</span>;
                         }
                         return null;
                     }
                     return (
                         <button
                            key={i}
                            onClick={() => { setCurrentPage(i+1); document.getElementById('promotion-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                            className={`size-8 flex items-center justify-center rounded-full text-sm font-bold transition-all ${currentPage === i+1 ? 'bg-black text-white shadow-md' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
                         >
                            {i + 1}
                         </button>
                     )
                  })}
                  <button 
                     onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); document.getElementById('promotion-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                     disabled={currentPage === totalPages}
                     className="size-8 flex items-center justify-center bg-white border border-gray-200 rounded-full text-sm font-bold disabled:opacity-50 hover:bg-gray-50 transition"
                  >
                     <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
               </div>
             )}
           </div>

           {/* Right Column - Sidebar */}
          <aside className="lg:w-1/3 space-y-6 lg:sticky lg:top-[100px] self-start max-h-[calc(100vh-120px)] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            
            {/* Wallet Quick Summary (If Logged In) */}
            {user && (
               <section className="bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-lg p-5 border border-gray-800 text-white relative overflow-hidden">
                 <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-4">
                     <div className="size-10 bg-white/10 rounded-full flex items-center justify-center shrink-0">
                       <span className="material-symbols-outlined text-white">account_balance_wallet</span>
                     </div>
                     <div>
                       <h3 className="font-bold">{t('promotions.walletSummary')}</h3>
                       <p className="text-xs text-gray-400">{t('promotions.collected')}: <strong className="text-white">{myWallet.length} {t('promotions.codes')}</strong></p>
                     </div>
                   </div>
                   
                   <button onClick={() => setActiveTab('my_wallet')} className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition">
                     {t('promotions.viewAllWallet')}
                   </button>
                 </div>
                 <div className="absolute -right-4 -bottom-4 text-white/5 pointer-events-none">
                     <span className="material-symbols-outlined text-8xl">local_activity</span>
                 </div>
               </section>
            )}

            {/* Hot Deals Section */}
            <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black flex items-center uppercase tracking-tight text-gray-900 dark:text-white">
                  <span className="material-symbols-outlined text-orange-500 mr-2 text-2xl fill-1">local_fire_department</span>
                  {t('promotions.hotDeals')}
                </h2>
                <a className="text-xs text-blue-600 font-bold hover:underline cursor-pointer bg-blue-50 px-2 py-1 rounded dark:bg-slate-800 dark:text-blue-400" onClick={() => navigate('/products')}>
                  {t('promotions.goShop')}
                </a>
              </div>
              <div className="space-y-4">
                {hotDeals.filter(d => d.is_active).slice(0, 4).map((deal: any, idx: number) => (
                    <div key={deal.id || idx} onClick={() => navigate(`/products/${deal.product_id || 1}`)} className="flex items-center space-x-4 p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer group border border-transparent hover:border-gray-100">
                      <div className="w-16 h-16 shrink-0 bg-gray-100 dark:bg-slate-850 rounded-lg overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm relative">
                          <img
                             alt={deal.title || 'deal'}
                             className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                             src={deal.image_url || 'https://images.unsplash.com/photo-1607082349566-187342175e1f?w=100&q=80'}
                             onError={(e) => {
                               e.currentTarget.src = 'https://images.unsplash.com/photo-1607082349566-187342175e1f?w=100&q=80';
                             }}
                          />
                          {deal.discount_percent && (
                             <div className="absolute top-0 right-0 bg-lotteRed text-white text-[9px] font-black px-1 rounded-bl-lg">
                                -{deal.discount_percent}%
                             </div>
                          )}
                      </div>
                      <div className="grow min-w-0">
                          <h4 className="text-sm font-bold line-clamp-1 text-gray-800 dark:text-white group-hover:text-lotteRed transition-colors" title={deal.title}>{deal.title || t('promotions.productDeal')}</h4>
                          <div className="flex items-baseline space-x-2 mt-0.5 mb-1">
                             {deal.price && <span className="text-lotteRed font-bold text-sm tracking-tight">{deal.price.toLocaleString('vi-VN')}đ</span>}
                             {deal.original_price && <span className="text-gray-400 line-through text-[10px]">{deal.original_price.toLocaleString('vi-VN')}đ</span>}
                          </div>
                          <HotDealCountdown endDate={deal.end_date} />
                      </div>
                    </div>
                ))}

                {hotDeals.length === 0 && !loading && (
                    <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">{t('promotions.noHotDeals')}</p>
                )}
              </div>
            </section>

            {/* Banners Extra Section */}
            <section className="space-y-4">
              <div 
                onClick={() => { setActiveTab('shipping'); document.getElementById('promotion-section')?.scrollIntoView({ behavior: 'smooth' }); }} 
                className="rounded-xl p-6 relative overflow-hidden group cursor-pointer shadow-md border border-teal-500 hover:scale-[1.02] transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)' }}
              >
                <div className="relative z-10">
                  <h3 className="text-xl font-extrabold mb-1 text-white opacity-100 inline-block drop-shadow-md uppercase">{t('promotions.freeShipTitle')}</h3>
                  <p className="text-sm text-teal-50 font-medium mb-4 drop-shadow-sm" dangerouslySetInnerHTML={{ __html: t('promotions.freeShipDesc') }}>
                  </p>
                  <span className="inline-block bg-white text-teal-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase shadow-sm group-hover:bg-teal-50 transition">
                    {t('promotions.huntNow')}
                  </span>
                </div>
                <span className="material-symbols-outlined absolute -right-2 -bottom-4 text-8xl text-white/20 group-hover:scale-110 transition-transform duration-500 rotate-12">moped</span>
              </div>
            </section>
          </aside>
        </div>
      </main>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedItem(null)}>
           <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
             {/* Header — show uploaded image or colored fallback */}
             <div className="h-64 relative overflow-hidden bg-gray-100 dark:bg-slate-800">
                 <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 size-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition z-20">
                    <span className="material-symbols-outlined text-xl">close</span>
                 </button>
                 <PromotionImageDisplay
                   imageUrl={selectedItem.image_url || selectedItem.image || selectedItem.banner_image}
                   voucherType={selectedItem.voucher_type}
                   type={selectedItem.type}
                   alt={selectedItem.title}
                   className="rounded-none w-full h-full object-cover"
                   aspectRatio=""
                 />
                 <div className="absolute -bottom-4 inset-x-0 mx-auto flex gap-2 justify-center drop-shadow-sm w-full overflow-hidden">
                    {Array(15).fill(0).map((_, i) => (
                       <div key={i} className="size-8 bg-white dark:bg-slate-900 rounded-full shrink-0"></div>
                    ))}
                 </div>
             </div>
             
             {/* Body */}
             <div className="p-6 pt-8 overflow-y-auto">
                <div className="text-center mb-6">
                   <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight mb-2">
                       {selectedItem.title || selectedItem.code}
                   </h2>
                   {selectedItem.itemType === 'coupon' && (
                     <div className="inline-block bg-gray-100 dark:bg-slate-800 px-4 py-1.5 rounded-lg border border-dashed border-gray-300 font-mono font-bold text-gray-800 dark:text-slate-200 text-lg tracking-widest mt-2 select-all">
                       {selectedItem.code}
                     </div>
                   )}
                </div>
                
                <div className="space-y-4">
                   <div className="flex gap-3 text-sm">
                      <span className="material-symbols-outlined text-gray-400">info</span>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                         {selectedItem.description}
                      </p>
                   </div>
                   
                   {(selectedItem.min_order > 0 || selectedItem.min_order_value > 0 || selectedItem.min_order_amount > 0) && (
                      <div className="flex gap-3 text-sm">
                         <span className="material-symbols-outlined text-gray-400">receipt_long</span>
                         <p className="text-gray-600 dark:text-gray-300 font-medium">
                            {t('promotions.minOrder')} <span className="font-bold text-gray-900 dark:text-white">{(selectedItem.min_order || selectedItem.min_order_value || selectedItem.min_order_amount || 0).toLocaleString('vi-VN')}đ</span>
                         </p>
                      </div>
                   )}

                   {selectedItem.usage_per_user && selectedItem.usage_per_user > 0 && (
                      <div className="flex gap-3 text-sm">
                         <span className="material-symbols-outlined text-gray-400">person</span>
                         <p className="text-gray-600 dark:text-gray-300 font-medium">
                            Giới hạn: <span className="font-bold text-gray-900 dark:text-white">{selectedItem.usage_per_user} lần / người dùng</span>
                         </p>
                      </div>
                   )}

                   {selectedItem.stackable && (
                      <div className="flex gap-3 text-sm">
                         <span className="material-symbols-outlined text-gray-400">layers</span>
                         <p className="text-gray-600 dark:text-gray-300 font-medium">
                            <span className="font-bold text-green-600 dark:text-green-400">Có thể áp dụng cùng khuyến mãi khác</span>
                         </p>
                      </div>
                   )}

                   {(selectedItem.start_date || selectedItem.end_date) && (
                      <div className="flex gap-3 text-sm">
                         <span className="material-symbols-outlined text-gray-400">schedule</span>
                         <p className="text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
                            {t('promotions.expiryDate')}<br/>
                            <span className="font-bold text-gray-900 dark:text-white text-xs mt-1 inline-block">
                               {selectedItem.start_date ? new Date(selectedItem.start_date).toLocaleString('vi-VN', { hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '...'} - 
                               {selectedItem.end_date ? new Date(selectedItem.end_date).toLocaleString('vi-VN', { hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : ` ${t('promotions.noExpiry')}`}
                            </span>
                         </p>
                      </div>
                   )}
                </div>
             </div>

             {/* Footer Actions */}
             <div className="p-6 pt-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 mt-auto">
                {selectedItem.user_claimed ? (
                    <button 
                       onClick={() => setSelectedItem(null)} 
                       className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-green-700 transition flex items-center justify-center shadow-lg mt-6 cursor-pointer"
                    >
                       ✓ {t('promotions.claimed')} — {t('promotions.close')}
                    </button>
                ) : (selectedItem.itemType === 'promotion' && !selectedItem.claim_campaign) ? (
                    <button 
                       onClick={() => { setSelectedItem(null); navigate('/products'); }} 
                       className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-base transition flex items-center justify-center shadow-lg shadow-blue-500/30 mt-6 cursor-pointer"
                    >
                       {t('promotions.buyNow')}
                    </button>
                ) : (
                    <button 
                       onClick={(e) => { handleClaim(e, selectedItem); }} 
                       className={`w-full text-white py-3.5 rounded-xl font-bold text-base transition flex items-center justify-center shadow-lg mt-6 cursor-pointer ${selectedItem.voucher_type === 'shipping' ? 'bg-teal-500 hover:bg-teal-600 shadow-teal-500/30' : 'bg-lotteRed hover:bg-red-700 shadow-red-500/30'}`}
                    >
                       {t('promotions.claimVoucher')} 
                    </button>
                )}
                {selectedItem.itemType === 'coupon' && selectedItem.code && (
                   <button 
                      onClick={() => copyToClipboard(selectedItem.code)} 
                      className="w-full mt-3 bg-gray-50 text-gray-600 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition border border-gray-200"
                   >
                      {t('promotions.copyCode')}
                   </button>
                )}
             </div>
           </div>
        </div>
      )}

      {/* Toast Overlay */}
      {toastMessage && (
      <div className="fixed bottom-8 right-8 inset-x-0 z-300 mx-auto w-max max-w-[90vw]">
        <div className="bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-gray-700 font-bold flex gap-3 text-sm animate-slide-up-fade items-center">
          <span className="material-symbols-outlined text-green-400">check_circle</span>
          {toastMessage}
        </div>
      </div>
      )}
    </div>
  );
};

export default Promotions;