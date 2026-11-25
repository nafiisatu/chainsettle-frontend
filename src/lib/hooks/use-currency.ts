'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import {
  getExchangeRates,
  formatApproximateFiat,
  SUPPORTED_CURRENCIES,
} from '@/lib/services/currency';
import type { SupportedCurrency } from '@/types';

export function useCurrency() {
  const displayCurrency = useAuthStore((state) => state.displayCurrency) || 'USD';
  const setDisplayCurrency = useAuthStore((state) => state.setDisplayCurrency);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadRates = useCallback(async () => {
    try {
      const fetchedRates = await getExchangeRates();
      if (fetchedRates) {
        setRates(fetchedRates);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
    // Refresh every 5 minutes
    const interval = setInterval(loadRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadRates]);

  const formatFiat = useCallback(
    (usdcAmount: string | number | null | undefined): string | null => {
      return formatApproximateFiat(usdcAmount, displayCurrency, rates);
    },
    [displayCurrency, rates],
  );

  return {
    currency: displayCurrency,
    setCurrency: setDisplayCurrency,
    rates,
    loading,
    error,
    formatFiat,
    currencies: SUPPORTED_CURRENCIES,
  };
}
