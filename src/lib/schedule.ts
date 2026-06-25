// Clinic opening hours. All times are clinic-local (JST). Weekday keys follow
// JS getUTCDay(): 0=Sun, 1=Mon, … 6=Sat. A weekday absent here is a closed day.
export interface OpenRange {
	open: string; // "HH:mm"
	close: string; // "HH:mm"
}

export const SLOT_MINUTES = 30;

// How many days ahead patients may book.
export const BOOKING_WINDOW_DAYS = 21;

const MORNING: OpenRange = { open: '10:00', close: '12:15' };
const AFTERNOON: OpenRange = { open: '15:00', close: '17:45' };

export const WEEKLY_TEMPLATE: Record<number, OpenRange[]> = {
	1: [MORNING, AFTERNOON], // Mon
	2: [MORNING, AFTERNOON], // Tue
	3: [MORNING, AFTERNOON], // Wed
	// Thu (4): closed
	5: [MORNING, AFTERNOON], // Fri
	6: [MORNING], // Sat (morning only)
	// Sun (0): closed
};

// Specific dates the clinic is closed (holidays), "YYYY-MM-DD".
export const BLOCKED_DATES = new Set<string>([]);
