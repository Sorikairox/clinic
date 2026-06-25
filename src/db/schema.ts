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

export const BOOKING_STATUSES = ['pending', 'confirmed', 'declined'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// A patient's booking request. slotStart/slotEnd are clinic-local (JST) wall
// times, "YYYY-MM-DDTHH:mm" — no timezone math, the clinic operates in one zone.
export const booking = sqliteTable(
	'booking',
	{
		id: text('id').primaryKey(),
		slotStart: text('slot_start').notNull(),
		slotEnd: text('slot_end').notNull(),
		status: text('status', { enum: BOOKING_STATUSES }).notNull().default('pending'),
		patientName: text('patient_name').notNull(),
		patientEmail: text('patient_email').notNull(),
		patientPhone: text('patient_phone').notNull(),
		locale: text('locale').notNull().default('ja'),
		reason: text('reason'),
		notes: text('notes'),
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
