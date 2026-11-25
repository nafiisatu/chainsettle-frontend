'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { copyToClipboard, formatDate, shortAddress } from '@/lib/utils';
import { env } from '@/lib/env';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { useAddressBook } from '@/lib/hooks/use-address-book-store';
import { StellarLink } from '@/components/StellarLink';
import { FormattedDate } from '@/components/FormattedDate';
import type { Shipment } from '@/types';

const STELLAR_NETWORK =
  env.stellarNetwork === 'mainnet' ? 'public' : 'testnet';

export function ShipmentMeta({ shipment }: { shipment: Shipment }) {
  const { address } = useAuthStore();
  const { getLabel } = useAddressBook(address);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const rows = [
    { label: 'Buyer', value: shipment.buyerAddress, type: 'account' as const, isCounterparty: true },
    { label: 'Supplier', value: shipment.supplierAddress, type: 'account' as const, isCounterparty: true },
    { label: 'Logistics', value: shipment.logisticsAddress, type: 'account' as const, isCounterparty: true },
    { label: 'Arbiter', value: shipment.arbiterAddress, type: 'account' as const, isCounterparty: true },
    { label: 'USDC contract', value: shipment.tokenAddress, type: 'account' as const, isCounterparty: false },
    { label: 'Created', value: null, display: formatDate(shipment.createdAt), isCounterparty: false },
    { label: 'Tx hash', value: shipment.txHash, type: 'tx' as const, isCounterparty: false },
  ];

  const handleCopy = async (key: string, value: string) => {
    await copyToClipboard(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Details</h2>
      <div className="space-y-2.5">
        {rows.map(({ label, value, display, type, isCounterparty }) => {
          const addressBookLabel = value && isCounterparty ? getLabel(value) : null;
          return (
            <div key={label} className="flex items-center justify-between text-xs gap-3">
              <span className="text-gray-400 w-32 flex-shrink-0">{label}</span>
              {value ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  {isCounterparty ? (
                    <>
                      <Link
                        href={`/dashboard/counterparties/${encodeURIComponent(value)}`}
                        className="font-mono text-brand-600 hover:text-brand-800 hover:underline truncate"
                        title={`View history with ${addressBookLabel || value}`}
                      >
                        {addressBookLabel ? `${addressBookLabel} (${shortAddress(value, 4)})` : shortAddress(value, 6)}
                      </Link>
                      <a
                        href={`https://stellar.expert/explorer/${STELLAR_NETWORK}/account/${value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${label.toLowerCase()} on Stellar Expert (opens in new tab)`}
                        title="View on Stellar Expert"
                        className="text-gray-300 hover:text-blue-600 transition-colors flex-shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </>
                  ) : (
                    <StellarLink
                      value={value}
                      type={type === 'tx' ? 'tx' : 'account'}
                      className="font-mono text-blue-600 hover:text-blue-800 truncate"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => void handleCopy(label, value)}
                    aria-label={`Copy ${label.toLowerCase()} to clipboard`}
                    className="text-gray-300 hover:text-gray-600 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                  >
                    {copiedKey === label ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ) : (
                <span className="text-gray-700">{display ?? '—'}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
