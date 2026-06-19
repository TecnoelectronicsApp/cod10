'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { CATEGORIES, FOOD_BY_CATEGORY, CONFIGURATION } from '@/lib/graphql/operations';
import { fetchFallbackCatalog, foodsForCategory, FallbackCatalog } from '@/lib/catalog-fallback';
import { Category, Food } from '@/lib/types';

export function useMenuCatalog(activeCategory: string | null) {
  const [fallback, setFallback] = useState<FallbackCatalog | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  const {
    data: catData,
    loading: catLoading,
    error: catError,
  } = useQuery<{ categories: Category[] }>(CATEGORIES);

  const {
    data: configData,
    error: configError,
  } = useQuery<{ configuration: { currency_symbol: string; delivery_charges: number } }>(CONFIGURATION);

  const apiCategories = catData?.categories ?? [];
  const categoryId = activeCategory || apiCategories[0]?._id || fallback?.categories[0]?._id || '';

  const {
    data: foodData,
    loading: foodLoading,
    error: foodError,
  } = useQuery<{ foodByCategory: Food[] }>(FOOD_BY_CATEGORY, {
    variables: { category: categoryId },
    skip: !categoryId || Boolean(fallback),
  });

  const apiBroken = Boolean(catError || foodError || configError);

  useEffect(() => {
    if (!apiBroken) return;
    let cancelled = false;
    setFallbackLoading(true);
    fetchFallbackCatalog()
      .then((catalog) => {
        if (!cancelled) setFallback(catalog);
      })
      .catch(() => {
        if (!cancelled) setFallback(null);
      })
      .finally(() => {
        if (!cancelled) setFallbackLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBroken]);

  const usingFallback = Boolean(fallback);

  const categories = useMemo(() => {
    if (usingFallback) return fallback!.categories;
    return apiCategories;
  }, [usingFallback, fallback, apiCategories]);

  const foods = useMemo(() => {
    if (usingFallback && fallback) {
      const id = activeCategory || fallback.categories[0]?._id || '';
      return foodsForCategory(fallback, id);
    }
    return foodData?.foodByCategory ?? [];
  }, [usingFallback, fallback, activeCategory, foodData]);

  const symbol =
    configData?.configuration?.currency_symbol ||
    fallback?.configuration?.currency_symbol ||
    '$';

  const delivery =
    configData?.configuration?.delivery_charges ??
    fallback?.configuration?.delivery_charges ??
    3;

  const loading =
    !usingFallback &&
    (catLoading || fallbackLoading || (foodLoading && !foodError)) &&
    categories.length === 0;

  return {
    categories,
    foods,
    categoryId,
    symbol,
    delivery,
    loading,
    usingFallback,
    apiBroken,
  };
}
