import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMentionReplacement,
  extractMentions,
  filterMentionOptions,
  getMentionQueryAtCursor,
  getShipmentMentionOptions,
  isCommentEdited,
  splitCommentContentWithMentions,
} from './comments.ts';

describe('comments utilities', () => {
  describe('extractMentions', () => {
    it('extracts canonical mention roles in order without duplicates', () => {
      const mentions = extractMentions(
        'Hey @supplier and @LOGISTICS, please check with @buyer and @supplier again.',
      );
      assert.deepEqual(mentions, ['supplier', 'logistics', 'buyer']);
    });

    it('ignores unsupported handles and email addresses', () => {
      const mentions = extractMentions(
        'Email user@example.com or ping @unknown and @arbiter.',
      );
      assert.deepEqual(mentions, ['arbiter']);
    });

    it('handles mentions at start of string or after parenthesis', () => {
      assert.deepEqual(extractMentions('@buyer (@arbiter) ready'), ['buyer', 'arbiter']);
    });
  });

  describe('getMentionQueryAtCursor', () => {
    it('detects active @ query at start or after whitespace', () => {
      assert.deepEqual(getMentionQueryAtCursor('@sup', 4), {
        query: 'sup',
        startIndex: 0,
      });
      assert.deepEqual(getMentionQueryAtCursor('Please check @', 14), {
        query: '',
        startIndex: 13,
      });
      assert.deepEqual(getMentionQueryAtCursor('Hello @Log', 10), {
        query: 'log',
        startIndex: 6,
      });
    });

    it('returns null when cursor is not inside a mention token', () => {
      assert.equal(getMentionQueryAtCursor('test@buyer', 10), null);
      assert.equal(getMentionQueryAtCursor('@buyer done', 11), null);
      assert.equal(getMentionQueryAtCursor('plain text', 5), null);
    });
  });

  describe('applyMentionReplacement', () => {
    it('replaces partial @query with full @role and trailing space', () => {
      const result = applyMentionReplacement('Ping @sup please', 5, 9, 'supplier');
      assert.equal(result.nextContent, 'Ping @supplier  please');
      assert.equal(result.nextCursorPos, 15);
    });
  });

  describe('filterMentionOptions', () => {
    const shipment = {
      buyerAddress: 'GBUYER',
      supplierAddress: 'GSUPPLIER',
      logisticsAddress: 'GLOGISTICS',
      arbiterAddress: 'GARBITER',
    };
    const options = getShipmentMentionOptions(shipment);

    it('returns all 4 roles for empty query', () => {
      assert.equal(filterMentionOptions(options, '').length, 4);
    });

    it('filters by prefix', () => {
      const matched = filterMentionOptions(options, 'ar');
      assert.deepEqual(
        matched.map((o) => o.role),
        ['arbiter'],
      );
    });
  });

  describe('splitCommentContentWithMentions', () => {
    it('splits content into text and mention segments', () => {
      const segments = splitCommentContentWithMentions('Hi @buyer, @arbiter check this');
      assert.deepEqual(segments, [
        { text: 'Hi ' },
        { text: '@buyer', mention: 'buyer' },
        { text: ', ' },
        { text: '@arbiter', mention: 'arbiter' },
        { text: ' check this' },
      ]);
    });
  });

  describe('isCommentEdited', () => {
    it('detects edited flag, editedAt, or updatedAt > createdAt + 1s', () => {
      assert.equal(
        isCommentEdited({
          edited: true,
          createdAt: '2026-01-01T00:00:00.000Z',
        }),
        true,
      );
      assert.equal(
        isCommentEdited({
          editedAt: '2026-01-01T00:05:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
        }),
        true,
      );
      assert.equal(
        isCommentEdited({
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:02:00.000Z',
        }),
        true,
      );
      assert.equal(
        isCommentEdited({
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.500Z',
        }),
        false,
      );
    });
  });
});
