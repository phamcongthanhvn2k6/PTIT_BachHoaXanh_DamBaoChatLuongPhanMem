import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dataService } from '../../services/dataService';

const translations = {
  vi: {
    previewCampaign: "Xem chi tiết chiến dịch",
    grantSpins: "Tặng lượt quay (QA & Support)",
    unlockUser: "Mở khóa tài khoản",
    reason: "Lý do tặng",
    spinsCount: "Số lượt quay tặng",
    userId: "Mã người dùng (User ID)",
    grantSuccess: "Tặng lượt quay thành công!",
    unlockSuccess: "Mở khóa tài khoản thành công!",
    errorOccurred: "Đã có lỗi xảy ra",
    blockedSpam: "Bị khóa (Spam)",
    lockedStatus: "Đã khóa 🔒",
    activeStatus: "Hoạt động",
    campaignType: "Loại chiến dịch",
    dateRange: "Thời gian diễn ra",
    rewardsPool: "Danh sách quà tặng",
    streakBonuses: "Thưởng chuỗi điểm danh",
    schedule: "Lịch điểm danh đặc biệt",
    close: "Đóng",
    loading: "Đang tải...",
    noData: "Không có dữ liệu",
    granting: "Đang xử lý tặng...",
    unlocking: "Đang xử lý mở khóa...",
    selectCampaign: "Chọn chiến dịch",
    enterReason: "Nhập lý do tặng",
    userStatus: "Trạng thái người dùng",
    confirmUnlock: "Xác nhận mở khóa tài khoản này?",
    statusLocked: "Bị khóa (LOCKED)",
    statusActive: "Hoạt động (ACTIVE)",
    supportHeader: "Công cụ kiểm thử & Hỗ trợ (QA/Support)",
    grantBtn: "Tặng lượt",
    unlockBtn: "Mở khóa",
    spinsRemaining: "Lượt tặng còn lại",
    rewardsDetail: "Chi tiết quà",
    stock: "Tồn kho",
    probability: "Tỷ lệ",
    claimed: "Đã nhận",
    limits: "Hạn mức",
    perUserLimit: "Giới hạn/User",
    totalLimit: "Tổng giới hạn"
  },
  en: {
    previewCampaign: "Campaign Details Preview",
    grantSpins: "Grant Spin Attempts (QA & Support)",
    unlockUser: "Unlock User Account",
    reason: "Reason for Granting",
    spinsCount: "Spins to Grant",
    userId: "User ID",
    grantSuccess: "Spins granted successfully!",
    unlockSuccess: "Account unlocked successfully!",
    errorOccurred: "An error occurred",
    blockedSpam: "Blocked (Spam)",
    lockedStatus: "Locked 🔒",
    activeStatus: "Active",
    campaignType: "Campaign Type",
    dateRange: "Campaign Period",
    rewardsPool: "Rewards Pool",
    streakBonuses: "Streak Bonuses",
    schedule: "Special Check-in Schedule",
    close: "Close",
    loading: "Loading...",
    noData: "No data available",
    granting: "Processing grant...",
    unlocking: "Processing unlock...",
    selectCampaign: "Select Campaign",
    enterReason: "Enter reason for granting",
    userStatus: "User Status",
    confirmUnlock: "Confirm unlock this account?",
    statusLocked: "Locked (LOCKED)",
    statusActive: "Active (ACTIVE)",
    supportHeader: "Testing Tools & Support (QA/Support)",
    grantBtn: "Grant",
    unlockBtn: "Unlock",
    spinsRemaining: "Extra Spins Remaining",
    rewardsDetail: "Reward Details",
    stock: "Stock",
    probability: "Probability",
    claimed: "Claimed",
    limits: "Limits",
    perUserLimit: "Limit/User",
    totalLimit: "Total Limit"
  },
  ja: {
    previewCampaign: "キャンペーン詳細プレビュー",
    grantSpins: "スピン回数を付与 (QA & サポート)",
    unlockUser: "アカウントロック解除",
    reason: "付与理由",
    spinsCount: "付与するスピン数",
    userId: "ユーザーID",
    grantSuccess: "スピンの付与に成功しました！",
    unlockSuccess: "アカウントのロックを解除しました！",
    errorOccurred: "エラーが発生しました",
    blockedSpam: "ブロック（スパム）",
    lockedStatus: "ロック中 🔒",
    activeStatus: "アクティブ",
    campaignType: "キャンペーンタイプ",
    dateRange: "開催期間",
    rewardsPool: "景品一覧",
    streakBonuses: "連続チェックイン特典",
    schedule: "特別チェックインスケジュール",
    close: "閉じる",
    loading: "読み込み中...",
    noData: "データなし",
    granting: "付与処理中...",
    unlocking: "解除処理中...",
    selectCampaign: "キャンペーンを選択",
    enterReason: "付与理由を入力してください",
    userStatus: "ユーザー状態",
    confirmUnlock: "このアカウントのロックを解除しますか？",
    statusLocked: "ロック中 (LOCKED)",
    statusActive: "有効 (ACTIVE)",
    supportHeader: "テストツールとサポート (QA/サポート)",
    grantBtn: "付与する",
    unlockBtn: "解除する",
    spinsRemaining: "残り付与回数",
    rewardsDetail: "景品詳細",
    stock: "在庫",
    probability: "確率",
    claimed: "獲得数",
    limits: "制限",
    perUserLimit: "ユーザー毎制限",
    totalLimit: "総制限"
  }
};

type RewardItem = {
  _id?: string;
  reward_type: 'points' | 'coupon' | 'free_shipping' | 'discount_card' | 'gift_item' | 'coins' | 'empty';
  reward_name: string;
  reward_name_en: string;
  reward_name_ja: string;
  reward_value: any;
  reward_probability: number;
  reward_stock: number | null;
  total_limit: number | null;
  daily_limit: number | null;
  per_user_limit: number | null;
  reward_status: 'active' | 'inactive';
  claimed_count?: number;
};

type CheckinDay = {
  date: string;
  reward_type: 'points' | 'coupon' | 'free_shipping' | 'discount_card' | 'gift_item' | 'coins' | 'empty';
  reward_name: string;
  reward_name_en: string;
  reward_name_ja: string;
  reward_value: any;
  is_special: boolean;
};

