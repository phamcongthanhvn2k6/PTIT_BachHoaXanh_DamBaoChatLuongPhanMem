import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { recipeService } from '../services/recipeService';
import { useBranchData } from '../hooks/useBranchData';
import { useAppDispatch, useAppSelector } from '../store';
import { addToCartAsync } from '../slices/cartSlice';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import { toast } from '../components/Toast/toastEvent';

const RecipeSkeleton: React.FC<{ isSubSkeleton?: boolean }> = ({ isSubSkeleton = false }) => {
  return (
    <div className={`max-w-5xl mx-auto ${isSubSkeleton ? '' : 'px-4 sm:px-6 py-8'} animate-pulse`}>
      {!isSubSkeleton && (
        <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-6"></div>
      )}

      {!isSubSkeleton && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] h-12 bg-slate-250 dark:bg-slate-700 rounded-lg"></div>
          <div className="w-28 h-12 bg-slate-250 dark:bg-slate-700 rounded-lg"></div>
          <div className="w-36 h-12 bg-slate-250 dark:bg-slate-700 rounded-lg"></div>
          <div className="w-24 h-12 bg-slate-250 dark:bg-slate-700 rounded-lg"></div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-xl border border-slate-100 dark:border-slate-700">
        <div className="h-64 bg-slate-200 dark:bg-slate-700"></div>

        <div className="p-6 md:p-10">
          <div className="h-10 w-2/3 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4"></div>
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
          <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded mb-6"></div>

          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 mb-8">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
            <div className="grid grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-10">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-36 h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5 space-y-4">
              <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4"></div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
              ))}
            </div>
            <div className="lg:col-span-7 space-y-6">
              <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-6"></div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecipeDetail: React.FC = () => {
  const { t } = useTranslation();
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector(s => s.auth);
  const redirectToLogin = useAuthRedirect();
  const { currentBranchId, availableProducts } = useBranchData();

  const [recipe, setRecipe] = useState<any>(null);
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generation form
  const [dishName, setDishName] = useState('');
  const [servings, setServings] = useState(2);
  const [appetite, setAppetite] = useState('normal');
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const triggerPreviewGeneration = async (dishNameVal: string) => {
    setGenerating(true);
    setError(null);
    try {
      const res = await recipeService.previewRecipe({
        dishName: dishNameVal,
        servings: servings || 2,
        appetite: appetite || 'normal',
        branchId: currentBranchId || undefined
      });
      if (res.success && res.data) {
        setRecipe(res.data);
        setIsSaved(res.isSaved ?? false);
        setShowForm(false);
        if (res.cached && res.isSaved) {
          toast.success(`✅ ${t('recipe.foundCached')}`);
        } else {
          toast.success(`🧑‍🍳 ${t('recipe.generateSuccess')}`);
        }
      } else {
        setError(res.message || t('recipe.generateFailed'));
        setShowForm(true);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || t('recipe.connectError');
      setError(msg);
      setShowForm(true);
    } finally {
      setGenerating(false);
    }
  };

  // On mount: if URL has a name param, try to fetch from DB
  useEffect(() => {
    if (!name) {
      setShowForm(true);
      setRecipe(null);
      setIsSaved(true);
      return;
    }
    const decoded = decodeURIComponent(name).replace(/-/g, ' ');
    setDishName(decoded);

    const fetchRecipe = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await recipeService.getRecipeByName(name, currentBranchId || undefined);
        if (res.success && res.data) {
          setRecipe(res.data);
          setIsSaved(true);
          setServings(res.data.servings || 2);
          setShowForm(false);
        } else {
          // If 404/not found, generate preview immediately
          await triggerPreviewGeneration(decoded);
        }
      } catch (err: any) {
        if (err?.response?.status === 404) {
          await triggerPreviewGeneration(decoded);
        } else {
          setError(err?.response?.data?.message || err?.message || t('common.systemError'));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchRecipe();
  }, [name, currentBranchId]);

  const handleGenerate = async () => {
    const trimmed = dishName.trim();
    if (!trimmed) {
      toast.warning(t('recipe.enterDishNameWarning', 'Vui lòng nhập tên món ăn'));
      return;
    }
    if (trimmed.length < 2) {
      toast.warning(t('recipe.dishNameTooShort', 'Tên món ăn quá ngắn (tối thiểu 2 ký tự)'));
      return;
    }
    if (servings < 1 || servings > 10) {
      toast.warning(t('recipe.servingsRange', 'Số người ăn phải từ 1-10'));
      return;
    }

    const slug = trimmed.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    if (name === slug) {
      await triggerPreviewGeneration(trimmed);
    } else {
      navigate(`/recipes/${slug}`);
    }
  };

  const handleSave = async () => {
    if (!recipe) return;
    setIsSaving(true);
    try {
      const res = await recipeService.saveRecipe(recipe);
      if (res.success) {
        setIsSaved(true);
        toast.success(t('recipe.saveSuccess'));
      } else {
        toast.error(res.message || t('recipe.saveFailed'));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || t('recipe.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  // Match ingredients to store products (Backend-authoritative with client fallback)
  const matchedIngredients = React.useMemo(() => {
    if (recipe?.matched_ingredients && recipe.matched_ingredients.length > 0) {
      return recipe.matched_ingredients;
    }
    if (!recipe?.ingredients) return [];
    return recipe.ingredients.map((ing: any) => {
      const match = (availableProducts || []).find((p: any) =>
        p?.name?.toLowerCase().includes(ing.name.toLowerCase())
      );
      return { ingredient: ing, product: match || null, substitutes: [] };
    });
  }, [recipe, availableProducts]);

  const addToCart = async (item: any) => {
    if (!currentBranchId) { toast.error(t('common.selectBranchFirst')); return; }
    if (!isAuthenticated) { redirectToLogin({ action: 'add_to_cart' }); return; }
    try {
      await dispatch(addToCartAsync({
        branchId: currentBranchId,
        branch_product_id: String(item?.branch_product_id || item?._id || item?.id),
        price: Number(item?.price || 0), unit_price: Number(item?.price || 0), quantity: 1,
        product_name: item?.name, product_image: item?.image || item?.thumbnail || '',
        branchProduct: item,
      })).unwrap();
      toast.success(`${t('product.added')} ${item?.name}`);
    } catch (e: any) { toast.error(e?.message || t('common.error')); }
  };

  const addAllToCart = async () => {
    const available = matchedIngredients.filter((m: any) => m.product);
    if (available.length === 0) {
      toast.warning(t('recipe.noIngredientsAvailable'));
      return;
    }
    for (const m of available) await addToCart(m.product);
    toast.success(t('recipe.addedAllSuccess', { count: available.length }));
  };

  const formatPrice = (n: number) => n.toLocaleString('vi-VN');

  // ── LOADING STATE ──
  if (loading) {
    return <RecipeSkeleton />;
  }

  // ── ERROR STATE (fatal, no recipe, not in generation flow) ──
  if (error && !showForm && !recipe && !generating) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <span className="material-symbols-outlined !text-6xl text-red-400 mb-4 block">error</span>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('recipe.errorLoad')}</h2>
        <p className="text-slate-600 mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setError(null); setShowForm(true); }} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">{t('recipe.tryAgain')}</button>
          <button onClick={() => navigate(-1)} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300">{t('recipe.back')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-20">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold mb-6 transition-colors">
        <span className="material-symbols-outlined">arrow_back</span> {t('recipe.back')}
      </button>

      {/* ── GENERATION FORM ── */}
      {(showForm || recipe) && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-500">smart_toy</span>
            {recipe ? t('recipe.createOther') : t('recipe.createAi')}
          </h3>

          <div className="flex flex-wrap gap-4 items-end">
            {/* Dish name input */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">{t('recipe.dishName')} <span className="text-red-500">*</span></label>
              <input
                type="text"
                id="recipe-dish-name"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && dishName.trim() && !generating) handleGenerate(); }}
                placeholder={t('recipe.dishNamePlaceholder')}
                maxLength={100}
                className="w-full px-4 py-2.5 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                disabled={generating}
              />
            </div>

            {/* Servings */}
            <div>
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">{t('recipe.servings')} <span className="text-red-500">*</span></label>
              <select
                id="recipe-servings"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-28 px-3 py-2.5 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={generating}
              >
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {/* Appetite */}
            <div>
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">{t('recipe.appetite')}</label>
              <select
                id="recipe-appetite"
                value={appetite}
                onChange={(e) => setAppetite(e.target.value)}
                className="w-36 px-3 py-2.5 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={generating}
              >
                <option value="small">{t('recipe.appetiteSmall')}</option>
                <option value="normal">{t('recipe.appetiteNormal')}</option>
                <option value="large">{t('recipe.appetiteLarge')}</option>
              </select>
            </div>

            {/* Generate button */}
            <button
              id="recipe-generate-btn"
              onClick={handleGenerate}
              disabled={!dishName.trim() || dishName.trim().length < 2 || generating}
              className={`px-6 py-2.5 rounded-lg font-bold text-white transition-all ${
                (!dishName.trim() || dishName.trim().length < 2 || generating)
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/30 active:scale-[0.98]'
              }`}
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                  {t('recipe.generating')}
                </span>
              ) : recipe ? t('recipe.recreate') : t('recipe.create')}
            </button>
          </div>

          {/* Error message inside form */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
              <span className="material-symbols-outlined !text-base mt-0.5 shrink-0">warning</span>
              <div>
                <p className="font-bold mb-0.5">{t('recipe.generateErrorTitle')}</p>
                <p>{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GENERATING OVERLAY ── */}
      {generating && (
        <div className="space-y-8">
          <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/40 rounded-3xl p-8 text-center max-w-2xl mx-auto shadow-sm">
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 animate-spin border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
              <div className="absolute inset-2 animate-spin border-4 border-purple-200 border-b-purple-600 rounded-full" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              <span className="absolute inset-0 flex items-center justify-center text-2xl">🧑‍🍳</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">{t('recipe.aiGeneratingTitle')}</h2>
            <p className="text-slate-500 dark:text-slate-400" dangerouslySetInnerHTML={{ __html: t('recipe.analyzing', { dishName, servings }) }}></p>
            <p className="text-slate-400 text-sm mt-2">{t('recipe.timeEstimate')}</p>
            <div className="mt-6 max-w-xs mx-auto">
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full animate-pulse" style={{width: '60%', animation: 'pulse 2s ease-in-out infinite'}}></div>
              </div>
            </div>
          </div>
          <RecipeSkeleton isSubSkeleton={true} />
        </div>
      )}

      {/* ── RECIPE DISPLAY ── */}
      {recipe && !generating && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-xl border border-slate-100 dark:border-slate-700">

          {/* Header */}
          <div className="relative h-64 bg-slate-200">
            {recipe.image_url ? (
              <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-indigo-900/30 dark:via-purple-900/20 dark:to-pink-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined !text-7xl text-indigo-300 dark:text-indigo-600">restaurant</span>
              </div>
            )}
            <div className="absolute top-4 right-4 flex gap-2">
              {isSaved ? (
                <span className="bg-green-600/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg shadow-green-600/25">
                  <span className="material-symbols-outlined !text-sm">check_circle</span> {t('recipe.savedBadge')}
                </span>
              ) : (recipe.source_type === 'fallback' || recipe.ai_generated === false) ? (
                <span className="bg-amber-600/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg shadow-amber-600/25 animate-pulse">
                  <span className="material-symbols-outlined !text-sm">restaurant</span> {t('recipe.fallbackTitleShort', 'Đầu Bếp Đề Xuất')}
                </span>
              ) : (
                <span className="bg-indigo-600/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg shadow-indigo-600/25">
                  <span className="material-symbols-outlined !text-sm">smart_toy</span> {t('recipe.sourceAiBadge')}
                </span>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white dark:from-slate-800 to-transparent"></div>
          </div>

          <div className="p-6 md:p-10">
            {/* Fallback Warning Alert */}
            {(recipe.source_type === 'fallback' || recipe.ai_generated === false) && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-800 dark:text-amber-300 flex items-start gap-3 shadow-md shadow-amber-500/5">
                <span className="material-symbols-outlined shrink-0 text-amber-500 animate-bounce">warning</span>
                <div>
                  <h4 className="font-bold text-sm mb-1 text-amber-900 dark:text-amber-300">{t('recipe.fallbackTitle')}</h4>
                  <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-400">{t('recipe.fallbackDesc')}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">{recipe.title}</h1>
              {!isSaved && (
                <button
                  id="recipe-save-btn"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="self-start md:self-auto bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-600/20 transition-all active:scale-[0.98] disabled:bg-slate-400"
                >
                  <span className="material-symbols-outlined !text-base">{isSaving ? 'sync' : 'save'}</span>
                  {isSaving ? t('common.saving') : t('recipe.saveBtn')}
                </button>
              )}
            </div>
            {recipe.description && <p className="text-slate-600 dark:text-slate-300 text-lg mb-6 leading-relaxed">{recipe.description}</p>}

            {/* Nutrition facts breakdown */}
            {recipe.nutrition && (
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 mb-8">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  {t('recipe.nutritionPerServing', 'Dinh dưỡng mỗi khẩu phần')}
                </h3>
                <div className="grid grid-cols-5 gap-2 text-center">
                  {[
                    { label: t('recipe.calories', 'Calories'), value: `${recipe.nutrition.calories} kcal`, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/20' },
                    { label: t('recipe.protein', 'Đạm'), value: `${recipe.nutrition.protein}g`, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20' },
                    { label: t('recipe.fat', 'Béo'), value: `${recipe.nutrition.fat}g`, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20' },
                    { label: t('recipe.carbs', 'Carbs'), value: `${recipe.nutrition.carbs}g`, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/20' },
                    { label: t('recipe.fiber', 'Xơ'), value: `${recipe.nutrition.fiber}g`, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' }
                  ].map((nut, i) => (
                    <div key={i} className={`p-2 rounded-xl ${nut.color} border border-transparent`}>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">{nut.label}</p>
                      <p className="text-xs font-black">{nut.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info cards */}
            <div className="flex flex-wrap gap-4 mb-10">
              {[
                { icon: 'schedule', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', label: t('recipe.prepTime'), value: recipe.prep_time },
                { icon: 'local_fire_department', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20', label: t('recipe.cookTime'), value: recipe.cook_time },
                { icon: 'restaurant', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', label: t('recipe.portions'), value: recipe.servings ? `${recipe.servings} ${t('common.people', 'người')}` : null },
                { icon: 'fitness_center', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', label: t('recipe.difficulty'), value: recipe.difficulty },
              ].filter(c => c.value).map((card, i) => (
                <div key={i} className={`flex items-center gap-3 ${card.bg} px-5 py-3 rounded-xl border border-slate-100 dark:border-slate-700`}>
                  <span className={`material-symbols-outlined ${card.color} !text-2xl`}>{card.icon}</span>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{card.label}</p>
                    <p className="font-bold text-slate-700 dark:text-white text-lg">{card.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

              {/* Ingredients */}
              <div className="lg:col-span-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-black flex items-center gap-2 text-slate-800 dark:text-white">
                    <span className="material-symbols-outlined text-indigo-500">grocery</span>
                    {t('recipe.ingredients')} ({recipe.ingredients?.length || 0})
                  </h2>
                  {matchedIngredients.some((m: any) => m.product) && (
                    <button onClick={addAllToCart} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-[0.98]">
                      <span className="material-symbols-outlined !text-base">shopping_cart</span> {t('recipe.buyAll')}
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {matchedIngredients.map((m: any, idx: number) => (
                    <div key={idx} className={`p-3 rounded-xl border transition-all ${m.product ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800' : 'border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0"></span>
                          <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{m.ingredient.name}</span>
                        </div>
                        {(m.ingredient.quantity || m.ingredient.unit) && (
                          <span className="text-xs font-bold text-slate-500 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-600 whitespace-nowrap ml-2">
                            {m.ingredient.quantity}{m.ingredient.unit ? ` ${m.ingredient.unit}` : ''}
                          </span>
                        )}
                      </div>
                      {m.ingredient.note && <p className="text-xs text-slate-400 italic ml-4 mt-0.5">→ {m.ingredient.note}</p>}
                      <div className="ml-4 mt-2">
                        {m.product ? (
                          <div className="flex items-center gap-2 bg-white dark:bg-slate-700 p-2 rounded-lg border border-green-100 dark:border-green-800 shadow-sm">
                            <img src={m.product.image || m.product.thumbnail || ''} alt="" className="w-8 h-8 rounded-md object-cover bg-slate-100" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{m.product.name}</p>
                              <p className="text-xs font-black text-rose-600">{formatPrice(m.product.price)}₫</p>
                            </div>
                            <button onClick={() => addToCart(m.product)} className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center justify-center transition-colors active:scale-95">
                              <span className="material-symbols-outlined !text-sm">add</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 bg-orange-50/75 dark:bg-orange-950/20 p-2 rounded-lg border border-orange-100 dark:border-orange-900/40">
                              <span className="material-symbols-outlined text-orange-400 !text-sm">info</span>
                              <span className="text-xs text-orange-600 dark:text-orange-400">{t('recipe.notAvailable')}</span>
                            </div>
                            {/* Smart substitutes list */}
                            {m.substitutes && m.substitutes.length > 0 && (
                              <div className="mt-1 bg-slate-100/50 dark:bg-slate-900/30 p-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wide">💡 Gợi ý thay thế:</p>
                                <div className="space-y-1.5">
                                  {m.substitutes.slice(0, 3).map((sub: any) => (
                                    <div key={sub._id} className="flex items-center gap-2 bg-white dark:bg-slate-700 p-1.5 rounded border border-slate-100 dark:border-slate-750 shadow-sm">
                                      <img src={sub.image || sub.thumbnail || ''} alt="" className="w-6 h-6 rounded object-cover" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">{sub.name}</p>
                                        <p className="text-[10px] font-black text-rose-600">{formatPrice(sub.price)}₫</p>
                                      </div>
                                      <button onClick={() => addToCart(sub)} className="w-6 h-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded flex items-center justify-center transition-colors">
                                        <span className="material-symbols-outlined !text-[10px]">add</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div className="lg:col-span-7">
                <h2 className="text-xl font-black flex items-center gap-2 text-slate-800 dark:text-white mb-6">
                  <span className="material-symbols-outlined text-indigo-500">menu_book</span>
                  {t('recipe.steps')} ({recipe.steps?.length || 0})
                </h2>
                <div className="space-y-6">
                  {recipe.steps?.map((step: any, idx: number) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center shrink-0 text-sm">
                          {step.step || idx + 1}
                        </div>
                        {idx !== (recipe.steps?.length || 0) - 1 && <div className="w-0.5 flex-1 bg-indigo-100 dark:bg-slate-700 mt-2 min-h-[20px]"></div>}
                      </div>
                      <div className="pb-6 flex-1">
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2 flex-wrap">
                          {step.title || `${t('recipe.step', 'Bước')} ${step.step || idx + 1}`}
                          {step.duration && (
                            <span className="text-xs font-normal bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400">
                              ⏱ {step.duration}
                            </span>
                          )}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tips */}
                {recipe.tips?.length > 0 && (
                  <div className="mt-8 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
                    <h3 className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined !text-lg">lightbulb</span> {t('recipe.tips')}
                    </h3>
                    <ul className="space-y-2">
                      {recipe.tips.map((tip: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-amber-700 dark:text-amber-400 text-sm">
                          <span className="text-amber-500 mt-0.5 shrink-0">💡</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tags */}
                {recipe.tags?.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-2">
                    {recipe.tags.map((tag: string, i: number) => (
                      <span key={i} className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state when needs generation but no recipe yet */}
      {showForm && !recipe && !generating && !error && (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full mx-auto mb-6 flex items-center justify-center">
            <span className="material-symbols-outlined !text-5xl text-indigo-300 dark:text-indigo-600">restaurant_menu</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">{t('recipe.noRecipeYet')}</h2>
          <p className="text-slate-400 max-w-md mx-auto" dangerouslySetInnerHTML={{ __html: t('recipe.noRecipeDesc') }}></p>
        </div>
      )}
    </div>
  );
};

export default RecipeDetail;
