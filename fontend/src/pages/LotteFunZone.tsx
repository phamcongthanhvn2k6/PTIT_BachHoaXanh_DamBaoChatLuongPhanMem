import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { dataService } from '../services/dataService';
import { useAppSelector, useAppDispatch } from '../store';
import { authVerify } from '../slices/authSlice';

// Confetti Effect Helper
const triggerConfetti = () => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  const colors = ['#FFD700', '#FF4D4D', '#33CC33', '#3399FF', '#FF99FF', '#FFFFFF'];

  for (let i = 0; i < 100; i++) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.width = `${Math.random() * 8 + 4}px`;
    el.style.height = `${Math.random() * 12 + 6}px`;
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.left = `${Math.random() * 100}vw`;
    el.style.top = `-20px`;
    el.style.opacity = Math.random().toString();
    el.style.transform = `rotate(${Math.random() * 360}deg)`;
    el.style.borderRadius = '2px';
    container.appendChild(el);

    const duration = Math.random() * 3 + 2;
    const drift = Math.random() * 200 - 100;

    el.animate([
      { transform: `translateY(0px) rotate(0deg)`, opacity: 1 },
      { transform: `translateY(105vh) translateX(${drift}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
    ], {
      duration: duration * 1000,
      easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)',
      fill: 'forwards'
    });
  }

  setTimeout(() => container.remove(), 5000);
};

// Simple Audio Synth Helper
const playSound = (freq = 440, type = 'sine', duration = 0.1, volume = 0.1) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type as any;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore block
  }
};

const LotteFunZone: React.FC = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const currentLang = i18n.language || 'vi';

  // State variables
  const [activeTab, setActiveTab] = useState<'spin' | 'checkin'>('spin');
  const [spinCampaign, setSpinCampaign] = useState<any>(null);
  const [checkinCampaign, setCheckinCampaign] = useState<any>(null);
  
  // Spin Wheel State
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinResult, setSpinResult] = useState<any>(null);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [spinsRemainingToday, setSpinsRemainingToday] = useState(1);

  // Daily Checkin State
  const [checkinState, setCheckinState] = useState<any>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // User Claim History (recent wins in Fun Zone)
  const [userHistory, setUserHistory] = useState<any[]>([]);

  // Simulation tickers for a lively feel
  const [recentGlobalWins, setRecentGlobalWins] = useState<string[]>([]);

  // Sound click interval reference
  const rotationRef = useRef(0);

  // Unified getters to handle any API wrapper shape (direct or nested under data)
  const isCheckedInToday = !!(checkinState?.data?.checkedInToday ?? checkinState?.checkedInToday);
  const streakCount = Number(checkinState?.data?.currentStreak ?? checkinState?.currentStreak ?? 0);

  // Lock checks
  const isSpinLocked = user?.status === 'LOCKED' || 
    (user?.gamification_lock?.is_locked && 
     (user.gamification_lock.scope === 'spin' || user.gamification_lock.scope === 'all') && 
     (!user.gamification_lock.expires_at || new Date() < new Date(user.gamification_lock.expires_at)));

  const isCheckinLocked = user?.status === 'LOCKED' || 
    (user?.gamification_lock?.is_locked && 
     (user.gamification_lock.scope === 'checkin' || user.gamification_lock.scope === 'all') && 
     (!user.gamification_lock.expires_at || new Date() < new Date(user.gamification_lock.expires_at)));

  // Translation helpers
  const getLocalizedName = (item: any) => {
    if (!item) return '';
    if (currentLang === 'en' && item.reward_name_en) return item.reward_name_en;
    if (currentLang === 'ja' && item.reward_name_ja) return item.reward_name_ja;
    return item.reward_name;
  };

  useEffect(() => {
    fetchActiveCampaigns();
    fetchUserHistory();
    generateFakeWins();
    
    // Ticker to rotate fake wins
    const interval = setInterval(() => {
      generateFakeWins();
    }, 15000);
    return () => clearInterval(interval);
  }, [currentLang]);

  const fetchActiveCampaigns = async () => {
    try {
      // Refresh user session to get latest lotte_points and status/locks
      dispatch(authVerify());

      const spinCamp = await dataService.getGamificationCampaign('spin');
      setSpinCampaign(spinCamp);
      
      const checkinCamp = await dataService.getGamificationCampaign('checkin');
      setCheckinCampaign(checkinCamp);

      if (spinCamp) {
        // Calculate remaining spins for user
        const logs = await dataService.getMyLogs({ campaign_id: spinCamp._id, limit: 100 });
        const todayStr = new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000).toISOString().split('T')[0];
        const spinsToday = (logs?.data && Array.isArray(logs.data))
          ? logs.data.filter((l: any) => l.type === 'spin' && l.date_str === todayStr && l.status === 'delivered').length
          : 0;
        
        const extraSpins = spinCamp.extra_spins || 0;
        setSpinsRemainingToday(Math.max(0, spinCamp.max_spins_per_user_day - spinsToday) + extraSpins);
      }

      const checkState = await dataService.getCheckinState();
      setCheckinState(checkState);
    } catch (e) {
      console.error('Failed to load campaigns', e);
    }
  };

  const fetchUserHistory = async () => {
    try {
      if (!user) return;
      const logs = await dataService.getMyLogs({ limit: 10 });
      if (logs && logs.success) {
        setUserHistory(logs.data);
      }
    } catch (e) {
      console.error('Failed to fetch user history', e);
    }
  };

  const generateFakeWins = () => {
    const names = [
      'Nguyễn Minh T.', 'Trần Thanh H.', 'Lê Văn Đ.', 'Phạm Thị M.', 'Hoàng Anh D.', 
      'Takeshi K.', 'John D.', 'Yuki S.', 'Nguyễn Quốc A.', 'Vũ Hoàng Y.'
    ];
    const rewards = [
      currentLang === 'vi' ? 'Voucher 50K FreeShip' : currentLang === 'ja' ? '50K 送料無料バウチャー' : '50K Free Shipping Voucher',
      currentLang === 'vi' ? '1,000 Bách hóa XANH Points' : currentLang === 'ja' ? '1,000 ロッテポイント' : '1,000 Bách hóa XANH Points',
      currentLang === 'vi' ? 'Mã Giảm Giá 10%' : currentLang === 'ja' ? '10% 割引コード' : '10% Discount Code',
      currentLang === 'vi' ? 'Quà Tặng Bách hóa XANH' : currentLang === 'ja' ? 'ロッテマートギフト' : 'Bách hóa XANH Gift Item',
      currentLang === 'vi' ? '500 Bách hóa XANH Points' : currentLang === 'ja' ? '500 ロッテポイント' : '500 Bách hóa XANH Points',
    ];

    const wins = Array.from({ length: 4 }).map(() => {
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomReward = rewards[Math.floor(Math.random() * rewards.length)];
      return `${randomName} - ${randomReward}`;
    });

    setRecentGlobalWins(wins);
  };

  // Lucky Spin triggers
  const handleSpin = async () => {
    if (isSpinning || spinsRemainingToday <= 0) return;
    setSpinError(null);
    setSpinResult(null);

    try {
      const res = await dataService.spinWheel();
      if (!res.success) {
        setSpinError(res.message || 'Lượt quay thất bại');
        return;
      }

      const rewardIndex = res.data.rewardIndex;
      const totalSegments = spinCampaign.rewards.length;
      const degreesPerSegment = 360 / totalSegments;

      // Spin physics calculation
      const baseSpins = 6;
      // Landing in the middle of segment
      const segmentOffset = degreesPerSegment / 2;
      // Correct mathematical formula to align segment rewardIndex under top pointer:
      const targetDegrees = 360 * baseSpins + ((360 + 90 - (rewardIndex * degreesPerSegment + segmentOffset)) % 360);

      const finalRotation = wheelRotation + targetDegrees - (wheelRotation % 360);
      
      setIsSpinning(true);
      setWheelRotation(finalRotation);
      rotationRef.current = wheelRotation;

      // Beep ticker sound matching spin acceleration and deceleration
      let beepInterval = 80;
      const playBeeps = () => {
        playSound(600, 'triangle', 0.05, 0.05);
        beepInterval += 15;
        if (beepInterval < 400) {
          setTimeout(playBeeps, beepInterval);
        }
      };
      setTimeout(playBeeps, beepInterval);

      setTimeout(() => {
        setIsSpinning(false);
        setSpinResult(res.data.reward);
        triggerConfetti();
        playSound(880, 'sine', 0.15, 0.15);
        setTimeout(() => playSound(1320, 'sine', 0.3, 0.15), 150);
        
        // Refresh limits
        fetchActiveCampaigns();
        fetchUserHistory();
      }, 5000);

    } catch (e: any) {
      setSpinError(e.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.');
    }
  };

  // Daily Checkin trigger
  const handleCheckin = async () => {
    if (checkinLoading || isCheckedInToday) return;
    setCheckinLoading(true);
    setCheckinMessage(null);

    try {
      const res = await dataService.dailyCheckin();
      if (res.success) {
        setCheckinMessage({
          text: `${t('checkin.success', 'Điểm danh thành công!')} +${getLocalizedName(res.data.reward)}`,
          type: 'success'
        });
        triggerConfetti();
        playSound(988, 'sine', 0.1, 0.15);
        setTimeout(() => playSound(1318, 'sine', 0.2, 0.15), 100);

        fetchActiveCampaigns();
        fetchUserHistory();
      } else {
        setCheckinMessage({ text: res.message || 'Lỗi khi điểm danh', type: 'error' });
      }
    } catch (e: any) {
      setCheckinMessage({ text: e.response?.data?.message || 'Lỗi hệ thống', type: 'error' });
    } finally {
      setCheckinLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 pt-6 relative overflow-hidden">
      {/* Dynamic colorful glowing background circles */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-4 z-10 relative">
        
        {/* Header Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center gap-3 mb-3 flex-wrap">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-wider shadow-md">
              <span className="material-symbols-outlined text-xs">sports_esports</span>
              {t('gamification.title', 'Bách hóa XANH Fun Zone')}
            </div>
            <a href="/carrot-scene" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/60 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider shadow-md hover:bg-slate-900 hover:text-amber-300 transition-colors" style={{ textDecoration: 'none' }}>
              <span className="material-symbols-outlined text-xs">3d_rotation</span>
              {currentLang === 'vi' ? 'Khám Phá Carrot 3D' : currentLang === 'ja' ? 'キャロット3D探検' : 'Explore Carrot 3D'}
            </a>
          </div>
          <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-amber-400 to-red-500 tracking-tight">
            {currentLang === 'vi' ? 'KHU VUI CHƠI GIẢI TRÍ' : currentLang === 'ja' ? 'ロッテファンゾーン' : 'LOTTE FUN ZONE'}
          </h1>
          <p className="text-slate-400 text-sm md:text-md mt-2 max-w-lg mx-auto">
            {currentLang === 'vi' 
              ? 'Tích lũy điểm thưởng, săn voucher khủng & nhận quà tặng độc quyền mỗi ngày cùng Bách hóa XANH!' 
              : currentLang === 'ja'
              ? '毎日ロッテマートと一緒に、ロッテポイントを貯めたり、お得なバウチャーや限定ギフトをゲットしよう！'
              : 'Earn loyalty points, claim mega vouchers & win exclusive gifts daily with Bách hóa XANH!'}
          </p>
        </div>

        {/* Global Live wins banner */}
        {recentGlobalWins.length > 0 && (
          <div className="w-full bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl py-3 px-6 mb-8 flex items-center gap-4 overflow-hidden relative shadow-lg">
            <span className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider border-r border-slate-800 pr-4 shrink-0">
              <span className="material-symbols-outlined text-sm animate-bounce">campaign</span>
              {t('gamification.congrats', 'Chúc mừng')}
            </span>
            <div className="flex-1 overflow-hidden h-5 relative">
              <div className="flex gap-8 animate-marquee whitespace-nowrap text-slate-300 text-xs font-medium">
                {recentGlobalWins.map((win, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    {win}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* User Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <span className="material-symbols-outlined text-2xl">stars</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">{t('gamification.lottePoints', 'Điểm Bách hóa XANH hiện có')}</p>
              <h3 className="text-2xl font-black text-white mt-1">{(user as any)?.lotte_points ?? 0} PTS</h3>
            </div>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <span className="material-symbols-outlined text-2xl">local_play</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">{t('gamification.spinsRemaining', 'Lượt quay hôm nay')}</p>
              <h3 className="text-2xl font-black text-white mt-1">{spinsRemainingToday} {t('gamification.spinsUnit', 'lượt')}</h3>
            </div>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <span className="material-symbols-outlined text-2xl">calendar_month</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">{t('gamification.streak', 'Chuỗi điểm danh')}</p>
              <h3 className="text-2xl font-black text-white mt-1">{streakCount} {t('gamification.days', 'ngày')}</h3>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 mb-8 p-1 bg-slate-900/30 rounded-xl max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('spin')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'spin' 
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-lg">casino</span>
            {t('gamification.spinWheel', 'Vòng Quay May Mắn')}
          </button>
          <button
            onClick={() => setActiveTab('checkin')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'checkin' 
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-lg">verified</span>
            {t('gamification.dailyCheckin', 'Điểm Danh Hàng Ngày')}
          </button>
        </div>

        {/* MAIN GAME INTERFACES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left/Middle: Game Module */}
          <div className="lg:col-span-2">
            
            {/* TAB 1: LUCKY SPIN */}
            {activeTab === 'spin' && (
              <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl relative">
                
                {isSpinLocked ? (
                  <div className="text-center py-12 space-y-4 max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-4 animate-pulse">
                      <span className="material-symbols-outlined text-4xl">lock</span>
                    </div>
                    <h3 className="text-xl font-black text-red-500 uppercase tracking-wide">
                      {currentLang === 'vi' ? 'Tính Năng Đã Bị Khóa' : currentLang === 'ja' ? '機能がロックされました' : 'Feature Locked'}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {currentLang === 'vi' 
                        ? 'Tài khoản của bạn đã bị khóa quyền truy cập tính năng Vòng Quay May Mắn do phát hiện hành vi bất thường hoặc theo yêu cầu của quản trị viên.'
                        : currentLang === 'ja'
                        ? '異常なアクティビティが検出されたか、管理者の要求により、この機能へのアクセスがロックされました。'
                        : 'Your access to the Lucky Spin feature has been locked due to unusual activity or admin request.'}
                    </p>
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 mt-6 text-left space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Phạm vi khóa:</span>
                        <span className="font-bold text-red-400 uppercase">
                          {user?.gamification_lock?.scope === 'all' || user?.status === 'LOCKED' ? 'Tất cả (all)' : user?.gamification_lock?.scope}
                        </span>
                      </div>
                      {(user?.gamification_lock?.reason || user?.status === 'LOCKED') && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-500">Lý do:</span>
                          <span className="text-slate-300 italic">
                            {user?.gamification_lock?.reason || 'Phát hiện hành vi lạm dụng/spam!'}
                          </span>
                        </div>
                      )}
                      {user?.gamification_lock?.expires_at && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Hết hạn khóa:</span>
                          <span className="text-slate-300 font-mono">
                            {new Date(user.gamification_lock.expires_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-6">
                      Nếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ Bộ phận hỗ trợ khách hàng Bách hóa XANH.
                    </div>
                  </div>
                ) : !spinCampaign ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-5xl text-slate-600 animate-pulse">casino</span>
                    <h3 className="text-xl font-bold mt-4 text-slate-400">
                      {t('gamification.noCampaign', 'Không có chương trình hoạt động lúc này.')}
                    </h3>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    
                    {/* Campaign Title & Exp */}
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-black text-white">{spinCampaign.name}</h2>
                      <p className="text-slate-400 text-xs mt-1">
                        {t('gamification.endsOn', 'Hạn kết thúc:')} {new Date(spinCampaign.end_date).toLocaleDateString()}
                      </p>
                    </div>

                    {/* WHEEL DRAWING CONTAINER */}
                    <div className="relative w-80 h-80 md:w-96 md:h-96 my-6 flex items-center justify-center select-none shadow-[0_0_50px_rgba(239,68,68,0.15)] rounded-full">
                      {/* Ring Outer Neon Border */}
                      <div className="absolute inset-0 rounded-full border-8 border-slate-800 shadow-[0_0_20px_rgba(239,68,68,0.25)] pointer-events-none z-10"></div>
                      
                      {/* Spinning Needle Pointer */}
                      <div className="absolute -top-3 w-8 h-10 z-30 flex flex-col items-center">
                        <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-red-500 filter drop-shadow-md"></div>
                        <div className="w-3 h-3 rounded-full bg-white -mt-7 border border-red-600 shadow-inner"></div>
                      </div>

                      {/* SVG Sector Wheel */}
                      <div 
                        style={{
                          transform: `rotate(${wheelRotation}deg)`,
                          transition: isSpinning ? 'transform 5s cubic-bezier(0.15, 0.95, 0.3, 1)' : 'none'
                        }}
                        className="w-full h-full rounded-full overflow-hidden relative shadow-inner bg-slate-950 flex items-center justify-center"
                      >
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          {spinCampaign.rewards.map((reward: any, index: number) => {
                            const total = spinCampaign.rewards.length;
                            const angle = 360 / total;
                            const startAngle = index * angle;
                            const endAngle = (index + 1) * angle;

                            const radStart = (startAngle * Math.PI) / 180;
                            const radEnd = (endAngle * Math.PI) / 180;

                            const x1 = 50 + 50 * Math.cos(radStart);
                            const y1 = 50 + 50 * Math.sin(radStart);
                            const x2 = 50 + 50 * Math.cos(radEnd);
                            const y2 = 50 + 50 * Math.sin(radEnd);

                            const d = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

                            const colors = [
                              '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
                              '#EC4899', '#8B5CF6', '#14B8A6', '#6366F1'
                            ];
                            const fillColor = reward.reward_type === 'empty' ? '#1E293B' : colors[index % colors.length];

                            return (
                              <g key={index}>
                                <path d={d} fill={fillColor} stroke="#0B1329" strokeWidth="0.8" />
                                
                                {/* Label for reward */}
                                <g transform={`rotate(${startAngle + angle / 2} 50 50)`}>
                                  <text
                                    x="78"
                                    y="51"
                                    fill="#FFFFFF"
                                    fontSize="3.8"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    transform={`rotate(90 78 50)`}
                                    className="select-none tracking-tight"
                                  >
                                    {getLocalizedName(reward).slice(0, 16)}
                                  </text>
                                </g>
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Inner Button Circle */}
                      <button
                        onClick={handleSpin}
                        disabled={isSpinning || spinsRemainingToday <= 0}
                        className={`absolute w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 z-20 flex flex-col items-center justify-center shadow-[0_4px_15px_rgba(245,158,11,0.5)] border-4 border-slate-900 cursor-pointer active:scale-95 transition-transform ${
                          isSpinning || spinsRemainingToday <= 0 ? 'brightness-50 cursor-not-allowed shadow-none' : 'hover:scale-105'
                        }`}
                      >
                        <span className="text-slate-950 font-black text-md tracking-wider">
                          {isSpinning ? (currentLang === 'vi' ? 'QUAY...' : currentLang === 'ja' ? '回転中' : 'SPINNING') : (currentLang === 'vi' ? 'QUAY' : currentLang === 'ja' ? 'スタート' : 'SPIN')}
                        </span>
                        <span className="text-slate-900/70 font-bold text-[9px] -mt-0.5">
                          {spinsRemainingToday} {t('gamification.spinsUnit', 'lượt')}
                        </span>
                      </button>
                    </div>

                    {/* Spin results banner */}
                    {spinResult && (
                      <div className="w-full max-w-md bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 mt-6 text-center animate-fadeIn shadow-lg">
                        <span className="material-symbols-outlined text-3xl text-emerald-400 animate-bounce">emoji_events</span>
                        <h4 className="text-emerald-400 font-bold text-sm mt-1 uppercase tracking-wider">
                          {t('gamification.congrats', 'Xin chúc mừng!')}
                        </h4>
                        <p className="text-white font-black text-lg mt-1">
                          {spinResult.reward_type === 'empty'
                            ? getLocalizedName(spinResult)
                            : `${t('gamification.youWon', 'Bạn đã trúng')} ${getLocalizedName(spinResult)}!`}
                        </p>
                        <p className="text-slate-400 text-xs mt-1">
                          {spinResult.reward_type === 'points' 
                            ? t('gamification.pointsWalletMsg', 'Điểm đã tự động cộng vào ví của bạn.')
                            : t('gamification.couponWalletMsg', 'Voucher đã được gửi tới ví ưu đãi của bạn.')}
                        </p>
                      </div>
                    )}

                    {spinError && (
                      <div className="w-full max-w-md bg-red-950/40 border border-red-500/30 rounded-xl p-4 mt-6 text-center text-red-400 font-medium text-sm">
                        {spinError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DAILY CHECK-IN */}
            {activeTab === 'checkin' && (
              <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl">
                {isCheckinLocked ? (
                  <div className="text-center py-12 space-y-4 max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-4 animate-pulse">
                      <span className="material-symbols-outlined text-4xl">lock</span>
                    </div>
                    <h3 className="text-xl font-black text-red-500 uppercase tracking-wide">
                      {currentLang === 'vi' ? 'Tính Năng Đã Bị Khóa' : currentLang === 'ja' ? '機能がロックされました' : 'Feature Locked'}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {currentLang === 'vi' 
                        ? 'Tài khoản của bạn đã bị khóa quyền truy cập tính năng Điểm Danh Hàng Ngày do phát hiện hành vi bất thường hoặc theo yêu cầu của quản trị viên.'
                        : currentLang === 'ja'
                        ? '異常なアクティビティが検出されたか、管理者の要求により、この機能へのアクセスがロックされました。'
                        : 'Your access to the Daily Check-in feature has been locked due to unusual activity or admin request.'}
                    </p>
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 mt-6 text-left space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Phạm vi khóa:</span>
                        <span className="font-bold text-red-400 uppercase">
                          {user?.gamification_lock?.scope === 'all' || user?.status === 'LOCKED' ? 'Tất cả (all)' : user?.gamification_lock?.scope}
                        </span>
                      </div>
                      {(user?.gamification_lock?.reason || user?.status === 'LOCKED') && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-500">Lý do:</span>
                          <span className="text-slate-300 italic">
                            {user?.gamification_lock?.reason || 'Phát hiện hành vi lạm dụng/spam!'}
                          </span>
                        </div>
                      )}
                      {user?.gamification_lock?.expires_at && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Hết hạn khóa:</span>
                          <span className="text-slate-300 font-mono">
                            {new Date(user.gamification_lock.expires_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-6">
                      Nếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ Bộ phận hỗ trợ khách hàng Bách hóa XANH.
                    </div>
                  </div>
                ) : !checkinCampaign ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-5xl text-slate-600 animate-pulse">verified</span>
                    <h3 className="text-xl font-bold mt-4 text-slate-400">
                      {t('gamification.noCampaign', 'Không có chương trình hoạt động lúc này.')}
                    </h3>
                  </div>
                ) : (
                  <div>
                    {/* Header checkin */}
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-black text-white">{checkinCampaign.name}</h2>
                      <p className="text-slate-400 text-sm mt-1">
                        {currentLang === 'vi' 
                          ? 'Điểm danh liên tục 7 ngày để mở khóa Rương Quà Đặc Biệt!' 
                          : currentLang === 'ja'
                          ? '7日間連続でチェックインして特別宝箱を開けよう！'
                          : 'Check in 7 days consecutively to unlock Special Rewards!'}
                      </p>
                    </div>

                    {/* Streak Progress Gauge */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 mb-8">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('gamification.chestProgress', 'Tiến trình nhận rương')}</span>
                        <span className="text-xs font-black text-amber-400">
                          {streakCount} / 7 {currentLang === 'vi' ? 'Ngày' : currentLang === 'ja' ? '日' : 'Days'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 flex">
                        <div 
                          style={{ width: `${Math.min(100, (streakCount / 7) * 100)}%` }}
                          className="bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                        ></div>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">
                        {t('gamification.chestNotice', '*Nếu đứt quãng chuỗi điểm danh, tiến trình sẽ được tính lại từ ngày đầu tiên.')}
                      </p>
                    </div>

                    {/* 7-Day Calendar Grid Layout */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-8">
                      {Array.from({ length: 7 }).map((_, idx) => {
                        const dayNum = idx + 1;
                        const isClaimed = dayNum <= streakCount;
                        const isCurrentDay = dayNum === streakCount + 1 && !isCheckedInToday;

                        // Find reward for this day if scheduled, or show general icon
                        return (
                          <div 
                            key={idx}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-between text-center transition-all ${
                              isClaimed 
                                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                                : isCurrentDay
                                ? 'bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse'
                                : 'bg-slate-900/50 border-slate-800 text-slate-500'
                            }`}
                          >
                            <span className="text-xs font-bold uppercase tracking-wider">
                              {currentLang === 'vi' ? `Ngày ${dayNum}` : currentLang === 'ja' ? `${dayNum}日目` : `Day ${dayNum}`}
                            </span>
                            
                            <div className="my-3">
                              {isClaimed ? (
                                <span className="material-symbols-outlined text-3xl text-emerald-400">task_alt</span>
                              ) : dayNum === 7 ? (
                                <span className="material-symbols-outlined text-3.5xl text-amber-500 animate-bounce">redeem</span>
                              ) : (
                                <span className="material-symbols-outlined text-3xl">toll</span>
                              )}
                            </div>

                            <span className="text-[9px] font-bold block truncate max-w-full">
                              {dayNum === 7 
                                ? t('gamification.megaChest', 'Rương Quà Đặc Biệt') 
                                : `+${10 * dayNum} PTS`}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Action Button */}
                    <div className="text-center">
                      <button
                        onClick={handleCheckin}
                        disabled={checkinLoading || isCheckedInToday}
                        className={`w-full max-w-xs py-3 px-6 rounded-xl font-bold text-md tracking-wide shadow-lg transition-all ${
                          isCheckedInToday
                            ? 'bg-emerald-900/20 text-emerald-500 border border-emerald-500/20 cursor-not-allowed'
                            : 'bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-slate-950 hover:brightness-110 active:scale-98 cursor-pointer font-black'
                        }`}
                      >
                        {checkinLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"></span>
                            {t('gamification.processing', 'Đang thực hiện...')}
                          </span>
                        ) : isCheckedInToday ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                            {t('gamification.checkedInToday', 'Đã Điểm Danh Hôm Nay')}
                          </span>
                        ) : (
                          t('gamification.checkInNow', 'ĐIỂM DANH NHẬN QUÀ NGAY')
                        )}
                      </button>
                    </div>

                    {/* Feedback message banner */}
                    {checkinMessage && (
                      <div className={`mt-6 p-4 rounded-xl text-center font-medium text-sm border ${
                        checkinMessage.type === 'success'
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                          : 'bg-red-950/40 border-red-500/30 text-red-400'
                      }`}>
                        {checkinMessage.text}
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Information & History */}
          <div className="space-y-6">
            
            {/* Box 1: Rules & Info */}
            <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5">
              <h3 className="text-md font-bold text-white mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="material-symbols-outlined text-amber-400 text-lg">info</span>
                {t('gamification.terms', 'Thể lệ chương trình')}
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-400 list-disc pl-4 leading-relaxed">
                <li>{t('gamification.termsDetail1', 'Chương trình dành riêng cho thành viên có ví điểm Bách hóa XANH.')}</li>
                <li>{t('gamification.termsDetail2', 'Mỗi tài khoản được nhận 1 lượt quay miễn phí mỗi ngày.')}</li>
                <li>{t('gamification.termsDetail3', 'Quà tặng voucher/mã giảm giá có thời hạn sử dụng được ghi rõ trong chi tiết voucher.')}</li>
                <li>{t('gamification.termsDetail4', 'Hành vi gian lận hoặc spam sẽ bị vô hiệu hóa tài khoản và thu hồi phần quà.')}</li>
              </ul>
            </div>

            {/* Box 2: Your Reward History */}
            <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5">
              <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="material-symbols-outlined text-red-500 text-lg">military_tech</span>
                {t('gamification.myRewards', 'Quà tặng đã nhận')}
              </h3>

              {userHistory.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  {t('gamification.noRewards', 'Chưa nhận phần quà nào.')}
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {userHistory.map((log) => (
                    <div key={log._id} className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-200">{getLocalizedName(log.reward)}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {log.type === 'spin' 
                            ? t('gamification.spin', 'Vòng quay') 
                            : t('gamification.checkin', 'Điểm danh')}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          log.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {log.status === 'delivered' ? t('gamification.statusSuccess', 'Thành công') : t('gamification.statusFailed', 'Thất bại')}
                        </span>
                        <p className="text-[9px] text-slate-500 mt-1">
                          {new Date(log.claimed_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default LotteFunZone;
