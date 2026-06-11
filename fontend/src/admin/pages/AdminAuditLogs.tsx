import React, { useEffect, useState } from 'react';
import enterpriseService from '../services/enterpriseService';
import { toast } from '../../components/Toast/toastEvent';

const AdminAuditLogs: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [severity, setSeverity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  
  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [pagination, setPagination] = useState<any>(null);

  const loadData = async (targetPage = page) => {
    try {
      setLoading(true);
      const res = await enterpriseService.getAuditLogs({ 
        keyword: keyword || undefined, 
        severity: severity || undefined, 
        from: from || undefined,
        to: to || undefined,
        page: targetPage,
        limit: limit
      });
      setRows(res.data || []);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err?.message || 'Không tải được audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadData(1);
  }, [severity, from, to, limit]);

  const handleFilter = () => {
    setPage(1);
    loadData(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (pagination && newPage > pagination.totalPages)) return;
    setPage(newPage);
    loadData(newPage);
  };

  const getSeverityBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SUCCESS': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">SUCCESS</span>;
      case 'FAILURE': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">FAILURE</span>;
      case 'SUSPICIOUS': return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">SUSPICIOUS</span>;
      default: return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold">{status || 'INFO'}</span>;
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900">Audit Logs</h1>
        <div className="flex gap-2 items-center">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          <span>-</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">Tất cả mức độ</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
            <option value="SUSPICIOUS">Suspicious</option>
            <option value="INFO">Info</option>
          </select>

          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm kiếm..." className="px-3 py-2 border rounded-lg text-sm" />
          <button onClick={handleFilter} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold">Lọc</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Thời gian</th>
                <th className="p-3 text-left">Action</th>
                <th className="p-3 text-left">Severity</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">IP / Request ID</th>
                <th className="p-3 text-left">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">Không có dữ liệu</td>
                </tr>
              ) : (
                rows.map((row: any) => (
                  <tr key={String(row._id)} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-500">{row.created_at ? new Date(row.created_at).toLocaleString('vi-VN') : '-'}</td>
                    <td className="p-3 font-semibold text-slate-800">{row.action}</td>
                    <td className="p-3">{getSeverityBadge(row.details?.status)}</td>
                    <td className="p-3">{row.user_name || row.user_id || 'System'}</td>
                    <td className="p-3">
                      <div className="font-mono text-xs">{row.details?.ip || row.ip || '-'}</div>
                      <div className="font-mono text-[10px] text-slate-400">{row.details?.requestId || '-'}</div>
                    </td>
                    <td className="p-3 text-slate-600 max-w-xs truncate" title={row.details?.message || row.entity || ''}>
                      {row.details?.message || row.entity || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-slate-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || loading}
                className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Trước
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= pagination.totalPages || loading}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  Hiển thị <span className="font-medium">{(page - 1) * limit + 1}</span> đến{' '}
                  <span className="font-medium">
                    {Math.min(page * limit, pagination.total)}
                  </span>{' '}
                  trong <span className="font-medium">{pagination.total}</span> kết quả
                </p>
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-1.5 text-sm text-slate-700">
                  <span>Hiển thị</span>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="px-2 py-1 border border-slate-300 rounded bg-white text-sm"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                  <span>dòng</span>
                </div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1 || loading}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum = page;
                    if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    if (pageNum < 1 || pageNum > pagination.totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pageNum
                            ? 'z-10 bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= pagination.totalPages || loading}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;
