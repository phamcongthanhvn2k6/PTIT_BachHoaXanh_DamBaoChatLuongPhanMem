import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventService } from '../services/eventService';

const FeaturedEvents: React.FC = () => {
  const { t } = useTranslation();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        console.log('Fetching events for portal...');
        const data = await eventService.getFeaturedEvents();
        console.log('API response:', data);
        setEvents(data);
      } catch (err: any) {
        console.error('API Error:', err);
        setError(err.message || t('featuredEvents.errorLoad'));
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, [t]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatPeriod = (start?: string, end?: string) => {
    if (!start && !end) return '';
    const s = start ? new Date(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    const e = end ? new Date(end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    if (s && e) return `${s} - ${e}`;
    if (s) return `${s} — ${t('event.ongoing') || 'Đang diễn ra'}`;
    return e;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
            {t('featuredEvents.loading')}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-lg border border-red-100 dark:border-red-950">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4 animate-bounce">error</span>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('featuredEvents.errorLoad')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full py-3 bg-red-550 hover:bg-red-600 text-white rounded-xl font-bold shadow-md shadow-red-200 dark:shadow-none transition-all duration-300"
          >
            {t('featuredEvents.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <span className="material-symbols-outlined text-7xl text-slate-300 dark:text-slate-700">event_busy</span>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{t('featuredEvents.noEvents')}</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto text-sm">
            {t('featuredEvents.noEventsDesc')}
          </p>
        </div>
      </div>
    );
  }

  // Hero Article Selection:
  const heroEvent = events[0];
  const remainingEvents = events.slice(1);

  // Divide the remaining events:
  const secondaryFeatured = remainingEvents.filter(e => e.isFeatured || e.isFeatured === 'true');
  const regularEvents = remainingEvents.filter(e => !e.isFeatured && e.isFeatured !== 'true');

  // Hero Fields (allowing overrides):
  const heroTitle = heroEvent.heroTitleOverride || heroEvent.title;
  const heroExcerpt = heroEvent.heroExcerptOverride || heroEvent.excerpt || heroEvent.summary;
  const heroImage = heroEvent.heroImageOverride || heroEvent.thumbnail || heroEvent.image || 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1000';

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900/50 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Header section */}
        <div className="text-center md:text-left space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 rounded-full text-xs font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-red-650 dark:bg-red-400 rounded-full animate-ping"></span>
            Lotte Mart Hub
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('featuredEvents.title', 'Tin Tức & Sự Kiện')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg">
            {t('featuredEvents.description', 'Cập nhật các chương trình ưu đãi, khuyến mãi và tin tức mới nhất từ hệ thống siêu thị Lotte Mart.')}
          </p>
        </div>

        {/* 1. Hero Spotlight Section */}
        {heroEvent && (
          <div className="group bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl border border-slate-100 dark:border-slate-700/50 transition-all duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Image box */}
              <div className="lg:col-span-7 relative overflow-hidden aspect-video lg:aspect-auto min-h-[350px]">
                <img
                  alt={heroEvent.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  src={heroImage}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/30 lg:hidden"></div>
                
                {/* Spotlight indicator badge */}
                <div className="absolute top-6 left-6 flex items-center gap-2">
                  <span className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-extrabold rounded-full flex items-center gap-1.5 shadow-lg tracking-wider uppercase">
                    <span className="material-symbols-outlined text-sm font-bold animate-pulse">campaign</span>
                    {heroEvent.isTopFeatured ? t('featuredEvents.topFeaturedBadge') : t('featuredEvents.featuredBadge')}
                  </span>
                </div>
              </div>

              {/* Text content box */}
              <div className="lg:col-span-5 p-8 lg:p-12 flex flex-col justify-between space-y-8 bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-800 dark:to-slate-800/80">
                <div className="space-y-6">
                  {/* Article meta info */}
                  <div className="flex flex-wrap items-center gap-3 text-slate-400 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    {heroEvent.author_name && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">person</span>
                        {heroEvent.author_name}
                      </span>
                    )}
                    <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {formatPeriod(heroEvent.start_date, heroEvent.end_date) || formatDate(heroEvent.published_at)}
                    </span>
                    {heroEvent.readTime && (
                      <>
                        <span className="w-1 h-1 bg-slate-300 dark:bg-slate-650 rounded-full"></span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">menu_book</span>
                          {t('featuredEvents.readTimeLabel', { minutes: heroEvent.readTime, defaultValue: `${heroEvent.readTime} phút đọc` })}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Title & Excerpt */}
                  <div className="space-y-3">
                    <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors duration-300">
                      {heroTitle}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base line-clamp-4 lg:line-clamp-6">
                      {heroExcerpt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-700/50">
                  {/* Interactivity indicators */}
                  <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500 text-sm">
                    {(heroEvent.views != null && heroEvent.views > 0) && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                        {heroEvent.views.toLocaleString()}
                      </span>
                    )}
                    {(heroEvent.likes != null && heroEvent.likes > 0) && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                        {heroEvent.likes.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Action link */}
                  <Link
                    to={`/events/${heroEvent.slug || heroEvent._id || heroEvent.id}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-primary dark:bg-slate-700 dark:hover:bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-300 group/btn"
                  >
                    {t('featuredEvents.readMore', 'Đọc tiếp')}
                    <span className="material-symbols-outlined text-sm font-bold group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Secondary Featured Events Grid */}
        {secondaryFeatured.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('featuredEvents.featuredBadge')}
              </h2>
              <div className="flex-grow h-px bg-slate-200 dark:bg-slate-800"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {secondaryFeatured.map((post: any) => (
                <Link
                  key={post._id || post.id}
                  to={`/events/${post.slug || post._id || post.id}`}
                  className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700/50 flex flex-col h-full transition-all duration-300"
                >
                  <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <img
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={post.thumbnail || 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600'}
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-yellow-400 dark:bg-yellow-500 text-slate-900 text-[10px] font-extrabold rounded-full flex items-center gap-1 shadow-md uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        {t('featuredEvents.featuredBadge')}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-grow justify-between space-y-4">
                    <div className="space-y-2">
                      {/* Meta */}
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                        <span>{post.author_name || 'Lotte Mart'}</span>
                        <span className="w-1 h-1 bg-slate-300 dark:bg-slate-650 rounded-full"></span>
                        <span>{formatPeriod(post.start_date, post.end_date) || formatDate(post.published_at)}</span>
                      </div>

                      <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors duration-300 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed">
                        {post.excerpt || post.summary}
                      </p>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-slate-50 dark:border-slate-700/50 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                      <span className="text-primary dark:text-red-400 flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform">
                        {t('featuredEvents.viewDetail', 'Xem chi tiết')}
                        <span className="material-symbols-outlined text-xs font-bold">arrow_forward</span>
                      </span>
                      
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        {post.readTime && (
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">menu_book</span>
                            {t('featuredEvents.readTimeLabel', { minutes: post.readTime, defaultValue: `${post.readTime} phút đọc` })}
                          </span>
                        )}
                        {(post.views != null && post.views > 0) && (
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">visibility</span>
                            {post.views}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 3. Regular Events Grid */}
        {regularEvents.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('featuredEvents.regularEvents')}
              </h2>
              <div className="flex-grow h-px bg-slate-200 dark:bg-slate-800"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularEvents.map((post: any) => (
                <Link
                  key={post._id || post.id}
                  to={`/events/${post.slug || post._id || post.id}`}
                  className="group bg-white dark:bg-slate-800/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-slate-100 dark:border-slate-700/30 flex flex-col h-full transition-all duration-300"
                >
                  <div className="relative aspect-video overflow-hidden bg-slate-50 dark:bg-slate-900">
                    <img
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                      src={post.thumbnail || 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600'}
                    />
                  </div>

                  <div className="p-6 flex flex-col flex-grow justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                        <span>{post.author_name || 'Lotte Mart'}</span>
                        <span className="w-1 h-1 bg-slate-300 dark:bg-slate-650 rounded-full"></span>
                        <span>{formatPeriod(post.start_date, post.end_date) || formatDate(post.published_at)}</span>
                      </div>

                      <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors duration-300 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-3 leading-relaxed">
                        {post.excerpt || post.summary}
                      </p>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-slate-50 dark:border-slate-700/30 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                      <span className="text-slate-650 dark:text-slate-400 flex items-center gap-1 group-hover:text-primary transition-colors">
                        {t('featuredEvents.viewDetail', 'Xem chi tiết')}
                        <span className="material-symbols-outlined text-xs font-bold">arrow_forward</span>
                      </span>

                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        {post.readTime && (
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">menu_book</span>
                            {t('featuredEvents.readTimeLabel', { minutes: post.readTime, defaultValue: `${post.readTime} phút đọc` })}
                          </span>
                        )}
                        {(post.views != null && post.views > 0) && (
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">visibility</span>
                            {post.views}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FeaturedEvents;