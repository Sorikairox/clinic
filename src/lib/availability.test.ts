import { describe, expect, it } from 'vitest';
import {
	bookableDates,
	freeSlotsForDate,
	isValidSlot,
	slotsForDate,
	weekdayOf,
} from './availability';

// 2026-06-26 Fri; 06-27 Sat; 06-28 Sun; 06-30 Tue; 07-01 Wed; 07-02 Thu.
const FRIDAY = '2026-06-26';
const SATURDAY = '2026-06-27';
const SUNDAY = '2026-06-28';
const TUESDAY = '2026-06-30';
const WEDNESDAY = '2026-07-01';
const THURSDAY = '2026-07-02';
const NOW = new Date('2026-06-25T00:00:00Z'); // clinic "today" = 2026-06-25 (JST)

describe('slotsForDate', () => {
	it('produces 22 slots on a full weekday (morning 10 + afternoon 12)', () => {
		const slots = slotsForDate(FRIDAY);
		expect(slots.length).toBe(22);
		expect(slots[0]).toMatchObject({ start: '2026-06-26T10:00', end: '2026-06-26T10:15', time: '10:00' });
		expect(slots.at(-1)?.time).toBe('17:45');
	});

	it('produces morning-only slots on Tuesday and Saturday', () => {
		const morning = [
			'10:00', '10:15', '10:30', '10:45', '11:00',
			'11:15', '11:30', '11:45', '12:00', '12:15',
		];
		expect(slotsForDate(TUESDAY).map((s) => s.time)).toEqual(morning);
		expect(slotsForDate(SATURDAY).map((s) => s.time)).toEqual(morning);
	});

	it('is empty on closed days (Wednesday, Sunday)', () => {
		expect(slotsForDate(WEDNESDAY)).toHaveLength(0);
		expect(slotsForDate(SUNDAY)).toHaveLength(0);
	});

	it('is open on Thursday (full day)', () => {
		expect(slotsForDate(THURSDAY)).toHaveLength(22);
	});
});

describe('weekdayOf', () => {
	it('maps dates to JS weekday numbers', () => {
		expect(weekdayOf(FRIDAY)).toBe(5);
		expect(weekdayOf(SUNDAY)).toBe(0);
	});
});

describe('bookableDates', () => {
	it('starts tomorrow and excludes closed days', () => {
		const dates = bookableDates(NOW);
		expect(dates[0]).toBe('2026-06-26'); // tomorrow
		expect(dates).not.toContain('2026-06-25'); // today is excluded
		expect(dates).not.toContain(WEDNESDAY);
		expect(dates).not.toContain(SUNDAY);
	});
});

describe('freeSlotsForDate', () => {
	it('removes taken slots', () => {
		const taken = new Set(['2026-06-26T10:00', '2026-06-26T15:00']);
		const free = freeSlotsForDate(FRIDAY, taken);
		expect(free).toHaveLength(20);
		expect(free.some((s) => s.start === '2026-06-26T10:00')).toBe(false);
	});
});

describe('isValidSlot', () => {
	it('accepts a real template slot in the booking window', () => {
		expect(isValidSlot('2026-06-26T10:00', NOW)).toBe(true);
	});
	it('rejects an off-grid time', () => {
		expect(isValidSlot('2026-06-26T10:20', NOW)).toBe(false);
	});
	it('rejects a slot on a closed day', () => {
		expect(isValidSlot('2026-07-01T10:00', NOW)).toBe(false); // Wednesday
	});
	it('rejects today / past (window starts tomorrow)', () => {
		expect(isValidSlot('2026-06-25T10:00', NOW)).toBe(false);
	});
});
