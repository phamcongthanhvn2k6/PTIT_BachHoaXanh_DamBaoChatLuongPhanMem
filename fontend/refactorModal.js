const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/LE THANH CUONG/OneDrive/Desktop/Lotte_Mart_Project/fontend/src/admin/pages/AdminCouponsManagement.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove PROMOTION_STEPS map rendering from modal
content = content.replace(
    /\{activeTab === 'promotions' && \(\s*<div className="px-5 pt-3 bg-surface border-b border-slate-100">\s*<div className="grid grid-cols-2 md:grid-cols-5 gap-2 pb-3">[\s\S]*?<\/div>\s*<\/div>\s*\)\}/g,
    ''
);

// 2. Remove prev/next buttons
let prevNextRegex = /\{activeTab === 'promotions' && \(\s*<>\s*<button[\s\S]*?Quay lại\s*<\/button>\s*\{currentStep < PROMOTION_STEPS\.length - 1 && \([\s\S]*?Tiếp theo\s*<\/button>\s*\)\}\s*<\/>\s*\)\}/;
content = content.replace(prevNextRegex, '');

// 3. Update the handleSave logic to disable if uploadingImage or saving
const disabledSaveRegex = /disabled=\{saving \|\| uploadingImage \|\| \(activeTab === 'promotions' && currentStep < PROMOTION_STEPS\.length - 1\)\}/;
content = content.replace(disabledSaveRegex, 'disabled={saving || uploadingImage}');

