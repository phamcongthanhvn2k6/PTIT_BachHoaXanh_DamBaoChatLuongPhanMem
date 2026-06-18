import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

interface BranchConflictModalProps {
  message: string;
  onResolve: (value: boolean) => void;
}

const BranchConflictModalComponent: React.FC<BranchConflictModalProps> = ({ message, onResolve }) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const handleAction = (value: boolean) => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      onResolve(value);
    }, 200); // Wait for fade-out animation
  };

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200 ${isAnimatingOut ? 'opacity-0' : 'opacity-100'}`}>
      <div 
        className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-800 p-6 flex flex-col items-center text-center transform transition-transform duration-200 ${isAnimatingOut ? 'scale-95' : 'scale-100 animate-scale-up'}`}
      >
        {/* Warning Icon with soft glowing ring */}
        <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center mb-4 ring-8 ring-rose-100/50 dark:ring-rose-950/10">
          <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-3xl font-bold">
            shopping_cart_checkout
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mb-2">
          Xác nhận chuyển chi nhánh
        </h3>

        {/* Message */}
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={() => handleAction(false)}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-bold text-sm transition-all active:scale-95 hover:bg-slate-200 dark:hover:bg-slate-700"
            style={{ color: '#64748b' }}
          >
            Hủy thao tác
          </button>
          <button
            type="button"
            onClick={() => handleAction(true)}
            className="flex-1 py-3 px-4 rounded-xl bg-red-650 hover:bg-red-700 active:bg-red-800 font-extrabold text-sm transition-all shadow-md shadow-red-600/20 hover:shadow-lg active:scale-95"
            style={{ color: '#ffffff', backgroundColor: '#e11d48' }}
          >
            Đồng ý xóa & tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
};

export const showBranchConflictModal = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const cleanup = (value: boolean) => {
      root.unmount();
      container.remove();
      resolve(value);
    };

    root.render(<BranchConflictModalComponent message={message} onResolve={cleanup} />);
  });
};
