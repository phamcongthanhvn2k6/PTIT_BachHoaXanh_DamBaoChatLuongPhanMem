import React, { useState, useEffect } from 'react';
import { Modal, FormSection, FormField, cls } from './AdminUI';
import { useTranslation } from 'react-i18next';
import { productService } from '../../services/productService';
import { dataService } from '../../services/dataService';
import { toast } from '../../components/Toast/toastEvent';

interface InlineCreateProductModalProps {
  open: boolean;
  onClose: () => void;
  branchId: string;
  branchName?: string;
  defaultSupplierId?: string;
  onSuccess: (newBranchProductId: string, newProductPrice: number) => void;
}

export const InlineCreateProductModal: React.FC<InlineCreateProductModalProps> = ({
  open,
  onClose,
  branchId,
  branchName,
  defaultSupplierId,
  onSuccess
}) => {
  const { t } = useTranslation();
  
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'create' | 'link'>('create');
  
  // Data sources
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [globalProducts, setGlobalProducts] = useState<any[]>([]);
  
  // Form fields (Basic Info)
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState(defaultSupplierId || '');
  const [brand, setBrand] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  
  // Pricing
  const [importPrice, setImportPrice] = useState<number | ''>('');
  const [originalPrice, setOriginalPrice] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');
  
  // Inventory & Linking
  const [selectedGlobalProductId, setSelectedGlobalProductId] = useState('');
  const [initialStock, setInitialStock] = useState<number | ''>(0);
  const [minStock, setMinStock] = useState<number | ''>(0);
  
  // Dates
  const [manufactureDate, setManufactureDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  
  // Display/Status
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  // Media (Mocking upload for UI simplicity, as real upload depends on specific endpoint)
  const [thumbnail, setThumbnail] = useState('');
  const [imagesText, setImagesText] = useState('');
  
  // Optional
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState('cái');
  const [storageCondition, setStorageCondition] = useState('');

  useEffect(() => {
    if (open) {
      dataService.getCategories().then(setCategories).catch(() => {});
      // Assuming suppliers are already fetched in parent, but we can refetch or pass them. 
      // For standalone nature, let's fetch them:
      import('../services/enterpriseService').then((module) => {
        module.default.getSuppliers({ is_active: true, limit: 200 })
          .then(res => setSuppliers(res.data || []))
          .catch(() => {});
      });
      productService.getProducts().then(res => setGlobalProducts(res.data || [])).catch(() => {});
      
      // Reset defaults
      setSupplierId(defaultSupplierId || '');
    }
  }, [open, defaultSupplierId]);

  const handleGlobalProductSelect = (pid: string) => {
    setSelectedGlobalProductId(pid);
    const p = globalProducts.find(x => String(x.id || x._id) === pid);
    if (p) {
      setName(p.name || '');
      setSku(p.sku || '');
      setBarcode(p.barcode || '');
      setCategoryId(p.category_id || '');
      setSupplierId(p.supplier_id || defaultSupplierId || '');
      setBrand(p.brand || '');
      setImportPrice(p.import_price || 0);
      setOriginalPrice(p.original_price || p.price || 0);
      setSalePrice(p.price || 0);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) return toast.error(t('importOrders.errorSelectBranch'));
    
    if (mode === 'create') {
      if (!name.trim()) return toast.error(t('importOrders.errorEmptyName'));
      if (!categoryId) return toast.error(t('importOrders.errorSelectCategory'));
      if (!supplierId) return toast.error(t('importOrders.errorSelectSupplier'));
      if (Number(importPrice) < 0 || Number(originalPrice) < 0 || Number(salePrice) < 0) {
        return toast.error(t('importOrders.errorNegativePrice'));
      }
      if (Number(initialStock) < 0) return toast.error(t('importOrders.errorNegativeStock'));
      if (expirationDate && manufactureDate && new Date(expirationDate) < new Date(manufactureDate)) {
        return toast.error(t('importOrders.errorExpiryBeforeManufacture'));
      }
    }

    try {
      setSubmitting(true);
      let targetProductId = selectedGlobalProductId;
      
      if (mode === 'create') {
        // Check for duplicate SKU manually if needed
        if (sku.trim() && globalProducts.some(p => p.sku === sku.trim())) {
          return toast.error(t('importOrders.errorDuplicateSku'));
        }

        const supplierName = suppliers.find(s => String(s._id) === supplierId)?.name || '';
        const categoryName = categories.find(c => String(c._id || c.id) === categoryId)?.name || '';
        
        const createdProduct = await productService.createProduct({
          name,
          sku: sku || undefined,
          barcode,
          category_id: categoryId,
          category_name: categoryName,
          supplier_id: supplierId,
          supplier_name: supplierName,
          brand,
          short_description: shortDesc,
          import_price: Number(importPrice) || 0,
          original_price: Number(originalPrice) || 0,
          price: Number(salePrice) || 0,
          manufacture_date: manufactureDate ? new Date(manufactureDate).toISOString() : undefined,
          expiry_date: expirationDate ? new Date(expirationDate).toISOString() : undefined,
          is_featured: isFeatured,
          is_best_seller: isBestSeller,
          is_new: isNew,
          is_active: isActive,
          thumbnail,
          images: imagesText.split(',').map(s => s.trim()).filter(Boolean),
          weight,
          unit,
          storage_instructions: storageCondition,
        });
        
        targetProductId = createdProduct.id || createdProduct._id;
      }
      
      if (!targetProductId) {
        return toast.error(t('importOrders.errorMissingLinkedProduct'));
      }

      // Branch mapping
      const newBp = await productService.createBranchProduct({
        product_id: targetProductId,
        branch_id: branchId,
        price: Number(salePrice) || 0,
        original_price: Number(originalPrice) || 0,
        stock: Number(initialStock) || 0,
        min_stock: Number(minStock) || 0,
        is_available: isActive
      });

      const newBpId = newBp?.id || newBp?._id;
      
      toast.success(t('importOrders.successCreate'));
      onSuccess(newBpId, Number(importPrice) || Number(salePrice) || 0);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || t('importOrders.errorCreate'));
    } finally {
      setSubmitting(false);
    }
  };

  const profitMargin = Number(importPrice) && Number(salePrice)
    ? (((Number(salePrice) - Number(importPrice)) / Number(salePrice)) * 100).toFixed(1)
    : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('importOrders.createProductTitle')}
      subtitle={t('importOrders.createProductSubtitle')}
      icon="inventory_2"
      size="xl"
      footer={
        <>
          <button type="button" onClick={onClose} className={cls.btnSecondary}>{t('common.cancel') || 'Hủy'}</button>
          <button type="submit" form="full-inline-create-form" disabled={submitting} className={cls.btnPrimary}>
            {submitting && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
            {mode === 'create' ? t('importOrders.createBtn') : t('importOrders.linkAndAdd')}
          </button>
        </>
      }
    >
      <form id="full-inline-create-form" onSubmit={handleSave} className="space-y-6">

        {branchId && (
          <div className="text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl px-3 py-2">
            {t('importOrders.branchAppliedLabel', { branch: branchName || branchId })}
          </div>
        )}
        
        {/* Mode switch */}
        <div className="flex p-1 bg-slate-100 rounded-xl max-w-sm mb-6">
          <button type="button" onClick={() => setMode('create')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${mode === 'create' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t('importOrders.modeCreateNew')}
          </button>
          <button type="button" onClick={() => setMode('link')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${mode === 'link' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t('importOrders.modeLinkExisting')}
          </button>
        </div>

        {mode === 'link' && (
          <FormSection title="Sản phẩm hệ thống">
            <FormField label="Chọn sản phẩm" required>
              <select className={cls.select + ' w-full'} value={selectedGlobalProductId} onChange={(e) => handleGlobalProductSelect(e.target.value)}>
                <option value="">-- Chọn sản phẩm --</option>
                {globalProducts.map(p => (
                  <option key={String(p._id || p.id)} value={String(p._id || p.id)}>{p.sku ? `[${p.sku}] ` : ''}{p.name}</option>
                ))}
              </select>
            </FormField>
          </FormSection>
        )}

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${mode === 'link' && !selectedGlobalProductId ? 'opacity-50 pointer-events-none' : ''}`}>
          
          {/* Cột 1 */}
          <div className="space-y-6">
            <FormSection title="Thông tin cơ bản">
              <FormField label="Tên sản phẩm" required>
                <input className={cls.input} value={name} onChange={e => setName(e.target.value)} disabled={mode === 'link'} />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="SKU">
                  <input className={cls.input} value={sku} onChange={e => setSku(e.target.value)} disabled={mode === 'link'} placeholder="Auto generate nếu trống" />
                </FormField>
                <FormField label="Barcode / Lô">
                  <input className={cls.input} value={barcode} onChange={e => setBarcode(e.target.value)} disabled={mode === 'link'} />
                </FormField>
              </div>
              <FormField label="Danh mục" required>
                <select className={cls.select + ' w-full'} value={categoryId} onChange={e => setCategoryId(e.target.value)} disabled={mode === 'link'}>
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((c: any) => <option key={String(c._id || c.id)} value={String(c._id || c.id)}>{c.name}</option>)}
                </select>
              </FormField>
              <FormField label="Nhà cung cấp" required>
                <select className={cls.select + ' w-full'} value={supplierId} onChange={e => setSupplierId(e.target.value)} disabled={mode === 'link'}>
                  <option value="">-- Chọn nhà cung cấp --</option>
                  {suppliers.map((s: any) => <option key={String(s._id)} value={String(s._id)}>{s.name}</option>)}
                </select>
              </FormField>
              <FormField label="Thương hiệu">
                <input className={cls.input} value={brand} onChange={e => setBrand(e.target.value)} disabled={mode === 'link'} />
              </FormField>
              <FormField label="Mô tả ngắn">
                <textarea className={cls.input} value={shortDesc} onChange={e => setShortDesc(e.target.value)} disabled={mode === 'link'} rows={2}></textarea>
              </FormField>
            </FormSection>

            <FormSection title="Hiển thị & Sales">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 border-slate-300" /> Kích hoạt
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="rounded text-amber-600 focus:ring-amber-500 border-slate-300" disabled={mode === 'link'} /> Nổi bật
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={isBestSeller} onChange={e => setIsBestSeller(e.target.checked)} className="rounded text-red-600 focus:ring-red-500 border-slate-300" disabled={mode === 'link'} /> Bán chạy
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={isNew} onChange={e => setIsNew(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300" disabled={mode === 'link'} /> Mới
                </label>
              </div>
            </FormSection>
          </div>

          {/* Cột 2 */}
          <div className="space-y-6">
            <FormSection title="Giá & Lợi nhuận">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Giá nhập (đ)" required>
                  <input type="number" min={0} className={cls.input} value={importPrice} onChange={e => setImportPrice(Number(e.target.value))} />
                </FormField>
                <FormField label="Giá niêm yết (đ)">
                  <input type="number" min={0} className={cls.input} value={originalPrice} onChange={e => setOriginalPrice(Number(e.target.value))} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Giá bán (đ)" required>
                  <input type="number" min={0} className={cls.input} value={salePrice} onChange={e => setSalePrice(Number(e.target.value))} />
                </FormField>
                <FormField label="Biên lợi nhuận">
                  <div className={`h-10 rounded-xl flex items-center px-4 font-bold ${Number(profitMargin) > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {profitMargin}%
                  </div>
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Tồn kho chi nhánh">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Tồn kho ban đầu" required>
                  <input type="number" min={0} className={cls.input} value={initialStock} onChange={e => setInitialStock(Number(e.target.value))} />
                </FormField>
                <FormField label="Mức cảnh báo tồn">
                  <input type="number" min={0} className={cls.input} value={minStock} onChange={e => setMinStock(Number(e.target.value))} />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Ngày tháng (Tuỳ chọn)">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Ngày sản xuất">
                  <input type="date" className={cls.input} value={manufactureDate} onChange={e => setManufactureDate(e.target.value)} disabled={mode === 'link'} />
                </FormField>
                <FormField label="Ngày hết hạn">
                  <input type="date" className={cls.input} value={expirationDate} onChange={e => setExpirationDate(e.target.value)} disabled={mode === 'link'} />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Media & Tuỳ chọn khác">
              <FormField label="URL Ảnh Thumbnail">
                <input className={cls.input} value={thumbnail} onChange={e => setThumbnail(e.target.value)} disabled={mode === 'link'} />
              </FormField>
              <FormField label="URL Các ảnh khác (cách nhau bởi dấu phẩy)">
                <input className={cls.input} value={imagesText} onChange={e => setImagesText(e.target.value)} disabled={mode === 'link'} />
              </FormField>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <FormField label="Đơn vị">
                  <input className={cls.input} value={unit} onChange={e => setUnit(e.target.value)} disabled={mode === 'link'} />
                </FormField>
                <FormField label="Trọng lượng">
                  <input className={cls.input} value={weight} onChange={e => setWeight(e.target.value)} disabled={mode === 'link'} placeholder="VD: 500g" />
                </FormField>
                <FormField label="Điều kiện BC">
                  <input className={cls.input} value={storageCondition} onChange={e => setStorageCondition(e.target.value)} disabled={mode === 'link'} placeholder="Nhiệt độ..." />
                </FormField>
              </div>
            </FormSection>
          </div>
          
        </div>
      </form>
    </Modal>
  );
};
