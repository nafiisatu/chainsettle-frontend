/**
 * lib/hooks/use-archived-shipments-store.ts
 *
 * Zustand store for archiving completed/cancelled shipments locally per wallet.
 * Persisted to localStorage and scoped per connected Stellar address.
 */

import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ShipmentStatus } from '@/types';

export function isArchivableStatus(status: ShipmentStatus): boolean {
  return status === 'Completed' || status === 'Cancelled';
}

interface ArchivedShipmentsState {
  archivedByOwner: Record<string, string[]>;
  archiveShipment: (owner: string, shipmentId: string) => void;
  unarchiveShipment: (owner: string, shipmentId: string) => void;
  archiveMany: (owner: string, shipmentIds: string[]) => void;
  unarchiveMany: (owner: string, shipmentIds: string[]) => void;
}

export const useArchivedShipmentsStore = create<ArchivedShipmentsState>()(
  persist(
    (set) => ({
      archivedByOwner: {},

      archiveShipment: (owner, shipmentId) => {
        if (!owner || !shipmentId) return;
        set((state) => {
          const existing = state.archivedByOwner[owner] ?? [];
          if (existing.includes(shipmentId)) return state;
          return {
            archivedByOwner: {
              ...state.archivedByOwner,
              [owner]: [...existing, shipmentId],
            },
          };
        });
      },

      unarchiveShipment: (owner, shipmentId) => {
        if (!owner || !shipmentId) return;
        set((state) => {
          const existing = state.archivedByOwner[owner] ?? [];
          if (!existing.includes(shipmentId)) return state;
          return {
            archivedByOwner: {
              ...state.archivedByOwner,
              [owner]: existing.filter((id) => id !== shipmentId),
            },
          };
        });
      },

      archiveMany: (owner, shipmentIds) => {
        if (!owner || shipmentIds.length === 0) return;
        set((state) => {
          const existing = state.archivedByOwner[owner] ?? [];
          const next = Array.from(new Set([...existing, ...shipmentIds]));
          return {
            archivedByOwner: {
              ...state.archivedByOwner,
              [owner]: next,
            },
          };
        });
      },

      unarchiveMany: (owner, shipmentIds) => {
        if (!owner || shipmentIds.length === 0) return;
        const toRemove = new Set(shipmentIds);
        set((state) => {
          const existing = state.archivedByOwner[owner] ?? [];
          return {
            archivedByOwner: {
              ...state.archivedByOwner,
              [owner]: existing.filter((id) => !toRemove.has(id)),
            },
          };
        });
      },
    }),
    {
      name: 'chainsetttle_archived_shipments',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ archivedByOwner: state.archivedByOwner }),
      skipHydration: true,
    },
  ),
);

const EMPTY: string[] = [];

export function useArchivedShipments(owner: string | null) {
  useEffect(() => {
    if (!useArchivedShipmentsStore.persist.hasHydrated()) {
      void useArchivedShipmentsStore.persist.rehydrate();
    }
  }, []);

  const archivedIds = useArchivedShipmentsStore((state) =>
    owner ? state.archivedByOwner[owner] ?? EMPTY : EMPTY,
  );
  const archiveShipment = useArchivedShipmentsStore((state) => state.archiveShipment);
  const unarchiveShipment = useArchivedShipmentsStore((state) => state.unarchiveShipment);
  const archiveMany = useArchivedShipmentsStore((state) => state.archiveMany);
  const unarchiveMany = useArchivedShipmentsStore((state) => state.unarchiveMany);

  const archivedSet = useMemo(() => new Set(archivedIds), [archivedIds]);

  return {
    archivedIds,
    archivedSet,
    isArchived: (id: string) => archivedSet.has(id),
    archive: (id: string) => {
      if (owner) archiveShipment(owner, id);
    },
    unarchive: (id: string) => {
      if (owner) unarchiveShipment(owner, id);
    },
    archiveMany: (ids: string[]) => {
      if (owner) archiveMany(owner, ids);
    },
    unarchiveMany: (ids: string[]) => {
      if (owner) unarchiveMany(owner, ids);
    },
  };
}
