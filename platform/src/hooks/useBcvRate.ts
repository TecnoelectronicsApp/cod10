'use client';

import { useEffect, useState } from 'react';
import { fetchBcvRate, getCachedBcvRate, BcvRate } from '@/lib/bcv-rate';

export function useBcvRate() {
  const [rate, setRate] = useState<number | null>(() => getCachedBcvRate()?.rate ?? null);
  const [rateDate, setRateDate] = useState<string | null>(() => getCachedBcvRate()?.rateDate ?? null);
  const [loading, setLoading] = useState(!getCachedBcvRate());

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
        /* mantiene caché o null */
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
