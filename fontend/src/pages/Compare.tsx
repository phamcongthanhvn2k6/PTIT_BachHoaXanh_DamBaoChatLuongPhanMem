import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store';
import { clearCompareItems, removeCompareItem, selectCompareItems } from '../slices/compareSlice';
import { productService } from '../services/productService';
import { compareService } from '../services/compareService';
import type { CompareAISummary, CompareProduct } from '../types/product';
import CompareTable from '../components/compare/CompareTable';

const normalizeLocale = (value?: string): 'vi' | 'en' => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.startsWith('en') ? 'en' : 'vi';
};

const ComparePage: React.FC = () => {
  const { i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const compareItems = useAppSelector(selectCompareItems);
  const { currentBranch } = useAppSelector((state) => state.branch);

  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CompareAISummary | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const currentLocale = useMemo(
    () => normalizeLocale(i18n.resolvedLanguage || i18n.language || 'vi'),
    [i18n.resolvedLanguage, i18n.language],
  );

  const uiText = useMemo(() => (
    currentLocale === 'en'
      ? {
        emptyTitle: 'No products selected for comparison',
        emptyHint: 'Choose 2 to 4 products from the products page to start comparing.',
        goProducts: 'Go to Products',
        pageTitle: 'Product Comparison',
        comparedCount: `Comparing ${compareItems.length}/4 products`,
        addMore: 'Add more products',
        clearAll: 'Clear all',
        needTwo: 'At least 2 products are required to view a full comparison table.',
        loadCompareData: 'Loading comparison data...',
        aiTitle: 'AI Summary',
        viewDetails: 'View detailed comparison',
        summarizeBtn: 'Summarize with AI',
        summarizingBtn: 'Summarizing...',
        aiNotReady: 'AI is not ready',
        aiGuide: 'AI only summarizes based on real comparison data shown on this page, without adding missing specs.',
        retry: 'Retry',
        summaryPros: 'Highlights',
        summaryCons: 'Things to consider',
        summaryNotes: 'Notes',
        summaryHintReady: 'Click Summarize with AI to see highlights and drawbacks from real comparison data.',
        summaryHintNotReady: 'AI is not ready. Please configure GEMINI_COMPARE_KEY in backend.',
        compareLoadError: 'Unable to load comparison data.',
        aiDefaultError: 'Unable to generate AI summary right now. Please try again.',
      }
      : {
        emptyTitle: 'Chưa có sản phẩm để so sánh',
        emptyHint: 'Hãy chọn từ 2 đến 4 sản phẩm ở trang sản phẩm để bắt đầu so sánh.',
        goProducts: 'Đi đến trang sản phẩm',
        pageTitle: 'So sánh sản phẩm',
        comparedCount: `Đang so sánh ${compareItems.length}/4 sản phẩm`,
        addMore: 'Thêm tiếp sản phẩm',
        clearAll: 'Xóa tất cả',
        needTwo: 'Cần ít nhất 2 sản phẩm để xem bảng so sánh đầy đủ.',
        loadCompareData: 'Đang tải dữ liệu so sánh...',
        aiTitle: 'Tóm tắt bằng AI',
        viewDetails: 'Xem so sánh chi tiết',
        summarizeBtn: 'Tóm tắt bằng AI',
        summarizingBtn: 'Đang tóm tắt...',
        aiNotReady: 'AI chưa sẵn sàng',
        aiGuide: 'AI chỉ tổng hợp từ dữ liệu so sánh thực tế đang hiển thị, không tự thêm thông số ngoài dữ liệu có sẵn.',
        retry: 'Thử lại',
        summaryPros: 'Điểm nổi bật',
        summaryCons: 'Điểm cần cân nhắc',
        summaryNotes: 'Ghi chú',
        summaryHintReady: 'Bấm nút Tóm tắt bằng AI để xem tổng hợp ưu và nhược điểm dựa trên dữ liệu so sánh thực tế.',
        summaryHintNotReady: 'AI chưa sẵn sàng. Vui lòng cấu hình GEMINI_COMPARE_KEY ở backend để sử dụng tính năng này.',
        compareLoadError: 'Không thể tải dữ liệu so sánh.',
        aiDefaultError: 'Không thể tạo tóm tắt AI lúc này. Vui lòng thử lại.',
      }
  ), [currentLocale, compareItems.length]);

  const getSavedBranchId = () => {
    try {
      const raw = localStorage.getItem('lotte_current_branch');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return String(parsed?.id || parsed?._id || '');
    } catch {
      return '';
    }
  };

  const currentBranchId = currentBranch
    ? String((currentBranch as any).id || (currentBranch as any)._id || '')
    : getSavedBranchId();

  const ids = useMemo(() => compareItems.map((item) => item.product_id), [compareItems]);

  useEffect(() => {
    let active = true;

    const checkAIStatus = async () => {
      const status = await compareService.getAISummaryStatus();
      if (!active) return;
      setAiReady(status.aiReady);
    };

    checkAIStatus();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const fetchCompareData = async () => {
      if (!ids.length) {
        setProducts([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await productService.getCompareProducts(ids, currentBranchId || undefined);
        if (!active) return;

        const mapped = (Array.isArray(data) ? data : []).map((item: any) => ({
          ...item,
          id: String(item.id || item._id || item.product_id),
          product_id: String(item.product_id || item.id || item._id),
          name: item.name || 'Sản phẩm',
          image: item.image || item.images?.[0] || '',
          badges: Array.isArray(item.badges) ? item.badges : [],
          promotions: Array.isArray(item.promotions) ? item.promotions : [],
          coupons: Array.isArray(item.coupons) ? item.coupons : [],
          policies: Array.isArray(item.policies) ? item.policies : [],
        })) as CompareProduct[];

        const mapById = new Map(mapped.map((p) => [String(p.product_id), p]));
        const normalizedInOrder = ids.map((id) => {
          const found = mapById.get(String(id));
          if (found) return found;

          const fallback = compareItems.find((x) => x.product_id === String(id));
          return {
            id: String(id),
            product_id: String(id),
            name: fallback?.name || 'Sản phẩm',
            image: fallback?.image || '',
            price: fallback?.price,
            original_price: fallback?.original_price,
            discount_percent: fallback?.discount_percent,
            badges: [],
            promotions: [],
            coupons: [],
            policies: [],
            in_stock: false,
          } as CompareProduct;
        });

        setProducts(normalizedInOrder);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || uiText.compareLoadError);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCompareData();

    return () => {
      active = false;
    };
  }, [ids, currentBranchId, compareItems, uiText.compareLoadError]);

  const generateSummary = async () => {
    setAiError(null);
    setSummarizing(true);
    try {
      console.info(`[compare-summary][frontend] trigger | locale=${currentLocale} | products=${products.length}`);
      const result = await compareService.summarizeWithAI(products, currentLocale);
      setSummary(result);
    } catch (err: any) {
      setAiError(err?.response?.data?.message || err?.message || uiText.aiDefaultError);
    } finally {
      setSummarizing(false);
    }
  };

  if (compareItems.length === 0) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <span className="material-symbols-outlined mb-3 text-5xl text-slate-300">balance</span>
          <h1 className="mb-2 text-2xl font-black text-slate-900 dark:text-white">{uiText.emptyTitle}</h1>
          <p className="mb-6 text-slate-500">{uiText.emptyHint}</p>
          <Link to="/products" className="rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-primary/90">
            {uiText.goProducts}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">{uiText.pageTitle}</h1>
          <p className="text-sm text-slate-500">{uiText.comparedCount}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/products" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800">
            {uiText.addMore}
          </Link>
          <button
            onClick={() => dispatch(clearCompareItems())}
            className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            {uiText.clearAll}
          </button>
        </div>
      </div>

      {compareItems.length < 2 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          {uiText.needTwo}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {compareItems.map((item) => (
          <div key={item.product_id} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            <span className="max-w-44 truncate">{item.name}</span>
            <button onClick={() => dispatch(removeCompareItem(item.product_id))} className="text-slate-400 hover:text-red-500">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <section id="compare-detail-table">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">
            {uiText.loadCompareData}
          </div>
        ) : (
          <CompareTable products={products} />
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">{uiText.aiTitle}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const node = document.getElementById('compare-detail-table');
                node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {uiText.viewDetails}
            </button>
            <button
              onClick={generateSummary}
              disabled={products.length < 2 || summarizing}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white ${products.length < 2 || summarizing ? 'cursor-not-allowed bg-slate-300' : 'bg-primary hover:bg-primary/90'}`}
            >
              {summarizing && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {summarizing ? uiText.summarizingBtn : uiText.summarizeBtn}
            </button>
            {aiReady === false && (
              <span className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                {uiText.aiNotReady}
              </span>
            )}
          </div>
        </div>
        <p className="mb-4 text-xs text-slate-500">{uiText.aiGuide}</p>

        {aiError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            <div>{aiError}</div>
            <button
              onClick={generateSummary}
              disabled={products.length < 2 || summarizing}
              className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uiText.retry}
            </button>
          </div>
        )}

        {summary ? (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6 shadow-sm dark:border-indigo-900/50 dark:bg-slate-800/80 space-y-5">
            {summary.title && (
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500">smart_toy</span>
                {summary.title}
              </h3>
            )}
            {summary.pros && summary.pros.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">thumb_up</span>
                  {uiText.summaryPros}
                </h4>
                <ul className="space-y-1 ml-1">
                  {summary.pros.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.cons && summary.cons.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">thumb_down</span>
                  {uiText.summaryCons}
                </h4>
                <ul className="space-y-1 ml-1">
                  {summary.cons.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.recommendation && (
              <div className="rounded-xl bg-indigo-100/60 dark:bg-indigo-900/30 p-4 border border-indigo-200 dark:border-indigo-800">
                <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                  <span className="material-symbols-outlined text-base align-middle mr-1">lightbulb</span>
                  {summary.recommendation}
                </p>
              </div>
            )}
            {summary.notes && summary.notes.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{uiText.summaryNotes}</h4>
                <ul className="space-y-0.5">
                  {summary.notes.map((note, i) => (
                    <li key={i} className="text-xs text-slate-500 dark:text-slate-400">• {note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
            {aiReady === false
              ? uiText.summaryHintNotReady
              : uiText.summaryHintReady}
          </div>
        )}
      </section>
    </main>
  );
};

export default ComparePage;
