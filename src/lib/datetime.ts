import { LOCALE_TAGS, type Locale } from '../i18n/config';

const CLINIC_TZ = 'Asia/Tokyo';

// Slot strings are clinic-local wall times ("YYYY-MM-DDTHH:mm"); anchor them to
// JST so Intl formats them correctly regardless of the server timezone.
function anchor(slot: string): Date {
	return new Date(`${slot}:00+09:00`);
}

export function formatDateLong(slotStart: string, locale: Locale): string {
	return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
		dateStyle: 'full',
		timeZone: CLINIC_TZ,
	}).format(anchor(slotStart));
}

export function formatTime(slot: string, locale: Locale): string {
	return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: CLINIC_TZ,
	}).format(anchor(slot));
}

/** e.g. "Wednesday, 1 July 2026, 10:00–10:30 (JST)" localized to the locale. */
export function formatSlotLong(slotStart: string, slotEnd: string, locale: Locale): string {
	const date = formatDateLong(slotStart, locale);
	return `${date}, ${formatTime(slotStart, locale)}–${formatTime(slotEnd, locale)} (JST)`;
}
