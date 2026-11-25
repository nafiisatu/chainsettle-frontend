import type { Milestone, MilestoneStatus, Shipment } from '@/types';

export interface OptimisticMilestonePatch {
  status: MilestoneStatus;
  proofHash?: string | null;
  confirmedAt?: string | null;
  paymentReleased?: string | null;
}

export interface PendingMilestoneSync {
  milestoneIndex: number;
  expectedStatuses: MilestoneStatus[];
  patch: OptimisticMilestonePatch;
  previousMilestone: Milestone;
}

/**
 * Returns true once the backend milestone reflects the expected on-chain transition.
 */
export function doesBackendAgree(
  backendMilestone: Milestone | undefined,
  pending: PendingMilestoneSync,
): boolean {
  if (!backendMilestone) return false;
  if (!pending.expectedStatuses.includes(backendMilestone.status)) return false;
  if (
    pending.patch.proofHash !== undefined &&
    backendMilestone.proofHash !== pending.patch.proofHash
  ) {
    return false;
  }
  return true;
}

/** Apply an optimistic milestone patch to a Shipment immutably */
export function applyOptimisticMilestonePatch(
  shipment: Shipment,
  milestoneIndex: number,
  patch: OptimisticMilestonePatch,
): Shipment {
  return {
    ...shipment,
    milestones: shipment.milestones.map((m) =>
      m.milestoneIndex === milestoneIndex
        ? {
            ...m,
            status: patch.status,
            proofHash: patch.proofHash !== undefined ? patch.proofHash : m.proofHash,
            confirmedAt: patch.confirmedAt !== undefined ? patch.confirmedAt : m.confirmedAt,
            paymentReleased:
              patch.paymentReleased !== undefined ? patch.paymentReleased : m.paymentReleased,
          }
        : m,
    ),
  };
}

/** Roll back a milestone to its pre-transaction snapshot */
export function rollbackMilestonePatch(
  shipment: Shipment,
  previousMilestone: Milestone,
): Shipment {
  return {
    ...shipment,
    milestones: shipment.milestones.map((m) =>
      m.milestoneIndex === previousMilestone.milestoneIndex ? previousMilestone : m,
    ),
  };
}

/**
 * Reconcile fetched backend shipment state against pending optimistic syncs.
 * Clears entries once the backend agrees; preserves optimistic patches otherwise.
 */
export function reconcileShipmentWithPendingSyncs(
  backendShipment: Shipment,
  pendingSyncs: Record<number, PendingMilestoneSync>,
): {
  shipment: Shipment;
  remainingSyncs: Record<number, PendingMilestoneSync>;
} {
  const remainingSyncs: Record<number, PendingMilestoneSync> = {};
  let nextShipment = backendShipment;

  for (const [key, pending] of Object.entries(pendingSyncs)) {
    const index = Number(key);
    const backendMilestone = backendShipment.milestones.find(
      (m) => m.milestoneIndex === index,
    );
    if (!doesBackendAgree(backendMilestone, pending)) {
      remainingSyncs[index] = pending;
      nextShipment = applyOptimisticMilestonePatch(nextShipment, index, pending.patch);
    }
  }

  return { shipment: nextShipment, remainingSyncs };
}
