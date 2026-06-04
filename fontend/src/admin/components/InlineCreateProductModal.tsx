import React, { useState, useEffect } from 'react';
import { Modal, FormField, cls } from './AdminUI';
import { useTranslation } from 'react-i18next';
import { productService } from '../../services/productService';
import { dataService } from '../../services/dataService';
import { enterpriseService } from '../services/enterpriseService';
import { toast } from '../../components/Toast/toastEvent';

interface InlineCreateProductModalProps {
  open: boolean;
  onClose: () => void;
  branchId: string;
  branchName?: string;
  defaultSupplierId?: string;
  onSuccess: (newBranchProductId: string, newProductPrice: number) => void;
  suppliers?: any[];
}

export const InlineCreateProductModal: React.FC<InlineCreateProductModalProps> = ({
  open,
  onClose,
  branchId,
  branchName,
  defaultSupplierId,
  onSuccess,
  suppliers: propsSuppliers
}) => {
  const { t } = useTranslation();
  
  const [submitting, setSubmitting] = useState(false);
  const [localSuppliers, setLocalSuppliers] = useState<any[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [supplierError, setSupplierError] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  
  // Form fields (Basic Info)
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [unit, setUnit] = useState('cái');
  const [shortDescription, setShortDescription] = useState('');
  
  // Images
  const [images, setImages] = useState<string[]>([]);
  const [thumbnail, setThumbnail] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  // Pricing
  const [importPrice, setImportPrice] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');

  useEffect(() => {
    if (open) {
      // Reset form fields
      setName('');
      setSku('');
      setBarcode('');
      setCategoryId('');
      setBrand('');
      setUnit('cái');
      setShortDescription('');
      setImages([]);
      setThumbnail('');
      setImportPrice('');
      setSalePrice('');

      // Load data
      dataService.getCategories().then(setCategories).catch(() => {});
      setLoadingSuppliers(true);
      setSupplierError(false);
      const loadSuppliersData = async () => {
        try {
          if (propsSuppliers && propsSuppliers.length > 0) {
            setLocalSuppliers(propsSuppliers);
            setLoadingSuppliers(false);
            return;
          }
          const res = await enterpriseService.getSuppliers({ is_active: true, limit: 200 });
          setLocalSuppliers(res.data || []);
        } catch (err) {
          console.error('Failed to load suppliers in InlineCreateProductModal:', err);
          setSupplierError(true);
        } finally {
          setLoadingSuppliers(false);
        }
      };
      loadSuppliersData();



    }
  }, [open, defaultSupplierId, propsSuppliers]);

  const resolvedSuppliers = propsSuppliers && propsSuppliers.length > 0 ? propsSuppliers : localSuppliers;
  const resolvedSupplierId = defaultSupplierId || selectedSupplierId;
  const supplierName = resolvedSuppliers.find(s => String(s._id || s.id) === resolvedSupplierId)?.name || '';

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (images.length + files.length > 5) {
      toast.error(t('adminProducts.modalImagesUploadLimitError') || 'Tối đa 5 ảnh cho mỗi sản phẩm');
      return;
    }
    try {
      setUploadingImages(true);
      const filesArray: File[] = [];
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > 5 * 1024 * 1024) {
          toast.error(t('adminProducts.modalImagesSizeError', { name: files[i].name }) || `Ảnh "${files[i].name}" vượt quá 5MB`);
          continue;
        }
        filesArray.push(files[i]);
      }
      if (filesArray.length === 0) return;
      const urls = await productService.uploadProductImages(filesArray);
      if (urls.length > 0) {
        const newImages = [...images, ...urls];
        setImages(newImages);
        if (!thumbnail) setThumbnail(newImages[0] || '');
        toast.success(t('adminProducts.modalImagesSuccess', { count: urls.length }) || `Đã tải lên ${urls.length} ảnh thành công`);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err: any) {
      toast.error(err.message || t('adminProducts.modalImagesError') || 'Lỗi tải ảnh lên');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const url = window.prompt(t('adminProducts.modalImagesAddUrl') || 'Nhập URL hình ảnh:');
    if (!url || !url.trim()) return;
    if (images.length >= 5) {
      toast.error(t('adminProducts.modalImagesUploadLimitError') || 'Tối đa 5 ảnh');
      return;
    }
    const newImages = [...images, url.trim()];
    setImages(newImages);
    if (!thumbnail) setThumbnail(newImages[0] || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) return toast.error(t('importOrders.errorSelectBranch'));
    if (!name.trim()) return toast.error(t('importOrders.errorEmptyName'));
    if (!categoryId) return toast.error(t('importOrders.errorSelectCategory'));
    if (!resolvedSupplierId) return toast.error(t('importOrders.errorSelectSupplier'));
    
    if (Number(importPrice) < 0 || Number(salePrice) < 0) {
      return toast.error(t('importOrders.errorNegativePrice'));
    }

    try {
      setSubmitting(true);

      const categoryName = categories.find(c => String(c._id || c.id) === categoryId)?.name || '';
      const resolvedSku = sku.trim() || `SKU-${Date.now().toString(36).toUpperCase()}`;

      // Create Product globally
      const createdProduct = await productService.createProduct({
        name: name.trim(),
        sku: resolvedSku,
        barcode: barcode.trim() || undefined,
        category_id: categoryId,
        category_name: categoryName,
        supplier_id: resolvedSupplierId,
        supplier_name: supplierName,
        brand: brand.trim() || undefined,
        import_price: Number(importPrice) || 0,
        original_price: Number(salePrice) || 0,
        price: Number(salePrice) || 0,
        unit: unit.trim() || 'cái',
        short_description: shortDescription.trim() || undefined,
        images: images.filter(Boolean),
        gallery: images.filter(Boolean),
        thumbnail: thumbnail || images[0] || '',
        is_active: true,
        is_featured: false,
        is_best_seller: false,
        is_new: false,
        stock: 0,
      });
      
      const targetProductId = createdProduct.id || createdProduct._id;
      if (!targetProductId) {
        return toast.error(t('importOrders.errorCreate'));
      }

      const newBp = await productService.createBranchProduct({
        product_id: targetProductId,
        branch_id: branchId,
        price: Number(salePrice) || 0,
        original_price: Number(salePrice) || 0,
        discount_percent: 0,
        stock: 0,
        min_stock: 0,
        is_available: true,
        sku: resolvedSku,
        master_id: targetProductId,
        category_id: categoryId,
        category_name: categoryName,
        supplier_id: resolvedSupplierId,
        supplier_name: supplierName,
        import_price: Number(importPrice) || 0,
      });

      const newBpId = newBp?.id || newBp?._id;
      if (!newBpId) {
        return toast.error(t('importOrders.errorCreate'));
      }
      
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
    : '0';

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
          <button type="submit" form="inline-create-product-form" disabled={submitting} className={cls.btnPrimary}>
            {submitting && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
            {t('importOrders.createBtn')}
          </button>
        </>
      }
    >
      <form id="inline-create-product-form" onSubmit={handleSave} className="space-y-4">
        {/* Locked Context Card */}
        <div className="bg-slate-50 dark:bg-slate-800/55 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="material-symbols-outlined text-primary text-[18px]">store</span>
            <span className="font-semibold">
              {t('adminProducts.modalBranchLabel') || 'Chi nhánh'}: <b className="text-slate-800 dark:text-white">{branchName || branchId}</b>
            </span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="material-symbols-outlined text-primary text-[18px]">local_shipping</span>
            <span className="font-semibold">
              {t('importOrders.supplier') || 'Nhà cung cấp'}: <b className="text-slate-800 dark:text-white">
                {supplierName 
                  ? supplierName 
                  : loadingSuppliers 
                    ? (t('importOrders.loadingProducts') || 'Đang tải...') 
                    : supplierError 
                      ? 'Lỗi tải nhà cung cấp' 
                      : defaultSupplierId 
                        ? `ID: ${defaultSupplierId}` 
                        : 'Chưa chọn'}
              </b>
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Basic Info & Description */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                {t('importOrders.basicInfo') || 'Thông tin cơ bản'}
              </h4>
              
              <FormField label={t('adminProducts.productName') || 'Tên sản phẩm'} required>
                <input
                  type="text"
                  className={cls.input}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('adminProducts.modalProductNamePlaceholder') || 'Nhập tên sản phẩm...'}
                  required
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('adminProducts.modalCategoryLabel') || 'Danh mục'} required>
                  <select
                    className={cls.select + ' w-full'}
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    required
                  >
                    <option value="">{t('adminProducts.modalCategorySelect') || '-- Chọn danh mục --'}</option>
                    {categories.map((c: any) => (
                      <option key={String(c._id || c.id)} value={String(c._id || c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label={t('adminProducts.modalBrandLabel') || 'Thương hiệu'}>
                  <input
                    type="text"
                    className={cls.input}
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    placeholder="Unilever, Pepsi, Vinamilk..."
                  />
                </FormField>
              </div>

              {!defaultSupplierId && (
                <FormField label={t('importOrders.supplier') || 'Nhà cung cấp'} required>
                  {loadingSuppliers ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      <span>{t('importOrders.loadingProducts') || 'Đang tải...'}</span>
                    </div>
                  ) : supplierError ? (
                    <div className="text-xs text-rose-500 py-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      <span>Lỗi tải nhà cung cấp. Vui lòng đóng và mở lại modal.</span>
                    </div>
                  ) : resolvedSuppliers.length === 0 ? (
                    <div className="text-xs text-slate-500 py-2">
                      Không có nhà cung cấp phù hợp
                    </div>
                  ) : (
                    <select
                      className={cls.select + ' w-full'}
                      value={selectedSupplierId}
                      onChange={e => setSelectedSupplierId(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn nhà cung cấp --</option>
                      {resolvedSuppliers.map((s: any) => (
                        <option key={String(s._id || s.id)} value={String(s._id || s.id)}>
                          {s.name} {s.code ? `(${s.code})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </FormField>
              )}

              <FormField label={t('adminProducts.modalShortDescLabel') || 'Mô tả ngắn'}>
                <textarea
                  className={cls.input + ' min-h-[90px] resize-none'}
                  value={shortDescription}
                  onChange={e => setShortDescription(e.target.value)}
                  placeholder="Nhập mô tả ngắn cho sản phẩm..."
                />
              </FormField>
            </div>

            {/* Right Column: Identifiers, Logistics & Pricing */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                Định danh & Giá bán
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('adminProducts.modalSkuLabel') || 'Mã SKU'}>
                  <input
                    type="text"
                    className={cls.input}
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    placeholder="Auto-generate"
                  />
                </FormField>

                <FormField label={t('adminProducts.modalBarcodeLabel') || 'Barcode'}>
                  <input
                    type="text"
                    className={cls.input}
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    placeholder="893..."
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('adminProducts.modalUnitLabel') || 'Đơn vị'} required>
                  <input
                    type="text"
                    className={cls.input}
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="cái, lon, chai..."
                    required
                  />
                </FormField>

                <FormField label={t('adminProducts.modalImportPriceLabel') || 'Giá nhập (VNĐ)'} required>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      className={cls.input + ' pr-12 font-bold text-amber-600'}
                      value={importPrice}
                      onChange={e => setImportPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">VNĐ</span>
                  </div>
                </FormField>
              </div>

              <FormField label={t('adminProducts.modalPriceLabel') || 'Giá bán (VNĐ)'} required>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    className={cls.input + ' pr-12 font-bold text-primary'}
                    value={salePrice}
                    onChange={e => setSalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">VNĐ</span>
                </div>
              </FormField>

              {/* Profit Margin */}
              {importPrice !== '' && salePrice !== '' && Number(salePrice) > 0 && (
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Biên lợi nhuận gộp (Profit Margin):</span>
                  <span className={`font-black px-2.5 py-1 rounded-lg ${Number(profitMargin) >= 20 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50' : Number(profitMargin) > 0 ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50' : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50'}`}>
                    {profitMargin}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Image Upload section */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className={cls.label + ' !mb-0'}>
                {t('adminProducts.modalImagesLabel', { count: images.length }) || `Hình ảnh sản phẩm (${images.length}/5)`}
              </label>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/95 transition-all cursor-pointer shadow-sm active:scale-[0.98]">
                  <span className="material-symbols-outlined text-[14px]">upload</span>
                  {t('adminProducts.modalImagesUpload') || 'Tải ảnh lên'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleUploadImages}
                    disabled={uploadingImages}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[14px]">link</span>
                  {t('adminProducts.modalImagesAddUrl') || 'Thêm URL'}
                </button>
              </div>
            </div>

            {uploadingImages && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-2">
                <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                <span>Đang tải lên hình ảnh...</span>
              </div>
            )}

            {images.length > 0 ? (
              <div className="grid grid-cols-5 gap-3">
                {images.map((imgUrl, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/50">
                    <img
                      src={imgUrl}
                      alt={`Ảnh ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {thumbnail === imgUrl && (
                      <span className="absolute top-1.5 left-1.5 bg-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow">THUMB</span>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                      {thumbnail !== imgUrl && (
                        <button
                          type="button"
                          onClick={() => setThumbnail(imgUrl)}
                          className="w-6.5 h-6.5 bg-white/90 rounded-full flex items-center justify-center text-primary hover:bg-white transition-colors"
                          title={t('adminProducts.setThumbnail') || 'Đặt làm ảnh đại diện'}
                        >
                          <span className="material-symbols-outlined text-[14px]">star</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const newImages = images.filter((_, i) => i !== idx);
                          setImages(newImages);
                          if (thumbnail === imgUrl) {
                            setThumbnail(newImages[0] || '');
                          }
                        }}
                        className="w-6.5 h-6.5 bg-red-500/90 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                        title={t('adminProducts.deleteImage') || 'Xóa'}
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4 text-center">
                <span className="material-symbols-outlined text-2xl text-slate-300 dark:text-slate-600 mb-1.5 block">add_photo_alternate</span>
                <p className="text-xs text-slate-400 font-bold">
                  {t('adminProducts.noImages') || 'Chưa có ảnh — tải lên hoặc thêm URL ở trên'}
                </p>
              </div>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