type StreakBonus = {
  streak_days: number;
  reward_type: 'points' | 'coupon' | 'free_shipping' | 'discount_card' | 'gift_item' | 'coins';
  reward_name: string;
  reward_name_en: string;
  reward_name_ja: string;
  reward_value: any;
};

type Campaign = {
  _id?: string;
  name: string;
  description: string;
  type: 'spin' | 'checkin';
  start_date: string;
  end_date: string;
  is_active: boolean;
  rewards: RewardItem[];
  checkin_schedule: CheckinDay[];
  streak_bonuses: StreakBonus[];
  max_spins_per_user_day: number;
  max_spins_per_user_total: number | null;
};

const AdminGamification: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'vi';
  const dict = translations[currentLang as 'vi' | 'en' | 'ja'] || translations.vi;

  // App states
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Support Tool states
  const [grantUserId, setGrantUserId] = useState('');
  const [grantSpinsCount, setGrantSpinsCount] = useState(5);
  const [grantReason, setGrantReason] = useState('Manual support grant');
  const [unlockUserId, setUnlockUserId] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Lock User states
  const [lockScope, setLockScope] = useState<'spin' | 'checkin' | 'all'>('all');
  const [lockDuration, setLockDuration] = useState<number>(0);
  const [lockReason, setLockReason] = useState('Spam/Abuse detected');
  const [lockLoading, setLockLoading] = useState(false);

  // User search states
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [selectedUserSpinBalance, setSelectedUserSpinBalance] = useState<{
    spins_granted: number;
    spins_used: number;
    spins_remaining: number;
  } | null>(null);

  const fetchUserSpinStatus = async (userId: string, campaignId: string) => {
    try {
      const res = await dataService.adminGetUserSpinStatus(userId, campaignId);
      if (res && res.success) {
        setSelectedUserSpinBalance(res.data);
      } else {
        setSelectedUserSpinBalance(null);
      }
    } catch (e) {
      console.error('Failed to fetch user spin status', e);
      setSelectedUserSpinBalance(null);
    }
  };

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'spin' | 'checkin'>('spin');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [maxSpinsDay, setMaxSpinsDay] = useState(1);
  const [maxSpinsTotal, setMaxSpinsTotal] = useState<number | null>(null);

  // Lists inside campaign
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [checkinSchedule, setCheckinSchedule] = useState<CheckinDay[]>([]);
  const [streakBonuses, setStreakBonuses] = useState<StreakBonus[]>([]);

  // Sub-forms for adding items
  const [newReward, setNewReward] = useState<RewardItem>({
    reward_type: 'points',
    reward_name: '',
    reward_name_en: '',
    reward_name_ja: '',
    reward_value: '',
    reward_probability: 10,
    reward_stock: null,
    total_limit: null,
    daily_limit: null,
    per_user_limit: null,
    reward_status: 'active'
  });

  const [newCheckin, setNewCheckin] = useState<CheckinDay>({
    date: '',
    reward_type: 'points',
    reward_name: '',
    reward_name_en: '',
    reward_name_ja: '',
    reward_value: '',
    is_special: false
  });

  const [newStreak, setNewStreak] = useState<StreakBonus>({
    streak_days: 7,
    reward_type: 'points',
    reward_name: '',
    reward_name_en: '',
    reward_name_ja: '',
    reward_value: ''
  });

  // History claim logs
  const [logs, setLogs] = useState<any[]>([]);
  const [logsCount, setLogsCount] = useState(0);
  const [filterUser, setFilterUser] = useState('');
  const [filterType, setFilterType] = useState('');

  // Analytics stats
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetchCampaigns();
    fetchLogs();
  }, [filterUser, filterType]);

  const fetchCampaigns = async () => {
    try {
      const res = await dataService.adminGetCampaigns();
      setCampaigns(res || []);
    } catch (e) {
      console.error('Failed to load campaigns', e);
    }
  };

  const fetchLogs = async () => {
    try {
      const params: any = { limit: 20 };
      if (filterUser) params.user_id = filterUser;
      if (filterType) params.type = filterType;
      const res = await dataService.adminGetLogs(params);
      if (res && res.success) {
        setLogs(res.data);
        setLogsCount(res.total);
      }
    } catch (e) {
      console.error('Failed to load history logs', e);
    }
  };

  const fetchAnalytics = async (campaignId: string) => {
    try {
      const res = await dataService.adminGetAnalytics(campaignId);
      if (res && res.success) {
        setAnalytics(res.data);
      }
    } catch (e) {
      console.error('Failed to fetch analytics', e);
    }
  };
  // User search handler
  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query);
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }
    setUserSearchLoading(true);
    try {
      const results = await dataService.adminSearchUsers(query);
      setUserSearchResults(results || []);
    } catch (e) {
      console.error('User search failed', e);
      setUserSearchResults([]);
    } finally {
      setUserSearchLoading(false);
    }
  };

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setGrantUserId(user._id);
    setUnlockUserId(user._id);
    setUserSearchQuery('');
    setUserSearchResults([]);
    setShowUserSearch(false);
    if (selectedCampaign?._id) {
      fetchUserSpinStatus(user._id, selectedCampaign._id);
    }
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setGrantUserId('');
    setUnlockUserId('');
    setSelectedUserSpinBalance(null);
  };

  const handleGrantSpins = async () => {
    if (!grantUserId || !selectedCampaign?._id) {
      alert(selectedCampaign?._id ? 'Vui lòng điền mã người dùng (User ID).' : 'Vui lòng chọn một chiến dịch để tặng.');
      return;
    }
    setGrantLoading(true);
    try {
      const res = await dataService.adminGrantSpins({
        user_id: grantUserId,
        campaign_id: selectedCampaign._id,
        spins_count: grantSpinsCount,
        reason: grantReason
      });
      if (res && res.success) {
        alert(dict.grantSuccess);
        if (selectedUser?._id) {
          fetchUserSpinStatus(selectedUser._id, selectedCampaign._id);
        }
        setGrantReason('Manual support grant');
        fetchLogs();
        fetchAnalytics(selectedCampaign._id);
      } else {
        alert(res?.message || dict.errorOccurred);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || dict.errorOccurred);
    } finally {
      setGrantLoading(false);
    }
  };

  const handleUnlockUser = async () => {
    if (!unlockUserId) {
      alert('Vui lòng điền mã người dùng (User ID).');
      return;
    }
    if (!confirm(dict.confirmUnlock)) return;
    setUnlockLoading(true);
    try {
      const res = await dataService.adminUnlockUser(unlockUserId);
      if (res && res.success) {
        alert(dict.unlockSuccess);
        setUnlockUserId('');
        // Refresh selected user
        if (selectedUser && selectedUser._id === unlockUserId) {
          const results = await dataService.adminSearchUsers(unlockUserId);
          if (results && results.length > 0) {
            setSelectedUser(results[0]);
          }
        }
        fetchLogs();
      } else {
        alert(res?.message || dict.errorOccurred);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || dict.errorOccurred);
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleLockUser = async () => {
    if (!selectedUser?._id) {
      alert('Vui lòng chọn một người dùng.');
      return;
    }
    setLockLoading(true);
    try {
      const res = await dataService.adminLockUser({
        user_id: selectedUser._id,
        scope: lockScope,
        reason: lockReason,
        duration_hours: lockDuration
      });
      if (res && res.success) {
        alert(`Đã khóa thành công người dùng: ${selectedUser.full_name || selectedUser.username}`);
        const results = await dataService.adminSearchUsers(selectedUser._id);
        if (results && results.length > 0) {
          setSelectedUser(results[0]);
        }
        fetchLogs();
      } else {
        alert(res?.message || dict.errorOccurred);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || dict.errorOccurred);
    } finally {
      setLockLoading(false);
    }
  };

  const handleSelectCampaign = (c: Campaign) => {
    setSelectedCampaign(c);
    fetchAnalytics(c._id!);
    if (selectedUser?._id) {
      fetchUserSpinStatus(selectedUser._id, c._id!);
    } else {
      setSelectedUserSpinBalance(null);
    }
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setName('');
    setDescription('');
    setType('spin');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setIsActive(true);
    setMaxSpinsDay(1);
    setMaxSpinsTotal(null);
    setRewards([]);
    setCheckinSchedule([]);
    setStreakBonuses([]);
  };

  const handleStartEdit = (c: Campaign) => {
    setIsEditing(true);
    setIsCreating(false);
    setName(c.name);
    setDescription(c.description || '');
    setType(c.type);
    setStartDate(new Date(c.start_date).toISOString().split('T')[0]);
    setEndDate(new Date(c.end_date).toISOString().split('T')[0]);
    setIsActive(c.is_active);
    setMaxSpinsDay(c.max_spins_per_user_day);
    setMaxSpinsTotal(c.max_spins_per_user_total);
    setRewards(c.rewards || []);
    setCheckinSchedule(c.checkin_schedule || []);
    setStreakBonuses(c.streak_bonuses || []);
  };

  const handleSaveCampaign = async () => {
    const payload = {
      name,
      description,
      type,
      start_date: new Date(startDate),
      end_date: new Date(endDate),
      is_active: isActive,
      max_spins_per_user_day: maxSpinsDay,
      max_spins_per_user_total: maxSpinsTotal,
      rewards,
      checkin_schedule: checkinSchedule,
      streak_bonuses: streakBonuses
    };

    try {
      let res;
      if (isCreating) {
        res = await dataService.adminCreateCampaign(payload);
      } else {
        res = await dataService.adminUpdateCampaign(selectedCampaign?._id!, payload);
      }

      if (res && res.success) {
        alert(isCreating ? 'Tạo chiến dịch thành công!' : 'Cập nhật chiến dịch thành công!');
        setIsCreating(false);
        setIsEditing(false);
        setSelectedCampaign(res.data);
        fetchCampaigns();
      } else {
        alert(res?.message || 'Có lỗi xảy ra');
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Lỗi hệ thống');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa chiến dịch này không?')) return;
    try {
      const res = await dataService.adminDeleteCampaign(id);
      if (res && res.success) {
        alert('Đã xóa chiến dịch thành công');
        setSelectedCampaign(null);
        fetchCampaigns();
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi khi xóa');
    }
  };

  // Reward handlers
  const handleAddReward = () => {
    if (!newReward.reward_name) {
      alert('Vui lòng nhập tên quà tặng');
      return;
    }
    setRewards([...rewards, newReward]);
    setNewReward({
      reward_type: 'points',
      reward_name: '',
      reward_name_en: '',
      reward_name_ja: '',
      reward_value: '',
      reward_probability: 10,
      reward_stock: null,
      total_limit: null,
      daily_limit: null,
      per_user_limit: null,
      reward_status: 'active'
    });
  };

  const handleRemoveReward = (idx: number) => {
    setRewards(rewards.filter((_, i) => i !== idx));
  };

  // Checkin Schedule handlers
  const handleAddCheckin = () => {
    if (!newCheckin.date || !newCheckin.reward_name) {
      alert('Vui lòng nhập ngày và tên quà tặng');
      return;
    }
    setCheckinSchedule([...checkinSchedule, newCheckin]);
    setNewCheckin({
      date: '',
      reward_type: 'points',
      reward_name: '',
      reward_name_en: '',
      reward_name_ja: '',
      reward_value: '',
      is_special: false
    });
  };

  const handleRemoveCheckin = (idx: number) => {
    setCheckinSchedule(checkinSchedule.filter((_, i) => i !== idx));
  };

  // Streak handlers
  const handleAddStreak = () => {
    if (!newStreak.reward_name) {
      alert('Vui lòng nhập tên quà tặng');
      return;
    }
    setStreakBonuses([...streakBonuses, newStreak]);
    setNewStreak({
      streak_days: 7,
      reward_type: 'points',
      reward_name: '',
      reward_name_en: '',
      reward_name_ja: '',
      reward_value: ''
    });
  };

  const handleRemoveStreak = (idx: number) => {
    setStreakBonuses(streakBonuses.filter((_, i) => i !== idx));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800 dark:text-slate-100">
      
      {/* Page Header */}
      <div className="flex justify-between items-center bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">sports_esports</span>
            Lotte Fun Zone Architect
          </h1>
          <p className="text-slate-400 text-xs mt-1">Quản lý vòng quay may mắn, điểm danh hàng ngày, điều khiển tỷ lệ trúng thưởng và hạn mức.</p>
        </div>
        <button
          onClick={handleStartCreate}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-colors shadow-lg"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          Tạo chiến dịch mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Campaigns List */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-md border border-slate-200/60 dark:border-slate-800">
            <h2 className="text-md font-bold mb-4 flex items-center gap-1.5 border-b pb-2 dark:border-slate-800">
              <span className="material-symbols-outlined text-slate-500 text-lg">list_alt</span>
              Danh sách chiến dịch
            </h2>
            
            {campaigns.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-6">Chưa có chiến dịch nào được cấu tạo.</p>
            ) : (
              <div className="space-y-3">
                {campaigns.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => handleSelectCampaign(c)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedCampaign?._id === c._id
                        ? 'border-red-500 bg-red-500/5 dark:bg-red-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm truncate max-w-[180px]">{c.name}</h4>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                        c.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                      }`}>
                        {c.is_active ? 'Kích hoạt' : 'Tạm dừng'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                      <span className="flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-xs">
                          {c.type === 'spin' ? 'casino' : 'verified'}
                        </span>
                        {c.type === 'spin' ? 'Vòng Quay' : 'Điểm danh'}
                      </span>
                      <span>
                        {new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QA & Support Tools Panel */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-md border border-slate-200/60 dark:border-slate-800 space-y-4">
            <h2 className="text-md font-bold flex items-center gap-1.5 border-b pb-2 dark:border-slate-800 text-red-600 dark:text-red-500">
              <span className="material-symbols-outlined text-lg">build_circle</span>
              {dict.supportHeader}
            </h2>

            {/* User Search */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">person_search</span>
                Tìm người dùng
              </h3>
              <p className="text-[10px] text-slate-400 leading-tight">Tìm theo tên, email, SĐT hoặc ID. Chọn người dùng trước khi tặng lượt hoặc mở khóa.</p>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nhập tên, email, SĐT hoặc ID..."
                  value={userSearchQuery}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  onFocus={() => setShowUserSearch(true)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-red-500 pr-8"
                />
                {userSearchLoading && (
                  <span className="absolute right-2.5 top-2 text-slate-400 text-xs animate-spin material-symbols-outlined">progress_activity</span>
                )}
                {showUserSearch && userSearchResults.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {userSearchResults.map((u) => (
                      <div
                        key={u._id}
                        onClick={() => handleSelectUser(u)}
                        className="p-2.5 cursor-pointer hover:bg-red-500/5 dark:hover:bg-red-950/20 border-b last:border-0 dark:border-slate-800 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold truncate">{u.full_name || u.username}</span>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            u.status === 'LOCKED' ? 'bg-red-600 text-white' : 'bg-emerald-500/10 text-emerald-500'
                          }`}>{u.status === 'LOCKED' ? '🔒 Khóa' : 'Active'}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{u.email || 'N/A'} · {u.phone || 'N/A'}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">ID: {u._id}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected User Card */}
            {selectedUser && (
              <div className={`p-3 rounded-xl border-2 space-y-1.5 ${
                (selectedUser.status === 'LOCKED' || selectedUser.gamification_lock?.is_locked) ? 'border-red-500 bg-red-500/5' : 'border-emerald-500 bg-emerald-500/5'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-black">{selectedUser.full_name || selectedUser.username}</p>
                    <p className="text-[10px] text-slate-500">{selectedUser.email || 'N/A'} · {selectedUser.phone || 'N/A'}</p>
                    <p className="text-[9px] text-slate-400 font-mono">ID: {selectedUser._id}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-0.5 ${
                      (selectedUser.status === 'LOCKED' || selectedUser.gamification_lock?.is_locked) ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-500/10 text-emerald-600'
                    }`}>
                      <span className="material-symbols-outlined text-[10px]">{(selectedUser.status === 'LOCKED' || selectedUser.gamification_lock?.is_locked) ? 'lock' : 'check_circle'}</span>
                      {(selectedUser.status === 'LOCKED' || selectedUser.gamification_lock?.is_locked) ? dict.lockedStatus : dict.activeStatus}
                    </span>
                    <button onClick={handleClearUser} className="text-[10px] text-slate-400 hover:text-red-500 underline">Bỏ chọn</button>
                  </div>
                </div>
                {(selectedUser.status === 'LOCKED' || selectedUser.gamification_lock?.is_locked) && (
                  <div className="text-[10px] text-red-500 font-semibold bg-red-500/10 rounded-lg px-2 py-1.5 space-y-0.5">
                    <p className="flex items-center gap-1 font-bold">
                      <span className="material-symbols-outlined text-xs">warning</span>
                      Tài khoản bị khóa gamification
                    </p>
                    {selectedUser.gamification_lock?.scope && (
                      <p>• Phạm vi: <span className="font-bold uppercase text-[9px] bg-red-600 text-white px-1 rounded">{selectedUser.gamification_lock.scope}</span></p>
                    )}
                    {selectedUser.gamification_lock?.reason && (
                      <p>• Lý do: <span className="italic">{selectedUser.gamification_lock.reason}</span></p>
                    )}
                    {selectedUser.gamification_lock?.expires_at && (
                      <p>• Hết hạn: <span className="font-mono">{new Date(selectedUser.gamification_lock.expires_at).toLocaleString()}</span></p>
                    )}
                  </div>
                )}
                
                {/* User Spin Balance Status */}
                {selectedCampaign && selectedCampaign.type === 'spin' && (
                  <div className="bg-slate-100 dark:bg-slate-900/40 p-2.5 rounded-lg border dark:border-slate-800 space-y-1 mt-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lượt quay hiện tại:</p>
                    {selectedUserSpinBalance ? (
                      <div className="grid grid-cols-3 gap-1.5 text-center text-[9px]">
                        <div className="bg-white dark:bg-slate-800 p-1 rounded">
                          <span className="block font-black text-blue-500 text-[11px]">{selectedUserSpinBalance.spins_granted}</span>
                          <span className="text-slate-400 font-medium">Được tặng</span>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-1 rounded">
                          <span className="block font-black text-amber-500 text-[11px]">{selectedUserSpinBalance.spins_used}</span>
                          <span className="text-slate-400 font-medium">Đã dùng</span>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-1 rounded">
                          <span className="block font-black text-emerald-500 text-[11px]">{selectedUserSpinBalance.spins_remaining}</span>
                          <span className="text-slate-400 font-medium">Còn lại</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[9px] text-slate-400 italic">Đang tải số lượt quay...</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <hr className="dark:border-slate-800" />

            {/* Grant Extra Spins */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-500">{dict.grantSpins}</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">{dict.spinsCount} *</label>
                  <input type="number" min="1" value={grantSpinsCount}
                    onChange={(e) => setGrantSpinsCount(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl py-1.5 px-3 text-xs focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">{dict.reason}</label>
                  <input type="text" value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl py-1.5 px-3 text-xs focus:outline-none" />
                </div>
              </div>
              <button type="button" onClick={handleGrantSpins} disabled={grantLoading || !grantUserId}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors disabled:opacity-40">
                <span className="material-symbols-outlined text-xs">add_circle</span>
                {grantLoading ? dict.granting : `${dict.grantBtn} → ${selectedUser?.full_name || grantUserId || '...'}`}
              </button>
            </div>

            <hr className="dark:border-slate-800" />

            {/* Lock User */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-red-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">lock</span>
                Khóa tài khoản Gamification
              </h3>
              <p className="text-[10px] text-slate-400 leading-tight">Khóa người dùng khỏi vòng quay hoặc điểm danh hoặc toàn bộ tính năng game.</p>
              
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Phạm vi khóa (Scope)</label>
                  <select
                    value={lockScope}
                    onChange={(e) => setLockScope(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl py-1.5 px-3 text-xs focus:outline-none"
                  >
                    <option value="all">Tất cả tính năng (all)</option>
                    <option value="spin">Chỉ Vòng quay (spin)</option>
                    <option value="checkin">Chỉ Điểm danh (checkin)</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Thời hạn (Giờ)</label>
                    <input
                      type="number"
                      min="0"
                      value={lockDuration}
                      onChange={(e) => setLockDuration(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl py-1.5 px-3 text-xs focus:outline-none"
                      placeholder="0 = Vô hạn"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Lý do khóa</label>
                    <input
                      type="text"
                      value={lockReason}
                      onChange={(e) => setLockReason(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl py-1.5 px-3 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLockUser}
                disabled={lockLoading || !selectedUser?._id}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-xs">lock</span>
                {lockLoading ? 'Đang khóa...' : `Khóa Game → ${selectedUser?.full_name || '...'}`}
              </button>
            </div>

            <hr className="dark:border-slate-800" />

            {/* Unlock User */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">lock_open</span>
                {dict.unlockUser}
              </h3>
              <p className="text-[10px] text-slate-400 leading-tight">Mở khóa gamification (spin + check-in) cho người dùng bị khóa do spam/vi phạm.</p>
              <button type="button" onClick={handleUnlockUser} disabled={unlockLoading || !unlockUserId}
                className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors disabled:opacity-40">
                <span className="material-symbols-outlined text-xs">lock_open</span>
                {unlockLoading ? dict.unlocking : `${dict.unlockBtn} → ${selectedUser?.full_name || unlockUserId || '...'}`}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Details / Edit Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Create or Edit Form */}
          {(isCreating || isEditing) && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-md border border-slate-200/60 dark:border-slate-800 space-y-5">
              <h2 className="text-lg font-black flex items-center gap-1.5 border-b pb-2 dark:border-slate-800">
                <span className="material-symbols-outlined text-red-500">edit_note</span>
                {isCreating ? 'Tạo cấu hình Game mới' : `Chỉnh sửa: ${selectedCampaign?.name}`}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Tên chiến dịch *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-red-500"
                    placeholder="e.g. Vòng quay may mắn Lotte Hè 2026"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Loại Game *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-red-500"
                  >
                    <option value="spin">Vòng quay may mắn (Lucky Spin)</option>
                    <option value="checkin">Điểm danh hàng ngày (Daily Check-in)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Mô tả chương trình</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-red-500 h-20"
                  placeholder="Nhập thông tin giới thiệu, thể lệ..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Ngày bắt đầu *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Ngày kết thúc *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:outline-none"
                  />
                </div>
                <div className="flex items-center mt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4"
                    />
                    <span className="text-sm font-bold">Kích hoạt chiến dịch</span>
                  </label>
                </div>
              </div>

              {type === 'spin' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 dark:border-slate-800">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Lượt quay tối đa / User / Ngày</label>
                    <input
                      type="number"
                      value={maxSpinsDay}
                      onChange={(e) => setMaxSpinsDay(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Tổng lượt quay tối đa / User</label>
                    <input
                      type="number"
                      value={maxSpinsTotal || ''}
                      onChange={(e) => setMaxSpinsTotal(e.target.value ? Number(e.target.value) : null)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:outline-none"
                      placeholder="Trống = Không giới hạn"
                    />
                  </div>
                </div>
              )}

              {/* REWARD POOL SETTINGS */}
              <div className="border-t pt-4 dark:border-slate-800 space-y-4">
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">redeem</span>
                  Cấu hình bể phần thưởng (Reward Pool)
                </h3>

                {/* Sub-form to Add Reward */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Tên quà (Vi) *</label>
                    <input
                      type="text"
                      value={newReward.reward_name}
                      onChange={(e) => setNewReward({ ...newReward, reward_name: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs"
                      placeholder="e.g. 500 Điểm Lotte"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Tên quà (En)</label>
                    <input
                      type="text"
                      value={newReward.reward_name_en}
                      onChange={(e) => setNewReward({ ...newReward, reward_name_en: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs"
                      placeholder="e.g. 500 Lotte Points"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Loại Quà *</label>
                    <select
                      value={newReward.reward_type}
                      onChange={(e) => setNewReward({ ...newReward, reward_type: e.target.value as any })}
                      className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs"
                    >
                      <option value="points">Cộng Điểm Lotte (points)</option>
                      <option value="coupon">Voucher giảm giá (coupon)</option>
                      <option value="free_shipping">Free Shipping coupon</option>
                      <option value="discount_card">Thẻ quà tặng / Chiết khấu</option>
                      <option value="gift_item">Quà tặng hiện vật (gift_item)</option>
                      <option value="empty">Chúc may mắn lần sau (empty)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Giá trị nhận (Điểm số/Mã Voucher) *</label>
                    <input
                      type="text"
                      value={newReward.reward_value || ''}
                      onChange={(e) => setNewReward({ ...newReward, reward_value: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs"
                      placeholder="e.g. 500 hoặc CODE50K"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Trọng số tỷ lệ (Probability Weight) *</label>
                    <input
                      type="number"
                      value={newReward.reward_probability}
                      onChange={(e) => setNewReward({ ...newReward, reward_probability: Number(e.target.value) })}
                      className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Hạn mức / User</label>
                    <input
                      type="number"
                      value={newReward.per_user_limit || ''}
                      onChange={(e) => setNewReward({ ...newReward, per_user_limit: e.target.value ? Number(e.target.value) : null })}
                      className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs"
                      placeholder="Trống = Vô hạn"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddReward}
                      className="bg-slate-950 text-white font-bold py-1.5 px-3 rounded-lg text-xs hover:bg-slate-800 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">add_circle</span>
                      Thêm vào bể quà
                    </button>
                  </div>
                </div>

                {/* Rewards List Table */}
                {rewards.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">Bể quà đang trống. Vui lòng thêm quà tặng ở trên.</p>
                ) : (
                  <div className="overflow-x-auto border rounded-xl dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b dark:border-slate-800">
                          <th className="p-2.5">Tên quà</th>
                          <th className="p-2.5">Loại</th>
                          <th className="p-2.5">Giá trị</th>
                          <th className="p-2.5">Trọng số (Tỷ lệ)</th>
                          <th className="p-2.5">Hạn mức / User</th>
                          <th className="p-2.5 text-center">Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rewards.map((r, idx) => (
                          <tr key={idx} className="border-b last:border-0 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                            <td className="p-2.5 font-semibold">{r.reward_name}</td>
                            <td className="p-2.5"><span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">{r.reward_type}</span></td>
                            <td className="p-2.5 font-bold text-red-500">{String(r.reward_value)}</td>
                            <td className="p-2.5">{r.reward_probability}</td>
                            <td className="p-2.5">{r.per_user_limit ?? 'Không hạn chế'}</td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveReward(idx)}
                                className="text-red-500 hover:text-red-700 font-bold"
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* DAILY CHECK-IN SCHEDULE SETTINGS */}
              {type === 'checkin' && (
                <div className="border-t pt-4 dark:border-slate-800 space-y-4">
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <span className="material-symbols-outlined text-lg">calendar_month</span>
                    Lịch thưởng điểm danh (Check-in Schedule)
                  </h3>

                  {/* Add Checkin Schedule Sub-form */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Chọn Ngày *</label>
                      <input
                        type="date"
                        value={newCheckin.date}
                        onChange={(e) => setNewCheckin({ ...newCheckin, date: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Tên quà *</label>
                      <input
                        type="text"
                        value={newCheckin.reward_name}
                        onChange={(e) => setNewCheckin({ ...newCheckin, reward_name: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs"
                        placeholder="e.g. Quà điểm danh đặc biệt Chủ Nhật"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Loại Quà *</label>
                      <select
                        value={newCheckin.reward_type}
                        onChange={(e) => setNewCheckin({ ...newCheckin, reward_type: e.target.value as any })}
                        className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs"
                      >
                        <option value="points">Cộng Điểm Lotte (points)</option>
                        <option value="coupon">Voucher giảm giá (coupon)</option>
                        <option value="free_shipping">Free Shipping coupon</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Giá trị quà tặng *</label>
                      <input
                        type="text"
                        value={newCheckin.reward_value || ''}
                        onChange={(e) => setNewCheckin({ ...newCheckin, reward_value: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs"
                        placeholder="Số điểm hoặc mã coupon"
                      />
                    </div>
                    <div className="flex items-center mt-5">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold">
                        <input
                          type="checkbox"
                          checked={newCheckin.is_special}
                          onChange={(e) => setNewCheckin({ ...newCheckin, is_special: e.target.checked })}
                          className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4"
                        />
                        Quà tặng đặc biệt (Nhân đôi)
                      </label>
                    </div>
                    <div className="flex justify-end items-end mt-4">
                      <button
                        type="button"
                        onClick={handleAddCheckin}
                        className="bg-slate-950 text-white font-bold py-1.5 px-3 rounded-lg text-xs hover:bg-slate-800 flex items-center gap-1"
                      >
                        Thêm vào lịch
                      </button>
                    </div>
                  </div>

                  {/* Checkin list table */}
                  {checkinSchedule.length > 0 && (
                    <div className="overflow-x-auto border rounded-xl dark:border-slate-800">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b dark:border-slate-800">
                            <th className="p-2.5">Ngày</th>
                            <th className="p-2.5">Tên quà</th>
                            <th className="p-2.5">Loại</th>
                            <th className="p-2.5">Giá trị</th>
                            <th className="p-2.5 text-center">Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {checkinSchedule.map((c, idx) => (
                            <tr key={idx} className="border-b last:border-0 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                              <td className="p-2.5 font-bold font-mono">{c.date}</td>
                              <td className="p-2.5 font-semibold">{c.reward_name} {c.is_special && '🌟'}</td>
                              <td className="p-2.5">{c.reward_type}</td>
                              <td className="p-2.5 font-bold text-red-500">{String(c.reward_value)}</td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCheckin(idx)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  Xóa
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Streak Bonuses Configuration */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 space-y-3 mt-4">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Cấu hình quà chuỗi (Streak Bonus)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Số ngày chuỗi *</label>
                        <input
                          type="number"
                          value={newStreak.streak_days}
                          onChange={(e) => setNewStreak({ ...newStreak, streak_days: Number(e.target.value) })}
                          className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs"
                          placeholder="e.g. 7"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Tên quà chuỗi *</label>
                        <input
                          type="text"
                          value={newStreak.reward_name}
                          onChange={(e) => setNewStreak({ ...newStreak, reward_name: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs"
                          placeholder="e.g. Quà Chuỗi 7 Ngày"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Loại Quà *</label>
                        <select
                          value={newStreak.reward_type}
                          onChange={(e) => setNewStreak({ ...newStreak, reward_type: e.target.value as any })}
                          className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs"
                        >
                          <option value="points">Cộng Điểm Lotte (points)</option>
                          <option value="coupon">Voucher giảm giá (coupon)</option>
                          <option value="free_shipping">Free Shipping coupon</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Giá trị quà tặng *</label>
                        <input
                          type="text"
                          value={newStreak.reward_value || ''}
                          onChange={(e) => setNewStreak({ ...newStreak, reward_value: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs"
                          placeholder="Số điểm hoặc mã coupon"
                        />
                      </div>
                      <div className="flex justify-end items-end md:col-span-2">
                        <button
                          type="button"
                          onClick={handleAddStreak}
                          className="bg-slate-950 text-white font-bold py-1.5 px-3 rounded-lg text-xs hover:bg-slate-800 flex items-center gap-1"
                        >
                          Thêm quà chuỗi
                        </button>
                      </div>
                    </div>

                    {/* Streak list table */}
                    {streakBonuses.length > 0 && (
                      <div className="overflow-x-auto border rounded-xl dark:border-slate-800 mt-2">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b dark:border-slate-800">
                              <th className="p-2">Chuỗi (ngày)</th>
                              <th className="p-2">Tên quà</th>
                              <th className="p-2">Loại</th>
                              <th className="p-2">Giá trị</th>
                              <th className="p-2 text-center">Hành động</th>
                            </tr>
                          </thead>
                          <tbody>
                            {streakBonuses.map((s, idx) => (
                              <tr key={idx} className="border-b last:border-0 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                                <td className="p-2 font-bold">{s.streak_days} ngày</td>
                                <td className="p-2 font-semibold">{s.reward_name}</td>
                                <td className="p-2">{s.reward_type}</td>
                                <td className="p-2 font-bold text-red-500">{String(s.reward_value)}</td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStreak(idx)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    Xóa
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Form buttons */}
              <div className="flex justify-end gap-3 border-t pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setIsEditing(false); }}
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold py-2 px-4 rounded-xl text-sm"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveCampaign}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-xl text-sm"
                >
                  Lưu cấu hình
                </button>
              </div>
            </div>
          )}

          {/* Campaign Dashboard & Statistics view */}
          {selectedCampaign && !isEditing && !isCreating && (
            <div className="space-y-6">
              
              {/* Stats Card details */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-md">
                <div className="flex justify-between items-start border-b pb-4 mb-4 dark:border-slate-800">
                  <div>
                    <h2 className="text-xl font-black">{selectedCampaign.name}</h2>
                    <p className="text-xs text-slate-500 mt-1">{selectedCampaign.description || 'Không có mô tả.'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartEdit(selectedCampaign)}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">edit</span>
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(selectedCampaign._id!)}
                      className="bg-red-600/10 hover:bg-red-600/20 text-red-600 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                      Xóa
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Tổng số lượt chơi</p>
                    <h3 className="text-xl font-black mt-1">{analytics?.totalParticipation ?? 0}</h3>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Lượt trúng quà</p>
                    <h3 className="text-xl font-black mt-1 text-emerald-500">{analytics?.successfulClaims ?? 0}</h3>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Thất bại / Hủy bỏ</p>
                    <h3 className="text-xl font-black mt-1 text-red-500">{analytics?.failedClaims ?? 0}</h3>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Tỷ lệ thành công</p>
                    <h3 className="text-xl font-black mt-1 text-amber-500">
                      {analytics?.totalParticipation > 0 
                        ? `${Math.round((analytics.successfulClaims / analytics.totalParticipation) * 100)}%` 
                        : '0%'}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Wins by reward type breakdown */}
              {analytics?.winsByType?.length > 0 && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-md">
                  <h3 className="text-sm font-bold mb-3 border-b pb-2 dark:border-slate-800">Phân bố cơ cấu quà trúng thưởng</h3>
                  <div className="space-y-3">
                    {analytics.winsByType.map((win: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="capitalize font-medium">{win.type}</span>
                        <span className="font-bold">{win.count} lượt</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Campaign Preview (Read-Only Configuration) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-md space-y-4">
                <h3 className="text-sm font-black flex items-center gap-1.5 border-b pb-2 dark:border-slate-800">
                  <span className="material-symbols-outlined text-slate-500">visibility</span>
                  {dict.previewCampaign}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-400">{dict.campaignType}: </span>
                    <span className="font-semibold capitalize">{selectedCampaign.type === 'spin' ? 'Vòng quay may mắn (Lucky Spin)' : 'Điểm danh hàng ngày (Daily Check-in)'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">{dict.dateRange}: </span>
                    <span className="font-semibold">{new Date(selectedCampaign.start_date).toLocaleDateString()} - {new Date(selectedCampaign.end_date).toLocaleDateString()}</span>
                  </div>
                  {selectedCampaign.type === 'spin' && (
                    <>
                      <div>
                        <span className="font-bold text-slate-400">Giới hạn quay/ngày: </span>
                        <span className="font-semibold">{selectedCampaign.max_spins_per_user_day}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400">Tổng giới hạn quay: </span>
                        <span className="font-semibold">{selectedCampaign.max_spins_per_user_total ?? 'Không giới hạn'}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Rewards Pool Preview */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500">{dict.rewardsPool}</h4>
                  <div className="overflow-x-auto border rounded-xl dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b dark:border-slate-800">
                          <th className="p-2">Tên quà (VI)</th>
                          <th className="p-2">Tên quà (EN)</th>
                          <th className="p-2">Loại</th>
                          <th className="p-2">Giá trị</th>
                          <th className="p-2">{dict.probability}</th>
                          <th className="p-2">{dict.stock}</th>
                          <th className="p-2">{dict.claimed}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCampaign.rewards.map((r, idx) => (
                          <tr key={idx} className="border-b last:border-0 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                            <td className="p-2 font-medium">{r.reward_name}</td>
                            <td className="p-2 text-slate-400">{r.reward_name_en || '-'}</td>
                            <td className="p-2 capitalize text-slate-500">{r.reward_type}</td>
                            <td className="p-2 font-bold text-red-500">{String(r.reward_value)}</td>
                            <td className="p-2 font-mono">{r.reward_probability}%</td>
                            <td className="p-2">{r.reward_stock !== null ? r.reward_stock : '∞'}</td>
                            <td className="p-2 text-emerald-500 font-semibold">{r.claimed_count ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Daily Check-in Schedule (if type is checkin) */}
                {selectedCampaign.type === 'checkin' && selectedCampaign.checkin_schedule?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500">{dict.schedule}</h4>
                    <div className="overflow-x-auto border rounded-xl dark:border-slate-800">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b dark:border-slate-800">
                            <th className="p-2 font-mono">Ngày</th>
                            <th className="p-2">Quà tặng</th>
                            <th className="p-2">Tên quà (EN)</th>
                            <th className="p-2">Loại</th>
                            <th className="p-2">Giá trị</th>
                            <th className="p-2 text-center">Đặc biệt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCampaign.checkin_schedule.map((day, idx) => (
                            <tr key={idx} className="border-b last:border-0 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                              <td className="p-2 font-mono font-bold">{day.date}</td>
                              <td className="p-2 font-medium">{day.reward_name}</td>
                              <td className="p-2 text-slate-400">{day.reward_name_en || '-'}</td>
                              <td className="p-2 text-slate-500">{day.reward_type}</td>
                              <td className="p-2 font-bold text-red-500">{String(day.reward_value)}</td>
                              <td className="p-2 text-center">{day.is_special ? '🌟' : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Streak Bonuses (if type is checkin) */}
                {selectedCampaign.type === 'checkin' && selectedCampaign.streak_bonuses?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500">{dict.streakBonuses}</h4>
                    <div className="overflow-x-auto border rounded-xl dark:border-slate-800">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b dark:border-slate-800">
                            <th className="p-2">Số ngày</th>
                            <th className="p-2">Tên quà thưởng</th>
                            <th className="p-2">Tên quà (EN)</th>
                            <th className="p-2">Loại</th>
                            <th className="p-2">Giá trị</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCampaign.streak_bonuses.map((bonus, idx) => (
                            <tr key={idx} className="border-b last:border-0 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                              <td className="p-2 font-bold">{bonus.streak_days} ngày</td>
                              <td className="p-2 font-medium">{bonus.reward_name}</td>
                              <td className="p-2 text-slate-400">{bonus.reward_name_en || '-'}</td>
                              <td className="p-2 text-slate-500">{bonus.reward_type}</td>
                              <td className="p-2 font-bold text-red-500">{String(bonus.reward_value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audited Logs View */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-md">
            <h2 className="text-md font-bold mb-4 flex items-center gap-1.5 border-b pb-2 dark:border-slate-800">
              <span className="material-symbols-outlined text-slate-500 text-lg">history</span>
              Nhật ký quay số & điểm danh của người dùng (Audit Trial - {logsCount} lượt)
            </h2>

            {/* Filter tools */}
            <div className="flex flex-wrap gap-3 mb-4">
              <input
                type="text"
                placeholder="Lọc theo ID User..."
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl py-1.5 px-3 text-xs focus:outline-none"
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl py-1.5 px-3 text-xs focus:outline-none"
              >
                <option value="">Tất cả loại hình</option>
                <option value="spin">Vòng quay (spin)</option>
                <option value="checkin">Điểm danh (checkin)</option>
                <option value="streak">Chuỗi đặc biệt (streak)</option>
              </select>
            </div>

            {logs.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-6">Chưa ghi nhận nhật ký nào.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b dark:border-slate-800">
                      <th className="p-2.5">Người dùng</th>
                      <th className="p-2.5">Loại hình</th>
                      <th className="p-2.5">Quà trúng</th>
                      <th className="p-2.5">Thời gian</th>
                      <th className="p-2.5">Trạng thái</th>
                      <th className="p-2.5">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log._id} className="border-b last:border-0 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        <td className="p-2.5 max-w-[180px]">
                          <div
                            className="cursor-pointer hover:bg-red-500/5 rounded-lg p-1 -m-1 transition-colors"
                            onClick={() => {
                              if (log.user_info) {
                                handleSelectUser(log.user_info);
                              } else {
                                setGrantUserId(log.user_id);
                                setUnlockUserId(log.user_id);
                              }
                            }}
                            title="Click để chọn người dùng này"
                          >
                            <p className="text-xs font-bold truncate">{log.user_info?.full_name || log.user_info?.username || 'N/A'}</p>
                            <p className="text-[10px] text-slate-400 truncate">{log.user_info?.email || ''}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[9px] text-slate-400 font-mono truncate">{log.user_id}</span>
                              {log.user_info?.status === 'LOCKED' && (
                                <span className="text-[8px] font-black bg-red-600 text-white px-1 rounded">🔒</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.type === 'spin' ? 'bg-amber-500/10 text-amber-600' :
                            log.type === 'checkin' ? 'bg-blue-500/10 text-blue-600' :
                            'bg-purple-500/10 text-purple-600'
                          }`}>
                            {log.type === 'spin' ? '🎰 Vòng quay' : log.type === 'checkin' ? '✅ Điểm danh' : '🔥 Chuỗi'}
                          </span>
                        </td>
                        <td className="p-2.5 font-semibold text-red-500">
                          {log.reward?.reward_name} {log.reward?.reward_value ? `(${log.reward.reward_value})` : ''}
                        </td>
                        <td className="p-2.5 text-slate-500 text-[11px]">
                          {new Date(log.claimed_at).toLocaleString()}
                        </td>
                        <td className="p-2.5">
                          {log.error_message && (log.error_message.includes('LOCKED') || log.error_message.includes('SPAM') || log.error_message.includes('abuse')) ? (
                            <span className="inline-flex items-center gap-1 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-extrabold shadow-sm animate-pulse">
                              <span className="material-symbols-outlined text-[10px]">lock</span>
                              {dict.lockedStatus}
                            </span>
                          ) : (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                              {log.status === 'delivered' ? '✓ Đã trao' : '✗ Lỗi'}
                            </span>
                          )}
                          {log.error_message && !(log.error_message.includes('LOCKED') || log.error_message.includes('SPAM') || log.error_message.includes('abuse')) && (
                            <p className="text-[10px] text-red-400 mt-0.5">{log.error_message}</p>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-[10px] text-slate-400">{log.ip || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default AdminGamification;
