'use client';

export type FulfillmentMode = 'delivery' | 'pickup';

export default function FulfillmentSelector({
  value,
  onChange,
}: {
  value: FulfillmentMode;
  onChange: (mode: FulfillmentMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(
        [
          { id: 'delivery' as const, icon: '🛵', title: 'Delivery', desc: 'Envío a tu ubicación' },
          { id: 'pickup' as const, icon: '🏪', title: 'Pickup', desc: 'Retiras en el local' },
        ] as const
      ).map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-xl border-2 p-3 text-left transition ${
            value === opt.id
              ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-200'
              : 'border-gray-200 bg-white hover:border-orange-200'
          }`}
        >
          <span className="text-xl">{opt.icon}</span>
          <p className="mt-1 font-semibold text-gray-900">{opt.title}</p>
          <p className="text-xs text-gray-500">{opt.desc}</p>
        </button>
      ))}
    </div>
  );
}
