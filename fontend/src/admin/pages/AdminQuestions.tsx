import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { questionService } from '../../services/questionService';
import { toast } from '../../components/Toast/toastEvent';
import UserAvatar from '../../components/UserAvatar/UserAvatar';
import { 
  PageHeader, SearchBar, StatusBadge, EmptyState, 
  LoadingOverlay, PaginationControl, Modal, DetailDrawer, 
  FormSection, cls, AdminErrorBoundary 
} from '../components/AdminUI';
import { format } from 'date-fns';

const AdminQuestions: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(''); // empty means 'all'
  const [total, setTotal] = useState(0);

  const [detailItem, setDetailItem] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [statusChangeModal, setStatusChangeModal] = useState<{ id: string, action: string, label: string } | null>(null);

  // Settings & hybrid Q&A workflow states
  const [qaMode, setQaMode] = useState<'ai' | 'admin'>('ai');
  const [qaFallback, setQaFallback] = useState(true);
  const [activeModels, setActiveModels] = useState<string[]>([]);
  const [stats, setStats] = useState({ pending: 0, answered: 0, needs_review: 0, rejected: 0 });
  const [savingSettings, setSavingSettings] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await questionService.getSettings();
      if (res?.success) {
        setQaMode(res.settings.qa_mode);
        setQaFallback(res.settings.qa_fallback_to_heuristic);
        setActiveModels(res.settings.qa_active_models);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      console.error('Error loading settings', err);
    }
  }, []);

  const handleUpdateSettings = async (newMode?: 'ai' | 'admin', newFallback?: boolean, newModels?: string[]) => {
    try {
      setSavingSettings(true);
      const payload = {
        qa_mode: newMode !== undefined ? newMode : qaMode,
        qa_fallback_to_heuristic: newFallback !== undefined ? newFallback : qaFallback,
        qa_active_models: newModels !== undefined ? newModels : activeModels,
      };
      const res = await questionService.updateSettings(payload);
      if (res?.success) {
        toast.success(t('adminQuestions.settingsUpdateSuccess', 'Đã cập nhật cấu hình Q&A'));
        if (newMode !== undefined) setQaMode(newMode);
        if (newFallback !== undefined) setQaFallback(newFallback);
        if (newModels !== undefined) setActiveModels(newModels);
        loadSettings();
      }
    } catch {
      toast.error(t('adminQuestions.settingsUpdateError', 'Lỗi lưu cấu hình Q&A'));
    } finally {
      setSavingSettings(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await questionService.listAll({ 
        page, 
        limit: 15, 
        search, 
        status: statusFilter || undefined 
      });
      setQuestions(res?.data || []);
      setTotal(res?.meta?.total || 0);
    } catch {
      toast.error(t('adminQuestions.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, t]);

  useEffect(() => { 
    loadData(); 
    loadSettings();
  }, [loadData, loadSettings]);

  // Reset page when filter/search changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  const handleAction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!statusChangeModal) return;
    try {
      const { id, action } = statusChangeModal;
      if (action === 'delete') {
        await questionService.delete(id);
        toast.success(t('adminQuestions.deleteSuccess', 'Đã xóa câu hỏi'));
        setDetailItem(null);
      } else if (action === 'hide') {
        await questionService.update(id, { status: 'hidden' });
        toast.success(t('adminQuestions.hideSuccess', 'Đã ẩn câu hỏi'));
        if (detailItem) setDetailItem((prev: any) => ({ ...prev, status: 'hidden' }));
      } else if (action === 'show') {
        await questionService.update(id, { status: 'pending' });
        toast.success(t('adminQuestions.showSuccess', 'Đã hiển thị câu hỏi'));
        if (detailItem) setDetailItem((prev: any) => ({ ...prev, status: 'pending' }));
      } else if (action === 'pin' || action === 'unpin') {
        await questionService.update(id, { is_pinned: action === 'pin' });
        toast.success(t('adminQuestions.pinSuccess', 'Đã cập nhật trạng thái ghim'));
        if (detailItem) setDetailItem((prev: any) => ({ ...prev, is_pinned: action === 'pin' }));
      } else if (action === 'official' || action === 'unofficial') {
        await questionService.update(id, { is_official_answer: action === 'official' });
        toast.success(t('adminQuestions.officialSuccess', 'Đã cập nhật huy hiệu Official'));
        if (detailItem) setDetailItem((prev: any) => ({ ...prev, is_official_answer: action === 'official' }));
      } else if (action === 'approve_ai') {
        await questionService.update(id, { ai_status: 'answered', status: 'answered' });
        toast.success(t('adminQuestions.approveSuccess', 'Đã phê duyệt câu trả lời của AI'));
        if (detailItem) {
          setDetailItem((prev: any) => ({ 
            ...prev, 
            status: 'answered', 
            ai_status: 'answered',
            answer: {
              ...prev.answer,
              admin_name: t('qa.aiResponse', 'Trợ lý AI Bách hóa XANH')
            }
          }));
        }
      }
      setStatusChangeModal(null);
      loadData();
    } catch {
      toast.error(t('adminQuestions.actionError', 'Lỗi thực hiện thao tác'));
    }
  };

  const submitReply = async () => {
    if (!detailItem || !replyText.trim()) return;
    try {
      const res = await questionService.reply(detailItem.product_id, detailItem._id || detailItem.id, replyText);
      toast.success(t('adminQuestions.replySuccess', 'Đã gửi phản hồi'));
      setDetailItem(res.data);
      setReplyText('');
      loadData();
    } catch {
      toast.error(t('adminQuestions.replyError', 'Lỗi phản hồi'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'answered': return 'success';
      case 'pending': return 'warning';
      case 'hidden': return 'slate';
      default: return 'primary';
    }
  };

  const getConfidenceBadge = (score: number) => {
    const val = Math.round((score || 0) * 100);
    if (val >= 80) return <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">{val}%</span>;
    if (val >= 50) return <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">{val}%</span>;
    return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">{val}%</span>;
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'ai': return <span className="text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded uppercase">AI</span>;
      case 'mixed': return <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase">Mixed</span>;
      default: return <span className="text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded uppercase">Admin</span>;
    }
  };

  return (
    <AdminErrorBoundary>
      <div className="p-8 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <PageHeader 
            title={t('adminQuestions.title')} 
            subtitle={t('adminQuestions.subtitle')}
            breadcrumbs={['Quản trị', 'CSKH', 'AI Moderation']}
          />

          {/* Hybrid Q&A Mode Settings panel */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-2xl">settings_suggest</span>
                  <h3 className="text-sm font-extrabold text-slate-800">Cấu hình luồng câu hỏi Q&A</h3>
                </div>
                <p className="text-slate-500 text-xs font-semibold">Chọn phương thức trả lời khách hàng (Tự động bằng AI hoặc Thủ công bởi Admin)</p>
              </div>

              {/* Mode Toggle Switches */}
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <button
                  onClick={() => handleUpdateSettings('ai')}
                  disabled={savingSettings}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                    qaMode === 'ai'
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">smart_toy</span>
                  Tự động bằng AI (ON)
                </button>
                <button
                  onClick={() => handleUpdateSettings('admin')}
                  disabled={savingSettings}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                    qaMode === 'admin'
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">person</span>
                  Thủ công bởi Admin (OFF)
                </button>
              </div>
            </div>

            {/* Sub settings grid - show only when AI is ON */}
            {qaMode === 'ai' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-extrabold text-purple-950">Heuristic Fallback Engine</h4>
                      <p className="text-[11px] text-purple-700 font-semibold">Tự động trả lời dựa trên metadata sản phẩm khi hết quota OpenRouter</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={qaFallback}
                        disabled={savingSettings}
                        onChange={(e) => handleUpdateSettings(undefined, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {/* Warning banner about Quota constraints */}
                  <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/50 flex gap-3">
                    <span className="material-symbols-outlined text-amber-600 text-lg">info</span>
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-amber-900">Lưu ý giới hạn token OpenRouter</h5>
                      <p className="text-[11px] text-amber-700 leading-relaxed font-semibold">
                        Gói dịch vụ AI miễn phí có giới hạn số lượt hỏi mỗi ngày. Khi vượt giới hạn, hệ thống sẽ tự động chuyển sang chế độ Heuristic cục bộ hoặc đánh dấu là 'Cần duyệt'.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Queue of active OpenRouter models */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hàng đợi ưu tiên Model AI</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-black px-2 py-0.5 rounded-full">
                      {activeModels.length} models
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {activeModels.map((model, idx) => (
                      <div key={model} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] font-black text-slate-400 font-mono w-4">{idx + 1}.</span>
                          <span className="text-xs font-mono text-slate-700 truncate">{model}</span>
                        </div>
                        {idx === 0 ? (
                          <span className="text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">Primary</span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Fallback</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-3 pt-2">
                <span className="material-symbols-outlined text-blue-600 text-lg">info</span>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-blue-900">Đang bật chế độ trả lời thủ công</h4>
                  <p className="text-[11px] text-blue-700 leading-relaxed font-semibold">
                    Toàn bộ câu hỏi từ khách hàng sẽ được giữ ở trạng thái "Chờ duyệt". Không có câu trả lời tự động nào được tạo bởi AI cho đến khi quản trị viên soạn và phê duyệt câu trả lời.
                  </p>
                </div>
              </div>
            )}

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 text-center">
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-wider">{t('adminQuestions.stats.pending')}</div>
                <div className="text-xl font-black text-amber-600 mt-0.5">{stats.pending}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 text-center">
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-wider">{t('adminQuestions.stats.answered')}</div>
                <div className="text-xl font-black text-emerald-600 mt-0.5">{stats.answered}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 text-center">
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-wider">{t('adminQuestions.stats.needs_review')}</div>
                <div className="text-xl font-black text-purple-600 mt-0.5">{stats.needs_review}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 text-center">
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-wider">{t('adminQuestions.stats.rejected')}</div>
                <div className="text-xl font-black text-red-600 mt-0.5">{stats.rejected}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <SearchBar 
              value={search} 
              onChange={setSearch} 
              placeholder="Tìm theo sản phẩm, người dùng, câu hỏi..." 
            />
            
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setStatusFilter('')}
                className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all ${
                  statusFilter === '' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('adminSupport.filterAll', 'Tất cả')}
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all ${
                  statusFilter === 'pending' 
                    ? 'bg-white text-amber-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('adminQuestions.status.pending')}
              </button>
              <button
                onClick={() => setStatusFilter('answered')}
                className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all ${
                  statusFilter === 'answered' 
                    ? 'bg-white text-emerald-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('adminQuestions.stats.answered')}
              </button>
              <button
                onClick={() => setStatusFilter('hidden')}
                className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all ${
                  statusFilter === 'hidden' 
                    ? 'bg-white text-slate-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('adminQuestions.status.hidden')}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100 relative min-h-[400px]">
            {loading && <LoadingOverlay visible={loading} />}
            {questions.length === 0 && !loading ? (
              <EmptyState icon="forum" title="Không có câu hỏi nào khớp với điều kiện tìm kiếm" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 z-10 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Sản Phẩm / Khách</th>
                      <th className="px-6 py-4">Câu Hỏi</th>
                      <th className="px-6 py-4">Nguồn / Tin cậy</th>
                      <th className="px-6 py-4">Trạng Thái</th>
                      <th className="px-6 py-4">Thời Gian</th>
                      <th className="px-6 py-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {questions.map(q => {
                      const isPendingReview = q.status === 'pending' && q.answer?.content && q.answer_source === 'ai';
                      
                      return (
                        <tr key={q._id || q.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4 max-w-[200px]">
                            <div className="font-extrabold text-slate-900 truncate" title={q.product_name}>{q.product_name}</div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5 truncate">{q.user_name || q.user_id}</div>
                          </td>
                          <td className="px-6 py-4 max-w-[300px]">
                            <div className="text-slate-800 font-bold line-clamp-2" title={q.question}>{q.question}</div>
                            {q.answer?.content && (
                              <div className="text-xs text-slate-500 mt-1 line-clamp-1 italic bg-slate-50 p-1.5 rounded border border-slate-100">
                                <span className="font-bold font-sans">A:</span> {q.answer.content}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              {getSourceBadge(q.answer_source)}
                              {q.answer_source === 'ai' && q.confidence_score !== undefined && getConfidenceBadge(q.confidence_score)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <StatusBadge status={getStatusColor(q.status)} label={q.status === 'pending' ? t('adminQuestions.status.pending') : q.status === 'answered' ? t('adminQuestions.stats.answered') : t('adminQuestions.status.hidden')} />
                              {q.is_pinned && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">Ghim</span>}
                              {q.is_official_answer && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Official</span>}
                              {isPendingReview && (
                                <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase mt-1 animate-pulse">{t('adminQuestions.stats.needs_review')}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-medium">
                            {format(new Date(q.created_at || new Date()), 'dd/MM/yyyy HH:mm')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => {
                                setDetailItem(q);
                                setReplyText(q.answer?.content || '');
                              }} 
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-primary font-bold rounded-lg transition text-xs"
                            >
                              Chi tiết
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <PaginationControl page={page} total={total} pageSize={15} onChange={setPage} />
        </div>

        {detailItem && (
          <DetailDrawer 
            open={!!detailItem} 
            onClose={() => setDetailItem(null)} 
            title={t('adminQuestions.detailTitle')}
            subtitle={t('adminQuestions.productLabel') + `: ${detailItem.product_name}`}
            width="max-w-2xl"
            footer={
              <div className="flex items-center justify-between w-full">
                {/* Left Side: Delete */}
                <button
                  onClick={() => setStatusChangeModal({ id: detailItem._id || detailItem.id, action: 'delete', label: t('adminQuestions.deleteQuestion') })}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition text-xs border border-red-200"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  {t('adminQuestions.deleteQuestion')}
                </button>

                {/* Right Side: Primary Toggles & Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setDetailItem(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition text-xs"
                  >
                    Đóng
                  </button>

                  {detailItem.status !== 'hidden' ? (
                    <button
                      onClick={() => setStatusChangeModal({ id: detailItem._id || detailItem.id, action: 'hide', label: t('adminQuestions.hideQuestion') })}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition text-xs"
                    >
                      {t('adminQuestions.hideQuestion')}
                    </button>
                  ) : (
                    <button
                      onClick={() => setStatusChangeModal({ id: detailItem._id || detailItem.id, action: 'show', label: t('adminQuestions.showQuestion') })}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl border border-emerald-200 transition text-xs"
                    >
                      {t('adminQuestions.showQuestion')}
                    </button>
                  )}

                  {detailItem.status === 'pending' && detailItem.answer?.content && detailItem.answer_source === 'ai' && (
                    <button
                      onClick={() => setStatusChangeModal({ id: detailItem._id || detailItem.id, action: 'approve_ai', label: t('adminQuestions.approveAiResponse') })}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl shadow-md shadow-purple-500/20 transition text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">check</span>
                      {t('adminQuestions.approveAiResponse')}
                    </button>
                  )}

                  {(!detailItem.answer?.content || replyText !== (detailItem.answer?.content || '') || (detailItem.status === 'pending' && detailItem.answer_source === 'ai')) && (
                    <button
                      onClick={submitReply}
                      disabled={!replyText.trim()}
                      className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-black rounded-xl shadow-md shadow-primary/10 transition text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      {t('adminQuestions.savePublish')}
                    </button>
                  )}
                </div>
              </div>
            }
          >
            <div className="space-y-6">
              {/* User Profile & Context Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: User Card */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex gap-3 items-center">
                  <UserAvatar 
                    src={detailItem.user_avatar} 
                    name={detailItem.user_name || t('adminQuestions.unknownUser')} 
                    userId={detailItem.user_id} 
                    size={48} 
                    className="rounded-full border border-slate-200 shadow-xs" 
                  />
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('adminQuestions.customerInfo')}</div>
                    <div className="text-sm font-extrabold text-slate-800 truncate">{detailItem.user_name || t('adminQuestions.unknownUser')}</div>
                    <div className="text-xs text-slate-500 truncate">{detailItem.user_email || 'No email'}</div>
                    <div className="text-[10px] text-slate-400 font-mono">ID: {String(detailItem.user_id).slice(-8)}</div>
                  </div>
                </div>

                {/* Right: Meta Details */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex flex-col justify-center space-y-1.5">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('adminQuestions.referenceInfo')}</div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={getStatusColor(detailItem.status)} label={detailItem.status === 'pending' ? t('adminQuestions.status.pending') : detailItem.status === 'answered' ? t('adminQuestions.stats.answered') : t('adminQuestions.status.hidden')} />
                    {getSourceBadge(detailItem.answer_source)}
                  </div>
                  {detailItem.created_at && (
                    <div className="text-[11px] text-slate-500 font-medium">
                      {t('adminQuestions.createdTime', 'Thời gian gửi')}: {format(new Date(detailItem.created_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                  )}
                  {detailItem.answer_source === 'ai' && detailItem.confidence_score !== undefined && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <span>{t('adminQuestions.confidenceScore')}:</span>
                      {getConfidenceBadge(detailItem.confidence_score)}
                    </div>
                  )}
                  {detailItem.ai_model_used && (
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {t('adminQuestions.aiModel')}: {detailItem.ai_model_used}
                    </div>
                  )}
                </div>
              </div>

              {/* Question Text Box */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <div className="text-xs text-slate-400 font-black uppercase tracking-wider mb-2">Nội dung câu hỏi từ khách:</div>
                <div className="text-slate-800 font-bold whitespace-pre-wrap text-md bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
                  "{detailItem.question}"
                </div>
              </div>

              {/* Display AI Suggested Response block if pending */}
              {detailItem.status === 'pending' && detailItem.answer?.content && detailItem.answer_source === 'ai' && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-purple-600 animate-bounce">smart_toy</span>
                    <h4 className="text-sm font-black text-purple-900">{t('adminQuestions.aiSuggestedAnswer')}</h4>
                  </div>
                  <p className="text-sm text-slate-700 font-medium mb-4 whitespace-pre-wrap italic bg-white/70 p-3.5 rounded-xl border border-purple-100/50">
                    "{detailItem.answer.content}"
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStatusChangeModal({ id: detailItem._id || detailItem.id, action: 'approve_ai', label: t('adminQuestions.approveAiResponse') })}
                      className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl shadow-md shadow-purple-500/20 active:scale-[0.98] transition text-xs flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">check</span>
                      {t('adminQuestions.approveAiResponse')}
                    </button>
                    <button
                      onClick={() => setReplyText(detailItem.answer.content)}
                      className="py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 transition text-xs flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                      Sửa nội dung
                    </button>
                  </div>
                </div>
              )}

              {/* Official response section */}
              <FormSection title={t('adminQuestions.answerTitle')}>
                {detailItem.answer?.content && !(detailItem.status === 'pending' && detailItem.answer_source === 'ai') ? (
                  <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 shadow-xs">
                    <div className="text-xs text-blue-600 font-bold mb-3 uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">account_circle</span>
                      {detailItem.answer.admin_name || 'Admin'} • {detailItem.answer.answered_at ? format(new Date(detailItem.answer.answered_at), 'dd/MM/yyyy HH:mm') : ''}
                    </div>
                    <div className="text-slate-800 font-semibold whitespace-pre-wrap text-sm leading-relaxed">{detailItem.answer.content}</div>
                    <div className="mt-4 pt-3 border-t border-blue-100 flex justify-end">
                      <button 
                        onClick={() => setReplyText(detailItem.answer.content)} 
                        className="text-xs font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span> {t('adminQuestions.editAnswer')}
                      </button>
                    </div>
                  </div>
                ) : null}
                
                {(!detailItem.answer?.content || replyText !== (detailItem.answer?.content || '') || (detailItem.status === 'pending' && detailItem.answer_source === 'ai')) && (
                  <div className="space-y-3 mt-4">
                    <textarea 
                      className={cls.input + ' min-h-[120px] rounded-2xl text-sm p-4 focus:ring-2 focus:ring-primary/20'} 
                      value={replyText} 
                      onChange={e => setReplyText(e.target.value)} 
                      placeholder={t('adminQuestions.manualReply')}
                    />
                  </div>
                )}
              </FormSection>

              {/* Pinning & Official Badging Controls */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                <div className="text-xs text-slate-400 font-black uppercase tracking-wider">{t('adminQuestions.moderationActions')}</div>
                <div className="flex flex-wrap gap-2">
                  {detailItem.is_pinned ? (
                    <button 
                      onClick={() => setStatusChangeModal({ id: detailItem._id || detailItem.id, action: 'unpin', label: t('adminQuestions.unpinQuestion') })} 
                      className="flex-1 py-2 bg-white hover:bg-orange-50 text-orange-700 font-bold rounded-xl border border-orange-200 transition text-xs flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-sm">keep_off</span>
                      {t('adminQuestions.unpinQuestion')}
                    </button>
                  ) : (
                    <button 
                      onClick={() => setStatusChangeModal({ id: detailItem._id || detailItem.id, action: 'pin', label: t('adminQuestions.pinQuestion') })} 
                      className="flex-1 py-2 bg-white hover:bg-orange-50 text-orange-700 font-bold rounded-xl border border-slate-200 transition text-xs flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-sm">keep</span>
                      {t('adminQuestions.pinQuestion')}
                    </button>
                  )}
                  
                  {detailItem.is_official_answer ? (
                    <button 
                      onClick={() => setStatusChangeModal({ id: detailItem._id || detailItem.id, action: 'unofficial', label: t('adminQuestions.removeOfficial') })} 
                      className="flex-1 py-2 bg-white hover:bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200 transition text-xs flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-sm">verified_user</span>
                      {t('adminQuestions.removeOfficial')}
                    </button>
                  ) : (
                    <button 
                      onClick={() => setStatusChangeModal({ id: detailItem._id || detailItem.id, action: 'official', label: t('adminQuestions.markOfficial') })} 
                      className="flex-1 py-2 bg-white hover:bg-blue-50 text-blue-700 font-bold rounded-xl border border-slate-200 transition text-xs flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-sm">verified</span>
                      {t('adminQuestions.markOfficial')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </DetailDrawer>
        )}

        {statusChangeModal && (
          <Modal
            open={!!statusChangeModal}
            onClose={() => setStatusChangeModal(null)}
            title={t('adminQuestions.confirmTitle')}
            size="sm"
            footer={
              <div className="flex gap-2 justify-end w-full">
                <button onClick={() => setStatusChangeModal(null)} className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition text-xs">
                  {t('adminProducts.modalDeleteCancel', 'Hủy')}
                </button>
                <button 
                  onClick={() => handleAction()} 
                  className={`py-2.5 px-4 font-bold rounded-xl transition text-xs shadow-md ${
                    statusChangeModal.action === 'delete' 
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/10' 
                      : 'bg-primary hover:bg-primary/95 text-white shadow-primary/10'
                  }`}
                >
                  {t('adminProducts.confirmBtn', 'Xác nhận')}
                </button>
              </div>
            }
          >
            <p className="text-slate-600 text-sm font-medium">{t('adminQuestions.confirmMsg')}</p>
          </Modal>
        )}
      </div>
    </AdminErrorBoundary>
  );
};

export default AdminQuestions;
