'use client';

import { useEffect, useState } from 'react';
import { fetchBcvRate, getLastKnownBcvRate, BcvRate } from '@/lib/bcv-rate';

export function useBcvRate() {
  const [rate, setRate] = useState<number | null>(() => getLastKnownBcvRate()?.rate ?? null);
  const [rateDate, setRateDate] = useState<string | null>(() => getLastKnownBcvRate()?.rateDate ?? null);
  const [loading, setLoading] = useState(!getLastKnownBcvRate());

  useEffect(() => {
    let cancelled = false;
    fetchBcvRate()
      .then((data: BcvRate) => {
        if (!cancelled) {
          setRate(data.rate);
          setRateDate(data.rateDate || null);
        }
      })
      .catch(() => {
        const last = getLastKnownBcvRate();
        if (!cancelled && last) {
          setRate(last.rate);
          setRateDate(last.rateDate || null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { rate, rateDate, loading };
}
