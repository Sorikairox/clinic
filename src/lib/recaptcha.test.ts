import { afterEach, describe, expect, it, vi } from 'vitest';

// recaptcha.ts reads the env vars at module load, so each test stubs the env and
// re-imports a fresh copy of the module.
async function load(env: { site?: string; secret?: string }) {
	vi.resetModules();
	vi.stubEnv('RECAPTCHA_SITE_KEY', env.site ?? '');
	vi.stubEnv('RECAPTCHA_SECRET_KEY', env.secret ?? '');
	return import('./recaptcha');
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe('recaptcha config helpers', () => {
	it('exposes the site key only when set, and reports enabled from the secret', async () => {
		const off = await load({});
		expect(off.recaptchaSiteKey()).toBeNull();
		expect(off.recaptchaEnabled()).toBe(false);

		const on = await load({ site: 'site-key', secret: 'secret-key' });
		expect(on.recaptchaSiteKey()).toBe('site-key');
		expect(on.recaptchaEnabled()).toBe(true);
	});
});

describe('verifyRecaptcha', () => {
	it('passes (no-op) when no secret is configured', async () => {
		const { verifyRecaptcha } = await load({});
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		expect(await verifyRecaptcha(undefined)).toBe(true);
		expect(fetchSpy).not.toHaveBeenCalled(); // skipped before any network call
	});

	it('fails closed on a missing token when configured, without calling Google', async () => {
		const { verifyRecaptcha } = await load({ secret: 'secret-key' });
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		expect(await verifyRecaptcha(undefined)).toBe(false);
		expect(await verifyRecaptcha('')).toBe(false);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('returns the result of Google siteverify for a present token', async () => {
		const { verifyRecaptcha } = await load({ secret: 'secret-key' });
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ success: true })),
		);
		expect(await verifyRecaptcha('tok')).toBe(true);
	});

	it('fails when siteverify reports the token invalid', async () => {
		const { verifyRecaptcha } = await load({ secret: 'secret-key' });
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] })),
		);
		expect(await verifyRecaptcha('tok')).toBe(false);
	});

	it('fails closed when the network request throws', async () => {
		const { verifyRecaptcha } = await load({ secret: 'secret-key' });
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
		vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(await verifyRecaptcha('tok')).toBe(false);
	});
});
