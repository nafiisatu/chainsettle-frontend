'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookUser, Plus, Trash2 } from 'lucide-react';
import {
  ADDRESS_BOOK_LABEL_MAX_LENGTH,
  useAddressBook,
} from '@/lib/hooks/use-address-book-store';
import { isValidStellarAddress, normalizeAddress } from '@/lib/stellar/address';
import { shortAddress } from '@/lib/utils';

export function AddressBookManager({ owner }: { owner: string | null }) {
  const { labels, setLabel, removeLabel } = useAddressBook(owner);
  const [targetAddress, setTargetAddress] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const entries = Object.entries(labels).sort(([, a], [, b]) =>
    a.localeCompare(b),
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner) return;
    const addr = normalizeAddress(targetAddress);
    if (!isValidStellarAddress(addr)) {
      setError('Enter a valid Stellar public key (starts with G, 56 characters).');
      return;
    }
    if (!labelInput.trim()) {
      setError('Enter a label for this counterparty.');
      return;
    }
    setError(null);
    setLabel(addr, labelInput);
    setTargetAddress('');
    setLabelInput('');
  };

  return (
    <section className="card p-5 mt-6">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <BookUser className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Address book</h2>
          <p className="text-xs text-gray-500">
            Save local labels for counterparty Stellar addresses, scoped to this wallet.
          </p>
        </div>
      </div>

      {!owner ? (
        <p className="pt-4 text-xs text-gray-500">
          Connect a wallet to manage your address book labels.
        </p>
      ) : (
        <div className="pt-4 space-y-4">
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px_auto]">
            <input
              type="text"
              value={targetAddress}
              onChange={(e) => {
                setTargetAddress(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Counterparty Stellar address (G...)"
              aria-label="Counterparty Stellar address"
              className="input font-mono text-xs"
            />
            <input
              type="text"
              value={labelInput}
              onChange={(e) => {
                setLabelInput(e.target.value);
                if (error) setError(null);
              }}
              maxLength={ADDRESS_BOOK_LABEL_MAX_LENGTH}
              placeholder="Label (e.g. Acme Corp)"
              aria-label="Counterparty label"
              className="input text-xs"
            />
            <button type="submit" className="btn-primary text-xs whitespace-nowrap">
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Save
            </button>
          </form>

          {error && (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          )}

          {entries.length === 0 ? (
            <p className="text-xs text-gray-400">
              No address book labels saved yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
              {entries.map(([addr, label]) => (
                <li
                  key={addr}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/counterparties/${encodeURIComponent(addr)}`}
                      className="font-medium text-brand-600 hover:underline block truncate"
                    >
                      {label}
                    </Link>
                    <span className="font-mono text-[11px] text-gray-400">
                      {shortAddress(addr, 6)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLabel(addr)}
                    aria-label={`Remove label for ${label}`}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
