import httpClient from '../api/httpClient';
import { endpoints } from '../api/endpoints';

export const recipeService = {
  getRecipes: async (limit = 20) => {
    const response = await httpClient.get(endpoints.recipes.list, { params: { limit } });
    return response.data;
  },

  searchRecipes: async (query: string) => {
    const response = await httpClient.get(endpoints.recipes.search, { params: { q: query } });
    return response.data;
  },

  getRecipeByName: async (name: string, branchId?: string) => {
    const response = await httpClient.get(endpoints.recipes.byName(name), {
      params: branchId ? { branchId } : undefined
    });
    return response.data;
  },

  getRecipeById: async (id: string, branchId?: string) => {
    const response = await httpClient.get(endpoints.recipes.detail(id), {
      params: branchId ? { branchId } : undefined
    });
    return response.data;
  },

  generateRecipe: async (payload: { dishName: string; servings: number; appetite: string; branchId?: string }) => {
    // AI generation can take 15-30 seconds — use extended timeout
    const response = await httpClient.post(endpoints.recipes.generate, payload, {
      timeout: 60000, // 60s timeout for AI generation
      params: payload.branchId ? { branchId: payload.branchId } : undefined
    });
    return response.data;
  },

  previewRecipe: async (payload: { dishName: string; servings: number; appetite: string; branchId?: string }) => {
    const response = await httpClient.post(endpoints.recipes.preview, payload, {
      timeout: 60000,
      params: payload.branchId ? { branchId: payload.branchId } : undefined
    });
    return response.data;
  },

  saveRecipe: async (recipeData: any) => {
    const response = await httpClient.post(endpoints.recipes.save, recipeData);
    return response.data;
  }
};
