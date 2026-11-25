'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { counterpartiesApi } from '@/lib/api/services';
import {
  formatConfirmationDuration,
  formatDisputeRate,
  MIN_SHIPMENTS_FOR_METRICS,
  type SupplierMetrics,
} from '@/lib/counterparty-metrics';
import { isValidStellarAddress } from '@/lib/stellar/address';
import { cn } from '@/lib/utils';

interface SupplierMetricsCardProps {
  address: string;
  compact?: boolean;
  showProfileLink?: boolean;
  onMetricsLoaded?: (metrics: SupplierMetrics | null) => void;
}

export function SupplierMetricsCard({
  address,
  compact = false,
  showProfileLink = false,
  onMetricsLoaded,
}: SupplierMetricsCardProps) {
  const [metrics, setMetrics] = useState<SupplierMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = address.trim();
  const isValid = isValidStellarAddress(normalized);

  useEffect(() => {
    if (!isValid) {
      setMetrics(null);
      setError(null);
      setLoading(false);
      onMetricsLoaded?.(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(() => {
      counterpartiesApi
        .getSupplierMetrics(normalized)
        .then((res) => {
          if (cancelled) return;
          setMetrics(res);
          onMetricsLoaded?.(res);
        })
        .catch(() => {
          if (cancelled) return;
          setError('Could not load supplier metrics.');
          setMetrics(null);
          onMetricsLoaded?.(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isValid, normalized, onMetricsLoaded]);

  if (!isValid) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-100 bg-gray-50/70',
        compact ? 'mt-2 p-3' : 'card bg-white p-5',
      )}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-brand-600 flex-shrink-0" aria-hidden="true" />
          <h3 className={cn('font-semibold text-gray-900', compact ? 'text-xs' : 'text-sm')}>
            Supplier track record
          </h3>
        </div>
        {showProfileLink && (
          <Link
            href={`/dashboard/counterparties?address=${encodeURIComponent(normalized)}`}
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            View counterparty page
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-500 py-1" role="status">
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          Loading supplier history…
        </div>
      ) : error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : !metrics ? null : !metrics.hasEnoughData ? (
        <div className="flex items-start gap-2 rounded-lg bg-white border border-gray-100 px-3 py-2.5 text-xs text-gray-600">
          <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-medium text-gray-800">Not enough data</p>
            <p className="text-gray-500 mt-0.5">
              {metrics.totalShipments} shipment{metrics.totalShipments === 1 ? '' : 's'} found — at least{' '}
              {MIN_SHIPMENTS_FOR_METRICS} shipments are required to evaluate reliability.
            </p>
          </div>
        </div>
      ) : (
        <div className={cn('grid gap-2.5', compact ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3 gap-4')}>
          <div className="rounded-lg bg-white border border-gray-100 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" aria-hidden="true" />
              <span>Completed shipments</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {metrics.completedShipments}{' '}
              <span className="text-xs font-normal text-gray-400">
                / {metrics.totalShipments}
              </span>
            </p>
          </div>

          <div className="rounded-lg bg-white border border-gray-100 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <AlertTriangle
                className={cn(
                  'w-3.5 h-3.5 flex-shrink-0',
                  metrics.disputeRate > 15 ? 'text-red-500' : 'text-amber-500',
                )}
                aria-hidden="true"
              />
              <span>Dispute rate</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {formatDisputeRate(metrics.disputeRate)}
            </p>
          </div>

          <div className="rounded-lg bg-white border border-gray-100 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Clock className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" aria-hidden="true" />
              <span>Avg confirmation time</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {formatConfirmationDuration(metrics.avgConfirmationTimeMs)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
