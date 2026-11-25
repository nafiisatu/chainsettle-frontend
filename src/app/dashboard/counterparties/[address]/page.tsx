'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Package,
  Pencil,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { shipmentsApi } from '@/lib/api/services';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import {
  ADDRESS_BOOK_LABEL_MAX_LENGTH,
  useAddressBook,
} from '@/lib/hooks/use-address-book-store';
import { useArchivedShipments } from '@/lib/hooks/use-archived-shipments-store';
import { isValidStellarAddress } from '@/lib/stellar/address';
import { env } from '@/lib/env';
import {
  copyToClipboard,
  deriveUserRole,
  formatDate,
  roleBadge,
  shipmentProgress,
  shipmentStatusBadge,
  shortAddress,
  stroopsToUsdc,
  timeAgo,
} from '@/lib/utils';
import { EmptyState } from '@/components/EmptyState';
import type { Shipment, ShipmentStatus } from '@/types';

const MAX_PAGES_TO_FETCH = 5;

function shipmentIncludesAddress(shipment: Shipment, addr: string): boolean {
  return (
    shipment.buyerAddress === addr ||
    shipment.supplierAddress === addr ||
    shipment.logisticsAddress === addr ||
    shipment.arbiterAddress === addr
  );
}

export default function CounterpartyHistoryPage() {
  const params = useParams<{ address: string }>();
  const rawAddress = params?.address ?? '';
  const counterpartyAddress = useMemo(() => {
    try {
      return decodeURIComponent(rawAddress).trim();
    } catch {
      return rawAddress.trim();
    }
  }, [rawAddress]);

  const { address: myAddress } = useAuthStore();
  const { getLabel, setLabel, removeLabel } = useAddressBook(myAddress);
  const { isArchived } = useArchivedShipments(myAddress);

  const savedLabel = getLabel(counterpartyAddress);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [copied, setCopied] = useState(false);

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | ''>('');

  useEffect(() => {
    setLabelInput(savedLabel ?? '');
  }, [savedLabel]);

  useEffect(() => {
    if (!counterpartyAddress) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadAllShared = async () => {
      try {
        const collected: Shipment[] = [];
        let page = 1;
        let totalPages = 1;

        do {
          const res = await shipmentsApi.list({ page, limit: 100 });
          collected.push(...(res.data ?? []));
          totalPages = res.totalPages ?? res.meta?.totalPages ?? 1;
          page += 1;
        } while (page <= totalPages && page <= MAX_PAGES_TO_FETCH);

        if (cancelled) return;

        const seen = new Set<string>();
        const shared = collected.filter((s) => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          if (!shipmentIncludesAddress(s, counterpartyAddress)) return false;
          if (myAddress && myAddress !== counterpartyAddress) {
            return shipmentIncludesAddress(s, myAddress);
          }
          return true;
        });

        shared.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setShipments(shared);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError('Unable to load shared shipments for this counterparty.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadAllShared();
    return () => {
      cancelled = true;
    };
  }, [counterpartyAddress, myAddress]);

  const handleCopyAddress = async () => {
    if (!counterpartyAddress) return;
    await copyToClipboard(counterpartyAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterpartyAddress) return;
    setLabel(counterpartyAddress, labelInput);
    setEditingLabel(false);
  };

  const handleRemoveLabel = () => {
    if (!counterpartyAddress) return;
    removeLabel(counterpartyAddress);
    setLabelInput('');
    setEditingLabel(false);
  };

  const summary = useMemo(() => {
    let totalEscrowed = 0n;
    let totalReleased = 0n;
    let activeCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    const roleCounts: Record<string, number> = {};

    for (const s of shipments) {
      try {
        totalEscrowed += BigInt(s.totalAmount ?? '0');
      } catch {
        /* ignore invalid amount */
      }
      try {
        totalReleased += BigInt(s.releasedAmount ?? '0');
      } catch {
        /* ignore invalid amount */
      }
      if (s.status === 'Active') activeCount += 1;
      else if (s.status === 'Completed') completedCount += 1;
      else if (s.status === 'Cancelled') cancelledCount += 1;

      const cpRole = deriveUserRole(counterpartyAddress, s);
      if (cpRole !== 'observer') {
        roleCounts[cpRole] = (roleCounts[cpRole] ?? 0) + 1;
      }
    }

    return {
      totalCount: shipments.length,
      activeCount,
      completedCount,
      cancelledCount,
      totalEscrowed,
      totalReleased,
      roleCounts,
    };
  }, [shipments, counterpartyAddress]);

  const visibleShipments = useMemo(
    () =>
      statusFilter
        ? shipments.filter((s) => s.status === statusFilter)
        : shipments,
    [shipments, statusFilter],
  );

  const explorerNetwork =
    env.stellarNetwork === 'mainnet' ? 'public' : 'testnet';
  const stellarExpertUrl = `https://stellar.expert/explorer/${explorerNetwork}/account/${encodeURIComponent(counterpartyAddress)}`;
  const validAddress = isValidStellarAddress(counterpartyAddress);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/shipments"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All shipments
        </Link>

        <div className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="text-xl font-semibold text-gray-900">
                  {savedLabel || 'Counterparty'}
                </h1>
                {savedLabel && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    <Tag className="w-3 h-3" aria-hidden="true" />
                    Address book label
                  </span>
                )}
                {myAddress && myAddress === counterpartyAddress && (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    Your wallet
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="font-mono text-xs text-gray-600 break-all"
                  title={counterpartyAddress}
                >
                  {counterpartyAddress}
                </span>
                {!validAddress && counterpartyAddress && (
                  <span className="text-xs text-amber-600">
                    (Unrecognized Stellar address format)
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAddress}
                className="btn-secondary text-xs"
                aria-label="Copy counterparty address"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    Copy address
                  </>
                )}
              </button>

              <a
                href={stellarExpertUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs"
                aria-label="View counterparty on Stellar Expert (opens in new tab)"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                Stellar Expert
              </a>

              {myAddress && !editingLabel && (
                <button
                  type="button"
                  onClick={() => {
                    setLabelInput(savedLabel ?? '');
                    setEditingLabel(true);
                  }}
                  className="btn-secondary text-xs"
                >
                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                  {savedLabel ? 'Edit label' : 'Add label'}
                </button>
              )}
            </div>
          </div>

          {editingLabel && (
            <form
              onSubmit={handleSaveLabel}
              className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2"
            >
              <label htmlFor="address-book-label" className="sr-only">
                Address book label
              </label>
              <input
                id="address-book-label"
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                maxLength={ADDRESS_BOOK_LABEL_MAX_LENGTH}
                placeholder="e.g. Acme Logistics Ltd."
                className="input max-w-xs text-xs py-2"
                autoFocus
              />
              <button type="submit" className="btn-primary text-xs py-2">
                Save label
              </button>
              <button
                type="button"
                onClick={() => setEditingLabel(false)}
                className="btn-secondary text-xs py-2"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                Cancel
              </button>
              {savedLabel && (
                <button
                  type="button"
                  onClick={handleRemoveLabel}
                  className="btn-ghost text-xs py-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Remove
                </button>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500">Shared shipments</p>
          <p className="mt-1.5 text-2xl font-semibold text-gray-900">
            {loading ? '...' : summary.totalCount}
          </p>
          {!loading && summary.totalCount > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              {summary.activeCount} active · {summary.completedCount} completed · {summary.cancelledCount} cancelled
            </p>
          )}
        </div>

        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500">Total escrowed</p>
          <p className="mt-1.5 text-2xl font-semibold text-gray-900">
            {loading ? '...' : `${stroopsToUsdc(summary.totalEscrowed)} USDC`}
          </p>
          <p className="mt-1 text-xs text-gray-400">Across shared shipments</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500">Total released</p>
          <p className="mt-1.5 text-2xl font-semibold text-gray-900">
            {loading ? '...' : `${stroopsToUsdc(summary.totalReleased)} USDC`}
          </p>
          <p className="mt-1 text-xs text-gray-400">Settled on-chain</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500">Counterparty roles</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {loading ? (
              <span className="text-sm text-gray-400">...</span>
            ) : Object.keys(summary.roleCounts).length === 0 ? (
              <span className="text-sm text-gray-400">—</span>
            ) : (
              Object.entries(summary.roleCounts).map(([roleKey, count]) => {
                const badge = roleBadge(roleKey);
                return (
                  <span
                    key={roleKey}
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badge.className}`}
                  >
                    {badge.label}: {count}
                  </span>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Shared shipments list */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">
            Shared shipments ({visibleShipments.length})
          </h2>

          <div className="flex items-center gap-2" role="group" aria-label="Filter shared shipments by status">
            {(['', 'Active', 'Completed', 'Cancelled'] as const).map((status) => (
              <button
                key={status || 'all'}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {status || 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="card p-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" aria-hidden="true" />
          </div>
        ) : error ? (
          <div className="card p-6 text-sm text-red-600" role="alert">
            {error}
          </div>
        ) : visibleShipments.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No shared shipments found"
            description={
              statusFilter
                ? `No ${statusFilter.toLowerCase()} shipments shared with ${savedLabel || shortAddress(counterpartyAddress)}.`
                : `You do not have any shared shipments with ${savedLabel || shortAddress(counterpartyAddress)} yet.`
            }
          />
        ) : (
          <div className="space-y-3">
            {visibleShipments.map((shipment) => {
              const cpRole = deriveUserRole(counterpartyAddress, shipment);
              const cpRoleBadge = roleBadge(cpRole);
              const progress = shipmentProgress(shipment.milestones);
              const archived = isArchived(shipment.id);

              return (
                <Link
                  key={shipment.id}
                  href={`/dashboard/shipments/${shipment.id}`}
                  className="card block p-5 hover:shadow-md hover:border-gray-200 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900 font-mono">
                          {shipment.id}
                        </span>
                        <span className={shipmentStatusBadge(shipment.status)}>
                          {shipment.status}
                        </span>
                        {cpRole !== 'observer' && (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cpRoleBadge.className}`}
                          >
                            {cpRoleBadge.label}
                          </span>
                        )}
                        {archived && (
                          <span className="badge bg-gray-100 text-gray-600">
                            Archived
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400" title={formatDate(shipment.createdAt)}>
                        Created {timeAgo(shipment.createdAt)}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900">
                        ${stroopsToUsdc(shipment.totalAmount)}
                      </p>
                      <p className="text-xs text-gray-400">
                        ${stroopsToUsdc(shipment.releasedAmount)} released
                      </p>
                    </div>
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                    <div
                      className="bg-brand-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {
                        shipment.milestones.filter(
                          (m) => m.status === 'Confirmed' || m.status === 'Resolved',
                        ).length
                      }
                      /{shipment.milestones.length} milestones done
                    </p>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-600 transition-colors" aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
