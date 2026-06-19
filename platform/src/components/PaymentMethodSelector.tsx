'use client';

import {
  PaymentMethodConfig,
  formatPaymentDetails,
} from '@/lib/store-config';

type Props = {
  methods: PaymentMethodConfig[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export default function PaymentMethodSelector({ methods, selectedId, onSelect }: Props) {
  const selected = methods.find((m) => m.id === selectedId) || methods[0];

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-800">Método de pago</p>
      <div className="space-y-2">
        {methods.map((method) => (
          <label
            key={method.id}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
              selectedId === method.id
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-orange-200'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              checked={selectedId === method.id}
              onChange={() => onSelect(method.id)}
              className="mt-1 accent-orange-500"
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{method.label}</p>
              {selectedId === method.id && (
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  {formatPaymentDetails(method).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          </label>
        ))}
      </div>
      {selected && selected.id === 'pagomovil' && (
        <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
          Realiza el pago móvil con los datos indicados y conserva el comprobante.
        </p>
      )}
    </div>
  );
}
