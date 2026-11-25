import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CALLBACK_URL,
  LOGIN_PATH,
  buildLoginUrl,
  sanitizeCallbackUrl,
} from './session';

describe('Session helpers', () => {
  describe('sanitizeCallbackUrl', () => {
    it('keeps same-origin relative paths', () => {
      assert.equal(sanitizeCallbackUrl('/dashboard'), '/dashboard');
      assert.equal(
        sanitizeCallbackUrl('/dashboard/shipments/abc?tab=events#top'),
        '/dashboard/shipments/abc?tab=events#top',
      );
    });

    it('falls back for empty values', () => {
      assert.equal(sanitizeCallbackUrl(null), DEFAULT_CALLBACK_URL);
      assert.equal(sanitizeCallbackUrl(undefined), DEFAULT_CALLBACK_URL);
      assert.equal(sanitizeCallbackUrl(''), DEFAULT_CALLBACK_URL);
    });

    describe('open-redirect attempts', () => {
      const attacks = [
        '//evil.com',
        '//evil.com/dashboard',
        'https://evil.com',
        'http://evil.com/dashboard',
        '/\\evil.com',
        '\\\\evil.com',
        'javascript:alert(1)',
        'JavaScript:alert(document.cookie)',
        'data:text/html,<script>alert(1)</script>',
        'evil.com',
        ' //evil.com',
      ];

      for (const attack of attacks) {
        it(`rejects ${JSON.stringify(attack)}`, () => {
          const result = sanitizeCallbackUrl(attack);
          assert.equal(result, DEFAULT_CALLBACK_URL);
          assert.ok(result.startsWith('/') && !result.startsWith('//'));
        });
      }
    });

    it('never redirects back to the login page', () => {
      assert.equal(sanitizeCallbackUrl(LOGIN_PATH), DEFAULT_CALLBACK_URL);
      assert.equal(sanitizeCallbackUrl(`${LOGIN_PATH}?callbackUrl=/x`), DEFAULT_CALLBACK_URL);
      assert.equal(sanitizeCallbackUrl(`${LOGIN_PATH}/extra`), DEFAULT_CALLBACK_URL);
    });

    it('uses a custom fallback when given', () => {
      assert.equal(sanitizeCallbackUrl('//evil.com', '/dashboard'), '/dashboard');
      assert.equal(sanitizeCallbackUrl(null, '/dashboard'), '/dashboard');
    });
  });

  describe('buildLoginUrl', () => {
    it('encodes a safe callbackUrl', () => {
      const url = buildLoginUrl('/dashboard/shipments/abc?tab=events');
      const params = new URL(url, 'http://localhost').searchParams;
      assert.ok(url.startsWith(`${LOGIN_PATH}?`));
      assert.equal(params.get('callbackUrl'), '/dashboard/shipments/abc?tab=events');
      assert.equal(params.get('reason'), null);
    });

    it('sanitizes an unsafe callbackUrl', () => {
      const url = buildLoginUrl('https://evil.com');
      const params = new URL(url, 'http://localhost').searchParams;
      assert.equal(params.get('callbackUrl'), DEFAULT_CALLBACK_URL);
    });

    it('adds the reason when given', () => {
      const url = buildLoginUrl('/dashboard', 'expired');
      const params = new URL(url, 'http://localhost').searchParams;
      assert.equal(params.get('reason'), 'expired');
    });
  });
});
