import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import enterpriseService from '../services/enterpriseService';
import { dataService } from '../../services/dataService';
import { toast } from '../../components/Toast/toastEvent';
import {
  PageHeader, SearchBar, StatusBadge, EmptyState,
  LoadingOverlay, PaginationControl, Modal, DetailDrawer,
  FormSection, FormField, StatCard, cls,
} from '../components/AdminUI';

const PAGE_SIZE = 10;

const generateSlug = (str: string) => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s_]/g, '')
    .trim()
    .replace(/\s+/g, '_');
};

/* Permission module grouping */
const PERMISSION_MODULES: Record<string, string> = {
  dashboard: '📊 Dashboard',
  products: '📦 Sản phẩm',
  orders: '🛒 Đơn hàng',
  inventory: '🏭 Tồn kho',
  imports: '📥 Nhập hàng',
  suppliers: '🚚 Nhà cung cấp',
  customers: '👥 Khách hàng',
  promotions: '🎁 Khuyến mãi',
  coupons: '🏷️ Coupon',
  flash_deals: '⚡ Flash Deal',
  posts: '📰 Bài viết / Sự kiện',
  events: '📅 Sự kiện',
  reviews: '⭐ Đánh giá',
  support: '🎧 Hỗ trợ',
  returns: '↩️ Đổi trả',
  branches: '📍 Chi nhánh',
  settings: '⚙️ Cài đặt',
  audit: '📋 Audit',
  roles: '🔐 Vai trò & Quyền',
};

const groupPermissions = (perms: any[]) => {
  const groups: Record<string, any[]> = {};
  perms.forEach((p) => {
    const parts = (p.key || '').split('.');
    const module = parts[0] || 'other';
    if (!groups[module]) groups[module] = [];
    groups[module].push(p);
  });
  return groups;
};

