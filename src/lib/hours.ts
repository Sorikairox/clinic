// Display-only weekly opening-hours grid, shared by the home and access pages.
// The bookable schedule (which slots patients can actually reserve) lives in
// schedule.ts; this is the human-readable summary table. Symbols are
// locale-independent; day/row labels come from the i18n "hours" dictionary.
//
//   'open'        -> open as normal           (○)
//   'appointment' -> by appointment only      (△)
//   'closed'      -> closed                    (−)
export type HoursMark = 'open' | 'appointment' | 'closed';

export const HOURS_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type HoursDay = (typeof HOURS_DAYS)[number];

export const HOURS_GRID: Record<'morning' | 'afternoon', Record<HoursDay, HoursMark>> = {
	morning: {
		mon: 'open',
		tue: 'open',
		wed: 'appointment',
		thu: 'open',
		fri: 'open',
		sat: 'open',
		sun: 'closed',
	},
	afternoon: {
		mon: 'open',
		tue: 'closed',
		wed: 'appointment',
		thu: 'open',
		fri: 'open',
		sat: 'closed',
		sun: 'closed',
	},
};

export const HOURS_SYMBOL: Record<HoursMark, string> = {
	open: '○',
	appointment: '△',
	closed: '−',
};
