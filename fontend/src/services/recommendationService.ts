import httpClient from '../api/httpClient';
import { endpoints } from '../api/endpoints';

export interface SmartRecommendations {
  buyAgain: any[];
  recommendedForYou: any[];
  frequentlyBoughtTogether: any[];
  seasonalRecommendations: any[];
}

export const recommendationService = {
  getRecommendations: async (branchId: string, limit = 8): Promise<SmartRecommendations> => {
    try {
      const res = await httpClient.get(endpoints.recommendations.get, {
        params: { branchId, limit }
      });
      const data = res?.data?.data || res?.data || {};
      return {
        buyAgain: Array.isArray(data.buyAgain) ? data.buyAgain : [],
        recommendedForYou: Array.isArray(data.recommendedForYou) ? data.recommendedForYou : [],
        frequentlyBoughtTogether: Array.isArray(data.frequentlyBoughtTogether) ? data.frequentlyBoughtTogether : [],
        seasonalRecommendations: Array.isArray(data.seasonalRecommendations) ? data.seasonalRecommendations : []
      };
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      return {
        buyAgain: [],
        recommendedForYou: [],
        frequentlyBoughtTogether: [],
        seasonalRecommendations: []
      };
    }
  }
};
