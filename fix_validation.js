const fs = require('fs');
const filePath = 'c:\\\\Users\\\\LE THANH CUONG\\\\OneDrive\\\\Desktop\\\\Lotte_Mart_Project\\\\fontend\\\\src\\\\admin\\\\pages\\\\AdminCouponsManagement.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /  const validatePromotionStep = \(step: number\): boolean => \{[\s\S]*?  const prevStep = \(\) => \{\n    setCurrentStep\(\(prev\) => Math\.max\(prev - 1, 0\)\);\n  \};\n/m;

const replacement = `  const validateFullPromotionForm = (): boolean => {
    const errors: Record<string, string> = {};

    const mergedTargetIds = uniqueIds([
      ...(promotionForm.scope === 'product' ? promotionForm.target_product_ids : []),
      ...(promotionForm.scope === 'category' ? promotionForm.target_category_ids : []),
      ...(promotionForm.scope === 'branch' ? promotionForm.target_branch_ids : []),
      ...parseCsvIds(promotionForm.manualTargetIds),
    ]);

    // Basic Info Validation
    if (!promotionForm.title.trim()) errors.title = 'Tên chiến dịch là bắt buộc';

    // Image is optional now, but kept rule if preferred. Removing the required image validation to align with fallback logic.
    // if (!promotionForm.imageUrl && !promotionForm.imagePreview) errors.image = 'Cần chọn ảnh chiến dịch';

    // Discount Rules Validation
    const validTypesPromotion = ['percent', 'fixed_amount', 'bogo', 'free_shipping', 'points_multiplier', 'gift_item', 'flash_deal'];
    const validTypesCoupon = ['percent', 'fixed_amount', 'free_shipping', 'points'];
    const validTypes = promotionForm.recordType === 'coupon' ? validTypesCoupon : validTypesPromotion;
    if (!validTypes.includes(promotionForm.type)) errors.type = 'Loại giảm không hợp lệ';

    if (promotionForm.type === 'bogo') {
      if (!(Number(promotionForm.min_quantity || 0) > 0)) errors.min_quantity = 'BOGO cần số lượng mua tối thiểu > 0';
      if (!(Number(promotionForm.gift_quantity || 0) > 0)) errors.gift_quantity = 'BOGO cần số lượng tặng > 0';
    }

    if ((promotionForm.type === 'percent' || promotionForm.type === 'fixed_amount' || promotionForm.type === 'flash_deal') && Number(promotionForm.discount_value || 0) <= 0) {
      errors.discount_value = 'Giá trị giảm phải > 0';
    }

    if (promotionForm.type === 'points_multiplier' && Number(promotionForm.points_multiplier || 1) <= 1) {
      errors.points_multiplier = 'Điểm x2 cần hệ số > 1';
    }

    // Scope Validation
    if (promotionForm.scope !== 'all' && mergedTargetIds.length === 0) {
      errors.scope = 'Phải chọn ít nhất 1 target theo phạm vi áp dụng';
    }

    // Limits Validation
    if (promotionForm.start_date && promotionForm.end_date) {
      const start = new Date(promotionForm.start_date).getTime();
      const end = new Date(promotionForm.end_date).getTime();
      if (start >= end) errors.end_date = 'Thời gian kết thúc phải sau thời gian bắt đầu';
    }

    if (promotionForm.total_quantity && Number(promotionForm.total_quantity) <= 0) {
      errors.total_quantity = 'Tổng lượt chiến dịch phải > 0';
    }

    if (promotionForm.usage_per_user && Number(promotionForm.usage_per_user) <= 0) {
      errors.usage_per_user = 'Giới hạn mỗi user phải > 0';
    }

    if (promotionForm.recordType === 'coupon' && promotionForm.code && !/^[A-Za-z0-9_-]+$/.test(promotionForm.code)) {
      errors.code = 'Mã coupon chỉ gồm chữ/số/_/-';
    }

    setFormErrors(errors);
    
    // If any error exists, scroll to top so user sees them
    if (Object.keys(errors).length > 0) {
      const modal = document.querySelector('.overflow-y-auto');
      if (modal) {
         modal.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return false;
    }
    
    return true;
  };
`;

if (content.match(regex)) {
  const newContent = content.replace(regex, replacement);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('Replaced successfully');
} else {
  console.log('Could not find regex match');
}
