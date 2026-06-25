import { afterEach, describe, expect, it, vi } from 'vitest';

// recaptcha.ts reads the env vars at module load, so each test stubs the env and
// re-imports a fresh copy of the module.
async function load(env: { site?: string; apiKey?: string; project?: string }) {
	vi.resetModules();
	vi.stubEnv('RECAPTCHA_SITE_KEY', env.site ?? '');
	vi.stubEnv('RECAPTCHA_API_KEY', env.apiKey ?? '');
	vi.stubEnv('RECAPTCHA_PROJECT_ID', env.project ?? '');
	return import('./recaptcha');
}

// A fully-configured module (API key + project ⇒ verification enabled).
const CONFIGURED = { site: 'site-key', apiKey: 'api-key', project: 'shiba-clinic' };

// Build a Create Assessment response body. Defaults to a valid, high-score,
// correctly-actioned token.
function assessment(over: {
	valid?: boolean;
	action?: string;
	score?: number;
	invalidReason?: string;
} = {}): Response {
	return new Response(
		JSON.stringify({
			tokenProperties: {
				valid: over.valid ?? true,
				action: over.action ?? 'booking',
				invalidReason: over.invalidReason,
			},
			riskAnalysis: { score: over.score ?? 0.9 },
		}),
	);
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe('recaptcha config helpers', () => {
	it('exposes the site key only when set, and reports enabled from API key + project', async () => {
		const off = await load({});
		expect(off.recaptchaSiteKey()).toBeNull();
		expect(off.recaptchaEnabled()).toBe(false);

		// Site key alone (public widget) does not enable server verification.
		const siteOnly = await load({ site: 'site-key' });
		expect(siteOnly.recaptchaSiteKey()).toBe('site-key');
		expect(siteOnly.recaptchaEnabled()).toBe(false);

		// A project without an API key (or vice versa) is still not enabled.
		const half = await load({ site: 'site-key', project: 'shiba-clinic' });
		expect(half.recaptchaEnabled()).toBe(false);

		const on = await load(CONFIGURED);
		expect(on.recaptchaSiteKey()).toBe('site-key');
		expect(on.recaptchaEnabled()).toBe(true);
	});
});

describe('verifyRecaptcha', () => {
	it('passes (no-op) when verification is not configured', async () => {
		const { verifyRecaptcha } = await load({ site: 'site-key' });
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		expect(await verifyRecaptcha(undefined)).toBe(true);
		expect(fetchSpy).not.toHaveBeenCalled(); // skipped before any network call
	});

	it('fails closed on a missing token when configured, without calling Google', async () => {
		const { verifyRecaptcha } = await load(CONFIGURED);
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		expect(await verifyRecaptcha(undefined)).toBe(false);
		expect(await verifyRecaptcha('')).toBe(false);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('calls the project assessment endpoint with the API key and posts the token', async () => {
		const { verifyRecaptcha } = await load(CONFIGURED);
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(assessment());
		expect(await verifyRecaptcha('tok')).toBe(true);

		const [url, init] = fetchSpy.mock.calls[0];
		expect(url).toBe(
			'https://recaptchaenterprise.googleapis.com/v1/projects/shiba-clinic/assessments?key=api-key',
		);
		const body = JSON.parse((init as RequestInit).body as string);
		expect(body.event).toMatchObject({
			token: 'tok',
			siteKey: 'site-key',
			expectedAction: 'booking',
		});
	});

	it('passes a valid token that clears the score threshold', async () => {
		const { verifyRecaptcha } = await load(CONFIGURED);
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(assessment({ score: 0.7 }));
		expect(await verifyRecaptcha('tok')).toBe(true);
	});

	it('fails when the token is invalid', async () => {
		const { verifyRecaptcha } = await load(CONFIGURED);
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			assessment({ valid: false, invalidReason: 'EXPIRED' }),
		);
		expect(await verifyRecaptcha('tok')).toBe(false);
	});

	it('fails when the risk score is below the threshold', async () => {
		const { verifyRecaptcha } = await load(CONFIGURED);
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(assessment({ score: 0.3 }));
		expect(await verifyRecaptcha('tok')).toBe(false);
	});

	it('fails when the token action does not match', async () => {
		const { verifyRecaptcha } = await load(CONFIGURED);
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(assessment({ action: 'login' }));
		expect(await verifyRecaptcha('tok')).toBe(false);
	});

	it('fails closed on a non-OK response from Google', async () => {
		const { verifyRecaptcha } = await load(CONFIGURED);
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 403 }));
		expect(await verifyRecaptcha('tok')).toBe(false);
	});

	it('fails closed when the network request throws', async () => {
		const { verifyRecaptcha } = await load(CONFIGURED);
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
		vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(await verifyRecaptcha('tok')).toBe(false);
	});
});
