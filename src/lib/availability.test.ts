import { describe, expect, it } from 'vitest';
import {
	bookableDates,
	freeSlotsForDate,
	isValidSlot,
	slotsForDate,
	weekdayOf,
} from './availability';

// 2026-06-26 is a Friday; 06-27 Sat; 06-28 Sun; 07-02 Thu.
const FRIDAY = '2026-06-26';
const SATURDAY = '2026-06-27';
const SUNDAY = '2026-06-28';
const THURSDAY = '2026-07-02';
const NOW = new Date('2026-06-25T00:00:00Z'); // clinic "today" = 2026-06-25 (JST)

describe('slotsForDate', () => {
	it('produces 9 slots on a full weekday (morning 4 + afternoon 5)', () => {
		const slots = slotsForDate(FRIDAY);
		expect(slots.length).toBe(9);
		expect(slots[0]).toMatchObject({ start: '2026-06-26T10:00', end: '2026-06-26T10:30', time: '10:00' });
		expect(slots.at(-1)?.time).toBe('17:00');
	});

	it('produces morning-only slots on Saturday', () => {
		expect(slotsForDate(SATURDAY).map((s) => s.time)).toEqual(['10:00', '10:30', '11:00', '11:30']);
	});

	it('is empty on closed days (Thursday, Sunday)', () => {
		expect(slotsForDate(THURSDAY)).toHaveLength(0);
		expect(slotsForDate(SUNDAY)).toHaveLength(0);
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
		expect(dates).not.toContain(THURSDAY);
		expect(dates).not.toContain(SUNDAY);
	});
});

describe('freeSlotsForDate', () => {
	it('removes taken slots', () => {
		const taken = new Set(['2026-06-26T10:00', '2026-06-26T15:00']);
		const free = freeSlotsForDate(FRIDAY, taken);
		expect(free).toHaveLength(7);
		expect(free.some((s) => s.start === '2026-06-26T10:00')).toBe(false);
	});
});

describe('isValidSlot', () => {
	it('accepts a real template slot in the booking window', () => {
		expect(isValidSlot('2026-06-26T10:00', NOW)).toBe(true);
	});
	it('rejects an off-grid time', () => {
		expect(isValidSlot('2026-06-26T10:15', NOW)).toBe(false);
	});
	it('rejects a slot on a closed day', () => {
		expect(isValidSlot('2026-07-02T10:00', NOW)).toBe(false);
	});
	it('rejects today / past (window starts tomorrow)', () => {
		expect(isValidSlot('2026-06-25T10:00', NOW)).toBe(false);
	});
});
