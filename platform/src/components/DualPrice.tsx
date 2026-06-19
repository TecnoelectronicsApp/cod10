'use client';

import { formatDualPriceParts } from '@/lib/format-price';

type DualPriceProps = {
  amount: number;
  symbol?: string;
  exchangeRate: number | null | undefined;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
};

export default function DualPrice({
  amount,
  symbol = '$',
  exchangeRate,
  className = '',
  primaryClassName = '',
  secondaryClassName = 'text-sm font-normal text-gray-500',
}: DualPriceProps) {
  const parts = formatDualPriceParts(amount, symbol, exchangeRate);

  return (
    <span className={className}>
      <span className={primaryClassName}>{parts.primary}</span>
      {parts.secondary && (
        <>
          {' '}
          <span className={secondaryClassName}>/ {parts.secondary}</span>
        </>
      )}
    </span>
  );
}
