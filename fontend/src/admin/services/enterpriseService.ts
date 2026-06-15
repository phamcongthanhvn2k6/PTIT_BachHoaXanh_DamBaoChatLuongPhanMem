import httpClient from '../../api/httpClient';
import { endpoints } from '../../api/endpoints';

const asArray = (res: any) => {
  const body = res?.data ?? res;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.items)) return body.items;
  return [];
};

const asObject = (res: any) => {
  const body = res?.data ?? res;
  return body?.data ?? body;
};

const withPagination = (res: any) => {
  const body = res?.data ?? res;
  return {
    data: Array.isArray(body?.data) ? body.data : [],
    pagination: body?.pagination || null,
  };
};

export const enterpriseService = {
  getSuppliers: async (params: any = {}) => withPagination(await httpClient.get(endpoints.suppliers.list, { params })),
  createSupplier: async (payload: any) => asObject(await httpClient.post(endpoints.suppliers.create, payload)),
  updateSupplier: async (id: string, payload: any) => asObject(await httpClient.put(endpoints.suppliers.update(id), payload)),

  getImportOrders: async (params: any = {}) => withPagination(await httpClient.get(endpoints.importOrders.list, { params })),
  createImportOrder: async (payload: any) => asObject(await httpClient.post(endpoints.importOrders.create, payload)),
  updateImportOrderStatus: async (id: string, status: string, note?: string) =>
    asObject(await httpClient.patch(endpoints.importOrders.updateStatus(id), { status, note })),

  getImportReceipts: async (params: any = {}) => withPagination(await httpClient.get(endpoints.importReceipts.list, { params })),
  createImportReceipt: async (payload: any) => asObject(await httpClient.post(endpoints.importReceipts.create, payload)),

  getInventoryBatches: async (params: any = {}) => withPagination(await httpClient.get(endpoints.inventoryBatches.list, { params })),
  createInventoryBatch: async (payload: any) => asObject(await httpClient.post(endpoints.inventoryBatches.create, payload)),
  updateInventoryBatch: async (id: string, payload: any) => asObject(await httpClient.put(endpoints.inventoryBatches.update(id), payload)),
  getExpiringAlerts: async (days: number = 30) => asArray(await httpClient.get(endpoints.inventoryBatches.alertsExpiring, { params: { days } })),
  draftPromotionFromAlert: async (payload: any) => asObject(await httpClient.post(endpoints.inventoryBatches.draftPromotion, payload)),
  getDriftReport: async (params: any = {}) => asObject(await httpClient.get(endpoints.inventoryBatches.driftReport, { params })),
  autoHealProduct: async (branchProductId: string) => asObject(await httpClient.post(endpoints.inventoryBatches.autoHeal, { branch_product_id: branchProductId })),
  autoHealAll: async (branchId?: string) => asObject(await httpClient.post(endpoints.inventoryBatches.autoHealAll, { branch_id: branchId })),

  getStockMovements: async (params: any = {}) => withPagination(await httpClient.get(endpoints.stockMovements.list, { params })),
  getStockMovementSummary: async (params: any = {}) => asArray(await httpClient.get(endpoints.stockMovements.summary, { params })),

  getRoles: async () => asArray(await httpClient.get(endpoints.roles.list)),
  getPermissions: async () => asArray(await httpClient.get(endpoints.permissions.list)),
  createRole: async (payload: any) => asObject(await httpClient.post(endpoints.roles.create, payload)),
  updateRole: async (id: string, payload: any) => asObject(await httpClient.put(endpoints.roles.update(id), payload)),
  assignUserRole: async (payload: { user_id: string; role_key: string }) =>
    asObject(await httpClient.patch(endpoints.roles.assign, payload)),
  createStaff: async (payload: any) => asObject(await httpClient.post('/users/staff', payload)),

  getAuditLogs: async (params: any = {}) => withPagination(await httpClient.get(endpoints.auditLogs.list, { params })),

  getBranches: async () => asArray(await httpClient.get(endpoints.branches.list)),
};

export default enterpriseService;
