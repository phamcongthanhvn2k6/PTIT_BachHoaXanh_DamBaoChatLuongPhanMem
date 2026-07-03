import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { eventService } from '../services/eventService';
import { toast } from '../components/Toast/toastEvent';
import { useAppSelector } from '../store';
import UserAvatar from '../components/UserAvatar/UserAvatar';

/* ─── Lightbox ───────────────────────────────────────────────── */
const Lightbox: React.FC<{ images: string[]; index: number; onClose: () => void }> = ({ images, index, onClose }) => {
  const [cur, setCur] = useState(index);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCur(p => Math.min(p + 1, images.length - 1));
      if (e.key === 'ArrowLeft') setCur(p => Math.max(p - 1, 0));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [images.length, onClose]);
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-6 right-6 text-white/80 hover:text-white z-10" aria-label="Đóng">
        <span className="material-symbols-outlined text-3xl">close</span>
      </button>
      <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
        <img src={images[cur]} alt="" className="w-full max-h-[80vh] object-contain rounded-xl" />
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <button disabled={cur === 0} onClick={() => setCur(p => p - 1)} className="text-white disabled:opacity-30"><span className="material-symbols-outlined text-3xl">chevron_left</span></button>
            <span className="text-white text-sm font-medium">{cur + 1} / {images.length}</span>
            <button disabled={cur === images.length - 1} onClick={() => setCur(p => p + 1)} className="text-white disabled:opacity-30"><span className="material-symbols-outlined text-3xl">chevron_right</span></button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Time ago helper ────────────────────────────────────────── */
const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(d).toLocaleDateString('vi-VN');
};

const EventDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAppSelector(s => s.auth);

  const [post, setPost] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [postDetail, setPostDetail] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Lightbox
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  // Likes
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  // Comment input
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);

  const [pdfLoading, setPdfLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  // Actions Menu
  const [showMoreActions, setShowMoreActions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMoreActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cats] = await Promise.all([dataService.getEventCategories()]);
        const formattedCats = cats.map((c: any) => typeof c === 'object' ? c : { id: c, name: String(c).charAt(0).toUpperCase() + String(c).slice(1) });
        setCategories(formattedCats);

        const found = await eventService.getEventDetail(id || '');
        if (!found) { setNotFound(true); setLoading(false); return; }
        setPost(found);
        setLikesCount(found.likes || 0);

        const postId = found.id || found._id;
        const [detail, cmts, related] = await Promise.all([
          dataService.getEventPostDetail(postId),
          dataService.getEventComments(postId),
          dataService.getRelatedEventPosts(postId),
        ]);
        setPostDetail(detail);
        
        // Enhance with real like state if user is logged in
        setIsLiked(Array.isArray(found.liked_by) && user ? found.liked_by.includes(user.id || user._id) : false);

        const enhancedCmts = cmts.map(c => ({
          ...c,
          isLiked: Array.isArray(c.liked_by) && user ? c.liked_by.includes(user.id || user._id) : false,
          likes: c.likes || 0
        }));
        setComments(enhancedCmts);
        setRelatedPosts(related);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
    window.scrollTo(0, 0);
  }, [id]);

  // ─── PDF Export ───────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (!printRef.current || !post) return;
    setPdfLoading(true);
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = pdfW / imgW;
      const scaledH = imgH * ratio;
      let y = 0;
      while (y < scaledH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -y, pdfW, scaledH);
        y += pdfH;
      }
      pdf.save(`${post.slug || post.id || post._id}.pdf`);
      toast.success('Đã tải PDF thành công!');
    } catch (e: any) {
      console.error(e);
      toast.error('Không thể tạo PDF. Đang mở chế độ in...');
      window.print();
    } finally {
      setPdfLoading(false);
    }
  };

  // ─── Interaction ──────────────────────────────────────────────
  const handleToggleLike = async () => {
    if (!user) {
      toast.error(t('event.loginRequired', 'Vui lòng đăng nhập để thực hiện'));
      return;
    }
    if (!post) return;
    
    const postId = post.id || post._id;
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikesCount(p => newLiked ? p + 1 : Math.max(0, p - 1));
    
    try {
      await dataService.toggleEventLike(postId);
    } catch {
      // Revert on error
      setIsLiked(!newLiked);
      setLikesCount(p => !newLiked ? p + 1 : Math.max(0, p - 1));
      toast.error('Lỗi khi thích bài viết');
    }
  };

  // ─── Comment submit ───────────────────────────────────────────
  const handleAddComment = async () => {
    if (!user) {
      toast.error(t('event.loginRequired', 'Vui lòng đăng nhập để thực hiện'));
      return;
    }
    if (!commentText.trim() || !post) return;
    setCommentLoading(true);
    try {
      const newComment = await dataService.addEventComment({
        post_id: post.id || post._id,
        user_id: user.id || user._id,
        user_name: user.full_name || user.username || 'Khách',
        user_avatar: user.avatar || '',
        content: commentText.trim(),
        parent_id: replyingTo?.id || replyingTo?._id || null,
      });
      setComments(prev => [...prev, { ...newComment, isLiked: false, likes: 0 }]);
      setCommentText('');
      setReplyingTo(null);
      toast.success(t('event.sendCommentSuccess', 'Đã đăng bình luận!'));
    } catch {
      toast.error(t('event.sendCommentError', 'Không thể đăng bình luận'));
    } finally {
      setCommentLoading(false);
    }
  };

  const handleLikeComment = async (cmtId: string | number) => {
    if (!user) {
      toast.error(t('event.loginRequired', 'Vui lòng đăng nhập để thực hiện'));
      return;
    }
    if (!post) return;

    // Optimistic update
    setComments(prev => prev.map(c => {
      if (c.id === cmtId || c._id === cmtId) {
        return { ...c, likes: (c.likes || 0) + (c.isLiked ? -1 : 1), isLiked: !c.isLiked };
      }
      return c;
    }));

    try {
      await dataService.toggleCommentLike(post.id || post._id, cmtId);
    } catch {
      // Revert on error
      setComments(prev => prev.map(c => {
        if (c.id === cmtId || c._id === cmtId) {
          return { ...c, likes: (c.likes || 0) + (c.isLiked ? -1 : 1), isLiked: !c.isLiked };
        }
        return c;
      }));
      toast.error('Lỗi khi thích bình luận');
    }
  };

  // ─── Block renderer ───────────────────────────────────────────
  const renderBlock = (block: any, idx: number) => {
    switch (block.type) {
      case 'title':
        return <h2 key={idx} className="text-3xl font-bold text-slate-900 dark:text-white mb-8">{block.text}</h2>;
      case 'section_title':
        return <h3 key={idx} className="text-2xl font-bold text-slate-900 dark:text-white mt-12 mb-6">{block.text}</h3>;
      case 'paragraph':
      case 'intro':
        return <p key={idx} className="text-base text-slate-700 dark:text-slate-300 leading-relaxed mb-8">{block.text}</p>;
      case 'list':
        return (
          <ul key={idx} className="list-disc pl-6 space-y-3 mb-8 text-slate-700 dark:text-slate-300">
            {block.items.map((item: string, i: number) => <li key={i}>{item}</li>)}
          </ul>
        );
      case 'ingredients':
        return (
          <div key={idx} className="mb-10">
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">grocery</span>
              Nguyên liệu cần chuẩn bị
            </h4>
            <ul className="list-disc pl-6 space-y-3 text-slate-700 dark:text-slate-300">
              {block.items.map((item: string, i: number) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        );
      case 'steps':
        return (
          <div key={idx} className="mb-12">
            <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">format_list_numbered</span>
              Cách thực hiện chi tiết
            </h4>
            <div className="space-y-8">
              {block.items.map((step: any, i: number) => (
                <div key={i} className="flex gap-6">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl">{i + 1}</div>
                  <div>
                    <h5 className="font-bold text-lg mb-2">{step.title}</h5>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'tips':
        return (
          <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 mb-10">
            <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
              Mẹo hay từ Bách hóa XANH
            </h4>
            <ul className="space-y-4">
              {block.items.map((tip: string, i: number) => (
                <li key={i} className="flex gap-3">
                  <span className="material-symbols-outlined text-primary mt-0.5">check_circle</span>
                  <span className="text-slate-700 dark:text-slate-300">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      case 'image':
        return (
          <div key={idx} className="my-12">
            <img
              src={block.url}
              alt={block.alt || ''}
              className="w-full rounded-2xl shadow-xl cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => { setLightboxImages([block.url]); setLightboxIndex(0); }}
            />
          </div>
        );
      case 'gallery':
        return (
          <div key={idx} className="grid grid-cols-2 md:grid-cols-2 gap-4 my-12">
            {block.images.map((url: string, i: number) => (
              <img
                key={i}
                src={url}
                alt={`Gallery ${i + 1}`}
                className="rounded-2xl shadow-md w-full cursor-pointer hover:opacity-90 transition-opacity aspect-video object-cover"
                onClick={() => { setLightboxImages(block.images); setLightboxIndex(i); }}
              />
            ))}
          </div>
        );
      case 'cta':
        return (
          <div key={idx} className="my-12 text-center">
            <Link
              to={block.url || '/'}
              className="inline-flex items-center px-10 py-5 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all text-lg shadow-xl shadow-primary/30"
            >
              {block.text} <span className="material-symbols-outlined ml-3">arrow_forward</span>
            </Link>
          </div>
        );
      case 'quote':
        return (
          <blockquote key={idx} className="border-l-4 border-primary pl-6 my-8 italic text-slate-600 dark:text-slate-400 text-lg">
            {block.text}
          </blockquote>
        );
      default:
        return null;
    }
  };

  const category = categories.find((c: any) => c.id === post?.category || c.id === post?.category_id);
  const formatDate = (d?: string) => { if (!d) return ''; try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return d; } };
  const formatPeriod = (start?: string, end?: string) => {
    if (!start && !end) return '';
    const s = start ? new Date(start).toLocaleDateString('vi-VN') : '';
    const e = end ? new Date(end).toLocaleDateString('vi-VN') : '';
    if (s && e) return `${s} - ${e}`;
    if (s) return `${s} ${t('event.ongoing')}`;
    return e;
  };

  // ─── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse">
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 mb-16">
            <div className="lg:col-span-4 aspect-video bg-slate-200 dark:bg-slate-700 rounded-xl" />
            <div className="lg:col-span-6 space-y-4">
              <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
              <div className="h-10 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          </div>
          <div className="max-w-[720px] mx-auto space-y-6">
            {[1,2,3,4].map(i => <div key={i} className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />)}
          </div>
        </div>
      </main>
    );
  }

  // ─── 404 ──────────────────────────────────────────────────────
  if (notFound || !post) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">article</span>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{t('event.notFound')}</h1>
        <p className="text-slate-500 mb-6">{t('event.notExist')}</p>
        <Link to="/featured-events" className="px-6 py-3 bg-primary text-white rounded-full font-bold hover:opacity-90 transition-opacity">{t('event.backToList')}</Link>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-8 flex-wrap" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary transition-colors">{t('common.home')}</Link>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <Link to="/featured-events" className="hover:text-primary transition-colors">{t('event.featured')}</Link>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]">{post.title}</span>
      </nav>

      {/* Printable content ref */}
      <div ref={printRef}>
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-center mb-16">
          <div className="lg:col-span-4">
            <div className="aspect-video rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 bg-slate-200">
              <img
                alt={post.thumbnail_alt || post.title}
                className="w-full h-full object-cover"
                src={post.thumbnail || 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600'}
              />
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-block px-3 py-1 bg-primary text-white text-xs font-bold rounded-full tracking-wider">
                  {category?.name?.toUpperCase() || 'SỰ KIỆN'}
                </span>
                {post.is_featured && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-400 text-slate-900 text-xs font-bold rounded-full">
                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>{t('event.isFeatured')}</span>
                )}
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold leading-tight text-slate-900 dark:text-white mb-4">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                <div className="flex items-center gap-2">
                  {post.author_avatar && <img src={post.author_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />}
                  <span>{post.author_name || 'Ban Quản Trị Bách hóa XANH'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">calendar_today</span>
                  <span>{formatDate(post.published_at) || formatPeriod(post.start_date, post.end_date)}</span>
                </div>
                {post.read_time && (
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">schedule</span>
                    <span>{post.read_time} {t('event.readTime')}</span>
                  </div>
                )}
                {post.views != null && (
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">visibility</span>
                    <span>{post.views.toLocaleString()} {t('event.views')}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base" style={isLiked ? { fontVariationSettings: "'FILL' 1", color: '#E60012' } : {}}>favorite</span>
                  <span className={isLiked ? 'text-primary font-bold' : ''}>{likesCount.toLocaleString()}</span>
                </div>
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map((tag: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Event period */}
              {(post.start_date || post.end_date) && (
                <div className="flex items-center gap-2 text-sm text-primary font-medium bg-primary/5 dark:bg-primary/10 px-4 py-2 rounded-lg w-fit">
                  <span className="material-symbols-outlined text-base">event</span>
                  {t('event.applyPeriod')}: {formatPeriod(post.start_date, post.end_date)}
                </div>
              )}

              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mt-4">
                {post.excerpt}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 mt-4 print:hidden">
              <a
                href="#content"
                className="flex items-center justify-center px-6 py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-md shadow-primary/20"
              >{t('event.readArticle')}</a>
              
              <button
                onClick={handleToggleLike}
                className={`flex items-center justify-center px-6 py-3 border-2 font-bold rounded-xl transition-colors gap-2 ${isLiked ? 'bg-red-50 text-primary border-primary/20 dark:bg-red-900/20 dark:border-primary/30' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <span className="material-symbols-outlined text-xl" style={isLiked ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span>
                {isLiked ? t('event.liked') : t('event.like')}
              </button>

              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success(t('event.copyLinkSuccess')); }}
                className="flex items-center justify-center px-6 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors gap-2"
                aria-label="Chia sẻ bài viết"
              >
                <span className="material-symbols-outlined text-xl">share</span>{t('common.share')}
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMoreActions(!showMoreActions)}
                  className="flex items-center justify-center w-12 h-12 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Thêm tùy chọn"
                >
                  <span className="material-symbols-outlined text-xl">more_vert</span>
                </button>
                
                {showMoreActions && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden z-20 origin-top-right animate-in fade-in slide-in-from-top-2">
                    <button
                      onClick={() => { setShowMoreActions(false); toast.success(t('event.addedToCalendar')); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">calendar_add_on</span>
                      {t('event.addToCalendar')}
                    </button>
                    <button
                      onClick={() => { setShowMoreActions(false); handleExportPDF(); }}
                      disabled={pdfLoading}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                      {pdfLoading ? t('event.sending') : t('event.savePdf')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Content Area */}
        <article id="content" className="max-w-[720px] mx-auto content-area prose prose-slate dark:prose-invert max-w-none">
          {postDetail?.content_blocks && Array.isArray(postDetail.content_blocks) ? (
            postDetail.content_blocks.map(renderBlock)
          ) : (
            <>
              <p className="text-slate-700 dark:text-slate-300 mb-8 text-base leading-relaxed">
                {post.excerpt || 'Nội dung chi tiết đang được cập nhật...'}
              </p>
            </>
          )}
        </article>
      </div>
      {/* end printRef */}

      {/* ──────── Comments Section ──────── */}
      <section id="comments" className="max-w-[720px] mx-auto mt-16 pt-10 border-t border-slate-200 dark:border-slate-800 print:hidden">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">chat_bubble</span>
          {t('event.comments')} ({comments.length})
        </h2>

        {/* Comment input */}
        <div className="flex gap-4 mb-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          {user ? (
            <UserAvatar
              src={user.avatar}
              name={user.full_name || user.username || 'User'}
              size={40}
              userId={user.id || user._id}
              className="flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-400">
              <span className="material-symbols-outlined">person</span>
            </div>
          )}
          <div className="flex-1">
            {replyingTo && (
              <div className="flex items-center justify-between bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-lg mb-2 w-fit">
                <span>{t('event.reply')} <strong>{replyingTo.user_name}</strong></span>
                <button onClick={() => setReplyingTo(null)} className="hover:text-red-500 ml-2 mt-0.5">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            )}
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder={user ? t('event.writeComment') : t('event.loginRequired', 'Vui lòng đăng nhập để bình luận')}
              disabled={!user}
              aria-label="Viết bình luận"
              rows={3}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none shadow-sm disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
            />
            <div className="flex justify-end mt-3">
              {user ? (
                <button
                  onClick={handleAddComment}
                  disabled={commentLoading || !commentText.trim()}
                  className="px-6 py-2 bg-primary text-white font-bold text-sm rounded-full hover:opacity-90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:shadow-none"
                >
                  {commentLoading ? t('event.sending') : t('event.sendComment')}
                </button>
              ) : (
                <Link
                  to="/login"
                  className="px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white font-bold text-sm rounded-full hover:opacity-90 transition-all shadow-md shadow-slate-900/20"
                >
                  {t('auth.login', 'Đăng nhập')}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Comments list */}
        {comments.length > 0 ? (
          <div className="space-y-6">
            {comments.filter(c => !c.parent_id).map((c: any) => (
              <div key={c.id || c._id} className="flex gap-4">
                <UserAvatar
                  src={c.user_avatar || c.avatar}
                  name={c.user_name || 'U'}
                  size={40}
                  userId={c.user_id}
                  className="flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{c.user_name}</span>
                      <span className="text-xs text-slate-400">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-2 px-2">
                    <button 
                      onClick={() => handleLikeComment(c.id || c._id)}
                      className={`flex items-center gap-1 text-xs font-medium transition-colors ${c.isLiked ? 'text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      <span className="material-symbols-outlined text-sm" style={c.isLiked ? { fontVariationSettings: "'FILL' 1" } : {}}>thumb_up</span>
                      <span>{c.likes || 0}</span>
                    </button>
                    <button 
                      onClick={() => { setReplyingTo(c); document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' }); }}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">reply</span> {t('event.reply')}
                    </button>
                  </div>
                  
                  {/* Replies */}
                  {comments.filter(reply => reply.parent_id === (c.id || c._id)).length > 0 && (
                    <div className="mt-4 space-y-4 pl-4 border-l-2 border-slate-100 dark:border-slate-800">
                      {comments.filter(reply => reply.parent_id === (c.id || c._id)).map((reply: any) => (
                        <div key={reply.id || reply._id} className="flex gap-3">
                          <UserAvatar
                            src={reply.user_avatar || reply.avatar}
                            name={reply.user_name || 'U'}
                            size={32}
                            userId={reply.user_id}
                            className="flex-shrink-0"
                          />
                          <div className="flex-1">
                            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-bold text-sm text-slate-900 dark:text-white">{reply.user_name}</span>
                                <span className="text-xs text-slate-400">{timeAgo(reply.created_at)}</span>
                              </div>
                              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                            </div>
                            <div className="flex items-center gap-4 mt-2 px-2">
                              <button 
                                onClick={() => handleLikeComment(reply.id || reply._id)}
                                className={`flex items-center gap-1 text-xs font-medium transition-colors ${reply.isLiked ? 'text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                              >
                                <span className="material-symbols-outlined text-sm" style={reply.isLiked ? { fontVariationSettings: "'FILL' 1" } : {}}>thumb_up</span>
                                <span>{reply.likes || 0}</span>
                              </button>
                              <button 
                                onClick={() => { setReplyingTo(c); document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' }); }}
                                className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">reply</span> {t('event.reply')}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center bg-slate-50 dark:bg-slate-800/50 py-12 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3">forum</span>
            <p className="text-slate-500 dark:text-slate-400">{t('event.noComments')}</p>
          </div>
        )}
      </section>

      {/* ──────── Related Articles ──────── */}
      {relatedPosts.length > 0 && (
        <section className="mt-20 pt-10 border-t border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('event.youMayLike')}</h2>
            <Link to="/featured-events" className="text-primary font-semibold hover:underline text-sm flex items-center gap-1">{t('common.viewMore')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPosts.map((related: any) => (
              <Link key={related.id || related._id} to={`/events/${related.slug || related.id || related._id}`} className="group cursor-pointer">
                <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-slate-200 group-hover:-translate-y-1 transition-transform duration-300 shadow-sm group-hover:shadow-md">
                  <img
                    alt={related.title}
                    className="w-full h-full object-cover"
                    src={related.thumbnail || 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400'}
                  />
                </div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  {categories.find((c: any) => c.id === related.category || c.id === related.category_id)?.name?.toUpperCase() || related.category?.toUpperCase() || 'SỰ KIỆN'}
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white mt-1 group-hover:text-primary transition-colors line-clamp-2">
                  {related.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                  <span>{formatPeriod(related.start_date, related.end_date) || formatDate(related.published_at)}</span>
                  {related.read_time && <span>{related.read_time} {t('event.readTime')}</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightboxIndex >= 0 && (
        <Lightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
        />
      )}
    </main>
  );
};

export default EventDetail;