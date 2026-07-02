import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { staff } from '../db/schema';
import {
	createBooking,
	createStaffEntry,
	decideBooking,
	deleteStaffEntry,
} from '../db/queries';
import { isStaffManageableSlot, isValidSlot, slotsForDate } from '../lib/availability';
import { buildConfirmedEmail, buildDeclinedEmail, buildReceivedEmail, sendEmail } from '../lib/email';
import { verifyRecaptcha } from '../lib/recaptcha';
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
			customerNumber: z.string().max(50).optional(),
			firstVisit: z.enum(['new', 'returning']),
			name: z.string().trim().min(1).max(100),
			nameKana: z.string().max(100).optional(),
			gender: z.enum(['female', 'male']),
			dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
			email: z.string().trim().email().max(200),
			phone: z.string().trim().min(3).max(40),
			postalCode: z.string().trim().min(1).max(20),
			prefecture: z.string().trim().min(1).max(20),
			address: z.string().trim().min(1).max(200),
			locale: localeEnum,
			// reCAPTCHA Enterprise token, minted invisibly on the client (field name
			// kept for convention). Optional in the schema because the gate is only
			// enforced when reCAPTCHA is configured (see recaptcha.ts).
			'g-recaptcha-response': z.string().optional(),
		}),
		handler: async (input) => {
			// Bot gate: no-op unless reCAPTCHA Enterprise is configured (see recaptcha.ts).
			if (!(await verifyRecaptcha(input['g-recaptcha-response']))) {
				throw new ActionError({ code: 'BAD_REQUEST', message: 'recaptcha_failed' });
			}

			if (!isValidSlot(input.slotStart)) {
				throw new ActionError({ code: 'BAD_REQUEST', message: 'invalid_slot' });
			}
			const slot = slotsForDate(input.slotStart.slice(0, 10)).find((s) => s.start === input.slotStart);
			if (!slot) throw new ActionError({ code: 'BAD_REQUEST', message: 'invalid_slot' });

			const result = await createBooking({
				slotStart: slot.start,
				slotEnd: slot.end,
				customerNumber: input.customerNumber?.trim() || null,
				firstVisit: input.firstVisit,
				patientName: input.name,
				patientNameKana: input.nameKana?.trim() || null,
				gender: input.gender,
				dateOfBirth: input.dateOfBirth,
				patientEmail: input.email,
				patientPhone: input.phone,
				postalCode: input.postalCode,
				prefecture: input.prefecture,
				address: input.address,
				locale: input.locale,
			});
			if (!result.ok) throw new ActionError({ code: 'CONFLICT', message: 'slot_taken' });

			// Best-effort auto-reply acknowledging the request (in the patient's
			// language). sendEmail logs and swallows failures, so it never blocks
			// or fails the booking itself.
			const { subject, html } = buildReceivedEmail(result.booking);
			await sendEmail({ to: result.booking.patientEmail!, subject, html });

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
			const sent = await sendEmail({ to: updated.patientEmail!, subject, html });
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
			const sent = await sendEmail({ to: updated.patientEmail!, subject, html });
			return { ok: true, emailSent: sent.ok };
		},
	}),

	// --- Staff: manage slots directly (phone appointments / blocks) -----------

	// Book a slot on the patient's behalf (e.g. an appointment taken by phone).
	// Goes straight to 'confirmed'; if an email is supplied we send the same
	// confirmation the online flow sends, otherwise we just hold the slot.
	staffBookSlot: defineAction({
		accept: 'form',
		input: z.object({
			slotStart: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
			name: z.string().trim().min(1).max(100),
			phone: z.string().trim().min(1).max(40),
			email: z.string().trim().email().max(200).or(z.literal('')).nullish(),
			customerNumber: z.string().max(50).optional(),
			firstVisit: z.enum(['new', 'returning']).optional(),
			note: z.string().max(500).optional(),
			locale: localeEnum.optional(),
		}),
		handler: async (input, context) => {
			const member = await getSessionStaff(context.cookies);
			if (!member) throw new ActionError({ code: 'UNAUTHORIZED' });
			if (!isStaffManageableSlot(input.slotStart)) {
				throw new ActionError({ code: 'BAD_REQUEST', message: 'invalid_slot' });
			}
			const slot = slotsForDate(input.slotStart.slice(0, 10)).find((s) => s.start === input.slotStart);
			if (!slot) throw new ActionError({ code: 'BAD_REQUEST', message: 'invalid_slot' });

			const email = input.email?.trim() || null;
			const result = await createStaffEntry({
				slotStart: slot.start,
				slotEnd: slot.end,
				status: 'confirmed',
				customerNumber: input.customerNumber?.trim() || null,
				firstVisit: input.firstVisit ?? null,
				patientName: input.name,
				gender: null,
				dateOfBirth: null,
				patientEmail: email,
				patientPhone: input.phone,
				note: input.note?.trim() || null,
				locale: input.locale ?? 'ja',
				decidedBy: member.name,
				decidedAt: new Date().toISOString(),
			});
			if (!result.ok) throw new ActionError({ code: 'CONFLICT', message: 'slot_taken' });

			let emailSent = false;
			if (email) {
				const { subject, html } = buildConfirmedEmail(result.booking);
				emailSent = (await sendEmail({ to: email, subject, html })).ok;
			}
			return { ok: true, emailSent, hadEmail: Boolean(email), date: slot.start.slice(0, 10) };
		},
	}),

	// Block a slot so it can't be booked online (staff keep it free, held for a
	// walk-in, etc.). No patient, no email — just a hold with an optional reason.
	blockSlot: defineAction({
		accept: 'form',
		input: z.object({
			slotStart: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
			note: z.string().max(500).optional(),
		}),
		handler: async ({ slotStart, note }, context) => {
			const member = await getSessionStaff(context.cookies);
			if (!member) throw new ActionError({ code: 'UNAUTHORIZED' });
			if (!isStaffManageableSlot(slotStart)) {
				throw new ActionError({ code: 'BAD_REQUEST', message: 'invalid_slot' });
			}
			const slot = slotsForDate(slotStart.slice(0, 10)).find((s) => s.start === slotStart);
			if (!slot) throw new ActionError({ code: 'BAD_REQUEST', message: 'invalid_slot' });

			const result = await createStaffEntry({
				slotStart: slot.start,
				slotEnd: slot.end,
				status: 'blocked',
				note: note?.trim() || null,
				decidedBy: member.name,
				decidedAt: new Date().toISOString(),
			});
			if (!result.ok) throw new ActionError({ code: 'CONFLICT', message: 'slot_taken' });
			return { ok: true, date: slot.start.slice(0, 10) };
		},
	}),

	// Free a staff-created slot again (unblock, or cancel a phone booking).
	releaseSlot: defineAction({
		accept: 'form',
		input: z.object({ id: z.string() }),
		handler: async ({ id }, context) => {
			const member = await getSessionStaff(context.cookies);
			if (!member) throw new ActionError({ code: 'UNAUTHORIZED' });
			const removed = await deleteStaffEntry(id);
			if (!removed) throw new ActionError({ code: 'NOT_FOUND' });
			return { ok: true, date: removed.slotStart.slice(0, 10) };
		},
	}),
};
