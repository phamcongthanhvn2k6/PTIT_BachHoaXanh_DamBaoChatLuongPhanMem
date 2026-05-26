type AnyRow = Record<string, any>;

const toId = (value: any): string => String(value || '').trim();

const buildProductMap = (products: AnyRow[]) => {
  const map = new Map<string, AnyRow>();
  for (const product of products || []) {
    const id = toId(product?.id || product?._id);
    if (!id) continue;
    map.set(id, product);
  }
  return map;
};

export const resolveFlashDealProductContext = (
  deal: AnyRow,
  products: AnyRow[],
  branchProducts: AnyRow[],
  currentBranchId?: string,
) => {
  const productMap = buildProductMap(products || []);
  let resolvedProductId = toId(deal?.product_id);

  if (!resolvedProductId && deal?.branch_product_id) {
    const bp = (branchProducts || []).find(
      (row) => toId(row?.id || row?._id) === toId(deal.branch_product_id),
    );
    if (bp?.product_id) resolvedProductId = toId(bp.product_id);
  }

  const product = resolvedProductId ? productMap.get(resolvedProductId) : null;

  let matchedBranchProduct =
    (branchProducts || []).find(
      (bp) =>
        toId(bp?.product_id) === resolvedProductId &&
        toId(bp?.branch_id) === toId(currentBranchId),
    ) ||
    null;

  if (!matchedBranchProduct) {
    matchedBranchProduct =
      (branchProducts || []).find((bp) => toId(bp?.product_id) === resolvedProductId) || null;
  }

  return {
    resolvedProductId,
    product,
    matchedBranchProduct,
  };
};
