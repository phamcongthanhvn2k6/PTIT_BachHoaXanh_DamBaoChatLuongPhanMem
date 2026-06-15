import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supportService } from '../../services/supportService';
import { toast } from '../../components/Toast/toastEvent';
import { useAppSelector } from '../../store';
import UserAvatar from '../../components/UserAvatar/UserAvatar';
import { 
  PageHeader, SearchBar, FilterBar, StatusBadge, EmptyState, 
  LoadingOverlay, PaginationControl, DetailDrawer, 
  FormSection, StatCard, cls, AdminErrorBoundary 
} from '../components/AdminUI';
import { format } from 'date-fns';
import { socket } from '../../services/socket';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Mở' },
  { value: 'pending', label: 'Treo' },
  { value: 'in_progress', label: 'Đang xử lý' },
  { value: 'waiting_customer', label: 'Chờ khách' },
  { value: 'resolved', label: 'Đã giải quyết' },
  { value: 'closed', label: 'Đã đóng' }
];

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: '⚡ Urgent' },
  { value: 'high', label: '🔴 High' },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'low', label: '🟢 Low' }
];

const AdminSupportTickets: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAppSelector(s => s.auth);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  
  // Query state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [total, setTotal] = useState(0);

  // Detail & Modals
  const [detailTicket, setDetailTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, listRes] = await Promise.all([
        supportService.stats(),
        supportService.listTickets({ page, limit: 15, search, status: statusFilter, priority: priorityFilter })
      ]);
      setStats(statsRes || {});
      setTickets(listRes?.data || []);
      setTotal(listRes?.meta?.total || 0);
    } catch {
      toast.error(t('adminSupport.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filter/search changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, search]);

  // Socket listener for new messages on active ticket
  useEffect(() => {
    if (!detailTicket) return;
    const ticketIdStr = String(detailTicket._id || detailTicket.id);
    
    // Join ticket room
    socket.emit('join_ticket', ticketIdStr);

    const handleNewMessage = (newMsg: any) => {
      if (String(newMsg.ticket_id) === ticketIdStr) {
        setDetailTicket((prev: any) => {
          if (!prev) return prev;
          const thread = prev.thread ? [...prev.thread] : [];
          // Avoid duplicate messages
          const exists = thread.some((m: any) => m._id === newMsg._id || (m.created_at === newMsg.created_at && m.content === newMsg.content));
          if (exists) return prev;
          return {
            ...prev,
            thread: [...thread, newMsg],
            status: newMsg.sender_type === 'user' ? 'open' : prev.status
          };
        });
        loadData();
      }
    };

    socket.on('new_message', handleNewMessage);
    return () => {
      socket.emit('leave_ticket', ticketIdStr);
      socket.off('new_message', handleNewMessage);
    };
  }, [detailTicket, loadData]);

  const reloadDetail = async (id: string) => {
    try {
      const res = await supportService.detail(id);
      if (res?.success) {
        setDetailTicket(res.data);
      }
    } catch {
      toast.error(t('adminSupport.detailError', 'Không thể tải chi tiết ticket'));
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!detailTicket) return;
    try {
      await supportService.updateStatus(detailTicket._id || detailTicket.id, { status });
      toast.success(t('adminSupport.updateStatusSuccess', 'Cập nhật trạng thái thành công'));
      reloadDetail(detailTicket._id || detailTicket.id);
      loadData();
    } catch {
      toast.error(t('adminSupport.updateStatusError', 'Lỗi cập nhật trạng thái'));
    }
  };

  const handleAssignMe = async () => {
    if (!detailTicket) return;
    try {
      await supportService.assignAgent(detailTicket._id || detailTicket.id, { 
        assigned_agent_id: user?.id || user?._id, 
        assigned_agent_name: user?.full_name || user?.username || 'Agent'
      });
      toast.success(t('adminSupport.assignMeSuccess', 'Gán xử lý thành công'));
      reloadDetail(detailTicket._id || detailTicket.id);
      loadData();
    } catch {
      toast.error(t('adminSupport.assignMeError', 'Lỗi gán xử lý'));
    }
  };

  const submitReply = async () => {
    if (!detailTicket || !replyText.trim()) return;
    try {
      await supportService.reply(detailTicket._id || detailTicket.id, replyText);
      toast.success(t('adminSupport.sendReplySuccess', 'Đã gửi phản hồi'));
      setReplyText('');
      reloadDetail(detailTicket._id || detailTicket.id);
      loadData();
    } catch {
      toast.error(t('adminSupport.replyError'));
    }
  };

  const submitInternalNote = async () => {
    if (!detailTicket || !internalNoteText.trim()) return;
    try {
      await supportService.internalNote(detailTicket._id || detailTicket.id, {
        author_name: user?.full_name || user?.username || 'Admin',
        content: internalNoteText
      });
      toast.success(t('adminSupport.saveNoteSuccess', 'Đã thêm ghi chú nội bộ'));
      setInternalNoteText('');
      reloadDetail(detailTicket._id || detailTicket.id);
    } catch {
      toast.error(t('adminSupport.saveNoteError', 'Lỗi lưu ghi chú'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'primary';
      case 'pending': return 'slate';
      case 'in_progress': return 'info';
      case 'waiting_customer': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'slate';
      default: return 'primary';
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'urgent': case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <AdminErrorBoundary>
      <div className="p-8 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <PageHeader 
            title={t('adminSupport.title')} 
            subtitle={t('adminSupport.subtitle')}
            breadcrumbs={['Quản trị', 'Customer Support']}
          />

          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard title={t('adminSupport.stats.open')} value={stats.open || 0} icon="inbox" color="primary" />
            <StatCard title={t('adminSupport.stats.high_priority')} value={stats.high_priority || 0} icon="warning" color="danger" />
            <StatCard title={t('adminSupport.stats.unassigned')} value={stats.unassigned || 0} icon="person_off" color="warning" />
            <StatCard title={t('adminSupport.stats.resolved')} value={stats.resolved || 0} icon="task_alt" color="success" />
            <StatCard title={t('adminSupport.stats.closed')} value={stats.closed || 0} icon="drafts" color="slate" />
          </div>

          {/* TOOLBAR */}
          <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <SearchBar value={search} onChange={setSearch} placeholder="Tìm theo subject, ticket code, email..." />
            <FilterBar 
              filters={[
                {
                  label: t('adminSupport.statusFilter', 'Trạng thái'),
                  value: statusFilter,
                  options: STATUS_OPTIONS.map(opt => ({ value: opt.value, label: t(`adminSupport.status.${opt.value}`, opt.label) })),
                  onChange: setStatusFilter
                },
                {
                  label: t('adminSupport.priorityFilter', 'Mức ưu tiên'),
                  value: priorityFilter,
                  options: PRIORITY_OPTIONS.map(opt => ({ value: opt.value, label: t(`adminSupport.priority.${opt.value}`, opt.label) })),
                  onChange: setPriorityFilter
                }
              ]}
            />
          </div>

          {/* LIST */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 min-h-[400px] relative">
            {loading && <LoadingOverlay visible={loading} />}
            
            {tickets.length === 0 && !loading ? (
              <EmptyState icon="support_agent" title="Không có ticket nào" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 z-10 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Ticket</th>
                      <th className="px-6 py-4">Chủ Đề</th>
                      <th className="px-6 py-4">Khách hàng</th>
                      <th className="px-6 py-4">Agent Nhận</th>
                      <th className="px-6 py-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                     {tickets.map(ticket => (
                       <tr key={ticket._id || ticket.id} className="hover:bg-slate-50/50 transition">
                         <td className="px-6 py-4">
                            <div className="font-mono text-xs font-bold text-slate-800 mb-1">
                              {ticket.ticket_code || `#${String(ticket._id || ticket.id).slice(-6).toUpperCase()}`}
                            </div>
                            <StatusBadge status={getStatusColor(ticket.status)} label={t(`adminSupport.status.${ticket.status}`, ticket.status) as string} />
                         </td>
                         <td className="px-6 py-4 max-w-[250px] truncate">
                            <div className="font-bold text-slate-800 truncate mb-1">{ticket.subject}</div>
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getPriorityColor(ticket.priority)}`}>
                              {t(`adminSupport.priority.${ticket.priority}`, ticket.priority) as string}
                            </span>
                         </td>
                         <td className="px-6 py-4 text-slate-500">
                            <div className="font-semibold text-slate-700">{ticket.user_name}</div>
                            <div className="text-xs">{ticket.user_email}</div>
                         </td>
                         <td className="px-6 py-4">
                            {ticket.assigned_agent_name ? (
                              <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-200 shadow-3xs">
                                <span className="material-symbols-outlined text-[14px]">support_agent</span>
                                {ticket.assigned_agent_name}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-xs">{t('adminSupport.unassigned')}</span>
                            )}
                         </td>
                         <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => { 
                                setDetailTicket(ticket); 
                                reloadDetail(ticket._id || ticket.id); 
                              }} 
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-primary font-bold rounded-lg transition text-xs"
                            >
                              Xử lý
                            </button>
                         </td>
                       </tr>
                     ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <PaginationControl page={page} total={total} pageSize={15} onChange={setPage} />
        </div>

        {/* DETAIL DRAWER */}
        {detailTicket && (
          <DetailDrawer
            open={!!detailTicket}
            onClose={() => setDetailTicket(null)}
            title={detailTicket.ticket_code ? `${t('adminSupport.ticketCode')}: ${detailTicket.ticket_code}` : t('adminSupport.detailTitle')}
            width="max-w-2xl"
            footer={
              <div className="flex items-center justify-between w-full">
                {/* Left side: Quick status actions */}
                <div className="flex gap-1.5 flex-wrap">
                  {detailTicket.status !== 'closed' && (
                    <>
                      {detailTicket.status !== 'waiting_customer' && (
                        <button
                          onClick={() => handleUpdateStatus('waiting_customer')}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition text-xs"
                        >
                          {t('adminSupport.waitingCustomer')}
                        </button>
                      )}
                      {detailTicket.status !== 'resolved' && (
                        <button
                          onClick={() => handleUpdateStatus('resolved')}
                          className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl border border-emerald-200 transition text-xs"
                        >
                          {t('adminSupport.markResolved')}
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdateStatus('closed')}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl border border-red-200 transition text-xs"
                      >
                        {t('adminSupport.closeTicket')}
                      </button>
                    </>
                  )}
                </div>

                {/* Right side: Send and Cancel */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setDetailTicket(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition text-xs"
                  >
                    Đóng
                  </button>
                  {detailTicket.status !== 'closed' && (
                    <button
                      onClick={submitReply}
                      disabled={!replyText.trim()}
                      className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-black rounded-xl shadow-md shadow-primary/10 transition text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('adminSupport.sendReply')}
                    </button>
                  )}
                </div>
              </div>
            }
          >
            <div className="space-y-6">
              {/* Context Block: User card & ticket properties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User Info Card */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex gap-3 items-center">
                  <UserAvatar 
                    src={detailTicket.user_avatar} 
                    name={detailTicket.user_name || 'Customer'} 
                    userId={detailTicket.user_id} 
                    size={48} 
                    className="rounded-full border border-slate-200 shadow-xs" 
                  />
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('adminSupport.customerInfo')}</div>
                    <div className="text-sm font-extrabold text-slate-800 truncate">{detailTicket.user_name}</div>
                    <div className="text-xs text-slate-500 truncate">{detailTicket.user_email}</div>
                    <div className="text-[10px] text-slate-400 font-mono">ID: {String(detailTicket.user_id).slice(-8)}</div>
                  </div>
                </div>

                {/* Ticket Meta Details */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex flex-col justify-center space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ticket Info</div>
                    {!detailTicket.assigned_agent_id && detailTicket.status !== 'closed' && (
                      <button 
                        onClick={handleAssignMe} 
                        className="text-[10px] bg-primary hover:bg-primary/95 text-white px-2 py-0.5 rounded font-black shadow-xs transition"
                      >
                        {t('adminSupport.assignMe')}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    <StatusBadge status={getStatusColor(detailTicket.status)} label={t(`adminSupport.status.${detailTicket.status}`, detailTicket.status) as string} />
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getPriorityColor(detailTicket.priority)}`}>
                      {t(`adminSupport.priority.${detailTicket.priority}`, detailTicket.priority) as string}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200">
                      {detailTicket.category}
                    </span>
                  </div>
                  {detailTicket.order_id && (
                    <div className="text-xs font-semibold text-blue-600 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-sm">shopping_bag</span>
                      {t('adminSupport.orderRef')}: <span className="font-mono">{String(detailTicket.order_id).slice(-8).toUpperCase()}</span>
                    </div>
                  )}
                  {detailTicket.created_at && (
                    <div className="text-[10px] text-slate-400 font-semibold">
                      Created: {format(new Date(detailTicket.created_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Subject & Description */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
                <h4 className="text-sm font-black text-slate-800 leading-tight">Subject: {detailTicket.subject}</h4>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mô tả ban đầu:</div>
                <div className="p-3 bg-slate-50 rounded-xl text-slate-700 text-sm whitespace-pre-wrap leading-relaxed border border-slate-100">
                  {detailTicket.message || 'Không có mô tả chi tiết.'}
                </div>
              </div>

              {/* Chat Thread */}
              <FormSection title={t('adminSupport.chatHistory')}>
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                  {(detailTicket.thread?.length ? detailTicket.thread : detailTicket.messages || []).map((msg: any, idx: number) => {
                    const isAgent = msg.sender_type === 'agent' || msg.sender === 'agent' || msg.sender_type === 'admin';
                    return (
                      <div key={idx} className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
                        <div className="text-[10px] text-slate-400 font-semibold mb-1 px-1">
                          {msg.sender_name} • {format(new Date(msg.created_at || Date.now()), 'dd/MM HH:mm')}
                        </div>
                        <div className={`p-3 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                          isAgent 
                            ? 'bg-primary text-white rounded-tr-none shadow-xs' 
                            : 'bg-white text-slate-850 border border-slate-250/50 rounded-tl-none shadow-xs'
                        }`}>
                          {msg.content}
                          {msg.attachments?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {msg.attachments.map((att: string, i: number) => (
                                <a key={i} href={att} target="_blank" rel="noopener noreferrer">
                                  <img src={att} alt="attachment" className="w-16 h-16 object-cover rounded border border-slate-200 hover:scale-105 transition" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </FormSection>

              {/* Action reply text area */}
              {detailTicket.status !== 'closed' && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="flex bg-slate-50 border-b border-slate-150 px-4 py-2">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('adminSupport.sendReply')}</div>
                  </div>
                  <div className="p-4 bg-white">
                    <textarea 
                      className={cls.input + ' min-h-[100px] text-sm focus:ring-2 focus:ring-primary/20'} 
                      value={replyText} 
                      onChange={e => setReplyText(e.target.value)} 
                      placeholder={t('adminSupport.replyPlaceholder')}
                    />
                  </div>
                </div>
              )}

              {/* Internal notes section */}
              <FormSection title={`${t('adminSupport.internalNotes')} (${detailTicket.internal_notes?.length || 0})`}>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {detailTicket.internal_notes?.map((note: any, nIdx: number) => (
                    <div key={nIdx} className="bg-amber-50/70 p-3 rounded-xl border border-amber-100 shadow-2xs">
                      <div className="text-[9px] text-amber-700 font-black uppercase mb-1">{note.author_name} • {format(new Date(note.created_at), 'dd/MM HH:mm')}</div>
                      <div className="text-xs text-slate-700 italic font-semibold">{note.content}</div>
                    </div>
                  ))}
                </div>
                {detailTicket.status !== 'closed' && (
                  <div className="flex gap-2 mt-2">
                    <input 
                      type="text" 
                      className={cls.input + ' flex-1 text-xs'} 
                      placeholder={t('adminSupport.addInternalNote')} 
                      value={internalNoteText} 
                      onChange={e => setInternalNoteText(e.target.value)} 
                    />
                    <button 
                      onClick={submitInternalNote} 
                      disabled={!internalNoteText.trim()}
                      className={cls.btnSecondary + ' !py-1 text-xs shrink-0 disabled:opacity-50'}
                    >
                      {t('adminSupport.saveNote')}
                    </button>
                  </div>
                )}
              </FormSection>
            </div>
          </DetailDrawer>
        )}
      </div>
    </AdminErrorBoundary>
  );
};

export default AdminSupportTickets;
