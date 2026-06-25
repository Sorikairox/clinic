// Builds a Monday-first month-grid model for the booking calendar. Pure data —
// the page renders it and the i18n layer supplies localized month/weekday names.
import { weekdayOf } from './availability';

export interface CalCell {
	date: string; // "YYYY-MM-DD"
	day: number; // day of month (1..31)
	available: boolean; // has free slots and is within the booking window
}

export interface CalMonth {
	/** Any date inside the month, for localized "Month Year" formatting. */
	anchorDate: string;
	/** Weeks of 7 cells, Monday-first; null = padding before/after the month. */
	weeks: (CalCell | null)[][];
}

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

/** Monday-first column index (Mon=0 … Sun=6) for a date. */
function mondayIndex(dateISO: string): number {
	return (weekdayOf(dateISO) + 6) % 7;
}

function buildMonth(year: number, month: number, available: Set<string>): CalMonth {
	const first = `${year}-${pad(month)}-01`;
	const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

	const cells: (CalCell | null)[] = [];
	for (let i = 0; i < mondayIndex(first); i++) cells.push(null); // leading padding
	for (let d = 1; d <= daysInMonth; d++) {
		const date = `${year}-${pad(month)}-${pad(d)}`;
		cells.push({ date, day: d, available: available.has(date) });
	}
	while (cells.length % 7 !== 0) cells.push(null); // trailing padding

	const weeks: (CalCell | null)[][] = [];
	for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

	return { anchorDate: first, weeks };
}

/**
 * One CalMonth per calendar month spanned by [firstDate, lastDate]. `available`
 * is the set of dates that actually have free slots (the only clickable days).
 */
export function buildCalendar(
	firstDate: string,
	lastDate: string,
	available: Set<string>,
): CalMonth[] {
	const months: CalMonth[] = [];
	let year = Number(firstDate.slice(0, 4));
	let month = Number(firstDate.slice(5, 7));
	const endYear = Number(lastDate.slice(0, 4));
	const endMonth = Number(lastDate.slice(5, 7));

	while (year < endYear || (year === endYear && month <= endMonth)) {
		months.push(buildMonth(year, month, available));
		month += 1;
		if (month > 12) {
			month = 1;
			year += 1;
		}
	}
	return months;
}