const ROLE_LEVEL_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Super Admin', color: 'bg-red-100 text-red-700 border-red-200' },
  10: { label: 'Admin', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  20: { label: 'Manager', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  30: { label: 'Staff', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  99: { label: 'Customer', color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const ACTION_COLORS: Record<string, string> = {
  read: 'bg-blue-50 text-blue-700 border-blue-200',
  write: 'bg-amber-50 text-amber-700 border-amber-200',
  manage: 'bg-red-50 text-red-700 border-red-200',
  create: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  delete: 'bg-rose-50 text-rose-700 border-rose-200',
};

const AdminRolesPermissions: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'roles' | 'staff'>('roles');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  
  // Staff tab states
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [createdStaffCreds, setCreatedStaffCreds] = useState<{ username: string; tempPass: string } | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  /* Create/Edit role modal */
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState('');
  const [autoGenKey, setAutoGenKey] = useState(true);
  const [roleForm, setRoleForm] = useState<any>({ key: '', name: '', description: '', permissions: [] as string[] });

  /* Assign role modal */
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRoleKey, setAssignRoleKey] = useState('');

  /* Create staff modal */
  const [createStaffOpen, setCreateStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState<any>({
    username: '', full_name: '', email: '', phone: '', password: '',
    role_key: '', branch_id: '', status: 'ACTIVE', employee_code: '', department: ''
  });

  /* User Search State */
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [focusedUserIndex, setFocusedUserIndex] = useState(-1);

  useEffect(() => {
    if (!assignOpen) {
      setUserQuery('');
      setUserResults([]);
      setSelectedUser(null);
      setFocusedUserIndex(-1);
      setAssignRoleKey('');
    }
  }, [assignOpen]);

  useEffect(() => {
    if (!userQuery || userQuery.trim().length < 2) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await dataService.searchUsers(userQuery);
        setUserResults(res);
        setFocusedUserIndex(-1);
      } catch {
        setUserResults([]);
        setFocusedUserIndex(-1);
      } finally {
        setSearchingUsers(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [userQuery]);

  /* Detail drawer */
  const [detailRole, setDetailRole] = useState<any>(null);

  const handleUserSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedUserIndex(prev => Math.min(prev + 1, userResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedUserIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedUserIndex >= 0 && userResults[focusedUserIndex]) {
        setSelectedUser(userResults[focusedUserIndex]);
      }
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesRes, permRes, branchesRes] = await Promise.all([
        enterpriseService.getRoles(),
        enterpriseService.getPermissions(),
        dataService.getBranches ? dataService.getBranches() : Promise.resolve([])
      ]);
      setRoles(Array.isArray(rolesRes) ? rolesRes : []);
      setPermissions(Array.isArray(permRes) ? permRes : []);
      setBranches(Array.isArray(branchesRes) ? branchesRes : []);
    } catch (err: any) {
      toast.error(err?.message || 'Không tải được RBAC data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStaff = useCallback(async () => {
    try {
      setLoadingStaff(true);
      const res = await dataService.getUsers({ role_type: 'staff' });
      setStaffList(res);
    } catch (err: any) {
      toast.error(err?.message || 'Không tải được danh sách nhân viên');
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setSearch('');
    setPage(1);
    if (activeTab === 'staff') {
      loadStaff();
    }
  }, [activeTab, loadStaff]);

  /* Grouped permissions */
  const permissionGroups = useMemo(() => groupPermissions(permissions), [permissions]);

  /* Filtered roles */
  const filteredRoles = useMemo(() => {
    let data = [...roles];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter((r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.key || '').toLowerCase().includes(q)
      );
    }
    return data;
  }, [roles, search]);

  const paginatedRoles = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRoles.slice(start, start + PAGE_SIZE);
  }, [filteredRoles, page]);

  /* Filtered staff */
  const filteredStaff = useMemo(() => {
    let data = [...staffList];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter((s) =>
        (s.full_name || '').toLowerCase().includes(q) ||
        (s.username || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q) ||
        (s.employee_info?.employee_code || '').toLowerCase().includes(q) ||
        (s.employee_info?.department || '').toLowerCase().includes(q)
      );
    }
    return data;
  }, [staffList, search]);

  const paginatedStaff = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredStaff.slice(start, start + PAGE_SIZE);
  }, [filteredStaff, page]);

  const stats = useMemo(() => ({
    totalRoles: roles.length,
    systemRoles: roles.filter((r) => r.is_system).length,
    customRoles: roles.filter((r) => !r.is_system).length,
    totalPerms: permissions.length,
  }), [roles, permissions]);

  const staffStats = useMemo(() => ({
    totalStaff: staffList.length,
    activeStaff: staffList.filter((s) => s.is_active !== false).length,
    lockedStaff: staffList.filter((s) => s.is_active === false).length,
    superAdmins: staffList.filter((s) => s.role_id === 1).length,
  }), [staffList]);

  /* Toggle permission */
  const togglePermission = (key: string) => {
    setRoleForm((prev: any) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((k: string) => k !== key)
        : [...prev.permissions, key],
    }));
  };

  const selectAllPerms = () => {
    setRoleForm((prev: any) => ({ ...prev, permissions: permissions.map((p) => p.key) }));
  };

  const clearAllPerms = () => {
    setRoleForm((prev: any) => ({ ...prev, permissions: [] }));
  };

  const toggleModulePerms = (modulePerms: any[], checked: boolean) => {
    const keys = modulePerms.map((p) => p.key);
    setRoleForm((prev: any) => ({
      ...prev,
      permissions: checked
        ? [...new Set([...prev.permissions, ...keys])]
        : prev.permissions.filter((k: string) => !keys.includes(k)),
    }));
  };

  /* Open create modal */
  const openCreateRole = () => {
    setEditingRoleId('');
    setAutoGenKey(true);
    setRoleForm({ key: '', name: '', description: '', permissions: [], is_active: true });
    setRoleModalOpen(true);
  };

  /* Open edit modal */
  const openEditRole = (role: any) => {
    setEditingRoleId(String(role._id || role.id));
    setAutoGenKey(false);
    setRoleForm({
      key: role.key || '',
      name: role.name || '',
      description: role.description || '',
      permissions: Array.isArray(role.permissions) ? [...role.permissions] : [],
      is_active: role.is_active !== false,
    });
    setRoleModalOpen(true);
  };

  /* Save role */
  const saveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.key || !roleForm.name) {
      return toast.error('Vui lòng điền đầy đủ Tên vai trò và Role Key');
    }

    const keyRegex = /^[a-z0-9_]+$/;
    if (!keyRegex.test(roleForm.key)) {
      return toast.error('Role Key không hợp lệ (chỉ dùng chữ thường, số và dấu gạch dưới, ví dụ: procurement_staff)');
    }
    try {
      setSubmitting(true);
      if (editingRoleId) {
        await enterpriseService.updateRole(editingRoleId, roleForm);
        toast.success('Đã cập nhật role');
      } else {
        await enterpriseService.createRole(roleForm);
        toast.success('Đã tạo role');
      }
      setRoleModalOpen(false);
      setRoleForm({ key: '', name: '', description: '', permissions: [], is_active: true });
      setEditingRoleId('');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu role');
    } finally {
      setSubmitting(false);
    }
  };

  /* Assign role */
  const assignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedUser._id) return toast.error(t('roles.selectUserFirst', 'Chọn người dùng cần gán'));
    if (!assignRoleKey) return toast.error(t('roles.selectRoleFirst', 'Chọn vai trò cần gán'));
    
    const targetRole = roles.find(r => r.key === assignRoleKey);
    if (targetRole?.is_system && !window.confirm(t('roles.confirmSystemRole', `Xác nhận gán vai trò HỆ THỐNG ({{roleName}}) cho {{userName}}?`, { roleName: targetRole.name, userName: selectedUser.full_name }))) {
      return;
    }

    try {
      setSubmitting(true);
      await enterpriseService.assignUserRole({ user_id: selectedUser._id, role_key: assignRoleKey });
      toast.success(t('roles.assignSuccess', 'Đã gán vai trò cho user'));
      setAssignOpen(false);
      setSelectedUser(null);
      setUserQuery('');
      setAssignRoleKey('');
      if (activeTab === 'staff') await loadStaff();
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể gán role');
    } finally {
      setSubmitting(false);
    }
  };

  /* Create Staff */
  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.username || !staffForm.role_key) {
      return toast.error('Vui lòng điền các trường bắt buộc (Username, Vai trò)');
    }

    const usernameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!usernameRegex.test(staffForm.username)) {
      return toast.error('Tên đăng nhập không hợp lệ (chỉ được dùng chữ, số, dấu chấm, gạch ngang, gạch dưới, không có khoảng trắng)');
    }

    if (staffForm.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(staffForm.email)) {
        return toast.error('Địa chỉ email không hợp lệ');
      }
    }

    if (staffForm.phone) {
      const phoneRegex = /^[0-9+() -]+$/;
      if (!phoneRegex.test(staffForm.phone)) {
        return toast.error('Số điện thoại không hợp lệ');
      }
    }
    try {
      setSubmitting(true);
      const res = await enterpriseService.createStaff(staffForm);
      toast.success('Đã tạo tài khoản nhân viên thành công!');
      setCreateStaffOpen(false);
      setStaffForm({
        username: '', full_name: '', email: '', phone: '', password: '',
        role_key: '', branch_id: '', status: 'ACTIVE', employee_code: '', department: ''
      });
      // Set generated credentials to display once
      setCreatedStaffCreds({ username: res.data.username, tempPass: res.tempPassword });
      if (activeTab === 'staff') await loadStaff();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo tài khoản nhân viên');
    } finally {
      setSubmitting(false);
    }
  };

  /* Toggle User Account Status */
  const handleToggleUserStatus = async (user: any) => {
    try {
      setLoading(true);
      await dataService.toggleUserStatus(user._id || user.id);
      toast.success('Cập nhật trạng thái thành công');
      await loadStaff();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật trạng thái');
    } finally {
      setLoading(false);
    }
  };

  /* Secure Password Reset Flow */
  const handleResetPassword = async (user: any) => {
    const customPass = window.prompt(
      `Nhập mật khẩu mới cho nhân viên ${user.full_name || user.username} (Để trống để hệ thống tự động sinh ngẫu nhiên):`
    );
    if (customPass === null) return; // cancelled

    try {
      setLoading(true);
      const res = await dataService.resetUserPassword(user._id || user.id, customPass.trim() || undefined);
      setCreatedStaffCreds({ username: user.username, tempPass: res.newPass });
      toast.success('Đã đặt lại mật khẩu nhân viên thành công!');
      await loadStaff();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  /* Delete Staff Account */
  const handleDeleteStaff = async (user: any) => {
    if (!window.confirm(`Xác nhận XÓA vĩnh viễn tài khoản nhân viên ${user.full_name || user.username}? Hành động này sẽ được ghi vào nhật ký kiểm toán và không thể hoàn tác.`)) {
      return;
    }
    try {
      setLoading(true);
      await dataService.deleteUser(user._id || user.id);
      toast.success('Đã xóa tài khoản nhân viên thành công!');
      await loadStaff();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa tài khoản');
    } finally {
      setLoading(false);
    }
  };

  /* Quick action to assign role directly from Staff list */
  const handleAssignRoleDirectly = (user: any) => {
    setSelectedUser(user);
    setAssignRoleKey(user.role_key || '');
    setAssignOpen(true);
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title={t('roles.pageTitle', 'Vai trò & Quyền hạn')}
        subtitle={t('roles.pageSubtitle', 'Quản lý phân quyền truy cập hệ thống theo vai trò')}
        icon="admin_panel_settings"
        actions={
          <div className="flex gap-3">
            <button onClick={() => setCreateStaffOpen(true)} className={`${cls.btnPrimary} bg-emerald-600 hover:bg-emerald-700`}>
              <span className="material-symbols-outlined text-sm">badge</span>
              {t('roles.createStaff', 'Tạo nhân viên')}
            </button>
            <button onClick={() => setAssignOpen(true)} className={cls.btnSecondary}>
              <span className="material-symbols-outlined text-sm">person_add</span>
              {t('roles.assignRole', 'Gán vai trò')}
            </button>
            <button onClick={openCreateRole} className={cls.btnPrimary}>
              <span className="material-symbols-outlined text-sm">add</span>
              {t('roles.createRole', 'Tạo vai trò mới')}
            </button>
          </div>
        }
      />

      {/* Dynamic Stats Cards Based on Tab */}
      {activeTab === 'roles' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard label={t('roles.totalRoles', 'Tổng vai trò')} value={stats.totalRoles} icon="badge" color="blue" />
          <StatCard label={t('roles.systemRoles', 'Vai trò hệ thống')} value={stats.systemRoles} icon="lock" color="violet" />
          <StatCard label={t('roles.customRoles', 'Vai trò tùy chỉnh')} value={stats.customRoles} icon="edit" color="emerald" />
          <StatCard label={t('roles.totalPerms', 'Tổng quyền')} value={stats.totalPerms} icon="key" color="amber" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Tổng nhân sự" value={staffStats.totalStaff} icon="groups" color="blue" />
          <StatCard label="Hoạt động" value={staffStats.activeStaff} icon="check_circle" color="emerald" />
          <StatCard label="Bị khóa" value={staffStats.lockedStaff} icon="block" color="red" />
          <StatCard label="Super Admin" value={staffStats.superAdmins} icon="admin_panel_settings" color="violet" />
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex gap-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('roles')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'roles'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="material-symbols-outlined text-sm">lock</span>
          Vai trò & Quyền hạn
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'staff'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="material-symbols-outlined text-sm">badge</span>
          Tài khoản nhân viên
        </button>
      </div>

      {/* Search Bar & Refresh */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={activeTab === 'roles' ? 'Tìm theo tên vai trò, key...' : 'Tìm nhân viên theo tên, SĐT, email, mã nhân viên...'}
        />
        <button onClick={activeTab === 'roles' ? loadData : loadStaff} className={cls.btnSecondary}>
          <span className="material-symbols-outlined text-sm">refresh</span> Làm mới
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <div className={`${cls.card} overflow-hidden relative`}>
        <LoadingOverlay visible={loading || (activeTab === 'staff' && loadingStaff)} />

        {activeTab === 'roles' ? (
          /* ==================== ROLES TABLE ==================== */
          !loading && filteredRoles.length === 0 ? (
            <EmptyState
              icon="admin_panel_settings"
              title="Chưa có vai trò nào"
              description="Tạo vai trò mới để bắt đầu phân quyền"
              action={
                <button onClick={openCreateRole} className={cls.btnPrimary}>
                  <span className="material-symbols-outlined text-sm">add</span> Tạo vai trò
                </button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className={cls.thCell}>#</th>
                      <th className={cls.thCell}>Tên vai trò</th>
                      <th className={cls.thCell}>Cấp bậc</th>
                      <th className={cls.thCell}>Key</th>
                      <th className={cls.thCell}>Trạng thái</th>
                      <th className={cls.thCell}>Quyền</th>
                      <th className={cls.thCell}>Loại</th>
                      <th className={cls.thCell}>Cập nhật</th>
                      <th className={`${cls.thCell} text-right`}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRoles.map((r, idx) => {
                      const permCount = Array.isArray(r.permissions) ? r.permissions.length : 0;
                      return (
                        <tr key={String(r._id)} className="hover:bg-slate-50/60 transition-colors group">
                          <td className={`${cls.tdCell} text-slate-400`}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className={cls.tdCell}>
                            <button onClick={() => setDetailRole(r)} className="font-semibold text-slate-900 hover:text-red-600 transition-colors text-left">
                              {r.name}
                            </button>
                          </td>
                          <td className={cls.tdCell}>
                            {(() => {
                              const lvl = ROLE_LEVEL_LABELS[r.level] || ROLE_LEVEL_LABELS[99];
                              return (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${lvl.color}`}>
                                  <span className="material-symbols-outlined text-[10px]">shield</span>
                                  Lv.{r.level ?? 99}
                                </span>
                              );
                            })()}
                          </td>
                          <td className={cls.tdCell}>
                            <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-lg">{r.key}</span>
                          </td>
                          <td className={cls.tdCell}>
                            <StatusBadge status={r.is_active !== false ? 'active' : 'inactive'} label={r.is_active !== false ? 'Hoạt động' : 'Tạm khóa'} />
                          </td>
                          <td className={cls.tdCell}>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <span className="material-symbols-outlined text-[12px]">key</span>
                              {permCount}
                            </span>
                          </td>
                          <td className={cls.tdCell}>
                            <StatusBadge status={r.is_system ? 'yes' : 'no'} label={r.is_system ? 'Hệ thống' : 'Tùy chỉnh'} />
                          </td>
                          <td className={cls.tdCell}>
                            <span className="text-[10px] text-slate-400">
                              {r.updated_at ? new Date(r.updated_at).toLocaleDateString('vi-VN') : '—'}
                            </span>
                          </td>
                          <td className={`${cls.tdCell} text-right`}>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setDetailRole(r)} className={cls.btnGhost} title="Xem">
                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                              </button>
                              <button onClick={() => openEditRole(r)} className={cls.btnGhost} title="Sửa">
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationControl page={page} pageSize={PAGE_SIZE} total={filteredRoles.length} onChange={setPage} />
            </>
          )
        ) : (
          /* ==================== STAFF TABLE ==================== */
          !loadingStaff && filteredStaff.length === 0 ? (
            <EmptyState
              icon="groups"
              title="Không tìm thấy nhân viên"
              description="Chưa có nhân viên nào phù hợp với bộ lọc tìm kiếm của bạn"
              action={
                <button onClick={() => setCreateStaffOpen(true)} className={cls.btnPrimary}>
                  <span className="material-symbols-outlined text-sm">add</span> Thêm nhân viên mới
                </button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className={cls.thCell}>#</th>
                      <th className={cls.thCell}>Họ tên / Tài khoản</th>
                      <th className={cls.thCell}>Phòng ban / Vai trò</th>
                      <th className={cls.thCell}>Liên hệ</th>
                      <th className={cls.thCell}>Chi nhánh</th>
                      <th className={cls.thCell}>Trạng thái</th>
                      <th className={cls.thCell}>Ngày tạo</th>
                      <th className={`${cls.thCell} text-right`}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedStaff.map((s, idx) => {
                      const branch = branches.find(b => String(b._id || b.id) === String(s.branch_id));
                      return (
                        <tr key={String(s._id)} className="hover:bg-slate-50/60 transition-colors group">
                          <td className={`${cls.tdCell} text-slate-400`}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className={cls.tdCell}>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200">
                                {s.avatar || s.profile_picture ? (
                                  <img src={s.avatar || s.profile_picture} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="material-symbols-outlined text-slate-400 text-[18px]">person</span>
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 leading-tight">
                                  {s.full_name || '—'}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{s.username}</span>
                                  {s.employee_info?.employee_code && (
                                    <span className="text-[10px] text-slate-400 font-bold border border-slate-200 px-1 rounded bg-white">{s.employee_info.employee_code}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className={cls.tdCell}>
                            <div className="space-y-0.5">
                              <div className="text-xs text-slate-500 font-medium">
                                {s.employee_info?.department || '—'}
                              </div>
                              <div>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border bg-slate-100 text-slate-700 border-slate-200`}>
                                  <span className="material-symbols-outlined text-[10px]">shield</span>
                                  {s.role_key || 'staff'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className={cls.tdCell}>
                            <div className="text-xs space-y-0.5">
                              <div className="text-slate-700 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px] text-slate-400">mail</span>
                                {s.email || '—'}
                              </div>
                              <div className="text-slate-500 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px] text-slate-400">phone</span>
                                {s.phone || '—'}
                              </div>
                            </div>
                          </td>
                          <td className={cls.tdCell}>
                            <span className="text-xs text-slate-600 font-medium">
                              {branch ? branch.name : 'Tất cả chi nhánh'}
                            </span>
                          </td>
                          <td className={cls.tdCell}>
                            <StatusBadge status={s.is_active !== false ? 'active' : 'inactive'} label={s.is_active !== false ? 'Hoạt động' : 'Đã khóa'} />
                          </td>
                          <td className={cls.tdCell}>
                            <span className="text-[10px] text-slate-400">
                              {s.created_at ? new Date(s.created_at).toLocaleDateString('vi-VN') : '—'}
                            </span>
                          </td>
                          <td className={`${cls.tdCell} text-right`}>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleToggleUserStatus(s)} className={cls.btnGhost} title={s.is_active !== false ? 'Khóa tài khoản' : 'Kích hoạt'}>
                                <span className={`material-symbols-outlined text-[16px] ${s.is_active !== false ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {s.is_active !== false ? 'block' : 'check_circle'}
                                </span>
                              </button>
                              <button onClick={() => handleAssignRoleDirectly(s)} className={cls.btnGhost} title="Thay đổi vai trò">
                                <span className="material-symbols-outlined text-[16px] text-blue-500">
                                  manage_accounts
                                </span>
                              </button>
                              <button onClick={() => handleResetPassword(s)} className={cls.btnGhost} title="Đặt lại mật khẩu">
                                <span className="material-symbols-outlined text-[16px] text-amber-500">
                                  lock_reset
                                </span>
                              </button>
                              <button onClick={() => handleDeleteStaff(s)} className={cls.btnGhost} title="Xóa nhân viên">
                                <span className="material-symbols-outlined text-[16px] text-rose-500">
                                  delete
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationControl page={page} pageSize={PAGE_SIZE} total={filteredStaff.length} onChange={setPage} />
            </>
          )
        )}
      </div>

      {/* ========== CREATE/EDIT ROLE MODAL ========== */}
      <Modal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={editingRoleId ? 'Chỉnh sửa vai trò' : 'Tạo vai trò mới'}
        subtitle={editingRoleId ? `Cập nhật thông tin và quyền` : 'Thiết lập vai trò và phân quyền'}
        icon={editingRoleId ? 'edit' : 'add'}
        size="xl"
        footer={
          <>
            <div className="flex-1 text-xs text-slate-500">
              Đã chọn <strong className="text-red-600">{roleForm.permissions.length}</strong> / {permissions.length} quyền
            </div>
            <button type="button" onClick={() => setRoleModalOpen(false)} className={cls.btnSecondary}>Hủy</button>
            <button type="submit" form="role-form" disabled={submitting} className={cls.btnPrimary}>
              {submitting && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              {editingRoleId ? 'Cập nhật' : 'Tạo vai trò'}
            </button>
          </>
        }
      >
        <form id="role-form" onSubmit={saveRole}>
          <FormSection title="Thông tin vai trò">
            <FormField label="Tên vai trò" required>
              <input 
                className={cls.input} 
                placeholder="VD: Nhân viên thu mua" 
                value={roleForm.name} 
                onChange={(e) => {
                  const val = e.target.value;
                  setRoleForm((prev: any) => {
                    const next = { ...prev, name: val };
                    if (autoGenKey && !editingRoleId) {
                      next.key = generateSlug(val);
                    }
                    return next;
                  });
                }} 
              />
            </FormField>
            <FormField label="Role Key (Mã vai trò)" required>
              <input 
                className={cls.input} 
                placeholder="VD: procurement_staff" 
                value={roleForm.key} 
                onChange={(e) => {
                  setAutoGenKey(false);
                  setRoleForm({ ...roleForm, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') });
                }} 
                disabled={!!editingRoleId} 
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Mã định danh dùng cho logic hệ thống (chữ thường, số, dấu gạch dưới).
                {!editingRoleId && (
                  <label className="inline-flex items-center gap-1 ml-2 text-red-500 font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={autoGenKey} 
                      onChange={(e) => setAutoGenKey(e.target.checked)} 
                      className="w-3 h-3 rounded border-slate-300 text-red-650 focus:ring-red-500 cursor-pointer" 
                    />
                    Tự động tạo từ tên
                  </label>
                )}
              </span>
            </FormField>
            <FormField label="Trạng thái">
              <select className={cls.select + ' w-full'} value={roleForm.is_active ? '1' : '0'} onChange={(e) => setRoleForm({ ...roleForm, is_active: e.target.value === '1' })}>
                <option value="1">Hoạt động</option>
                <option value="0">Khóa</option>
              </select>
            </FormField>
            <FormField label="Mô tả" colSpan={2}>
              <input className={cls.input} placeholder="Mô tả vai trò..." value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} />
            </FormField>
          </FormSection>

          {/* Compact Permission Matrix */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('roles.permissionMatrix', 'Ma trận quyền hạn')}</h4>
              <div className="flex gap-2">
                <button type="button" onClick={selectAllPerms} className="px-3 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                  {t('roles.selectAll', 'Chọn tất cả')}
                </button>
                <button type="button" onClick={clearAllPerms} className="px-3 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                  {t('roles.deselectAll', 'Bỏ chọn')}
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[420px] overflow-y-auto">
              {Object.entries(permissionGroups).map(([module, perms]) => {
                const allChecked = perms.every((p) => roleForm.permissions.includes(p.key));
                const someChecked = perms.some((p) => roleForm.permissions.includes(p.key));
                const checkedCount = perms.filter((p) => roleForm.permissions.includes(p.key)).length;
                const moduleLabel = PERMISSION_MODULES[module] || `📁 ${module.charAt(0).toUpperCase() + module.slice(1)}`;
                const isExpanded = expandedModules[module] ?? false;
                const accessLevel = allChecked ? 'full' : someChecked ? 'partial' : 'none';

                return (
                  <div key={module} className="border-b border-slate-100 last:border-b-0">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/80 hover:bg-slate-100/80 transition-colors">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                        onChange={() => toggleModulePerms(perms, !allChecked)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer flex-shrink-0"
                      />
                      <button type="button" onClick={() => setExpandedModules(prev => ({...prev, [module]: !isExpanded}))} className="flex-1 flex items-center gap-2 text-left min-w-0">
                        <span className="text-xs font-bold text-slate-700 truncate">{moduleLabel}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                          accessLevel === 'full' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          accessLevel === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>{checkedCount}/{perms.length}</span>
                      </button>
                      {!isExpanded && (
                        <div className="flex gap-1 flex-shrink-0">
                          {perms.map((p) => {
                            const action = (p.key || '').split('.')[1] || p.key;
                            const isOn = roleForm.permissions.includes(p.key);
                            return (
                              <button key={p.key} type="button" onClick={() => togglePermission(p.key)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
                                  isOn ? (ACTION_COLORS[action] || 'bg-blue-50 text-blue-700 border-blue-200') : 'bg-white text-slate-300 border-slate-200 hover:border-slate-300'
                                }`}
                                title={p.label || p.key}
                              >{action}</button>
                            );
                          })}
                        </div>
                      )}
                      <span className="material-symbols-outlined text-[14px] text-slate-400 flex-shrink-0 cursor-pointer" onClick={() => setExpandedModules(prev => ({...prev, [module]: !isExpanded}))}>
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="flex flex-wrap gap-1.5 px-4 py-2 pl-8 bg-white">
                        {perms.map((p) => {
                          const action = (p.key || '').split('.')[1] || p.key;
                          const isOn = roleForm.permissions.includes(p.key);
                          return (
                            <label key={p.key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer border transition-all ${
                              isOn ? (ACTION_COLORS[action] || 'bg-blue-50 text-blue-700 border-blue-200') : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                            }`}>
                              <input type="checkbox" checked={isOn} onChange={() => togglePermission(p.key)} className="w-3 h-3 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer" />
                              {action}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      {/* ========== ASSIGN ROLE MODAL ========== */}
      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Gán vai trò cho người dùng"
        subtitle="Chọn người dùng và vai trò cần gán"
        icon="person_add"
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setAssignOpen(false)} className={cls.btnSecondary}>Hủy</button>
            <button type="submit" form="assign-form" disabled={submitting} className={cls.btnPrimary}>
              {submitting && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              Gán vai trò
            </button>
          </>
        }
      >
        <form id="assign-form" onSubmit={assignRole} className="space-y-4">
          <FormField label={t('roles.userLabel', 'Người dùng')} required>
            {!selectedUser ? (
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined absolute left-3 text-slate-400">search</span>
                  <input
                    type="text"
                    placeholder={t('roles.searchUserPlaceholder', 'Tìm theo email, SĐT, tên, ID...')}
                    className={cls.input + ' pl-10 w-full'}
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    onKeyDown={handleUserSearchKeyDown}
                  />
                  {searchingUsers && <span className="material-symbols-outlined animate-spin text-slate-400 absolute right-3">progress_activity</span>}
                </div>
                {userQuery.trim().length >= 2 && userResults.length === 0 && !searchingUsers && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 shadow-lg rounded-xl p-3 text-sm text-slate-500 text-center">
                    {t('roles.noUsersFound', 'Không tìm thấy người dùng')}
                  </div>
                )}
                {userResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    {userResults.map((u, idx) => (
                      <div
                        key={String(u._id)}
                        className={`px-4 py-3 flex gap-3 border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${focusedUserIndex === idx ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                        onClick={() => setSelectedUser(u)}
                        onMouseEnter={() => setFocusedUserIndex(idx)}
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {u.avatar || u.profile_picture ? (
                            <img src={u.avatar || u.profile_picture} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-slate-400 text-[20px]">person</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-slate-800 text-sm truncate">{u.full_name || u.username || t('roles.unnamed', 'Chưa cập nhật tên')}</div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${u.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {u.is_active !== false ? 'Active' : 'Locked'}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <span className="text-xs text-slate-500 flex items-center gap-1 truncate"><span className="material-symbols-outlined text-[12px]">mail</span> {u.email}</span>
                            <span className="text-xs text-slate-500 flex items-center gap-1 truncate"><span className="material-symbols-outlined text-[12px]">phone</span> {u.phone || '—'}</span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">ID: {u._id}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {selectedUser.avatar || selectedUser.profile_picture ? (
                      <img src={selectedUser.avatar || selectedUser.profile_picture} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-slate-400 text-[24px]">person</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-slate-800 text-sm">{selectedUser.full_name || selectedUser.username}</div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${selectedUser.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {selectedUser.is_active !== false ? 'Active' : 'Locked'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{selectedUser.email} • {selectedUser.phone || '—'}</div>
                    {selectedUser.role_key && (
                      <div className="mt-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg inline-block">
                        {t('roles.currentRole', 'Đang có vai trò:')} {selectedUser.role_key}
                      </div>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/50 transition-colors">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}
          </FormField>
          <FormField label={t('roles.roleLabel', 'Vai trò')} required>
            <select className={cls.select + ' w-full'} value={assignRoleKey} onChange={(e) => setAssignRoleKey(e.target.value)}>
              <option value="">{t('roles.selectRoleFirst', '-- Chọn vai trò --')}</option>
              {roles.map((r: any) => (
                <option key={String(r._id)} value={r.key}>
                  {r.name} ({r.key})
                </option>
              ))}
            </select>
          </FormField>
        </form>
      </Modal>

      {/* ========== CREATE STAFF MODAL (NO password input) ========== */}
      <Modal
        open={createStaffOpen}
        onClose={() => setCreateStaffOpen(false)}
        title="Tạo tài khoản nhân viên"
        subtitle="Hệ thống sẽ tự động tạo mật khẩu tạm thời cho tài khoản này"
        icon="badge"
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setCreateStaffOpen(false)} className={cls.btnSecondary}>Hủy</button>
            <button type="submit" form="staff-form" disabled={submitting} className={cls.btnPrimary}>
              {submitting && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              Tạo nhân viên
            </button>
          </>
        }
      >
        <form id="staff-form" onSubmit={createStaff} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Tên đăng nhập" required>
              <input className={cls.input} placeholder="Ví dụ: nva.warehouse" value={staffForm.username} onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })} />
            </FormField>
            <FormField label="Vai trò hệ thống" required>
              <select className={cls.select + ' w-full'} value={staffForm.role_key} onChange={(e) => setStaffForm({ ...staffForm, role_key: e.target.value })}>
                <option value="">-- Chọn vai trò --</option>
                {roles.map((r: any) => (
                  <option key={String(r._id)} value={r.key}>
                    {r.name} ({r.key})
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Họ và tên">
              <input className={cls.input} placeholder="Nguyễn Văn A" value={staffForm.full_name} onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })} />
            </FormField>
            <FormField label="Số điện thoại">
              <input className={cls.input} placeholder="09xxxxxxx" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
            </FormField>
            <FormField label="Email">
              <input type="email" className={cls.input} placeholder="nva@lottemart.com" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
            </FormField>
            <FormField label="Chi nhánh (Tùy chọn)">
              <select className={cls.select + ' w-full'} value={staffForm.branch_id} onChange={(e) => setStaffForm({ ...staffForm, branch_id: e.target.value })}>
                <option value="">-- Không giới hạn --</option>
                {branches.map((b: any) => (
                  <option key={String(b._id || b.id)} value={String(b._id || b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Phòng ban">
              <input className={cls.input} placeholder="Kho, Bán hàng..." value={staffForm.department} onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })} />
            </FormField>
            <FormField label="Mã nhân viên">
              <input className={cls.input} placeholder="NV001" value={staffForm.employee_code} onChange={(e) => setStaffForm({ ...staffForm, employee_code: e.target.value })} />
            </FormField>
            <FormField label="Trạng thái tài khoản" required>
              <select className={cls.select + ' w-full'} value={staffForm.status} onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value })}>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Khóa tạm thời</option>
              </select>
            </FormField>
            <FormField label="Mật khẩu tạm thời (Để trống hệ thống tự động sinh)">
              <input
                type="text"
                className={cls.input}
                placeholder="Nhập mật khẩu hoặc để trống"
                value={staffForm.password || ''}
                onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
              />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* ========== SECURE CREDENTIALS DISPLAY MODAL (Shown once) ========== */}
      <Modal
        open={!!createdStaffCreds}
        onClose={() => setCreatedStaffCreds(null)}
        title="Thông tin tài khoản tạm thời"
        subtitle="Vui lòng sao chép thông tin đăng nhập mới để bàn giao"
        icon="key"
        size="sm"
        footer={
          <button type="button" onClick={() => setCreatedStaffCreds(null)} className={cls.btnPrimary}>
            Xác nhận & Đóng
          </button>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3 border border-slate-100 dark:border-slate-700">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tên đăng nhập</div>
              <div className="text-sm font-semibold text-slate-850 dark:text-slate-100 font-mono mt-1 flex items-center justify-between">
                <span>{createdStaffCreds?.username}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdStaffCreds?.username || '');
                    toast.success('Đã sao chép tên đăng nhập');
                  }}
                  className="text-slate-400 hover:text-slate-650 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
                  title="Sao chép"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mật khẩu tạm thời</div>
              <div className="text-sm font-bold text-red-600 dark:text-red-400 font-mono mt-1 flex items-center justify-between">
                <span>{createdStaffCreds?.tempPass}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdStaffCreds?.tempPass || '');
                    toast.success('Đã sao chép mật khẩu');
                  }}
                  className="text-slate-400 hover:text-slate-650 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
                  title="Sao chép"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
              </div>
            </div>
          </div>
          <div className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 p-3 rounded-xl flex gap-2">
            <span className="material-symbols-outlined text-base flex-shrink-0 text-amber-500">warning</span>
            <span>
              Thông tin mật khẩu này chỉ hiển thị <strong>MỘT LẦN DUY NHẤT</strong>. Nhân viên bắt buộc phải đổi mật khẩu ngay trong lần đăng nhập đầu tiên để bảo mật tài khoản.
            </span>
          </div>
        </div>
      </Modal>

      {/* ========== DETAIL DRAWER ========== */}
      <DetailDrawer
        open={!!detailRole}
        onClose={() => setDetailRole(null)}
        title={detailRole?.name || 'Chi tiết vai trò'}
        subtitle={`Key: ${detailRole?.key || ''}`}
        icon="admin_panel_settings"
      >
        {detailRole && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailRole.is_system ? 'yes' : 'no'} label={detailRole.is_system ? t('roles.system', 'Hệ thống') : t('roles.custom', 'Tùy chỉnh')} />
              {(() => {
                const lvl = ROLE_LEVEL_LABELS[detailRole.level] || ROLE_LEVEL_LABELS[99];
                return (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${lvl.color}`}>
                    <span className="material-symbols-outlined text-[10px]">shield</span>
                    Lv.{detailRole.level ?? 99} — {lvl.label}
                  </span>
                );
              })()}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${detailRole.is_active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                {detailRole.is_active !== false ? '✓ ' + t('roles.active', 'Hoạt động') : '✕ ' + t('roles.locked', 'Tạm khóa')}
              </span>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('roles.roleInfo', 'Thông tin vai trò')}</h4>
              <div className="space-y-1">
                <InfoRow label={t('roles.name', 'Tên')} value={detailRole.name} />
                <InfoRow label="Key" value={detailRole.key} />
                {detailRole.description && <InfoRow label={t('roles.description', 'Mô tả')} value={detailRole.description} />}
                <InfoRow label={t('roles.createdAt', 'Tạo lúc')} value={detailRole.created_at ? new Date(detailRole.created_at).toLocaleString('vi-VN') : '—'} />
                <InfoRow label={t('roles.updatedAt', 'Cập nhật')} value={detailRole.updated_at ? new Date(detailRole.updated_at).toLocaleString('vi-VN') : '—'} />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {t('roles.permissions', 'Quyền hạn')} ({Array.isArray(detailRole.permissions) ? detailRole.permissions.length : 0})
              </h4>
              {Array.isArray(detailRole.permissions) && detailRole.permissions.length > 0 ? (
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                  {(() => {
                    const grouped: Record<string, string[]> = {};
                    detailRole.permissions.forEach((perm: string) => {
                      const mod = perm.split('.')[0] || 'other';
                      if (!grouped[mod]) grouped[mod] = [];
                      grouped[mod].push(perm);
                    });
                    const allModuleKeys = Object.keys(PERMISSION_MODULES);
                    return allModuleKeys.map((mod) => {
                      const perms = grouped[mod] || [];
                      const label = PERMISSION_MODULES[mod];
                      const hasAll = permissions.filter(p => (p.key || '').startsWith(mod + '.')).length === perms.length && perms.length > 0;
                      const hasNone = perms.length === 0;

                      return (
                        <div key={mod} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${hasNone ? 'bg-slate-50/50' : 'bg-slate-50/80'}`}>
                          <span className="text-[11px] font-semibold text-slate-600 w-32 truncate flex-shrink-0">{label}</span>
                          <div className="flex-1 flex flex-wrap gap-1 min-w-0">
                            {hasNone ? (
                              <span className="text-[9px] text-slate-300 font-medium">—</span>
                            ) : perms.map((p) => {
                              const action = p.split('.')[1] || p;
                              return (
                                <span key={p} className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${ACTION_COLORS[action] || 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                  {action}
                                </span>
                              );
                            })}
                          </div>
                          <span className={`text-[8px] font-bold uppercase tracking-wider flex-shrink-0 ${hasAll ? 'text-emerald-600' : hasNone ? 'text-slate-300' : 'text-amber-600'}`}>
                            {hasAll ? t('roles.fullAccess', 'FULL') : hasNone ? '' : t('roles.partialAccess', 'PARTIAL')}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <p className="text-xs text-slate-400">{t('roles.noPermissions', 'Không có quyền nào được gán')}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => { openEditRole(detailRole); setDetailRole(null); }} className={cls.btnPrimary + ' flex-1 justify-center'}>
                <span className="material-symbols-outlined text-sm">edit</span> {t('roles.edit', 'Chỉnh sửa')}
              </button>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div className="flex justify-between items-start py-2 border-b border-slate-50">
    <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
    <span className="text-sm font-medium text-slate-800 text-right">{value || '—'}</span>
  </div>
);

export default AdminRolesPermissions;
