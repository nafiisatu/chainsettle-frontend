/**
 * lib/hooks/use-address-book-store.ts
 *
 * Zustand store for per-wallet counterparty address book labels.
 * Persisted to localStorage and scoped by the connected Stellar wallet address.
 */

import { useEffect } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const ADDRESS_BOOK_LABEL_MAX_LENGTH = 60;

export function normalizeAddressBookLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').slice(0, ADDRESS_BOOK_LABEL_MAX_LENGTH);
}

interface AddressBookState {
  labelsByOwner: Record<string, Record<string, string>>;
  setLabel: (owner: string, targetAddress: string, label: string) => void;
  removeLabel: (owner: string, targetAddress: string) => void;
}

export const useAddressBookStore = create<AddressBookState>()(
  persist(
    (set) => ({
      labelsByOwner: {},

      setLabel: (owner, targetAddress, label) => {
        if (!owner || !targetAddress) return;
        const normalized = normalizeAddressBookLabel(label);
        set((state) => {
          const ownerMap = { ...(state.labelsByOwner[owner] ?? {}) };
          if (!normalized) {
            delete ownerMap[targetAddress];
          } else {
            ownerMap[targetAddress] = normalized;
          }
          return {
            labelsByOwner: {
              ...state.labelsByOwner,
              [owner]: ownerMap,
            },
          };
        });
      },

      removeLabel: (owner, targetAddress) => {
        if (!owner || !targetAddress) return;
        set((state) => {
          const ownerMap = { ...(state.labelsByOwner[owner] ?? {}) };
          if (!(targetAddress in ownerMap)) return state;
          delete ownerMap[targetAddress];
          return {
            labelsByOwner: {
              ...state.labelsByOwner,
              [owner]: ownerMap,
            },
          };
        });
      },
    }),
    {
      name: 'chainsetttle_address_book',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ labelsByOwner: state.labelsByOwner }),
      skipHydration: true,
    },
  ),
);

const EMPTY_LABELS: Record<string, string> = {};

export function useAddressBook(owner: string | null) {
  useEffect(() => {
    if (!useAddressBookStore.persist.hasHydrated()) {
      void useAddressBookStore.persist.rehydrate();
    }
  }, []);

  const labels = useAddressBookStore((state) =>
    owner ? state.labelsByOwner[owner] ?? EMPTY_LABELS : EMPTY_LABELS,
  );
  const setLabelAction = useAddressBookStore((state) => state.setLabel);
  const removeLabelAction = useAddressBookStore((state) => state.removeLabel);

  return {
    labels,
    getLabel: (targetAddress: string): string | null =>
      labels[targetAddress] ?? null,
    setLabel: (targetAddress: string, label: string) => {
      if (owner) setLabelAction(owner, targetAddress, label);
    },
    removeLabel: (targetAddress: string) => {
      if (owner) removeLabelAction(owner, targetAddress);
    },
  };
}
