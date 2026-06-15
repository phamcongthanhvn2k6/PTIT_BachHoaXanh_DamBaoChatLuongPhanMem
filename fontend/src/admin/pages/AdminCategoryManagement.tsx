import React, { useEffect, useMemo, useState } from 'react';
import { productService } from '../../services/productService';
import { toast } from '../../components/Toast/toastEvent';
import { CategoryIcon } from '../../components/CategoryIcon';

const defaultForm = {
  name: '',
  slug: '',
  description: '',
  icon: 'category',
  icon_type: 'material_icon',
  icon_url: '',
  icon_name: 'category',
  icon_emoji: '',
  parent_id: '',
  sort_order: 0,
  is_active: true,
};

const POPULAR_ICONS_BY_CATEGORY = {
  'Thực phẩm & Ăn uống': [
    { value: 'eco', label: 'Rau củ / Hữu cơ (eco)' },
    { value: 'nutrition', label: 'Trái cây (nutrition)' },
    { value: 'restaurant', label: 'Thực phẩm / Nhà hàng (restaurant)' },
    { value: 'local_drink', label: 'Sữa / Đồ uống (local_drink)' },
    { value: 'bakery_dining', label: 'Bánh ngọt (bakery_dining)' },
    { value: 'egg', label: 'Trứng (egg)' },
    { value: 'set_meal', label: 'Hải sản / Cá (set_meal)' },
    { value: 'whatshot', label: 'Thịt / Lửa nấu (whatshot)' },
    { value: 'ramen_dining', label: 'Bún / Mì (ramen_dining)' },
    { value: 'cookie', label: 'Bánh kẹo / Ăn vặt (cookie)' },
    { value: 'icecream', label: 'Kem (icecream)' },
    { value: 'kitchen', label: 'Tủ lạnh (kitchen)' },
    { value: 'flatware', label: 'Gia vị / Muỗng nĩa (flatware)' },
    { value: 'local_cafe', label: 'Cà phê (local_cafe)' },
    { value: 'wine_bar', label: 'Rượu bia (wine_bar)' }
  ],
  'Mua sắm & Tiện ích': [
    { value: 'shopping_cart', label: 'Giỏ hàng (shopping_cart)' },
    { value: 'local_grocery_store', label: 'Siêu thị (local_grocery_store)' },
    { value: 'checkroom', label: 'Quần áo (checkroom)' },
    { value: 'shopping_bag', label: 'Túi xách (shopping_bag)' },
    { value: 'storefront', label: 'Cửa hàng (storefront)' },
    { value: 'sell', label: 'Thẻ giá (sell)' },
    { value: 'local_offer', label: 'Khuyến mãi (local_offer)' },
    { value: 'loyalty', label: 'Thành viên (loyalty)' },
    { value: 'card_membership', label: 'Thẻ VIP (card_membership)' }
  ],
  'Đời sống & Gia đình': [
    { value: 'pets', label: 'Thú cưng (pets)' },
    { value: 'smartphone', label: 'Điện thoại (smartphone)' },
    { value: 'laptop_chromebook', label: 'Máy tính (laptop_chromebook)' },
    { value: 'toys', label: 'Đồ chơi (toys)' },
    { value: 'chair', label: 'Ghế ngồi (chair)' },
    { value: 'bed', label: 'Phường ngủ (bed)' },
    { value: 'child_care', label: 'Mẹ & Bé (child_care)' },
    { value: 'soap', label: 'Xà phòng (soap)' },
    { value: 'cleaning_services', label: 'Dọn dẹp (cleaning_services)' }
  ],
  'Khác': [
    { value: 'category', label: 'Mặc định (category)' },
    { value: 'grid_view', label: 'Dạng lưới (grid_view)' },
    { value: 'star', label: 'Yêu thích (star)' },
    { value: 'schedule', label: 'Thời gian (schedule)' },
    { value: 'local_shipping', label: 'Vận chuyển (local_shipping)' },
    { value: 'location_on', label: 'Địa điểm (location_on)' }
  ]
};

