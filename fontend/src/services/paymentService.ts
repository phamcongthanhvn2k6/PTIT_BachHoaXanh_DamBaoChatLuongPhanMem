import type { PaymentMethod } from '../types';
import { dataService } from './dataService';
import httpClient from '../api/httpClient';

export const paymentService = {
  listMethods: (_userId: string | number) => dataService.getPaymentMethods(),
  addMethod: (payload: Partial<PaymentMethod>) => dataService.addPaymentMethod(payload),
  updateMethod: (id: string, payload: Partial<PaymentMethod>) => dataService.updatePaymentMethod(id, payload),
  deleteMethod: (id: string) => dataService.deletePaymentMethod(id),
  setDefaultMethod: (id: string, _userId: string | number) => dataService.setDefaultPaymentMethod(id),

  processPayment: (payload: {
    orderId: string;
    provider: string;
    amount: number;
    methodId?: string;
    userId?: string | number;
    currency?: string;
  }) =>
    dataService.createPaymentTransaction({
      order_id: payload.orderId,
      provider: payload.provider,
      amount: payload.amount,
      method_id: payload.methodId,
      user_id: payload.userId,
      currency: payload.currency || 'VND',
    }),

  confirmPayment: async (transactionId: string) => {
    const res = await httpClient.post(`/payments/${transactionId}/confirm`, {});
    // Unwrap: res.data = { success, data, message }
    const body = res?.data ?? res;
    return body?.data ?? body;
  },

  verifyPayment: async (transactionId: string) => {
    const res = await httpClient.post(`/payments/${transactionId}/verify`, {});
    const body = res?.data ?? res;
    return body?.data ?? body;
  },

  sandboxSimulatePayment: async (transactionId: string, status: 'COMPLETED' | 'FAILED') => {
    const res = await httpClient.post(`/payments/${transactionId}/sandbox-simulate`, { status });
    const body = res?.data ?? res;
    return body?.data ?? body;
  },

  getPaymentStatus: async (transactionId: string) => {
    const res = await httpClient.get(`/payments/${transactionId}/status`);
    const body = res?.data ?? res;
    return body?.data ?? body;
  },

  cancelPayment: async (transactionId: string) => {
    const res = await httpClient.post(`/payments/${transactionId}/cancel`, {});
    const body = res?.data ?? res;
    return body?.data ?? body;
  },

  listTransactions: (orderId?: string) => dataService.getPaymentTransactions(orderId),
  listProviders: () => dataService.getPaymentProviders(),
  updateProviders: (providers: unknown[]) => dataService.updatePaymentProviders(providers),
};
