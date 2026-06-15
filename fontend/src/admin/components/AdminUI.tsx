import React, { useEffect, useRef } from 'react';

/* ============================================================
   DESIGN TOKENS
   ============================================================ */
const cls = {
  card: 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors',
  cardHover: 'hover:shadow-md transition-shadow',
  input: 'w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100',
  select: 'px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all appearance-none cursor-pointer text-slate-900 dark:text-slate-100',
  btnPrimary: 'inline-flex items-center justify-center gap-2 h-10 px-5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:bg-primary-container transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
  btnSecondary: 'inline-flex items-center justify-center gap-2 h-10 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98] border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
  btnDanger: 'inline-flex items-center justify-center gap-2 h-10 px-5 bg-error text-white hover:bg-error/90 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98] shadow-lg shadow-error/15 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
  btnDangerSoft: 'inline-flex items-center justify-center gap-2 h-10 px-5 bg-error-container/20 text-error hover:bg-error-container/40 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98] border border-error-container/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
  btnOutline: 'inline-flex items-center justify-center gap-2 h-10 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
  btnGhost: 'inline-flex items-center justify-center gap-2 h-9 px-3 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
  btnSuccess: 'inline-flex items-center justify-center gap-2 h-10 px-5 bg-green-600 text-white hover:bg-green-700 rounded-xl text-sm font-bold shadow-lg shadow-green-600/15 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
  btnIcon: 'inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed',
  thCell: 'p-4 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider',
  tdCell: 'p-4 text-sm text-slate-700 dark:text-slate-300',
  label: 'block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5',
};

export { cls };

/* ============================================================
   PAGE HEADER
   ============================================================ */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  actions?: React.ReactNode;
  breadcrumbs?: string[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon, actions, breadcrumbs }) => (
  <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
    <div className="flex flex-col gap-2">
      {breadcrumbs && (
        <nav className="flex text-[10px] uppercase tracking-widest text-secondary font-bold gap-2">
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              <span className={i === breadcrumbs.length - 1 ? 'text-primary' : 'text-slate-500'}>{b}</span>
              {i < breadcrumbs.length - 1 && <span className="text-slate-300">/</span>}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white text-xl">{icon}</span>
          </div>
        )}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
  </div>
);

/* ============================================================
   SEARCH BAR (with debounce)
   ============================================================ */
interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onSearch?: () => void;
  debounceMs?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder = 'Tìm kiếm...', onSearch, debounceMs = 400 }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleChange = (v: string) => {
    onChange(v);
    if (debounceMs > 0 && onSearch) {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => onSearch(), debounceMs);
    }
  };
  return (
    <div className="relative flex items-center">
      <div className="absolute left-0 top-0 h-full w-10 flex items-center justify-center pointer-events-none">
        <span className="material-symbols-outlined text-slate-400 text-[20px] leading-none block">search</span>
      </div>
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
        placeholder={placeholder}
        className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all w-full md:w-80 placeholder:text-slate-400"
      />
    </div>
  );
};

/* ============================================================
   FILTER BAR
   ============================================================ */
interface FilterOption {
  label: string;
  value: string;
}
interface FilterBarProps {
  filters?: { label?: string; value?: string; options?: FilterOption[]; onChange?: (v: string) => void }[];
  // For backward compatibility / accidental single-filter usage
  value?: string;
  onChange?: (v: string) => void;
  options?: FilterOption[];
  placeholder?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters = [], value, onChange, options = [], placeholder }) => {
  // 1. Process explicit filters array safely avoiding undefined
  const safeFilters = Array.isArray(filters) ? filters.filter(f => f && typeof f === 'object') : [];
  
  // 2. Process backward-compatible single filter usage
  if (typeof onChange === 'function') {
    safeFilters.push({
      label: placeholder || 'Lọc',
      value: value || '',
      options: Array.isArray(options) ? options : [],
      onChange: onChange,
    });
  }

  if (safeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {safeFilters.map((f, i) => {
        // Double check options is an array before map
        const fOptions = Array.isArray(f.options) ? f.options : [];
        return (
          <select key={i} value={f.value || ''} onChange={(e) => f.onChange && f.onChange(e.target.value)} className={cls.select}>
            <option value="">{f.label || 'Tất cả'}</option>
            {fOptions.map((opt, idx) => {
              // Ensure option is an object
              if (!opt || typeof opt !== 'object') return null;
              return (
                <option key={opt.value ?? idx} value={opt.value ?? ''}>
                  {opt.label ?? String(opt.value ?? '')}
                </option>
              );
            })}
          </select>
        );
      })}
    </div>
  );
};

