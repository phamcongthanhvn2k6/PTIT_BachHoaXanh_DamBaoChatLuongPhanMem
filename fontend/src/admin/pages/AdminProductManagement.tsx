// src/admin/pages/AdminProductManagement.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from '../../components/Toast/toastEvent';
import { useAppSelector } from '../../store';
import { productService } from '../../services/productService';

type SortOption = 'newest' | 'stock-low' | 'best-seller' | 'price-high' | 'price-low';

const AdminProductManagement: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [activeSort, setActiveSort] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: 'category',
    parent_id: '',
    sort_order: 0,
    is_active: true,
  });

  // Modal state
  const [editItem, setEditItem] = useState<any | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Quick Filters
  const [quickFilter, setQuickFilter] = useState<'none' | 'low-stock' | 'promo' | 'new' | 'expiring'>('none');

  // Bulk Selection
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Branch filter (Admin) from global Redux
  const { adminBranchId: branchFilter } = useAppSelector(state => state.adminAuth);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bpRes, catRes] = await Promise.all([
         productService.getBranchProducts(),
         productService.getCategories({ include_inactive: true })
      ]);
      // Load suppliers and branches — use dynamic import to avoid circular deps
      import('../services/enterpriseService').then(m => {
         m.enterpriseService.getSuppliers({ limit: 1000 }).then(r => setSuppliers(r.data || []));
         m.enterpriseService.getBranches().then(r => setBranches(Array.isArray(r) ? r : []));
      });
      setItems((bpRes || []).filter((b: any) => b.product));
      if (catRes) setCategories(catRes);
     } catch {
       toast.error(t('adminProducts.toastProductLoadError'));
    } finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
  }, []);

  const specTemplates = [
    { name: t('adminProducts.templateFood'), labels: [t('adminProducts.brand'), t('adminProducts.origin'), t('adminProducts.weight'), t('adminProducts.standard'), t('adminProducts.features'), t('adminProducts.unit'), t('adminProducts.storage')] },
    { name: t('adminProducts.templateBeverage'), labels: [t('adminProducts.brand'), t('adminProducts.volume'), t('adminProducts.origin'), t('adminProducts.unit'), t('adminProducts.expiryDate')] },
    { name: t('adminProducts.templateHousehold'), labels: [t('adminProducts.brand'), t('adminProducts.weight'), t('adminProducts.material'), t('adminProducts.size'), t('adminProducts.unit')] },
    { name: t('adminProducts.templateCosmetics'), labels: [t('adminProducts.brand'), t('adminProducts.volume'), t('adminProducts.skinType'), t('adminProducts.origin'), t('adminProducts.expiryDate')] }
  ];

  const normalizeProductForEdit = (item: any) => {
    if (!item) return null;
    const clone = { ...item };
    
    // Normalize text fields
    clone.description = clone.description || clone.short_description || '';
    clone.usage_guide = clone.usage_guide || '';
    clone.storage_guide = clone.storage_guide || clone.storage_instructions || '';
    
    // Normalize arrays (convert from old comma-separated or keep as array)
    clone.highlights = Array.isArray(clone.highlights) ? clone.highlights : (clone.highlights ? String(clone.highlights).split('\n').map(s=>s.trim()).filter(Boolean) : []);
    clone.recipe_suggestions = Array.isArray(clone.recipe_suggestions) ? clone.recipe_suggestions : (clone.recipe_suggestions ? String(clone.recipe_suggestions).split('\n').map(s=>s.trim()).filter(Boolean) : []);
    clone.images = Array.isArray(clone.images) ? clone.images : (clone.images ? [clone.images] : []);
    
    // Normalize specifications (could be object map {} or array of {label, value})
    if (!clone.specifications) {
      clone.specifications = [];
    } else if (Array.isArray(clone.specifications)) {
      // already an array
    } else if (typeof clone.specifications === 'object') {
      // legacy object map: { 'Thương hiệu': 'Lotte', 'Khối lượng': '500g' }
      clone.specifications = Object.entries(clone.specifications).map(([label, value]) => ({ label, value }));
    } else {
      clone.specifications = [];
    }
    
    return clone;
  };

  const itemsPerPage = 8;

  const enrichedProducts: any[] = useMemo(() => {
    const pickText = (primary: any, fallback: any) => {
      if (primary !== undefined && primary !== null && String(primary).trim() !== '') return primary;
      return fallback ?? '';
    };
    const pickNumber = (primary: any, fallback: any) => {
      const primaryNum = Number(primary);
      const fallbackNum = Number(fallback);
      if (Number.isFinite(primaryNum) && primaryNum !== 0) return primaryNum;
      if (Number.isFinite(fallbackNum)) return fallbackNum;
      return 0;
    };

    return items.map((bp) => {
      const master = bp.product || {};
      // Merge: master first, then BP overrides, then computed fields
      const merged: any = {
         ...master,
         ...bp,
         master_id: master.id || master._id || bp.product_id,
         id: bp.id || bp._id,
         product_id: bp.product_id, // Keep original product_id for master updates
         is_active: bp.is_available ?? master.is_active ?? true,
         // Sync expiry_date for modal: prefer BP field, fallback to batch-enriched exp_date
         expiry_date: bp.expiry_date || bp.exp_date || master.expiry_date || null,
         manufacture_date: bp.manufacture_date || master.manufacture_date || null,
         // Ensure badge-related master fields are available
         is_featured: master.is_featured ?? false,
         is_best_seller: master.is_best_seller ?? false,
         is_new: master.is_new ?? false,
         brand: master.brand || '',
         barcode: master.barcode || '',
         short_description: master.short_description || '',
         thumbnail: master.thumbnail || '',
         images: Array.isArray(master.images) ? master.images : [],
         weight: master.weight || '',
         unit: master.unit || 'cái',
         storage_instructions: master.storage_instructions || '',
      };

      merged.sku = pickText(bp.sku, master.sku);
      merged.master_id = pickText(bp.master_id, master.master_id);
      merged.category_id = pickText(bp.category_id, master.category_id);
      merged.category_name = pickText(bp.category_name, master.category_name);
      merged.supplier_id = pickText(bp.supplier_id, master.supplier_id);
      merged.supplier_name = pickText(bp.supplier_name, master.supplier_name);
      merged.import_price = pickNumber(bp.import_price, master.import_price);

      // Merge expiry_warning_days from master (default 7)
      merged.expiry_warning_days = Number(master.expiry_warning_days ?? bp.expiry_warning_days ?? 7);

      // ── Compute expiry fields client-side ──────────────────────────────────
      const expiryDateRaw = merged.expiry_date;
      if (expiryDateRaw) {
        const expDate = new Date(expiryDateRaw);
        const now = new Date();
        const diffMs = expDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const warningDays = merged.expiry_warning_days;

        merged.days_until_expiry = diffDays;

        if (diffDays < 0) {
          merged.expiry_status = 'expired';
        } else if (diffDays <= Math.floor(warningDays / 2)) {
          merged.expiry_status = 'critical';   // red — urgent
        } else if (diffDays <= warningDays) {
          merged.expiry_status = 'warning';    // amber — approaching
        } else {
          merged.expiry_status = 'ok';
        }
      } else {
        merged.days_until_expiry = null;
        merged.expiry_status = null;
      }
      // ──────────────────────────────────────────────────────────────────────

      return merged;
    });
  }, [items]);

  // Filtering & Sorting
  const filteredAndSorted = useMemo(() => {
    let list = [...enrichedProducts];

    // Branch filter  
    if (branchFilter !== 'ALL') {
      list = list.filter(p => String(p.branch_id) === String(branchFilter));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(p => 
        p.name?.toLowerCase().includes(term) || 
        p.sku?.toLowerCase().includes(term) ||
        String(p.id).includes(term)
      );
    }

    if (activeCategory !== 'all') {
      list = list.filter(p => String(p.category_id) === String(activeCategory));
    }

    if (activeStatus !== 'all') {
      if (activeStatus === 'active') list = list.filter(p => p.is_active);
      if (activeStatus === 'inactive') list = list.filter(p => !p.is_active);
      if (activeStatus === 'out-of-stock') list = list.filter(p => p.stock <= 0);
    }

    if (quickFilter === 'low-stock') list = list.filter(p => p.stock > 0 && p.stock <= 10);
    if (quickFilter === 'promo') list = list.filter(p => (p.discount_percent || 0) > 0);
    if (quickFilter === 'new') list = list.filter(p => p.is_new);
    if (quickFilter === 'expiring') list = list.filter(p => p.expiry_status === 'critical' || p.expiry_status === 'warning' || p.expiry_status === 'expired');

    list.sort((a, b) => {
      switch (activeSort) {
        case 'newest': 
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'stock-low': 
          return (a.stock || 0) - (b.stock || 0);
        case 'best-seller':
          return (b.sold_count || 0) - (a.sold_count || 0);
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        default: return 0;
      }
    });

    return list;
  }, [enrichedProducts, searchTerm, activeCategory, activeStatus, activeSort, quickFilter, branchFilter]);

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (safePage !== currentPage && safePage > 0) {
      setCurrentPage(safePage);
    }
  }, [safePage, currentPage]);

  const displayedItems = filteredAndSorted.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryForm({
      name: '',
      icon: 'category',
      parent_id: '',
      sort_order: 0,
      is_active: true,
    });
  };

  const startEditCategory = (category: any) => {
    setEditingCategoryId(String(category.id || category._id));
    setCategoryForm({
      name: category.name || '',
      icon: category.icon || 'category',
      parent_id: category.parent_id ? String(category.parent_id) : '',
      sort_order: Number(category.sort_order || 0),
      is_active: category.is_active !== false,
    });
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.error('Tên danh mục không được để trống');
      return;
    }

    try {
      setCategoryBusy(true);
      const payload = {
        name: categoryForm.name.trim(),
        icon: categoryForm.icon || 'category',
        parent_id: categoryForm.parent_id || null,
        sort_order: Number(categoryForm.sort_order || 0),
        is_active: Boolean(categoryForm.is_active),
      };

      if (editingCategoryId) {
        await productService.updateCategory(editingCategoryId, payload);
        toast.success('Đã cập nhật danh mục');
      } else {
        await productService.createCategory(payload);
        toast.success('Đã tạo danh mục mới');
      }

      resetCategoryForm();
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu danh mục');
    } finally {
      setCategoryBusy(false);
    }
  };

  const toggleCategoryStatus = async (category: any) => {
    try {
      setCategoryBusy(true);
      await productService.updateCategory(String(category.id || category._id), {
        is_active: category.is_active === false,
      });
      toast.success(category.is_active ? 'Đã ẩn danh mục' : 'Đã bật danh mục');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể đổi trạng thái danh mục');
    } finally {
      setCategoryBusy(false);
    }
  };

  const deleteCategory = async (category: any) => {
    const categoryId = String(category.id || category._id || '');
    if (!categoryId) return;
    const shouldDelete = window.confirm(`Xóa danh mục "${category.name}"?`);
    if (!shouldDelete) return;

    try {
      setCategoryBusy(true);
      await productService.deleteCategory(categoryId);
      toast.success('Đã xóa danh mục');
      if (activeCategory === categoryId) setActiveCategory('all');
      if (editingCategoryId === categoryId) resetCategoryForm();
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa danh mục');
    } finally {
      setCategoryBusy(false);
    }
  };

  const handleToggleActive = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    try {
      setIsProcessing(true);
      await productService.updateBranchProduct(item.id, { is_available: !item.is_active });
      await loadData();
      toast.success(`Đã ${item.is_active ? 'ẩn' : 'hiện'} sản phẩm ${item.name || item.sku}`);
    } catch {
      toast.error('Lỗi khi đổi trạng thái');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProductDelete = async () => {
    if (!itemToDelete) return;

    try {
      setIsProcessing(true);
      // Delete the master product (productController.remove will soft delete and deactivate branches)
      const masterId = itemToDelete.product_id || itemToDelete.product?._id || itemToDelete.product?.id;
      if (!masterId) throw new Error('Không tìm thấy ID sản phẩm gốc');
      
      await productService.deleteProduct(masterId);
      toast.success('Đã xóa (hoặc ẩn) sản phẩm thành công');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa sản phẩm');
    } finally {
      setIsProcessing(false);
      setItemToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItemIds.length === 0) return;
    const shouldDelete = window.confirm(`Bạn có chắc chắn muốn xóa ${selectedItemIds.length} sản phẩm đã chọn? Thao tác này có thể không thể hoàn tác.`);
    if (!shouldDelete) return;

    try {
      setIsProcessing(true);
      let successCount = 0;
      await Promise.all(selectedItemIds.map(async (id) => {
         const item = items.find(i => String(i.id || i._id) === id);
         const masterId = item?.product_id || item?.product?._id || item?.product?.id;
         if (masterId) {
             await productService.deleteProduct(masterId);
             successCount++;
         }
      }));
      toast.success(`Đã xóa thành công ${successCount} sản phẩm`);
      setSelectedItemIds([]);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa các sản phẩm đã chọn');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateDraftHotDeal = (item: any) => {
    const daysLeft = item.days_until_expiry ?? null;
    // Smart discount: closer to expiry → deeper discount
    let discountPercent = 50;
    if (daysLeft !== null && daysLeft <= 3) discountPercent = 70;
    else if (daysLeft !== null && daysLeft <= 7) discountPercent = 50;
    else if (daysLeft !== null && daysLeft <= 14) discountPercent = 30;

    const originalPrice = Number(item.price || item.original_price || item.product?.price || 0);
    const dealPrice = Math.round(originalPrice * (1 - discountPercent / 100));
    const stock = Number(item.stock || 0);
    const imageUrl = item.images?.[0] || item.thumbnail || item.product?.images?.[0] || item.product?.thumbnail || '';

    // Resolve IDs
    const branchProductId = String(item.id || item._id || '');
    const productId = String(item.master_id || item.product_id || item.product?._id || item.product?.id || '');
    const branchId = String(item.branch_id || (branchFilter !== 'ALL' ? branchFilter : '') || '');

    // Payload maps 1:1 to BasicAssetFormState in the Hot Deal modal
    const payload = {
      title: `${t('adminProducts.clearanceSalePrefix')} ${item.name}`,
      imageUrl,
      branch_id: branchId,
      branch_product_id: branchProductId,
      product_id: productId,
      original_price: String(originalPrice),
      deal_price: String(dealPrice),
      total_quantity: String(stock),
      remaining_quantity: String(stock),
      start_date: new Date().toISOString(),
      end_date: item.expiry_date || '',
      is_active: false, // Draft — admin reviews before activating
      // Extra context for the receiver
      _discount_percent: discountPercent,
      _days_until_expiry: daysLeft,
      _product_name: item.name || '',
      _stock: stock,
      _sku: item.sku || '',
      _batch_code: item.batch_code || '',
      _expiry_date_display: item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('vi-VN') : '',
    };
    navigate('/admin/coupons', { state: { draftHotDeal: payload } });
  };

  const handleExport = () => {
    const escapeCSV = (val: any): string => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ['ID', 'SKU', 'Name', 'Price', 'Original Price', 'Stock', 'Sold', 'Active', 'Featured', 'Best Seller', 'New'];
    const rows = filteredAndSorted.map(item => [
      item.id,
      item.sku || '',
      item.name || '',
      item.price || 0,
      item.original_price || 0,
      item.stock || 0,
      item.sold_count || 0,
      item.is_active ? 'Yes' : 'No',
      item.is_featured ? 'Yes' : 'No',
      item.is_best_seller ? 'Yes' : 'No',
      item.is_new ? 'Yes' : 'No'
    ]);
    const csv = [headers.map(escapeCSV).join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lotte_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${filteredAndSorted.length} sản phẩm ra file CSV!`);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.onchange = () => {
      if (input.files?.[0]) {
        toast.success(`Đã chọn file "${input.files[0].name}" — chức năng import sẽ xử lý khi kết nối API Import.`);
      }
    };
    input.click();
  };

  const handleCreateSKU = async () => {
    setEditItem(normalizeProductForEdit({
      id: '',
      branch_id: branchFilter === 'ALL' ? '' : branchFilter,
      name: '',
      sku: `SKU-${Date.now().toString(36).toUpperCase()}`,
      master_id: `MAS-${Date.now().toString(36).toUpperCase()}`,
      category_id: '',
      category_name: '',
      supplier_id: '',
      supplier_name: '',
      batch_code: '',
      manufacture_date: '',
      expiry_date: '',
      expiry_warning_days: 7,
      import_price: 0,
      original_price: 0,
      price: 0,
      stock: 0,
      is_active: true,
      is_featured: false,
      is_best_seller: false,
      is_new: false,
      brand: '',
      barcode: '',
      short_description: '',
      thumbnail: '',
      images: [],
      weight: '',
      unit: 'cái',
      storage_instructions: '',
    }));
  };

  const saveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    if (!editItem.name?.trim()) { toast.error('Vui lòng nhập tên sản phẩm!'); return; }
    if (!editItem.sku?.trim()) { toast.error('Vui lòng nhập mã SKU!'); return; }
    if (!editItem.category_id) { toast.error('Vui lòng chọn danh mục!'); return; }
    if (Number(editItem.price) < 0) { toast.error('Giá bán không được nhỏ hơn 0!'); return; }

    try {
      setIsProcessing(true);
      const discountPct = Number(editItem.original_price) > 0
        ? Math.round((1 - Number(editItem.price) / Number(editItem.original_price)) * 100)
        : 0;

      // Fields that belong to BranchProduct schema
      const bpUpdates: Record<string, any> = {
        price: Number(editItem.price),
        original_price: Number(editItem.original_price),
        discount_percent: discountPct,
        is_available: editItem.is_active, // BP uses is_available, not is_active
        sku: editItem.sku || '',
        master_id: editItem.master_id || '',
        category_id: editItem.category_id || null,
        category_name: editItem.category_name || '',
        supplier_id: editItem.supplier_id || null,
        supplier_name: editItem.supplier_name || '',
        batch_code: editItem.batch_code || '',
        manufacture_date: editItem.manufacture_date || null,
        expiry_date: editItem.expiry_date || null,
        import_price: Number(editItem.import_price || 0),
      };

      // Fields that belong to Product (master) schema only
      const productUpdates: Record<string, any> = {
        name: editItem.name?.trim(),
        sku: editItem.sku || '',
        master_id: editItem.master_id || '',
        category_id: editItem.category_id || null,
        category_name: editItem.category_name || '',
        supplier_id: editItem.supplier_id || null,
        supplier_name: editItem.supplier_name || '',
        is_featured: Boolean(editItem.is_featured),
        is_best_seller: Boolean(editItem.is_best_seller),
        is_new: Boolean(editItem.is_new),
        is_active: editItem.is_active,
        price: Number(editItem.price),
        original_price: Number(editItem.original_price),
        import_price: Number(editItem.import_price || 0),
        discount_percent: discountPct,
        manufacture_date: editItem.manufacture_date || null,
        expiry_date: editItem.expiry_date || null,
        expiry_warning_days: Number(editItem.expiry_warning_days ?? 7),
        batch_code: editItem.batch_code || '',
        brand: editItem.brand || '',
        barcode: editItem.barcode || '',
        short_description: editItem.short_description || '',
        thumbnail: editItem.thumbnail || '',
        images: Array.isArray(editItem.images) ? editItem.images.filter(Boolean) : [],
        gallery: Array.isArray(editItem.images) ? editItem.images.filter(Boolean) : [],
        weight: editItem.weight || '',
        unit: editItem.unit || 'cái',
        storage_instructions: editItem.storage_instructions || '',
        description: editItem.description || '',
        highlights: Array.isArray(editItem.highlights) ? editItem.highlights : (typeof editItem.highlights === 'string' ? editItem.highlights.split('\n').map((s: string)=>s.trim()).filter(Boolean) : []),
        usage_guide: editItem.usage_guide || '',
        storage_guide: editItem.storage_guide || editItem.storage_instructions || '',
        recipe_suggestions: Array.isArray(editItem.recipe_suggestions) ? editItem.recipe_suggestions : (typeof editItem.recipe_suggestions === 'string' ? editItem.recipe_suggestions.split('\n').map((s: string)=>s.trim()).filter(Boolean) : []),
        specifications: Array.isArray(editItem.specifications) ? editItem.specifications.filter((s: any) => s.label && s.value) : [],
      };

      if (!editItem.id) {
        // CREATE flow: create Product first, then BranchProduct
        if (!editItem.branch_id) {
          toast.error('Vui lòng chọn chi nhánh để nhập kho!');
          setIsProcessing(false);
          return;
        }
        const createdProduct = await productService.createProduct({
          name: editItem.name.trim(),
          ...productUpdates,
        });
        if (!createdProduct || !(createdProduct.id || createdProduct._id)) throw new Error('Failed to create product');

        await productService.createBranchProduct({
          ...bpUpdates,
          product_id: createdProduct.id || createdProduct._id,
          branch_id: editItem.branch_id,
        });
        toast.success(`Đã tạo sản phẩm "${editItem.name}" thành công!`);
      } else {
        // UPDATE flow: update BranchProduct + update Product master if we have product_id
        await productService.updateBranchProduct(editItem.id, bpUpdates);

        // Also update the master Product record so is_featured/is_best_seller/is_new persist
        const masterId = editItem.product_id || editItem.product?._id || editItem.product?.id;
        if (masterId) {
          try {
            await productService.updateProduct(masterId, productUpdates);
          } catch {
            // Non-critical: BP updated successfully, master update is best-effort
          }
        }
        toast.success('Đã cập nhật cấu hình sản phẩm');
      }

      setEditItem(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi lưu');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-on-surface mb-2">
              {t('adminProducts.title')}
            </h1>
            <p className="text-secondary text-sm">
              {t('adminProducts.subtitle', { count: enrichedProducts.length })}
            </p>
          </div>

        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-800">{t('adminProducts.manageCategories')}</h2>
              <p className="text-xs text-slate-500 mt-1">{t('adminProducts.manageCategoriesDesc')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleCreateSKU} disabled={isProcessing} className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all cursor-pointer text-xs">
                <span className="material-symbols-outlined text-[16px]">add</span>
                {t('adminProducts.newSku')}
              </button>
              <button
                type="button"
                onClick={resetCategoryForm}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                {t('adminProducts.newCategory')}
              </button>
            </div>
          </div>

          <form onSubmit={saveCategory} className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <input
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('adminProducts.categoryName')}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
                required
              />
            </div>
            <div className="md:col-span-2">
              <input
                type="text"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, icon: e.target.value }))}
                placeholder={t('adminProducts.categoryIcon')}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="md:col-span-3">
              <select
                value={categoryForm.parent_id}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, parent_id: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
              >
                <option value="">{t('adminProducts.parentCategory')}</option>
                {categories
                  .filter((c: any) => String(c.id || c._id) !== String(editingCategoryId || ''))
                  .map((c: any) => (
                    <option key={String(c.id || c._id)} value={String(c.id || c._id)}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="md:col-span-1">
              <input
                type="number"
                min={0}
                value={categoryForm.sort_order}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, sort_order: Number(e.target.value || 0) }))}
                placeholder={t('adminProducts.sortOrder')}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={categoryForm.is_active}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-slate-300 text-primary"
                />
                {t('adminProducts.active')}
              </label>
              <button
                type="submit"
                disabled={categoryBusy}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
              >
                {editingCategoryId ? t('adminProducts.saveCategory') : t('adminProducts.addCategory')}
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {categories.map((cat: any) => {
              const catId = String(cat.id || cat._id);
              const parent = categories.find((c: any) => String(c.id || c._id) === String(cat.parent_id));
              return (
                <div key={catId} className="border border-slate-200 rounded-xl px-3 py-2.5 bg-white flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">{cat.name}</p>
                    <p className="text-[11px] text-slate-500">{parent ? t('adminProducts.categoryParent', { name: parent.name }) : t('adminProducts.categoryRoot')}</p>
                    <p className="text-[11px] text-slate-500">{t('adminProducts.categoryOrder', { order: Number(cat.sort_order || 0) })}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditCategory(cat)}
                      className="p-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
                      title={t('adminProducts.edit')}
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCategoryStatus(cat)}
                      className={`p-1.5 rounded-md ${cat.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                      title={cat.is_active ? t('adminProducts.statusInactive') : t('adminProducts.statusActive')}
                    >
                      <span className="material-symbols-outlined text-[16px]">{cat.is_active ? 'visibility' : 'visibility_off'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCategory(cat)}
                      className="p-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                      title={t('adminProducts.delete')}
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Moved Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <button onClick={handleExport} className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98]">
              <span className="material-symbols-outlined">ios_share</span>
              {t('adminProducts.exportData')}
            </button>
            <button onClick={handleImport} className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98]">
              <span className="material-symbols-outlined">publish</span>
              {t('adminProducts.importData')}
            </button>
            <button 
              onClick={async () => {
                const conf = window.confirm(t('adminProducts.toastBulkSaleConfirm'));
                if (!conf) return;
                try {
                  setIsProcessing(true);
                  const token = localStorage.getItem('access_token') || sessionStorage.getItem('token');
                  const res = await fetch('http://localhost:3001/api/promotions/bulk-expiring', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
                  });
                  const data = await res.json();
                  if (data.success) {
                    toast.success(t('adminProducts.toastBulkSaleSuccess', { count: data.count || 0 }));
                    await loadData();
                  } else throw new Error(data.message);
                } catch(err: any) {
                  toast.error(err.message || t('adminProducts.toastBulkSaleError'));
                } finally {
                  setIsProcessing(false);
                }
              }}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-orange-50 bg-opacity-50 border border-orange-200 text-orange-600 hover:bg-orange-100 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98]">
              <span className="material-symbols-outlined">auto_fix</span>
              {t('adminProducts.bulkSale')}
            </button>
            {selectedItemIds.length > 0 && (
              <button onClick={handleBulkDelete} disabled={isProcessing} className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 hover:shadow-red-600/40 hover:bg-red-700 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                <span className="material-symbols-outlined">delete</span>
                {t('adminProducts.deleteSelected', { count: selectedItemIds.length })}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm mb-8 space-y-6 border border-slate-100">
          {/* Branch Filter Row removed because it's in the Header */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="col-span-1 md:col-span-4 relative flex items-center">
              <div className="absolute left-0 top-0 h-full w-12 flex items-center justify-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 leading-none block">search</span>
              </div>
              <input
                className="w-full pl-12 pr-4 py-3 bg-surface-container-low border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none placeholder:text-slate-400"
                placeholder={t('adminProducts.searchPlaceholder')}
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                type="text"
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <select 
                value={activeCategory} 
                onChange={e => { setActiveCategory(e.target.value === 'all' ? 'all' : String(e.target.value)); setCurrentPage(1); }}
                className="w-full px-4 py-3 bg-surface-container-low border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none cursor-pointer"
              >
                <option value="all">{t('adminProducts.allCategories')}</option>
                {categories.map(c => <option key={String(c.id || c._id)} value={String(c.id || c._id)}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-1 md:col-span-2">
              <select 
                value={activeStatus} 
                onChange={e => { setActiveStatus(e.target.value); setCurrentPage(1); }}
                className="w-full px-4 py-3 bg-surface-container-low border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none cursor-pointer"
              >
                <option value="all">{t('adminProducts.allStatuses')}</option>
                <option value="active">{t('adminProducts.statusActive')}</option>
                <option value="inactive">{t('adminProducts.statusInactive')}</option>
                <option value="out-of-stock">{t('adminProducts.statusOutOfStock')}</option>
              </select>
            </div>
            <div className="col-span-1 md:col-span-2">
              <select 
                value={activeSort}
                onChange={e => { setActiveSort(e.target.value as SortOption); setCurrentPage(1); }}
                className="w-full px-4 py-3 bg-surface-container-low border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none cursor-pointer font-medium"
              >
                <option value="newest">{t('adminProducts.sortNewest')}</option>
                <option value="stock-low">{t('adminProducts.sortStockLow')}</option>
                <option value="best-seller">{t('adminProducts.sortBestSeller')}</option>
                <option value="price-low">{t('adminProducts.sortPriceLow')}</option>
                <option value="price-high">{t('adminProducts.sortPriceHigh')}</option>
              </select>
            </div>
            <div className="col-span-1 md:col-span-2">
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setActiveCategory('all');
                  setActiveStatus('all');
                  setQuickFilter('none');
                }}
                className="w-full h-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                {t('adminSettings.revert')}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{t('adminProducts.sortBy')}:</span>
            <button 
              onClick={() => { setQuickFilter('none'); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${quickFilter === 'none' ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t('adminProducts.quickFilterAll')}
            </button>
            <button 
              onClick={() => { setQuickFilter('low-stock'); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${quickFilter === 'low-stock' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> {t('adminProducts.quickFilterLowStock')}
            </button>
            <button 
              onClick={() => { setQuickFilter('promo'); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${quickFilter === 'promo' ? 'bg-red-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t('adminProducts.quickFilterPromo')}
            </button>
            <button 
              onClick={() => { setQuickFilter('new'); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${quickFilter === 'new' ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t('adminProducts.quickFilterNew')}
            </button>
            <button 
              onClick={() => { setQuickFilter('expiring'); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${quickFilter === 'expiring' ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <span className="material-symbols-outlined text-xs">schedule</span> {t('adminProducts.quickFilterExpiring')}
            </button>
            
            <div className="ml-auto flex items-center gap-2 text-xs text-secondary font-medium">
              <span className="material-symbols-outlined text-xs">info</span>
              <span>{filteredAndSorted.length} {t('adminProducts.badgeCategory')}</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-slate-100 overflow-x-auto mb-8 min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
              <p className="mt-4 font-bold text-slate-400">Đang tải dữ liệu kho...</p>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-slate-300">inventory_2</span>
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Không tìm thấy sản phẩm</h3>
              <p className="text-slate-400 mb-6">Thử thay đổi bộ lọc hoặc xóa lọc để xem lại.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500 w-10">
                    <input 
                      className="rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer" 
                      type="checkbox" 
                      checked={displayedItems.length > 0 && selectedItemIds.length === displayedItems.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItemIds(displayedItems.map(item => String(item.id || item._id)));
                        } else {
                          setSelectedItemIds([]);
                        }
                      }}
                    />
                  </th>
                  <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Sản phẩm & NCC</th>
                  <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500 text-right">Giá bán / Nhập</th>
                  <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500 text-right">Tồn kho / Bán</th>
                  <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Badges & Hạn dùng</th>
                  <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Trạng thái</th>
                  <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {displayedItems.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 align-top">
                      <input 
                        className="rounded border-slate-300 text-primary mt-3 cursor-pointer" 
                        type="checkbox" 
                        checked={selectedItemIds.includes(String(item.id || item._id))}
                        onChange={(e) => {
                          const id = String(item.id || item._id);
                          if (e.target.checked) {
                            setSelectedItemIds(prev => [...prev, id]);
                          } else {
                            setSelectedItemIds(prev => prev.filter(x => x !== id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-5 py-4 max-w-[300px]">
                      <div className="flex gap-4">
                        <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden relative">
                          <img className="w-full h-full object-cover" src={item.images?.[0] || item.product?.images?.[0] || 'https://via.placeholder.com/100'} alt={item.name} />
                          {item.stock <= 0 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-[8px] font-bold text-white">HẾT</span></div>}
                        </div>
                        <div className="flex flex-col justify-center">
                          <p className="font-bold text-slate-800 text-sm line-clamp-1 mb-0.5" title={item.name}>{item.name || 'N/A'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1 rounded">SKU: {item.sku}</span>
                            <span className="text-[11px] text-slate-400 font-mono">Master: {String(item.master_id || '').slice(-6)}</span>
                          </div>
                          {item.supplier_name ? (
                            <p className="text-[11px] text-slate-500 mt-1 font-medium truncate w-full" title={item.supplier_name}>
                              NCC: {item.supplier_name}
                              {item.supplier_code && <span className="font-mono text-slate-400 ml-1">({item.supplier_code})</span>}
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400 mt-1 uppercase">Chưa có NCC</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right align-top">
                      <div className="mt-1">
                        <p className="font-extrabold text-primary text-[15px]">{(item.price || 0).toLocaleString()}đ</p>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-xs text-slate-400 line-through">{(item.original_price || 0).toLocaleString()}đ</span>
                          {item.original_price > item.price && (
                            <span className="text-[10px] font-bold px-1.5 bg-red-100 text-red-600 rounded">-{item.discount_percent}%</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right align-top">
                      <div className="mt-1">
                        <div className="flex items-center justify-end gap-2 mb-1">
                          <span className={`font-bold px-2 py-0.5 rounded text-xs ${item.stock > 10 ? 'bg-emerald-100 text-emerald-700' : item.stock > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            Kho: {item.stock || 0}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Đã bán: <b>{item.sold_count || 0}</b></p>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Array.isArray(item.badges) && item.badges.length > 0 ? item.badges.map((b: any, index: number) => (
                            <span key={index} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              b.color === 'red' ? 'bg-red-100 text-red-700' :
                              b.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                              b.color === 'yellow' ? 'bg-amber-100 text-amber-800' :
                              b.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-blue-50 text-blue-700'
                            }`}>
                              {b.text}
                            </span>
                          )) : (
                            <span className="text-[10px] text-slate-400">-</span>
                          )}
                        </div>
                        {item.manufacture_date && (
                          <span className="text-[11px] font-bold text-slate-500">
                            NSX: {new Date(item.manufacture_date).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                        {item.expiry_date ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-[11px] font-bold ${
                              item.expiry_status === 'expired' ? 'text-red-600' :
                              item.expiry_status === 'critical' ? 'text-orange-600' :
                              item.expiry_status === 'warning' ? 'text-amber-600' :
                              'text-slate-600'
                            }`}>
                              HSD: {new Date(item.expiry_date).toLocaleDateString('vi-VN')}
                            </span>
                            <span className={`text-[10px] font-bold ${
                              item.expiry_status === 'expired' ? 'text-red-600' :
                              item.expiry_status === 'critical' ? 'text-orange-600' :
                              item.expiry_status === 'warning' ? 'text-amber-600' :
                              'text-emerald-600'
                            }`}>
                              {item.days_until_expiry !== null && item.days_until_expiry !== undefined
                                ? item.days_until_expiry < 0
                                  ? `Đã hết hạn ${Math.abs(item.days_until_expiry)} ngày`
                                  : item.days_until_expiry === 0
                                    ? 'Hết hạn hôm nay!'
                                    : `Còn ${item.days_until_expiry} ngày`
                                : ''}
                            </span>
                            {(item.expiry_status === 'critical' || item.expiry_status === 'expired') && (
                              <button
                                onClick={() => handleCreateDraftHotDeal(item)}
                                className="mt-1 inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                title="Tạo khuyến mãi xả hàng từ cảnh báo hết hạn"
                              >
                                <span className="material-symbols-outlined text-[12px]">sell</span>
                                Tạo sale xả hàng
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Không có hạn</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      {item.is_active ? (
                        <span className="inline-flex mt-1 items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-full border border-emerald-200 whitespace-nowrap cursor-pointer hover:bg-emerald-100 transition-colors" onClick={(e) => handleToggleActive(e, item)} title="Nhấp để ẩn">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Hiển thị
                        </span>
                      ) : (
                        <span className="inline-flex mt-1 items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 font-bold text-xs rounded-full border border-slate-200 whitespace-nowrap cursor-pointer hover:bg-slate-200 transition-colors" onClick={(e) => handleToggleActive(e, item)} title="Nhấp để hiển thị">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Đang ẩn
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center align-middle">
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => setEditItem(normalizeProductForEdit(item))}
                          disabled={isProcessing}
                          className="px-4 py-2 border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-primary/50 text-primary font-bold text-xs rounded-lg transition-all"
                        >
                          Chỉnh sửa
                        </button>
                        {(item.expiry_status === 'critical' || item.expiry_status === 'warning') && (
                          <button 
                            onClick={() => handleCreateDraftHotDeal(item)}
                            className="px-4 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 hover:border-red-300 font-bold text-[11px] rounded-lg transition-all flex items-center justify-center gap-1 w-full whitespace-nowrap"
                            title="Tạo khuyến mãi xả hàng nháp"
                          >
                            <span className="material-symbols-outlined text-[14px]">sell</span>
                            Tạo sale
                          </button>
                        )}
                        <button 
                          onClick={() => setItemToDelete(item)}
                          disabled={isProcessing}
                          className="px-4 py-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 font-bold text-[11px] rounded-lg transition-all flex items-center justify-center gap-1 w-full"
                          title="Xóa sản phẩm"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">
                Hiển thị <b>{(safePage - 1) * itemsPerPage + 1}</b> đến <b>{Math.min(safePage * itemsPerPage, filteredAndSorted.length)}</b> trong tổng <b>{filteredAndSorted.length}</b> SP
              </p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-colors text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white text-xs font-bold shadow-md">
                  {safePage}
                </span>
                <span className="text-slate-400 text-xs px-1">/</span>
                <span className="text-slate-600 text-xs font-bold px-1">{totalPages}</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-colors text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-800 text-lg">{editItem.id ? 'Chỉnh sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</h3>
                <input
                  type="text"
                  placeholder="Nhập tên sản phẩm..."
                  value={editItem.name || ''}
                  onChange={e => setEditItem({...editItem, name: e.target.value})}
                  className="mt-2 w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-md font-bold text-slate-800 outline-none focus:border-primary shadow-sm"
                  required
                />
              </div>
              <button onClick={() => setEditItem(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={saveQuickEdit} className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Số lượng tồn kho</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0"
                      disabled
                      value={editItem.stock}
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl cursor-not-allowed opacity-75 font-bold text-slate-500"
                    />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">inventory_2</span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 leading-normal font-medium">Tồn kho được quản lý tự động qua Purchase Orders / Goods Receipts và Adjustment. Không cho phép sửa đổi thủ công trực tiếp.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Trạng thái rổ hàng</label>
                  <select 
                    value={editItem.is_active ? 'true' : 'false'}
                    onChange={e => setEditItem({...editItem, is_active: e.target.value === 'true'})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-800"
                  >
                    <option value="true">Hiển thị (Khách mua được)</option>
                    <option value="false">Ẩn (Không mua được)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 border-t border-slate-100 pt-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">SKU</label>
                  <input type="text" value={editItem.sku || ''} onChange={e => setEditItem({...editItem, sku: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Master ID</label>
                  <input type="text" value={editItem.master_id || ''} onChange={e => setEditItem({...editItem, master_id: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Danh mục</label>
                  <select 
                    value={editItem.category_id || ''} 
                    onChange={e => {
                      const sel = categories.find(c => String(c.id || c._id) === e.target.value);
                      setEditItem({...editItem, category_id: e.target.value, category_name: sel ? sel.name : ''});
                    }} 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nhà Cung Cấp</label>
                  <select 
                    value={editItem.supplier_id || ''} 
                    onChange={e => {
                      const sel = suppliers.find(s => String(s.id || s._id) === e.target.value);
                      setEditItem({...editItem, supplier_id: e.target.value, supplier_name: sel ? sel.name : ''});
                    }} 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm"
                  >
                    <option value="">-- Chọn NCC --</option>
                    {suppliers.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 border-t border-slate-100 pt-4 mt-4">
                {!editItem.id && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Chi nhánh</label>
                    <select 
                      value={editItem.branch_id || ''} 
                      onChange={e => setEditItem({...editItem, branch_id: e.target.value})} 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm"
                    >
                      <option value="">-- Chọn chi nhánh --</option>
                      {branches.map(b => <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Thương hiệu</label>
                  <input type="text" value={editItem.brand || ''} onChange={e => setEditItem({...editItem, brand: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Barcode</label>
                  <input type="text" value={editItem.barcode || ''} onChange={e => setEditItem({...editItem, barcode: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Mô tả ngắn</label>
                  <input type="text" value={editItem.short_description || ''} onChange={e => setEditItem({...editItem, short_description: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm" />
                </div>
              </div>

              {/* ── Product Images Section ──────────────────────────── */}
              <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Hình ảnh sản phẩm ({(editItem.images || []).length}/5)</label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white font-bold text-xs rounded-lg hover:bg-primary/90 transition-all cursor-pointer">
                      <span className="material-symbols-outlined text-[14px]">upload</span>
                      Tải ảnh lên
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;
                          const currentImages = Array.isArray(editItem.images) ? editItem.images : [];
                          if (currentImages.length + files.length > 5) {
                            toast.error('Tối đa 5 ảnh cho mỗi sản phẩm');
                            return;
                          }
                          try {
                            setIsProcessing(true);
                            const formData = new FormData();
                            for (let i = 0; i < files.length; i++) {
                              if (files[i].size > 5 * 1024 * 1024) {
                                toast.error(`Ảnh "${files[i].name}" vượt quá 5MB`);
                                continue;
                              }
                              formData.append('images', files[i]);
                            }
                            const token = localStorage.getItem('access_token') || sessionStorage.getItem('token');
                            const res = await fetch('http://localhost:3001/api/uploads/product-images', {
                              method: 'POST',
                              body: formData,
                              headers: token ? { Authorization: `Bearer ${token}` } : {},
                            });
                            const result = await res.json();
                            if (result.success && result.data?.urls) {
                              const newImages = [...currentImages, ...result.data.urls];
                              setEditItem((prev: any) => ({
                                ...prev,
                                images: newImages,
                                thumbnail: prev.thumbnail || newImages[0] || '',
                              }));
                              toast.success(`Đã tải lên ${result.data.urls.length} ảnh thành công`);
                            } else {
                              throw new Error(result.message || 'Upload failed');
                            }
                          } catch (err: any) {
                            toast.error(err.message || 'Lỗi tải ảnh lên');
                          } finally {
                            setIsProcessing(false);
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const url = window.prompt('Nhập URL hình ảnh:');
                        if (!url || !url.trim()) return;
                        const currentImages = Array.isArray(editItem.images) ? editItem.images : [];
                        if (currentImages.length >= 5) { toast.error('Tối đa 5 ảnh'); return; }
                        const newImages = [...currentImages, url.trim()];
                        setEditItem({
                          ...editItem,
                          images: newImages,
                          thumbnail: editItem.thumbnail || newImages[0] || '',
                        });
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-200 transition-all"
                    >
                      <span className="material-symbols-outlined text-[14px]">link</span>
                      Thêm URL
                    </button>
                  </div>
                </div>

                {(editItem.images || []).length > 0 ? (
                  <div className="grid grid-cols-5 gap-3">
                    {(editItem.images || []).map((imgUrl: string, idx: number) => (
                      <div key={idx} className="relative group aspect-square rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-100">
                        <img
                          src={imgUrl}
                          alt={`Ảnh ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        {/* Thumbnail badge */}
                        {editItem.thumbnail === imgUrl && (
                          <span className="absolute top-1.5 left-1.5 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow">THUMB</span>
                        )}
                        {/* Overlay buttons */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {editItem.thumbnail !== imgUrl && (
                            <button
                              type="button"
                              onClick={() => setEditItem({ ...editItem, thumbnail: imgUrl })}
                              className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-primary hover:bg-white transition-colors"
                              title={t('adminProducts.setThumbnail')}
                            >
                              <span className="material-symbols-outlined text-[14px]">star</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = (editItem.images || []).filter((_: string, i: number) => i !== idx);
                              setEditItem({
                                ...editItem,
                                images: newImages,
                                thumbnail: editItem.thumbnail === imgUrl ? (newImages[0] || '') : editItem.thumbnail,
                              });
                            }}
                            className="w-7 h-7 bg-red-500/90 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                            title={t('adminProducts.deleteImage')}
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    <span className="material-symbols-outlined text-3xl text-slate-300 mb-2 block">add_photo_alternate</span>
                    <p className="text-xs text-slate-400 font-bold">{t('adminProducts.noImages')}</p>
                  </div>
                )}
              </div>

              {/* ── Technical Details (Collapsible & Dynamic) ──────────────────────────── */}
              <div className="border-t border-slate-100 pt-4 mt-2 mb-4">
                <details className="group">
                  <summary className="flex items-center justify-between font-black text-slate-800 text-sm uppercase tracking-widest cursor-pointer list-none mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">list_alt</span>
                      {t('adminProducts.technicalDetails')}
                    </div>
                    <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                  </summary>

                  <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-sm text-primary">auto_awesome</span>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">{t('adminProducts.templates')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {specTemplates.map((tpl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            const newSpecs = [...(editItem.specifications || [])];
                            tpl.labels.forEach(lbl => {
                              if (!newSpecs.find(s => s.label === lbl)) {
                                newSpecs.push({ label: lbl, value: '' });
                              }
                            });
                            setEditItem({...editItem, specifications: newSpecs});
                          }}
                          className="px-3 py-1.5 bg-white border border-primary/30 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                        >
                          + {tpl.name}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('adminProducts.suggestedLabels')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(specTemplates.flatMap(t => t.labels))).map((lbl, i) => {
                        const isAdded = (editItem.specifications || []).some((s: any) => s.label === lbl);
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={isAdded}
                            onClick={() => {
                              const newSpecs = [...(editItem.specifications || []), { label: lbl, value: '' }];
                              setEditItem({...editItem, specifications: newSpecs});
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${isAdded ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-300 text-slate-600 hover:border-primary hover:text-primary shadow-sm'}`}
                          >
                            {lbl} {isAdded && <span className="material-symbols-outlined text-[10px] ml-1 align-middle">check</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 pb-4">
                    {(editItem.specifications || []).map((spec: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        <input 
                          type="text" 
                          placeholder={t('adminProducts.specLabelPlaceholder')} 
                          value={spec.label || ''} 
                          onChange={e => {
                            const newSpecs = [...(editItem.specifications || [])];
                            newSpecs[idx] = { ...newSpecs[idx], label: e.target.value };
                            setEditItem({...editItem, specifications: newSpecs});
                          }} 
                          className="w-1/3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm font-bold" 
                        />
                        <input 
                          type="text" 
                          placeholder={t('adminProducts.specValuePlaceholder')} 
                          value={spec.value || ''} 
                          onChange={e => {
                            const newSpecs = [...(editItem.specifications || [])];
                            newSpecs[idx] = { ...newSpecs[idx], value: e.target.value };
                            setEditItem({...editItem, specifications: newSpecs});
                          }} 
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm" 
                        />
                        <button 
                          type="button" 
                          onClick={() => {
                            const newSpecs = [...(editItem.specifications || [])];
                            newSpecs.splice(idx, 1);
                            setEditItem({...editItem, specifications: newSpecs});
                          }}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    ))}
                    <button 
                      type="button" 
                      onClick={() => {
                        const newSpecs = [...(editItem.specifications || []), { label: '', value: '' }];
                        setEditItem({...editItem, specifications: newSpecs});
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      {t('adminProducts.customLabel')}
                    </button>
                  </div>
                </details>
              </div>

              {/* ── Rich Content & Description (Collapsible) ──────────────────────────── */}
              <div className="border-t border-slate-100 pt-4 mt-6">
                <details className="group" open>
                  <summary className="flex items-center justify-between font-black text-slate-800 text-sm uppercase tracking-widest cursor-pointer list-none mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">description</span>
                      {t('adminProducts.contentAndDescription')}
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.preventDefault();
                          setShowPreview(!showPreview);
                        }}
                        className="text-primary text-xs font-bold bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                      >
                        {showPreview ? t('adminProducts.closePreview') : t('adminProducts.preview')}
                      </button>
                      <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                    </div>
                  </summary>

                  {showPreview && (
                    <div className="mb-6 p-6 rounded-xl border border-primary/20 bg-primary/5 shadow-inner">
                      <h4 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined">visibility</span>
                        Live Preview
                      </h4>
                      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                        <article className="prose prose-slate max-w-none text-sm mb-6">
                          <h3 className="text-lg font-bold mb-3">{editItem.name || 'Tên sản phẩm'}</h3>
                          <p className="whitespace-pre-wrap text-slate-600 leading-relaxed mb-4">{editItem.description || editItem.short_description || 'Chưa có mô tả.'}</p>
                          
                          {Array.isArray(editItem.highlights) ? (
                            editItem.highlights.length > 0 && (
                              <ul className="space-y-2 mb-6">
                                {editItem.highlights.map((line: string, i: number) => (
                                  <li key={i} className="flex gap-2 text-slate-700">
                                    <span className="material-symbols-outlined text-primary text-sm mt-0.5">check_circle</span>
                                    {line}
                                  </li>
                                ))}
                              </ul>
                            )
                          ) : (
                            editItem.highlights && editItem.highlights.split('\n').filter((x: string) => x.trim()).length > 0 && (
                              <ul className="space-y-2 mb-6">
                                {editItem.highlights.split('\n').map((line: string, i: number) => line.trim() ? (
                                  <li key={i} className="flex gap-2 text-slate-700">
                                    <span className="material-symbols-outlined text-primary text-sm mt-0.5">check_circle</span>
                                    {line.trim()}
                                  </li>
                                ) : null)}
                              </ul>
                            )
                          )}
                        </article>

                        {(editItem.specifications || []).length > 0 && (
                          <div className="mb-6 border-t border-slate-100 pt-6">
                            <h3 className="font-bold text-base mb-4 text-slate-800">{t('adminProducts.technicalDetails')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                              {(editItem.specifications || []).map((spec: any, i: number) => spec.label && spec.value && (
                                <div key={i} className="flex justify-between border-b border-slate-100 pb-2 text-sm">
                                  <span className="font-medium text-slate-500">{spec.label}</span>
                                  <span className="font-bold text-slate-800 text-right">{spec.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                          {(editItem.usage_guide || editItem.storage_guide || editItem.storage_instructions) && (
                            <div className="bg-slate-50 rounded-xl p-4 text-sm border border-slate-100">
                              {editItem.usage_guide && (
                                <div className="mb-3">
                                  <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">info</span> {t('adminProducts.usageGuide')}</h4>
                                  <p className="text-slate-600 whitespace-pre-wrap">{editItem.usage_guide}</p>
                                </div>
                              )}
                              {(editItem.storage_guide || editItem.storage_instructions) && (
                                <div>
                                  <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">ac_unit</span> {t('adminProducts.storageGuide')}</h4>
                                  <p className="text-slate-600 whitespace-pre-wrap">{editItem.storage_guide || editItem.storage_instructions}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {((Array.isArray(editItem.recipe_suggestions) && editItem.recipe_suggestions.length > 0) || (typeof editItem.recipe_suggestions === 'string' && editItem.recipe_suggestions.trim())) && (
                            <div className="bg-orange-50 rounded-xl p-4 text-sm border border-orange-100">
                              <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm">restaurant</span>
                                {t('adminProducts.recipeSuggestions')}
                              </h4>
                              <ul className="list-disc pl-5 text-orange-700 space-y-1">
                                {Array.isArray(editItem.recipe_suggestions) 
                                  ? editItem.recipe_suggestions.map((r: string, i: number) => <li key={i}>{r}</li>)
                                  : editItem.recipe_suggestions.split('\n').filter((x: string) => x.trim()).map((r: string, i: number) => <li key={i}>{r.trim()}</li>)
                                }
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
                    <div className="col-span-1 lg:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('adminProducts.productDescription')}</label>
                      <textarea rows={4} value={editItem.description || ''} onChange={e => setEditItem({...editItem, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm resize-none" placeholder="..."></textarea>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('adminProducts.highlights')}</label>
                      <textarea rows={4} value={Array.isArray(editItem.highlights) ? editItem.highlights.join('\n') : (editItem.highlights || '')} onChange={e => setEditItem({...editItem, highlights: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm resize-none" placeholder="- Tươi ngon mỗi ngày&#10;- An toàn sức khỏe"></textarea>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('adminProducts.usageGuide')}</label>
                      <textarea rows={4} value={editItem.usage_guide || ''} onChange={e => setEditItem({...editItem, usage_guide: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm resize-none" placeholder="..."></textarea>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('adminProducts.storageGuide')}</label>
                      <textarea rows={3} value={editItem.storage_guide || editItem.storage_instructions || ''} onChange={e => setEditItem({...editItem, storage_guide: e.target.value, storage_instructions: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm resize-none" placeholder="Bảo quản nơi khô ráo, thoáng mát..."></textarea>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('adminProducts.recipeSuggestions')}</label>
                      <textarea rows={3} value={Array.isArray(editItem.recipe_suggestions) ? editItem.recipe_suggestions.join('\n') : (editItem.recipe_suggestions || '')} onChange={e => setEditItem({...editItem, recipe_suggestions: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm resize-none" placeholder="- Sinh tố trái cây&#10;- Salad trộn"></textarea>
                    </div>
                  </div>
                </details>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 border-t border-slate-100 pt-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('adminProducts.weight')}</label>
                  <input type="text" value={editItem.weight || ''} onChange={e => setEditItem({...editItem, weight: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('adminProducts.unit')}</label>
                  <input type="text" value={editItem.unit || ''} onChange={e => setEditItem({...editItem, unit: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('adminProducts.storage')}</label>
                  <input type="text" value={editItem.storage_instructions || ''} onChange={e => setEditItem({...editItem, storage_instructions: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 border-t border-slate-100 pt-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Batch Code</label>
                  <input type="text" value={editItem.batch_code || ''} onChange={e => setEditItem({...editItem, batch_code: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 font-mono text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 border-t border-slate-100 pt-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('adminProducts.manufactureDate')}</label>
                  <input type="date" value={editItem.manufacture_date ? editItem.manufacture_date.split('T')[0] : ''} onChange={e => setEditItem({...editItem, manufacture_date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('adminProducts.expiryDate')}</label>
                  <input type="date" value={editItem.expiry_date ? editItem.expiry_date.split('T')[0] : ''} onChange={e => setEditItem({...editItem, expiry_date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('adminProducts.expiryWarningDays')}</label>
                  <input type="number" min="0" value={editItem.expiry_warning_days ?? 7} onChange={e => setEditItem({...editItem, expiry_warning_days: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('adminProducts.importPrice')}</label>
                  <div className="relative">
                    <input type="number" min="0" value={editItem.import_price || 0} onChange={e => setEditItem({...editItem, import_price: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-2 text-sm text-amber-600 font-bold" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-600 text-xs font-bold">VNĐ</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Giá niêm yết (Gốc)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0"
                      value={editItem.original_price}
                      onChange={e => setEditItem({...editItem, original_price: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-400 line-through"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">VNĐ</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Giá hiện tại (Sale)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0"
                      value={editItem.price}
                      onChange={e => setEditItem({...editItem, price: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-black text-primary text-lg"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary text-xs font-bold">VNĐ</span>
                  </div>
                  {Number(editItem.original_price) > Number(editItem.price) && (
                    <p className="text-[11px] text-emerald-600 font-bold mt-2">
                       Tự động tính giảm: -{Math.round((1 - Number(editItem.price) / Number(editItem.original_price)) * 100)}%
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Huy hiệu hiển thị (Badges)</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={editItem.is_featured} onChange={e => setEditItem({...editItem, is_featured: e.target.checked})} className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary" />
                    <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">Nổi Bật (Featured)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={editItem.is_best_seller} onChange={e => setEditItem({...editItem, is_best_seller: e.target.checked})} className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary" />
                    <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">Bán Chạy (Best Seller)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={editItem.is_new} onChange={e => setEditItem({...editItem, is_new: e.target.checked})} className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary" />
                    <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">Hàng Mới (New)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-2">
                <button type="button" onClick={() => setEditItem(null)} className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98] border border-slate-200">Hủy thao tác</button>
                <button type="submit" disabled={isProcessing} className="inline-flex items-center justify-center gap-2 h-10 px-6 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:bg-primary-container transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                  {isProcessing ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : <span className="material-symbols-outlined text-sm">save</span>}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
               <span className="material-symbols-outlined text-red-600 text-[24px]">warning</span>
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">Xóa sản phẩm?</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa <b>{itemToDelete.name}</b> khỏi hệ thống? Sản phẩm này sẽ bị ẩn khỏi cửa hàng.
            </p>
            <div className="flex gap-3">
               <button onClick={() => setItemToDelete(null)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all">Hủy thao tác</button>
               <button onClick={handleProductDelete} disabled={isProcessing} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center">
                 {isProcessing ? 'Đang xóa...' : 'Xác nhận xóa'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductManagement;