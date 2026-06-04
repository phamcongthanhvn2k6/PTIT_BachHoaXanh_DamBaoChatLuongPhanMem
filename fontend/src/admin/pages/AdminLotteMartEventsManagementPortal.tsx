import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { dataService } from "../../services/dataService";

// ─── Types ─────────────────────────────────────────────
interface EventPost {
  id: string | number;
  title: string;
  slug: string;
  category_id: number;
  thumbnail: string;
  thumbnail_alt: string;
  excerpt: string;
  author_name: string;
  published_at: string;
  read_time: number;
  views: number;
  likes: number;
  tags: string[];
  start_date: string;
  end_date: string;
  is_featured: boolean;
  is_published?: boolean;
  status: string; // "draft" | "published" | "archived" | "scheduled" | "expired"
  created_at: string;
  updated_at: string;
  is_top_featured?: boolean;
  isTopFeatured?: boolean;
  readTime?: number;
  heroTitleOverride?: string;
  heroExcerptOverride?: string;
  heroImageOverride?: string;
  hero_override?: {
    title?: string;
    excerpt?: string;
    image?: string;
  };
}

interface EventCategory {
  id: number;
  name: string;
  slug: string;
}

type TabFilter = "all" | "published" | "draft" | "archived";
type SortOption = "newest" | "featured" | "views" | "likes";

// ─── Helpers ───────────────────────────────────────────
const formatNum = (n: number): string => {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
};

const toSlug = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const ITEMS_PER_PAGE = 5;