/* ============================================================
   STATUS BADGE
   ============================================================ */
const badgeStyles: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-500 border-slate-200',
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  ordered: 'bg-blue-50 text-blue-700 border-blue-200',
  received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partially_received: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-orange-50 text-orange-700 border-orange-200',
  low_stock: 'bg-orange-50 text-orange-700 border-orange-200',
  expiring_soon: 'bg-amber-50 text-amber-700 border-amber-200',
  in_transit: 'bg-violet-50 text-violet-700 border-violet-200',
  restock: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sale: 'bg-blue-50 text-blue-700 border-blue-200',
  adjustment: 'bg-violet-50 text-violet-700 border-violet-200',
  return: 'bg-amber-50 text-amber-700 border-amber-200',
  damage: 'bg-red-50 text-red-700 border-red-200',
  yes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  no: 'bg-slate-100 text-slate-500 border-slate-200',
};

interface StatusBadgeProps { status: string; label?: string; }

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const key = status?.toLowerCase().replace(/\s+/g, '_') || 'draft';
  const style = badgeStyles[key] || 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${style}`}>
      {label || status}
    </span>
  );
};

/* ============================================================
   EMPTY STATE
   ============================================================ */
interface EmptyStateProps { icon?: string; title?: string; description?: string; action?: React.ReactNode; }

export const EmptyState: React.FC<EmptyStateProps> = ({ icon = 'inbox', title = 'Không có dữ liệu', description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-5">
      <span className="material-symbols-outlined text-4xl text-slate-300">{icon}</span>
    </div>
    <h3 className="text-lg font-bold text-slate-600 mb-1">{title}</h3>
    {description && <p className="text-sm text-slate-400 max-w-md">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* ============================================================
   LOADING SKELETON
   ============================================================ */
export const LoadingSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => (
  <div className="animate-pulse">
    <div className="h-12 bg-slate-100 rounded-t-xl mb-px" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 p-4 border-b border-slate-100">
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} className="h-4 bg-slate-100 rounded-lg flex-1" />
        ))}
      </div>
    ))}
  </div>
);

/* ============================================================
   LOADING SPINNER (overlay)
   ============================================================ */
export const LoadingOverlay: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
      <div className="w-8 h-8 border-3 border-slate-200 border-t-red-600 rounded-full animate-spin" />
    </div>
  );
};

/* ============================================================
   PAGINATION CONTROL
   ============================================================ */
interface PaginationProps { page: number; pageSize: number; total: number; onChange: (page: number) => void; }

export const PaginationControl: React.FC<PaginationProps> = ({ page, pageSize, total, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <span className="text-xs text-slate-400">
        Hiển thị {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} / {total}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="px-2 text-sm text-slate-400">…</span>
          ) : (
            <button key={p} onClick={() => onChange(p as number)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === p ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  );
};

/* ============================================================
   MODAL
   ============================================================ */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const modalSizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, subtitle, icon, size = 'md', children, footer }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    // Auto-focus first input
    const timer = setTimeout(() => {
      const firstInput = contentRef.current?.querySelector('input, select, textarea') as HTMLElement;
      firstInput?.focus();
    }, 100);
    return () => {
      document.body.style.overflow = '';
      clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" />
      <div onClick={(e) => e.stopPropagation()} className={`bg-white w-full ${modalSizes[size]} rounded-2xl shadow-2xl flex flex-col max-h-[90vh] relative animate-fade-in`} ref={contentRef}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
                <span className="material-symbols-outlined text-white text-[18px]">{icon}</span>
              </div>
            )}
            <div>
              <h3 className="font-bold text-slate-800 text-lg leading-tight">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0 bg-slate-50/30 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   DETAIL DRAWER (slide from right)
   ============================================================ */
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  width?: string;
  footer?: React.ReactNode;
}

export const DetailDrawer: React.FC<DrawerProps> = ({ open, onClose, title, subtitle, icon, children, width = 'max-w-lg', footer }) => {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white w-full ${width} h-full shadow-2xl flex flex-col relative`}
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
                <span className="material-symbols-outlined text-white text-[18px]">{icon}</span>
              </div>
            )}
            <div>
              <h3 className="font-bold text-slate-800 text-lg leading-tight">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0 bg-slate-50/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   CONFIRM DIALOG
   ============================================================ */
interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, onClose, onConfirm, title, message, confirmLabel = 'Xác nhận', danger = false, loading = false }) => (
  <Modal open={open} onClose={onClose} title={title} icon="warning" size="sm" footer={
    <>
      <button type="button" onClick={onClose} className={cls.btnSecondary}>Hủy</button>
      <button type="button" onClick={onConfirm} disabled={loading} className={danger ? cls.btnDanger : cls.btnPrimary}>
        {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
        {confirmLabel}
      </button>
    </>
  }>
    <p className="text-sm text-slate-600">{message}</p>
  </Modal>
);

/* ============================================================
   FORM SECTION
   ============================================================ */
export const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
      <span className="w-5 h-px bg-slate-200" />
      {title}
      <span className="flex-1 h-px bg-slate-200" />
    </h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </div>
);

/* ============================================================
   INFO ROW
   ============================================================ */
export const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    <span className="text-sm font-medium text-slate-700">{value || '—'}</span>
  </div>
);

/* ============================================================
   FORM FIELD
   ============================================================ */
interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  colSpan?: number;
  error?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ label, children, required, colSpan, error }) => (
  <div className={colSpan === 2 ? 'md:col-span-2' : ''}>
    <label className={cls.label}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

/* ============================================================
   STAT CARD
   ============================================================ */
interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  icon?: string;
  color?: 'red' | 'emerald' | 'blue' | 'violet' | 'amber' | 'slate' | 'primary' | 'warning' | 'danger' | 'success';
  onClick?: () => void;
  // Legacy prop
  variant?: {
    bg?: string;
    text?: string;
    icon?: string;
    iconColor?: string;
    borderColor?: string;
  };
}

const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
  red: { bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-600' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-600' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-600' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-600', text: 'text-violet-600' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-600' },
  slate: { bg: 'bg-slate-100', icon: 'text-slate-600', text: 'text-slate-700' },
  primary: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-600' },
  warning: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-600' },
  danger: { bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-600' },
  success: { bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-600' },
};

export const StatCard: React.FC<StatCardProps> = ({ label, title, value, icon, color = 'slate', onClick, variant }) => {
  const defaultVariant = { bg: 'bg-slate-100', icon: 'text-slate-600', text: 'text-slate-700' };
  const safeColor = (color && typeof color === 'string' && colorMap[color]) ? color : 'slate';
  let c = colorMap[safeColor] || defaultVariant;

  // Safe fallback to variant.bg if variant exists
  if (variant && typeof variant === 'object') {
    c = {
      bg: variant.bg || c.bg || defaultVariant.bg,
      text: variant.text || c.text || defaultVariant.text,
      icon: variant.icon || variant.iconColor || c.icon || defaultVariant.icon,
    };
  }

  const displayLabel = title || label || 'Thống Kê';
  const displayValue = value ?? 0;
  
  return (
    <div onClick={onClick} className={`${cls.card} p-5 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow`}>
      <div className={`w-12 h-12 rounded-2xl ${c.bg || 'bg-slate-100'} flex items-center justify-center flex-shrink-0`}>
        <span className={`material-symbols-outlined ${c.icon || 'text-slate-600'}`}>{icon || 'info'}</span>
      </div>
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{displayLabel}</p>
        <p className={`text-2xl font-black ${c.text || 'text-slate-700'}`}>{typeof displayValue === 'number' ? displayValue.toLocaleString('vi-VN') : String(displayValue)}</p>
      </div>
    </div>
  );
};

/* ============================================================
   ERROR BOUNDARY
   ============================================================ */
export class AdminErrorBoundary extends React.Component<{ children: React.ReactNode, fallback?: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Admin UI Error Boundary Caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 w-full min-h-[400px] flex items-center justify-center">
          <EmptyState 
            icon="error" 
            title="Đã xảy ra lỗi giao diện" 
            description={this.state.error?.message || 'Có lỗi xảy ra khi hiển thị nội dung này.'} 
            action={
              <button type="button" onClick={() => window.location.reload()} className={cls.btnSecondary}>
                <span className="material-symbols-outlined text-sm">refresh</span> Tải lại trang
              </button>
            } 
          />
        </div>
      );
    }
    return this.props.children;
  }
}

/* ============================================================
   INLINE CSS KEYFRAMES (for drawer slide)
   ============================================================ */
const styleTag = typeof document !== 'undefined' && !document.getElementById('admin-ui-keyframes');
if (styleTag) {
  const s = document.createElement('style');
  s.id = 'admin-ui-keyframes';
  s.textContent = `
    @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
  `;
  document.head.appendChild(s);
}
