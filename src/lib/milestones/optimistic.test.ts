import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOptimisticMilestonePatch,
  doesBackendAgree,
  reconcileShipmentWithPendingSyncs,
  rollbackMilestonePatch,
  type PendingMilestoneSync,
} from './optimistic.ts';
import type { Milestone, Shipment } from '../../types/index.ts';

function makeMilestone(index: number, overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: `m-${index}`,
    shipmentId: 'SHIP-1',
    milestoneIndex: index,
    name: `Milestone ${index + 1}`,
    paymentPercent: 50,
    proofHash: null,
    status: 'Pending',
    paymentReleased: null,
    confirmedAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeShipment(): Shipment {
  return {
    id: 'SHIP-1',
    buyerAddress: 'GBUYER',
    supplierAddress: 'GSUPPLIER',
    logisticsAddress: 'GLOGISTICS',
    arbiterAddress: 'GARBITER',
    tokenAddress: 'CTOKEN',
    totalAmount: '100000000',
    releasedAmount: '0',
    status: 'Active',
    txHash: 'tx1',
    createdLedger: 1,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    milestones: [
      makeMilestone(0, { status: 'ProofSubmitted', proofHash: 'ipfs://QmProof' }),
      makeMilestone(1, { status: 'Pending' }),
    ],
  };
}

describe('Optimistic milestone updates and sync reconciliation', () => {
  it('applies optimistic milestone patch immutably after waitForConfirmation', () => {
    const shipment = makeShipment();
    const updated = applyOptimisticMilestonePatch(shipment, 0, {
      status: 'Confirmed',
      confirmedAt: '2026-06-01T01:00:00.000Z',
      paymentReleased: '50000000',
    });

    assert.equal(shipment.milestones[0].status, 'ProofSubmitted');
    assert.equal(updated.milestones[0].status, 'Confirmed');
    assert.equal(updated.milestones[0].paymentReleased, '50000000');
    assert.equal(updated.milestones[1].status, 'Pending');
  });

  it('keeps milestone in Syncing state until backend agrees, then clears it', () => {
    const staleBackend = makeShipment();
    const pending: PendingMilestoneSync = {
      milestoneIndex: 0,
      expectedStatuses: ['Confirmed'],
      patch: {
        status: 'Confirmed',
        confirmedAt: '2026-06-01T01:00:00.000Z',
        paymentReleased: '50000000',
      },
      previousMilestone: staleBackend.milestones[0],
    };

    // Backend still reports ProofSubmitted: keep optimistic patch and Syncing entry
    const firstPass = reconcileShipmentWithPendingSyncs(staleBackend, { 0: pending });
    assert.equal(firstPass.shipment.milestones[0].status, 'Confirmed');
    assert.ok(0 in firstPass.remainingSyncs);

    // Backend catches up and reports Confirmed: clear Syncing entry
    const syncedBackend: Shipment = {
      ...staleBackend,
      milestones: [
        { ...staleBackend.milestones[0], status: 'Confirmed', paymentReleased: '50000000' },
        staleBackend.milestones[1],
      ],
    };
    const secondPass = reconcileShipmentWithPendingSyncs(syncedBackend, firstPass.remainingSyncs);
    assert.equal(secondPass.shipment.milestones[0].status, 'Confirmed');
    assert.deepEqual(secondPass.remainingSyncs, {});
  });

  it('checks proofHash equality when verifying submitProof sync', () => {
    const pending: PendingMilestoneSync = {
      milestoneIndex: 1,
      expectedStatuses: ['ProofSubmitted'],
      patch: { status: 'ProofSubmitted', proofHash: 'ipfs://QmNewProof' },
      previousMilestone: makeMilestone(1),
    };

    assert.equal(
      doesBackendAgree(makeMilestone(1, { status: 'ProofSubmitted', proofHash: null }), pending),
      false,
    );
    assert.equal(
      doesBackendAgree(
        makeMilestone(1, { status: 'ProofSubmitted', proofHash: 'ipfs://QmNewProof' }),
        pending,
      ),
      true,
    );
  });

  it('rolls back to the pre-transaction milestone snapshot when a transaction fails', () => {
    const original = makeShipment();
    const snapshot = { ...original.milestones[0] };
    const optimistic = applyOptimisticMilestonePatch(original, 0, {
      status: 'Disputed',
    });
    assert.equal(optimistic.milestones[0].status, 'Disputed');

    const rolledBack = rollbackMilestonePatch(optimistic, snapshot);
    assert.equal(rolledBack.milestones[0].status, 'ProofSubmitted');
    assert.equal(rolledBack.milestones[0].proofHash, 'ipfs://QmProof');
  });
});
