import { sql } from 'drizzle-orm';
import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Clinic staff who can log into the dashboard. Seeded, never self-registered.
export const staff = sqliteTable('staff', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	passwordHash: text('password_hash').notNull(),
	role: text('role').notNull().default('staff'),
	createdAt: text('created_at').notNull(),
});

// 'blocked' is a staff-created hold that takes a slot out of online availability
// (e.g. a phone appointment or a slot the clinic wants to keep free). Like every
// non-'declined' status it occupies the slot via the active_slot_unique index.
export const BOOKING_STATUSES = ['pending', 'confirmed', 'declined', 'blocked'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_ORIGINS = ['online', 'staff'] as const;
export type BookingOrigin = (typeof BOOKING_ORIGINS)[number];

// A booking record. Most are patient requests submitted online, but staff can
// also create entries from the dashboard: a phone appointment ('confirmed',
// origin 'staff') or a plain block ('blocked'). Because staff entries may have
// only partial patient details (or none, for a block), the patient columns are
// nullable — the online booking action still requires them via its input schema.
// slotStart/slotEnd are clinic-local (JST) wall times, "YYYY-MM-DDTHH:mm" — no
// timezone math, the clinic operates in one zone.
export const booking = sqliteTable(
	'booking',
	{
		id: text('id').primaryKey(),
		slotStart: text('slot_start').notNull(),
		slotEnd: text('slot_end').notNull(),
		status: text('status', { enum: BOOKING_STATUSES }).notNull().default('pending'),
		origin: text('origin', { enum: BOOKING_ORIGINS }).notNull().default('online'),
		customerNumber: text('customer_number'),
		firstVisit: text('first_visit'), // 'new' | 'returning'
		patientName: text('patient_name'),
		patientNameKana: text('patient_name_kana'),
		gender: text('gender'), // 'female' | 'male'
		dateOfBirth: text('date_of_birth'), // "YYYY-MM-DD"
		patientEmail: text('patient_email'),
		patientPhone: text('patient_phone'),
		postalCode: text('postal_code'),
		prefecture: text('prefecture'),
		address: text('address'),
		note: text('note'), // staff annotation: block reason / phone-booking memo
		locale: text('locale').notNull().default('ja'),
		createdAt: text('created_at').notNull(),
		decidedAt: text('decided_at'),
		decidedBy: text('decided_by'),
	},
	(t) => [
		// Double-booking guard: at most one non-declined booking per slot. A
		// declined booking frees the slot again (it drops out of this index).
		uniqueIndex('active_slot_unique')
			.on(t.slotStart)
			.where(sql`status != 'declined'`),
		index('booking_status_idx').on(t.status),
		index('booking_slot_idx').on(t.slotStart),
	],
);

export type Staff = typeof staff.$inferSelect;
export type Booking = typeof booking.$inferSelect;
export type NewBooking = typeof booking.$inferInsert;
