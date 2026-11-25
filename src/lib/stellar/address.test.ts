import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidStellarAddress, normalizeAddress, validateParties } from './address';

// Valid Ed25519 public keys (correct version byte and CRC16 checksum)
const BUYER = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
const SUPPLIER = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const LOGISTICS = 'GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H';
const ARBITER = 'GABAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEJXA';

describe('Stellar address utilities', () => {
  describe('normalizeAddress', () => {
    it('trims surrounding whitespace, tabs and newlines', () => {
      assert.equal(normalizeAddress(`  ${BUYER}  `), BUYER);
      assert.equal(normalizeAddress(`\n\t${BUYER}\r\n`), BUYER);
    });

    it('leaves an already clean address unchanged', () => {
      assert.equal(normalizeAddress(BUYER), BUYER);
    });

    it('does not change letter case', () => {
      assert.equal(normalizeAddress(BUYER.toLowerCase()), BUYER.toLowerCase());
    });
  });

  describe('isValidStellarAddress', () => {
    it('accepts valid G-addresses', () => {
      for (const address of [BUYER, SUPPLIER, LOGISTICS, ARBITER]) {
        assert.equal(isValidStellarAddress(address), true, address);
      }
    });

    it('accepts a valid address with surrounding whitespace', () => {
      assert.equal(isValidStellarAddress(`  ${BUYER}\n`), true);
    });

    it('rejects an address with a bad checksum', () => {
      const tampered = `${BUYER.slice(0, -1)}${BUYER.endsWith('A') ? 'B' : 'A'}`;
      assert.equal(isValidStellarAddress(tampered), false);
    });

    it('rejects addresses with the wrong length', () => {
      assert.equal(isValidStellarAddress(BUYER.slice(0, -1)), false);
      assert.equal(isValidStellarAddress(`${BUYER}A`), false);
    });

    it('rejects non-account prefixes', () => {
      // Secret seed (S...) and a random C-prefixed string
      assert.equal(isValidStellarAddress('SBK2VIYYSVG76E7VC3QHYARNFLY2EAQXDHRC7BMXBBGIFG74ARPRMNQM'), false);
      assert.equal(isValidStellarAddress(`C${BUYER.slice(1)}`), false);
    });

    it('rejects characters outside the base32 alphabet', () => {
      assert.equal(isValidStellarAddress(`${BUYER.slice(0, -1)}@`), false);
      assert.equal(isValidStellarAddress(`${BUYER.slice(0, -1)}0`), false);
    });

    it('rejects empty and whitespace-only values', () => {
      assert.equal(isValidStellarAddress(''), false);
      assert.equal(isValidStellarAddress('   '), false);
    });
  });

  describe('validateParties', () => {
    const parties = {
      buyer: BUYER,
      supplier: SUPPLIER,
      logistics: LOGISTICS,
      arbiter: ARBITER,
    };

    it('returns no errors for four distinct valid addresses', () => {
      assert.deepEqual(validateParties(parties), {});
    });

    it('skips empty fields', () => {
      assert.deepEqual(validateParties({ ...parties, logistics: '', arbiter: '   ' }), {});
    });

    it('flags an invalid address', () => {
      const errors = validateParties({ ...parties, supplier: 'not-an-address' });
      assert.deepEqual(Object.keys(errors), ['supplier']);
      assert.match(errors.supplier!, /valid Stellar public key/);
    });

    it('flags a duplicate party against the earlier role', () => {
      const errors = validateParties({ ...parties, supplier: BUYER });
      assert.deepEqual(errors, {
        supplier: 'Supplier must be different from the buyer address.',
      });
    });

    it('flags every later duplicate of the same address', () => {
      const errors = validateParties({ ...parties, logistics: SUPPLIER, arbiter: SUPPLIER });
      assert.deepEqual(errors, {
        logistics: 'Logistics must be different from the supplier address.',
        arbiter: 'Arbiter must be different from the supplier address.',
      });
    });

    it('detects duplicates after whitespace normalisation', () => {
      const errors = validateParties({ ...parties, arbiter: `  ${BUYER}\n` });
      assert.deepEqual(errors, {
        arbiter: 'Arbiter must be different from the buyer address.',
      });
    });

    it('reports an invalid address instead of a duplicate', () => {
      const errors = validateParties({ ...parties, supplier: 'bad', logistics: 'bad' });
      assert.match(errors.supplier!, /valid Stellar public key/);
      assert.match(errors.logistics!, /valid Stellar public key/);
    });
  });
});
