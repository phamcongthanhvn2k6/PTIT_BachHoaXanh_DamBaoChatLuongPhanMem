import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { promotionService } from '../services/promotionService';
import { useAppSelector } from '../store';
import { toast } from '../components/Toast/toastEvent';
import PromotionImageDisplay from '../components/PromotionImageFallback/PromotionImageFallback';

const PromotionDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const { currentBranch } = useAppSelector((s) => s.branch);

  const [promotion, setPromotion] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const computeCampaignState = (campaign: any) => {
    if (!campaign) return { soldOut: false, expired: false, inactive: false, remaining: null as number | null };
    const now = Date.now();
    const endTs = campaign?.end_date ? new Date(campaign.end_date).getTime() : null;
    const expired = Boolean(endTs && now > endTs);
    const total = Number(campaign?.total_quantity ?? campaign?.usage_limit ?? 0);
    const used = Number(campaign?.claimed_count ?? campaign?.usage_count ?? 0);
    const remaining = campaign?.remaining_quantity !== undefined && campaign?.remaining_quantity !== null
      ? Number(campaign.remaining_quantity)
      : (total > 0 ? Math.max(0, total - used) : null);
    const soldOut = Boolean(campaign?.is_sold_out || (remaining !== null && remaining <= 0));
    const inactive = campaign?.is_active === false || ['draft', 'paused'].includes(String(campaign?.status || '').toLowerCase());
    return { soldOut, expired, inactive, remaining };
  };

  const campaignState = computeCampaignState(promotion);
  const canClaim = !campaignState.soldOut && !campaignState.expired && !campaignState.inactive;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const res = await promotionService.getPromotionById(id);
      if (mounted) {
        setPromotion(res.data || null);
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleClaim = async () => {
    if (!id) return;
    if (!isAuthenticated) {
      toast.warning(t('promotion.loginToClaim', 'Vui lòng đăng nhập để nhận khuyến mãi'));
      navigate('/login');
      return;
    }

    try {
      const branchId = String(currentBranch?.id || (currentBranch as any)?._id || '');
      const res = await promotionService.claimPromotion(id, branchId || undefined);
      if (res?.success === false) {
        toast.error(res.message || t('promotion.claimFailed', 'Không thể nhận khuyến mãi'));
        return;
      }
      toast.success(res?.message || t('promotion.claimSuccess', 'Nhận khuyến mãi thành công'));
      const refresh = await promotionService.getPromotionById(id);
      setPromotion(refresh.data || null);
    } catch {
      toast.error(t('promotion.claimUnavailable', 'Không thể nhận khuyến mãi lúc này'));
    }
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto py-16 text-center">{t('promotion.loadingDetail')}</div>;
  }

  if (!promotion) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center">
        <p className="text-slate-500 mb-4">{t('promotion.notFound')}</p>
        <button className="px-4 py-2 rounded bg-primary text-white" onClick={() => navigate('/promotions')}>{t('promotion.backToPromo')}</button>
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <button className="text-primary font-semibold mb-4" onClick={() => navigate('/promotions')}>
        ← {t('promotion.backToList', 'Quay lại danh sách khuyến mãi')}
      </button>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <PromotionImageDisplay
          imageUrl={promotion.banner_image || promotion.image_url || promotion.image}
          voucherType={promotion.voucher_type}
          type={promotion.type}
          className="w-full h-64"
          aspectRatio=""
        />

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded bg-primary text-white text-xs font-bold uppercase">
              {promotion.badge_text || promotion.type || 'PROMO'}
            </span>
            {campaignState.soldOut && (
              <span className="px-3 py-1 rounded bg-red-100 text-red-700 text-xs font-bold uppercase">{t('promotion.outOfStock')}</span>
            )}
            {!campaignState.soldOut && campaignState.expired && (
              <span className="px-3 py-1 rounded bg-orange-100 text-orange-700 text-xs font-bold uppercase">{t('promotion.expired')}</span>
            )}
            <span className="text-xs text-slate-500">{t('promotion.priorityLabel', 'Độ ưu tiên')}: {promotion.priority || 0}</span>
          </div>

          <h1 className="text-3xl font-black text-slate-900 dark:text-white">{promotion.title}</h1>
          <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">{promotion.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 dark:bg-slate-800 rounded p-3">
              <p className="text-slate-500">{t('common.time')}</p>
              <p className="font-semibold">
                {promotion.start_date ? new Date(promotion.start_date).toLocaleString('vi-VN') : t('promotion.unlimited', 'Không giới hạn')} - {promotion.end_date ? new Date(promotion.end_date).toLocaleString('vi-VN') : t('promotion.unlimited', 'Không giới hạn')}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded p-3">
              <p className="text-slate-500">{t('promotion.orderCondition')}</p>
              <p className="font-semibold">{t('promotion.minOrderPrefix', 'Tối thiểu')} {Number(promotion.min_order_amount || 0).toLocaleString('vi-VN')}đ</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded p-3">
              <p className="text-slate-500">{t('promotion.campaignQuantity')}</p>
              <p className="font-semibold">
                {promotion.total_quantity ? `${Number(campaignState.remaining || 0).toLocaleString('vi-VN')} / ${Number(promotion.total_quantity).toLocaleString('vi-VN')} ${t('promotion.remainingSuffix', 'lượt còn lại')}` : t('promotion.unlimited', 'Không giới hạn')}
              </p>
            </div>
          </div>

          <button
            className={`px-5 py-3 rounded-xl text-white font-bold ${canClaim ? 'bg-primary' : 'bg-slate-400 cursor-not-allowed'}`}
            onClick={handleClaim}
            disabled={!canClaim}
          >
            {campaignState.soldOut
              ? t('promotion.soldOutClaim', 'Đã hết lượt nhận')
              : campaignState.expired
              ? t('promotion.expiredClaim', 'Khuyến mãi đã hết hạn')
              : campaignState.inactive
              ? t('promotion.inactiveClaim', 'Khuyến mãi chưa khả dụng')
              : t('promotion.claimAction', 'Nhận khuyến mãi')}
          </button>
        </div>
      </div>
    </main>
  );
};

export default PromotionDetail;
