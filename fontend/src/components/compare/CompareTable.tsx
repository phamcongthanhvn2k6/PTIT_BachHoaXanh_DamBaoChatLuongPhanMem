import React from 'react';
import { formatRating } from '../../utils/formatRating';
import type { CompareProduct } from '../../types/product';

interface CompareTableProps {
  products: CompareProduct[];
}

const normalizeSpecs = (specs: CompareProduct['specifications']): string => {
  if (!specs) return 'Chưa có';
  if (Array.isArray(specs)) {
    if (specs.length === 0) return 'Chưa có';
    return specs.map((s) => `${s.label}: ${s.value}`).join(' | ');
  }
  const entries = Object.entries(specs);
  if (entries.length === 0) return 'Chưa có';
  return entries.map(([k, v]) => `${k}: ${v}`).join(' | ');
};

const asText = (value: any): string => {
  if (value === null || value === undefined || value === '') return 'Chưa có';
  return String(value);
};

const CompareTable: React.FC<CompareTableProps> = ({ products }) => {
  const rows = [
    {
      key: 'image',
      label: 'Hình ảnh',
      render: (p: CompareProduct) => (
        <img
          src={p.image || p.images?.[0] || 'https://via.placeholder.com/160x160?text=SP'}
          alt={p.name}
          className="mx-auto h-24 w-24 rounded-xl object-cover"
        />
      ),
      value: (_p: CompareProduct) => 'image',
    },
    {
      key: 'name',
      label: 'Tên sản phẩm',
      render: (p: CompareProduct) => <span className="font-bold text-slate-900 dark:text-white">{asText(p.name)}</span>,
      value: (p: CompareProduct) => asText(p.name),
    },
    {
      key: 'price',
      label: 'Giá hiện tại',
      render: (p: CompareProduct) => (
        <span className="text-base font-extrabold text-primary">{p.price != null ? `${Number(p.price).toLocaleString('vi-VN')}đ` : 'Chưa có'}</span>
      ),
      value: (p: CompareProduct) => (p.price != null ? Number(p.price).toString() : 'Chưa có'),
    },
    {
      key: 'original_price',
      label: 'Giá gốc',
      render: (p: CompareProduct) => <span>{p.original_price != null ? `${Number(p.original_price).toLocaleString('vi-VN')}đ` : 'Chưa có'}</span>,
      value: (p: CompareProduct) => (p.original_price != null ? Number(p.original_price).toString() : 'Chưa có'),
    },
    {
      key: 'discount',
      label: '% giảm',
      render: (p: CompareProduct) => <span>{p.discount_percent != null ? `${Number(p.discount_percent)}%` : 'Chưa có'}</span>,
      value: (p: CompareProduct) => (p.discount_percent != null ? Number(p.discount_percent).toString() : 'Chưa có'),
    },
    { key: 'brand', label: 'Thương hiệu', render: (p: CompareProduct) => <span>{asText(p.brand)}</span>, value: (p: CompareProduct) => asText(p.brand) },
    { key: 'category', label: 'Danh mục', render: (p: CompareProduct) => <span>{asText(p.category_name)}</span>, value: (p: CompareProduct) => asText(p.category_name) },
    { key: 'origin', label: 'Xuất xứ', render: (p: CompareProduct) => <span>{asText(p.origin)}</span>, value: (p: CompareProduct) => asText(p.origin) },
    {
      key: 'expiry',
      label: 'Hạn sử dụng',
      render: (p: CompareProduct) => <span>{p.expiry_date ? new Date(p.expiry_date).toLocaleDateString('vi-VN') : 'Chưa có'}</span>,
      value: (p: CompareProduct) => (p.expiry_date ? new Date(p.expiry_date).toISOString().slice(0, 10) : 'Chưa có'),
    },
    {
      key: 'weight_unit',
      label: 'Dung tích / Trọng lượng',
      render: (p: CompareProduct) => <span>{[p.weight, p.unit].filter(Boolean).join(' / ') || 'Chưa có'}</span>,
      value: (p: CompareProduct) => [p.weight, p.unit].filter(Boolean).join(' / ') || 'Chưa có',
    },
    {
      key: 'rating',
      label: 'Đánh giá',
      render: (p: CompareProduct) => <span>{(p.average_rating ?? p.rating) != null ? `${formatRating(p.average_rating ?? p.rating)} / 5` : 'Chưa có'}</span>,
      value: (p: CompareProduct) => ((p.average_rating ?? p.rating) != null ? formatRating(p.average_rating ?? p.rating) : 'Chưa có'),
    },
    {
      key: 'review_count',
      label: 'Số lượt đánh giá',
      render: (p: CompareProduct) => <span>{p.review_count != null ? p.review_count : 'Chưa có'}</span>,
      value: (p: CompareProduct) => (p.review_count != null ? String(p.review_count) : 'Chưa có'),
    },
    {
      key: 'badges',
      label: 'Badge / Nhãn',
      render: (p: CompareProduct) => (
        <div className="flex flex-wrap gap-1">
          {p.badges && p.badges.length > 0 ? (
            p.badges.map((badge, idx) => (
              <span key={`${badge.text}-${idx}`} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                {badge.text}
              </span>
            ))
          ) : (
            <span>Chưa có</span>
          )}
        </div>
      ),
      value: (p: CompareProduct) => (p.badges && p.badges.length > 0 ? p.badges.map((b) => b.text).join(',') : 'Chưa có'),
    },
    {
      key: 'stock',
      label: 'Tình trạng còn hàng',
      render: (p: CompareProduct) => {
        const inStock = p.in_stock ?? ((p.stock ?? 0) > 0);
        return (
          <span className={`rounded-full px-2 py-1 text-xs font-bold ${inStock ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {inStock ? `Còn hàng (${p.stock ?? 0})` : 'Hết hàng'}
          </span>
        );
      },
      value: (p: CompareProduct) => `${p.in_stock ?? ((p.stock ?? 0) > 0)}-${p.stock ?? 0}`,
    },
    {
      key: 'short_desc',
      label: 'Mô tả ngắn',
      render: (p: CompareProduct) => <span className="line-clamp-3 text-sm">{asText(p.short_description || p.description)}</span>,
      value: (p: CompareProduct) => asText(p.short_description || p.description),
    },
    {
      key: 'specs',
      label: 'Thành phần / Specifications',
      render: (p: CompareProduct) => <span className="text-sm">{normalizeSpecs(p.specifications)}</span>,
      value: (p: CompareProduct) => normalizeSpecs(p.specifications),
    },
    {
      key: 'promotions',
      label: 'Khuyến mãi áp dụng',
      render: (p: CompareProduct) => (
        <div className="space-y-1 text-xs">
          {p.promotions && p.promotions.length > 0 ? (
            p.promotions.map((promo) => (
              <div key={promo.id} className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">
                {promo.badge_text || promo.title}
              </div>
            ))
          ) : (
            <span>Chưa có</span>
          )}
        </div>
      ),
      value: (p: CompareProduct) => (p.promotions && p.promotions.length > 0 ? p.promotions.map((x) => x.id).join(',') : 'Chưa có'),
    },
    {
      key: 'shipping_policy',
      label: 'Phí ship / Chính sách',
      render: (p: CompareProduct) => (
        <div className="space-y-1 text-xs">
          {p.shipping_fee_note ? <p>{p.shipping_fee_note}</p> : <p>Chưa có</p>}
          {p.policies && p.policies.length > 0 && <p>{p.policies[0].title}: {p.policies[0].description}</p>}
        </div>
      ),
      value: (p: CompareProduct) => `${asText(p.shipping_fee_note)}|${p.policies?.[0]?.title || ''}`,
    },
  ];

  const isDifferentRow = (row: { value: (p: CompareProduct) => string }) => {
    const values = products.map((p) => row.value(p));
    const set = new Set(values);
    return set.size > 1;
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <table className="w-full min-w-215 border-collapse md:min-w-245">
        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
          <tr>
            <th className="sticky left-0 z-20 w-47.5 border-b border-slate-200 bg-slate-50 px-4 py-4 text-left text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 md:w-55">
              Thuộc tính
            </th>
            {products.map((product) => (
              <th key={product.id} className="min-w-55 border-b border-slate-200 px-4 py-4 text-left text-sm font-black text-slate-700 dark:border-slate-700 dark:text-slate-100">
                {product.name || 'Chưa có'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const diff = isDifferentRow(row);
            return (
              <tr key={row.key} className={diff ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''}>
                <td className="sticky left-0 z-10 border-b border-slate-200 bg-white px-4 py-4 align-top text-sm font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                  {row.label}
                </td>
                {products.map((product) => (
                  <td key={`${row.key}-${product.id}`} className="border-b border-slate-200 px-4 py-4 align-top text-sm text-slate-600 dark:border-slate-800 dark:text-slate-200">
                    {row.render(product)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CompareTable;
