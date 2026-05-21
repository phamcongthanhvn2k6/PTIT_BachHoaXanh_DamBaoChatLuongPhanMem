const fs = require('fs');

const f = 'fontend/src/admin/pages/AdminCouponsManagement.tsx';
let c = fs.readFileSync(f, 'utf8');

// Remove Hot Deals Tab
c = c.replace(
  "{ id: 'hot_deals', label: t('admin.promotions.tabHotDeals') },",
  ""
);

// Remove Hot Deals from setActiveTab
c = c.replace(
  "setActiveTab(tab.id as 'promotions' | 'banners' | 'hot_deals');",
  "setActiveTab(tab.id as 'promotions' | 'banners');"
);

// Remove Hot Deal from 'createNew' button text
c = c.replace(
  "{t('admin.promotions.createNew')} {activeTab === 'promotions' ? t('admin.promotions.promoCoupon') : activeTab === 'banners' ? t('admin.promotions.banner') : t('admin.promotions.hotDeal')}",
  "{t('admin.promotions.createNew')} {activeTab === 'promotions' ? t('admin.promotions.promoCoupon') : t('admin.promotions.banner')}"
);

// Remove Hot Deal from form title
c = c.replace(
  "{editingItem ? t('admin.promotions.editTitle') : t('admin.promotions.createTitle')} {activeTab === 'promotions' ? t('admin.promotions.promoCoupon') : activeTab === 'banners' ? t('admin.promotions.banner') : t('admin.promotions.hotDeal')}",
  "{editingItem ? t('admin.promotions.editTitle') : t('admin.promotions.createTitle')} {activeTab === 'promotions' ? t('admin.promotions.promoCoupon') : t('admin.promotions.banner')}"
);

// Remove basicForm render block for Hot Deals (lines 1966-2017 are the Hot Deals fields).
// Instead of complex regex, let's just make it render null if activeTab !== 'banners' but we are in basicForm.
// Wait, if activeTab is not 'promotions', it renders basicForm. If it is only 'promotions' or 'banners', then basicForm IS for banners!
// We can just remove the `? (` condition for banners and the fallback `) : (`.
// Let's replace the whole `renderBasicForm` block dynamically or just rely on the fact that `activeTab` can only be 'banners' now, so the else block is never reached!
// Actually, it's safer to leave the else block, it just won't be reachable.

// Remove Hot Deals fetching in loadData
c = c.replace(
  "const [promotions, coupons, banners, hotDeals] = await Promise.all([",
  "const [promotions, coupons, banners] = await Promise.all(["
);
c = c.replace(
  "hotDealService.getHotDeals({ includeInactive: true }),",
  ""
);
c = c.replace(
  "const hotDealsList = Array.isArray(hotDeals?.data) ? hotDeals.data.map((h: any) => ({ ...h, item_type: 'hot_deal' })) : [];",
  "const hotDealsList: any[] = [];"
);

// Remove deleteHotDeal
c = c.replace(
  "if (deleteConfirm.type === 'hot_deal') await hotDealService.deleteHotDeal(String(deleteConfirm.id));",
  ""
);

// Remove updateHotDeal in toggle
c = c.replace(
  "} else {\r\n        await hotDealService.updateHotDeal(itemId, payload);\r\n      }",
  "}"
);
c = c.replace(
  "} else {\n        await hotDealService.updateHotDeal(itemId, payload);\n      }",
  "}"
);


// Save the file
fs.writeFileSync(f, c, 'utf8');
console.log('done removing hot deals tab');
