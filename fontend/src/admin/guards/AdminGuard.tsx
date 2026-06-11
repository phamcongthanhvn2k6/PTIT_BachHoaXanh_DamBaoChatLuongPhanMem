import React, { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { useAppDispatch } from '../../store';
import { adminVerifySession } from '../slices/adminAuthSlice';

const AdminGuard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { admin, token, status, _initialized } = useSelector(
    (state: RootState) => state.adminAuth
  );
  const verifyStarted = useRef(false);

  // On mount, if we have a stored token but haven't verified yet, kick off verification
  useEffect(() => {
    if (!_initialized && !verifyStarted.current) {
      verifyStarted.current = true;
      dispatch(adminVerifySession());
    }
  }, [_initialized, dispatch]);

  // Still verifying the admin session — show a loading spinner instead of redirecting
  if (!_initialized || status === 'loading') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-center p-8">
        <span className="material-symbols-outlined text-5xl text-primary mb-4 animate-spin">
          progress_activity
        </span>
        <h1 className="text-xl font-bold text-slate-800 mb-2">
          Đang xác thực phiên Admin...
        </h1>
        <p className="text-slate-500 text-sm">Vui lòng chờ trong giây lát</p>
      </div>
    );
  }

  // Verification complete — check if admin is valid
  // Allow any authenticated non-customer user. role_id === 3 or role_key === 'customer' means customer.
  const isCustomer =
    admin?.role_key === 'customer' ||
    (!admin?.role_key && Number(admin?.role_id || 3) === 3);
  if (!token || !admin || isCustomer) {
    return <Navigate to="/admin/login" replace />;
  }

  // Allow through to nested admin routes (like AdminDashboard)
  return <Outlet />;
};

export default AdminGuard;
