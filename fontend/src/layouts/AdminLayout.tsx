import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import AdminHeader from '../components/Admin/AdminHeader';
import { useAppSelector } from '../store';

const AdminLayout: React.FC = () => {
  const { admin, status } = useAppSelector(state => state.adminAuth);
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return (
    <div className="bg-surface dark:bg-slate-900 text-on-surface dark:text-slate-200 antialiased min-h-screen overflow-hidden flex transition-colors">
      <main className="w-full flex-1 h-screen flex flex-col relative">
        <AdminHeader />
        <div className="flex-1 overflow-y-auto pt-20">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
