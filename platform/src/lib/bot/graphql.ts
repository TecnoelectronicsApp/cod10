const DEFAULT_GRAPHQL_URL = 'https://enatega-singlevendor.up.railway.app/graphql';

export function getGraphqlUrl(): string {
  if (process.env.GRAPHQL_URL) {
    return process.env.GRAPHQL_URL.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_GRAPHQL_URL) {
    return process.env.NEXT_PUBLIC_GRAPHQL_URL.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/api/graphql`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/graphql`;
  }
  return DEFAULT_GRAPHQL_URL;
}

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(getGraphqlUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status}`);
  }

  const json = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'GraphQL error');
  }
  if (!json.data) {
    throw new Error('GraphQL returned no data');
  }

  return json.data;
}

export type GraphqlCategory = { _id: string; title: string; description?: string };
export type GraphqlOption = { _id: string; title: string; description?: string; price: number };
export type GraphqlAddon = {
  _id: string;
  title: string;
  description?: string;
  quantity_minimum?: number;
  quantity_maximum?: number;
  options?: GraphqlOption[];
};
export type GraphqlVariation = {
  _id: string;
  title: string;
  price: number;
  discounted?: number;
  addons?: GraphqlAddon[];
};
export type GraphqlFood = {
  _id: string;
  title: string;
  description?: string;
  stock?: number;
  img_url?: string;
  tag?: string;
  variations?: GraphqlVariation[];
};

export type GraphqlConfiguration = {
  currency?: string;
  currency_symbol?: string;
  delivery_charges?: number;
};

const CATEGORIES_QUERY = `
  query BotCategories {
    categories { _id title description }
  }
`;

const FOOD_BY_CATEGORY_QUERY = `
  query BotFoodByCategory($category: String!) {
    foodByCategory(category: $category, inStock: true) {
      _id title description stock img_url tag
      variations {
        _id title price discounted
        addons {
          _id title description quantity_minimum quantity_maximum
          options { _id title description price }
        }
      }
    }
  }
`;

const CONFIGURATION_QUERY = `
  query BotConfiguration {
    configuration { currency currency_symbol delivery_charges }
  }
`;

export async function fetchAllFoods(): Promise<{
  categories: GraphqlCategory[];
  foods: Array<GraphqlFood & { categoryId: string; categoryTitle: string }>;
  configuration: GraphqlConfiguration | null;
}> {
  const [{ categories }, { configuration }] = await Promise.all([
    graphqlRequest<{ categories: GraphqlCategory[] }>(CATEGORIES_QUERY),
    graphqlRequest<{ configuration: GraphqlConfiguration }>(CONFIGURATION_QUERY).catch(() => ({
      configuration: null as GraphqlConfiguration | null,
    })),
  ]);

  const foods: Array<GraphqlFood & { categoryId: string; categoryTitle: string }> = [];

  for (const category of categories) {
    try {
      const { foodByCategory } = await graphqlRequest<{ foodByCategory: GraphqlFood[] }>(
        FOOD_BY_CATEGORY_QUERY,
        { category: category._id },
      );
      for (const food of foodByCategory ?? []) {
        foods.push({
          ...food,
          categoryId: category._id,
          categoryTitle: category.title,
        });
      }
    } catch {
      /* categoría sin productos o error puntual */
    }
  }

  return { categories, foods, configuration };
}

export async function searchFoodsByName(search: string): Promise<GraphqlFood[]> {
  const { categories } = await graphqlRequest<{ categories: GraphqlCategory[] }>(CATEGORIES_QUERY);
  const results: GraphqlFood[] = [];

  for (const category of categories) {
    try {
      const { foodByCategory } = await graphqlRequest<{ foodByCategory: GraphqlFood[] }>(
        `query BotFoodSearch($category: String!, $search: String!) {
          foodByCategory(category: $category, inStock: true, search: $search) {
            _id title description stock tag
            variations { _id title price discounted addons { _id title options { _id title price } } }
          }
        }`,
        { category: category._id, search },
      );
      results.push(...(foodByCategory ?? []));
    } catch {
      /* ignore */
    }
  }

  return results;
}
