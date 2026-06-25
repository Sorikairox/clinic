import type { Locale } from '../i18n/config';
import { useTranslations } from '../i18n/utils';
import type { Booking } from '../db/schema';
import { formatSlotLong } from './datetime';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'Shiba Clinic <onboarding@resend.dev>';

export interface SendResult {
	ok: boolean;
	error?: string;
}

/**
 * Sends an email via the Resend HTTP API. If RESEND_API_KEY is unset (e.g. local
 * dev), it logs instead of sending so the booking flow still works end to end.
 */
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<SendResult> {
	if (!RESEND_API_KEY) {
		console.warn(`[email] RESEND_API_KEY not set — would send "${opts.subject}" to ${opts.to}`);
		return { ok: false, error: 'no_api_key' };
	}
	try {
		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${RESEND_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ from: EMAIL_FROM, to: opts.to, subject: opts.subject, html: opts.html }),
		});
		if (!res.ok) {
			const body = await res.text();
			console.error(`[email] Resend ${res.status}: ${body}`);
			return { ok: false, error: `resend_${res.status}` };
		}
		return { ok: true };
	} catch (err) {
		console.error('[email] send failed', err);
		return { ok: false, error: 'network' };
	}
}

function layout(bodyHtml: string): string {
	return `<!doctype html><html><body style="margin:0;background:#f5f7fa;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2933;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e7eb;">
      <tr><td style="background:#0f766e;padding:20px 28px;color:#ffffff;font-size:18px;font-weight:600;">Shiba Coloproctological Clinic</td></tr>
      <tr><td style="padding:28px;font-size:15px;line-height:1.7;">${bodyHtml}</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function paragraph(text: string): string {
	return `<p style="margin:0 0 16px;">${text}</p>`;
}

export function buildConfirmedEmail(b: Booking): { subject: string; html: string } {
	const locale = b.locale as Locale;
	const t = useTranslations(locale);
	const slot = formatSlotLong(b.slotStart, b.slotEnd, locale);
	const html = layout(
		paragraph(t('email.confirmed.greeting', { name: b.patientName })) +
			paragraph(t('email.confirmed.body')) +
			`<p style="margin:0 0 16px;padding:14px 16px;background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;">
        <strong>${t('email.confirmed.slotLabel')}:</strong><br>${slot}</p>` +
			paragraph(t('email.confirmed.closing')) +
			paragraph(`— ${t('email.confirmed.signature')}`),
	);
	return { subject: t('email.confirmed.subject'), html };
}

export function buildDeclinedEmail(b: Booking): { subject: string; html: string } {
	const locale = b.locale as Locale;
	const t = useTranslations(locale);
	const html = layout(
		paragraph(t('email.declined.greeting', { name: b.patientName })) +
			paragraph(t('email.declined.body')) +
			paragraph(t('email.declined.closing')) +
			paragraph(`— ${t('email.declined.signature')}`),
	);
	return { subject: t('email.declined.subject'), html };
}
