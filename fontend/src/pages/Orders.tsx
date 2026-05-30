import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store';
import { loadOrders } from '../slices/orderSlice';
import { resolveImageUrl } from '../utils/imageUrl';

const ORDERS_PER_PAGE = 6;

const Orders: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { data: orders, status } = useAppSelector(state => state.order);
    const { user } = useAppSelector(state => state.auth);
    const { branches } = useAppSelector(state => state.branch);
    const [filter, setFilter] = React.useState('ALL');
    const [page, setPage] = React.useState(1);

    useEffect(() => {
        if (user && status === 'idle') {
            dispatch(loadOrders(undefined));
        }
    }, [user, status, dispatch]);

    // Reset page when filter changes
    useEffect(() => { setPage(1); }, [filter]);

    const getBranchName = (branchId: string, branchName?: string) => {
        if (branchName) return branchName;
        const branch = branches.find(b => String(b.id) === String(branchId) || String((b as any)?._id) === String(branchId) || b.code === branchId);
        return branch ? branch.name : `Chi nhánh (${branchId})`;
    };

    const filteredOrders = orders.filter((o: any) => {
        if (filter === 'ALL') return true;
        if (filter === 'SHIPPING' && ['PROCESSING', 'SHIPPING'].includes(o.status)) return true;
        if (filter === 'COMPLETED' && ['COMPLETED', 'DELIVERED'].includes(o.status)) return true;
        if (filter === 'CANCELLED' && ['CANCELLED', 'RETURNED'].includes(o.status)) return true;
        return false;
    });

    const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE) || 1;
    const safePage = Math.min(page, totalPages);

    const displayedOrders = useMemo(() => {
        const start = (safePage - 1) * ORDERS_PER_PAGE;
        return filteredOrders.slice(start, start + ORDERS_PER_PAGE);
    }, [filteredOrders, safePage]);

    // Auto-reset page if out of bounds
    useEffect(() => {
        if (safePage !== page) setPage(safePage);
    }, [safePage, page]);

  return (
    <>
        <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">{t('orders.myOrders')}</h2>
                  <div className="flex border-b border-primary/10 overflow-x-auto no-scrollbar">
                    {['ALL', 'SHIPPING', 'COMPLETED', 'CANCELLED'].map((tab) => (
                      <button key={tab} onClick={() => setFilter(tab)} className={`px-6 py-3 border-b-2 whitespace-nowrap ${filter === tab ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 hover:text-primary transition-colors'}`}>
                        {tab === 'ALL' ? t('orders.all') : tab === 'SHIPPING' ? t('orders.shipping') : tab === 'COMPLETED' ? t('orders.completed') : t('orders.cancelled')}
                      </button>
                    ))}
                  </div>
                </div>

                {status === 'loading' && (
                  <div className="text-center py-20 flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-4">progress_activity</span>
                    <p className="text-slate-500 font-bold">{t('orders.loading')}</p>
                  </div>
                )}

                {status === 'succeeded' && filteredOrders.length === 0 && (
                    <div className="text-center py-20 flex flex-col items-center justify-center text-slate-500">
                        <span className="material-symbols-outlined text-5xl mb-4 opacity-50">shopping_bag</span>
                        <p className="font-bold">{t('orders.noOrders')}</p>
                    </div>
                )}

                {/* Summary info */}
                {status === 'succeeded' && filteredOrders.length > 0 && (
                    <div className="flex items-center justify-between text-sm text-slate-500">
                        <span>
                            {t('orders.showingPage', { page: safePage, total: totalPages, count: filteredOrders.length })}
                        </span>
                    </div>
                )}

                <div className="flex flex-col gap-4">
                  {displayedOrders.map((order: any) => (
                      <div key={order.id} className={`bg-white dark:bg-background-dark/50 rounded-xl p-5 shadow-sm border border-primary/5 flex flex-col md:flex-row gap-6 items-start ${order.status === 'CANCELLED' || order.status === 'RETURNED' ? 'opacity-75' : ''}`}>
                      <div className={`w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-lg bg-primary/5 flex items-center justify-center overflow-hidden ${(order.status === 'CANCELLED' || order.status === 'RETURNED') ? 'grayscale' : ''}`}>
                        <img alt="Order item" className="w-full h-full object-cover" src={resolveImageUrl(order.items?.[0]?.product_image)} />
                      </div>
                      <div className="flex-1 w-full">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                              {String(t(`orders.userFriendlyStatus.${order.status}`, order.status))}
                            </h3>
                            <p className="text-xs font-mono text-slate-400 mt-1">
                              {t('orders.orderCode', { code: order.id })}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-primary">{(order.total_amount || 0).toLocaleString('vi-VN')}đ</p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-slate-500 mb-6 mt-3">
                          <div className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">calendar_today</span>{new Date(order.created_at).toLocaleDateString('vi-VN')}</div>
                          <div className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">inventory_2</span>{t('orders.itemsCount', { count: (order.items || []).reduce((s: number, i: any) => s + i.quantity, 0) })}</div>
                          <div className="flex items-center gap-1 text-primary"><span className="material-symbols-outlined text-sm">storefront</span>{getBranchName(order.branch_id, order.branch_name)}</div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-primary/5 pt-4">
                          {['COMPLETED', 'DELIVERED'].includes(order.status) && (
                            <Link to={`/account/reviews`} className="px-5 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-semibold text-sm hover:bg-amber-100 transition-colors flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm">star</span> {t('orders.reviewProducts')}
                            </Link>
                          )}
                          <Link to={`/account/orders/${order.id}`} className="px-6 py-2.5 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center gap-2">
                            {t('orders.viewDetail')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-6">
                        <button
                            disabled={safePage === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-semibold text-sm hover:border-primary hover:text-primary transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                            {t('orders.prevPage')}
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                                        p === safePage
                                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <button
                            disabled={safePage >= totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-semibold text-sm hover:border-primary hover:text-primary transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {t('orders.nextPage')}
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                    </div>
                )}
              </div>
    </>
  );
};

export default Orders;