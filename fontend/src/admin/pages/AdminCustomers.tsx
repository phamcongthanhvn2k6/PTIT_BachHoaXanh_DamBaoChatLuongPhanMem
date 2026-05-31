// src/pages/AdminCustomers.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../../services/dataService';
import { toast } from '../../components/Toast/toastEvent';
import * as Types from '../../types';

const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<Types.User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMembership, setFilterMembership] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Modal states
  const [selectedCustomer, setSelectedCustomer] = useState<Types.User | null>(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isPointsModalOpen, setPointsModalOpen] = useState(false);
  const [isResetPassModalOpen, setResetPassModalOpen] = useState(false);
  const [isConfirmStatusModalOpen, setConfirmStatusModalOpen] = useState(false);
  const [customerToToggle, setCustomerToToggle] = useState<Types.User | null>(null);

  // Edit / Points Form states
  const [editForm, setEditForm] = useState<Partial<Types.User>>({});
  const [pointsChange, setPointsChange] = useState<number>(0);
  const [pointsReason, setPointsReason] = useState<string>('');

  // Drawer details Data
  const [drawerData, setDrawerData] = useState<{
    orders: Types.Order[];
    addresses: Types.UserAddress[];
    loyalty: any[];
    reviews: any[];
    wishlists: any[];
    loading: boolean;
  }>({
    orders: [], addresses: [], loyalty: [], reviews: [], wishlists: [], loading: false
  });
  const [activeTab, setActiveTab] = useState('info');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await dataService.getUsers();
      console.log('[AdminCustomers] users fetched:', data.length, data);
      setCustomers(data);
    } catch {
      toast.error('Lỗi khi tải dữ liệu khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      setDrawerData(prev => ({ ...prev, loading: true }));
      Promise.all([
        dataService.getOrdersByUser(selectedCustomer.id),
        dataService.getUserAddresses(selectedCustomer.id),
        dataService.getUserLoyaltyTransactions(selectedCustomer.id),
        dataService.getUserReviews(selectedCustomer.id),
        dataService.getUserWishlist(selectedCustomer.id),
      ]).then(([orders, addresses, loyalty, reviews, wishlists]) => {
        setDrawerData({ orders, addresses, loyalty, reviews, wishlists, loading: false });
      });
    }
  }, [selectedCustomer?.id]);

  // Derived state
  const displayedCustomers = useMemo(() => {
    let result = customers;
    
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(c => 
        (c.full_name || '').toLowerCase().includes(lower) || 
        (c.email || '').toLowerCase().includes(lower) || 
        (c.phone || '').includes(lower) ||
        String(c.id).includes(lower)
      );
    }
    
    if (filterMembership !== 'all') {
      result = result.filter(c => c.membership_level === filterMembership);
    }
    
    if (filterStatus !== 'all') {
      const wantActive = filterStatus === 'active';
      result = result.filter(c => (c.is_active ?? true) === wantActive);
    }
    
    return result;
  }, [customers, searchQuery, filterMembership, filterStatus]);

  const totalPages = Math.ceil(displayedCustomers.length / itemsPerPage);
  const paginatedCustomers = displayedCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const kpis = useMemo(() => {
    const total = customers.length;
    const goldAbove = customers.filter(c => ['Gold', 'Platinum', 'Diamond'].includes(c.membership_level || '')).length;
    const totalPoints = customers.reduce((sum, c) => sum + (c.lotte_points || 0), 0);
    const active = customers.filter(c => (c.is_active ?? true)).length;
    return { total, goldAbove, totalPoints, active };
  }, [customers]);

  // Handlers
  const triggerToggleStatus = (user: Types.User, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomerToToggle(user);
    setConfirmStatusModalOpen(true);
  };

  const handleConfirmToggleStatus = async () => {
    if (!customerToToggle) return;
    try {
      const updated = await dataService.toggleUserStatus(customerToToggle.id);
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
      if (selectedCustomer?.id === updated.id) setSelectedCustomer(updated);
      toast.success(`Đã ${updated.is_active ? 'mở khóa' : 'khóa'} tài khoản`);
      setConfirmStatusModalOpen(false);
      setCustomerToToggle(null);
    } catch {
      toast.error('Lỗi khi thay đổi trạng thái');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedCustomer) return;
    if (!confirm('Hệ thống sẽ tạo mật khẩu ngẫu nhiên cho user này?')) return;
    try {
      const res = await dataService.resetUserPassword(selectedCustomer.id);
      toast.success(`Đã reset mật khẩu. Mật khẩu mới: ${res.newPass}`);
      setResetPassModalOpen(false);
    } catch {
      toast.error('Lỗi reset mật khẩu');
    }
  };

  const handleSaveCustomer = async () => {
    if (!selectedCustomer) return;
    try {
      const updated = await dataService.updateUserProfile(selectedCustomer.id, editForm);
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
      setSelectedCustomer(updated);
      toast.success('Đã lưu thông tin');
      setEditModalOpen(false);
    } catch {
      toast.error('Lỗi lưu thông tin');
    }
  };

  const handleSavePoints = async () => {
    if (!selectedCustomer || pointsChange === 0) return;
    try {
      const updated = await dataService.adjustUserPoints(selectedCustomer.id, pointsChange, pointsReason || 'Admin điều chỉnh');
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
      setSelectedCustomer(updated);
      toast.success('Đã điều chỉnh điểm. Số điểm mới: ' + updated.lotte_points);
      
      // refetch loyalty
      const newLoyalty = await dataService.getUserLoyaltyTransactions(selectedCustomer.id);
      setDrawerData(prev => ({ ...prev, loyalty: newLoyalty }));
      
      setPointsModalOpen(false);
      setPointsChange(0);
      setPointsReason('');
    } catch (e: any) {
      toast.error(e.message || 'Lỗi điều chỉnh điểm');
    }
  };

  // Row Renderer Support
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Diamond': return 'bg-purple-100 border-purple-200 text-purple-700';
      case 'Platinum': return 'bg-cyan-100 border-cyan-200 text-cyan-700';
      case 'Gold': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'Silver': return 'bg-slate-100 border-slate-200 text-slate-600';
      default: return 'bg-orange-50 border-orange-100 text-orange-700';
    }
  };

  return (
    <div className="p-8 relative">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-end mb-8 relative z-0">
          <div>
            <nav className="flex text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">
              <span>Admin</span>
              <span className="mx-2">/</span>
              <span className="text-primary">Khách hàng</span>
            </nav>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quản lý Khách hàng</h2>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchCustomers} className="p-2.5 text-slate-500 hover:text-primary transition-colors bg-surface-container-lowest rounded-xl border border-slate-200 shadow-sm" title="Làm mới">
              <span className="material-symbols-outlined">refresh</span>
            </button>
            <button
              onClick={() => {
                const escapeCSV = (val: any): string => {
                  if (val === null || val === undefined) return '';
                  let str = String(val);
                  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                    str = `"${str.replace(/"/g, '""')}"`;
                  }
                  return str;
                };

                const headers = ['ID', 'Username', 'Full Name', 'Email', 'Phone', 'Membership', 'Points', 'Active', 'Created At'];
                const rows = displayedCustomers.map(c => [
                  c.id,
                  c.username,
                  c.full_name || '',
                  c.email,
                  c.phone || '',
                  c.membership_level || 'Bronze',
                  c.lotte_points || 0,
                  (c.is_active ?? true) ? 'Active' : 'Locked',
                  c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : ''
                ]);
                const csv = [headers.map(escapeCSV).join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\r\n');
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `lotte_customers_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success(`Đã xuất ${displayedCustomers.length} khách hàng!`);
              }}
              className="flex items-center px-4 py-2.5 bg-surface-container-lowest text-on-surface font-semibold text-sm rounded-xl transition-all hover:bg-surface-container-high border border-slate-200/30 shadow-sm"
            >
              <span className="material-symbols-outlined mr-2 text-sm">file_download</span>
              Xuất Báo Cáo
            </button>
          </div>
        </div>

        {/* KPI Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 relative z-0">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-slate-200/20 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <span className="material-symbols-outlined">group</span>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Thành Viên</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{loading ? '...' : kpis.total.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-slate-200/20 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">VIP (Gold trở lên)</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{loading ? '...' : kpis.goldAbove.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-slate-200/20 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Điểm Đã Cấp</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{loading ? '...' : (kpis.totalPoints / 1000).toFixed(1) + 'k'}</h3>
            </div>
          </div>
          <div className="bg-primary p-6 rounded-xl shadow-lg bg-gradient-to-br from-[#970012] to-[#c1121f] flex flex-col justify-between text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Hoạt động</span>
              </div>
              <p className="text-xs opacity-70">Tài khoản Active</p>
              <h3 className="text-2xl font-black mt-1">{loading ? '...' : kpis.active.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        {/* List Section */}
        <div className="bg-surface-container-lowest rounded-2xl border border-slate-200/20 shadow-sm overflow-hidden flex relative z-10">
          <div className="flex-1 overflow-x-auto min-h-[600px]">
            {/* Filter Bar */}
            <div className="p-6 border-b border-slate-100/50 flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[280px] relative flex items-center">
                <div className="absolute left-0 top-0 h-full w-10 flex items-center justify-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-[20px] leading-none block">search</span>
                </div>
                <input
                  className="w-full bg-surface-container-low border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
                  placeholder="Tìm kiếm: Tên, ID, SDT, Email..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <select className="bg-surface-container-low border-none rounded-xl text-sm py-2.5 px-4 font-semibold text-slate-600 focus:ring-2 focus:ring-primary/20"
                value={filterMembership} onChange={e => {setFilterMembership(e.target.value); setCurrentPage(1)}}
              >
                <option value="all">Tất cả Hạng</option>
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
                <option value="Diamond">Diamond</option>
              </select>
              <select className="bg-surface-container-low border-none rounded-xl text-sm py-2.5 px-4 font-semibold text-slate-600 focus:ring-2 focus:ring-primary/20"
                value={filterStatus} onChange={e => {setFilterStatus(e.target.value); setCurrentPage(1)}}
              >
                <option value="all">Trạng thái (Tất cả)</option>
                <option value="active">Active (Đang HD)</option>
                <option value="inactive">Locked (Đã Khóa)</option>
              </select>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm font-bold animate-pulse">Đang tải dữ liệu...</div>
            ) : displayedCustomers.length === 0 ? (
               <div className="p-16 text-center opacity-50 flex flex-col items-center">
                <span className="material-symbols-outlined text-4xl mb-4">search_off</span>
                <p className="text-sm font-bold text-slate-600">Không tìm thấy khách hàng nào</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-surface-container-low sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Khách Hàng</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Thông Tin Liên Hệ</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] text-center">Đăng nhập</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] text-center">Hạng / Điểm</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] text-center">Tình Trạng</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {paginatedCustomers.map((user) => {
                    const isActive = user.is_active ?? true;
                    return (
                      <tr key={user.id} 
                          onClick={() => {
                             setSelectedCustomer(user);
                             setActiveTab('info');
                          }}
                          className={`${selectedCustomer?.id === user.id ? 'bg-primary/5' : 'hover:bg-slate-50/50'} ${!isActive ? 'bg-slate-50/30' : ''} transition-colors group cursor-pointer`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              alt={user.full_name || user.username}
                              className={`w-10 h-10 rounded-full object-cover border-2 shadow-sm ${!isActive ? 'grayscale opacity-60 border-slate-200' : 'border-white'}`}
                              src={user.avatar || 'https://ui-avatars.com/api/?background=random&name=' + user.username}
                            />
                            <div>
                            <p className={`text-sm font-bold ${!isActive ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{user.full_name || user.username}</p>
                              <p className="text-[10px] text-slate-400">ID: {String(user._id || user.id).slice(-8).toUpperCase()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-[11px] font-medium ${!isActive ? 'text-slate-400' : 'text-slate-600'}`}>
                            <p className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px] text-slate-400">mail</span> {user.email}</p>
                            <p className="flex items-center gap-1.5 mt-1"><span className="material-symbols-outlined text-[14px] text-slate-400">call</span> {user.phone || 'Chưa cập nhật'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-1.5">
                            {(user.provider || user.signup_method || '').toLowerCase().includes('google') || user.googleId ? (
                              <span className="whitespace-nowrap inline-flex items-center justify-center min-w-max gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                                <svg className="w-3 h-3" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                Google
                              </span>
                            ) : (
                              <span className="whitespace-nowrap inline-flex items-center justify-center min-w-max gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-200">
                                <span className="material-symbols-outlined text-[12px]">mail</span>
                                Email
                              </span>
                            )}
                            {user.created_at && (
                              <p className="text-[9px] text-slate-400">{new Date(user.created_at).toLocaleDateString('vi-VN')}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`whitespace-nowrap inline-flex items-center justify-center min-w-max px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${getTierColor(user.membership_level || 'Bronze')}`}>{user.membership_level || 'Bronze'}</span>
                            <p className="text-[11px] font-bold text-slate-600 tracking-tight">{(user.lotte_points ?? 0).toLocaleString()} <span className="font-medium text-slate-400">Pts</span></p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            {isActive ? (
                              <span className="whitespace-nowrap inline-flex items-center justify-center min-w-max gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">
                                Active
                              </span>
                            ) : (
                              <span className="whitespace-nowrap inline-flex items-center justify-center min-w-max gap-1.5 px-3 py-1 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-red-100">
                                Locked
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right align-middle">
                          <div className="flex justify-end gap-2">
                             <button onClick={(e) => { e.stopPropagation(); setEditForm(user); setSelectedCustomer(user); setEditModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" title="Chỉnh sửa">
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedCustomer(user); setPointsModalOpen(true); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-100" title="Điều chỉnh điểm">
                              <span className="material-symbols-outlined text-[20px]">stars</span>
                            </button>
                            <button onClick={(e) => triggerToggleStatus(user, e)} className={`p-1.5 rounded-lg transition-colors border border-transparent ${isActive ? 'text-red-500 hover:bg-red-50 hover:border-red-100' : 'text-emerald-500 hover:bg-emerald-50 hover:border-emerald-100'}`} title={isActive ? 'Khóa TK' : 'Mở khóa'}>
                              <span className="material-symbols-outlined text-[20px]">{isActive ? 'block' : 'lock_open'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Pagination Controls */}
            {!loading && displayedCustomers.length > 0 && (
              <div className="p-6 border-t border-slate-100/50 flex justify-between items-center bg-surface-container-low/30 sticky bottom-0">
                <p className="text-xs text-slate-500 font-medium">Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, displayedCustomers.length)} trong số {displayedCustomers.length}</p>
                <div className="flex gap-1">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-all disabled:opacity-50">
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  {Array.from({length: totalPages}, (_, i) => i + 1).slice(
                    Math.max(0, currentPage - 3), 
                    Math.min(totalPages, currentPage + 2)
                  ).map(num => (
                    <button 
                      key={num} 
                      onClick={() => setCurrentPage(num)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all \${num === currentPage ? 'bg-primary text-white border border-primary z-10' : 'bg-white border border-slate-200 text-slate-600 hover:border-primary'}`}
                    >{num}</button>
                  ))}
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-all disabled:opacity-50">
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Contextual Sidebar Drawer */}
          {selectedCustomer && (
            <>
              {/* Drawer Overlay */}
              <div 
                className="fixed inset-0 top-16 bg-slate-900/40 backdrop-blur-sm z-30 transition-opacity" 
                onClick={() => setSelectedCustomer(null)}
              ></div>

              <aside className="w-full sm:w-[480px] bg-surface-container-lowest border-l border-slate-200/50 flex flex-col fixed right-0 top-16 h-[calc(100vh-4rem)] z-30 shadow-2xl transform transition-transform translate-x-0">
                <div className="p-6 border-b border-slate-200/50 bg-slate-50/50 flex-shrink-0">
                  <div className="flex justify-between items-start mb-5 relative pr-10">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                        <img className="w-full h-full object-cover" src={selectedCustomer.avatar || 'https://ui-avatars.com/api/?background=random&name=' + selectedCustomer.username} alt="Profile" />
                      </div>
                      <div>
                        <h5 className="text-lg font-black text-slate-900 leading-tight flex items-center gap-2">
                          {selectedCustomer.full_name || selectedCustomer.username}
                          {!(selectedCustomer.is_active ?? true) && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded uppercase font-black tracking-widest leading-none">Locked</span>}
                        </h5>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 tracking-wide">{selectedCustomer.email}</p>
                        <p className="text-[11px] text-slate-500 font-medium tracking-wide">{selectedCustomer.phone || 'Chưa cập nhật SĐT'}</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} className="absolute top-0 right-0 p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer flex items-center justify-center">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hạng VIP</p>
                      <span className={`text-xs font-black inline-block leading-none ${getTierColor(selectedCustomer.membership_level || '').replace('bg-', 'text-').replace('border-', '')}`}>{selectedCustomer.membership_level || 'Bronze'}</span>
                    </div>
                    <div className="border-l border-r border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cộng dồn</p>
                      <span className="text-xs font-black text-slate-800">{(selectedCustomer.lotte_points ?? 0).toLocaleString()} <span className="text-[9px] font-medium text-slate-400">Pts</span></span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Đơn hàng</p>
                      <span className="text-xs font-black text-slate-800">{drawerData.orders.length}</span>
                    </div>
                  </div>

                  <div className="flex bg-slate-200/60 p-1 rounded-xl mt-6 overflow-x-auto no-scrollbar gap-1">
                    {[
                      {id: 'info', label: 'Hồ sơ'},
                      {id: 'orders', label: 'Đơn hàng'},
                      {id: 'addresses', label: 'Địa chỉ'},
                      {id: 'reviews', label: 'Đánh giá'},
                      {id: 'wishlist', label: 'Đã thích'}
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex-1 min-w-max whitespace-nowrap px-4 py-2.5 rounded-lg text-[11px] font-bold transition-all ${activeTab === t.id ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
                {drawerData.loading ? (
                   <div className="text-center text-slate-400 py-10 animate-pulse text-sm font-bold">Đang tải dữ liệu...</div>
                ) : (
                  <>
                    {/* TAB: INFO */}
                    {activeTab === 'info' && (
                      <div className="space-y-6">
                        <div>
                          <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Thông tin cá nhân</h6>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                              <span className="text-slate-500">Giới tính</span>
                              <span className="font-bold text-slate-800">{selectedCustomer.gender || 'Chưa cập nhật'}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                              <span className="text-slate-500">Ngày sinh</span>
                              <span className="font-bold text-slate-800">{selectedCustomer.dob ? new Date(selectedCustomer.dob).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                              <span className="text-slate-500">Tạo tài khoản</span>
                              <span className="font-bold text-slate-800">{selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString('vi-VN') : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                              <span className="text-slate-500">Đăng nhập cuối</span>
                              <span className="font-bold text-slate-800">{selectedCustomer.last_login_at ? new Date(selectedCustomer.last_login_at).toLocaleString('vi-VN') : 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Ghi chú nội bộ</h6>
                          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                             <p className="text-sm font-medium text-amber-800 whitespace-pre-wrap leading-relaxed">{selectedCustomer.note || 'Chưa có ghi chú nào cho khách hàng này.'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB: ORDERS */}
                    {activeTab === 'orders' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                          <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lịch sử ({drawerData.orders.length})</h6>
                        </div>
                        {drawerData.orders.length === 0 ? (
                           <div className="bg-surface-container-low rounded-xl p-6 text-center text-xs font-bold text-slate-400">Khách chưa mua hàng</div>
                        ) : drawerData.orders.map(o => (
                          <div key={o.id} className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm hover:shadow-md cursor-pointer transition-all">
                            <div className="flex justify-between mb-2">
                              <span className="text-xs font-black text-slate-900 leading-none">#{o.id}</span>
                              <span className="text-[10px] font-black uppercase tracking-wider text-primary truncate ml-2">{(o.total_amount || 0).toLocaleString()} ₫</span>
                            </div>
                            <div className="flex justify-between items-end">
                              <span className="text-[10px] font-medium text-slate-400">{new Date(o.created_at).toLocaleDateString('vi-VN')}</span>
                              <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase">{o.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* TAB: ADDRESSES */}
                    {activeTab === 'addresses' && (
                      <div className="space-y-4">
                        {drawerData.addresses.map(a => (
                          <div key={a.id} className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                            {a.is_default && <div className="absolute top-0 right-0 border-[16px] border-transparent border-t-primary border-r-primary"><span className="material-symbols-outlined absolute -top-4 -right-1.5 text-white text-[12px]">star</span></div>}
                            <p className="text-xs font-black text-slate-900 mb-1">{a.name} - {a.phone}</p>
                            <p className="text-[11px] text-slate-600 leading-tight pr-6">{a.street}, {a.ward}, {a.district}, {a.city}</p>
                          </div>
                        ))}
                        {drawerData.addresses.length === 0 && <div className="bg-surface-container-low rounded-xl p-6 text-center text-xs font-bold text-slate-400">Trống</div>}
                      </div>
                    )}

                    {/* TAB: REVIEWS */}
                    {activeTab === 'reviews' && (
                      <div className="space-y-4">
                        {drawerData.reviews.map(r => (
                          <div key={r.id} className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-[11px] font-bold text-slate-800 line-clamp-1">{r.product_name || 'Sản phẩm id: ' + r.product_id}</p>
                              <div className="flex text-amber-400">
                                {Array.from({length: 5}).map((_, i) => <span key={i} className="material-symbols-outlined text-[10px]" style={i < r.rating ? {fontVariationSettings: "'FILL' 1"}: {}}>star</span>)}
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-600 italic whitespace-pre-wrap">{r.content || 'Đánh giá không có nội dung'}</p>
                            <p className="text-[9px] text-slate-400 mt-2">{new Date(r.created_at).toLocaleDateString('vi-VN')}</p>
                          </div>
                        ))}
                        {drawerData.reviews.length === 0 && <div className="bg-surface-container-low rounded-xl p-6 text-center text-xs font-bold text-slate-400">Chưa đánh giá nào</div>}
                      </div>
                    )}

                    {/* TAB: WISHLIST */}
                    {activeTab === 'wishlist' && (
                      <div className="grid grid-cols-2 gap-3">
                        {drawerData.wishlists.length === 0 && <div className="col-span-2 bg-surface-container-low rounded-xl p-6 text-center text-xs font-bold text-slate-400">Trống</div>}
                        {drawerData.wishlists.map((w, idx) => (
                           <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm text-center">
                             <div className="w-full aspect-square bg-slate-100 rounded-lg mb-2 flex items-center justify-center">
                               <span className="material-symbols-outlined text-slate-300 text-3xl">image</span>
                             </div>
                             <p className="text-[10px] font-bold text-slate-700 line-clamp-2">Sản phẩm ID: {w.branch_product_id || w.product_id}</p>
                           </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-6 border-t border-slate-200/50 bg-white grid grid-cols-2 gap-3 flex-shrink-0 z-10 relative">
                <button onClick={() => setResetPassModalOpen(true)} className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all w-full flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-sm">key</span>
                  Reset Pass
                </button>
                <button onClick={(e) => { e.stopPropagation(); setEditForm(selectedCustomer || {}); setEditModalOpen(true); }} className="py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-black rounded-xl shadow-lg shadow-primary/20 transition-all w-full flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-sm">edit_document</span>
                  Cập nhật
                </button>
              </div>
            </aside>
          </>
        )}

          {/* Sub-modals for Action */}
          
          {/* Edit Modal */}
          {isEditModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditModalOpen(false)}></div>
              <div className="bg-white w-[500px] rounded-2xl shadow-2xl p-8 space-y-6 z-10 relative">
                <button onClick={() => setEditModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
                <h3 className="text-xl font-black text-slate-900 pr-8">Sửa Phân Tích Khách Hàng</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-500">Họ và tên</label>
                      <input className="w-full bg-surface-container-low border-none rounded-xl text-sm py-2 px-3 focus:ring-2 focus:ring-primary/20" value={editForm.full_name || ''} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-500">SĐT</label>
                      <input className="w-full bg-surface-container-low border-none rounded-xl text-sm py-2 px-3 focus:ring-2 focus:ring-primary/20" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                     </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500">Email</label>
                    <input className="w-full bg-surface-container-low border-none rounded-xl text-sm py-2 px-3 focus:ring-2 focus:ring-primary/20" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500">Ghi chú vận hành (ẩn với khách)</label>
                    <textarea className="w-full bg-amber-50/50 border border-amber-100 rounded-xl text-sm py-2 px-3 focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-none" value={editForm.note || ''} onChange={e => setEditForm({...editForm, note: e.target.value})}></textarea>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button onClick={() => setEditModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200">Đóng</button>
                  <button onClick={handleSaveCustomer} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-container shadow-lg shadow-primary/20">Lưu thay đổi</button>
                </div>
              </div>
            </div>
          )}

          {/* Adjust Points Modal */}
          {isPointsModalOpen && selectedCustomer && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPointsModalOpen(false)}></div>
              <div className="bg-white w-[400px] rounded-2xl shadow-2xl p-8 space-y-6 z-10 relative">
                <button onClick={() => setPointsModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
                <div className="text-center pt-2">
                  <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
                    <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>stars</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Chiết Khấu Điểm Hưởng</h3>
                  <p className="text-xs text-slate-500 mt-2 font-medium">Hiện có: <strong>{(selectedCustomer?.lotte_points ?? 0).toLocaleString()} Pts</strong></p>
                </div>
                
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500">Mức thay đổi (+/-)</label>
                    <input type="number" className="w-full bg-white border border-slate-200 rounded-xl text-sm py-2 px-3 focus:ring-2 focus:ring-amber-500/20 font-bold text-center" placeholder="Ví dụ: 1000 hoặc -500" value={pointsChange || ''} onChange={e => setPointsChange(parseInt(e.target.value) || 0)} />
                    <p className="text-[9px] text-slate-400 text-center mt-1">Hệ thống sẽ cập nhật ngay khi bạn xác nhận.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500">Lý do biến động</label>
                    <input className="w-full bg-white border border-slate-200 rounded-xl text-sm py-2 px-3 focus:ring-2 focus:ring-amber-500/20" placeholder="VD: Khuyến mãi đền bù đơn hàng trễ" value={pointsReason} onChange={e => setPointsReason(e.target.value)} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setPointsModalOpen(false)} className="flex-1 py-3 bg-transparent border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50">Hủy</button>
                  <button onClick={handleSavePoints} disabled={!pointsChange} className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl text-sm hover:bg-amber-600 shadow-lg shadow-amber-500/20 disabled:opacity-50">Cập nhật ví</button>
                </div>
              </div>
            </div>
          )}
          
          {/* Reset password Modal */}
          {isResetPassModalOpen && selectedCustomer && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setResetPassModalOpen(false)}></div>
              <div className="bg-white w-[400px] rounded-2xl shadow-2xl p-8 space-y-6 z-10 relative">
                <button onClick={() => setResetPassModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
                <div className="text-center pt-2">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                    <span className="material-symbols-outlined text-3xl">key</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Reset Mật Khẩu</h3>
                  <p className="text-xs text-slate-500 mt-2 font-medium">Bảo mật: Admin sẽ phát sinh 1 pass tạm thời gồm 8 ký tự cho user này. Bạn nên sao chép gửi thẳng cho khách.</p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setResetPassModalOpen(false)} className="flex-1 py-3 bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200">Không</button>
                  <button onClick={handleResetPassword} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-700 shadow-lg shadow-red-500/20">Sinh Pass Mới</button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Status Modal */}
          {isConfirmStatusModalOpen && customerToToggle && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmStatusModalOpen(false)}></div>
              <div className="bg-white w-[400px] rounded-2xl shadow-2xl p-8 space-y-6 z-10 relative">
                <button onClick={() => setConfirmStatusModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
                <div className="text-center pt-2">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${(customerToToggle.is_active ?? true) ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                    <span className="material-symbols-outlined text-3xl">{(customerToToggle.is_active ?? true) ? 'gpp_bad' : 'gpp_good'}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">{(customerToToggle.is_active ?? true) ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}</h3>
                  <p className="text-xs text-slate-500 mt-2 font-medium">Bạn có chắc chắn muốn {(customerToToggle.is_active ?? true) ? 'khóa' : 'mở khóa'} tài khoản của <strong className="text-slate-700">{customerToToggle.full_name || customerToToggle.username}</strong>?</p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setConfirmStatusModalOpen(false)} className="flex-1 py-3 bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200">Hủy</button>
                  <button onClick={handleConfirmToggleStatus} className={`flex-1 py-3 text-white font-bold rounded-xl text-sm shadow-lg ${(customerToToggle.is_active ?? true) ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'}`}>Xác Nhận</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminCustomers;