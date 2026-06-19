'use client';

import { Food } from '@/lib/types';
import { useState } from 'react';
import { useCart } from '@/lib/cart-context';

function calcPrice(
  variation: Food['variations'][0],
  selectedAddons: Record<string, string[]>
) {
  let price = variation.discounted ?? variation.price;
  variation.addons?.forEach((addon) => {
    const selected = selectedAddons[addon._id] || [];
    addon.options.forEach((opt) => {
      if (selected.includes(opt._id)) price += opt.price;
    });
  });
  return price;
}

export default function FoodModal({
  food,
  onClose,
}: {
  food: Food;
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const [variationId, setVariationId] = useState(food.variations[0]?._id || '');
  const [selectedAddons, setSelectedAddons] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);

  const variation = food.variations.find((v) => v._id === variationId) || food.variations[0];
  const unitPrice = variation ? calcPrice(variation, selectedAddons) : 0;

  const toggleAddon = (addonId: string, optionId: string) => {
    setSelectedAddons((prev) => {
      const current = prev[addonId] || [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [addonId]: next };
    });
  };

  const handleAdd = () => {
    if (!variation) return;
    const addonsPayload = Object.entries(selectedAddons)
      .filter(([, opts]) => opts.length > 0)
      .map(([addonId, optionIds]) => {
        const addon = variation.addons?.find((a) => a._id === addonId);
        return {
          _id: addonId,
          options: optionIds.map((oid) => {
            const opt = addon?.options.find((o) => o._id === oid);
            return { _id: oid, title: opt?.title || '', price: opt?.price || 0 };
          }),
        };
      });

    addItem({
      foodId: food._id,
      title: food.title,
      img_url: food.img_url,
      quantity,
      variation: { _id: variation._id, title: variation.title, price: variation.price },
      addons: addonsPayload,
      unitPrice,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {food.img_url && (
          <img src={food.img_url} alt={food.title} className="h-48 w-full object-cover" />
        )}
        <div className="p-5">
          <h2 className="text-xl font-bold text-gray-900">{food.title}</h2>
          {food.description && <p className="mt-1 text-sm text-gray-500">{food.description}</p>}

          {food.variations.length > 1 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-gray-700">Variación</p>
              <div className="flex flex-wrap gap-2">
                {food.variations.map((v) => (
                  <button
                    key={v._id}
                    onClick={() => setVariationId(v._id)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      variationId === v._id
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200'
                    }`}
                  >
                    {v.title} — ${(v.discounted ?? v.price).toFixed(2)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {variation?.addons?.map((addon) => (
            <div key={addon._id} className="mt-4">
              <p className="mb-2 text-sm font-semibold text-gray-700">{addon.title}</p>
              <div className="space-y-1">
                {addon.options.map((opt) => (
                  <label key={opt._id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={(selectedAddons[addon._id] || []).includes(opt._id)}
                      onChange={() => toggleAddon(addon._id, opt._id)}
                      className="accent-orange-500"
                    />
                    <span className="flex-1 text-sm">{opt.title}</span>
                    {opt.price > 0 && <span className="text-sm text-gray-500">+${opt.price.toFixed(2)}</span>}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full border text-lg"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border text-lg"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAdd}
              className="rounded-xl bg-orange-500 px-6 py-2.5 font-semibold text-white hover:bg-orange-600"
            >
              Agregar ${(unitPrice * quantity).toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
