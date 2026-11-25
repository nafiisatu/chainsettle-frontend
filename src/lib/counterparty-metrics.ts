import type { Shipment } from '@/types';

export const MIN_SHIPMENTS_FOR_METRICS = 3;
export const MINIMUM_SHIPMENTS_FOR_METRICS = MIN_SHIPMENTS_FOR_METRICS;

export interface SupplierMetrics {
  supplierAddress: string;
  totalShipments: number;
  completedShipments: number;
  disputedShipments: number;
  /** Percentage from 0 to 100 */
  disputeRate: number;
  /** Average milestone confirmation duration in milliseconds, or null if no confirmed milestones */
  avgConfirmationTimeMs: number | null;
  confirmedMilestoneCount: number;
  /** True when totalShipments >= MINIMUM_SHIPMENTS_FOR_METRICS (3) */
  hasEnoughData: boolean;
}

function isDisputedShipment(shipment: Shipment): boolean {
  const hasDisputedMilestone = (shipment.milestones ?? []).some(
    (m) => m.status === 'Disputed' || m.status === 'Resolved',
  );
  if (hasDisputedMilestone) return true;

  return (shipment.events ?? []).some((e) => /disput/i.test(e.eventName));
}

/**
 * Compute supplier reliability metrics from backend shipment records.
 * Below 3 shipments, `hasEnoughData` is false so callers display "Not enough data".
 */
export function computeSupplierMetrics(
  supplierAddress: string,
  shipments: Shipment[],
): SupplierMetrics {
  const normalizedTarget = supplierAddress.trim().toUpperCase();
  const relevant = normalizedTarget
    ? shipments.filter(
        (s) => s.supplierAddress.trim().toUpperCase() === normalizedTarget,
      )
    : shipments;

  const totalShipments = relevant.length;
  const completedShipments = relevant.filter((s) => s.status === 'Completed').length;
  const disputedShipments = relevant.filter(isDisputedShipment).length;
  const disputeRate =
    totalShipments > 0 ? (disputedShipments / totalShipments) * 100 : 0;

  let totalConfirmationMs = 0;
  let confirmedMilestoneCount = 0;

  for (const shipment of relevant) {
    for (const milestone of shipment.milestones ?? []) {
      if (!milestone.confirmedAt) continue;
      const confirmedAtMs = new Date(milestone.confirmedAt).getTime();
      const startedAtMs = new Date(milestone.createdAt || shipment.createdAt).getTime();
      if (Number.isNaN(confirmedAtMs) || Number.isNaN(startedAtMs)) continue;
      if (confirmedAtMs < startedAtMs) continue;

      totalConfirmationMs += confirmedAtMs - startedAtMs;
      confirmedMilestoneCount += 1;
    }
  }

  const avgConfirmationTimeMs =
    confirmedMilestoneCount > 0
      ? Math.round(totalConfirmationMs / confirmedMilestoneCount)
      : null;

  return {
    supplierAddress: normalizedTarget || supplierAddress,
    totalShipments,
    completedShipments,
    disputedShipments,
    disputeRate,
    avgConfirmationTimeMs,
    confirmedMilestoneCount,
    hasEnoughData: totalShipments >= MINIMUM_SHIPMENTS_FOR_METRICS,
  };
}

/** Format a duration in milliseconds to a compact readable string (e.g. "1d 4h", "45m") */
export function formatConfirmationDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 60_000) return '< 1m';

  const totalMinutes = Math.round(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

/** Format a dispute rate percentage cleanly */
export function formatDisputeRate(rate: number): string {
  if (!Number.isFinite(rate)) return '0%';
  return `${Number.isInteger(rate) ? rate : rate.toFixed(1)}%`;
}
