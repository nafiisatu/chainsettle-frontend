import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BUILT_IN_TEMPLATES, isSavableSplit, milestoneTotal } from './templates';

const split = (...percents: number[]) =>
  percents.map((paymentPercent, i) => ({ name: `Milestone ${i + 1}`, paymentPercent }));

describe('Template helpers', () => {
  describe('milestoneTotal', () => {
    it('returns 0 for no milestones', () => {
      assert.equal(milestoneTotal([]), 0);
    });

    it('sums milestone percentages', () => {
      assert.equal(milestoneTotal(split(25, 50, 25)), 100);
      assert.equal(milestoneTotal(split(10, 20)), 30);
      assert.equal(milestoneTotal(split(60, 70)), 130);
    });

    it('sums decimal percentages', () => {
      assert.equal(milestoneTotal(split(12.5, 37.5, 50)), 100);
    });
  });

  describe('isSavableSplit', () => {
    it('accepts a split summing to 100', () => {
      assert.equal(isSavableSplit(split(100)), true);
      assert.equal(isSavableSplit(split(25, 50, 25)), true);
    });

    it('rejects a split under 100', () => {
      assert.equal(isSavableSplit(split(25, 50)), false);
    });

    it('rejects a split over 100', () => {
      assert.equal(isSavableSplit(split(60, 50)), false);
    });

    it('rejects an empty split', () => {
      assert.equal(isSavableSplit([]), false);
    });

    it('accepts decimal percentages that sum exactly to 100', () => {
      assert.equal(isSavableSplit(split(12.5, 37.5, 50)), true);
    });

    it('rejects decimal percentages that do not sum to 100', () => {
      assert.equal(isSavableSplit(split(33.3, 33.3, 33.3)), false);
    });

    it('rejects zero or negative percentages even when the total is 100', () => {
      assert.equal(isSavableSplit(split(100, 0)), false);
      assert.equal(isSavableSplit(split(110, -10)), false);
    });

    it('rejects milestones without a name', () => {
      assert.equal(
        isSavableSplit([
          { name: 'Dispatched', paymentPercent: 50 },
          { name: '   ', paymentPercent: 50 },
        ]),
        false,
      );
    });
  });

  describe('BUILT_IN_TEMPLATES', () => {
    for (const template of BUILT_IN_TEMPLATES) {
      it(`"${template.name}" is a savable split`, () => {
        assert.equal(isSavableSplit(template.milestones), true);
        assert.equal(milestoneTotal(template.milestones), 100);
        assert.equal(template.builtIn, true);
      });
    }
  });
});
