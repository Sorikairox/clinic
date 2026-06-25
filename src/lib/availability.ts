import { BLOCKED_DATES, BOOKING_WINDOW_DAYS, SLOT_MINUTES, WEEKLY_TEMPLATE } from './schedule';

export interface Slot {
	/** "YYYY-MM-DDTHH:mm" clinic-local start. */
	start: string;
	/** "YYYY-MM-DDTHH:mm" clinic-local end. */
	end: string;
	/** "HH:mm" display time. */
	time: string;
}

export interface DayAvailability {
	date: string; // "YYYY-MM-DD"
	weekday: number; // 0..6
	slots: Slot[]; // free slots only
}

function toMinutes(hhmm: string): number {
	const [h, m] = hhmm.split(':').map(Number);
	return h * 60 + m;
}

function toHHMM(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function weekdayOf(dateISO: string): number {
	return new Date(`${dateISO}T00:00:00Z`).getUTCDay();
}

export function addDays(dateISO: string, n: number): string {
	const d = new Date(`${dateISO}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

/** Today's date in the clinic's timezone (JST, UTC+9), as "YYYY-MM-DD". */
export function clinicToday(now: Date = new Date()): string {
	const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
	return jst.toISOString().slice(0, 10);
}

/** All slots a date's template produces, ignoring bookings/blocks. */
export function slotsForDate(dateISO: string): Slot[] {
	if (BLOCKED_DATES.has(dateISO)) return [];
	const ranges = WEEKLY_TEMPLATE[weekdayOf(dateISO)] ?? [];
	const slots: Slot[] = [];
	for (const range of ranges) {
		const open = toMinutes(range.open);
		const close = toMinutes(range.close);
		for (let t = open; t + SLOT_MINUTES <= close; t += SLOT_MINUTES) {
			const time = toHHMM(t);
			slots.push({
				start: `${dateISO}T${time}`,
				end: `${dateISO}T${toHHMM(t + SLOT_MINUTES)}`,
				time,
			});
		}
	}
	return slots;
}

/** A date's slots minus the ones already taken (set of slotStart strings). */
export function freeSlotsForDate(dateISO: string, taken: Set<string>): Slot[] {
	return slotsForDate(dateISO).filter((s) => !taken.has(s.start));
}

/**
 * The bookable date range — from tomorrow through BOOKING_WINDOW_DAYS ahead —
 * keeping only dates the clinic is open. Returns "YYYY-MM-DD" strings.
 */
export function bookableDates(now: Date = new Date()): string[] {
	const start = clinicToday(now);
	const dates: string[] = [];
	for (let i = 1; i <= BOOKING_WINDOW_DAYS; i++) {
		const date = addDays(start, i);
		if (BLOCKED_DATES.has(date)) continue;
		if ((WEEKLY_TEMPLATE[weekdayOf(date)] ?? []).length === 0) continue;
		dates.push(date);
	}
	return dates;
}

/** True if a slotStart string corresponds to a real template slot on a bookable date. */
export function isValidSlot(slotStart: string, now: Date = new Date()): boolean {
	const date = slotStart.slice(0, 10);
	if (!bookableDates(now).includes(date)) return false;
	return slotsForDate(date).some((s) => s.start === slotStart);
}
