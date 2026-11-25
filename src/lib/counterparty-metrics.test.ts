import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSupplierMetrics,
  formatConfirmationDuration,
  formatDisputeRate,
  MIN_SHIPMENTS_FOR_METRICS,
} from './counterparty-metrics.ts';
import type { Milestone, Shipment } from '../types/index.ts';

const SUPPLIER = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

function makeMilestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: 'm1',
    shipmentId: 'SHIP-1',
    milestoneIndex: 0,
    name: 'Delivered',
    paymentPercent: 100,
    proofHash: null,
    status: 'Confirmed',
    paymentReleased: '10000000',
    confirmedAt: '2026-06-01T12:00:00.000Z',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
    ...overrides,
  };
}

function makeShipment(id: string, overrides: Partial<Shipment> = {}): Shipment {
  return {
    id,
    buyerAddress: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    supplierAddress: SUPPLIER,
    logisticsAddress: 'GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    arbiterAddress: 'GDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
    tokenAddress: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    totalAmount: '10000000',
    releasedAmount: '10000000',
    status: 'Completed',
    txHash: 'abc',
    createdLedger: 1,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
    milestones: [makeMilestone({ shipmentId: id })],
    ...overrides,
  };
}

describe('Supplier counterparty metrics', () => {
  it('marks hasEnoughData false below 3 shipments', () => {
    const two = [makeShipment('SHIP-1'), makeShipment('SHIP-2')];
    const metrics = computeSupplierMetrics(SUPPLIER, two);
    assert.equal(MIN_SHIPMENTS_FOR_METRICS, 3);
    assert.equal(metrics.totalShipments, 2);
    assert.equal(metrics.hasEnoughData, false);
  });

  it('computes completed shipments, dispute rate, and avg confirmation time for >= 3 shipments', () => {
    const shipments = [
      makeShipment('SHIP-1', {
        status: 'Completed',
        milestones: [
          makeMilestone({
            createdAt: '2026-06-01T00:00:00.000Z',
            confirmedAt: '2026-06-01T06:00:00.000Z', // 6h
          }),
        ],
      }),
      makeShipment('SHIP-2', {
        status: 'Completed',
        milestones: [
          makeMilestone({
            status: 'Resolved',
            createdAt: '2026-06-02T00:00:00.000Z',
            confirmedAt: '2026-06-02T12:00:00.000Z', // 12h
          }),
        ],
      }),
      makeShipment('SHIP-3', {
        status: 'Active',
        milestones: [
          makeMilestone({
            status: 'Pending',
            confirmedAt: null,
          }),
        ],
      }),
      makeShipment('SHIP-4', {
        status: 'Completed',
        milestones: [
          makeMilestone({
            createdAt: '2026-06-04T00:00:00.000Z',
            confirmedAt: '2026-06-04T06:00:00.000Z', // 6h
          }),
        ],
      }),
    ];

    const metrics = computeSupplierMetrics(SUPPLIER, shipments);
    assert.equal(metrics.hasEnoughData, true);
    assert.equal(metrics.totalShipments, 4);
    assert.equal(metrics.completedShipments, 3);
    assert.equal(metrics.disputedShipments, 1);
    assert.equal(metrics.disputeRate, 25);
    assert.equal(metrics.confirmedMilestoneCount, 3);
    // (6h + 12h + 6h) / 3 = 8h = 28,800,000 ms
    assert.equal(metrics.avgConfirmationTimeMs, 8 * 60 * 60 * 1000);
    assert.equal(formatConfirmationDuration(metrics.avgConfirmationTimeMs), '8h');
    assert.equal(formatDisputeRate(metrics.disputeRate), '25%');
  });

  it('formats durations across minutes, hours, and days', () => {
    assert.equal(formatConfirmationDuration(null), '—');
    assert.equal(formatConfirmationDuration(20_000), '< 1m');
    assert.equal(formatConfirmationDuration(45 * 60_000), '45m');
    assert.equal(formatConfirmationDuration(90 * 60_000), '1h 30m');
    assert.equal(formatConfirmationDuration(28 * 60 * 60_000), '1d 4h');
  });
});
