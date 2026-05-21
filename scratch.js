const fs = require('fs');
const filePath = 'c:\\\\Users\\\\LE THANH CUONG\\\\OneDrive\\\\Desktop\\\\Lotte_Mart_Project\\\\fontend\\\\src\\\\admin\\\\pages\\\\AdminCouponsManagement.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startIndex = content.indexOf('  const renderPromotionStepContent = () => {');
const endIndex = content.indexOf('  const renderBasicForm = () => (');

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `  const renderPromotionStepContent = () => {
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
                  onChange={(e) => setPromotionField('recordType', e.target.value)}
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
                  onChange={e => setPromotionField('voucher_type', e.target.value)} 
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
                className={\`\${ic} resize-none\`} 
                placeholder={t('admin.promotions.descriptionPlaceholder', 'Mô tả ngắn về chiến dịch')} 
              />
            </div>

            <div>
              <label className={lc}>{t('admin.promotions.campaignImage', 'Hình ảnh')} <span className="font-normal text-slate-400 lowercase">{t('admin.promotions.imageOptional', '(tuỳ chọn)')}</span></label>
              <div 
                onDragOver={e => { e.preventDefault(); setIsDragActive(true); }} 
                onDragLeave={() => setIsDragActive(false)} 
                onDrop={handleImageDrop} 
                className={\`border-2 border-dashed rounded-xl p-6 transition-all text-center \${isDragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'}\`}
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
                       <button type="button" onClick={() => imageInputRef.current?.click()} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50">Đổi ảnh khác</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <label className="inline-flex items-center gap-3 text-sm font-bold cursor-pointer mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
              <input type="checkbox" checked={promotionForm.is_active} onChange={e => setPromotionField('is_active', e.target.checked)} className="h-5 w-5 rounded text-primary focus:ring-primary" />
              <span className="flex items-center gap-2">
                 {promotionForm.is_active ? <span className="h-2.5 w-2.5 bg-green-500 rounded-full inline-block animate-pulse"></span> : <span className="h-2.5 w-2.5 bg-slate-400 rounded-full inline-block"></span>}
                 {promotionForm.is_active ? t('admin.promotions.active', 'Đang hoạt động') : t('admin.promotions.inactive', 'Không hoạt động')}
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
                <select value={promotionForm.type} onChange={e => setPromotionField('type', e.target.value)} className={ic}>
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
                    placeholder={promotionForm.type === 'percent' ? 'Ví dụ: 20' : 'Ví dụ: 50000'} 
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
              <select value={promotionForm.scope} onChange={e => setPromotionField('scope', e.target.value)} className={ic}>
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
                <input value={promotionForm.code} onChange={e => setPromotionField('code', e.target.value.toUpperCase())} className={\`\${ic} font-mono uppercase tracking-widest bg-slate-50 border-slate-300 font-bold text-lg\`} placeholder={t('admin.promotions.couponCodeAutoHint', 'ĐỂ TRỐNG ĐỂ TỰ TẠO')} />
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
                  <label className={lc}>{t('admin.promotions.priority', 'Priority')}</label>
                  <input type="number" value={promotionForm.priority} onChange={e => setPromotionField('priority', e.target.value)} className={ic} placeholder="0" />
                </div>
                <div>
                  <label className={lc}>{t('admin.promotions.maxRedemptions', 'Max redemptions')}</label>
                  <input type="number" value={promotionForm.max_redemptions} onChange={e => setPromotionField('max_redemptions', e.target.value)} className={ic} placeholder={t('admin.promotions.previewUnlimited', 'Không giới hạn')} />
                </div>
                <div>
                  <label className={lc}>{t('admin.promotions.hideAfterExpired', 'Ẩn sau hết hạn (giờ)')}</label>
                  <input type="number" value={promotionForm.hide_after_expired_hours} onChange={e => setPromotionField('hide_after_expired_hours', e.target.value)} className={ic} placeholder="24" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={lc}>{t('admin.promotions.badgeText', 'Badge text')}</label>
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
                  <textarea value={promotionForm.manualTargetIds} onChange={e => setPromotionField('manualTargetIds', e.target.value)} className={\`\${ic} resize-none font-mono text-xs\`} rows={3} placeholder="67f4..., 67f5..." />
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
              <CampaignPreview form={promotionForm} sampleOrderAmount={sampleOrderAmount} onSampleChange={setSampleOrderAmount} />
            </div>
          </section>

        </div>
      </div>
    );
  };
\n`;

  const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('Replaced successfully');
} else {
  console.log('Indices not found', startIndex, endIndex);
}
