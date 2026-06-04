import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store';
import { clearCompareItems, removeCompareItem, selectCompareItems } from '../../slices/compareSlice';

const CompareBar: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCompareItems);

  if (location.pathname.startsWith('/admin')) return null;
  if (items.length === 0) return null;

  const canCompare = items.length >= 2;
  const hint = canCompare ? t('compare.ready') : t('compare.selectAtLeast');

  return (
    <>
      <div className="h-31 md:h-26" aria-hidden="true" />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <div className="pointer-events-auto mx-auto w-[min(1200px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-lg dark:border-slate-700 dark:bg-slate-900/95">
          <div className="p-3 md:p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  {t('compare.compare')} {items.length}/4
                </span>
                <span className={`hidden text-xs font-semibold md:inline ${canCompare ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {hint}
                </span>
              </div>
              <button
                onClick={() => dispatch(clearCompareItems())}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('compare.clearAll')}
              </button>
            </div>

            <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
              {items.map((item) => (
                <div
                  key={item.product_id}
                  className="group relative flex min-w-42.5 max-w-52.5 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <img
                    src={item.image || 'https://via.placeholder.com/64x64?text=SP'}
                    alt={item.name}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{item.name}</p>
                    {item.price != null && (
                      <p className="text-[11px] font-bold text-primary">{Number(item.price).toLocaleString('vi-VN')}đ</p>
                    )}
                  </div>
                  <button
                    onClick={() => dispatch(removeCompareItem(item.product_id))}
                    className="rounded-md p-1 text-slate-400 transition hover:bg-slate-200 hover:text-red-500 dark:hover:bg-slate-700"
                    aria-label="Bỏ khỏi so sánh"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 md:flex md:items-center md:justify-end">
              <Link
                to="/products"
                className="rounded-lg border border-primary/30 px-3 py-2 text-center text-sm font-semibold text-primary transition hover:bg-primary/5"
              >
                {t('compare.addProduct')}
              </Link>
              <button
                onClick={() => navigate('/compare')}
                disabled={!canCompare}
                className={`rounded-lg px-4 py-2 text-sm font-bold text-white transition ${
                  canCompare ? 'bg-primary hover:bg-primary/90' : 'cursor-not-allowed bg-slate-300'
                }`}
                title={canCompare ? t('compare.compareNow') : t('compare.selectAtLeast')}
              >
                {canCompare ? t('compare.compareNow') : t('compare.selectAtLeast')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CompareBar;
