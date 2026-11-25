import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTRACT_ERROR_CODES,
  CONTRACT_ERROR_MESSAGES,
  ContractError,
  parseContractError,
} from './errors';

describe('parseContractError', () => {
  describe('contract error codes', () => {
    for (const [num, code] of Object.entries(CONTRACT_ERROR_CODES)) {
      it(`maps Error(Contract, #${num}) to ${code}`, () => {
        const raw = `HostError: Error(Contract, #${num})`;
        const err = parseContractError(new Error(raw));

        assert.ok(err instanceof ContractError);
        assert.equal(err.code, code);
        assert.equal(err.message, CONTRACT_ERROR_MESSAGES[code]);
        assert.equal(err.raw, raw);
      });
    }

    it('has a test for every mapped code', () => {
      assert.deepEqual(
        Object.keys(CONTRACT_ERROR_CODES).map(Number),
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
      );
    });

    it('prefers a message match over the code (token contract errors)', () => {
      const raw = 'HostError: Error(Contract, #10)\nbalance is not sufficient to spend';
      const err = parseContractError(new Error(raw));
      assert.equal(err.code, 'InsufficientBalance');
      assert.equal(err.raw, raw);
    });
  });

  describe('unknown errors', () => {
    it('falls back to Unknown for an unmapped contract code', () => {
      const raw = 'HostError: Error(Contract, #99)';
      const err = parseContractError(new Error(raw));
      assert.equal(err.code, 'Unknown');
      assert.equal(err.message, CONTRACT_ERROR_MESSAGES.Unknown);
      assert.equal(err.raw, raw);
    });

    it('falls back to Unknown for an unrecognised message', () => {
      const err = parseContractError(new Error('something odd happened'));
      assert.equal(err.code, 'Unknown');
      assert.equal(err.message, CONTRACT_ERROR_MESSAGES.Unknown);
      assert.equal(err.raw, 'something odd happened');
    });

    it('ignores an undecodable errorResult', () => {
      const err = parseContractError({ message: 'submit failed', errorResult: 'not-xdr' });
      assert.equal(err.code, 'Unknown');
      assert.equal(err.raw, 'submit failed');
    });

    it('ignores undecodable diagnostic events', () => {
      const err = parseContractError({ message: 'sim failed', events: ['garbage', 42] });
      assert.equal(err.code, 'Unknown');
      assert.equal(err.raw, 'sim failed');
    });
  });

  describe('panic messages', () => {
    const cases: Array<[string, string]> = [
      ['shipment already exists', 'ShipmentAlreadyExists'],
      ['Shipment not found', 'ShipmentNotFound'],
      ['caller is not authorized', 'NotAuthorized'],
      ['Invalid milestone index', 'InvalidMilestoneIndex'],
      ['milestone not in pending status', 'InvalidMilestoneStatus'],
      ['shipment is not active', 'ShipmentNotActive'],
      ['percentages must sum to 100', 'InvalidPercentages'],
      ['amount must be greater than zero', 'InvalidAmount'],
      ['dispute already open', 'DisputeAlreadyOpen'],
    ];

    for (const [message, code] of cases) {
      it(`maps "${message}" to ${code}`, () => {
        const raw = `HostError: Error(WasmVm, InvalidAction)\n${message}`;
        assert.equal(parseContractError(new Error(raw)).code, code);
      });
    }
  });

  describe('Freighter rejection', () => {
    const messages = [
      'Freighter: The user rejected this request.',
      'User declined access',
      'Request was denied',
    ];

    for (const message of messages) {
      it(`maps "${message}" to UserRejected`, () => {
        const err = parseContractError(new Error(message));
        assert.equal(err.code, 'UserRejected');
        assert.equal(err.message, CONTRACT_ERROR_MESSAGES.UserRejected);
        assert.equal(err.raw, message);
      });
    }

    it('takes precedence over a contract code in the same text', () => {
      const err = parseContractError('User rejected the request: Error(Contract, #2)');
      assert.equal(err.code, 'UserRejected');
    });
  });

  describe('non-Error inputs', () => {
    it('accepts a plain string', () => {
      const err = parseContractError('HostError: Error(Contract, #7)');
      assert.equal(err.code, 'InvalidPercentages');
      assert.equal(err.raw, 'HostError: Error(Contract, #7)');
    });

    it('accepts an object with a message and txHash', () => {
      const err = parseContractError({ message: 'Error(Contract, #2)', txHash: 'abc123' });
      assert.equal(err.code, 'ShipmentNotFound');
      assert.equal(err.raw, 'Error(Contract, #2)');
      assert.equal(err.txHash, 'abc123');
    });

    it('serialises an object without a message', () => {
      const err = parseContractError({ status: 500 });
      assert.equal(err.code, 'Unknown');
      assert.equal(err.raw, '{"status":500}');
    });

    it('handles null', () => {
      const err = parseContractError(null);
      assert.equal(err.code, 'Unknown');
      assert.equal(err.raw, 'null');
    });

    it('handles undefined', () => {
      const err = parseContractError(undefined);
      assert.equal(err.code, 'Unknown');
      assert.equal(typeof err.raw, 'string');
    });

    it('handles numbers', () => {
      const err = parseContractError(42);
      assert.equal(err.code, 'Unknown');
      assert.equal(err.raw, '42');
    });

    it('handles circular objects without throwing', () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      const err = parseContractError(circular);
      assert.equal(err.code, 'Unknown');
      assert.equal(err.raw, '[object Object]');
    });

    it('returns an existing ContractError unchanged', () => {
      const original = new ContractError('InvalidAmount', 'raw text', 'hash');
      assert.equal(parseContractError(original), original);
    });
  });

  describe('ContractError', () => {
    it('exposes code, message, raw and txHash', () => {
      const err = new ContractError('NotAuthorized', 'raw text', 'hash');
      assert.ok(err instanceof Error);
      assert.equal(err.name, 'ContractError');
      assert.equal(err.code, 'NotAuthorized');
      assert.equal(err.message, CONTRACT_ERROR_MESSAGES.NotAuthorized);
      assert.equal(err.raw, 'raw text');
      assert.equal(err.txHash, 'hash');
    });

    it('leaves txHash undefined when not provided', () => {
      const err = parseContractError(new Error('Error(Contract, #1)'));
      assert.equal(err.txHash, undefined);
    });
  });
});
