import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Product, BranchProduct, Category, EventPost } from '../types';
import { dataService } from '../services/dataService';
import { normalizeBranchProducts, normalizeCategories, normalizeProducts, deriveCategoryLookup } from '../utils/productNormalization';
import i18n from '../i18n';

export const loadProductsData = createAsyncThunk(
  'product/loadProductsData',
  async () => {
    const [products, branchProducts, categories, eventPosts] = await Promise.all([
      dataService.getProducts(),
      dataService.getBranchProducts(),
      dataService.getCategories(),
      dataService.getEventPosts()
    ]);

    const normalizedCategoryList = normalizeCategories(categories);
    const categoryLookup = deriveCategoryLookup(normalizedCategoryList);
    const normalizedProductList = normalizeProducts(products) as Product[];
    const normalizedBranchProductList = normalizeBranchProducts(branchProducts) as BranchProduct[];

    const shopProductMap = new Map(
      normalizeProducts(normalizedProductList as any[], categoryLookup).map((item) => [String(item.product_id || item.id), item])
    );

    const productsWithCategoryShop = normalizedProductList.map((product: any) => {
      const key = String(product?.id || product?._id || '');
      const shop = shopProductMap.get(key);
      return {
        ...product,
        categoryShop: shop?.categoryShop || product?.categoryShop || product?.category_name || i18n.t('common.other'),
      };
    });

    const branchProductsWithCategoryShop = normalizedBranchProductList.map((bp: any) => {
      const key = String(bp?.product_id || bp?.product?.id || bp?.product?._id || '');
      const shop = shopProductMap.get(key);
      return {
        ...bp,
        categoryShop: shop?.categoryShop || bp?.categoryShop || bp?.category_name || i18n.t('common.other'),
      };
    });

    return {
      products: productsWithCategoryShop as Product[],
      branchProducts: branchProductsWithCategoryShop as BranchProduct[],
      categories: normalizedCategoryList as Category[],
      eventPosts,
    };
  }
);

interface ProductState {
  products: Product[];
  branchProducts: BranchProduct[];
  categories: Category[];
  eventPosts: EventPost[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ProductState = {
  products: [],
  branchProducts: [],
  categories: [],
  eventPosts: [],
  status: 'idle',
  error: null,
};

export const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadProductsData.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadProductsData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.products = action.payload.products;
        state.branchProducts = action.payload.branchProducts;
        state.categories = action.payload.categories;
        state.eventPosts = action.payload.eventPosts;
      })
      .addCase(loadProductsData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || null;
      });
  },
});

export default productSlice.reducer;
