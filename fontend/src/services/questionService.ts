import httpClient from '../api/httpClient';

export const questionService = {
  listAll: async (params?: any) => {
    const res = await httpClient.get('/questions', { params });
    return res.data;
  },
  update: async (id: string, payload: any) => {
    const res = await httpClient.put(`/questions/${id}`, payload);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await httpClient.delete(`/questions/${id}`);
    return res.data;
  },
  reply: async (productId: string, questionId: string, content: string) => {
    const res = await httpClient.post(`/products/${productId}/questions/${questionId}/reply`, { content });
    return res.data;
  }
};
