import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { couponService } from '../../services/couponService';
import { promotionService } from '../../services/promotionService';
import { bannerService } from '../../services/bannerService';
import { hotDealService } from '../../services/hotDealService';
import { productService } from '../../services/productService';
import { branchService } from '../../services/branchService';
import { categoryService } from '../../services/categoryService';
import { popupAdService } from '../../services/popupAdService';

import PromotionImageDisplay from '../../components/PromotionImageFallback/PromotionImageFallback';

type GenericItem = {
  id: string | number;
  _id?: string;
  item_type: 'promotion' | 'coupon' | 'banner' | 'hot_deal' | 'popup_ad';
  title: string;
  code?: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  description?: string;
  image?: string;
  image_url?: string;
  value?: number;
  discount_value?: number;
  sold_count?: number;
  type?: string;
  scope?: 'all' | 'product' | 'category' | 'branch';
  position?: string;
  product_id?: string | number;
  original_price?: number;
  deal_price?: number;
  price?: number;
  discount_percent?: number;
  branch_id?: string | null;
  link?: string;
  valid_until?: string;
  total_quantity?: number | null;
  claimed_count?: number;
  used_count?: number;
  remaining_quantity?: number | null;
  is_sold_out?: boolean;
  max_discount_amount?: number | null;
  min_order_amount?: number;
  min_order_value?: number;
  usage_limit?: number | null;
  usage_per_user?: number;
  min_quantity?: number;
  gift_quantity?: number;
  target_product_ids?: Array<string | number>;
  target_category_ids?: Array<string | number>;
  target_branch_ids?: Array<string | number>;
  excluded_product_ids?: Array<string | number>;
  excluded_category_ids?: Array<string | number>;
  hide_after_expired_hours?: number;
  claim_campaign?: boolean;
  status?: string;
  priority?: number;
  stackable?: boolean;
  points_multiplier?: number;
  gift_product_id?: string | number | null;
  max_redemptions?: number | null;
  badge_text?: string;
  banner_url?: string;
  text_color?: string;
  overlay_color?: string;
  text_shadow?: boolean;
  subtitle?: string;
  cta_text?: string;
  cta_link?: string;
  campaign_type?: string;
  campaign_ref?: string;
  target_branch?: string;
  target_audience?: string;
  show_once_per_day?: boolean;
};

type PromotionRecordType = 'promotion' | 'coupon';
type CampaignScope = 'all' | 'product' | 'category' | 'branch';

type SelectOption = {
  id: string;
  label: string;
  meta?: string;
};

type PromotionFormState = {
  recordType: PromotionRecordType;
  title: string;
  description: string;
  imageUrl: string;
  imagePreview: string;
  is_active: boolean;
  status: 'draft' | 'active' | 'scheduled' | 'expired' | 'paused';
  type: 'percent' | 'fixed_amount' | 'bogo' | 'free_shipping' | 'points_multiplier' | 'gift_item' | 'flash_deal' | 'points';
  discount_value: string;
  min_order_amount: string;
  min_quantity: string;
  gift_quantity: string;
  max_discount_amount: string;
  points_multiplier: string;
  gift_product_id: string;
  scope: CampaignScope;
  target_product_ids: string[];
  target_category_ids: string[];
  target_branch_ids: string[];
  excluded_product_ids: string[];
  excluded_category_ids: string[];
  manualTargetIds: string;
  manualExcludedProductIds: string;
  manualExcludedCategoryIds: string;
  total_quantity: string;
  usage_per_user: string;
  usage_limit: string;
  max_redemptions: string;
  hide_after_expired_hours: string;
  start_date: string;
  end_date: string;
  code: string;
  claim_campaign: boolean;
  priority: string;
  stackable: boolean;
  badge_text: string;
  banner_url: string;
  voucher_type: 'product' | 'shipping';
  is_auto_generated?: boolean;
};

type BasicAssetFormState = {
  title: string;
  imageUrl: string;
  imagePreview: string;
  link: string;
  position: string;
  product_id: string;
  branch_product_id: string;
  branch_id: string;
  total_quantity: string;
  remaining_quantity: string;
  original_price: string;
  deal_price: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  text_color: string;
  overlay_color: string;
  text_shadow: boolean;
  subtitle: string;
  description: string;
  cta_text: string;
  campaign_type: 'url' | 'coupon' | 'promotion' | 'none';
  campaign_ref: string;
  target_branch: string;
  target_audience: 'all' | 'member' | 'new';
  priority: string;
  show_once_per_day: boolean;
};

const toItemId = (item: any): string => String(item?.id || item?._id || '');

const toDateTimeLocal = (value?: string | Date | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toIsoOrNull = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const toCsvIds = (arr?: Array<string | number>): string => {
  if (!Array.isArray(arr)) return '';
  return arr.map((id) => String(id)).join(', ');
};

const parseCsvIds = (value: string): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
};

const uniqueIds = (arr: Array<string | number>): string[] => {
  const set = new Set(arr.map((id) => String(id).trim()).filter(Boolean));
  return Array.from(set);
};

const defaultPromotionForm = (): PromotionFormState => ({
  recordType: 'promotion',
  title: '',
  description: '',
  imageUrl: '',
  imagePreview: '',
  is_active: true,
  status: 'active',
  type: 'percent',
  discount_value: '',
  min_order_amount: '',
  min_quantity: '',
  gift_quantity: '',
  max_discount_amount: '',
  points_multiplier: '1',
  gift_product_id: '',
  scope: 'all',
  target_product_ids: [],
  target_category_ids: [],
  target_branch_ids: [],
  excluded_product_ids: [],
  excluded_category_ids: [],
  manualTargetIds: '',
  manualExcludedProductIds: '',
  manualExcludedCategoryIds: '',
  total_quantity: '',
  usage_per_user: '1',
  usage_limit: '',
  max_redemptions: '',
  hide_after_expired_hours: '24',
  start_date: '',
  end_date: '',
  code: '',
  claim_campaign: false,
  priority: '0',
  stackable: false,
  badge_text: '',
  banner_url: '',
  voucher_type: 'product',
});

const defaultBasicForm = (): BasicAssetFormState => ({
  title: '',
  imageUrl: '',
  imagePreview: '',
  link: '',
  position: 'home',
  product_id: '',
  branch_product_id: '',
  branch_id: '',
  total_quantity: '',
  remaining_quantity: '',
  original_price: '',
  deal_price: '',
  start_date: '',
  end_date: '',
  is_active: true,
  text_color: '#ffffff',
  overlay_color: 'rgba(0,0,0,0.3)',
  text_shadow: true,
  subtitle: '',
  description: '',
  cta_text: '',
  campaign_type: 'none',
  campaign_ref: '',
  target_branch: 'all',
  target_audience: 'all',
  priority: '0',
  show_once_per_day: true,
});

const normalizePromotionItemToForm = (item?: GenericItem | null): PromotionFormState => {
  if (!item) return defaultPromotionForm();

  const image = item.image || item.image_url || '';

  return {
    recordType: item.item_type === 'coupon' ? 'coupon' : 'promotion',
    title: item.title || '',
    description: item.description || '',
    imageUrl: image,
    imagePreview: image,
    is_active: item.is_active !== false,
    status: (item.status as PromotionFormState['status']) || 'active',
    type: (item.type as PromotionFormState['type']) || 'percent',
    discount_value: String(item.value ?? (item as any).discount_value ?? ''),
    min_order_amount: String(item.min_order_amount ?? item.min_order_value ?? ''),
    min_quantity: String(item.min_quantity ?? ''),
    gift_quantity: String(item.gift_quantity ?? ''),
    max_discount_amount: String(item.max_discount_amount ?? ''),
    points_multiplier: String(item.points_multiplier ?? 1),
    gift_product_id: item.gift_product_id ? String(item.gift_product_id) : '',
    scope: (item.scope as CampaignScope) || 'all',
    target_product_ids: uniqueIds(item.target_product_ids || []),
    target_category_ids: uniqueIds(item.target_category_ids || []),
    target_branch_ids: uniqueIds(item.target_branch_ids || []),
    excluded_product_ids: uniqueIds(item.excluded_product_ids || []),
    excluded_category_ids: uniqueIds(item.excluded_category_ids || []),
    manualTargetIds: toCsvIds(item.scope === 'product' ? item.target_product_ids : item.scope === 'category' ? item.target_category_ids : item.scope === 'branch' ? item.target_branch_ids : []),
    manualExcludedProductIds: toCsvIds(item.excluded_product_ids),
    manualExcludedCategoryIds: toCsvIds(item.excluded_category_ids),
    total_quantity: String(item.total_quantity ?? ''),
    usage_per_user: String(item.usage_per_user ?? 1),
    usage_limit: String(item.usage_limit ?? ''),
    max_redemptions: String(item.max_redemptions ?? ''),
    hide_after_expired_hours: String(item.hide_after_expired_hours ?? 24),
    start_date: toDateTimeLocal(item.start_date),
    end_date: toDateTimeLocal(item.end_date),
    code: item.code || '',
    claim_campaign: Boolean(item.claim_campaign),
    priority: String(item.priority ?? 0),
    stackable: Boolean(item.stackable),
    badge_text: item.badge_text || '',
    banner_url: item.banner_url || '',
    voucher_type: ((item as any).voucher_type === 'shipping' ? 'shipping' : 'product'),
  };
};

const normalizeBasicItemToForm = (item?: GenericItem | null, activeTab: 'banners' | 'hot_deals' | 'popup_ads' = 'banners'): BasicAssetFormState => {
  if (!item) {
    return {
      ...defaultBasicForm(),
      position: activeTab === 'banners' ? 'home' : '',
    };
  }

  const image = item.image || item.image_url || '';
  return {
    title: item.title || '',
    imageUrl: image,
    imagePreview: image,
    link: item.link || (item as any).cta_link || '',
    position: item.position || 'home',
    product_id: item.product_id ? String(item.product_id) : '',
    branch_product_id: (item as any).branch_product_id ? String((item as any).branch_product_id) : '',
    branch_id: (item as any).branch_id ? String((item as any).branch_id) : ((item as any).target_branch_ids && (item as any).target_branch_ids.length > 0 ? String((item as any).target_branch_ids[0]) : ''),
    total_quantity: (item as any).total_quantity !== undefined && (item as any).total_quantity !== null ? String((item as any).total_quantity) : '',
    remaining_quantity: (item as any).remaining_quantity !== undefined && (item as any).remaining_quantity !== null ? String((item as any).remaining_quantity) : '',
    original_price: String(item.original_price ?? ''),
    deal_price: String(item.deal_price ?? item.price ?? ''),
    start_date: toDateTimeLocal(item.start_date),
    end_date: toDateTimeLocal(item.end_date || item.valid_until),
    is_active: item.is_active !== false,
    text_color: item.text_color || '#ffffff',
    overlay_color: item.overlay_color || 'rgba(0,0,0,0.3)',
    text_shadow: item.text_shadow !== false,
    subtitle: (item as any).subtitle || '',
    description: item.description || '',
    cta_text: (item as any).cta_text || '',
    campaign_type: (item as any).campaign_type || 'none',
    campaign_ref: (item as any).campaign_ref || '',
    target_branch: (item as any).target_branch || 'all',
    target_audience: (item as any).target_audience || 'all',
    priority: String(item.priority ?? 0),
    show_once_per_day: (item as any).show_once_per_day !== false,
  };
};

