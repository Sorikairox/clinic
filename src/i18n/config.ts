// Single source of truth for the site's locales. Adding/removing a language is
// a one-line change here; routing, the language switcher, hreflang and the
// sitemap all derive from this list.

export const DEFAULT_LOCALE = 'ja' as const;

export const LOCALES = [
	'ja',
	'en',
	'zh-Hans',
	'zh-Hant',
	'pt-BR',
	'ru',
	'es',
] as const;

export type Locale = (typeof LOCALES)[number];

// Native names shown in the language switcher.
export const LOCALE_NAMES: Record<Locale, string> = {
	ja: '日本語',
	en: 'English',
	'zh-Hans': '简体中文',
	'zh-Hant': '繁體中文',
	'pt-BR': 'Português',
	ru: 'Русский',
	es: 'Español',
};

// BCP-47 tags for <html lang> / hreflang / Open Graph locale.
export const LOCALE_TAGS: Record<Locale, string> = {
	ja: 'ja-JP',
	en: 'en-US',
	'zh-Hans': 'zh-Hans',
	'zh-Hant': 'zh-Hant',
	'pt-BR': 'pt-BR',
	ru: 'ru-RU',
	es: 'es-ES',
};

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
