const fs = require('fs');

const filePath = 'c:/Users/LE THANH CUONG/OneDrive/Desktop/Lotte_Mart_Project/fontend/src/admin/pages/AdminCouponsManagement.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `  const renderPromotionStepContent = () => {
    const isCoupon = promotionForm.recordType === 'coupon';
    const isShippingVoucher = promotionForm.voucher_type === 'shipping';

    const discountOptions =
      promotionForm.recordType === 'coupon'
        ? [
            { value: 'percent', label: 'Phần trăm (%)' },
            { value: 'fixed_amount', label: 'Giá trị cố định' },
            { value: 'free_shipping', label: 'Freeship' },
            { value: 'points', label: 'Điểm thưởng' },
          ]
        : [
            { value: 'percent', label: 'Phần trăm (%)' },
            { value: 'fixed_amount', label: 'Giá trị cố định' },
            { value: 'bogo', label: 'Mua X tặng Y (BOGO)' },
            { value: 'free_shipping', label: 'Freeship' },
            { value: 'points_multiplier', label: 'Điểm x2' },
            { value: 'gift_item', label: 'Tặng kèm' },
            { value: 'flash_deal', label: 'Flash deal' },
          ];

    let filteredDiscountOptions = discountOptions;
    if (isShippingVoucher) {
      filteredDiscountOptions = discountOptions.filter(opt => 
        ['percent', 'fixed_amount', 'free_shipping'].includes(opt.value)
      );
    } else if (isCoupon) {
      filteredDiscountOptions = discountOptions.filter(opt => opt.value !== 'free_shipping');
    }

    const showDiscountValue = ['percent', 'fixed_amount', 'flash_deal'].includes(promotionForm.type);
    const showMinOrder = true;
    const showMinQuantity = !isShippingVoucher;
    const showMaxDiscount = promotionForm.type === 'percent' || promotionForm.type === 'flash_deal';
    const showBogo = (promotionForm.type === 'bogo' || promotionForm.type === 'gift_item') && !isShippingVoucher;
    const showPoints = (promotionForm.type === 'points_multiplier' || promotionForm.type === 'points') && !isShippingVoucher;

    return (
      <div className="space-y-6">
        {/* === SECTION: THÔNG TIN CƠ BẢN === */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">{t('admin.promotions.stepBasicInfo')}</h4>

          {promotionForm.is_auto_generated && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-[18px]">lightbulb</span>
              <p className="text-sm text-blue-800 font-medium">✨ Đề xuất từ cảnh báo hạn dùng! Các thông tin đã được tự động điền dựa trên tồn kho và hạn sử dụng thực tế.</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Loại bản ghi</label>
              <select
                value={promotionForm.recordType}
                onChange={(e) => setPromotionField('recordType', e.target.value as PromotionRecordType)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              >
                <option value="promotion">Promotion</option>
                <option value="coupon">Coupon</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Loại voucher</label>
              <select
                value={promotionForm.voucher_type}
                onChange={(e) => setPromotionField('voucher_type', e.target.value as 'product' | 'shipping')}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              >
                <option value="product">🛒 Giảm giá sản phẩm</option>
                <option value="shipping">🚚 Giảm phí vận chuyển</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Trạng thái</label>
              <select
                value={promotionForm.status}
                onChange={(e) => setPromotionField('status', e.target.value as PromotionFormState['status'])}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              >
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Tên chiến dịch *</label>
            <input
              value={promotionForm.title}
              onChange={(e) => setPromotionField('title', e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              placeholder="Ví dụ: Summer Mega Sale"
            />
            {formErrors.title && <p className="text-xs text-red-600 mt-1">{formErrors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Mô tả</label>
            <textarea
              value={promotionForm.description}
              onChange={(e) => setPromotionField('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl resize-none"
              placeholder="Mô tả ngắn về chiến dịch"
            />
          </div>

          <div>
             <label className="block text-sm font-bold mb-2">Hình ảnh chiến dịch (tuỳ chọn)</label>
             <div
               onDragOver={(e) => {
                 e.preventDefault();
                 setIsDragActive(true);
               }}
               onDragLeave={() => setIsDragActive(false)}
               onDrop={handleImageDrop}
               className={\`border-2 border-dashed rounded-xl p-4 transition \${isDragActive ? 'border-primary bg-primary/5' : 'border-slate-300 bg-surface-container'}\`}
             >
               <input
                 ref={imageInputRef}
                 type="file"
                 accept="image/jpeg,image/png,image/webp,image/gif"
                 className="hidden"
                 onChange={handleImageFileInputChange}
               />
               <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                 <div>
                   <p className="text-sm font-semibold">Kéo thả ảnh vào đây hoặc chọn từ máy</p>
                   <p className="text-xs text-secondary mt-1">Hỗ trợ JPG/PNG/WEBP/GIF, tối đa 5MB</p>
                 </div>
                 <button
                   type="button"
                   onClick={() => imageInputRef.current?.click()}
                   className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold"
                 >
                   Chọn ảnh
                 </button>
               </div>
               {(promotionForm.imagePreview || promotionForm.imageUrl) && (
                 <div className="mt-4">
                   <img
                     src={promotionForm.imagePreview || promotionForm.imageUrl}
                     alt="Preview"
                     className="w-full max-w-sm h-40 object-cover rounded-lg border border-slate-200"
                   />
                 </div>
               )}
             </div>
             {formErrors.image && <p className="text-xs text-red-600 mt-1">{formErrors.image}</p>}
           </div>

          <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={promotionForm.is_active}
              onChange={(e) => setPromotionField('is_active', e.target.checked)}
              className="h-4 w-4"
            />
            {t('admin.promotions.active', { defaultValue: 'Hoạt động' })}
          </label>
        </div>

        {/* === SECTION: QUY TẮC GIẢM GIÁ === */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">{t('admin.promotions.stepDiscountRules')}</h4>

          {isShippingVoucher && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-600 text-[18px]">local_shipping</span>
              <p className="text-sm text-teal-800 font-medium">🚚 Voucher vận chuyển — chỉ hiện các trường liên quan đến giảm phí ship.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Loại giảm *</label>
              <select
                value={promotionForm.type}
                onChange={(e) => setPromotionField('type', e.target.value as PromotionFormState['type'])}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              >
                {filteredDiscountOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {formErrors.type && <p className="text-xs text-red-600 mt-1">{formErrors.type}</p>}
            </div>
            {showDiscountValue && (
              <div>
                <label className="block text-sm font-bold mb-2">
                  {isShippingVoucher ? 'Giá trị giảm phí ship' : 'Giá trị giảm'}
                </label>
                <input
                  type="number"
                  value={promotionForm.discount_value}
                  onChange={(e) => setPromotionField('discount_value', e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
                  placeholder={promotionForm.type === 'percent' ? 'Ví dụ: 20 (%)' : 'Ví dụ: 50000 (VNĐ)'}
                />
                {formErrors.discount_value && <p className="text-xs text-red-600 mt-1">{formErrors.discount_value}</p>}
              </div>
            )}
            {promotionForm.type === 'free_shipping' && (
              <div className="flex items-center">
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl w-full">
                  <p className="text-sm font-bold text-teal-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Miễn phí vận chuyển hoàn toàn
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className={\`grid grid-cols-1 gap-4 \${showMinQuantity && showMaxDiscount ? 'sm:grid-cols-3' : showMaxDiscount ? 'sm:grid-cols-2' : showMinQuantity ? 'sm:grid-cols-2' : ''}\`}>
            {showMinOrder && (
              <div>
                <label className="block text-sm font-bold mb-2">
                  {isShippingVoucher ? 'Đơn tối thiểu để miễn ship' : 'Đơn tối thiểu'}
                </label>
                <input
                  type="number"
                  value={promotionForm.min_order_amount}
                  onChange={(e) => setPromotionField('min_order_amount', e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
                />
              </div>
            )}
            {showMinQuantity && (
              <div>
                <label className="block text-sm font-bold mb-2">Số lượng tối thiểu</label>
                <input
                  type="number"
                  value={promotionForm.min_quantity}
                  onChange={(e) => setPromotionField('min_quantity', e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
                />
                {formErrors.min_quantity && <p className="text-xs text-red-600 mt-1">{formErrors.min_quantity}</p>}
              </div>
            )}
            {showMaxDiscount && (
              <div>
                <label className="block text-sm font-bold mb-2">Giảm tối đa (VNĐ)</label>
                <input
                  type="number"
                  value={promotionForm.max_discount_amount}
                  onChange={(e) => setPromotionField('max_discount_amount', e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
                />
              </div>
            )}
          </div>

          {showBogo && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div>
                <label className="block text-sm font-bold mb-2">Mua X</label>
                <input
                  type="number"
                  value={promotionForm.min_quantity}
                  onChange={(e) => setPromotionField('min_quantity', e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Tặng Y</label>
                <input
                  type="number"
                  value={promotionForm.gift_quantity}
                  onChange={(e) => setPromotionField('gift_quantity', e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl"
                />
                {formErrors.gift_quantity && <p className="text-xs text-red-600 mt-1">{formErrors.gift_quantity}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Gift product id</label>
                <input
                  value={promotionForm.gift_product_id}
                  onChange={(e) => setPromotionField('gift_product_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl"
                  placeholder="Tuỳ chọn"
                />
              </div>
            </div>
          )}

          {showPoints && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Hệ số điểm</label>
                <input
                  type="number"
                  value={promotionForm.points_multiplier}
                  onChange={(e) => setPromotionField('points_multiplier', e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
                />
                {formErrors.points_multiplier && <p className="text-xs text-red-600 mt-1">{formErrors.points_multiplier}</p>}
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-semibold mt-8">
                <input
                  type="checkbox"
                  checked={promotionForm.stackable}
                  onChange={(e) => setPromotionField('stackable', e.target.checked)}
                  className="h-4 w-4"
                />
                Có thể cộng dồn với khuyến mãi khác
              </label>
            </div>
          )}
        </div>

        {/* === SECTION: PHẠM VI ÁP DỤNG === */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">{t('admin.promotions.stepScope')}</h4>

          {isShippingVoucher && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-600 text-[18px]">info</span>
              <p className="text-sm text-teal-800 font-medium">🚚 Voucher vận chuyển thường áp dụng toàn hệ thống. Chỉ chọn phạm vi khác nếu cần giới hạn theo chi nhánh.</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-bold mb-2">Phạm vi áp dụng *</label>
            <select
              value={promotionForm.scope}
              onChange={(e) => setPromotionField('scope', e.target.value as CampaignScope)}
              className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
            >
              <option value="all">Toàn hệ thống</option>
              {!isShippingVoucher && <option value="product">Sản phẩm cụ thể</option>}
              {!isShippingVoucher && <option value="category">Danh mục</option>}
              <option value="branch">Chi nhánh</option>
            </select>
            {formErrors.scope && <p className="text-xs text-red-600 mt-1">{formErrors.scope}</p>}
          </div>

          {optionLoading && <p className="text-sm text-secondary">Đang tải bộ chọn...</p>}

          {!optionLoading && promotionForm.scope === 'product' && (
            <SearchableMultiSelect
              title="Chọn sản phẩm áp dụng"
              options={productOptions}
              selected={promotionForm.target_product_ids}
              searchText={searchProduct}
              onSearchChange={setSearchProduct}
              onToggle={(id) => toggleIdInField('target_product_ids', id)}
              emptyLabel="Không tìm thấy sản phẩm"
            />
          )}

          {!optionLoading && promotionForm.scope === 'category' && (
            <SearchableMultiSelect
              title="Chọn danh mục áp dụng"
              options={categoryOptions}
              selected={promotionForm.target_category_ids}
              searchText={searchCategory}
              onSearchChange={setSearchCategory}
              onToggle={(id) => toggleIdInField('target_category_ids', id)}
              emptyLabel="Không tìm thấy danh mục"
            />
          )}

          {!optionLoading && promotionForm.scope === 'branch' && (
            <SearchableMultiSelect
              title="Chọn chi nhánh áp dụng"
              options={branchOptions}
              selected={promotionForm.target_branch_ids}
              searchText={searchBranch}
              onSearchChange={setSearchBranch}
              onToggle={(id) => toggleIdInField('target_branch_ids', id)}
              emptyLabel="Không tìm thấy chi nhánh"
            />
          )}

          {promotionForm.scope !== 'all' && (
            <details className="rounded-xl border border-slate-200 p-4 bg-surface-container-lowest">
              <summary className="cursor-pointer text-sm font-bold">Fallback nhập ID thủ công</summary>
              <p className="text-xs text-secondary mt-2">Dùng khi chưa có dữ liệu picker đầy đủ. Cách nhau bởi dấu phẩy.</p>
              <textarea
                value={promotionForm.manualTargetIds}
                onChange={(e) => setPromotionField('manualTargetIds', e.target.value)}
                className="mt-3 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                rows={3}
                placeholder="VD: 67f4..., 67f5..."
              />
            </details>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!optionLoading && (
              <SearchableMultiSelect
                title="Loại trừ sản phẩm"
                options={productOptions}
                selected={promotionForm.excluded_product_ids}
                searchText={searchProduct}
                onSearchChange={setSearchProduct}
                onToggle={(id) => toggleIdInField('excluded_product_ids', id)}
                emptyLabel="Không có dữ liệu"
              />
            )}
            {!optionLoading && (
              <SearchableMultiSelect
                title="Loại trừ danh mục"
                options={categoryOptions}
                selected={promotionForm.excluded_category_ids}
                searchText={searchCategory}
                onSearchChange={setSearchCategory}
                onToggle={(id) => toggleIdInField('excluded_category_ids', id)}
                emptyLabel="Không có dữ liệu"
              />
            )}
          </div>

          <details className="rounded-xl border border-slate-200 p-4 bg-surface-container-lowest">
            <summary className="cursor-pointer text-sm font-bold">Fallback nhập ID loại trừ thủ công</summary>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <textarea
                value={promotionForm.manualExcludedProductIds}
                onChange={(e) => setPromotionField('manualExcludedProductIds', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                rows={3}
                placeholder="Product IDs"
              />
              <textarea
                value={promotionForm.manualExcludedCategoryIds}
                onChange={(e) => setPromotionField('manualExcludedCategoryIds', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                rows={3}
                placeholder="Category IDs"
              />
            </div>
          </details>
        </div>

        {/* === SECTION: GIỚI HẠN & HIỆU LỰC === */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">{t('admin.promotions.stepLimits')}</h4>

          {/* Core limits - always visible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Tổng lượt phát hành</label>
              <input
                type="number"
                value={promotionForm.total_quantity}
                onChange={(e) => setPromotionField('total_quantity', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
                placeholder="Để trống nếu không giới hạn"
              />
              {formErrors.total_quantity && <p className="text-xs text-red-600 mt-1">{formErrors.total_quantity}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Giới hạn mỗi user</label>
              <input
                type="number"
                value={promotionForm.usage_per_user}
                onChange={(e) => setPromotionField('usage_per_user', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              />
              {formErrors.usage_per_user && <p className="text-xs text-red-600 mt-1">{formErrors.usage_per_user}</p>}
            </div>
          </div>

          {/* Time range - always visible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Bắt đầu</label>
              <input
                type="datetime-local"
                value={promotionForm.start_date}
                onChange={(e) => setPromotionField('start_date', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Kết thúc</label>
              <input
                type="datetime-local"
                value={promotionForm.end_date}
                onChange={(e) => setPromotionField('end_date', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
              />
              {formErrors.end_date && <p className="text-xs text-red-600 mt-1">{formErrors.end_date}</p>}
            </div>
          </div>

          {/* Coupon code - only for coupon recordType */}
          {isCoupon && (
            <div>
              <label className="block text-sm font-bold mb-2">Mã coupon</label>
              <input
                value={promotionForm.code}
                onChange={(e) => setPromotionField('code', e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
                placeholder="Để trống để auto-generate"
              />
              {formErrors.code && <p className="text-xs text-red-600 mt-1">{formErrors.code}</p>}
            </div>
          )}

          {/* Toggles row */}
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={promotionForm.claim_campaign}
                onChange={(e) => setPromotionField('claim_campaign', e.target.checked)}
                className="h-4 w-4"
              />
              Yêu cầu nhận (Claim)
            </label>
            {!isShippingVoucher && (
              <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={promotionForm.stackable}
                  onChange={(e) => setPromotionField('stackable', e.target.checked)}
                  className="h-4 w-4"
                />
                Cộng dồn (Stackable)
              </label>
            )}
            <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={promotionForm.is_active}
                onChange={(e) => setPromotionField('is_active', e.target.checked)}
                className="h-4 w-4"
              />
              Kích hoạt ngay
            </label>
          </div>

          {/* Advanced settings - collapsed by default */}
          <details className="rounded-xl border border-slate-200 p-4 bg-surface-container-lowest">
            <summary className="cursor-pointer text-sm font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">tune</span>
              Cài đặt nâng cao
            </summary>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Priority</label>
                <input
                  type="number"
                  value={promotionForm.priority}
                  onChange={(e) => setPromotionField('priority', e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Max redemptions</label>
                <input
                  type="number"
                  value={promotionForm.max_redemptions}
                  onChange={(e) => setPromotionField('max_redemptions', e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
                  placeholder="Để trống = không giới hạn"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Ẩn sau hết hạn (giờ)</label>
                <input
                  type="number"
                  value={promotionForm.hide_after_expired_hours}
                  onChange={(e) => setPromotionField('hide_after_expired_hours', e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl"
                />
              </div>
               <div>
                 <label className="block text-sm font-bold mb-2">{t('admin.promotions.badgeText')}</label>
                 <input value={promotionForm.badge_text} onChange={(e) => setPromotionField('badge_text', e.target.value)} className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl" placeholder="HOT / FLASH SALE" />
               </div>
               <div>
                 <label className="block text-sm font-bold mb-2">{t('admin.promotions.targetUrl')}</label>
                 <input value={promotionForm.banner_url} onChange={(e) => setPromotionField('banner_url', e.target.value)} className="w-full px-4 py-3 bg-surface border border-slate-200 rounded-xl" placeholder="/promotions" />
               </div>
            </div>
          </details>
        </div>

        {/* === SECTION: XEM TRƯỚC === */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 mt-4">
          <h4 className="font-bold text-xl text-primary">{t('admin.promotions.stepPreview')}</h4>
          <CampaignPreview
            form={promotionForm}
            sampleOrderAmount={sampleOrderAmount}
            onSampleChange={setSampleOrderAmount}
          />
        </div>
      </div>
    );
  };`;

const startIndex = content.indexOf('  const renderPromotionStepContent = () => {');
const endIndex = content.indexOf('  const renderBasicForm = () => (');

if (startIndex !== -1 && endIndex !== -1) {
    content = content.substring(0, startIndex) + replacement + '\n\n' + content.substring(endIndex);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully replaced renderPromotionStepContent');
} else {
    console.error('Could not find start or end index');
}
