'use client';

import { COMMON_CASH_BILLS, calcCashChange } from '@/lib/cash-payment';

type Props = {
  total: number;
  value: string;
  onChange: (value: string) => void;
  symbol?: string;
};

export default function CashTenderInput({ total, value, onChange, symbol = '$' }: Props) {
  const tender = parseFloat(value);
  const valid = Number.isFinite(tender) && tender >= total;
  const change = valid ? calcCashChange(tender, total) : null;

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div>
        <p className="text-sm font-semibold text-amber-900">¿Con qué billete pagas?</p>
        <p className="mt-0.5 text-xs text-amber-800">
          Total del pedido: {symbol}
          {total.toFixed(2)} — indica el monto para calcular el vuelto al repartidor.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {COMMON_CASH_BILLS.map((bill) => (
          <button
            key={bill}
            type="button"
            onClick={() => onChange(String(bill))}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              value === String(bill)
                ? 'border-amber-600 bg-amber-500 text-white'
                : 'border-amber-300 bg-white text-amber-900 hover:border-amber-400'
            }`}
          >
            {symbol}
            {bill}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(total.toFixed(2))}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
            value === total.toFixed(2)
              ? 'border-amber-600 bg-amber-500 text-white'
              : 'border-amber-300 bg-white text-amber-900 hover:border-amber-400'
          }`}
        >
          Exacto
        </button>
      </div>

      <div>
        <label htmlFor="cash-tender" className="text-xs font-medium text-amber-900">
          Otro monto
        </label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            {symbol}
          </span>
          <input
            id="cash-tender"
            type="number"
            min={total}
            step="0.01"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={total.toFixed(2)}
            className="w-full rounded-lg border border-amber-300 bg-white py-2 pl-7 pr-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {value && !valid && (
        <p className="text-xs text-red-600">
          El monto debe ser al menos {symbol}
          {total.toFixed(2)}.
        </p>
      )}

      {valid && change != null && (
        <p className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-green-800">
          Vuelto: {symbol}
          {change.toFixed(2)}
        </p>
      )}
    </div>
  );
}
