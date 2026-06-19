'use client';

import { useQuery, ApolloProvider } from '@apollo/client/react';
import { useState } from 'react';
import { getApolloClient } from '@/lib/apollo-client';
import { CATEGORIES, FOOD_BY_CATEGORY, CONFIGURATION } from '@/lib/graphql/operations';
import { Category, Food } from '@/lib/types';
import FoodModal from '@/components/FoodModal';

function MenuContent() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  const { data: catData, loading: catLoading } = useQuery<{ categories: Category[] }>(CATEGORIES);
  const { data: configData } = useQuery<{ configuration: { currency_symbol: string; delivery_charges: number } }>(CONFIGURATION);

  const categoryId = activeCategory || catData?.categories?.[0]?._id || '';
  const { data: foodData, loading: foodLoading } = useQuery<{ foodByCategory: Food[] }>(
    FOOD_BY_CATEGORY,
    { variables: { category: categoryId }, skip: !categoryId }
  );

  const symbol = configData?.configuration?.currency_symbol || '$';
  const delivery = configData?.configuration?.delivery_charges ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <section className="mb-8 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold md:text-4xl">¡Pide tu comida favorita!</h1>
        <p className="mt-2 text-orange-100">
          Entrega a domicilio · Envío desde {symbol}{delivery.toFixed(2)}
        </p>
      </section>

      {catLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {catData?.categories?.map((cat) => (
              <button
                key={cat._id}
                onClick={() => setActiveCategory(cat._id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  (activeCategory || catData.categories[0]?._id) === cat._id
                    ? 'bg-orange-500 text-white shadow'
                    : 'bg-white text-gray-700 shadow-sm hover:bg-orange-50'
                }`}
              >
                {cat.title}
              </button>
            ))}
          </div>

          {foodLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {foodData?.foodByCategory?.map((food) => {
                const price = food.variations[0]?.discounted ?? food.variations[0]?.price ?? 0;
                return (
                  <button
                    key={food._id}
                    onClick={() => setSelectedFood(food)}
                    className="group overflow-hidden rounded-xl bg-white text-left shadow-sm transition hover:shadow-md"
                  >
                    <div className="relative h-44 overflow-hidden bg-gray-100">
                      {food.img_url ? (
                        <img
                          src={food.img_url}
                          alt={food.title}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-5xl">🍽️</div>
                      )}
                      {food.stock === 0 && (
                        <span className="absolute left-2 top-2 rounded bg-red-500 px-2 py-0.5 text-xs text-white">
                          Agotado
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900">{food.title}</h3>
                      {food.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-500">{food.description}</p>
                      )}
                      <p className="mt-2 text-lg font-bold text-orange-600">
                        {symbol}{price.toFixed(2)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!foodLoading && foodData?.foodByCategory?.length === 0 && (
            <p className="py-20 text-center text-gray-500">No hay productos en esta categoría</p>
          )}
        </>
      )}

      {selectedFood && (
        <FoodModal food={selectedFood} onClose={() => setSelectedFood(null)} />
      )}
    </div>
  );
}

export default function HomePage() {
  const client = getApolloClient('customer');
  return (
    <ApolloProvider client={client}>
      <MenuContent />
    </ApolloProvider>
  );
}
