import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, status, _initialized } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const isLoading = status === 'loading';

  if (!_initialized || (isLoading && !isAuthenticated)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-red-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search;
    // Only add redirect for meaningful paths, prevent loops
    const shouldAddRedirect =
      currentPath !== '/' &&
      !currentPath.startsWith('/login') &&
      !currentPath.startsWith('/register') &&
      !currentPath.includes('redirect=');

    const loginTarget = shouldAddRedirect
      ? `/login?redirect=${encodeURIComponent(location.pathname)}`
      : '/login';

    return <Navigate to={loginTarget} replace />;
  }

  return <>{children}</>;
};
