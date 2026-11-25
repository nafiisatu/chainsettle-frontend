'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2, Search, ShieldCheck, Users } from 'lucide-react';
import { counterpartiesApi, shipmentsApi } from '@/lib/api/services';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { isValidStellarAddress, normalizeAddress } from '@/lib/stellar/address';
import {
  computeSupplierMetrics,
  formatConfirmationDuration,
  formatDisputeRate,
} from '@/lib/counterparty-metrics';
import { SupplierMetricsCard } from '@/components/counterparties/SupplierMetricsCard';
import { FormattedDate } from '@/components/FormattedDate';
import { EmptyState } from '@/components/EmptyState';
import { StellarLink } from '@/components/StellarLink';
import { shipmentStatusBadge, shortAddress, stroopsToUsdc } from '@/lib/utils';
import type { Shipment } from '@/types';

function CounterpartiesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address: currentUserAddress } = useAuthStore();

  const paramAddress = normalizeAddress(searchParams?.get('address') ?? '');
  const [queryInput, setQueryInput] = useState(paramAddress);
  const [inputError, setInputError] = useState<string | null>(null);

  const [knownShipments, setKnownShipments] = useState<Shipment[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);

  const [supplierShipments, setSupplierShipments] = useState<Shipment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    setQueryInput(paramAddress);
  }, [paramAddress]);

  // Load current user's buyer shipments so they can browse known suppliers
  useEffect(() => {
    if (!currentUserAddress) return;
    let cancelled = false;
    setDirectoryLoading(true);
    shipmentsApi
      .list({ buyerAddress: currentUserAddress, limit: 100 })
      .then((res) => {
        if (!cancelled) setKnownShipments(res.data ?? []);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setDirectoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUserAddress]);

  const activeAddress = isValidStellarAddress(paramAddress) ? paramAddress : '';

  useEffect(() => {
    if (!activeAddress) {
      setSupplierShipments([]);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    counterpartiesApi
      .listShipments(activeAddress, { role: 'supplier', page: 1, limit: 50 })
      .then((res) => {
        if (!cancelled) setSupplierShipments(res.data ?? []);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeAddress]);

  const knownSuppliers = useMemo(() => {
    const grouped = new Map<string, Shipment[]>();
    for (const shipment of knownShipments) {
      if (!shipment.supplierAddress) continue;
      const list = grouped.get(shipment.supplierAddress) ?? [];
      list.push(shipment);
      grouped.set(shipment.supplierAddress, list);
    }
    return Array.from(grouped.entries()).map(([supplierAddress, shipments]) => ({
      supplierAddress,
      metrics: computeSupplierMetrics(supplierAddress, shipments),
    }));
  }, [knownShipments]);

  const handleInspect = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeAddress(queryInput);
    if (!normalized) {
      setInputError(null);
      router.push('/dashboard/counterparties');
      return;
    }
    if (!isValidStellarAddress(normalized)) {
      setInputError('Enter a valid 56-character Stellar address starting with G.');
      return;
    }
    setInputError(null);
    router.push(`/dashboard/counterparties?address=${encodeURIComponent(normalized)}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Counterparties</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Evaluate supplier reliability before locking funds in escrow.
        </p>
      </div>

      {/* Supplier Lookup */}
      <form onSubmit={handleInspect} className="card p-5 space-y-3">
        <label htmlFor="counterparty-address-input" className="label">
          Inspect supplier Stellar address
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              aria-hidden="true"
            />
            <input
              id="counterparty-address-input"
              type="text"
              value={queryInput}
              onChange={(e) => {
                setQueryInput(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder="G..."
              spellCheck={false}
              autoComplete="off"
              className="input ps-9 font-mono text-xs"
            />
          </div>
          <button type="submit" className="btn-primary whitespace-nowrap">
            Inspect supplier
          </button>
        </div>
        {inputError && (
          <p className="text-xs text-red-600" role="alert">
            {inputError}
          </p>
        )}
      </form>

      {/* Selected Counterparty Metrics & Shipments */}
      {activeAddress && (
        <section className="space-y-4" aria-label="Selected supplier details">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Supplier address
              </p>
              <StellarLink
                value={activeAddress}
                type="account"
                className="font-mono text-sm text-brand-600 hover:underline break-all"
              />
            </div>
            <Link
              href={`/dashboard/shipments/create?supplier=${encodeURIComponent(activeAddress)}`}
              className="btn-secondary text-xs"
            >
              Create shipment
            </Link>
          </div>

          <SupplierMetricsCard address={activeAddress} />

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Recent shipments as supplier
            </h2>
            {historyLoading ? (
              <div className="flex items-center gap-2 text-xs text-gray-500 py-4" role="status">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Loading shipments…
              </div>
            ) : supplierShipments.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">
                No shipments found for this supplier address.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {supplierShipments.map((s) => (
                  <Link
                    key={s.id}
                    href={`/dashboard/shipments/${s.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50/70 rounded-lg px-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-gray-900">
                          {s.id}
                        </span>
                        <span className={shipmentStatusBadge(s.status)}>
                          {s.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Created <FormattedDate date={s.createdAt} />
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-900">
                        ${stroopsToUsdc(s.totalAmount)} USDC
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 rtl:rotate-180" aria-hidden="true" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Known Counterparties Directory */}
      <section className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-brand-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-gray-900">
            Your previous suppliers
          </h2>
        </div>

        {directoryLoading ? (
          <div className="flex items-center gap-2 text-xs text-gray-500 py-4" role="status">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Loading suppliers…
          </div>
        ) : knownSuppliers.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No suppliers yet"
            description="Once you create shipments as a buyer, your suppliers and their reliability metrics will appear here."
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {knownSuppliers.map(({ supplierAddress, metrics }) => (
              <div
                key={supplierAddress}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/counterparties?address=${encodeURIComponent(supplierAddress)}`}
                    className="font-mono text-xs font-medium text-brand-600 hover:underline"
                    title={supplierAddress}
                  >
                    {shortAddress(supplierAddress, 8)}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {metrics.totalShipments} shipment{metrics.totalShipments === 1 ? '' : 's'}
                  </p>
                </div>

                {!metrics.hasEnoughData ? (
                  <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    Not enough data
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <span>
                      <span className="text-gray-400">Completed: </span>
                      <strong className="text-gray-900">
                        {metrics.completedShipments}/{metrics.totalShipments}
                      </strong>
                    </span>
                    <span>
                      <span className="text-gray-400">Dispute rate: </span>
                      <strong className="text-gray-900">
                        {formatDisputeRate(metrics.disputeRate)}
                      </strong>
                    </span>
                    <span>
                      <span className="text-gray-400">Avg confirm: </span>
                      <strong className="text-gray-900">
                        {formatConfirmationDuration(metrics.avgConfirmationTimeMs)}
                      </strong>
                    </span>
                  </div>
                )}

                <Link
                  href={`/dashboard/counterparties?address=${encodeURIComponent(supplierAddress)}`}
                  className="btn-secondary text-xs self-start sm:self-auto"
                >
                  View metrics
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function CounterpartiesPage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <CounterpartiesPageContent />
    </Suspense>
  );
}
