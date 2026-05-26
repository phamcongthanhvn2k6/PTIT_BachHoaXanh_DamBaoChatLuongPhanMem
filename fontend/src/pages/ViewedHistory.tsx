import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store';
import { addToCartAsync } from '../slices/cartSlice';
import { toast } from '../components/Toast/toastEvent';
import viewHistoryService, { getViewHistory } from '../services/viewHistoryService';
import type { ViewHistoryItem } from '../types/viewHistory';
import { getProductUrl } from '../utils/productUrl';

const ViewedHistory: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { currentBranch } = useAppSelector((state) => state.branch);

  const [items, setItems] = useState<ViewHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});

  const branchId = currentBranch ? String(currentBranch.id || (currentBranch as any)?._id || '') : '';

  const getRowId = (item: ViewHistoryItem): string => {
    return String((item as any)._id || item.id || item.product_id || '');
  };

  const canAddToCart = (item: ViewHistoryItem): boolean => {
    const outOfStockByFlag = item.in_stock === false;
    const outOfStockByQty = typeof item.stock === 'number' && item.stock <= 0;
    return !outOfStockByFlag && !outOfStockByQty;
  };

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getViewHistory();
      console.log('HISTORY DATA', data);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError(t('profile.loadHistoryError'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemove = async (id: string) => {
    setBusyIds((prev) => ({ ...prev, [id]: true }));
    try {
      await viewHistoryService.removeHistoryItem(id, { isAuthenticated, user });
      setItems((prev) => prev.filter((item) => getRowId(item) !== String(id) && String(item.id) !== String(id)));
      toast.success(t('profile.removeHistorySuccess'));
    } catch {
      toast.error(t('profile.removeHistoryError'));
    } finally {
      setBusyIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(t('profile.clearHistoryConfirm'))) return;
    try {
      await viewHistoryService.clearHistory({ isAuthenticated, user });
      setItems([]);
      toast.success(t('profile.clearHistorySuccess'));
    } catch {
      toast.error(t('profile.clearHistoryError'));
    }
  };

  const handleAddToCart = async (item: ViewHistoryItem) => {
    const rowId = getRowId(item);

    if (!branchId) {
      toast.error(t('common.selectBranchFirst'));
      return;
    }

    if (!canAddToCart(item)) {
      toast.warning(t('profile.temporaryOutOfStock'));
      return;
    }

    const branchProductId = String(item.branch_product_id || '');
    if (!branchProductId) {
      toast.warning(t('profile.noBranchData'));
      return;
    }

    const key = rowId || String(item.id || branchProductId);
    console.log('[ViewedHistory] add-to-cart request', {
      key,
      branchId,
      branch_product_id: branchProductId,
      product_id: item.product_id,
      in_stock: item.in_stock,
      stock: item.stock,
      price: item.price,
    });

    setBusyIds((prev) => ({ ...prev, [key]: true }));
    try {
      await dispatch(addToCartAsync({
        branchId,
        branch_product_id: branchProductId,
        quantity: 1,
        price: Number(item.price || 0),
        unit_price: Number(item.price || 0),
        product_name: item.product_name || 'Sản phẩm',
        product_image: item.product_image || '',
      })).unwrap();
      console.log('[ViewedHistory] add-to-cart success', { key, branch_product_id: branchProductId });
      toast.success(t('cart.addedToCart', { name: item.product_name || t('common.product') }));
    } catch (error: any) {
      console.error('[ViewedHistory] add-to-cart failed', {
        key,
        branchId,
        branch_product_id: branchProductId,
        error,
      });
      const message = typeof error === 'string' ? error : (error?.message || t('common.addToCartError'));
      toast.error(message);
    } finally {
      setBusyIds((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (loading) {
    return <div className="py-12 text-center font-bold">{t('profile.loadingHistory')}</div>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-5 text-sm font-medium">
          {error}
        </div>
        <button
          onClick={loadHistory}
          className="px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90"
        >
          {t('profile.reload')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold">{t('profile.viewedHistory')} ({items.length})</h2>
        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold"
          >
            {t('profile.clearAll')}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-10 text-center text-slate-500">
          {t('profile.noViewedHistory')}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const rowId = getRowId(item);
            const busy = Boolean(busyIds[rowId]);
            return (
              <div key={String((item as any)._id || item.product_id || rowId)} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col sm:flex-row gap-4 sm:items-center">
                <Link to={getProductUrl({ id: item.product_id, name: item.product_name })} className="w-20 h-20 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                  <img
                    src={item.product_image || 'https://via.placeholder.com/300x300?text=Product'}
                    alt={item.product_name || 'product'}
                    className="w-full h-full object-cover"
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <Link to={getProductUrl({ id: item.product_id, name: item.product_name })} className="font-bold line-clamp-1 hover:text-primary">
                    {item.product_name || t('common.product')}
                  </Link>
                  <p className="text-sm text-slate-500 mt-1">
                    {t('profile.viewedAt', { date: item.viewed_at ? new Date(item.viewed_at).toLocaleString('vi-VN') : 'N/A' })}
                  </p>
                  <p className="text-sm text-primary font-bold mt-1">{Number(item.price || 0).toLocaleString('vi-VN')}đ</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={busy || !canAddToCart(item)}
                    className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
                  >
                    {t('common.addToCart')}
                  </button>
                  <button
                    onClick={() => handleRemove(String(item.id || rowId))}
                    disabled={busy}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t('profile.delete')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ViewedHistory;
