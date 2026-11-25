/**
 * src/lib/services/currency.ts
 *
 * Local currency conversion service with 5-minute rate caching
 * and configurable price API endpoint.
 */

import type { SupportedCurrency, CurrencyConfig } from '@/types';

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', label: 'USD — US Dollar', rateKey: 'USD' },
  { code: 'EUR', symbol: '€', label: 'EUR — Euro', rateKey: 'EUR' },
  { code: 'GBP', symbol: '£', label: 'GBP — British Pound', rateKey: 'GBP' },
  { code: 'NGN', symbol: '₦', label: 'NGN — Nigerian Naira', rateKey: 'NGN' },
  { code: 'KES', symbol: 'KSh ', label: 'KES — Kenyan Shilling', rateKey: 'KES' },
  { code: 'ZAR', symbol: 'R ', label: 'ZAR — South African Rand', rateKey: 'ZAR' },
];

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'chainsettle_fiat_rates_cache';

const DEFAULT_PRICE_API_URL = 'https://open.er-api.com/v6/latest/USD';

interface CachedRates {
  timestamp: number;
  rates: Record<string, number>;
}

let memoryCache: CachedRates | null = null;

/**
 * Get cached rates from memory or localStorage if not expired.
 */
function getCachedRates(): Record<string, number> | null {
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_DURATION_MS) {
    return memoryCache.rates;
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedRates;
        if (Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
          memoryCache = parsed;
          return parsed.rates;
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }

  return null;
}

/**
 * Save rates to memory and localStorage.
 */
function setCachedRates(rates: Record<string, number>) {
  const payload: CachedRates = {
    timestamp: Date.now(),
    rates,
  };
  memoryCache = payload;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore localStorage write errors
    }
  }
}

/**
 * Fetch latest exchange rates with 5-minute cache.
 * Returns null if the fetch fails and no valid cache exists.
 */
export async function getExchangeRates(): Promise<Record<string, number> | null> {
  const cached = getCachedRates();
  if (cached) {
    return cached;
  }

  const apiUrl = process.env.NEXT_PUBLIC_PRICE_API_URL || DEFAULT_PRICE_API_URL;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Price API responded with status ${response.status}`);
    }

    const data = await response.json();
    let rates: Record<string, number> | null = null;

    if (data && typeof data === 'object') {
      if (data.rates && typeof data.rates === 'object') {
        rates = data.rates;
      } else if (data.conversion_rates && typeof data.conversion_rates === 'object') {
        rates = data.conversion_rates;
      } else if (data['usd-coin']) {
        // CoinGecko format
        rates = {};
        for (const [key, val] of Object.entries(data['usd-coin'])) {
          rates[key.toUpperCase()] = Number(val);
        }
      }
    }

    if (rates && Object.keys(rates).length > 0) {
      // Ensure USD rate is 1.0
      rates.USD = 1.0;
      setCachedRates(rates);
      return rates;
    }

    return memoryCache ? memoryCache.rates : null;
  } catch (error) {
    // If rate fetch fails, fallback to stale cache if available, or return null
    return memoryCache ? memoryCache.rates : null;
  }
}

/**
 * Formats a USDC amount into approximate fiat text clearly marked with '≈'.
 * Returns null if rates are unavailable so the UI can hide it without breaking.
 */
export function formatApproximateFiat(
  usdcAmount: string | number | null | undefined,
  currency: SupportedCurrency = 'USD',
  rates: Record<string, number> | null,
): string | null {
  if (usdcAmount === null || usdcAmount === undefined || !rates) {
    return null;
  }

  const num = typeof usdcAmount === 'string' ? parseFloat(usdcAmount) : usdcAmount;
  if (isNaN(num)) {
    return null;
  }

  const rate = rates[currency];
  if (typeof rate !== 'number' || isNaN(rate)) {
    return null;
  }

  const fiatValue = num * rate;
  const config = SUPPORTED_CURRENCIES.find((c) => c.code === currency);
  const symbol = config?.symbol ?? `${currency} `;

  // Format with standard 2 decimal places and locale thousands separators
  const formattedValue = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(fiatValue);

  return `≈ ${symbol}${formattedValue}`;
}
