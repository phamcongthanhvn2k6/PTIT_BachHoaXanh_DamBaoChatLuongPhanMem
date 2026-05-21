import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store';
import { loadLoyaltyTransactions } from '../slices/loyaltySlice';
import toast from 'react-hot-toast';

/* ── reward catalogue (static for now — replace with API later) ── */
interface RewardItem {
  id: string;
  category: string;
  title: string;
  image: string;
  pointsCost: number;
  badge?: string;
  badgeColor?: string;
}

const REWARDS: RewardItem[] = [
  {
    id: 'rw1',
    category: 'food',
    title: { vi: 'Giảm 20$ cho mọi đơn hàng', en: '$20 off any order', ja: '全注文から$20割引' } as any,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBhltiTmSgZqDmAi4pqA5RA4KddI67QuqhBjglDNicMqfHLhdkk5EaUhK3xnsaXtD9B8cLZ8jaCsJpdk1pgn_RS--WLMeF2p4dnZmqfLXszbFeJuUFkf8zFP2ZzsAXz0p2QZwkvRhmoLN02vrtHTvRu4h2YIkoMvU2ccHvzEWpIgHj6enKlh38GZa53wAoN0dRJnxa-i7xbV55kLtL2SA5uSl1Xxx4boTGiutUWMwWeKMGESAJ-XYYVulw9IJ587_-M1q2FPzbs6ys',
    pointsCost: 2000,
    badge: 'Hot Deal',
    badgeColor: 'bg-primary',
  },
  {
    id: 'rw2',
    category: 'lifestyle',
    title: { vi: 'Cà phê Starbucks miễn phí', en: 'Free Starbucks Coffee', ja: 'スターバックスコーヒー無料' } as any,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5UiplLUnkoVqE8NRn_5be8tufonZCAZYnIhzI2IbDyq-vYVVv4JIvSF_2jnaStu_wFmNLRIItCw7wUe9vSPILyuaUWloBmN-QxEJh_0SDMughfILw4d4qRHRS3MStF36L4Tlt52wQdwtxi9Mm_BHiSrdx_Ew8evnHC-GICmAjTmd99i23dIg75KXPoJuS4B8zxhQub1D2urIy_5IYvcOugCN8LuoiZUwHFxrfVcyvjgaKxKZUiIv_Ghh5uMzrP8Ve9tCz3tVIcnI',
    pointsCost: 850,
  },
  {
    id: 'rw3',
    category: 'entertainment',
    title: { vi: '2 vé xem phim CGV', en: '2 CGV Movie Tickets', ja: 'CGV映画チケット2枚' } as any,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIcj7xMHZa1GucQUf3CVDiCAchATo6R_hWE0vVhcU4Q_LCuY61iAYL0bJGy0K_QjJg16GMeV3_fM_q5IyBZ3QHvGswq6KOYx1jeV8CLrk4fl6EbjXwTdekrsD0q3jFSJ9XhetuqSjdzconOmGG7FG1dspoHXwqfjl0VWzVXRsh8wUpLUWVfpm5Z7rbNdUWWDnx_a6wfXm36aSBLREsJCaIewiYixVpvCFRdKOStQ0X2GButhPcrQm4i-V67wiRfFDYIUBqgm9nsJg',
    pointsCost: 3500,
    badge: 'Member Exclusive',
    badgeColor: 'bg-gold',
  },
  {
    id: 'rw4',
    category: 'home',
    title: { vi: 'Nồi chiên không dầu (Bạc)', en: 'Air Fryer (Silver)', ja: 'エアフライヤー（シルバー）' } as any,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuApJt-whY327gAMWaTRebasBXgfAASWqYW8Zt6yk0wZMlAabi5p6bZSz-Y51qhKWOFZ7rN9v7Y0dfLJxW2UXNCmBXxXef7HsS10EzyU4LcXMoW6o3aRP2poHF6Hhb6FSQGBhTWH1t_xO1lchB-fEOAJ6E5oBhnX2XiEo3TttiBgObkljszUKFxqm6zayKlmng1v9NBr2hyaRVzutf7Kfj7vug05wCAUR9Gd287jPnN4F-P08Ra3G8k2XuX3F0Ql1aC1cfS2SrRgonQ',
    pointsCost: 15000,
  },
];

