import { randomUUID } from 'node:crypto';
import { and, desc, eq, gte, lte, ne } from 'drizzle-orm';
import { db } from './client';
import { booking, type Booking, type NewBooking } from './schema';

/** Slot-start strings already taken (non-declined) within a date range. */
export async function getActiveSlotStarts(fromDate: string, toDate: string): Promise<Set<string>> {
	const rows = await db
		.select({ slotStart: booking.slotStart })
		.from(booking)
		.where(
			and(
				ne(booking.status, 'declined'),
				gte(booking.slotStart, fromDate),
				lte(booking.slotStart, `${toDate}T99:99`),
			),
		);
	return new Set(rows.map((r) => r.slotStart));
}

export type CreateBookingInput = Omit<NewBooking, 'id' | 'status' | 'createdAt'>;

export type CreateBookingResult =
	| { ok: true; booking: Booking }
	| { ok: false; reason: 'slot_taken' };

// Drizzle wraps driver errors (DrizzleQueryError) with the real SQLite error on
// `.cause`, so walk the cause chain to detect a unique-constraint violation.
function isUniqueViolation(err: unknown): boolean {
	let e: unknown = err;
	for (let i = 0; i < 5 && e; i++) {
		const code = (e as { code?: unknown }).code;
		const message = (e as { message?: unknown }).message;
		if (typeof code === 'string' && code.includes('CONSTRAINT')) return true;
		if (typeof message === 'string' && message.includes('UNIQUE constraint failed')) return true;
		e = (e as { cause?: unknown }).cause;
	}
	return false;
}

/**
 * Inserts a pending booking. The partial unique index on slot_start (active
 * bookings only) makes a concurrent double-booking fail atomically at the DB.
 */
export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
	const row: NewBooking = {
		...input,
		id: randomUUID(),
		status: 'pending',
		createdAt: new Date().toISOString(),
	};
	try {
		const [created] = await db.insert(booking).values(row).returning();
		return { ok: true, booking: created };
	} catch (err) {
		if (isUniqueViolation(err)) return { ok: false, reason: 'slot_taken' };
		throw err;
	}
}

export function getBooking(id: string): Promise<Booking | undefined> {
	return db.query.booking.findFirst({ where: eq(booking.id, id) });
}

export function listPending(): Promise<Booking[]> {
	return db.query.booking.findMany({
		where: eq(booking.status, 'pending'),
		orderBy: booking.slotStart,
	});
}

export function listRecentDecided(limit = 10): Promise<Booking[]> {
	return db.query.booking.findMany({
		where: ne(booking.status, 'pending'),
		orderBy: desc(booking.decidedAt),
		limit,
	});
}

/** Confirms or declines a pending booking; returns the updated row (or null). */
export async function decideBooking(
	id: string,
	decision: 'confirmed' | 'declined',
	decidedBy: string,
): Promise<Booking | null> {
	const [updated] = await db
		.update(booking)
		.set({ status: decision, decidedBy, decidedAt: new Date().toISOString() })
		.where(and(eq(booking.id, id), eq(booking.status, 'pending')))
		.returning();
	return updated ?? null;
}
