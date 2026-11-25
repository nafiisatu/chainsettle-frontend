import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decodeJwtPayload, getTokenRole } from './jwt.ts';

function makeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj), 'utf-8').toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('JWT role extraction for admin guard', () => {
  it('returns ADMIN when token role claim is ADMIN', () => {
    const token = makeJwt({
      sub: 'user-1',
      stellarAddress: 'GABC',
      role: 'ADMIN',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    assert.equal(getTokenRole(token), 'ADMIN');
    assert.equal(decodeJwtPayload(token)?.sub, 'user-1');
  });

  it('returns non-admin roles accurately', () => {
    for (const role of ['BUYER', 'SUPPLIER', 'LOGISTICS', 'ARBITER'] as const) {
      const token = makeJwt({ sub: 'u', role });
      assert.equal(getTokenRole(token), role);
    }
  });

  it('returns null for missing, invalid, or unrecognized roles', () => {
    assert.equal(getTokenRole(undefined), null);
    assert.equal(getTokenRole(null), null);
    assert.equal(getTokenRole('not-a-jwt'), null);
    assert.equal(getTokenRole(makeJwt({ sub: 'u', role: 'SUPERUSER' })), null);
    assert.equal(getTokenRole(makeJwt({ sub: 'u' })), null);
  });
});
