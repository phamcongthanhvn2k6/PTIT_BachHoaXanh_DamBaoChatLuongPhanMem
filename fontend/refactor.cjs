const fs = require('fs');

const filePath = 'c:/Users/LE THANH CUONG/OneDrive/Desktop/Lotte_Mart_Project/fontend/src/admin/pages/AdminCouponsManagement.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Un-nest the `if (currentStep === 0)` block
content = content.replace(/if \(currentStep === 0\) \{/g, `
    return (
      <div className="space-y-6">
        {/* === SECTION: THÔNG TIN CƠ BẢN === */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">{t('admin.promotions.stepBasicInfo')}</h4>
`);

// Remove return and open the next block
content = content.replace(/\s*return \(\s*<div className="space-y-5">/g, '\n');
content = content.replace(/\s*return \(\s*<div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">/g, '\n');

// 2. Un-nest `if (currentStep === 1)` block
content = content.replace(/\s*<\/div>\s*\);\s*\}\s*if \(currentStep === 1\) \{/g, `
        </div>
        
        {/* === SECTION: QUY TẮC GIẢM GIÁ === */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">{t('admin.promotions.stepDiscountRules')}</h4>
`);

// 3. Un-nest `if (currentStep === 2)` block
content = content.replace(/\s*<\/div>\s*\);\s*\}\s*if \(currentStep === 2\) \{/g, `
        </div>
        
        {/* === SECTION: PHẠM VI ÁP DỤNG === */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">{t('admin.promotions.stepScope')}</h4>
`);

// 4. Un-nest `if (currentStep === 3)` block
content = content.replace(/\s*<\/div>\s*\);\s*\}\s*if \(currentStep === 3\) \{/g, `
        </div>
        
        {/* === SECTION: GIỚI HẠN & HIỆU LỰC === */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">{t('admin.promotions.stepLimits')}</h4>
`);

// 5. Un-nest `if (currentStep === 4)` block
content = content.replace(/\s*<\/div>\s*\);\s*\}\s*if \(currentStep === 4\) \{/g, `
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
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="font-bold text-xl text-primary">{t('admin.promotions.stepPreview')}</h4>
`);

// Final block ending
content = content.replace(/\s*<\/div>\s*\);\s*\}\s*return null;/g, `
        </div>
      </div>
    );`);


// Write to file
fs.writeFileSync(filePath, content, 'utf8');
console.log('Node replacement done');
