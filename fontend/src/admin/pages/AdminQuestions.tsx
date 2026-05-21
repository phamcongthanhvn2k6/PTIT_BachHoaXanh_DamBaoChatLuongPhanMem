import React, { useState, useEffect, useCallback } from 'react';
import { questionService } from '../../services/questionService';
import { toast } from '../../components/Toast/toastEvent';
import { 
  PageHeader, SearchBar, StatusBadge, EmptyState, 
  LoadingOverlay, PaginationControl, Modal, DetailDrawer, 
  FormSection, cls, AdminErrorBoundary 
} from '../components/AdminUI';
import { format } from 'date-fns';

const AdminQuestions: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  const [detailItem, setDetailItem] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [statusChangeModal, setStatusChangeModal] = useState<{ id: string, action: string, label: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await questionService.listAll({ page, limit: 15, search });
      setQuestions(res?.data || []);
      setTotal(res?.meta?.total || 0);
    } catch {
      toast.error('Lỗi tải danh sách Hỏi/Đáp');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusChangeModal) return;
    try {
      const { id, action } = statusChangeModal;
      if (action === 'delete') {
        await questionService.delete(id);
        toast.success(`Đã xóa câu hỏi`);
        setDetailItem(null);
      } else if (action === 'hide') {
        await questionService.update(id, { status: 'hidden' });
        toast.success(`Đã ẩn câu hỏi`);
        if (detailItem) setDetailItem((prev: any) => ({ ...prev, status: 'hidden' }));
      } else if (action === 'show') {
        await questionService.update(id, { status: 'pending' });
        toast.success(`Đã hiển thị câu hỏi`);
        if (detailItem) setDetailItem((prev: any) => ({ ...prev, status: 'pending' }));
      } else if (action === 'pin' || action === 'unpin') {
        await questionService.update(id, { is_pinned: action === 'pin' });
        toast.success(`Đã cập nhật trạng thái ghim`);
        if (detailItem) setDetailItem((prev: any) => ({ ...prev, is_pinned: action === 'pin' }));
      } else if (action === 'official' || action === 'unofficial') {
        await questionService.update(id, { is_official_answer: action === 'official' });
        toast.success(`Đã cập nhật huy hiệu Official`);
        if (detailItem) setDetailItem((prev: any) => ({ ...prev, is_official_answer: action === 'official' }));
      }
      setStatusChangeModal(null);
      loadData();
    } catch {
      toast.error('Lỗi thực hiện thao tác');
    }
  };

  const submitReply = async () => {
    if (!detailItem || !replyText.trim()) return;
    try {
      const res = await questionService.reply(detailItem.product_id, detailItem._id || detailItem.id, replyText);
      toast.success('Đã gửi phản hồi');
      setDetailItem(res.data);
      setReplyText('');
      loadData();
    } catch {
      toast.error('Lỗi phản hồi');
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

  return (
    <AdminErrorBoundary>
      <div className="p-8 bg-surface min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader 
          title="Hỏi Đáp Sản Phẩm" 
          subtitle="Quản lý và giải đáp thắc mắc của khách hàng"
          breadcrumbs={['Quản trị', 'Hỏi Đáp']}
        />

        <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <SearchBar 
            value={search} 
            onChange={setSearch} 
            placeholder="Tìm theo sản phẩm, nội dung câu hỏi..." 
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 relative min-h-[400px]">
          {loading && <LoadingOverlay visible={loading} />}
          {questions.length === 0 && !loading ? (
            <EmptyState icon="forum" title="Chưa có câu hỏi nào" />
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">Sản Phẩm / Khách</th>
                  <th className="px-6 py-4">Câu Hỏi</th>
                  <th className="px-6 py-4">Trạng Thái</th>
                  <th className="px-6 py-4">Thời Gian</th>
                  <th className="px-6 py-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                 {questions.map(q => (
                   <tr key={q._id || q.id} className="hover:bg-slate-50/50">
                     <td className="px-6 py-4 max-w-[200px] truncate">
                        <div className="font-bold text-slate-800 truncate">{q.product_name}</div>
                        <div className="text-xs text-slate-500 truncate">{q.user_name || q.user_id}</div>
                     </td>
                     <td className="px-6 py-4 max-w-[250px] truncate">
                        <div className="truncate text-slate-600 font-medium" title={q.question}>{q.question}</div>
                        {q.answer?.content && <div className="truncate text-xs text-slate-400 mt-1">Đáp: {q.answer.content}</div>}
                     </td>
                     <td className="px-6 py-4 flex flex-col gap-1 items-start">
                        <StatusBadge status={getStatusColor(q.status)} label={q.status} />
                        {q.is_pinned && <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">Ghim</span>}
                        {q.is_official_answer && <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">Official</span>}
                     </td>
                     <td className="px-6 py-4 text-slate-500">
                        {format(new Date(q.created_at || new Date()), 'dd/MM/yyyy HH:mm')}
                     </td>
                     <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => setDetailItem(q)} className="text-primary font-bold hover:underline">Chi tiết</button>
                     </td>
                   </tr>
                 ))}
              </tbody>
            </table>
          )}
        </div>
        <PaginationControl page={page} total={total} pageSize={15} onChange={setPage} />
      </div>

      {detailItem && (
        <DetailDrawer open={!!detailItem} onClose={() => setDetailItem(null)} title="Chi tiết câu hỏi">
          <div className="space-y-6">
             <div className="p-4 border border-slate-100 rounded-lg">
               <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={getStatusColor(detailItem.status)} label={detailItem.status} />
                  {detailItem.is_pinned && <StatusBadge status="warning" label="Ghim" />}
                  {detailItem.is_official_answer && <StatusBadge status="primary" label="Official" />}
               </div>
               <div className="text-sm text-slate-500 font-bold mb-1">Khách: {detailItem.user_name}</div>
               <div className="text-slate-800 font-medium whitespace-pre-wrap text-lg bg-slate-50 p-3 rounded-lg border border-slate-100">{detailItem.question}</div>
             </div>

             <FormSection title="Phản hồi từ Lotte Mart">
                {detailItem.answer?.content ? (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="text-xs text-blue-500 font-bold mb-2 uppercase tracking-wider">{detailItem.answer.admin_name || 'Admin'} • {detailItem.answer.answered_at ? format(new Date(detailItem.answer.answered_at), 'dd/MM/yyyy HH:mm') : ''}</div>
                    <div className="text-slate-800 whitespace-pre-wrap">{detailItem.answer.content}</div>
                    <div className="mt-4 pt-3 border-t border-blue-200">
                      <button onClick={() => setReplyText(detailItem.answer.content)} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">edit</span> Sửa lại câu trả lời</button>
                    </div>
                  </div>
                ) : null}
                
                {(!detailItem.answer?.content || replyText) && (
                  <div className="space-y-2 mt-4">
                    <textarea 
                      className={cls.input + ' min-h-[100px]'} 
                      value={replyText} 
                      onChange={e => setReplyText(e.target.value)} 
                      placeholder="Nhập nội dung giải đáp cho khách hàng..."
                    />
                    <button onClick={submitReply} className={cls.btnPrimary + ' w-full'}>Gửi Trả Lời / Lưu Lại</button>
                  </div>
                )}
             </FormSection>

             <FormSection title="Hành động kiểm duyệt">
               <div className="grid grid-cols-2 gap-2">
                 {detailItem.status !== 'hidden' ? (
                   <button onClick={() => setStatusChangeModal({ id: detailItem._id || detailItem.id, action: 'hide', label: 'Ẩn câu hỏi' })} className={cls.btnSecondary + ' !text-slate-600'}>Ẩn câu hỏi</button>
                 ) : (
                   <button onClick={() => setStatusChangeModal({ id: detailItem._id || detailItem.id, action: 'show', label: 'Hiện câu hỏi' })} className={cls.btnSecondary + ' !text-emerald-600'}>Hiển thị lại</button>
                 )}
                 
                 {detailItem.is_pinned ? (
                   <button onClick={() => setStatusChangeModal({ id: detailItem._id || detailItem.id, action: 'unpin', label: 'Bỏ ghim' })} className={cls.btnSecondary + ' !text-orange-600'}>Bỏ ghim tiêu điểm</button>
                 ) : (
                   <button onClick={() => setStatusChangeModal({ id: detailItem._id || detailItem.id, action: 'pin', label: 'Ghim top' })} className={cls.btnSecondary + ' !text-orange-600'}>Ghim làm tiêu điểm</button>
                 )}
                 
                 {detailItem.is_official_answer ? (
                   <button onClick={() => setStatusChangeModal({ id: detailItem._id || detailItem.id, action: 'unofficial', label: 'Gỡ Official' })} className={cls.btnSecondary + ' !text-blue-600'}>Gỡ Official</button>
                 ) : (
                   <button onClick={() => setStatusChangeModal({ id: detailItem._id || detailItem.id, action: 'official', label: 'Đánh dấu Official' })} className={cls.btnSecondary + ' !text-blue-600'}>Đánh dấu Official</button>
                 )}

                 <button onClick={() => setStatusChangeModal({ id: detailItem._id || detailItem.id, action: 'delete', label: 'Xóa vĩnh viễn' })} className={cls.btnSecondary + ' !text-red-600 !border-red-200'}>Xóa Vĩnh Viễn</button>
               </div>
             </FormSection>
          </div>
        </DetailDrawer>
      )}

      {statusChangeModal && (
         <Modal
          open={!!statusChangeModal}
           onClose={() => setStatusChangeModal(null)}
           title={`Xác nhận: ${statusChangeModal.label}`}
           footer={
             <>
               <button onClick={() => setStatusChangeModal(null)} className={cls.btnSecondary}>Hủy</button>
               <button onClick={handleAction} className={cls.btnPrimary}>Xác nhận</button>
             </>
           }
         >
           <p className="text-slate-600">Bạn có chắc chắn muốn thực hiện hành động này không?</p>
         </Modal>
      )}

      </div>
    </AdminErrorBoundary>
  );
};

export default AdminQuestions;