const CATEGORIES = [
  { key: 'all', vi: 'Tất cả phần thưởng', en: 'All Rewards', ja: 'すべての報酬' },
  { key: 'food', vi: 'Ăn uống', en: 'Food & Drink', ja: '飲食' },
  { key: 'lifestyle', vi: 'Phong cách sống', en: 'Lifestyle', ja: 'ライフスタイル' },
  { key: 'entertainment', vi: 'Giải trí', en: 'Entertainment', ja: 'エンタメ' },
  { key: 'home', vi: 'Nhà cửa & Sống', en: 'Home & Living', ja: 'ホーム＆リビング' },
];

const LoyaltyRewards: React.FC = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAppSelector(state => state.auth);
  const { transactions, status, error } = useAppSelector(state => state.loyalty);

  const [displayPoints, setDisplayPoints] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const lang = (i18n.resolvedLanguage || i18n.language || 'vi').substring(0, 2) as 'vi' | 'en' | 'ja';

  useEffect(() => {
    if (currentUser?.id) {
      dispatch(loadLoyaltyTransactions());
    }
  }, [dispatch, currentUser?.id]);

  useEffect(() => {
    // Count up animation
    let startTimestamp: number | null = null;
    const duration = 1000;
    const initialPoints = 0;
    const targetPoints = currentUser?.lotte_points || 0;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setDisplayPoints(Math.floor(progress * (targetPoints - initialPoints) + initialPoints));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [currentUser?.lotte_points]);

  const levelProgress = Math.min(((currentUser?.lotte_points || 0) / 10000) * 100, 100).toFixed(0);

  const handleRedeem = useCallback(async (reward: RewardItem) => {
    const userPoints = currentUser?.lotte_points || 0;
    if (userPoints < reward.pointsCost) {
      toast.error(t('loyalty.notEnoughPoints', 'Không đủ điểm để đổi phần thưởng này'));
      return;
    }

    setRedeemingId(reward.id);
    try {
      const rewardTitle = typeof reward.title === 'object'
        ? (reward.title as any)[lang] || (reward.title as any).en
        : reward.title;

      // Call the loyalty redeem API — deducts points & records transaction server-side
      const { dataService } = await import('../services/dataService');
      await dataService.redeemLoyaltyPoints(reward.pointsCost, reward.id, rewardTitle);

      toast.success(
        lang === 'en' ? `Successfully redeemed "${rewardTitle}"!`
          : lang === 'ja' ? `「${rewardTitle}」を交換しました！`
          : `Đã đổi thành công "${rewardTitle}"!`
      );
      // Reload transactions to show the new redemption
      dispatch(loadLoyaltyTransactions());
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '';
      toast.error(msg || (lang === 'en' ? 'Failed to redeem reward' : lang === 'ja' ? '交換に失敗しました' : 'Không thể đổi phần thưởng'));
    } finally {
      setRedeemingId(null);
    }
  }, [currentUser, lang, dispatch, t]);

  const getLocalizedTitle = (reward: RewardItem): string => {
    if (typeof reward.title === 'object') return (reward.title as any)[lang] || (reward.title as any).en || '';
    return reward.title;
  };

  const getCategoryLabel = (cat: typeof CATEGORIES[0]) => {
    return (cat as any)[lang] || cat.en;
  };

  const filteredRewards = selectedCategory === 'all' ? REWARDS : REWARDS.filter(r => r.category === selectedCategory);

  const memberId = currentUser?.id ? `LM-${String(currentUser.id).padStart(8, '0')}` : '';

  if (status === 'loading') {
    return <div className="text-center py-20"><span className="material-symbols-outlined animate-spin text-4xl text-primary">autorenew</span><p>{t('loyalty.loading')}</p></div>;
  }

  if (status === 'failed') {
    return <div className="text-center py-20 text-red-500"><p>{lang === 'en' ? 'Error loading points:' : lang === 'ja' ? 'ポイント読み込みエラー:' : 'Lỗi tải điểm:'} {error}</p></div>;
  }

  return (
    <main className="max-w-7xl mx-auto px-0 sm:px-2 py-4">
        <div className="mb-10">
          <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">{t('loyalty.title')}</h2>
          <p className="text-slate-500 dark:text-slate-400">
            {lang === 'en'
              ? `Welcome back, ${currentUser?.full_name || currentUser?.username}. You're getting closer to your next big reward!`
              : lang === 'ja'
              ? `おかえりなさい、${currentUser?.full_name || currentUser?.username}さん。次の大きな報酬に近づいています！`
              : `Chào mừng trở lại, ${currentUser?.full_name || currentUser?.username}. Bạn đang tiến gần hơn đến phần thưởng lớn tiếp theo đấy!`
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-primary/5 p-6 group">
              <div className="absolute top-0 right-0 p-4">
                <span className="material-symbols-outlined text-6xl text-primary/5 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                  military_tech
                </span>
              </div>
              <div className="relative z-10">
                <span className="inline-block px-3 py-1 bg-gold/10 text-gold text-xs font-bold rounded-full mb-4 uppercase tracking-wider">
                  {lang === 'en' ? 'Member' : lang === 'ja' ? '会員' : 'Thành viên'} {currentUser?.membership_level || 'Bronze'}
                </span>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-5xl font-black text-primary">{displayPoints.toLocaleString()}</span>
                  <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest">{t('loyalty.points')}</span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-600 dark:text-slate-300 uppercase tracking-tighter">
                      {t('loyalty.progressToNext')}
                    </span>
                    <span className="text-primary">{levelProgress}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-gold rounded-full transition-all duration-1000" style={{ width: `${levelProgress}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowQR(!showQR)}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-slate-900 rounded-xl border border-primary/5 hover:border-primary transition-all group shadow-sm"
              >
                <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">
                  qr_code_2
                </span>
                <span className="text-xs font-bold uppercase tracking-tight">{t('loyalty.showMemberId')}</span>
              </button>
              <button className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-slate-900 rounded-xl border border-primary/5 hover:border-primary transition-all group shadow-sm">
                <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">
                  history
                </span>
                <span className="text-xs font-bold uppercase tracking-tight">{t('loyalty.fullHistory')}</span>
              </button>
            </div>

            {/* QR / Member ID Panel */}
            {showQR && (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-primary/5 p-6 text-center animate-fadeIn">
                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3 uppercase tracking-wider">
                  {lang === 'en' ? 'Member ID' : lang === 'ja' ? '会員ID' : 'Mã thành viên'}
                </h4>
                {/* Simple QR representation using CSS */}
                <div className="inline-flex items-center justify-center w-40 h-40 bg-white border-2 border-slate-200 rounded-2xl mb-3 mx-auto">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-slate-800">qr_code_2</span>
                    <p className="text-[10px] text-slate-400 mt-1">{memberId}</p>
                  </div>
                </div>
                <p className="text-lg font-black text-primary tracking-widest">{memberId}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'en' ? 'Show this code at checkout to earn points' : lang === 'ja' ? 'レジでこのコードを提示してポイントを獲得' : 'Quét mã tại quầy để tích điểm'}
                </p>
                <button
                  onClick={() => { navigator.clipboard.writeText(memberId); toast.success(lang === 'en' ? 'Copied!' : lang === 'ja' ? 'コピーしました！' : 'Đã sao chép!'); }}
                  className="mt-3 px-4 py-2 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-sm align-middle mr-1">content_copy</span>
                  {lang === 'en' ? 'Copy ID' : lang === 'ja' ? 'IDをコピー' : 'Sao chép mã'}
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-primary/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-lg">{t('loyalty.recentTransactions')}</h3>
                <button className="text-primary text-sm font-semibold hover:underline">{t('loyalty.viewAll')}</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-xs font-bold uppercase">
                      <th className="px-6 py-4">{t('common.date')}</th>
                      <th className="px-6 py-4">{t('loyalty.source')}</th>
                      <th className="px-6 py-4">{t('common.type')}</th>
                      <th className="px-6 py-4 text-right">{t('loyalty.points')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                          {t('loyalty.noHistory')}
                        </td>
                      </tr>
                    ) : (
                      transactions.map(tx => (
                        <tr key={tx.id || (tx as any)._id}>
                          <td className="px-6 py-4 text-sm text-slate-500">{new Date(tx.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'ja' ? 'ja-JP' : 'vi-VN')}</td>
                          <td className="px-6 py-4 font-semibold">{tx.description || tx.source || (lang === 'en' ? 'System' : lang === 'ja' ? 'システム' : 'Hệ thống')}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 ${(tx.type === 'EARN' || tx.type === 'earn') ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-primary/10 text-primary'} text-[10px] font-black rounded uppercase`}>
                              {(tx.type === 'EARN' || tx.type === 'earn')
                                ? (lang === 'en' ? 'Earn' : lang === 'ja' ? '獲得' : 'Nhận')
                                : (lang === 'en' ? 'Redeem' : lang === 'ja' ? '交換' : 'Đổi')}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-right font-bold ${(tx.type === 'EARN' || tx.type === 'earn') ? 'text-green-600' : 'text-primary'}`}>
                            {(tx.type === 'EARN' || tx.type === 'earn') ? '+' : '-'}{tx.points}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Redeem Points Section */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('loyalty.redeemPoints')}</h3>
              <p className="text-slate-500 dark:text-slate-400">
                {t('loyalty.redeemDesc')}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors ${
                    selectedCategory === cat.key
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {getCategoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredRewards.map(reward => {
              const userPoints = currentUser?.lotte_points || 0;
              const canRedeem = userPoints >= reward.pointsCost;
              const isRedeeming = redeemingId === reward.id;

              return (
                <div key={reward.id} className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-primary/5 group hover:-translate-y-1 transition-all duration-300">
                  <div className="relative h-40">
                    <img
                      className="w-full h-full object-cover"
                      src={reward.image}
                      alt={getLocalizedTitle(reward)}
                    />
                    {reward.badge && (
                      <div className={`absolute top-3 right-3 px-2 py-1 ${reward.badgeColor || 'bg-primary'} text-white text-[10px] font-bold rounded uppercase`}>
                        {reward.badge}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      {getCategoryLabel(CATEGORIES.find(c => c.key === reward.category) || CATEGORIES[0])}
                    </p>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-4 line-clamp-1">{getLocalizedTitle(reward)}</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-gold text-lg">database</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{reward.pointsCost.toLocaleString()} {t('loyalty.points')}</span>
                      </div>
                      {canRedeem ? (
                        <button
                          onClick={() => handleRedeem(reward)}
                          disabled={isRedeeming}
                          className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold rounded-lg transition-colors uppercase tracking-tight disabled:opacity-60 disabled:cursor-wait"
                        >
                          {isRedeeming ? (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined animate-spin text-xs">progress_activity</span>
                              ...
                            </span>
                          ) : t('loyalty.redeemNow')}
                        </button>
                      ) : (
                        <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold rounded-lg cursor-not-allowed uppercase tracking-tight">
                          {t('loyalty.notEnoughPoints')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
    </main>
  );
};

export default LoyaltyRewards;