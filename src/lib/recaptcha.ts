// Google reCAPTCHA v2 ("I'm not a robot" checkbox) — a light bot gate on the
// public booking form. Following the same convention as email (see email.ts),
// the integration is *optional*: when RECAPTCHA_SECRET_KEY is unset (local dev,
// tests, CI) verification is skipped so the booking flow still works end to end.

const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY;
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

/** The public site key for the client widget, or null when not configured. */
export function recaptchaSiteKey(): string | null {
	return RECAPTCHA_SITE_KEY || null;
}

/** Whether server-side verification is enabled (secret key configured). */
export function recaptchaEnabled(): boolean {
	return Boolean(RECAPTCHA_SECRET_KEY);
}

/**
 * Verifies a reCAPTCHA token against Google's siteverify endpoint.
 *
 * Returns `true` (a pass) when no secret key is configured, so the form keeps
 * working in environments without reCAPTCHA set up. When configured, a missing
 * or invalid token fails. Network errors fail closed (return false) — better to
 * ask a real patient to retry than to wave bots through.
 */
export async function verifyRecaptcha(token: string | undefined | null): Promise<boolean> {
	if (!RECAPTCHA_SECRET_KEY) return true; // not configured → skip
	if (!token) return false;
	try {
		const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ secret: RECAPTCHA_SECRET_KEY, response: token }),
		});
		if (!res.ok) {
			console.error(`[recaptcha] siteverify ${res.status}`);
			return false;
		}
		const data = (await res.json()) as { success?: boolean };
		return data.success === true;
	} catch (err) {
		console.error('[recaptcha] verification failed', err);
		return false;
	}
}