// 4. Update the validator to validate everything at once
content = content.replace(
    /const validatePromotionStep = \(step: number\): boolean => \{[\s\S]*?const validateFullPromotionForm = \(\): boolean => \{[\s\S]*?return true;\s*\};/g,
    `const validateFullPromotionForm = (): boolean => {
    const errors: Record<string, string> = {};

    const mergedTargetIds = uniqueIds([
      ...(promotionForm.scope === 'product' ? promotionForm.target_product_ids : []),
      ...(promotionForm.scope === 'category' ? promotionForm.target_category_ids : []),
      ...(promotionForm.scope === 'branch' ? promotionForm.target_branch_ids : []),
      ...parseCsvIds(promotionForm.manualTargetIds),
    ]);

    if (!promotionForm.title.trim()) errors.title = t('admin.promotions.campaignNameRequired');

    const validTypesPromotion = ['percent', 'fixed_amount', 'bogo', 'free_shipping', 'points_multiplier', 'gift_item', 'flash_deal'];
    const validTypesCoupon = ['percent', 'fixed_amount', 'free_shipping', 'points'];
    const validTypes = promotionForm.recordType === 'coupon' ? validTypesCoupon : validTypesPromotion;
    if (!validTypes.includes(promotionForm.type)) errors.type = t('admin.promotions.discountTypeRequired');

    if (promotionForm.type === 'bogo') {
      if (!(Number(promotionForm.min_quantity || 0) > 0)) errors.min_quantity = 'BOGO cần số lượng mua tối thiểu > 0';
      if (!(Number(promotionForm.gift_quantity || 0) > 0)) errors.gift_quantity = 'BOGO cần số lượng tặng > 0';
    }

    if ((promotionForm.type === 'percent' || promotionForm.type === 'fixed_amount' || promotionForm.type === 'flash_deal') && Number(promotionForm.discount_value || 0) <= 0) {
      errors.discount_value = t('admin.promotions.discountValueRequired');
    }

    if (promotionForm.scope !== 'all' && mergedTargetIds.length === 0) {
      errors.scope = t('admin.promotions.scopeRequired');
    }

    if (promotionForm.start_date && promotionForm.end_date) {
      const start = new Date(promotionForm.start_date).getTime();
      const end = new Date(promotionForm.end_date).getTime();
      if (start >= end) errors.end_date = t('admin.promotions.endDateError');
    }

    if (promotionForm.recordType === 'coupon' && promotionForm.code && !/^[A-Za-z0-9_-]+$/.test(promotionForm.code)) {
      errors.code = t('admin.promotions.couponCodeError');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };`
);

// 5. Replace `if (currentStep === ...)` with simple section wrappers.
content = content.replace(/if \(currentStep === 0\) \{/g, `
    return (
      <div className="space-y-6">
        {/* === SECTION: THÔNG TIN CƠ BẢN === */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">{t('admin.promotions.stepBasicInfo')}</h4>
`);

content = content.replace(/if \(currentStep === 1\) \{/g, `
        </div>
        
        {/* === SECTION: QUY TẮC GIẢM GIÁ === */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">{t('admin.promotions.stepDiscountRules')}</h4>
`);

content = content.replace(/if \(currentStep === 2\) \{/g, `
        </div>
        
        {/* === SECTION: PHẠM VI ÁP DỤNG === */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">{t('admin.promotions.stepScope')}</h4>
`);

content = content.replace(/if \(currentStep === 3\) \{/g, `
        </div>
        
        {/* === SECTION: GIỚI HẠN & HIỆU LỰC === */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">{t('admin.promotions.stepLimits')}</h4>
`);

content = content.replace(/if \(currentStep === 4\) \{/g, `
        </div>
        
        {/* === SECTION: ADVANCED SETTINGS === */}
        <details className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
          <summary className="font-bold text-md text-slate-700 cursor-pointer select-none">
            {t('admin.promotions.advancedSettings')}
          </summary>
          <div className="mt-4 space-y-4 bg-white p-4 rounded-xl border border-slate-100">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-bold mb-2">{t('admin.promotions.priority')}</label>
                  <input type="number" value={promotionForm.priority} onChange={(e) => setPromotionField('priority', e.target.value)} className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl" />
               </div>
               <div>
                  <label className="block text-sm font-bold mb-2">{t('admin.promotions.maxRedemptions')}</label>
                  <input type="number" value={promotionForm.max_redemptions} onChange={(e) => setPromotionField('max_redemptions', e.target.value)} className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl" placeholder={t('admin.promotions.unlimitedHint')} />
               </div>
               <div>
                  <label className="block text-sm font-bold mb-2">{t('admin.promotions.hideAfterExpired')}</label>
                  <input type="number" value={promotionForm.hide_after_expired_hours} onChange={(e) => setPromotionField('hide_after_expired_hours', e.target.value)} className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl" />
               </div>
               <div>
                 <label className="inline-flex items-center gap-2 mt-8 cursor-pointer font-bold text-sm">
                   <input type="checkbox" checked={promotionForm.stackable} onChange={(e) => setPromotionField('stackable', e.target.checked)} className="w-4 h-4" />
                   {t('admin.promotions.stackableLabel')}
                 </label>
               </div>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
               <div>
                 <label className="block text-sm font-bold mb-2">{t('admin.promotions.badgeText')}</label>
                 <input value={promotionForm.badge_text} onChange={(e) => setPromotionField('badge_text', e.target.value)} className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl" placeholder="HOT / FLASH SALE" />
               </div>
               <div>
                 <label className="block text-sm font-bold mb-2">{t('admin.promotions.targetUrl')}</label>
                 <input value={promotionForm.banner_url} onChange={(e) => setPromotionField('banner_url', e.target.value)} className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl" placeholder="/promotions" />
               </div>
             </div>
          </div>
        </details>
        
        {/* === SECTION: XEM TRƯỚC === */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 mt-4">
          <h4 className="font-bold text-xl text-primary">{t('admin.promotions.stepPreview')}</h4>
`);

content = content.replace(/return null;\s*\}\s*const applySelectedImage/g, `
        </div>
      </div>
    );
  };
  
  const applySelectedImage`);

// Let's remove the extra closing braces from the old steps
content = content.replace(/         <\/div>\s* \);\s*\}\s* \/\* === SECTION:/g, `  /* === SECTION:`);
// Clean up old returns
content = content.replace(/return \(\s*<div className="space-y-5">/g, '');
content = content.replace(/return \(\s*<div className="space-y-4/g, '');

// Import PromotionImageDisplay
if (!content.includes('PromotionImageDisplay')) {
    content = content.replace(/import \{ promotionService \} from '\.\.\/\.\.\/services\/promotionService';/g, `import { promotionService } from '../../services/promotionService';\nimport { PromotionImageDisplay } from '../../components/PromotionImageFallback/PromotionImageFallback';`);
}

// Update detailDrawer image
content = content.replace(
    /<img src=\{detailItem.image \|\| detailItem.image_url \|\| 'https:\/\/via.placeholder.com\/400'\} alt="Detail" className="w-full rounded-2xl shadow-sm border border-slate-100 object-cover aspect-video" \/>/g,
    `<PromotionImageDisplay imageUrl={detailItem.image || detailItem.image_url} type={detailItem.type} className="w-full shadow-sm border border-slate-100" />`
);

// Update table image
content = content.replace(
    /const img = item\.image \|\| item\.image_url \|\| 'https:\/\/via.placeholder.com\/80';[\s\S]*?<img src=\{img\} alt="Thumb" className="w-16 h-10 object-cover rounded shadow-sm border border-slate-200" \/>/g,
    `const img = item.image || item.image_url;
                          <PromotionImageDisplay
                            imageUrl={img}
                            type={item.type}
                            className="w-16 h-10 shadow-sm border border-slate-200"
                            aspectRatio=""
                          />
`
);

// Remove the badge UI from step 0 (moved to advanced settings)
content = content.replace(
    /<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">\s*<div>\s*<label className="block text-sm font-bold mb-2">Badge text<\/label>\s*<input\s*value=\{promotionForm.badge_text\}[\s\S]*?placeholder="\/promotions"\s*\/>\s*<\/div>\s*<\/div>/g,
    ''
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done refactoring!');