const toSlug = (value = '') => {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

const AdminCategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [selectedIconTab, setSelectedIconTab] = useState<string>('Thực phẩm & Ăn uống');

  const filteredIcons = useMemo(() => {
    if (iconSearch.trim() !== '') {
      const query = iconSearch.toLowerCase();
      const all: any[] = [];
      Object.values(POPULAR_ICONS_BY_CATEGORY).forEach((list) => {
        list.forEach((item) => {
          if (
            item.value.toLowerCase().includes(query) ||
            item.label.toLowerCase().includes(query)
          ) {
            if (!all.some((x) => x.value === item.value)) {
              all.push(item);
            }
          }
        });
      });
      return all;
    }
    return (POPULAR_ICONS_BY_CATEGORY as any)[selectedIconTab] || [];
  }, [iconSearch, selectedIconTab]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, any>();
    categories.forEach((c: any) => {
      const key = String(c.id || c._id || '');
      if (key) map.set(key, c);
    });
    return map;
  }, [categories]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const result = await productService.getCategories({ include_inactive: true });
      setCategories(Array.isArray(result) ? result : []);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải danh mục');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(defaultForm);
  };

  const onEdit = (category: any) => {
    setEditingId(String(category.id || category._id));
    setForm({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      icon: category.icon || 'category',
      icon_type: category.icon_type || 'material_icon',
      icon_url: category.icon_url || '',
      icon_name: category.icon_name || category.icon || 'category',
      icon_emoji: category.icon_emoji || '',
      parent_id: category.parent_id ? String(category.parent_id) : '',
      sort_order: Number(category.sort_order || 0),
      is_active: category.is_active !== false,
    });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setForm((prev) => {
      const autoSlug = toSlug(newName);
      return {
        ...prev,
        name: newName,
        slug: prev.slug === toSlug(prev.name) ? autoSlug : prev.slug,
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const urls = await productService.uploadProductImages([file]);
      if (urls && urls.length > 0) {
        let relativeUrl = urls[0];
        // Strip API Host prefix if returned as absolute
        const host = import.meta.env.VITE_API_HOST || 'http://localhost:5000';
        if (relativeUrl.startsWith(host)) {
          relativeUrl = relativeUrl.substring(host.length);
        }
        setForm((prev) => ({ ...prev, icon_url: relativeUrl }));
        toast.success('Tải ảnh icon thành công');
      } else {
        toast.error('Không thể lấy URL ảnh từ phản hồi upload');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi upload ảnh');
    } finally {
      setUploading(false);
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Tên danh mục không được để trống');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || toSlug(form.name),
        description: form.description.trim(),
        icon: form.icon || 'category',
        icon_type: form.icon_type,
        icon_url: form.icon_url,
        icon_name: form.icon_name,
        icon_emoji: form.icon_emoji,
        parent_id: form.parent_id || null,
        sort_order: Number(form.sort_order || 0),
        is_active: Boolean(form.is_active),
      };

      if (editingId) {
        await productService.updateCategory(editingId, payload);
        toast.success('Đã cập nhật danh mục');
      } else {
        await productService.createCategory(payload);
        toast.success('Đã tạo danh mục');
      }

      resetForm();
      await loadCategories();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu danh mục');
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async (category: any) => {
    try {
      setSaving(true);
      await productService.updateCategory(String(category.id || category._id), {
        is_active: category.is_active === false,
      });
      await loadCategories();
      toast.success(category.is_active ? 'Đã ẩn danh mục' : 'Đã bật danh mục');
    } catch (err: any) {
      toast.error(err?.message || 'Không thể đổi trạng thái');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (category: any) => {
    if (!window.confirm(`Xóa danh mục "${category.name}"?`)) return;
    try {
      setSaving(true);
      await productService.deleteCategory(String(category.id || category._id));
      toast.success('Đã xóa danh mục');
      if (editingId === String(category.id || category._id)) resetForm();
      await loadCategories();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa danh mục');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-body text-slate-800 dark:text-slate-100 antialiased p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Quản lý Danh mục</h1>
          <p className="text-slate-500 text-sm">Cấu hình cây danh mục, tùy chọn icon thông minh (hình ảnh, emoji, material icon) và SEO slugs.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Create/Edit */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {editingId ? 'Cập nhật danh mục' : 'Tạo danh mục mới'}
            </h2>
            <form onSubmit={onSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  Tên danh mục <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleNameChange}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-slate-800 dark:text-slate-100"
                  placeholder="Ví dụ: Thực phẩm tươi sống"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  Slug (Đường dẫn SEO)
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: toSlug(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-slate-800 dark:text-slate-100"
                  placeholder="auto-generated-slug"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Danh mục cha
                  </label>
                  <select
                    value={form.parent_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, parent_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Không có (Danh mục gốc)</option>
                    {categories
                      .filter((c: any) => String(c.id || c._id) !== String(editingId || ''))
                      .map((c: any) => (
                        <option key={String(c.id || c._id)} value={String(c.id || c._id)}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Thứ tự sắp xếp (STT)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value || 0) }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-slate-800 dark:text-slate-100"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  Mô tả danh mục
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-slate-800 dark:text-slate-100 h-20 resize-none"
                  placeholder="Mô tả ngắn về nhóm danh mục này..."
                />
              </div>

              {/* Icon System Config */}
              <div className="border border-slate-100 dark:border-slate-700 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Thiết lập Icon</h3>
                  {/* Preview Box */}
                  <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Preview:</span>
                    <CategoryIcon category={form} className="w-6 h-6 text-primary" iconClass="material-symbols-outlined text-xl text-primary" size={24} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Loại Icon</label>
                  <select
                    value={form.icon_type}
                    onChange={(e) => setForm((prev) => ({ ...prev, icon_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary transition-all text-slate-800 dark:text-slate-100"
                  >
                    <option value="material_icon">Material Symbol Icon</option>
                    <option value="emoji">Emoji</option>
                    <option value="image">Hình ảnh tải lên</option>
                  </select>
                </div>

                {form.icon_type === 'material_icon' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Tên Icon tùy chỉnh (Material Symbol)</label>
                      <input
                        type="text"
                        value={form.icon_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, icon_name: e.target.value, icon: e.target.value }))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary transition-all text-slate-800 dark:text-slate-100 mb-2 font-mono"
                        placeholder="Ví dụ: eco, shopping_cart..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Chọn từ danh mục Icon</label>
                      <input
                        type="text"
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        placeholder="Tìm nhanh icon (ví dụ: giỏ hàng, rau, quả...)"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary transition-all text-slate-800 dark:text-slate-100"
                      />

                      {!iconSearch && (
                        <div className="flex flex-wrap gap-1 border-b border-slate-100 dark:border-slate-700 pb-2">
                          {Object.keys(POPULAR_ICONS_BY_CATEGORY).map((tab) => (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setSelectedIconTab(tab)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                selectedIconTab === tab
                                  ? 'bg-primary text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-100 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                        {filteredIcons.map((ico: any) => {
                          const isSelected = form.icon_name === ico.value;
                          return (
                            <button
                              key={ico.value}
                              type="button"
                              onClick={() => setForm((prev) => ({ ...prev, icon_name: ico.value, icon: ico.value }))}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-primary bg-primary/5 text-primary'
                                  : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-500'
                              }`}
                              title={ico.label}
                            >
                              <span className="material-symbols-outlined text-2xl">{ico.value}</span>
                              <span className="text-[9px] mt-1 truncate max-w-full text-center">{ico.label.split(' ')[0]}</span>
                            </button>
                          );
                        })}
                        {filteredIcons.length === 0 && (
                          <div className="col-span-full py-4 text-center text-xs text-slate-400">
                            Không tìm thấy icon nào phù hợp.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {form.icon_type === 'emoji' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nhập Emoji</label>
                    <input
                      type="text"
                      value={form.icon_emoji}
                      onChange={(e) => setForm((prev) => ({ ...prev, icon_emoji: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary transition-all text-slate-800 dark:text-slate-100"
                      placeholder="Nhập 1 emoji ví dụ: 🍎"
                      maxLength={10}
                    />
                  </div>
                )}

                {form.icon_type === 'image' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Đường dẫn Icon hình ảnh</label>
                      <input
                        type="text"
                        value={form.icon_url}
                        onChange={(e) => setForm((prev) => ({ ...prev, icon_url: e.target.value }))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary transition-all text-slate-800 dark:text-slate-100"
                        placeholder="Nhập đường dẫn ảnh hoặc tải lên phía dưới..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Hoặc tải file từ máy tính</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer"
                      />
                      {uploading && <p className="text-[10px] text-primary animate-pulse mt-1">Đang tải ảnh lên...</p>}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded border-slate-300 text-primary focus:ring-primary/20"
                  />
                  Kích hoạt hiển thị
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                  >
                    Đặt lại
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-lg shadow-primary/20"
                  >
                    {editingId ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* List Categories */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Danh sách danh mục ({categories.length})</h2>
            </div>
            {loading ? (
              <div className="p-12 text-center text-slate-400 animate-pulse font-medium">Đang tải cây danh mục...</div>
            ) : categories.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-medium">Chưa có danh mục nào được khởi tạo</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[640px] overflow-y-auto">
                {categories.map((category: any) => {
                  const id = String(category.id || category._id);
                  const parent = category.parent_id ? categoryMap.get(String(category.parent_id)) : null;
                  return (
                    <div key={id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shrink-0">
                          <CategoryIcon category={category} className="w-6 h-6 text-slate-500" iconClass="material-symbols-outlined text-xl text-slate-500" size={24} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{category.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                            {parent ? `Cha: ${parent.name}` : 'Danh mục gốc'}
                            {' • '}
                            STT: {Number(category.sort_order || 0)}
                            {category.slug && ` • Slug: ${category.slug}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEdit(category)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                          title="Sửa"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggle(category)}
                          className={`p-1.5 rounded-lg transition-colors ${category.is_active ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100'}`}
                          title={category.is_active ? 'Ẩn' : 'Bật'}
                        >
                          <span className="material-symbols-outlined text-[16px]">{category.is_active ? 'visibility' : 'visibility_off'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(category)}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                          title="Xóa"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCategoryManagement;
