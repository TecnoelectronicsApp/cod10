import { useEffect, useState } from 'react';
import { fetchStoreConfig, StoreConfig } from '@/lib/store-config';

export function useStoreConfig() {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchStoreConfig()
      .then((data) => {
        if (!cancelled) setConfig(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loading };
}