// ─── Component ─────────────────────────────────────────
const AdminLotteMartEventsManagementPortal: React.FC = () => {
  // Data State
  const [events, setEvents] = useState<EventPost[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters, Sort, Search, Pagination State
  const [activeStatus, setActiveStatus] = useState<TabFilter>("all");
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [currentPage, setCurrentPage] = useState(1);

  // Selection & Editor State
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<EventPost | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form Fields
  const [editTitle, setEditTitle] = useState("");
  const [editCategoryId, setEditCategoryId] = useState(2);
  const [editTags, setEditTags] = useState("");
  const [editExcerpt, setEditExcerpt] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editFeatured, setEditFeatured] = useState(false);
  const [editStatus, setEditStatus] = useState<"draft" | "published" | "archived">("draft");
  const [editThumbnail, setEditThumbnail] = useState("");
  const [editIsTopFeatured, setEditIsTopFeatured] = useState(false);
  const [editHeroTitleOverride, setEditHeroTitleOverride] = useState("");
  const [editHeroExcerptOverride, setEditHeroExcerptOverride] = useState("");
  const [editHeroImageOverride, setEditHeroImageOverride] = useState("");
  const [editReadTime, setEditReadTime] = useState(5);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: "", visible: false });
  const [confirmDelete, setConfirmDelete] = useState<string | number | null>(null);

  // ─── Load Data ───
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allPosts, cats] = await Promise.all([
        dataService.getAllEventPosts(),
        dataService.getEventCategories(),
      ]);
      // Ensure every event has a valid 'status' field (some mock data may lack it)
      const normalizedPosts = (allPosts as EventPost[]).map(p => ({
        ...p,
        status: p.status || (p.is_published ? "published" : "draft"),
        views: p.views || 0,
        likes: p.likes || 0,
        tags: p.tags || [],
        is_featured: p.is_featured || false,
      }));
      setEvents(normalizedPosts);
      setCategories(cats as EventCategory[]);
    } catch (_e) {
      showToastMsg("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Debounce Search ───
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ─── Reset Page on Filter/Sort Change ───
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set()); // optional: clear selection on filter change
  }, [debouncedSearch, activeStatus, activeCategory, sortBy]);

  // ─── Toast ───
  const showToastMsg = useCallback((msg: string) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast({ msg: "", visible: false }), 2500);
  }, []);

  // ─── Select Event → Populate Editor ───
  const handleSelectEvent = useCallback((ev: EventPost) => {
    setSelectedEvent(ev);
    setEditTitle(ev.title || "");
    setEditCategoryId(ev.category_id || 2);
    setEditTags((ev.tags || []).join(", "));
    setEditExcerpt(ev.excerpt || "");
    setEditStartDate(ev.start_date || "");
    setEditEndDate(ev.end_date || "");
    setEditFeatured(ev.is_featured || false);
    setEditStatus((ev.status as any) || "draft");
    setEditThumbnail(ev.thumbnail || "");
    
    // New properties
    setEditIsTopFeatured(ev.isTopFeatured || ev.is_top_featured || false);
    setEditHeroTitleOverride(ev.heroTitleOverride || ev.hero_override?.title || "");
    setEditHeroExcerptOverride(ev.heroExcerptOverride || ev.hero_override?.excerpt || "");
    setEditHeroImageOverride(ev.heroImageOverride || ev.hero_override?.image || "");
    setEditReadTime(ev.readTime || ev.read_time || 5);
    
    setShowCreateForm(false);
  }, []);

  // ─── Open Create Form ───
  const openCreateForm = () => {
    setSelectedEvent(null);
    setEditTitle("");
    setEditCategoryId((categories.length > 0 && categories[0].id !== 1) ? categories[0].id : 2);
    setEditTags("");
    setEditExcerpt("");
    setEditStartDate(new Date().toISOString().split("T")[0]);
    setEditEndDate("");
    setEditFeatured(false);
    setEditStatus("draft");
    setEditThumbnail("");
    
    // Reset new properties
    setEditIsTopFeatured(false);
    setEditHeroTitleOverride("");
    setEditHeroExcerptOverride("");
    setEditHeroImageOverride("");
    setEditReadTime(5);
    
    setShowCreateForm(true);
  };

  // ─── Validation ───
  const validateForm = useCallback(() => {
    if (!editTitle.trim()) { showToastMsg("Vui lòng nhập tiêu đề"); return false; }
    if (!editCategoryId) { showToastMsg("Vui lòng chọn danh mục"); return false; }
    if (editStartDate && editEndDate && new Date(editStartDate) > new Date(editEndDate)) {
      showToastMsg("Ngày kết thúc phải sau ngày bắt đầu");
      return false;
    }
    if (editIsTopFeatured && editStatus !== "published") {
      showToastMsg("Sự kiện Tiêu điểm (Hero Spotlight) bắt buộc phải hiển thị ở trạng thái Đã xuất bản");
      return false;
    }
    if (editIsTopFeatured && !editThumbnail && !editHeroImageOverride) {
      showToastMsg("Sự kiện Tiêu điểm bắt buộc phải có hình ảnh (Thumbnail hoặc Ảnh ghi đè)");
      return false;
    }
    return true;
  }, [editTitle, editCategoryId, editStartDate, editEndDate, editIsTopFeatured, editStatus, editThumbnail, editHeroImageOverride, showToastMsg]);

  const constructPayload = useCallback(() => ({
    title: editTitle.trim(),
    slug: toSlug(editTitle),
    category_id: editCategoryId,
    tags: editTags.split(",").map(t => t.trim()).filter(Boolean),
    excerpt: editExcerpt,
    start_date: editStartDate,
    end_date: editEndDate,
    is_featured: editFeatured,
    isTopFeatured: editIsTopFeatured,
    heroTitleOverride: editHeroTitleOverride.trim(),
    heroExcerptOverride: editHeroExcerptOverride.trim(),
    heroImageOverride: editHeroImageOverride.trim(),
    readTime: editReadTime,
    status: editStatus,
    is_published: editStatus === "published",
    thumbnail: editThumbnail,
  }), [editTitle, editCategoryId, editTags, editExcerpt, editStartDate, editEndDate, editFeatured, editIsTopFeatured, editHeroTitleOverride, editHeroExcerptOverride, editHeroImageOverride, editReadTime, editStatus, editThumbnail]);

  // ─── Create Event ───
  const handleCreate = useCallback(async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      await dataService.createEventPost(constructPayload());
      await loadData();
      setShowCreateForm(false);
      showToastMsg("Đã tạo sự kiện mới");
    } catch (_e) {
      showToastMsg("Lỗi tạo sự kiện");
    } finally {
      setSaving(false);
    }
  }, [validateForm, constructPayload, loadData, showToastMsg]);

  // ─── Update Event ───
  const handleUpdate = useCallback(async () => {
    if (!selectedEvent || !validateForm()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...constructPayload(),
        updated_at: new Date().toISOString()
      };
      // Auto-set published_at when transitioning to published
      if (editStatus === "published" && selectedEvent.status !== "published") {
        payload.published_at = new Date().toISOString();
      }
      // Auto-disable featured/top-featured if going to draft/archived (non-published events can't be featured on user page)
      if (editStatus !== "published") {
        if (editFeatured) {
          payload.is_featured = false;
          setEditFeatured(false);
        }
        if (editIsTopFeatured) {
          payload.isTopFeatured = false;
          payload.is_top_featured = false;
          setEditIsTopFeatured(false);
        }
      }
      await dataService.updateEventPost(selectedEvent.id, payload);
      await loadData();
      // Update selectedEvent state to reflect current reality in the editor
      setSelectedEvent(prev => prev ? { ...prev, ...payload } as EventPost : null);
      showToastMsg("Bài viết đã được cập nhật");
    } catch (_e) {
      showToastMsg("Lỗi cập nhật bài viết");
    } finally {
      setSaving(false);
    }
  }, [selectedEvent, validateForm, constructPayload, editStatus, editFeatured, editIsTopFeatured, loadData, showToastMsg]);

  // ─── Direct Delete Event ───
  const handleDeleteEvent = useCallback(async (id: string | number) => {
    try {
      await dataService.deleteEventPost(id);
      if (selectedEvent?.id === id) setSelectedEvent(null);
      setConfirmDelete(null);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await loadData();
      showToastMsg("Đã xóa sự kiện");
    } catch (_e) {
      showToastMsg("Lỗi xóa sự kiện");
    }
  }, [selectedEvent, loadData, showToastMsg]);

  // ─── Toggle Featured via Hero ───
  const handleToggleFeaturedHero = useCallback(async () => {
    const hero = events.find(e => e.is_featured && e.status === "published");
    if (!hero) return;
    await dataService.toggleEventFeatured(hero.id);
    await loadData();
    showToastMsg("Đã bỏ nổi bật");
  }, [events, loadData, showToastMsg]);

  // ─── Bulk Actions ───
  const handleBulkAction = useCallback(async (action: "delete" | "publish" | "archive") => {
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      const ids = Array.from(selectedIds);
      if (action === "delete") {
        await dataService.bulkDeleteEvents(ids);
      } else {
        const updates = { 
          status: action === "publish" ? "published" : "archived",
          is_published: action === "publish",
          updated_at: new Date().toISOString()
        };
        await Promise.all(ids.map(id => dataService.updateEventPost(id, updates)));
      }
      setSelectedIds(new Set());
      if (selectedEvent && selectedIds.has(selectedEvent.id)) {
        if (action === "delete") setSelectedEvent(null);
        else setEditStatus(action === "publish" ? "published" : "archived");
      }
      await loadData();
      const actionText = action === "delete" ? "xóa" : action === "publish" ? "xuất bản" : "lưu trữ";
      showToastMsg(`Đã ${actionText} ${ids.length} sự kiện`);
    } catch (_error) {
      showToastMsg("Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }, [selectedIds, selectedEvent, loadData, showToastMsg]);

  // ─── Selection ───
  const toggleSelect = (id: string | number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedEvents.length && paginatedEvents.length > 0) {
      // Deselect all on current page
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedEvents.forEach(e => next.delete(e.id));
        return next;
      });
    } else {
      // Select all on current page
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedEvents.forEach(e => next.add(e.id));
        return next;
      });
    }
  };

  // ─── Image Upload ───
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSaving(true);
      try {
        const url = await dataService.uploadEventImage(file);
        if (url) {
          setEditThumbnail(url);
          showToastMsg("Đã tải ảnh lên thành công");
        } else {
          showToastMsg("Không tải được ảnh lên");
        }
      } catch (err) {
        showToastMsg("Lỗi tải ảnh lên");
      } finally {
        setSaving(false);
      }
    }
  };

  // ─── Computed Filtering & Sorting ───
  const filteredEvents = useMemo(() => {
    let list = [...events];
    
    // Status Filter
    if (activeStatus !== "all") {
      list = list.filter(e => e.status === activeStatus);
    }
    
    // Category Filter
    if (activeCategory !== "all") {
      list = list.filter(e => e.category_id === activeCategory);
    }
    
    // Search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(e => 
        (e.title || "").toLowerCase().includes(q) || 
        (e.excerpt || "").toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    
    // Sort
    return list.sort((a, b) => {
      switch (sortBy) {
        case "featured":
          return (b.is_featured === a.is_featured) 
            ? new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
            : (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
        case "views":
          return (b.views || 0) - (a.views || 0);
        case "likes":
          return (b.likes || 0) - (a.likes || 0);
        case "newest":
        default:
          return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
      }
    });
  }, [events, activeStatus, activeCategory, debouncedSearch, sortBy]);

  // ─── Pagination ───
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / ITEMS_PER_PAGE));
  const paginatedEvents = useMemo(() => {
    return filteredEvents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredEvents, currentPage]);

  // ─── Analytics ───
  const totalViews = events.reduce((s, e) => s + (e.views || 0), 0);
  const totalLikes = events.reduce((s, e) => s + (e.likes || 0), 0);
  const featuredCount = events.filter(e => e.is_featured).length;
  const heroPost = events.find(e => e.is_featured && e.status === "published") || null;

  // ─── Helpers ───
  const getCatName = (catId: number) => categories.find(c => c.id === catId)?.name || "Sự kiện";
  
  const getStatusBadge = (status: string, featured?: boolean) => {
    const base = "px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-flex items-center justify-center leading-none";
    if (status === "published") return <span className={`${base} bg-green-100 text-green-700`}>Đã xuất bản</span>;
    if (status === "archived") return <span className={`${base} bg-slate-200 text-slate-800`}>Lưu trữ</span>;
    if (featured) return <span className={`${base} bg-amber-100 text-amber-700`}>Nổi bật</span>;
    return <span className={`${base} bg-slate-100 text-slate-500`}>Bản nháp</span>;
  };

  // ─── Loading / Empty state ───
  if (loading && events.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
        <p className="text-slate-500 font-medium">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <section className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-on-surface tracking-tight">Quản lý sự kiện</h2>
          <p className="text-on-secondary-container mt-1">Quản lý ấn phẩm, sự kiện, chương trình khuyến mãi hiển thị trên trang chủ</p>
        </div>
        <button
          onClick={openCreateForm}
          className="bg-primary hover:bg-primary-container text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          Tạo bài viết
        </button>
      </section>

      {/* Analytics Row */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-2xl flex items-center gap-5 transition-transform hover:scale-[1.02] border border-surface-container/50">
          <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">event_available</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tất cả bài viết</p>
            <h3 className="text-2xl font-black text-on-surface">{events.length}</h3>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-2xl flex items-center gap-5 transition-transform hover:scale-[1.02] border border-surface-container/50">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <span className="material-symbols-outlined text-3xl">visibility</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tổng lượt xem</p>
            <h3 className="text-2xl font-black text-on-surface">{formatNum(totalViews)}</h3>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-2xl flex items-center gap-5 transition-transform hover:scale-[1.02] border border-surface-container/50">
          <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-600">
            <span className="material-symbols-outlined text-3xl">favorite</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tổng yêu thích</p>
            <h3 className="text-2xl font-black text-on-surface">{formatNum(totalLikes)}</h3>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-2xl flex items-center gap-5 transition-transform hover:scale-[1.02] border border-surface-container/50">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <span className="material-symbols-outlined text-3xl">star</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nổi bật (Hero)</p>
            <h3 className="text-2xl font-black text-on-surface">{featuredCount}</h3>
          </div>
        </div>
      </section>

      {/* Hero Admin Section */}
      {heroPost && (
        <section className="bg-surface-container-lowest rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-sm border border-surface-container/50">
          <div className="md:w-1/2 h-64 md:h-auto relative">
            <img alt={heroPost.thumbnail_alt || heroPost.title} className="w-full h-full object-cover" src={heroPost.thumbnail || "https://placehold.co/800x400?text=Event"} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-6 left-6 flex items-center gap-2">
              <span className="bg-amber-400 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                Đang hiển thị Trang chủ
              </span>
            </div>
          </div>
          <div className="md:w-1/2 p-8 flex flex-col justify-center">
            <p className="text-primary font-bold text-sm mb-2">Sự kiện tiêu điểm tuần này</p>
            <h3 className="text-3xl font-black text-on-surface leading-tight mb-4">{heroPost.title}</h3>
            <p className="text-on-secondary-container mb-8 line-clamp-2">{heroPost.excerpt}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleFeaturedHero}
                className="bg-surface-container-high hover:bg-surface-dim text-on-surface px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined">visibility_off</span>
                Bỏ nổi bật
              </button>
              <button
                onClick={() => handleSelectEvent(heroPost)}
                className="border-2 border-primary/20 hover:border-primary text-primary px-6 py-2.5 rounded-xl font-bold transition-colors shadow-sm"
              >
                Chỉnh sửa bài viết
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left: Event List */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Controls Bar */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container/50 p-4 flex flex-col gap-4 lg:flex-row lg:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-sm flex items-center">
              <div className="absolute left-0 top-0 h-full w-10 flex items-center justify-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-[20px] leading-none block">search</span>
              </div>
              <input
                className="w-full bg-surface-container-low border-none rounded-xl py-2.5 pl-9 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Tìm tiêu đề, tags, nội dung..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Dropdown */}
              <select 
                className="bg-surface-container-low border-none rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                value={activeCategory}
                onChange={e => setActiveCategory(e.target.value === "all" ? "all" : Number(e.target.value))}
              >
                <option value="all">Tất cả danh mục</option>
                {categories.filter(c => c.id !== 1).map((c, idx) => (
                  <option key={`cat-filter-${c.id ?? (c as any)._id ?? idx}`} value={c.id || (c as any)._id}>{c.name}</option>
                ))}
              </select>

              {/* Sort Dropdown */}
              <select
                className="bg-surface-container-low border-none rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
              >
                <option value="newest">Mới nhất</option>
                <option value="featured">Nổi bật</option>
                <option value="views">Lượt xem cao</option>
                <option value="likes">Yêu thích cao</option>
              </select>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container/50 overflow-hidden">
            {/* Contextual Tabs */}
            <div className="p-4 border-b border-surface-container flex bg-surface-bright/50 overflow-x-auto hide-scrollbar">
              <div className="flex bg-surface-container rounded-lg p-1 min-w-max">
                {(["all", "published", "draft", "archived"] as TabFilter[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveStatus(tab)}
                    className={`px-5 py-2 rounded-md text-xs font-bold transition-all ${
                      activeStatus === tab 
                      ? "bg-white shadow-sm text-primary" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                    }`}
                  >
                    {tab === "all" ? "Tất cả" : tab === "published" ? "Đã đăng" : tab === "archived" ? "Lưu trữ" : "Bản nháp"}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low/30 border-b border-surface-container">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        className="rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                        type="checkbox"
                        checked={paginatedEvents.length > 0 && selectedIds.size > 0 && Array.from(selectedIds).some(id => paginatedEvents.find(pe => pe.id === id))}
                        ref={input => {
                          if (input) {
                            const pageSelected = paginatedEvents.filter(e => selectedIds.has(e.id)).length;
                            input.indeterminate = pageSelected > 0 && pageSelected < paginatedEvents.length;
                          }
                        }}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sự kiện</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Lượt xem</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Yêu thích</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trạng thái</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container/50">
                  {paginatedEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-16 text-center text-slate-400">
                        <span className="material-symbols-outlined text-5xl mb-3 block opacity-20">inventory_2</span>
                        <p className="font-medium text-slate-500">Không tìm thấy bài viết nào phù hợp.</p>
                        <button onClick={openCreateForm} className="mt-4 text-primary font-bold hover:underline">Tạo bài viết mới</button>
                      </td>
                    </tr>
                  ) : (
                    paginatedEvents.map((ev, idx) => {
                      const isSelected = selectedEvent?.id === ev.id;
                      const isChecked = selectedIds.has(ev.id);
                      return (
                        <tr
                          key={`event-${ev.id ?? (ev as any)._id ?? idx}`}
                          onClick={() => handleSelectEvent(ev)}
                          className={`hover:bg-surface-bright transition-colors group cursor-pointer ${
                            isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""
                          }`}
                        >
                          <td className="p-4" onClick={e => e.stopPropagation()}>
                            <input
                              className="rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelect(ev.id)}
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 flex items-center justify-center relative">
                                {ev.thumbnail ? (
                                  <img alt={ev.title} className="w-full h-full object-cover" src={ev.thumbnail} />
                                ) : (
                                  <span className="material-symbols-outlined text-slate-300">image</span>
                                )}
                                {ev.is_featured && ev.status === "published" && (
                                  <div className="absolute top-0 right-0 p-0.5 bg-amber-400 rounded-bl shadow-sm">
                                    <span className="material-symbols-outlined text-[8px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-on-surface line-clamp-1 group-hover:text-primary transition-colors">{ev.title}</p>
                                <p className="text-xs text-slate-500">{getCatName(ev.category_id)} • {ev.start_date || (ev.created_at || "").split("T")[0]}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right font-medium text-slate-600">{formatNum(ev.views || 0)}</td>
                          <td className="p-4 text-right font-medium text-slate-600">{formatNum(ev.likes || 0)}</td>
                          <td className="p-4">
                            {getStatusBadge(ev.status, ev.is_featured)}
                          </td>
                          <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleSelectEvent(ev)} className="p-2 hover:bg-surface-container rounded-lg text-primary transition-all tooltip-trigger" title="Chỉnh sửa">
                                <span className="material-symbols-outlined text-sm">edit</span>
                              </button>
                              <button onClick={() => setConfirmDelete(ev.id)} className="p-2 hover:bg-surface-container rounded-lg text-red-500 transition-all tooltip-trigger" title="Xóa">
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredEvents.length > 0 && (
              <div className="p-4 border-t border-surface-container flex items-center justify-between bg-surface-bright/30">
                <p className="text-xs text-slate-500 font-medium">
                  Hiển thị <span className="font-bold text-slate-700">{(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredEvents.length)}</span> trong <span className="font-bold text-slate-700">{filteredEvents.length}</span> kết quả
                </p>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  <span className="text-xs font-bold text-slate-700 min-w-[3rem] text-center">Trang {currentPage}/{totalPages}</span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="flex gap-4 p-4 bg-surface-container-lowest border border-primary/20 rounded-2xl shadow-sm items-center justify-between animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">{selectedIds.size}</div>
                <span className="text-sm font-bold text-on-surface">bài viết được chọn</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction("publish")}
                  className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-green-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">publish</span>
                  Xuất bản
                </button>
                <button
                  onClick={() => handleBulkAction("archive")}
                  className="bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-300 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">archive</span>
                  Lưu trữ
                </button>
                <div className="w-[1px] h-6 bg-slate-300 mx-1 self-center"></div>
                <button
                  onClick={() => handleBulkAction("delete")}
                  className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-red-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Xóa
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Advanced Editor */}
        <div className="col-span-12 lg:col-span-4">
          <div className="sticky top-24 bg-surface-container-lowest rounded-2xl shadow-lg border border-surface-container/80 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-black text-on-surface">
                {showCreateForm ? "Tạo bài viết mới" : selectedEvent ? "Trình chỉnh sửa" : "Trình chỉnh sửa"}
              </h4>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${showCreateForm ? "bg-green-100 text-green-700" : selectedEvent ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"}`}>
                {showCreateForm ? "NEW" : selectedEvent ? "QUICK EDIT" : "EMPTY"}
              </span>
            </div>

            {!selectedEvent && !showCreateForm ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <span className="material-symbols-outlined text-4xl mb-3 block opacity-30">touch_app</span>
                <p className="text-sm font-medium">Bấm vào sự kiện bên trái<br/>hoặc nhấn "Tạo bài viết" để bắt đầu.</p>
                <button onClick={openCreateForm} className="mt-4 px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg text-xs hover:bg-primary/20 transition-colors">Tạo Bài Mới</button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
                
                {/* Live Preview Bar */}
                {selectedEvent && !showCreateForm && (
                  <div className="flex items-center gap-3 p-3 bg-surface-bright rounded-xl border border-surface-container text-xs shadow-sm">
                     <span className="material-symbols-outlined animate-pulse text-green-500 text-lg">sensors</span>
                     <span className="font-medium text-slate-600 flex-1">Đang chỉnh sửa: <strong className="text-on-surface line-clamp-1">{editTitle || "Chưa có tiêu đề"}</strong></span>
                  </div>
                )}

                {/* Status Dropdown */}
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                      Trạng thái hiển thị
                      {getStatusBadge(editStatus, editFeatured)}
                    </label>
                    <select
                      className="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value as any)}
                    >
                      <option value="draft">Bản nháp (Ẩn)</option>
                      <option value="published">Đã xuất bản (Hiện thị web)</option>
                      <option value="archived">Lưu trữ (Đã kết thúc)</option>
                    </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tiêu đề <span className="text-red-500">*</span></label>
                  <input
                    className="w-full bg-surface-container-low border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary/20 focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="Nhập tiêu đề chương trình..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Hình ảnh (Thumbnail)</label>
                    <div className="flex gap-3 items-end">
                      <div className="w-16 h-16 rounded-lg bg-surface-container-low border border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                        {editThumbnail ? (
                          <>
                           <img src={editThumbnail} alt="Preview" className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => setEditThumbnail("")}>
                             <span className="material-symbols-outlined text-white text-sm">close</span>
                           </div>
                          </>
                        ) : (
                          <span className="material-symbols-outlined text-slate-400">add_photo_alternate</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                         <input 
                           type="text" 
                           placeholder="Dán URL ảnh..." 
                           className="w-full bg-surface-container-low border border-transparent rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:border-primary/20 focus:ring-1 focus:ring-primary/10 outline-none transition-all"
                           value={editThumbnail}
                           onChange={(e) => setEditThumbnail(e.target.value)}
                         />
                         <button 
                           onClick={() => fileInputRef.current?.click()}
                           className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                         >
                           <span className="material-symbols-outlined text-xs">upload</span> Tải lên từ máy
                         </button>
                         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Danh mục <span className="text-red-500">*</span></label>
                  <select
                    className="w-full bg-surface-container-low border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary/20 focus:ring-2 focus:ring-primary/10 outline-none appearance-none transition-all cursor-pointer"
                    value={editCategoryId}
                    onChange={e => setEditCategoryId(Number(e.target.value))}
                  >
                    {categories.filter(c => c.id !== 1).map((cat, idx) => (
                      <option key={`cat-edit-${cat.id ?? (cat as any)._id ?? idx}`} value={cat.id || (cat as any)._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Thẻ (Tags)</label>
                  <input
                    className="w-full bg-surface-container-low border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary/20 focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                    placeholder="Khuyến mãi, Lotte Mart, Cuối tuần..."
                    type="text"
                    value={editTags}
                    onChange={e => setEditTags(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 pl-1">Phân cách các thẻ bằng dấu phẩy (,)</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Mô tả ngắn gọn</label>
                  <textarea
                    className="w-full bg-surface-container-low border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary/20 focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all custom-scrollbar"
                    rows={3}
                    value={editExcerpt}
                    onChange={e => setEditExcerpt(e.target.value)}
                    placeholder="Hiển thị ở trang danh sách..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Bắt đầu</label>
                    <input
                      className="w-full bg-surface-container-low border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary/20 focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                      type="date"
                      value={editStartDate}
                      onChange={e => setEditStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kết thúc</label>
                    <input
                      className="w-full bg-surface-container-low border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary/20 focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                      type="date"
                      value={editEndDate}
                      onChange={e => setEditEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Toggle Featured */}
                <div
                  className="flex items-center justify-between p-4 rounded-xl border cursor-pointer select-none transition-all mt-6"
                  style={{ background: editFeatured ? "rgba(245, 158, 11, 0.05)" : "rgba(248, 250, 252, 1)", borderColor: editFeatured ? "rgba(245, 158, 11, 0.2)" : "rgba(226, 232, 240, 1)" }}
                  onClick={() => setEditFeatured(prev => !prev)}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: editFeatured ? "#f59e0b" : "#94a3b8" }}>stars</span>
                    <div>
                      <span className={`text-sm font-bold block ${editFeatured ? "text-amber-600" : "text-slate-500"}`}>Đánh dấu nổi bật</span>
                      <span className="text-[10px] text-slate-400">Hiển thị to trên banner trang chủ</span>
                    </div>
                  </div>
                  <div className={`w-11 h-6 rounded-full relative transition-colors ${editFeatured ? "bg-amber-500" : "bg-slate-300"}`}>
                    <div className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow transition-all ${editFeatured ? "left-[22px]" : "left-[2px]"}`}></div>
                  </div>
                </div>

                {/* Toggle Top Featured */}
                <div
                  className="flex items-center justify-between p-4 rounded-xl border cursor-pointer select-none transition-all mt-4"
                  style={{ background: editIsTopFeatured ? "rgba(220, 38, 38, 0.05)" : "rgba(248, 250, 252, 1)", borderColor: editIsTopFeatured ? "rgba(220, 38, 38, 0.2)" : "rgba(226, 232, 240, 1)" }}
                  onClick={() => {
                    setEditIsTopFeatured(prev => {
                      const next = !prev;
                      if (next) {
                        setEditFeatured(true);
                        setEditStatus("published");
                      }
                      return next;
                    });
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: editIsTopFeatured ? "#dc2626" : "#94a3b8" }}>campaign</span>
                    <div>
                      <span className={`text-sm font-bold block ${editIsTopFeatured ? "text-red-650" : "text-slate-500"}`}>Đánh dấu Tiêu điểm (Spotlight Hero)</span>
                      <span className="text-[10px] text-slate-400">Hiển thị nổi bật nhất ở đầu trang sự kiện (Chỉ duy nhất 1 bài viết)</span>
                    </div>
                  </div>
                  <div className={`w-11 h-6 rounded-full relative transition-colors ${editIsTopFeatured ? "bg-red-600" : "bg-slate-300"}`}>
                    <div className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow transition-all ${editIsTopFeatured ? "left-[22px]" : "left-[2px]"}`}></div>
                  </div>
                </div>

                {/* Read Time Input */}
                <div className="mt-4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Thời gian đọc (phút)</label>
                  <input
                    className="w-full bg-surface-container-low border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary/20 focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                    type="number"
                    min={1}
                    value={editReadTime}
                    onChange={e => setEditReadTime(Math.max(1, Number(e.target.value) || 1))}
                    placeholder="Thời gian đọc ước tính..."
                  />
                </div>

                {/* Hero Overrides Card */}
                {editIsTopFeatured && (
                  <div className="bg-red-50/20 dark:bg-red-950/10 p-5 rounded-2xl border border-red-100 dark:border-red-900/50 space-y-4 animate-in slide-in-from-top-2 mt-4">
                    <h5 className="text-xs font-bold text-red-650 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">edit_note</span>
                      Ghi đè nội dung Hero (Tùy chọn)
                    </h5>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 leading-relaxed">
                      Các trường này cho phép thay đổi thông tin hiển thị riêng trên banner tiêu điểm mà không ảnh hưởng tới nội dung bài viết gốc.
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tiêu đề Hero ghi đè</label>
                        <input
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                          type="text"
                          value={editHeroTitleOverride}
                          onChange={e => setEditHeroTitleOverride(e.target.value)}
                          placeholder="Bỏ trống để dùng tiêu đề gốc..."
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tóm tắt Hero ghi đè</label>
                        <textarea
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-red-500/20 outline-none resize-none transition-all"
                          rows={3}
                          value={editHeroExcerptOverride}
                          onChange={e => setEditHeroExcerptOverride(e.target.value)}
                          placeholder="Bỏ trống để dùng mô tả ngắn gốc..."
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ảnh Hero ghi đè (URL)</label>
                        <input
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                          type="text"
                          value={editHeroImageOverride}
                          onChange={e => setEditHeroImageOverride(e.target.value)}
                          placeholder="Bỏ trống để dùng ảnh gốc..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6 flex flex-col gap-3 border-t border-surface-container mt-6">
                  {showCreateForm ? (
                    <button
                      onClick={handleCreate}
                      disabled={saving}
                      className="w-full min-h-[48px] bg-primary hover:bg-primary-container text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      {saving ? (
                        <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> Đang xử lý...</>
                      ) : (
                        <><span className="material-symbols-outlined text-sm">add_circle</span> Lưu Bài Viết Mới</>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleUpdate}
                        disabled={saving}
                        className="w-full min-h-[48px] bg-primary hover:bg-primary-container text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                         {saving ? (
                          <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> Đang xử lý...</>
                        ) : (
                          <><span className="material-symbols-outlined text-sm">save</span> Cập nhật thay đổi</>
                        )}
                      </button>
                      <div className="flex gap-3">
                        <button
                          onClick={() => selectedEvent && setConfirmDelete(selectedEvent.id)}
                          disabled={saving || !selectedEvent}
                          className="flex-1 bg-white border border-red-200 text-red-600 py-3 rounded-xl text-sm font-bold hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          Xóa bài
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl z-[100] transition-all duration-500 ease-out ${
          toast.visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-sm font-bold">check</span>
        </div>
        <p className="text-sm font-semibold tracking-wide">{toast.msg}</p>
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-6">
               <span className="material-symbols-outlined text-3xl">delete_forever</span>
            </div>
            <div className="text-center mb-8">
              <h3 className="text-xl font-black text-slate-900 mb-2">Xác nhận xóa vĩnh viễn?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Hành động này không thể hoàn tác. Sự kiện sẽ bị xóa khỏi hệ thống admin và ẩn hoàn toàn trên trang người dùng.
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setConfirmDelete(null)} 
                className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
               >
                 Hủy bỏ
               </button>
              <button 
                onClick={() => handleDeleteEvent(confirmDelete)} 
                className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-red-600 text-white shadow-lg shadow-red-600/30 hover:bg-red-700 hover:shadow-xl hover:shadow-red-600/40 active:scale-95 transition-all"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLotteMartEventsManagementPortal;