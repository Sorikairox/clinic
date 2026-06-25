// Google reCAPTCHA Enterprise (score-based, invisible) — a light bot gate on the
// public booking form. The key is managed in the Google Cloud console
// (project shiba-clinic) and verified via the Create Assessment REST API using a
// Cloud API key. Following the same convention as email (see email.ts), the
// integration is *optional*: when RECAPTCHA_API_KEY / RECAPTCHA_PROJECT_ID are
// unset (local dev, tests, CI) verification is skipped so the booking flow still
// works end to end.

const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY;
const RECAPTCHA_API_KEY = process.env.RECAPTCHA_API_KEY;
const RECAPTCHA_PROJECT_ID = process.env.RECAPTCHA_PROJECT_ID;

/**
 * The action name passed to `grecaptcha.enterprise.execute()` on the client and
 * asserted against the token server-side. Must match on both sides — a mismatch
 * means the token was minted for a different page/flow.
 */
export const RECAPTCHA_ACTION = 'booking';

/**
 * Minimum risk score to accept (0.0 = almost certainly a bot … 1.0 = almost
 * certainly human). 0.5 is Google's suggested starting point for a low-friction
 * gate; raise it if abuse gets through.
 */
const SCORE_THRESHOLD = 0.5;

// Shape of the relevant fields of a Create Assessment response.
interface Assessment {
	tokenProperties?: { valid?: boolean; action?: string; invalidReason?: string };
	riskAnalysis?: { score?: number };
}

/** The public site key for the client widget, or null when not configured. */
export function recaptchaSiteKey(): string | null {
	return RECAPTCHA_SITE_KEY || null;
}

/** Whether server-side verification is enabled (API key + project configured). */
export function recaptchaEnabled(): boolean {
	return Boolean(RECAPTCHA_API_KEY && RECAPTCHA_PROJECT_ID);
}

/**
 * Verifies a reCAPTCHA Enterprise token by creating an assessment.
 *
 * Returns `true` (a pass) when verification isn't configured, so the form keeps
 * working in environments without reCAPTCHA set up. When configured, the token
 * must be valid (parseable, unexpired, not already redeemed), carry the expected
 * action, and clear the risk threshold. A missing token, an invalid token, a low
 * score, or a network error all fail closed (return false) — better to ask a real
 * patient to retry than to wave bots through.
 */
export async function verifyRecaptcha(token: string | undefined | null): Promise<boolean> {
	if (!recaptchaEnabled()) return true; // not configured → skip
	if (!token) return false;
	try {
		const res = await fetch(
			`https://recaptchaenterprise.googleapis.com/v1/projects/${RECAPTCHA_PROJECT_ID}/assessments?key=${RECAPTCHA_API_KEY}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					event: {
						token,
						siteKey: RECAPTCHA_SITE_KEY,
						expectedAction: RECAPTCHA_ACTION,
					},
				}),
			},
		);
		if (!res.ok) {
			console.error(`[recaptcha] createAssessment ${res.status}`);
			return false;
		}
		const { tokenProperties, riskAnalysis } = (await res.json()) as Assessment;
		if (!tokenProperties?.valid) {
			console.error(`[recaptcha] invalid token: ${tokenProperties?.invalidReason ?? 'unknown'}`);
			return false;
		}
		if (tokenProperties.action !== RECAPTCHA_ACTION) {
			console.error(`[recaptcha] action mismatch: ${tokenProperties.action ?? 'none'}`);
			return false;
		}
		return (riskAnalysis?.score ?? 0) >= SCORE_THRESHOLD;
	} catch (err) {
		console.error('[recaptcha] verification failed', err);
		return false;
	}
}
