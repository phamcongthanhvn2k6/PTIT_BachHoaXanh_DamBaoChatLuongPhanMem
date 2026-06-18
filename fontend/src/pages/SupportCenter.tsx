import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { loadTickets, loadMessages, createTicket, addMessage } from '../slices/supportSlice';
import { dataService } from '../services/dataService';
import { toast } from '../components/Toast/toastEvent';
import { socket } from '../services/socket';
import httpClient from '../api/httpClient';

/* ─── Constants ─── */
const CATEGORIES = [
  'general', 'missing_item', 'damaged_product', 'payment_issue',
  'delivery_delay', 'account_issue', 'refund_request',
] as const;

const PRIORITIES = ['low', 'medium', 'high'] as const;

const STATUS_STEPS = ['open', 'pending', 'in_progress', 'waiting_customer', 'resolved', 'closed'] as const;

const FAQ_ITEMS = [
  { q: 'support.faq_q1', a: 'support.faq_a1' },
  { q: 'support.faq_q2', a: 'support.faq_a2' },
  { q: 'support.faq_q3', a: 'support.faq_a3' },
] as const;

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/* ─── Component ─── */
const SupportCenter: React.FC = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { tickets, messages, status } = useAppSelector(s => s.support);
  const { user: currentUser } = useAppSelector(s => s.auth);
  const location = useLocation();

  // Tabs & selection
  const [activeTab, setActiveTab] = useState<'all' | 'OPEN' | 'CLOSED'>('all');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Filters
  const [ticketSearch, setTicketSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Create form
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newCategory, setNewCategory] = useState<string>('general');
  const [newPriority, setNewPriority] = useState<string>('medium');
  const [newOrderId, setNewOrderId] = useState('');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Reply
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [replyPreviews, setReplyPreviews] = useState<string[]>([]);

  // Orders for linking
  const [orders, setOrders] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyFileRef = useRef<HTMLInputElement>(null);

  const locale = i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const queryTicketId = useMemo(() => new URLSearchParams(location.search).get('ticket') || '', [location.search]);

  /* ─── Data loading ─── */
  useEffect(() => {
    if (currentUser?.id) {
      dispatch(loadTickets(undefined));
      dataService.getOrders().then(o => setOrders(Array.isArray(o) ? o : [])).catch(() => {});
    }
  }, [dispatch, currentUser?.id]);

  useEffect(() => {
    if (!queryTicketId || !tickets.length) return;
    const matched = (tickets || []).find(tk => String(tk._id || tk.id) === String(queryTicketId));
    if (matched) {
      setActiveTicketId(matched._id || matched.id);
      setIsCreating(false);
    }
  }, [queryTicketId, tickets]);

  useEffect(() => {
    if (activeTicketId) {
      dispatch(loadMessages(activeTicketId));
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit('join_ticket', activeTicketId);
    }
    const handleNewMessage = (msg: any) => {
      const msgTicketId = String(msg.ticket_id || msg.ticketId || msg.id || '');
      const activeIdStr = String(activeTicketId || '');
      if (msgTicketId && activeIdStr && msgTicketId === activeIdStr) {
        dispatch(addMessage(msg));
      }
    };
    socket.on('new_message', handleNewMessage);

    const handleConnect = () => {
      if (activeTicketId) {
        socket.emit('join_ticket', activeTicketId);
      }
    };
    socket.on('connect', handleConnect);

    return () => {
      if (activeTicketId) socket.emit('leave_ticket', activeTicketId);
      socket.off('new_message', handleNewMessage);
      socket.off('connect', handleConnect);
    };
  }, [dispatch, activeTicketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTicketId]);

  /* ─── File helpers ─── */
  const validateAndAddFiles = useCallback((files: FileList | null, existing: File[], setFiles: (f: File[]) => void, setPreviews: (p: string[]) => void) => {
    if (!files) return;
    const arr = Array.from(files);
    const valid: File[] = [];
    for (const f of arr) {
      if (!ALLOWED_TYPES.includes(f.type)) { toast.warning(t('support.invalidFileType')); continue; }
      if (f.size > MAX_FILE_SIZE) { toast.warning(t('support.fileTooLarge')); continue; }
      if (existing.length + valid.length >= MAX_FILES) { toast.warning(t('support.maxFiles', { max: MAX_FILES })); break; }
      valid.push(f);
    }
    const merged = [...existing, ...valid];
    setFiles(merged);
    setPreviews(merged.map(f => URL.createObjectURL(f)));
  }, [t]);

  const removeFile = (idx: number, files: File[], setFiles: (f: File[]) => void, setPreviews: (p: string[]) => void) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    setPreviews(next.map(f => URL.createObjectURL(f)));
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];
    const form = new FormData();
    files.forEach(f => form.append('images', f));
    const res = await httpClient.post('/uploads/support-images', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    const payload = res?.data ?? res;
    return payload?.data?.urls || payload?.urls || [];
  };

  /* ─── Create ticket ─── */
  const handleCreateTicket = async () => {
    if (!newSubject.trim()) return toast.warning(t('support.errSubjectRequired'));
    if (!newMessage.trim()) return toast.warning(t('support.errMessageRequired'));

    setUploading(true);
    try {
      let attachments: string[] = [];
      if (newFiles.length > 0) attachments = await uploadImages(newFiles);

      const ticket = await dataService.createSupportTicket({
        subject: newSubject,
        message: newMessage,
        category: newCategory,
        priority: newPriority,
        order_id: newOrderId || undefined,
        attachments,
      } as any);
      dispatch(createTicket(ticket));
      toast.success(t('support.ticketCreated'));
      setIsCreating(false);
      setNewSubject(''); setNewMessage(''); setNewCategory('general'); setNewPriority('medium'); setNewOrderId('');
      setNewFiles([]); setNewPreviews([]);
      const tid = ticket._id || ticket.id;
      setActiveTicketId(tid);
      dispatch(loadMessages(tid));
    } catch (err: any) {
      toast.error(err?.message || t('support.createError'));
    } finally {
      setUploading(false);
    }
  };

  /* ─── Send reply ─── */
  const handleSendReply = async () => {
    if (!replyText.trim() || !activeTicketId) return;
    const optimistic = { id: `temp_${Date.now()}`, ticket_id: activeTicketId, sender_type: 'user', content: replyText, created_at: new Date().toISOString(), attachments: replyPreviews };
    const text = replyText;
    setReplyText('');
    dispatch(addMessage(optimistic as any));

    try {
      const attachments = replyFiles.length > 0 ? await uploadImages(replyFiles) : [];
      await dataService.sendMessage(activeTicketId, currentUser?.id || 0, text, attachments);
      // If we had attachments, the backend already stored them via the message payload
      setReplyFiles([]); setReplyPreviews([]);
      dispatch(loadTickets(undefined));
    } catch (err: any) {
      toast.error(t('support.replyError'));
    }
  };

  /* ─── Filtered tickets ─── */
  const filteredTickets = (tickets || []).filter(tk => {
    if (activeTab === 'OPEN') return tk.status !== 'CLOSED' && tk.status !== 'RESOLVED' && tk.status !== 'closed' && tk.status !== 'resolved';
    if (activeTab === 'CLOSED') return ['CLOSED', 'RESOLVED', 'closed', 'resolved'].includes(tk.status);
    return true;
  }).filter(tk => {
    const search = ticketSearch.trim().toLowerCase();
    if (search) {
      const hay = [tk.subject, tk.ticket_code, tk.order_id].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (filterCategory !== 'all' && tk.category !== filterCategory) return false;
    if (filterPriority !== 'all' && tk.priority !== filterPriority) return false;
    return true;
  }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const activeTicket = (tickets || []).find(tk => (tk._id || tk.id) === activeTicketId);
  const currentMessages = activeTicketId ? messages[activeTicketId] || [] : [];

  /* ─── Helpers ─── */
  const categoryLabel = (cat: string) => t(`support.cat_${cat}`, cat);
  const priorityIcon = (p: string) => p === 'high' ? '🔴' : p === 'low' ? '🟢' : '🟡';
  const priorityLabel = (p: string) => t(`support.priority_${p}`, p);
  const statusLabel = (s: string) => t(`support.status_${String(s || '').toLowerCase()}`, s || t('support.status_unknown'));
  const statusColor = (s: string) => {
    const sl = s?.toLowerCase();
    if (['closed', 'resolved'].includes(sl)) return 'bg-slate-100 text-slate-600';
    if (['open'].includes(sl)) return 'bg-emerald-100 text-emerald-700';
    if (['in_progress', 'pending'].includes(sl)) return 'bg-blue-100 text-blue-700';
    if (['waiting_customer'].includes(sl)) return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  };

  /* ─── Image preview component ─── */
  const ImagePreviews = ({ previews, onRemove }: { previews: string[]; onRemove: (i: number) => void }) => (
    previews.length > 0 ? (
      <div className="flex gap-2 flex-wrap mt-2">
        {previews.map((src, i) => (
          <div key={i} className="relative group">
            <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
            <button type="button" onClick={() => onRemove(i)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow">×</button>
          </div>
        ))}
      </div>
    ) : null
  );

  return (
    <div className="flex flex-col rounded-xl border border-primary/10 overflow-hidden" style={{ minHeight: '70vh' }}>
      <main className="flex flex-1 overflow-hidden" style={{ minHeight: '65vh' }}>
        {/* ═══ Sidebar ═══ */}
        <aside className="w-full md:w-80 lg:w-96 border-r border-primary/10 bg-white dark:bg-slate-900 flex flex-col shrink-0 h-full">
          <div className="p-4 border-b border-primary/10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{t('support.myTickets')}</h3>
              <button onClick={() => { setIsCreating(true); setActiveTicketId(null); }} className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
                <span className="material-symbols-outlined text-sm">add</span> {t('support.createNew')}
              </button>
            </div>
            <div className="flex gap-2 p-1 bg-primary/5 rounded-lg text-xs font-bold uppercase tracking-wider">
              {(['all', 'OPEN', 'CLOSED'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-1.5 rounded-md shadow-sm transition-colors ${activeTab === tab ? 'bg-white dark:bg-slate-800 text-primary' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tab === 'all' ? t('support.all') : tab === 'OPEN' ? t('support.processing') : t('support.closed')}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2">
              <input
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder={t('support.searchPlaceholder')}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="grid grid-cols-2 gap-2">
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none">
                  <option value="all">{t('support.filterAll')}</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                </select>
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none">
                  <option value="all">{t('support.filterAll')}</option>
                  {PRIORITIES.map(p => <option key={p} value={p}>{priorityLabel(p)}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {status === 'loading' && <div className="text-center p-4"><span className="material-symbols-outlined animate-spin text-primary">autorenew</span><p className="text-sm mt-1">{t('support.loading')}</p></div>}
            {filteredTickets.length === 0 && status !== 'loading' && (
              <div className="text-center p-6 text-slate-500 flex flex-col items-center">
                <span className="material-symbols-outlined text-3xl mb-2 opacity-50">inbox</span>
                {t('support.noTickets')}
              </div>
            )}
            <div className="flex flex-col">
              {filteredTickets.map(ticket => (
                <div key={`ticket-${ticket._id || ticket.id}`} onClick={() => { setActiveTicketId(ticket._id || ticket.id); setIsCreating(false); }} className={`p-4 border-b border-primary/5 cursor-pointer relative transition-colors ${activeTicketId === (ticket._id || ticket.id) ? 'bg-primary/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                  {activeTicketId === (ticket._id || ticket.id) && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColor(ticket.status)}`}>{statusLabel(ticket.status)}</span>
                    <span className="text-[10px] text-slate-400">{new Date(ticket.updated_at).toLocaleDateString(locale)}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 mb-1">{ticket.subject}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${ticket.priority === 'high' ? 'bg-red-50 text-red-600' : ticket.priority === 'low' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{priorityIcon(ticket.priority || 'medium')} {priorityLabel(ticket.priority || 'medium')}</span>
                    {ticket.category && ticket.category !== 'general' && <span className="bg-slate-100 px-1.5 py-0.5 rounded">{categoryLabel(ticket.category)}</span>}
                    {((ticket.attachments && ticket.attachments.length > 0) || ticket.thread?.some((m: any) => m.attachments?.length > 0)) && <span className="material-symbols-outlined text-[12px]">attach_file</span>}
                    {ticket.order_id && <span className="material-symbols-outlined text-[12px]">shopping_bag</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ═══ Main Content ═══ */}
        <section className="flex-1 flex flex-col bg-background-light dark:bg-background-dark overflow-hidden h-full">
          {isCreating ? (
            <div className="p-6 lg:p-8 max-w-2xl mx-auto w-full overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">{t('support.createTicketTitle')}</h2>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-primary/10 space-y-4">
                {/* Category + Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1.5">{t('support.category')}</label>
                    <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/30">
                      {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5">{t('support.priority')}</label>
                    <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/30">
                      {PRIORITIES.map(p => <option key={p} value={p}>{priorityIcon(p)} {t(`support.priority_${p}`)}</option>)}
                    </select>
                  </div>
                </div>

                {/* Order linking */}
                <div>
                  <label className="block text-sm font-bold mb-1.5">{t('support.relatedOrder')}</label>
                  <select value={newOrderId} onChange={e => setNewOrderId(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">{t('support.noOrder')}</option>
                    {orders.map((o: any) => <option key={o.id} value={o.id}>#{o.id} — {Number(o.total_amount || 0).toLocaleString(locale)}đ</option>)}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-bold mb-1.5">{t('support.topic')}</label>
                  <input value={newSubject} onChange={e => setNewSubject(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/30" placeholder={t('support.topicPlaceholder')} />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-bold mb-1.5">{t('support.message')}</label>
                  <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} rows={4} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder={t('support.messagePlaceholder')} />
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-sm font-bold mb-1.5">{t('support.attachments')}</label>
                  <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => validateAndAddFiles(e.target.files, newFiles, setNewFiles, setNewPreviews)} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={newFiles.length >= MAX_FILES} className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-40">
                    <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
                    {t('support.addImages')} ({newFiles.length}/{MAX_FILES})
                  </button>
                  <p className="text-[11px] text-slate-400 mt-1">{t('support.imageHint')}</p>
                  <ImagePreviews previews={newPreviews} onRemove={i => removeFile(i, newFiles, setNewFiles, setNewPreviews)} />
                </div>

                <button onClick={handleCreateTicket} disabled={uploading} className="bg-primary text-white px-6 py-3 rounded-xl font-bold w-full hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 disabled:opacity-50">
                  {uploading ? t('support.uploading') : t('support.sendRequest')}
                </button>
              </div>

              <div className="mt-6 bg-primary/5 border border-primary/10 rounded-2xl p-5">
                <h4 className="text-sm font-bold mb-2">{t('support.suggestedTitle')}</h4>
                <p className="text-xs text-slate-500 mb-3">{t('support.suggestedDesc')}</p>
                <div className="flex flex-wrap gap-2">
                  <Link to="/order/track" className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-full hover:border-primary hover:text-primary transition">
                    {t('support.suggestedTrackOrder')}
                  </Link>
                  <Link to="/account/returns" className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-full hover:border-primary hover:text-primary transition">
                    {t('support.suggestedReturns')}
                  </Link>
                  <Link to="/promotions" className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-full hover:border-primary hover:text-primary transition">
                    {t('support.suggestedPromotions')}
                  </Link>
                </div>
              </div>

              <div id="support-faq" className="mt-6">
                <h4 className="text-sm font-bold mb-2">{t('support.faqTitle')}</h4>
                <p className="text-xs text-slate-500 mb-4">{t('support.faqSubtitle')}</p>
                <div className="space-y-3">
                  {FAQ_ITEMS.map((item) => (
                    <div key={item.q} className="bg-white dark:bg-slate-900 border border-slate-100 rounded-xl p-4">
                      <div className="text-sm font-bold text-slate-800 dark:text-white">{t(item.q)}</div>
                      <div className="text-xs text-slate-500 mt-1">{t(item.a)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTicketId && activeTicket ? (
            <div className="flex flex-col h-full">
              {/* Thread Header */}
              <div className="p-4 bg-white dark:bg-slate-900 border-b border-primary/10 shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">receipt_long</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base leading-tight mb-0.5 truncate">{activeTicket.subject}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColor(activeTicket.status)}`}>{statusLabel(activeTicket.status)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${activeTicket.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>{priorityIcon(activeTicket.priority || 'medium')} {priorityLabel(activeTicket.priority || 'medium')}</span>
                      {activeTicket.category && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{categoryLabel(activeTicket.category)}</span>}
                      {activeTicket.order_id && <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{t('support.orderRef')}: #{activeTicket.order_id}</span>}
                      <span className="text-[10px] text-slate-400">{new Date(activeTicket.created_at).toLocaleString(locale)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-[10px] uppercase text-slate-400 font-bold mb-2">{t('support.timelineTitle')}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {STATUS_STEPS.map((step, idx) => {
                      const activeIndex = STATUS_STEPS.indexOf(String(activeTicket.status || '').toLowerCase() as any);
                      const isActive = idx <= (activeIndex === -1 ? 0 : activeIndex);
                      return (
                        <div key={step} className={`flex items-center gap-2 ${idx < STATUS_STEPS.length - 1 ? 'mr-2' : ''}`}>
                          <span className={`size-2.5 rounded-full ${isActive ? 'bg-primary' : 'bg-slate-200'}`}></span>
                          <span className={`text-[10px] font-semibold ${isActive ? 'text-slate-700' : 'text-slate-400'}`}>{statusLabel(step)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col gap-6 scrollbar-hide">
                {currentMessages.length === 0 && <div className="text-center text-slate-500 text-sm py-10">{t('support.noMessages')}</div>}
                {currentMessages.map((msg, idx) => {
                  const isUser = msg.sender_type === 'user' || msg.sender_type === 'USER' || msg.sender === 'user';
                  return (
                    <div key={`msg-${msg._id || msg.id || idx}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex ${isUser ? 'flex-col items-end' : 'items-start gap-3'} max-w-[80%] sm:max-w-[70%]`}>
                        {!isUser && (
                          <div className="size-8 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-xl text-slate-500">support_agent</span>
                          </div>
                        )}
                        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                          {!isUser && <span className="text-[11px] font-bold text-slate-600 mb-1">{t('support.customerSupport')}</span>}
                          <div className={`p-3 rounded-2xl shadow-sm text-sm ${isUser ? 'bg-primary text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none border border-primary/5'}`}>
                            {msg.content || (msg as any).text}
                            {(msg.attachments && msg.attachments.length > 0) && (
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {msg.attachments.map((url: string, i: number) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                    <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-white/20 hover:opacity-80 transition-opacity" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1">{new Date(msg.created_at).toLocaleTimeString(locale)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input */}
              {activeTicket.status !== 'CLOSED' && activeTicket.status !== 'RESOLVED' && activeTicket.status !== 'closed' && activeTicket.status !== 'resolved' && (
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-primary/10 shrink-0">
                  <ImagePreviews previews={replyPreviews} onRemove={i => removeFile(i, replyFiles, setReplyFiles, setReplyPreviews)} />
                  <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-xl border border-primary/10 focus-within:border-primary/40 transition-colors mt-1">
                    <input ref={replyFileRef} type="file" multiple accept="image/*" className="hidden" onChange={e => validateAndAddFiles(e.target.files, replyFiles, setReplyFiles, setReplyPreviews)} />
                    <button type="button" onClick={() => replyFileRef.current?.click()} className="text-slate-400 hover:text-primary transition-colors shrink-0">
                      <span className="material-symbols-outlined text-xl">attach_file</span>
                    </button>
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm resize-none h-12 py-2 outline-none"
                      placeholder={t('support.replyPlaceholder')}
                    />
                    <button onClick={handleSendReply} className="bg-primary text-white size-10 shrink-0 rounded-lg flex items-center justify-center hover:bg-primary/90 shadow-md transition-transform active:scale-95">
                      <span className="material-symbols-outlined text-base">send</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 space-y-4 text-center">
              <div className="size-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-5xl opacity-50 text-slate-500">forum</span>
              </div>
              <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300">{t('support.supportCenter')}</h3>
              <p className="max-w-xs text-sm leading-relaxed">{t('support.selectPrompt')}</p>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 rounded-2xl p-4 w-full max-w-sm">
                <h4 className="text-sm font-bold mb-2">{t('support.faqTitle')}</h4>
                <div className="space-y-2 text-left">
                  {FAQ_ITEMS.map((item) => (
                    <div key={item.q}>
                      <div className="text-xs font-semibold text-slate-700">{t(item.q)}</div>
                      <div className="text-[11px] text-slate-500">{t(item.a)}</div>
                    </div>
                  ))}
                </div>
                <a href="#support-faq" className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-3">
                  {t('support.viewFaq')}
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </a>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default SupportCenter;