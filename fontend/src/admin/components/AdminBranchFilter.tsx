// src/admin/components/AdminBranchFilter.tsx
// Reusable branch filter for admin pages.
// - Super Admin: can pick any branch
// - Manager: locked to their own branch_id (hidden select)
import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../../store';
import type { Branch } from '../../types';
import { isManagerRole } from '../utils/permission';
import { useTranslation } from 'react-i18next';

interface Props {
  value: string;                      // current filter value ("ALL" or branchId)
  onChange: (branchId: string) => void;
  className?: string;
}

const AdminBranchFilter: React.FC<Props> = ({ value, onChange, className }) => {
  const adminAuth = useAppSelector((s) => s.adminAuth);
  const admin = adminAuth.admin;
  const [branches, setBranches] = useState<Branch[]>([]);
  const { t } = useTranslation();

  const isManager = isManagerRole(admin);
  const adminBranchId = admin?.branch_id || admin?.branch || '';

  // Load branches once
  useEffect(() => {
    import('../../services/dataService').then(({ dataService }) => {
      dataService.getBranches().then((data: any) => setBranches(data || []));
    });
  }, []);

  // If manager, force their branch_id and don't show dropdown
  useEffect(() => {
    if (isManager && adminBranchId && value !== adminBranchId) {
      onChange(adminBranchId);
    }
  }, [isManager, adminBranchId, value, onChange]);

  // Manager: show read-only label
  if (isManager) {
    const myBranch = branches.find(
      (b) => String(b.id || (b as any)?._id) === String(adminBranchId)
    );
    return (
      <div className={`flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm font-bold text-blue-700 ${className || ''}`}>
        <span className="material-symbols-outlined text-sm">storefront</span>
        {t('adminDash.branchLabel', { defaultValue: 'Branch' })}: {myBranch?.name || adminBranchId}
        <span className="text-[10px] font-normal text-blue-500 ml-1">(Manager)</span>
      </div>
    );
  }

  // Super Admin: dropdown
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-4 py-3 bg-surface-container-low border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none cursor-pointer font-medium ${className || ''}`}
    >
      <option value="ALL">🏪 {t('adminDash.allBranches', { defaultValue: 'All branches' })}</option>
      {branches
        .filter((b) => b.is_active !== false)
        .map((b) => {
          const bId = String(b.id || (b as any)?._id || '');
          return (
            <option key={bId} value={bId}>
              {b.name}
            </option>
          );
        })}
    </select>
  );
};

export default AdminBranchFilter;
