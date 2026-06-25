import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { staff } from '../db/schema';
import { createBooking, decideBooking } from '../db/queries';
import { isValidSlot, slotsForDate } from '../lib/availability';
import { buildConfirmedEmail, buildDeclinedEmail, sendEmail } from '../lib/email';
import { verifyPassword } from '../lib/password';
import { clearSession, getSessionStaff, setSession } from '../lib/session';
import { LOCALES } from '../i18n/config';

const localeEnum = z.enum(LOCALES as unknown as [string, ...string[]]);

export const server = {
	// --- Public: submit a booking request -------------------------------------
	createBooking: defineAction({
		accept: 'form',
		input: z.object({
			slotStart: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
			name: z.string().trim().min(1).max(100),
			email: z.string().trim().email().max(200),
			phone: z.string().trim().min(3).max(40),
			reason: z.string().max(1000).optional(),
			notes: z.string().max(2000).optional(),
			locale: localeEnum,
		}),
		handler: async (input) => {
			if (!isValidSlot(input.slotStart)) {
				throw new ActionError({ code: 'BAD_REQUEST', message: 'invalid_slot' });
			}
			const slot = slotsForDate(input.slotStart.slice(0, 10)).find((s) => s.start === input.slotStart);
			if (!slot) throw new ActionError({ code: 'BAD_REQUEST', message: 'invalid_slot' });

			const result = await createBooking({
				slotStart: slot.start,
				slotEnd: slot.end,
				patientName: input.name,
				patientEmail: input.email,
				patientPhone: input.phone,
				locale: input.locale,
				reason: input.reason?.trim() || null,
				notes: input.notes?.trim() || null,
			});
			if (!result.ok) throw new ActionError({ code: 'CONFLICT', message: 'slot_taken' });
			return { bookingId: result.booking.id };
		},
	}),

	// --- Staff: log in / out --------------------------------------------------
	login: defineAction({
		accept: 'form',
		input: z.object({
			email: z.string().trim().email(),
			password: z.string().min(1),
		}),
		handler: async ({ email, password }, context) => {
			const found = await db.query.staff.findFirst({ where: eq(staff.email, email) });
			if (!found || !verifyPassword(password, found.passwordHash)) {
				throw new ActionError({ code: 'UNAUTHORIZED', message: 'bad_credentials' });
			}
			setSession(context.cookies, found.id);
			return { ok: true };
		},
	}),

	logout: defineAction({
		accept: 'form',
		handler: async (_input, context) => {
			clearSession(context.cookies);
			return { ok: true };
		},
	}),

	// --- Staff: confirm / decline a pending booking ---------------------------
	confirmBooking: defineAction({
		accept: 'form',
		input: z.object({ id: z.string() }),
		handler: async ({ id }, context) => {
			const member = await getSessionStaff(context.cookies);
			if (!member) throw new ActionError({ code: 'UNAUTHORIZED' });
			const updated = await decideBooking(id, 'confirmed', member.name);
			if (!updated) throw new ActionError({ code: 'NOT_FOUND' });
			const { subject, html } = buildConfirmedEmail(updated);
			const sent = await sendEmail({ to: updated.patientEmail, subject, html });
			return { ok: true, emailSent: sent.ok };
		},
	}),

	declineBooking: defineAction({
		accept: 'form',
		input: z.object({ id: z.string() }),
		handler: async ({ id }, context) => {
			const member = await getSessionStaff(context.cookies);
			if (!member) throw new ActionError({ code: 'UNAUTHORIZED' });
			const updated = await decideBooking(id, 'declined', member.name);
			if (!updated) throw new ActionError({ code: 'NOT_FOUND' });
			const { subject, html } = buildDeclinedEmail(updated);
			const sent = await sendEmail({ to: updated.patientEmail, subject, html });
			return { ok: true, emailSent: sent.ok };
		},
	}),
};