const SearchableMultiSelect: React.FC<{
  title: string;
  options: SelectOption[];
  selected: string[];
  searchText: string;
  emptyLabel: string;
  onSearchChange: (value: string) => void;
  onToggle: (id: string) => void;
}> = ({ title, options, selected, searchText, emptyLabel, onSearchChange, onToggle }) => {
  const filtered = useMemo(() => {
    if (!searchText.trim()) return options;
    const keyword = searchText.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(keyword) || String(opt.meta || '').toLowerCase().includes(keyword));
  }, [options, searchText]);

  return (
    <div className="p-4 bg-surface border border-slate-200 rounded-xl">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm font-bold">{title}</p>
        <span className="text-xs text-secondary">Đã chọn: {selected.length}</span>
      </div>
      <input
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Tìm kiếm..."
        className="w-full px-3 py-2 bg-surface-container border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="mt-3 max-h-48 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100">
        {filtered.length === 0 && (
          <p className="px-3 py-3 text-xs text-secondary">{emptyLabel}</p>
        )}
        {filtered.map((opt) => {
          const checked = selected.includes(opt.id);
          return (
            <label key={opt.id} className="flex items-start gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(opt.id)}
                className="mt-0.5 h-4 w-4 text-primary border-slate-300 rounded"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-on-surface line-clamp-1">{opt.label}</p>
                {opt.meta && <p className="text-xs text-secondary line-clamp-1">{opt.meta}</p>}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};

const CampaignPreview: React.FC<{
  form: PromotionFormState;
  sampleOrderAmount: string;
  onSampleChange: (value: string) => void;
  t: TFunction;
}> = ({ form, sampleOrderAmount, onSampleChange, t }) => {
  const sample = Math.max(0, Number(sampleOrderAmount || 0));

  const estimatedDiscount = useMemo(() => {
    const discountValue = Number(form.discount_value || 0);
    const maxDiscount = Number(form.max_discount_amount || 0);

    if (form.type === 'percent' || form.type === 'flash_deal') {
      let value = (sample * discountValue) / 100;
      if (maxDiscount > 0) value = Math.min(value, maxDiscount);
      return value;
    }

    if (form.type === 'fixed_amount') {
      return Math.min(sample, discountValue);
    }

    if (form.type === 'free_shipping') return 30000;
    if (form.type === 'points_multiplier') return sample * (Number(form.points_multiplier || 1) - 1) * 0.01;
    if (form.type === 'points') return sample * (discountValue / 100);

    return 0;
  }, [form.discount_value, form.max_discount_amount, form.points_multiplier, form.type, sample]);

  const scopeSummary =
    form.scope === 'all'
      ? t('admin.promotions.scopeAll', 'Toàn hệ thống')
      : form.scope === 'product'
      ? `${form.target_product_ids.length || parseCsvIds(form.manualTargetIds).length} ${t('admin.promotions.previewProducts', 'sản phẩm')}`
      : form.scope === 'category'
      ? `${form.target_category_ids.length || parseCsvIds(form.manualTargetIds).length} ${t('admin.promotions.previewCategories', 'danh mục')}`
      : `${form.target_branch_ids.length || parseCsvIds(form.manualTargetIds).length} ${t('admin.promotions.previewBranches', 'chi nhánh')}`;

  const totalQty = Number(form.total_quantity || 0);

  const now = new Date();
  const endDate = form.end_date ? new Date(form.end_date) : null;
  const isExpiringSoon = endDate ? endDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000 : false;
  const isLowStock = totalQty > 0 && totalQty <= 10;

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Info */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs uppercase font-black tracking-wider text-slate-400">{t('admin.promotions.previewCampaign', 'Chiến dịch')}</p>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${form.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {form.is_active
                  ? t('admin.promotions.statusActiveLabel', 'Hoạt động / Active')
                  : t('admin.promotions.statusInactiveLabel', 'Không hoạt động / Inactive')}
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-800 line-clamp-2">{form.title || t('admin.promotions.previewNoTitle', 'Chưa nhập tên chiến dịch')}</h3>
            {form.badge_text && (
              <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg">{form.badge_text}</span>
            )}
            
            <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">label</span> {t('admin.promotions.discountType', 'Loại giảm')}: <b>{form.type}</b></div>
              <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">percent</span> {t('admin.promotions.discountValue', 'Giảm')}: <b className="text-red-600">{form.discount_value}</b></div>
              <div className="flex items-center gap-1.5 col-span-2">
                 <span className="material-symbols-outlined text-[16px]">event</span>
                 {t('admin.promotions.startDate', 'Bắt đầu')}: {form.start_date ? new Date(form.start_date).toLocaleString('vi-VN') : '—'}
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                 <span className="material-symbols-outlined text-[16px]">event_available</span>
                 {t('admin.promotions.endDate', 'Kết thúc')}: {form.end_date ? new Date(form.end_date).toLocaleString('vi-VN') : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Banner/Image */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center relative overflow-hidden">
           <PromotionImageDisplay
             imageUrl={form.imagePreview || form.imageUrl}
             voucherType={form.voucher_type}
             type={form.type}
             className="absolute inset-0 w-full h-full"
             aspectRatio=""
             alt={form.title || t('admin.promotions.previewCampaign', 'Chiến dịch')}
           />
           {isExpiringSoon && (
             <div className="absolute top-2 right-2 px-2 py-1 bg-orange-500 text-white text-[10px] font-bold rounded shadow-sm flex items-center gap-1">
               <span className="material-symbols-outlined text-[14px]">warning</span> {t('admin.promotions.previewTimeShort', 'Thời gian quá ngắn')}
             </div>
           )}
        </div>
      </div>

      {isLowStock && (
        <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-center gap-2">
          <span className="material-symbols-outlined text-orange-600">warning</span>
          <p className="text-sm font-semibold text-orange-800">{t('admin.promotions.previewLowStock', 'Tồn kho / Số lượng khuyến mãi phát hành thấp (≤ 10). Chiến dịch có thể kết thúc sớm!')}</p>
        </div>
      )}

      <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <p className="text-xs uppercase font-black tracking-wider text-slate-400 mb-4">{t('admin.promotions.previewSimulation', 'Mô phỏng áp dụng')}</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-bold text-slate-600">{t('admin.promotions.previewOrderValue', 'Nếu đơn hàng có giá trị (VNĐ)')}</label>
          <input
            value={sampleOrderAmount}
            onChange={(e) => onSampleChange(e.target.value)}
            type="number"
            className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm w-48 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors font-mono font-bold"
          />
        </div>
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
           <span className="font-semibold text-slate-600">{t('admin.promotions.previewDiscount', 'Khách hàng sẽ được giảm')}:</span>
           <span className="text-xl font-black text-emerald-600">{Math.max(0, estimatedDiscount).toLocaleString('vi-VN')} đ</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <p className="text-[10px] uppercase font-black text-slate-400 mb-1">{t('admin.promotions.previewScope', 'Phạm vi')}</p>
          <p className="text-sm font-bold">{scopeSummary}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <p className="text-[10px] uppercase font-black text-slate-400 mb-1">{t('admin.promotions.previewTotalIssued', 'Tổng SL phát hành')}</p>
          <p className="text-sm font-bold text-blue-600">{totalQty > 0 ? totalQty.toLocaleString('vi-VN') : t('admin.promotions.previewUnlimited', 'Không giới hạn')}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <p className="text-[10px] uppercase font-black text-slate-400 mb-1">{t('admin.promotions.previewPerUser', 'Giới hạn mỗi User')}</p>
          <p className="text-sm font-bold">{Number(form.usage_per_user || 1).toLocaleString('vi-VN')}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <p className="text-[10px] uppercase font-black text-slate-400 mb-1">{t('admin.promotions.previewClaim', 'Claim Campaign')}</p>
          <p className="text-sm font-bold">{form.claim_campaign ? t('admin.promotions.previewClaimYes', 'Có Yêu Cầu Nhận') : t('admin.promotions.previewClaimNo', 'Tự Động Áp Dụng')}</p>
        </div>
      </div>
    </div>
  );
};

const AdminCouponsManagement: React.FC = () => {
  const { t } = useTranslation();
  const createLabel = (tab: 'promotions' | 'coupons' | 'banners' | 'hot_deals' | 'popup_ads') => {
    if (tab === 'banners') return t('admin.promotions.banner', 'Banner');
    if (tab === 'hot_deals') return t('admin.promotions.hotDeal', 'Hot Deal');
    if (tab === 'popup_ads') return t('admin.promotions.popupAd', 'Popup Ad');
    if (tab === 'coupons') return t('admin.promotions.coupon', 'Coupon');
    return t('admin.promotions.promo', 'Khuyến mãi');
  };
  const getActiveLabel = (isActive: boolean) => (
    isActive
      ? t('admin.promotions.statusActiveLabel', 'Hoạt động / Active')
      : t('admin.promotions.statusInactiveLabel', 'Không hoạt động / Inactive')
  );
  const [activeTab, setActiveTab] = useState<'promotions' | 'coupons' | 'banners' | 'hot_deals' | 'popup_ads'>('promotions');

  const [items, setItems] = useState<GenericItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [allPromotions, setAllPromotions] = useState<any[]>([]);
  const [allCoupons, setAllCoupons] = useState<any[]>([]);

  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GenericItem | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [detailItem, setDetailItem] = useState<GenericItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | number | null; type: string }>({
    show: false,
    id: null,
    type: '',
  });

  const [promotionForm, setPromotionForm] = useState<PromotionFormState>(defaultPromotionForm());
  const [basicForm, setBasicForm] = useState<BasicAssetFormState>(defaultBasicForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [sampleOrderAmount, setSampleOrderAmount] = useState('500000');

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [productOptions, setProductOptions] = useState<SelectOption[]>([]);
  const [productLookup, setProductLookup] = useState<Record<string, any>>({});
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [optionLoading, setOptionLoading] = useState(false);
  const [branchProducts, setBranchProducts] = useState<any[]>([]);
  const [branchProductsLoading, setBranchProductsLoading] = useState(false);

  useEffect(() => {
    const fetchBranchProducts = async () => {
      if (!basicForm.branch_id) {
        setBranchProducts([]);
        return;
      }
      setBranchProductsLoading(true);
      try {
        const data = await productService.getBranchProducts({ branch_id: basicForm.branch_id });
        setBranchProducts(data || []);
      } catch (err) {
        console.error("Error fetching branch products", err);
        setBranchProducts([]);
      } finally {
        setBranchProductsLoading(false);
      }
    };
    fetchBranchProducts();
  }, [basicForm.branch_id]);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchBranch, setSearchBranch] = useState('');

  const loadDropdownReferences = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        promotionService.getPromotions({ limit: 1000 }),
        couponService.getCoupons({ limit: 1000 }),
      ]);
      setAllPromotions((pRes as any)?.data || []);
      setAllCoupons((cRes as any)?.data || []);
    } catch (err) {
      console.error('Error loading campaign references:', err);
    }
  };

  const loadTabPagedData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        status: filterStatus,
        sort: sortOrder,
      };

      let fetchedData: any[] = [];
      let paginationInfo: any = null;

      if (activeTab === 'promotions') {
        const res = await promotionService.getPromotions(params);
        fetchedData = ((res as any)?.data || []).map((p: any) => ({
          ...p,
          id: toItemId(p),
          item_type: 'promotion' as const,
        }));
        paginationInfo = (res as any)?.pagination;
      } else if (activeTab === 'coupons') {
        const res = await couponService.getCoupons(params);
        fetchedData = ((res as any)?.data || []).map((c: any) => ({
          ...c,
          id: toItemId(c),
          item_type: 'coupon' as const,
          title: c.title || c.code,
        }));
        paginationInfo = (res as any)?.pagination;
      } else if (activeTab === 'banners') {
        const res = await bannerService.getBanners({ ...params, include_inactive: true });
        fetchedData = ((res as any)?.data || []).map((b: any) => ({
          ...b,
          id: toItemId(b),
          item_type: 'banner' as const,
        }));
        paginationInfo = (res as any)?.pagination;
      } else if (activeTab === 'hot_deals') {
        const res = await hotDealService.getHotDeals({ ...params, include_inactive: true });
        fetchedData = ((res as any)?.data || []).map((h: any) => ({
          ...h,
          id: toItemId(h),
          item_type: 'hot_deal' as const,
          title: h.title || h.product_name || `Hot Deal #${String(toItemId(h)).slice(-6)}`,
          start_date: h.start_date || h.created_at,
          end_date: h.end_date || h.valid_until,
        }));
        paginationInfo = (res as any)?.pagination;
      } else if (activeTab === 'popup_ads') {
        const res = await popupAdService.getPopupAds({ ...params, include_inactive: true });
        fetchedData = ((res as any)?.data || []).map((pa: any) => ({
          ...pa,
          id: toItemId(pa),
          item_type: 'popup_ad' as const,
          title: pa.title || `Popup Ad #${String(toItemId(pa)).slice(-6)}`,
          is_active: pa.status === 'active',
        }));
        paginationInfo = (res as any)?.pagination;
      }

      setItems(fetchedData);
      if (paginationInfo) {
        setTotalRecords(paginationInfo.total || fetchedData.length);
        setTotalPages(paginationInfo.totalPages || 1);
      } else {
        setTotalRecords(fetchedData.length);
        setTotalPages(1);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi tải dữ liệu');
      setItems([]);
      setTotalRecords(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, pageSize, searchTerm, filterStatus, sortOrder]);

  const loadData = async () => {
    await Promise.all([
      loadTabPagedData(),
      loadDropdownReferences(),
    ]);
  };

  const loadScopeOptions = async () => {
    try {
      setOptionLoading(true);
      const [productsRes, categoriesRes, branchesRes] = await Promise.all([
        productService.getProducts({ page: 1, limit: 500 }),
        categoryService.list(),
        branchService.list(),
      ]);

      const products = Array.isArray(productsRes?.data) ? productsRes.data : [];
      const categories = Array.isArray(categoriesRes) ? categoriesRes : [];
      const branches = Array.isArray(branchesRes) ? branchesRes : [];

      setProductOptions(
        products
          .map((p: any) => ({
            id: String(p.id || p._id),
            label: p.name || `Product ${String(p.id || p._id)}`,
            meta: p.sku || p.category_name || '',
          }))
          .filter((o: SelectOption) => o.id),
      );
      setProductLookup(
        products.reduce((acc: Record<string, any>, p: any) => {
          const key = String(p.id || p._id || '');
          if (key) acc[key] = p;
          return acc;
        }, {}),
      );

      setCategoryOptions(
        categories
          .map((c: any) => ({
            id: String(c.id || c._id),
            label: c.name || `Category ${String(c.id || c._id)}`,
            meta: c.slug || '',
          }))
          .filter((o: SelectOption) => o.id),
      );

      setBranchOptions(
        branches
          .map((b: any) => ({
            id: String(b.id || b._id),
            label: b.name || `Branch ${String(b.id || b._id)}`,
            meta: b.code || b.address || '',
          }))
          .filter((o: SelectOption) => o.id),
      );
    } catch (err: any) {
      toast.error(err?.message || 'Không tải được danh sách sản phẩm/danh mục/chi nhánh');
    } finally {
      setOptionLoading(false);
    }
  };

  useEffect(() => {
    loadDropdownReferences();
  }, []);

  useEffect(() => {
    loadTabPagedData();
  }, [loadTabPagedData]);

  useEffect(() => {
    if (showFormModal) {
      loadScopeOptions();
    }
  }, [showFormModal, activeTab]);

  useEffect(() => {
    if (location.state && location.state.draftPromotion) {
      const draft = location.state.draftPromotion;
      setActiveTab('promotions');
      setEditingItem(null);
      setFormErrors({});
      setSelectedImageFile(null);
      setSearchProduct('');
      setSearchCategory('');
      setSearchBranch('');

      const draftProductIds = Array.isArray(draft.target_product_ids) ? draft.target_product_ids.map(String) : [];
      const draftCategoryIds = Array.isArray(draft.target_category_ids) ? draft.target_category_ids.map(String) : [];
      const draftBranchIds = Array.isArray(draft.target_branch_ids) ? draft.target_branch_ids.map(String) : [];

      const stock = Number(draft.total_quantity || draft.stock || 0);
      const stockStr = stock > 0 ? String(stock) : '';

      setPromotionForm({
        ...defaultPromotionForm(),
        recordType: 'promotion',
        title: draft.title || '',
        description: draft.description || '',
        imageUrl: draft.imageUrl || '',
        imagePreview: draft.imageUrl || '',
        badge_text: draft.badge_text || 'Giải phóng hàng sắp hết hạn',
        banner_url: draft.banner_url || '/promotions',
        status: 'draft',
        is_active: false,
        is_auto_generated: draft.is_auto_generated || false,
        voucher_type: draft.voucher_type || 'product',
        type: draft.type || 'percent',
        discount_value: String(draft.discount_value || '50'),
        min_order_amount: '0',
        min_quantity: '1',
        gift_quantity: '0',
        max_discount_amount: '',
        stackable: false,
        points_multiplier: '1',
        gift_product_id: '',
        scope: draft.scope || 'product',
        target_product_ids: draftProductIds,
        target_category_ids: draftCategoryIds,
        target_branch_ids: draftBranchIds,
        excluded_product_ids: [],
        excluded_category_ids: [],
        manualTargetIds: draftProductIds.join(', '),
        manualExcludedProductIds: '',
        manualExcludedCategoryIds: '',
        total_quantity: stockStr,
        usage_per_user: String(draft.per_user_limit || '1'),
        usage_limit: stockStr,
        max_redemptions: stockStr,
        start_date: toDateTimeLocal(draft.start_date || new Date().toISOString()),
        end_date: toDateTimeLocal(draft.end_date),
        hide_after_expired_hours: '24',
        code: '',
        claim_campaign: true,
        priority: '0',
      });

      setShowFormModal(true);
      navigate(location.pathname, { replace: true });
    } else if (location.state && location.state.draftHotDeal) {
      const draft = location.state.draftHotDeal;
      setActiveTab('hot_deals');
      setEditingItem(null);
      setFormErrors({});
      setSelectedImageFile(null);
      setSearchProduct('');
      setSearchCategory('');
      setSearchBranch('');

      if (draft.branch_product_id && draft.product_id) {
        setBranchProducts([
          {
            id: draft.branch_product_id,
            _id: draft.branch_product_id,
            product_id: draft.product_id,
            branch_id: draft.branch_id,
            price: Number(draft.original_price),
            original_price: Number(draft.original_price),
            stock: Number(draft.total_quantity),
            is_available: true,
            product: {
              id: draft.product_id,
              _id: draft.product_id,
              name: draft._product_name || 'Đang tải...',
              image: draft.imageUrl || '',
              image_url: draft.imageUrl || '',
              price: Number(draft.original_price),
            }
          }
        ]);
      }

      setBasicForm({
        ...defaultBasicForm(),
        title: draft.title || '',
        imageUrl: draft.imageUrl || '',
        imagePreview: draft.imageUrl || '',
        link: '',
        position: '',
        product_id: draft.product_id || '',
        branch_product_id: draft.branch_product_id || '',
        branch_id: draft.branch_id || '',
        total_quantity: draft.total_quantity || '',
        remaining_quantity: draft.remaining_quantity || '',
        original_price: draft.original_price || '',
        deal_price: draft.deal_price || '',
        start_date: toDateTimeLocal(draft.start_date || new Date().toISOString()),
        end_date: toDateTimeLocal(draft.end_date),
        is_active: draft.is_active !== false,
        text_color: '#ffffff',
        overlay_color: 'rgba(0,0,0,0.3)',
        text_shadow: true,
      });

      setShowFormModal(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  const paginatedList = items;

  const openCreateModal = () => {
    setEditingItem(null);
    setFormErrors({});
    setSelectedImageFile(null);
    setSearchProduct('');
    setSearchCategory('');
    setSearchBranch('');

    if (activeTab === 'promotions' || activeTab === 'coupons') {
      setPromotionForm({
        ...defaultPromotionForm(),
        recordType: activeTab === 'coupons' ? 'coupon' : 'promotion',
      });
    } else {
      setBasicForm(defaultBasicForm());
    }

    setShowFormModal(true);
  };

  const openEditModal = (item: GenericItem) => {
    setEditingItem(item);
    setFormErrors({});
    setSelectedImageFile(null);

    if (activeTab === 'promotions' || activeTab === 'coupons') {
      setPromotionForm(normalizePromotionItemToForm(item));
    } else {
      setBasicForm(normalizeBasicItemToForm(item, activeTab));
    }

    setShowFormModal(true);
  };

  const closeModal = () => {
    setShowFormModal(false);
    setEditingItem(null);
    setFormErrors({});
    setSelectedImageFile(null);
    setIsDragActive(false);
    setPromotionForm(defaultPromotionForm());
    setBasicForm(defaultBasicForm());
  };

  const setPromotionField = <K extends keyof PromotionFormState>(field: K, value: PromotionFormState[K]) => {
    setPromotionForm((prev) => ({ ...prev, [field]: value }));
  };

  const setBasicField = <K extends keyof BasicAssetFormState>(field: K, value: BasicAssetFormState[K]) => {
    setBasicForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleIdInField = (field: 'target_product_ids' | 'target_category_ids' | 'target_branch_ids' | 'excluded_product_ids' | 'excluded_category_ids', id: string) => {
    setPromotionForm((prev) => {
      const current = prev[field];
      const next = current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
      return { ...prev, [field]: uniqueIds(next) };
    });
  };

  const validateImageFile = (file: File): string | null => {
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024;
    if (!acceptedTypes.includes(file.type)) {
      return t('admin.promotions.imageAcceptError', 'Chỉ chấp nhận ảnh jpg, png, webp, gif');
    }
    if (file.size > maxSize) {
      return t('admin.promotions.imageSizeError', 'Ảnh vượt quá giới hạn 5MB');
    }
    return null;
  };

  const applySelectedImage = (file: File) => {
    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setSelectedImageFile(file);

    if (activeTab === 'promotions') {
      setPromotionForm((prev) => ({ ...prev, imagePreview: localPreview }));
    } else {
      setBasicForm((prev) => ({ ...prev, imagePreview: localPreview }));
    }
  };

  const handleImageFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    applySelectedImage(file);
  };

  const handleImageDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    applySelectedImage(file);
  };

  const validateFullPromotionForm = (): boolean => {
    const errors: Record<string, string> = {};

    const mergedTargetIds = uniqueIds([
      ...(promotionForm.scope === 'product' ? promotionForm.target_product_ids : []),
      ...(promotionForm.scope === 'category' ? promotionForm.target_category_ids : []),
      ...(promotionForm.scope === 'branch' ? promotionForm.target_branch_ids : []),
      ...parseCsvIds(promotionForm.manualTargetIds),
    ]);

    if (!promotionForm.title.trim()) errors.title = t('admin.promotions.campaignNameRequired', 'Tên chiến dịch là bắt buộc');

    const validTypesPromotion = ['percent', 'fixed_amount', 'bogo', 'free_shipping', 'points_multiplier', 'gift_item', 'flash_deal'];
    const validTypesCoupon = ['percent', 'fixed_amount', 'free_shipping', 'points'];
    const validTypes = promotionForm.recordType === 'coupon' ? validTypesCoupon : validTypesPromotion;
    if (!validTypes.includes(promotionForm.type)) errors.type = t('admin.promotions.discountTypeRequired', 'Loại giảm không hợp lệ');

    if (promotionForm.type === 'bogo') {
      if (!(Number(promotionForm.min_quantity || 0) > 0)) errors.min_quantity = t('admin.promotions.minQuantityError', 'BOGO cần số lượng mua tối thiểu > 0');
      if (!(Number(promotionForm.gift_quantity || 0) > 0)) errors.gift_quantity = t('admin.promotions.giftQuantityError', 'BOGO cần số lượng tặng > 0');
    }

    if ((promotionForm.type === 'percent' || promotionForm.type === 'fixed_amount' || promotionForm.type === 'flash_deal' || promotionForm.type === 'points') && Number(promotionForm.discount_value || 0) <= 0) {
      errors.discount_value = t('admin.promotions.discountValueRequired', 'Giá trị giảm phải > 0');
    }

    if (promotionForm.type === 'points_multiplier' && Number(promotionForm.points_multiplier || 1) <= 1) {
      errors.points_multiplier = t('admin.promotions.pointsMultiplierError', 'Điểm x2 cần hệ số > 1');
    }

    if (promotionForm.scope !== 'all' && mergedTargetIds.length === 0) {
      errors.scope = t('admin.promotions.scopeRequired', 'Phải chọn ít nhất 1 target theo phạm vi áp dụng');
    }

    if (promotionForm.start_date && promotionForm.end_date) {
      const start = new Date(promotionForm.start_date).getTime();
      const end = new Date(promotionForm.end_date).getTime();
      if (start >= end) errors.end_date = t('admin.promotions.endDateError', 'Thời gian kết thúc phải sau thời gian bắt đầu');
    }

    if (promotionForm.total_quantity && Number(promotionForm.total_quantity) <= 0) {
      errors.total_quantity = t('admin.promotions.totalQuantityError', 'Tổng lượt chiến dịch phải > 0');
    }

    if (promotionForm.usage_per_user && Number(promotionForm.usage_per_user) <= 0) {
      errors.usage_per_user = t('admin.promotions.usagePerUserError', 'Giới hạn mỗi user phải > 0');
    }

    if (promotionForm.recordType === 'coupon' && promotionForm.code && !/^[A-Za-z0-9_-]+$/.test(promotionForm.code)) {
      errors.code = t('admin.promotions.couponCodeError', 'Mã coupon chỉ gồm chữ/số/_/-');
    }

    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      const modal = document.querySelector('.overflow-y-auto');
      if (modal) {
         modal.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return false;
    }
    
    return true;
  };

  const uploadImageIfNeeded = async (): Promise<string> => {
    if (!selectedImageFile) {
      return activeTab === 'promotions' ? (promotionForm.imageUrl || '') : (basicForm.imageUrl || '');
    }

    try {
      setUploadingImage(true);
      const uploadResult = await promotionService.uploadCampaignImage(selectedImageFile);
      const finalUrl = uploadResult?.url || uploadResult?.relative_url || '';
      if (!finalUrl) throw new Error('Không lấy được URL ảnh sau upload');
      return finalUrl;
    } catch (err: any) {
      throw new Error(err?.message || 'Upload ảnh thất bại');
    } finally {
      setUploadingImage(false);
    }
  };

  const submitPromotionForm = async () => {
    const valid = validateFullPromotionForm();
    if (!valid) return;

    setSaving(true);
    try {
      if (promotionForm.recordType === 'coupon' && promotionForm.code) {
        const existing = await couponService.getCouponByCode(promotionForm.code.trim().toUpperCase());
        const editingId = toItemId(editingItem);
        const existingId = toItemId(existing?.data);
        if (existing?.data && (!editingItem || existingId !== editingId)) {
          setFormErrors((prev) => ({ ...prev, code: t('admin.promotions.couponExists', 'Mã coupon đã tồn tại') }));
          toast.error(t('admin.promotions.couponExists', 'Mã coupon đã tồn tại'));
          return;
        }
      }

      const finalImage = await uploadImageIfNeeded();

      const manualTargets = parseCsvIds(promotionForm.manualTargetIds);
      const manualExcludedProducts = parseCsvIds(promotionForm.manualExcludedProductIds);
      const manualExcludedCategories = parseCsvIds(promotionForm.manualExcludedCategoryIds);

      const target_product_ids = promotionForm.scope === 'product'
        ? uniqueIds([...promotionForm.target_product_ids, ...manualTargets])
        : [];
      const target_category_ids = promotionForm.scope === 'category'
        ? uniqueIds([...promotionForm.target_category_ids, ...manualTargets])
        : [];
      const target_branch_ids = promotionForm.scope === 'branch'
        ? uniqueIds([...promotionForm.target_branch_ids, ...manualTargets])
        : [];

      const now = new Date();
      const startDate = promotionForm.start_date ? new Date(promotionForm.start_date) : null;
      const endDate = promotionForm.end_date ? new Date(promotionForm.end_date) : null;
      let computedStatus = 'active';
      if (!promotionForm.is_active) computedStatus = 'paused';
      else if (startDate && startDate > now) computedStatus = 'scheduled';
      else if (endDate && endDate < now) computedStatus = 'expired';

      const commonPayload: Record<string, any> = {
        title: promotionForm.title.trim(),
        description: promotionForm.description.trim(),
        image: finalImage,
        is_active: promotionForm.is_active,
        status: computedStatus,
        type: promotionForm.type,
        scope: promotionForm.scope,
        target_product_ids,
        target_category_ids,
        target_branch_ids,
        excluded_product_ids: uniqueIds([...promotionForm.excluded_product_ids, ...manualExcludedProducts]),
        excluded_category_ids: uniqueIds([...promotionForm.excluded_category_ids, ...manualExcludedCategories]),
        discount_value: Number(promotionForm.discount_value || 0),
        min_order_amount: Number(promotionForm.min_order_amount || 0),
        min_quantity: Number(promotionForm.min_quantity || 0),
        gift_quantity: Number(promotionForm.gift_quantity || 0),
        max_discount_amount: promotionForm.max_discount_amount ? Number(promotionForm.max_discount_amount) : null,
        total_quantity: promotionForm.total_quantity ? Number(promotionForm.total_quantity) : null,
        usage_per_user: Number(promotionForm.usage_per_user || 1),
        usage_limit: promotionForm.usage_limit ? Number(promotionForm.usage_limit) : null,
        max_redemptions: promotionForm.max_redemptions ? Number(promotionForm.max_redemptions) : null,
        hide_after_expired_hours: Number(promotionForm.hide_after_expired_hours || 24),
        start_date: toIsoOrNull(promotionForm.start_date),
        end_date: toIsoOrNull(promotionForm.end_date),
        claim_campaign: promotionForm.claim_campaign,
        priority: Number(promotionForm.priority || 0),
        stackable: promotionForm.stackable,
        points_multiplier: Number(promotionForm.points_multiplier || 1),
        gift_product_id: promotionForm.gift_product_id || null,
        badge_text: promotionForm.badge_text.trim(),
        banner_url: promotionForm.banner_url.trim(),
        voucher_type: promotionForm.voucher_type,
      };

      const editingId = toItemId(editingItem);

      if (promotionForm.recordType === 'coupon') {
        const couponType = promotionForm.type === 'points_multiplier' ? 'points' : promotionForm.type;
        const code = (promotionForm.code || '').trim().toUpperCase() || `CP${Date.now().toString(36).toUpperCase()}`;

        const couponPayload = {
          ...commonPayload,
          code,
          type: couponType,
          title: promotionForm.title.trim() || code,
          image: finalImage,
        };

        if (editingItem && editingItem.item_type === 'coupon') {
          await couponService.updateCoupon(editingId, couponPayload);
          toast.success(t('admin.promotions.saveSuccess', 'Lưu thành công'));
        } else {
          await couponService.createCoupon(couponPayload);
          toast.success(t('admin.promotions.saveSuccess', 'Lưu thành công'));
        }
      } else {
        const promotionPayload = {
          ...commonPayload,
          banner_image: finalImage,
          type: promotionForm.type === 'points' ? 'points_multiplier' : promotionForm.type,
        };

        if (editingItem && editingItem.item_type === 'promotion') {
          await promotionService.updatePromotion(editingId, promotionPayload);
          toast.success(t('admin.promotions.saveSuccess', 'Lưu thành công'));
        } else {
          await promotionService.createPromotion(promotionPayload);
          toast.success(t('admin.promotions.saveSuccess', 'Lưu thành công'));
        }
      }

      closeModal();
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || t('admin.promotions.saveError', 'Không thể lưu chiến dịch'));
    } finally {
      setSaving(false);
    }
  };

  const submitBasicForm = async () => {
    setSaving(true);
    try {
      const finalImage = await uploadImageIfNeeded();
      const editingId = toItemId(editingItem);

      if (activeTab === 'popup_ads') {
        if (!basicForm.title.trim()) {
          toast.error('Popup Ad cần tiêu đề');
          return;
        }
        if (!finalImage) {
          toast.error('Popup Ad cần hình ảnh');
          return;
        }

        const payload = {
          title: basicForm.title.trim(),
          subtitle: basicForm.subtitle.trim(),
          description: basicForm.description.trim(),
          image_url: finalImage,
          cta_text: basicForm.cta_text.trim(),
          cta_link: basicForm.link.trim(),
          campaign_type: basicForm.campaign_type,
          campaign_ref: basicForm.campaign_ref || undefined,
          target_branch: basicForm.target_branch,
          target_audience: basicForm.target_audience,
          start_date: toIsoOrNull(basicForm.start_date),
          end_date: toIsoOrNull(basicForm.end_date),
          priority: Number(basicForm.priority || 0),
          status: basicForm.is_active ? 'active' : 'paused',
          show_once_per_day: basicForm.show_once_per_day,
        };

        if (editingItem && editingItem.item_type === 'popup_ad') {
          await popupAdService.updatePopupAd(editingId, payload);
          toast.success(t('admin.promotions.saveSuccess', 'Lưu thành công'));
        } else {
          await popupAdService.createPopupAd(payload);
          toast.success(t('admin.promotions.saveSuccess', 'Lưu thành công'));
        }
      }

      if (activeTab === 'banners') {
        if (!basicForm.title.trim()) {
          toast.error(t('admin.promotions.bannerTitleRequired', 'Banner cần tiêu đề'));
          return;
        }
        if (!finalImage) {
          toast.error(t('admin.promotions.bannerImageRequired', 'Banner cần ảnh'));
          return;
        }

        const payload = {
          title: basicForm.title.trim(),
          image: finalImage,
          image_url: finalImage,
          link: basicForm.link.trim(),
          position: basicForm.position || 'home',
          is_active: basicForm.is_active,
          start_date: toIsoOrNull(basicForm.start_date),
          end_date: toIsoOrNull(basicForm.end_date),
          text_color: basicForm.text_color,
          overlay_color: basicForm.overlay_color,
          text_shadow: basicForm.text_shadow,
        };

        if (editingItem && editingItem.item_type === 'banner') {
          await bannerService.updateBanner(editingId, payload);
          toast.success(t('admin.promotions.saveSuccess', 'Lưu thành công'));
        } else {
          await bannerService.createBanner(payload);
          toast.success(t('admin.promotions.saveSuccess', 'Lưu thành công'));
        }
      }

      if (activeTab === 'hot_deals') {
        if (!basicForm.branch_id.trim()) {
          toast.error(t('admin.promotions.hotDealBranchRequired', 'Hot Deal cần chọn chi nhánh'));
          return;
        }
        if (!basicForm.branch_product_id.trim()) {
          toast.error(t('admin.promotions.hotDealBranchProductRequired', 'Hot Deal cần chọn sản phẩm chi nhánh'));
          return;
        }
        if (!basicForm.product_id.trim()) {
          toast.error(t('admin.promotions.hotDealProductRequired', 'Hot Deal cần product_id'));
          return;
        }
        if (Number(basicForm.original_price || 0) <= 0 || Number(basicForm.deal_price || 0) <= 0) {
          toast.error(t('admin.promotions.hotDealPriceRequired', 'Giá gốc và giá deal phải > 0'));
          return;
        }

        const original = Number(basicForm.original_price || 0);
        const deal = Number(basicForm.deal_price || 0);
        const discountPercent = original > 0 ? Math.max(0, Math.min(100, Math.round((1 - deal / original) * 100))) : 0;

        const payload: Record<string, any> = {
          product_id: basicForm.product_id.trim(),
          branch_product_id: basicForm.branch_product_id.trim(),
          branch_id: basicForm.branch_id.trim(),
          target_branch_ids: basicForm.branch_id.trim() ? [basicForm.branch_id.trim()] : [],
          original_price: original,
          deal_price: deal,
          discount_percent: discountPercent,
          discount_value: discountPercent,
          start_date: toIsoOrNull(basicForm.start_date),
          end_date: toIsoOrNull(basicForm.end_date),
          is_active: basicForm.is_active,
          image_url: finalImage || undefined,
          title: basicForm.title.trim() || undefined,
        };
        // Set remaining_quantity for new deals validation
        const selectedBp = branchProducts.find(x => String(x.id || x._id) === basicForm.branch_product_id);
        const currentStock = selectedBp ? (selectedBp.stock ?? 0) : 0;

        const totalQtyVal = basicForm.total_quantity.trim();
        const totalQty = totalQtyVal ? Number(totalQtyVal) : 0;
        if (isNaN(totalQty) || totalQty <= 0) {
          toast.error(t('admin.promotions.totalQuantityError', 'Tổng số lượng deal phải lớn hơn 0'));
          return;
        }

        const remainingQtyVal = basicForm.remaining_quantity.trim();
        const remainingQty = remainingQtyVal ? Number(remainingQtyVal) : totalQty;
        if (isNaN(remainingQty) || remainingQty < 0) {
          toast.error(t('admin.promotions.remainingQuantityInvalid', 'Số lượng còn lại không hợp lệ'));
          return;
        }

        if (remainingQty > currentStock) {
          toast.error(t('admin.promotions.remainingQuantityExceedStock', 'Số lượng còn lại không thể lớn hơn tồn kho hiện tại'));
          return;
        }

        if (remainingQty > totalQty) {
          toast.error(t('admin.promotions.remainingQuantityExceedTotal', 'Số lượng còn lại không thể lớn hơn tổng số lượng deal'));
          return;
        }

        if (currentStock <= 0) {
          toast.error(t('admin.promotions.productOutOfStockBlock', 'Sản phẩm đã hết hàng ở chi nhánh này. Không thể tạo hot deal.'));
          return;
        }

        payload.total_quantity = totalQty;
        payload.remaining_quantity = remainingQty;
        payload.stock_limit = totalQty;











        if (editingItem && editingItem.item_type === 'hot_deal') {
          await hotDealService.updateHotDeal(editingId, payload);
          toast.success(t('admin.promotions.saveSuccess', 'Lưu thành công'));
        } else {
          await hotDealService.createHotDeal(payload);
          toast.success(t('admin.promotions.saveSuccess', 'Lưu thành công'));
        }
      }

      closeModal();
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || t('admin.promotions.saveError', 'Không thể lưu dữ liệu'));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (activeTab === 'promotions') {
      await submitPromotionForm();
    } else {
      await submitBasicForm();
    }
  };

  const handleToggleActive = async (item: GenericItem) => {
    try {
      const itemId = toItemId(item);
      const nextStatus = !item.is_active;

      if (item.item_type === 'promotion') {
        await promotionService.updatePromotion(itemId, { is_active: nextStatus, status: nextStatus ? 'active' : 'paused' });
      } else if (item.item_type === 'coupon') {
        await couponService.updateCoupon(itemId, { is_active: nextStatus });
      } else if (item.item_type === 'banner') {
        await bannerService.updateBanner(itemId, { is_active: nextStatus });
      } else if (item.item_type === 'hot_deal') {
        await hotDealService.updateHotDeal(itemId, { is_active: nextStatus });
      } else if (item.item_type === 'popup_ad') {
        await popupAdService.updatePopupAd(itemId, { status: nextStatus ? 'active' : 'inactive' });
      }

      toast.success(t('admin.promotions.toggleSuccess', { action: nextStatus ? t('admin.promotions.toggleEnabled', 'bật') : t('admin.promotions.toggleDisabled', 'tắt'), defaultValue: 'Đã {{action}} thành công' }));
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || t('admin.promotions.toggleError', 'Không đổi được trạng thái'));
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm.id === null || deleteConfirm.id === undefined || deleteConfirm.id === '') return;

    try {
      if (deleteConfirm.type === 'promotion') await promotionService.deletePromotion(String(deleteConfirm.id));
      if (deleteConfirm.type === 'coupon') await couponService.deleteCoupon(String(deleteConfirm.id));
      if (deleteConfirm.type === 'banner') await bannerService.deleteBanner(String(deleteConfirm.id));
      if (deleteConfirm.type === 'hot_deal') await hotDealService.deleteHotDeal(String(deleteConfirm.id));
      if (deleteConfirm.type === 'popup_ad') await popupAdService.deletePopupAd(String(deleteConfirm.id));

      setDeleteConfirm({ show: false, id: null, type: '' });
      toast.success(t('admin.promotions.deleteSuccess', 'Xóa thành công'));
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || t('admin.promotions.deleteError', 'Không thể xóa bản ghi'));
    }
  };

  const renderPromotionStepContent = () => {
    const isShip = promotionForm.voucher_type === 'shipping';
    const isCpn = promotionForm.recordType === 'coupon';
    
    const allOpts = isCpn
      ? [
          { v: 'percent', l: t('admin.promotions.percent', 'Phần trăm (%)') },
          { v: 'fixed_amount', l: t('admin.promotions.fixedAmount', 'Giá trị cố định') },
          { v: 'free_shipping', l: t('admin.promotions.freeShipping', 'Freeship') },
          { v: 'points', l: t('admin.promotions.points', 'Điểm thưởng') }
        ]
      : [
          { v: 'percent', l: t('admin.promotions.percent', 'Phần trăm (%)') },
          { v: 'fixed_amount', l: t('admin.promotions.fixedAmount', 'Giá trị cố định') },
          { v: 'bogo', l: t('admin.promotions.bogo', 'Mua X tặng Y (BOGO)') },
          { v: 'free_shipping', l: t('admin.promotions.freeShipping', 'Freeship') },
          { v: 'points_multiplier', l: t('admin.promotions.pointsMultiplier', 'Điểm x2') },
          { v: 'gift_item', l: t('admin.promotions.giftItem', 'Tặng kèm') },
          { v: 'flash_deal', l: t('admin.promotions.flashDeal', 'Flash deal') }
        ];

    const opts = isShip 
      ? allOpts.filter(o => ['percent', 'fixed_amount', 'free_shipping'].includes(o.v)) 
      : isCpn 
        ? allOpts.filter(o => o.v !== 'free_shipping') 
        : allOpts;

    const ic = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow";
    const lc = "block text-xs font-bold text-slate-500 mb-2 tracking-wide uppercase";
    
    const showVal = ['percent', 'fixed_amount', 'flash_deal', 'points'].includes(promotionForm.type);
    const showMax = promotionForm.type === 'percent' || promotionForm.type === 'flash_deal' || promotionForm.type === 'points';
    const showBogo = (promotionForm.type === 'bogo' || promotionForm.type === 'gift_item') && !isShip;
    const showPts = (promotionForm.type === 'points_multiplier' || promotionForm.type === 'points') && !isShip;

    return (
      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-10">
        <div className="space-y-6 w-full">
          {promotionForm.is_auto_generated && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-blue-600 text-xl">lightbulb</span>
              <p className="text-sm text-blue-800 font-medium">{t('admin.promotions.expiryAlertHint', 'Đề xuất từ cảnh báo hạn dùng — thông tin đã được tự động điền.')}</p>
            </div>
          )}

          {/* 1) BASIC INFO */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <span className="material-symbols-outlined text-primary text-xl">info</span>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">{t('admin.promotions.stepBasicInfo', 'Thông tin cơ bản')}</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={lc}>{t('admin.promotions.recordType', 'Loại bản ghi')}</label>
                <select
                  value={promotionForm.recordType}
                  onChange={(e) => setPromotionField('recordType', e.target.value as any)}
                  className={ic}
                >
                  <option value="promotion">{t('admin.promotions.promotion', 'Promotion')}</option>
                  <option value="coupon">{t('admin.promotions.coupon', 'Coupon')}</option>
                </select>
              </div>
              <div>
                <label className={lc}>{t('admin.promotions.voucherType', 'Loại voucher')}</label>
                <select 
                  value={promotionForm.voucher_type} 
                  onChange={e => setPromotionField('voucher_type', e.target.value as any)} 
                  className={ic}
                >
                  <option value="product">{t('admin.promotions.productDiscount', '🛒 Giảm giá sản phẩm')}</option>
                  <option value="shipping">{t('admin.promotions.shippingDiscount', '🚚 Giảm phí vận chuyển')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className={lc}>{t('admin.promotions.campaignName', 'Tên chiến dịch')} *</label>
              <input 
                value={promotionForm.title} 
                onChange={e => setPromotionField('title', e.target.value)} 
                className={ic} 
                placeholder={t('admin.promotions.campaignNamePlaceholder', 'Ví dụ: Summer Mega Sale')} 
              />
              {formErrors.title && <p className="text-xs text-red-600 mt-1.5 font-semibold">{formErrors.title}</p>}
            </div>

            <div>
              <label className={lc}>{t('admin.promotions.description', 'Mô tả')}</label>
              <textarea 
                value={promotionForm.description} 
                onChange={e => setPromotionField('description', e.target.value)} 
                rows={2} 
                className={`${ic} resize-none`} 
                placeholder={t('admin.promotions.descriptionPlaceholder', 'Mô tả ngắn về chiến dịch')} 
              />
            </div>

            <div>
              <label className={lc}>{t('admin.promotions.campaignImage', 'Hình ảnh')} <span className="font-normal text-slate-400 lowercase">{t('admin.promotions.imageOptional', '(tuỳ chọn)')}</span></label>
              <div 
                onDragOver={e => { e.preventDefault(); setIsDragActive(true); }} 
                onDragLeave={() => setIsDragActive(false)} 
                onDrop={handleImageDrop} 
                className={`border-2 border-dashed rounded-xl p-6 transition-all text-center ${isDragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'}`}
              >
                <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageFileInputChange} />
                
                {!(promotionForm.imagePreview || promotionForm.imageUrl) ? (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-slate-300">cloud_upload</span>
                    <p className="text-sm font-bold text-slate-700">{t('admin.promotions.dragDropImage', 'Kéo thả ảnh vào đây hoặc chọn từ máy')}</p>
                    <p className="text-xs text-slate-500 font-medium">{t('admin.promotions.imageFormats', 'Hỗ trợ JPG/PNG/WEBP/GIF, tối đa 5MB')}</p>
                    <button type="button" onClick={() => imageInputRef.current?.click()} className="mt-3 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors">
                      {t('admin.promotions.selectImage', 'Chọn ảnh')}
                    </button>
                    
                    <div className="mt-6 w-full max-w-sm mx-auto pt-6 border-t border-slate-200/60">
                      <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">{t('admin.promotions.noImageFallback', 'Mặt hiển thị mặc định nếu không tải ảnh')}</p>
                      <PromotionImageDisplay 
                        imageUrl="" 
                        voucherType={promotionForm.voucher_type} 
                        type={promotionForm.type} 
                        className="w-full h-36 rounded-xl shadow-sm" 
                        aspectRatio=""
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative inline-block group">
                    <img src={promotionForm.imagePreview || promotionForm.imageUrl} alt="Preview" className="w-full max-w-md h-48 object-cover rounded-xl shadow-md border border-slate-200 transition-transform group-hover:scale-[1.02]" />
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPromotionField('imageUrl', '');
                        setPromotionField('imagePreview', '');
                        setSelectedImageFile(null);
                        if (imageInputRef.current) imageInputRef.current.value = '';
                      }} 
                      className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 hover:scale-110 transition-all z-10"
                    >
                      <span className="material-symbols-outlined text-sm font-black">close</span>
                    </button>
                    <div className="mt-4 flex justify-center">
                       <button type="button" onClick={() => imageInputRef.current?.click()} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50">{t('admin.promotions.changeImage', 'Đổi ảnh khác')}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <label className="inline-flex items-center gap-3 text-sm font-bold cursor-pointer mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={promotionForm.is_active}
                onChange={(e) => {
                  const isActive = e.target.checked;
                  setPromotionForm((prev) => ({
                    ...prev,
                    is_active: isActive,
                    status: isActive ? 'active' : (prev.status === 'draft' ? 'draft' : 'paused'),
                  }));
                }}
                className="h-5 w-5 rounded text-primary focus:ring-primary"
              />
              <span className="flex items-center gap-2">
                 {promotionForm.is_active ? <span className="h-2.5 w-2.5 bg-green-500 rounded-full inline-block animate-pulse"></span> : <span className="h-2.5 w-2.5 bg-slate-400 rounded-full inline-block"></span>}
                 {promotionForm.is_active
                   ? t('admin.promotions.statusActiveLabel', 'Hoạt động / Active')
                   : t('admin.promotions.statusInactiveLabel', 'Không hoạt động / Inactive')}
              </span>
            </label>
          </section>

          {/* 2) DISCOUNT RULES */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <span className="material-symbols-outlined text-primary text-xl">sell</span>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">{t('admin.promotions.stepDiscountRules', 'Quy tắc giảm giá')}</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={lc}>{t('admin.promotions.discountType', 'Loại giảm')} *</label>
                <select value={promotionForm.type} onChange={e => setPromotionField('type', e.target.value as any)} className={ic}>
                  {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                {formErrors.type && <p className="text-xs text-red-600 mt-1.5 font-semibold">{formErrors.type}</p>}
              </div>
              
              {showVal && (
                <div>
                  <label className={lc}>{t('admin.promotions.discountValue', 'Giá trị giảm')} *</label>
                  <input 
                    type="number" 
                    value={promotionForm.discount_value} 
                    onChange={e => setPromotionField('discount_value', e.target.value)} 
                    className={ic} 
                    placeholder={promotionForm.type === 'percent'
                      ? t('admin.promotions.discountValuePlaceholderPercent', 'Ví dụ: 20')
                      : t('admin.promotions.discountValuePlaceholderFixed', 'Ví dụ: 50000')}
                  />
                  {formErrors.discount_value && <p className="text-xs text-red-600 mt-1.5 font-semibold">{formErrors.discount_value}</p>}
                </div>
              )}
              
              {promotionForm.type === 'free_shipping' && (
                <div className="flex items-end">
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl w-full flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600 text-xl">local_shipping</span>
                    <p className="text-sm font-bold text-teal-800">{t('admin.promotions.freeShippingFull', 'Miễn phí vận chuyển hoàn toàn')}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={lc}>{t('admin.promotions.minOrder', 'Đơn tối thiểu (VNĐ)')}</label>
                <input 
                  type="number" 
                  value={promotionForm.min_order_amount} 
                  onChange={e => setPromotionField('min_order_amount', e.target.value)} 
                  className={ic} 
                  placeholder="0" 
                />
              </div>
              {showMax && (
                <div>
                  <label className={lc}>{t('admin.promotions.maxDiscount', 'Giảm tối đa (VNĐ)')}</label>
                  <input 
                    type="number" 
                    value={promotionForm.max_discount_amount} 
                    onChange={e => setPromotionField('max_discount_amount', e.target.value)} 
                    className={ic} 
                    placeholder={t('admin.promotions.previewUnlimited', 'Không giới hạn')} 
                  />
                </div>
              )}
            </div>

            {showBogo && (
              <div className="grid grid-cols-3 gap-5 p-5 bg-amber-50 border border-amber-200 rounded-xl mt-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <span className="material-symbols-outlined text-6xl">card_giftcard</span>
                </div>
                <div className="relative z-10">
                  <label className="block text-xs font-black mb-2 text-amber-900 uppercase tracking-wide">{t('admin.promotions.buyX', 'Mua X')}</label>
                  <input type="number" value={promotionForm.min_quantity} onChange={e => setPromotionField('min_quantity', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-bold focus:ring-amber-500/30" placeholder="1" />
                  {formErrors.min_quantity && <p className="text-xs text-red-600 mt-1.5 font-semibold">{formErrors.min_quantity}</p>}
                </div>
                <div className="relative z-10">
                  <label className="block text-xs font-black mb-2 text-amber-900 uppercase tracking-wide">{t('admin.promotions.getY', 'Tặng Y')}</label>
                  <input type="number" value={promotionForm.gift_quantity} onChange={e => setPromotionField('gift_quantity', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-bold focus:ring-amber-500/30" placeholder="1" />
                  {formErrors.gift_quantity && <p className="text-xs text-red-600 mt-1.5 font-semibold">{formErrors.gift_quantity}</p>}
                </div>
                <div className="relative z-10">
                  <label className="block text-xs font-black mb-2 text-amber-900 uppercase tracking-wide">{t('admin.promotions.giftProductId', 'Gift Product ID')}</label>
                  <input value={promotionForm.gift_product_id} onChange={e => setPromotionField('gift_product_id', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-medium focus:ring-amber-500/30" placeholder={t('admin.promotions.optional', 'Tuỳ chọn')} />
                </div>
              </div>
            )}

            {showPts && (
              <div className="grid grid-cols-2 gap-5 p-5 bg-indigo-50 border border-indigo-100 rounded-xl mt-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <span className="material-symbols-outlined text-6xl">stars</span>
                </div>
                <div className="relative z-10">
                  <label className="block text-xs font-black mb-2 text-indigo-900 uppercase tracking-wide">{t('admin.promotions.pointsCoeff', 'Hệ số điểm')}</label>
                  <input type="number" value={promotionForm.points_multiplier} onChange={e => setPromotionField('points_multiplier', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm font-bold focus:ring-indigo-500/30" placeholder="2" />
                  {formErrors.points_multiplier && <p className="text-xs text-red-600 mt-1.5 font-semibold">{formErrors.points_multiplier}</p>}
                </div>
                <div className="flex items-center pt-6 relative z-10">
                  <label className="inline-flex items-center gap-3 text-sm font-bold cursor-pointer text-indigo-900 hover:text-indigo-700 transition-colors">
                    <input type="checkbox" checked={promotionForm.stackable} onChange={e => setPromotionField('stackable', e.target.checked)} className="h-5 w-5 rounded text-indigo-600 border-indigo-300 focus:ring-indigo-500" />
                    <span>{t('admin.promotions.stackable', 'Cộng dồn với khuyến mãi khác')}</span>
                  </label>
                </div>
              </div>
            )}
          </section>

          {/* 3) SCOPE */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <span className="material-symbols-outlined text-primary text-xl">category</span>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">{t('admin.promotions.stepScope', 'Phạm vi áp dụng')}</h4>
            </div>
            
            <div>
              <label className={lc}>{t('admin.promotions.scope', 'Phạm vi')}</label>
              <select value={promotionForm.scope} onChange={e => setPromotionField('scope', e.target.value as any)} className={ic}>
                <option value="all">{t('admin.promotions.scopeAll', 'Toàn hệ thống')}</option>
                {!isShip && <option value="product">{t('admin.promotions.scopeProduct', 'Sản phẩm cụ thể')}</option>}
                {!isShip && <option value="category">{t('admin.promotions.scopeCategory', 'Danh mục')}</option>}
                <option value="branch">{t('admin.promotions.scopeBranch', 'Chi nhánh')}</option>
              </select>
              {formErrors.scope && <p className="text-xs text-red-600 mt-1.5 font-semibold">{formErrors.scope}</p>}
            </div>

            {optionLoading && (
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-pulse">
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                {t('admin.promotions.loadingOptions', 'Đang tải bộ chọn...')}
              </div>
            )}
            
            {!optionLoading && promotionForm.scope === 'product' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <SearchableMultiSelect title={t('admin.promotions.selectProducts', 'Chọn sản phẩm')} options={productOptions} selected={promotionForm.target_product_ids} searchText={searchProduct} onSearchChange={setSearchProduct} onToggle={id => toggleIdInField('target_product_ids', id)} emptyLabel={t('admin.promotions.noProducts', 'Không tìm thấy sản phẩm')} />
              </div>
            )}
            
            {!optionLoading && promotionForm.scope === 'category' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <SearchableMultiSelect title={t('admin.promotions.selectCategories', 'Chọn danh mục')} options={categoryOptions} selected={promotionForm.target_category_ids} searchText={searchCategory} onSearchChange={setSearchCategory} onToggle={id => toggleIdInField('target_category_ids', id)} emptyLabel={t('admin.promotions.noCategories', 'Không tìm thấy danh mục')} />
              </div>
            )}
            
            {!optionLoading && promotionForm.scope === 'branch' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <SearchableMultiSelect title={t('admin.promotions.selectBranches', 'Chọn chi nhánh')} options={branchOptions} selected={promotionForm.target_branch_ids} searchText={searchBranch} onSearchChange={setSearchBranch} onToggle={id => toggleIdInField('target_branch_ids', id)} emptyLabel={t('admin.promotions.noBranches', 'Không tìm thấy chi nhánh')} />
              </div>
            )}
          </section>

          {/* 4) LIMITS & VALIDITY */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <span className="material-symbols-outlined text-primary text-xl">schedule</span>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">{t('admin.promotions.stepLimits', 'Giới hạn & Hiệu lực')}</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={lc}>{t('admin.promotions.totalIssued', 'Tổng lượt phát hành')}</label>
                <input type="number" value={promotionForm.total_quantity} onChange={e => setPromotionField('total_quantity', e.target.value)} className={ic} placeholder={t('admin.promotions.previewUnlimited', 'Không giới hạn')} />
                {formErrors.total_quantity && <p className="text-xs text-red-600 mt-1.5 font-semibold">{formErrors.total_quantity}</p>}
              </div>
              <div>
                <label className={lc}>{t('admin.promotions.perUserLimit', 'Giới hạn mỗi user')}</label>
                <input type="number" value={promotionForm.usage_per_user} onChange={e => setPromotionField('usage_per_user', e.target.value)} className={ic} placeholder="1" />
                {formErrors.usage_per_user && <p className="text-xs text-red-600 mt-1.5 font-semibold">{formErrors.usage_per_user}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={lc}>{t('admin.promotions.startDate', 'Bắt đầu')}</label>
                <input type="datetime-local" value={promotionForm.start_date} onChange={e => setPromotionField('start_date', e.target.value)} className={ic} />
              </div>
              <div>
                <label className={lc}>{t('admin.promotions.endDate', 'Kết thúc')}</label>
                <input type="datetime-local" value={promotionForm.end_date} onChange={e => setPromotionField('end_date', e.target.value)} className={ic} />
                {formErrors.end_date && <p className="text-xs text-red-600 mt-1.5 font-semibold">{formErrors.end_date}</p>}
              </div>
            </div>
            
            {isCpn && (
              <div>
                <label className={lc}>{t('admin.promotions.couponCode', 'Mã coupon')}</label>
                <input value={promotionForm.code} onChange={e => setPromotionField('code', e.target.value.toUpperCase())} className={`${ic} font-mono uppercase tracking-widest bg-slate-50 border-slate-300 font-bold text-lg`} placeholder={t('admin.promotions.couponCodeAutoHint', 'ĐỂ TRỐNG ĐỂ TỰ TẠO')} />
                {formErrors.code && <p className="text-xs text-red-600 mt-1.5 font-semibold">{formErrors.code}</p>}
              </div>
            )}
          </section>

          {/* 5) ADVANCED (collapsed) */}
          <details className="bg-white rounded-2xl border border-slate-200 shadow-sm group">
            <summary className="cursor-pointer p-6 text-sm font-black flex items-center gap-3 text-slate-700 hover:text-primary transition-colors uppercase tracking-wider">
              <span className="material-symbols-outlined text-[24px] transition-transform group-open:rotate-90 text-slate-400 group-hover:text-primary">chevron_right</span>
              <span className="material-symbols-outlined text-[20px]">settings</span>
              {t('admin.promotions.advancedSettings', 'Cài đặt nâng cao')}
            </summary>
            
            <div className="p-6 pt-2 space-y-6 border-t border-slate-100">
              {!isShip && !showBogo && (
                <div>
                  <label className={lc}>{t('admin.promotions.minQuantity', 'Số lượng tối thiểu')}</label>
                  <input type="number" value={promotionForm.min_quantity} onChange={e => setPromotionField('min_quantity', e.target.value)} className={ic} placeholder="0" />
                  {formErrors.min_quantity && <p className="text-xs text-red-600 mt-1.5 font-semibold">{formErrors.min_quantity}</p>}
                </div>
              )}
              
              <div className="flex flex-wrap gap-x-8 gap-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <label className="inline-flex items-center gap-3 text-sm font-bold cursor-pointer text-slate-700 hover:text-primary transition-colors">
                  <input type="checkbox" checked={promotionForm.claim_campaign} onChange={e => setPromotionField('claim_campaign', e.target.checked)} className="h-5 w-5 rounded text-primary focus:ring-primary" />
                  <span>{t('admin.promotions.claimRequired', 'Yêu cầu nhận (Claim)')}</span>
                </label>
                
                {!isShip && !showPts && (
                  <label className="inline-flex items-center gap-3 text-sm font-bold cursor-pointer text-slate-700 hover:text-primary transition-colors">
                    <input type="checkbox" checked={promotionForm.stackable} onChange={e => setPromotionField('stackable', e.target.checked)} className="h-5 w-5 rounded text-primary focus:ring-primary" />
                    <span>{t('admin.promotions.stackableLabel', 'Cộng dồn (Stackable)')}</span>
                  </label>
                )}
              </div>

              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className={lc}>{t('admin.promotions.priority', 'Độ ưu tiên')}</label>
                  <input type="number" value={promotionForm.priority} onChange={e => setPromotionField('priority', e.target.value)} className={ic} placeholder="0" />
                </div>
                <div>
                  <label className={lc}>{t('admin.promotions.maxRedemptions', 'Số lượt tối đa')}</label>
                  <input type="number" value={promotionForm.max_redemptions} onChange={e => setPromotionField('max_redemptions', e.target.value)} className={ic} placeholder={t('admin.promotions.previewUnlimited', 'Không giới hạn')} />
                </div>
                <div>
                  <label className={lc}>{t('admin.promotions.hideAfterExpired', 'Ẩn sau hết hạn (giờ)')}</label>
                  <input type="number" value={promotionForm.hide_after_expired_hours} onChange={e => setPromotionField('hide_after_expired_hours', e.target.value)} className={ic} placeholder="24" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={lc}>{t('admin.promotions.badgeText', 'Nhãn hiển thị (Badge text)')}</label>
                  <input value={promotionForm.badge_text} onChange={e => setPromotionField('badge_text', e.target.value)} className={ic} placeholder="HOT / FLASH SALE" />
                </div>
                <div>
                  <label className={lc}>{t('admin.promotions.targetUrl', 'URL đích')}</label>
                  <input value={promotionForm.banner_url} onChange={e => setPromotionField('banner_url', e.target.value)} className={ic} placeholder="/promotions" />
                </div>
              </div>

              {promotionForm.scope !== 'all' && (
                <div>
                  <label className={lc}>{t('admin.promotions.manualIdFallback', 'Nhập ID thủ công (phẩy)')}</label>
                  <textarea value={promotionForm.manualTargetIds} onChange={e => setPromotionField('manualTargetIds', e.target.value)} className={`${ic} resize-none font-mono text-xs`} rows={3} placeholder="67f4..., 67f5..." />
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/50">
                <h5 className="text-xs font-black text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                   <span className="material-symbols-outlined text-red-500 text-lg">block</span>
                   {t('admin.promotions.excludeProducts', 'Loại trừ sản phẩm / danh mục')}
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {!optionLoading && <SearchableMultiSelect title={t('admin.promotions.excludeProducts', 'Loại trừ SP')} options={productOptions} selected={promotionForm.excluded_product_ids} searchText={searchProduct} onSearchChange={setSearchProduct} onToggle={id => toggleIdInField('excluded_product_ids', id)} emptyLabel={t('admin.promotions.noDataAvailable', 'Không có')} />}
                  {!optionLoading && <SearchableMultiSelect title={t('admin.promotions.excludeCategories', 'Loại trừ DM')} options={categoryOptions} selected={promotionForm.excluded_category_ids} searchText={searchCategory} onSearchChange={setSearchCategory} onToggle={id => toggleIdInField('excluded_category_ids', id)} emptyLabel={t('admin.promotions.noDataAvailable', 'Không có')} />}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-5">
                  <div>
                    <label className={lc}>{t('admin.promotions.manualExcludeFallback', 'ID loại trừ SP (thủ công)')}</label>
                    <input value={promotionForm.manualExcludedProductIds} onChange={e => setPromotionField('manualExcludedProductIds', e.target.value)} className={ic} placeholder="Nhập ID sản phẩm cần loại trừ..." />
                  </div>
                  <div>
                    <label className={lc}>{t('admin.promotions.manualExcludeFallback', 'ID loại trừ DM (thủ công)')}</label>
                    <input value={promotionForm.manualExcludedCategoryIds} onChange={e => setPromotionField('manualExcludedCategoryIds', e.target.value)} className={ic} placeholder="Nhập ID danh mục cần loại trừ..." />
                  </div>
                </div>
              </div>
            </div>
          </details>

          {/* 6) PREVIEW SECTION */}
          <section className="bg-slate-50 rounded-2xl border border-slate-200 p-6 shadow-inner">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200 mb-5">
              <span className="material-symbols-outlined text-primary text-xl">visibility</span>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">{t('admin.promotions.stepPreview', 'Xem trước hiển thị')}</h4>
            </div>
            <div className="w-full">
              <CampaignPreview form={promotionForm} sampleOrderAmount={sampleOrderAmount} onSampleChange={setSampleOrderAmount} t={t} />
            </div>
          </section>

        </div>
      </div>
    );
  };

  const renderBasicForm = () => (
    <div className="space-y-4 p-5">
      <div>
        <label className="block text-sm font-bold mb-2">{t('admin.promotions.title', 'Tiêu đề')} *</label>
        <input
          value={basicForm.title}
          onChange={(e) => setBasicField('title', e.target.value)}
          className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-2">{t('admin.promotions.image', 'Hình ảnh')}</label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={handleImageDrop}
          className={`border-2 border-dashed rounded-xl p-4 transition ${isDragActive ? 'border-primary bg-primary/5' : 'border-slate-300 bg-surface-container'}`}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageFileInputChange}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">{t('admin.promotions.dragDropImage', 'Chọn ảnh từ máy hoặc kéo thả vào đây')}</p>
            <button type="button" onClick={() => imageInputRef.current?.click()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold">{t('admin.promotions.selectImage', 'Chọn ảnh')}</button>
          </div>
          {(basicForm.imagePreview || basicForm.imageUrl) && (
            <img src={basicForm.imagePreview || basicForm.imageUrl} alt="Preview" className="mt-3 w-full max-w-sm h-36 object-cover rounded-lg border" />
          )}
        </div>
      </div>

      {activeTab === 'popup_ads' ? (
        <>
          <div>
            <label className="block text-sm font-bold mb-2">Phụ đề (Subtitle)</label>
            <input
              value={basicForm.subtitle}
              onChange={(e) => setBasicField('subtitle', e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              placeholder="Ví dụ: Chỉ hôm nay"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Mô tả chi tiết</label>
            <textarea
              value={basicForm.description}
              onChange={(e) => setBasicField('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl resize-none"
              placeholder="Nhập mô tả cho popup..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Nút hành động (CTA Text)</label>
            <input
              value={basicForm.cta_text}
              onChange={(e) => setBasicField('cta_text', e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              placeholder="Ví dụ: Nhận Ngay"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Đường dẫn hành động (CTA Link)</label>
            <input
              value={basicForm.link}
              onChange={(e) => setBasicField('link', e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              placeholder="Ví dụ: /promotions, https://lottemart.vn..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Loại chiến dịch liên kết</label>
              <select
                value={basicForm.campaign_type}
                onChange={(e) => {
                  setBasicField('campaign_type', e.target.value as any);
                  setBasicField('campaign_ref', '');
                }}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              >
                <option value="none">Không liên kết</option>
                <option value="url">Đường dẫn URL tự do</option>
                <option value="coupon">Mã Coupon</option>
                <option value="promotion">Chiến dịch Khuyến mãi</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Đối tượng mục tiêu</label>
              <select
                value={basicForm.target_audience}
                onChange={(e) => setBasicField('target_audience', e.target.value as any)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              >
                <option value="all">Tất cả khách hàng</option>
                <option value="member">Thành viên đã đăng nhập</option>
                <option value="new">Khách hàng mới (chưa có đơn)</option>
              </select>
            </div>
          </div>

          {basicForm.campaign_type === 'promotion' && (
            <div>
              <label className="block text-sm font-bold mb-2">Chọn chiến dịch Promotion liên kết *</label>
              <select
                value={basicForm.campaign_ref}
                onChange={(e) => setBasicField('campaign_ref', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              >
                <option value="">-- Chọn Promotion --</option>
                {allPromotions.map((p: any) => (
                  <option key={toItemId(p)} value={toItemId(p)}>{p.title || `Promotion #${toItemId(p).slice(-6)}`}</option>
                ))}
              </select>
            </div>
          )}

          {basicForm.campaign_type === 'coupon' && (
            <div>
              <label className="block text-sm font-bold mb-2">Chọn mã Coupon liên kết *</label>
              <select
                value={basicForm.campaign_ref}
                onChange={(e) => setBasicField('campaign_ref', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              >
                <option value="">-- Chọn Coupon --</option>
                {allCoupons.map((c: any) => (
                  <option key={toItemId(c)} value={toItemId(c)}>{c.code || c.title || `Coupon #${toItemId(c).slice(-6)}`}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Chi nhánh áp dụng</label>
              <select
                value={basicForm.target_branch}
                onChange={(e) => setBasicField('target_branch', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              >
                <option value="all">Tất cả chi nhánh</option>
                {branchOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Độ ưu tiên (Priority)</label>
              <input
                type="number"
                value={basicForm.priority}
                onChange={(e) => setBasicField('priority', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">{t('admin.promotions.startDate', 'Bắt đầu')}</label>
              <input
                type="datetime-local"
                value={basicForm.start_date}
                onChange={(e) => setBasicField('start_date', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">{t('admin.promotions.endDate', 'Kết thúc')}</label>
              <input
                type="datetime-local"
                value={basicForm.end_date}
                onChange={(e) => setBasicField('end_date', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={basicForm.show_once_per_day}
              onChange={(e) => setBasicField('show_once_per_day', e.target.checked)}
              className="h-4 w-4 rounded text-red-600 focus:ring-red-500"
            />
            Chỉ hiển thị 1 lần mỗi ngày cho mỗi người dùng (show_once_per_day)
          </label>

          <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-surface-container flex flex-col gap-4">
            <h4 className="font-bold text-sm">Xem trước giao diện Storefront Popup Modal</h4>
            <div className="flex justify-center bg-slate-800 p-8 rounded-xl relative overflow-hidden">
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 flex flex-col relative">
                <button type="button" className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-sm font-black">close</span>
                </button>
                {basicForm.imagePreview || basicForm.imageUrl ? (
                  <img src={basicForm.imagePreview || basicForm.imageUrl} alt="Popup preview" className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-slate-100 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl">image</span>
                  </div>
                )}
                <div className="p-6 flex-1 flex flex-col justify-between text-center">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">{basicForm.title || 'Tiêu Đề Quảng Cáo'}</h3>
                    {basicForm.subtitle && (
                      <h4 className="text-sm font-medium text-red-500 mt-1">{basicForm.subtitle}</h4>
                    )}
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">{basicForm.description || 'Mô tả nội dung chương trình khuyến mãi và các chính sách áp dụng...'}</p>
                  </div>
                  <div className="mt-6">
                    <button type="button" className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-red-500/20">
                      {basicForm.cta_text || 'Xem Chi Tiết'}
                    </button>
                    <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <input type="checkbox" checked={basicForm.show_once_per_day} disabled className="rounded border-slate-300 text-red-600 focus:ring-red-500" />
                      <span>Không hiển thị lại hôm nay</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'banners' ? (
        <>
          <div>
            <label className="block text-sm font-bold mb-2">{t('admin.promotions.link', 'Đường dẫn')}</label>
            <input
              value={basicForm.link}
              onChange={(e) => setBasicField('link', e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">{t('admin.promotions.position', 'Vị trí')}</label>
            <select
              value={basicForm.position}
              onChange={(e) => setBasicField('position', e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
            >
              <option value="home">{t('admin.promotions.positionHome', 'Trang ch?')}</option>
              <option value="promo">promo</option>
              <option value="category">category</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">{t('admin.promotions.startDate', 'Bắt đầu')}</label>
              <input
                type="datetime-local"
                value={basicForm.start_date}
                onChange={(e) => setBasicField('start_date', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">{t('admin.promotions.endDate', 'Kết thúc')}</label>
              <input
                type="datetime-local"
                value={basicForm.end_date}
                onChange={(e) => setBasicField('end_date', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-surface-container flex flex-col gap-4">
             <h4 className="font-bold text-sm">{t('admin.promotions.displayInterface', 'Giao diện hiển thị')}</h4>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-bold mb-2">{t('admin.promotions.textColor', 'Màu chữ banner (text_color)')}</label>
                 <div className="flex gap-2 items-center">
                   <input
                     type="color"
                     value={basicForm.text_color.startsWith('#') ? basicForm.text_color.substring(0,7) : '#ffffff'}
                     onChange={(e) => setBasicField('text_color', e.target.value)}
                     className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                   />
                   <input
                     type="text"
                     value={basicForm.text_color}
                     onChange={(e) => setBasicField('text_color', e.target.value)}
                     className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                     placeholder="#ffffff hoặc rgba(...)"
                   />
                 </div>
                 <div className="flex gap-2 mt-2">
                   <button type="button" onClick={() => setBasicField('text_color', '#ffffff')} className="w-6 h-6 rounded-full border shadow-sm bg-white" title="Trắng"></button>
                   <button type="button" onClick={() => setBasicField('text_color', '#000000')} className="w-6 h-6 rounded-full border shadow-sm bg-black" title="Đen"></button>
                   <button type="button" onClick={() => setBasicField('text_color', '#FFD700')} className="w-6 h-6 rounded-full border shadow-sm bg-[#FFD700]" title="Vàng nổi bật"></button>
                   <button type="button" onClick={() => setBasicField('text_color', '#FF0000')} className="w-6 h-6 rounded-full border shadow-sm bg-[#FF0000]" title="Đỏ sale"></button>
                   <button type="button" onClick={() => {
                     // Auto contrast heuristc base on overlay
                     const ov = basicForm.overlay_color.toLowerCase();
                     let isLight = false;
                     if (ov.includes('rgba')) {
                       const parts = ov.match(/[\d.]+/g);
                       if (parts && parts.length >= 4) {
                         const r = parseInt(parts[0], 10);
                         const g = parseInt(parts[1], 10);
                         const b = parseInt(parts[2], 10);
                         const a = parseFloat(parts[3]);
                         const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                         if (a > 0.4 && brightness > 150) isLight = true;
                       }
                     }
                     setBasicField('text_color', isLight ? '#000000' : '#ffffff');
                   }} className="px-2 py-1 bg-slate-200 text-xs font-semibold rounded hover:bg-slate-300">{t('admin.promotions.autoContrast', 'T? ??ng t??ng ph?n')}</button>
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-bold mb-2">{t('admin.promotions.overlayColor', 'Lớp phủ nền (overlay_color)')}</label>
                 <input
                     type="text"
                     value={basicForm.overlay_color}
                     onChange={(e) => setBasicField('overlay_color', e.target.value)}
                     className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                     placeholder="rgba(0,0,0,0.3)"
                   />
                 <div className="flex flex-wrap gap-2 mt-2">
                   <button type="button" onClick={() => setBasicField('overlay_color', 'rgba(0,0,0,0.3)')} className="px-2 py-1 bg-slate-200 text-xs rounded">Tối 30%</button>
                   <button type="button" onClick={() => setBasicField('overlay_color', 'rgba(0,0,0,0.6)')} className="px-2 py-1 bg-slate-200 text-xs rounded">Tối 60%</button>
                   <button type="button" onClick={() => setBasicField('overlay_color', 'rgba(255,255,255,0.4)')} className="px-2 py-1 bg-slate-200 text-xs rounded">Sáng 40%</button>
                   <button type="button" onClick={() => setBasicField('overlay_color', 'transparent')} className="px-2 py-1 bg-slate-200 text-xs rounded">Không phủ</button>
                 </div>
               </div>
             </div>
             
             <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={basicForm.text_shadow}
                onChange={(e) => setBasicField('text_shadow', e.target.checked)}
                className="h-4 w-4"
              />
              {t('admin.promotions.textShadow', 'Bật đổ bóng chữ (text shadow)')}
            </label>

             <div className="mt-2 border rounded-xl overflow-hidden relative" style={{ height: '120px' }}>
                <img src={basicForm.imagePreview || basicForm.imageUrl || 'https://via.placeholder.com/800x400'} alt="preview bg" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 flex flex-col justify-center px-6" style={{ background: basicForm.overlay_color }}>
                   <div style={{ color: basicForm.text_color, textShadow: basicForm.text_shadow ? '0 2px 6px rgba(0,0,0,0.6)' : 'none' }}>
                      <h3 className="text-xl font-bold">{basicForm.title || 'Tiêu đề Banner'}</h3>
                      <p className="text-sm mt-1 opacity-90">{t('admin.promotions.bannerSubtitlePreview', 'Xem tr??c ph? ?? banner')}</p>
                   </div>
                </div>
             </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-bold mb-2">{t('admin.promotions.branchSelect', 'Chi nhánh')} *</label>
            <select
              value={basicForm.branch_id}
              onChange={(e) => {
                const selectedBranchId = e.target.value;
                setBasicField('branch_id', selectedBranchId);
                setBasicField('branch_product_id', '');
                setBasicField('product_id', '');
              }}
              className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
            >
              <option value="">{t('admin.promotions.selectBranchPlaceholder', '-- Chọn chi nhánh --')}</option>
              {branchOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">{t('admin.promotions.branchProductSelect', 'Sản phẩm theo chi nhánh')} *</label>
            <select
              value={basicForm.branch_product_id}
              disabled={!basicForm.branch_id}
              onChange={(e) => {
                const selectedBpId = e.target.value;
                setBasicField('branch_product_id', selectedBpId);

                const bp = branchProducts.find(x => String(x.id || x._id) === selectedBpId);
                if (bp) {
                  const prodId = bp.product_id || (bp.product ? (bp.product.id || bp.product._id) : '');
                  setBasicField('product_id', String(prodId));

                  setBasicField('original_price', bp.price || bp.original_price || (bp.product ? bp.product.price : 0));
                  setBasicField('deal_price', bp.price || bp.original_price || (bp.product ? bp.product.price : 0));
                  
                  if (basicForm.title === '' || basicForm.title === 'Deal') {
                    setBasicField('title', (bp.product ? bp.product.name : '') || '');
                  }
                  if (!basicForm.imagePreview && !basicForm.imageUrl) {
                    setBasicField('imageUrl', (bp.product ? (bp.product.image_url || bp.product.image) : '') || bp.image || '');
                  }
                  // Auto-suggest stock
                  setBasicField('remaining_quantity', String(bp.stock ?? 0));
                  setBasicField('total_quantity', String(bp.stock ?? 0));
                } else {
                  setBasicField('product_id', '');
                }
              }}
              className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
            >
              <option value="">
                {!basicForm.branch_id 
                  ? t('admin.promotions.selectBranchFirst', 'Vui lòng chọn chi nhánh trước') 
                  : branchProductsLoading 
                    ? t('admin.promotions.loading', 'Đang tải...') 
                    : t('admin.promotions.selectBranchProductPlaceholder', '-- Chọn sản phẩm --')
                }
              </option>
              {branchProducts.map(bp => {
                const prodName = bp.product ? bp.product.name : '';
                const stockCount = bp.stock ?? 0;
                const isOutOfStock = stockCount <= 0;
                const isInactive = bp.is_active === false || bp.is_available === false;
                const priceFormatted = bp.price ? bp.price.toLocaleString() : '0';

                let suffix = ` - ${t('admin.promotions.stock', 'Kho')}: ${stockCount} (Giá: ${priceFormatted}đ)`;
                if (isOutOfStock) {
                  suffix = ` - [${t('admin.promotions.outOfStock', 'Hết hàng')}] (Giá: ${priceFormatted}đ)`;
                } else if (isInactive) {
                  suffix = ` - [${t('admin.promotions.unavailable', 'Không bán')}] (Giá: ${priceFormatted}đ)`;
                }

                return (
                  <option key={bp.id || bp._id} value={bp.id || bp._id}>
                    {prodName} {suffix}
                  </option>
                );
              })}
            </select>
            {(() => {
              const selectedBp = branchProducts.find(x => String(x.id || x._id) === basicForm.branch_product_id);
              if (selectedBp) {
                const isOutOfStock = (selectedBp.stock ?? 0) <= 0;
                const isInactive = selectedBp.is_active === false || selectedBp.is_available === false;
                const selectedBranch = branchOptions.find(o => String(o.id) === basicForm.branch_id);
                const branchName = selectedBranch ? selectedBranch.label : '';
                const prodName = selectedBp.product ? selectedBp.product.name : '';
                const prodPrice = selectedBp.price || selectedBp.original_price || (selectedBp.product ? selectedBp.product.price : 0);
                const prodImg = (selectedBp.product ? (selectedBp.product.image_url || selectedBp.product.image) : '') || selectedBp.image || '';
                const stockCount = selectedBp.stock ?? 0;

                return (
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4 transition-all">
                    {prodImg && (
                      <img 
                        src={prodImg} 
                        alt={prodName} 
                        className="w-16 h-16 object-cover rounded-xl border border-slate-100 bg-white shadow-sm flex-shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <div className="text-slate-800 text-sm font-bold flex flex-wrap items-center gap-2">
                        {prodName}
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-md">
                            {t('admin.promotions.outOfStock', 'Hết hàng')}
                          </span>
                        ) : isInactive ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-md">
                            {t('admin.promotions.unavailable', 'Không bán')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-md">
                            {t('common.inStock', 'Còn hàng')}
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 text-xs mt-1">
                        {t('admin.promotions.branchSelect', 'Chi nhánh')}: <span className="font-medium text-slate-700">{branchName}</span>
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        {t('admin.promotions.originalPrice', 'Giá gốc')}: <span className="font-semibold text-slate-700">{prodPrice.toLocaleString()}đ</span>
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        {t('admin.promotions.currentStock', 'Tồn kho hiện tại')}: <span className={`font-semibold ${isOutOfStock ? 'text-red-600' : stockCount <= 10 ? 'text-amber-600' : 'text-slate-700'}`}>{stockCount}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            {(() => {
              const selectedBp = branchProducts.find(x => String(x.id || x._id) === basicForm.branch_product_id);
              if (selectedBp) {
                const isOutOfStock = (selectedBp.stock ?? 0) <= 0;
                const isInactive = selectedBp.is_active === false || selectedBp.is_available === false;
                if (isOutOfStock) {
                  return (
                    <div className="mt-2 text-sm text-red-500 font-medium">
                      ⚠️ {t('admin.promotions.warningOutOfStock', 'Sản phẩm này hiện đang hết hàng ở chi nhánh đã chọn.')}
                    </div>
                  );
                }
                if (isInactive) {
                  return (
                    <div className="mt-2 text-sm text-amber-600 font-medium">
                      ⚠️ {t('admin.promotions.warningUnavailable', 'Sản phẩm này hiện đang ngừng kinh doanh hoặc không khả dụng ở chi nhánh đã chọn.')}
                    </div>
                  );
                }
              }
              return null;
            })()}
          </div>

          <div style={{ display: 'none' }}>
            <label className="block text-sm font-bold mb-2">Hidden Product ID</label>
            <select
              value={basicForm.product_id}
              onChange={(e) => {
                const selectedId = e.target.value;
                setBasicField('product_id', selectedId);
                // Auto-fill price if we can find the product
                const selectedProd = productLookup[selectedId];
                if (selectedProd) {
                  setBasicField('original_price', selectedProd.price || selectedProd.original_price || 0);
                  if (basicForm.title === '' || basicForm.title === 'Deal') {
                     setBasicField('title', selectedProd.name || '');
                  }
                  if (!basicForm.imagePreview && !basicForm.imageUrl) {
                     setBasicField('imageUrl', selectedProd.image_url || selectedProd.image || '');
                  }
                }
              }}
              className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
            >
              <option value="">{t('admin.promotions.selectProductPlaceholder', '-- Chọn sản phẩm --')}</option>
              {productOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">{t('admin.promotions.originalPrice', 'Giá gốc')} *</label>
              <input
                type="number"
                value={basicForm.original_price}
                onChange={(e) => setBasicField('original_price', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">{t('admin.promotions.dealPrice', 'Giá deal')} *</label>
              <input
                type="number"
                value={basicForm.deal_price}
                onChange={(e) => setBasicField('deal_price', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">{t('admin.promotions.startDate', 'Bắt đầu')}</label>
              <input
                type="datetime-local"
                value={basicForm.start_date}
                onChange={(e) => setBasicField('start_date', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">{t('admin.promotions.endDate', 'Kết thúc')}</label>
              <input
                type="datetime-local"
                value={basicForm.end_date}
                onChange={(e) => setBasicField('end_date', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(() => {
              const selectedBp = branchProducts.find(x => String(x.id || x._id) === basicForm.branch_product_id);
              return (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-bold">{t('admin.promotions.totalQuantity', 'Tổng số lượng deal')} *</label>
                      {selectedBp && (
                        <button
                          type="button"
                          onClick={() => setBasicField('total_quantity', String(selectedBp.stock ?? 0))}
                          className="text-xs text-primary hover:text-red-700 font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">inventory</span>
                          {t('admin.promotions.useAllStock', 'Dùng toàn bộ tồn kho')}
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      value={basicForm.total_quantity}
                      onChange={(e) => setBasicField('total_quantity', e.target.value)}
                      placeholder={t('admin.promotions.totalQuantityPlaceholder', 'Nhập tổng số lượng phát hành')}
                      className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-bold">{t('admin.promotions.remainingQuantity', 'Số lượng còn lại')} *</label>
                      {selectedBp && (
                        <button
                          type="button"
                          onClick={() => setBasicField('remaining_quantity', String(selectedBp.stock ?? 0))}
                          className="text-xs text-primary hover:text-red-700 font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-xs">inventory_2</span>
                          {t('admin.promotions.useAllStock', 'Dùng toàn bộ tồn kho')}
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      value={basicForm.remaining_quantity}
                      onChange={(e) => setBasicField('remaining_quantity', e.target.value)}
                      placeholder={t('admin.promotions.remainingQuantityPlaceholder', 'Nhập số lượng còn lại')}
                      className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
                    />
                  </div>
                </>
              );
            })()}
          </div>
        </>
      )}

      <label className="inline-flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={basicForm.is_active}
          onChange={(e) => setBasicField('is_active', e.target.checked)}
          className="h-4 w-4"
        />
        {t('admin.promotions.active', 'Kích hoạt')}
      </label>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased p-8">
      <main className="max-w-7xl mx-auto">
        <section className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">{t('admin.promotions.pageTitle', 'Trung tâm Marketing')}</h1>
            <nav className="flex gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <span>{t('admin.promotions.breadcrumbSystem', 'Hệ thống')}</span><span>/</span><span className="text-primary">{t('admin.promotions.breadcrumbPromo', 'Trung tâm Marketing')}</span>
            </nav>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-container text-white font-bold rounded-xl shadow-lg shadow-red-500/20 hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            {t('admin.promotions.createNew', 'Tạo mới')} {createLabel(activeTab)}
          </button>
        </section>

        <div className="flex items-center gap-6 border-b border-slate-200 mb-6 overflow-x-auto whitespace-nowrap scrollbar-none">
          {[
            { id: 'promotions', label: t('admin.promotions.tabPromotionsOnly', 'Khuyến mãi') },
            { id: 'coupons', label: t('admin.promotions.tabCouponsOnly', 'Coupons / Vouchers') },
            { id: 'banners', label: t('admin.promotions.tabBanners', 'Banners') },
            { id: 'hot_deals', label: t('admin.promotions.tabHotDeals', 'Giảm giá nhanh') },
            { id: 'popup_ads', label: t('admin.promotions.tabPopupAds', 'Popup Ads') }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as 'promotions' | 'coupons' | 'banners' | 'hot_deals' | 'popup_ads');
                setCurrentPage(1);
              }}
              className={`pb-4 px-2 font-bold text-sm border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm mb-6 flex flex-wrap items-center gap-4 border border-slate-100">
          <div className="flex-1 min-w-55 relative flex items-center">
            <div className="absolute left-0 top-0 h-full w-10 flex items-center justify-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400 text-[20px] leading-none block">search</span>
            </div>
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container border-none rounded-xl text-sm focus:ring-2 focus:ring-red-500/20"
              placeholder={t('admin.promotions.searchPlaceholder', 'Tìm kiếm theo tên...')}
              type="text"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="min-w-35 px-4 py-2.5 bg-surface-container border-none rounded-xl text-sm font-medium"
          >
            <option value="all">{t('admin.promotions.allStatus', 'Tất cả trạng thái')}</option>
            <option value="active">{t('admin.promotions.active', 'Hoạt động')}</option>
            <option value="inactive">{t('admin.promotions.inactive', 'Không hoạt động')}</option>
            <option value="expired">{t('admin.promotions.expired', 'Đã hết hạn')}</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value);
              setCurrentPage(1);
            }}
            className="min-w-35 px-4 py-2.5 bg-surface-container border-none rounded-xl text-sm font-medium"
          >
            <option value="newest">{t('admin.promotions.newest', 'Mới nhất')}</option>
            <option value="expiring">{t('admin.promotions.expiringSoon', 'Sắp hết hạn')}</option>
          </select>
        </section>

        <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden border border-slate-50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-slate-100 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">{t('admin.promotions.tableName', 'Tên / Hình ảnh')}</th>
                <th className="px-6 py-4">{t('admin.promotions.tableType', 'Loại / Giá trị')}</th>
                <th className="px-6 py-4">{t('admin.promotions.tableTime', 'Thời gian')}</th>
                <th className="px-6 py-4 text-center">{t('admin.promotions.tableStatus', 'Trạng thái')}</th>
                <th className="px-6 py-4 text-right">{t('admin.promotions.tableActions', 'Hành động')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-secondary font-medium">{t('admin.promotions.loading', 'Đang tải dữ liệu...')}</td></tr>
              ) : paginatedList.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-secondary font-medium">{t('admin.promotions.noData', 'Không tìm thấy dữ liệu phù hợp')}</td></tr>
              ) : (
                paginatedList.map((item) => {
                  const itemId = toItemId(item);
                  const isExpired = item.end_date && new Date(item.end_date) < new Date();
                  const total = Number(item.total_quantity || item.usage_limit || 0);
                  const used = Number(item.claimed_count || item.used_count || 0);
                  const remaining = item.remaining_quantity !== undefined && item.remaining_quantity !== null
                    ? Number(item.remaining_quantity)
                    : (total > 0 ? Math.max(0, total - used) : null);
                  const isSoldOut = Boolean(item.is_sold_out || (remaining !== null && remaining <= 0));
                  const isPromo = item.item_type === 'promotion' || item.item_type === 'coupon';
                  const imageUrl = item.image || item.image_url || (item as any).banner_image || '';
                  const statusLabel = getActiveLabel(item.is_active);
                  const secondaryStatus = isSoldOut
                    ? t('admin.promotions.soldOut', 'Hết lượt')
                    : isExpired
                    ? t('admin.promotions.expired', 'Đã hết hạn')
                    : '';

                  return (
                    <tr key={itemId} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {isPromo ? (
                            <PromotionImageDisplay
                              imageUrl={imageUrl}
                              voucherType={(item as any).voucher_type}
                              type={item.type}
                              alt={item.title || item.code || t('admin.promotions.promoFallback', 'Khuy?n m?i')}
                              className="w-16 h-10 rounded shadow-sm border border-slate-200"
                              aspectRatio=""
                            />
                          ) : (
                            <img src={imageUrl || 'https://via.placeholder.com/80'} alt="Thumb" className="w-16 h-10 object-cover rounded shadow-sm border border-slate-200" />
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-on-surface line-clamp-1">{item.title || item.code || '-'}</span>
                            <span className="text-xs text-slate-400 mt-0.5 uppercase tracking-wide">ID: {itemId}</span>
                            {item.branch_id && (
                              <span className="text-[10px] text-blue-600 font-bold mt-0.5 uppercase tracking-wide">
                                {t('admin.promotions.branchSelect', 'Chi nhánh')}: {branchOptions.find(b => String(b.id) === String(item.branch_id))?.label || item.branch_id}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          {item.item_type === 'popup_ad' ? (
                            <>
                              <span className="text-xs font-bold text-red-600 uppercase">
                                Popup Ad {item.priority ? `(Độ ưu tiên: ${item.priority})` : ''}
                              </span>
                              <span className="text-xs text-slate-800 font-medium mt-1">
                                <strong>Đối tượng:</strong> {item.target_audience === 'all' ? 'Tất cả' : item.target_audience === 'member' ? 'Thành viên' : 'Khách mới'}
                              </span>
                              {(item.cta_link || item.link) && (
                                <span className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                                  <strong>CTA:</strong> {item.cta_text || 'Xem chi tiết'} ({item.cta_link || item.link})
                                </span>
                              )}
                              {item.campaign_type && item.campaign_type !== 'none' && (
                                <span className="text-[10px] text-green-600 font-bold mt-1">
                                  Liên kết: {item.campaign_type.toUpperCase()} ({item.campaign_ref || 'N/A'})
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-bold text-on-surface uppercase">
                                {item.type || item.position || (item.original_price ? t('admin.promotions.discountPriceLabel', 'Giá giảm') : t('admin.promotions.notAvailable', 'Không có'))}
                              </span>
                              <span className="text-sm text-primary font-bold mt-0.5">
                                {(item.discount_value || item.value) ? `${item.discount_value || item.value} ${(item.type === 'percentage' || item.type === 'percent') ? '%' : 'VND'}` : ''}
                                {item.deal_price ? `${Number(item.deal_price).toLocaleString()}đ (Từ ${Number(item.original_price || 0).toLocaleString()}đ)` : ''}
                                {item.link ? `${t('admin.promotions.linkLabel', 'Liên kết')}: ${item.link}` : ''}
                              </span>
                              {total > 0 && (
                                <span className="text-xs text-slate-500 mt-1">{t('admin.promotions.remainingLabel', 'Còn lại')}: {Number(remaining || 0).toLocaleString('vi-VN')} / {Number(total).toLocaleString('vi-VN')}</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-on-surface">
                          <div><strong>{t('admin.promotions.from', 'Từ')}:</strong> {item.start_date ? new Date(item.start_date).toLocaleDateString() : '—'}</div>
                          <div><strong>{t('admin.promotions.to', 'Đến')}:</strong> {item.end_date ? new Date(item.end_date).toLocaleDateString() : '—'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`px-3 py-1 rounded-full text-xs font-black uppercase transition-all ${
                            item.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {statusLabel}
                        </button>
                        {secondaryStatus && (
                          <div className="text-[10px] text-slate-500 mt-1 font-semibold">{secondaryStatus}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(item)} className="p-2 text-slate-400 hover:text-primary hover:bg-red-50 rounded-lg transition-colors"><span className="material-symbols-outlined text-xl">edit</span></button>
                          <button onClick={() => { setDetailItem(item); setShowDetailDrawer(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><span className="material-symbols-outlined text-xl">visibility</span></button>
                          <button onClick={() => setDeleteConfirm({ show: true, id: item.id, type: item.item_type })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><span className="material-symbols-outlined text-xl">delete</span></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {totalRecords > 0 && (
            <div className="bg-surface-container-lowest px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-slate-50 gap-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-slate-500">
                  Hiển thị {Math.min(totalRecords, (currentPage - 1) * pageSize + 1)} - {Math.min(totalRecords, currentPage * pageSize)} trong số {totalRecords} kết quả
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-surface-container border border-slate-200 rounded-lg text-xs font-bold"
                >
                  <option value={10}>10 bản ghi / trang</option>
                  <option value={20}>20 bản ghi / trang</option>
                  <option value={50}>50 bản ghi / trang</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="p-1.5 border border-slate-100 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <div className="flex items-center gap-1 px-2"><span className="text-sm font-bold">{currentPage} / {totalPages}</span></div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="p-1.5 border border-slate-100 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {showFormModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 md:p-4">
          <div className={`bg-surface-container-lowest w-full ${activeTab === 'promotions' || activeTab === 'coupons' ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col`}>
            <div className="px-5 py-3 border-b flex justify-between items-center bg-surface sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-black">
                  {editingItem ? t('admin.promotions.editTitle', 'Chỉnh sửa') : t('admin.promotions.createTitle', 'Tạo mới')} {createLabel(activeTab)}
                </h3>
                {editingItem && <p className="text-xs text-secondary mt-1 tracking-wide">ID: {toItemId(editingItem)}</p>}
              </div>
              <button type="button" onClick={closeModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeTab === 'promotions' ? (
                <div className="p-0">
                  {renderPromotionStepContent()}
                </div>
              ) : (
                renderBasicForm()
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-surface flex flex-wrap justify-between gap-3 sticky bottom-0 z-10">
              <div />
              <div className="flex items-center gap-3">
                <button type="button" onClick={closeModal} className="px-6 py-2.5 text-secondary font-medium hover:bg-slate-50 rounded-xl transition-colors">{t('admin.promotions.cancel', 'Hủy bỏ')}</button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || uploadingImage}
                  className="px-8 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-red-500/20 disabled:opacity-60"
                >
                  {uploadingImage ? t('admin.promotions.uploadingImage', 'Đang upload ảnh...') : saving ? t('admin.promotions.saving', 'Đang lưu...') : t('admin.promotions.saveData', 'Lưu dữ liệu')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailDrawer && detailItem && (
        <div className="fixed inset-0 z-70 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowDetailDrawer(false)}></div>
          <div className="w-full max-w-md bg-surface h-full shadow-2xl relative flex flex-col animate-slide-left z-10">
            <div className="p-6 border-b flex justify-between items-center bg-surface-container-lowest">
              <h2 className="text-xl font-black text-on-surface line-clamp-1">{detailItem.title}</h2>
              <button onClick={() => setShowDetailDrawer(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined font-black">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <PromotionImageDisplay
                imageUrl={detailItem.image || detailItem.image_url || (detailItem as any).banner_image || ''}
                voucherType={(detailItem as any).voucher_type}
                type={detailItem.type}
                alt={detailItem.title || t('admin.promotions.promoFallback', 'Khuyến mãi')}
                className="w-full rounded-2xl shadow-sm border border-slate-100"
                aspectRatio="aspect-video"
              />

              <div className="space-y-4">
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                  <span className="text-secondary font-bold text-sm">{t('admin.promotions.status', 'Trạng thái')}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${detailItem.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {getActiveLabel(detailItem.is_active)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-container-lowest rounded-xl border border-slate-100 shadow-sm">
                    <span className="block text-xs uppercase font-bold text-secondary mb-1">{t('admin.promotions.startDate', 'Bắt đầu')}</span>
                    <span className="text-sm font-semibold">{detailItem.start_date ? new Date(detailItem.start_date).toLocaleString() : '—'}</span>
                  </div>
                  <div className="p-4 bg-surface-container-lowest rounded-xl border border-slate-100 shadow-sm">
                    <span className="block text-xs uppercase font-bold text-secondary mb-1">{t('admin.promotions.endDate', 'Kết thúc')}</span>
                    <span className="text-sm font-semibold">{detailItem.end_date ? new Date(detailItem.end_date).toLocaleString() : '—'}</span>
                  </div>
                </div>

                {detailItem.item_type === 'promotion' && (
                  <div className="p-4 bg-red-50 text-red-900 rounded-xl border border-red-100">
                    <span className="block text-xs uppercase font-black mb-1">{t('admin.promotions.promoValue', 'Giá trị khuyến mãi')}</span>
                    <span className="text-2xl font-black">
                      {detailItem.type === 'percentage' || detailItem.type === 'percent'
                        ? `${t('admin.promotions.discountPrefix', 'Giảm')} ${detailItem.value}%`
                        : detailItem.type === 'bogo'
                        ? t('admin.promotions.bogo', 'Mua X tặng Y (BOGO)')
                        : `${t('admin.promotions.discountPrefix', 'Giảm')} ${detailItem.value?.toLocaleString()}đ`}
                    </span>
                  </div>
                )}

                {detailItem.item_type === 'hot_deal' && (
                  <div className="p-4 bg-orange-50 text-orange-900 rounded-xl border border-orange-100">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="block text-xs uppercase font-black">{t('admin.promotions.originalPrice', 'Giá gốc')}</span>
                      <span className="text-sm font-semibold line-through opacity-70">{detailItem.original_price?.toLocaleString()}đ</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="block text-xs uppercase font-black">{t('admin.promotions.hotDealPrice', 'Giá Hot Deal')}</span>
                      <span className="text-2xl font-black">{detailItem.deal_price?.toLocaleString()}đ</span>
                    </div>
                  </div>
                )}

                {detailItem.item_type === 'popup_ad' && (
                  <div className="p-4 bg-red-50 text-red-900 rounded-xl border border-red-100 space-y-2">
                    {detailItem.subtitle && (
                      <div>
                        <span className="block text-xs uppercase font-bold opacity-75">Phụ đề</span>
                        <span className="text-sm font-semibold">{detailItem.subtitle}</span>
                      </div>
                    )}
                    <div>
                      <span className="block text-xs uppercase font-bold opacity-75">Đối tượng mục tiêu</span>
                      <span className="text-sm font-semibold">
                        {detailItem.target_audience === 'all' ? 'Tất cả khách hàng' : detailItem.target_audience === 'member' ? 'Thành viên đã đăng nhập' : 'Khách hàng mới'}
                      </span>
                    </div>
                    {detailItem.cta_text && (
                      <div>
                        <span className="block text-xs uppercase font-bold opacity-75">Nút hành động (CTA)</span>
                        <span className="text-sm font-semibold">{detailItem.cta_text}</span>
                      </div>
                    )}
                    {detailItem.campaign_type && detailItem.campaign_type !== 'none' && (
                      <div>
                        <span className="block text-xs uppercase font-bold opacity-75">Liên kết chiến dịch</span>
                        <span className="text-sm font-semibold uppercase">{detailItem.campaign_type} ({detailItem.campaign_ref || 'N/A'})</span>
                      </div>
                    )}
                    <div>
                      <span className="block text-xs uppercase font-bold opacity-75">Tần suất hiển thị</span>
                      <span className="text-sm font-semibold">{detailItem.show_once_per_day ? '1 lần/ngày' : 'Mỗi lượt truy cập'}</span>
                    </div>
                    {detailItem.priority !== undefined && (
                      <div>
                        <span className="block text-xs uppercase font-bold opacity-75">Độ ưu tiên (Priority)</span>
                        <span className="text-sm font-semibold">{detailItem.priority}</span>
                      </div>
                    )}
                  </div>
                )}

                {detailItem.description && (
                  <div className="p-4 bg-surface-container-lowest rounded-xl border border-slate-100 shadow-sm">
                    <span className="block text-xs uppercase font-bold text-secondary mb-1">{t('admin.promotions.detailDescription', 'Mô tả chi tiết')}</span>
                    <p className="text-sm text-on-surface leading-relaxed text-justify">{detailItem.description}</p>
                  </div>
                )}

                {detailItem.link && (
                  <div className="p-4 bg-blue-50 text-blue-900 rounded-xl border border-blue-100 overflow-hidden text-ellipsis">
                    <span className="block text-xs uppercase font-black mb-1">{t('admin.promotions.targetUrl', 'URL đích (tuỳ chọn)')}</span>
                    {detailItem.link.startsWith('http') ? (
                      <a href={detailItem.link} target="_blank" rel="noreferrer" className="text-sm font-semibold hover:underline text-blue-700">{detailItem.link}</a>
                    ) : (
                      <Link to={detailItem.link} onClick={() => setShowDetailDrawer(false)} className="text-sm font-semibold hover:underline text-blue-700">{detailItem.link}</Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm.show && (
        <div className="fixed inset-0 z-80 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-3xl shadow-2xl p-8 text-center animate-scale-up">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>
            <h3 className="text-xl font-black mb-2">{t('admin.promotions.deleteConfirmTitle', 'Xác nhận xóa?')}</h3>
            <p className="text-secondary text-sm mb-8 leading-relaxed">{t('admin.promotions.deleteConfirmText', 'Dữ liệu sau khi xóa sẽ không thể khôi phục. Bạn có chắc chắn muốn xóa?')}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm({ show: false, id: null, type: '' })} className="flex-1 py-3 text-secondary font-bold hover:bg-slate-100 rounded-xl transition-colors">{t('admin.promotions.deleteCancel', 'Hủy bỏ')}</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 hover:scale-105 transition-all">{t('admin.promotions.deleteConfirm', 'Đồng ý xóa')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCouponsManagement;

