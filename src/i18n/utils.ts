import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from './config';

import ja from './ja.json';
import en from './en.json';
import zhHans from './zh-Hans.json';
import zhHant from './zh-Hant.json';
import ptBR from './pt-BR.json';
import ru from './ru.json';
import es from './es.json';

type Dict = Record<string, unknown>;

const DICTS: Record<Locale, Dict> = {
	ja,
	en,
	'zh-Hans': zhHans,
	'zh-Hant': zhHant,
	'pt-BR': ptBR,
	ru,
	es,
};

function lookup(dict: Dict, key: string): string | undefined {
	const value = key.split('.').reduce<unknown>((acc, part) => {
		if (acc && typeof acc === 'object' && part in (acc as Dict)) {
			return (acc as Dict)[part];
		}
		return undefined;
	}, dict);
	return typeof value === 'string' ? value : undefined;
}

/**
 * Returns a translator bound to a locale. Looks up a dotted key in the locale's
 * dictionary, falls back to the default locale, then to the raw key. Supports
 * `{placeholder}` interpolation.
 */
export function useTranslations(locale: Locale) {
	return function t(key: string, vars?: Record<string, string | number>): string {
		const raw = lookup(DICTS[locale], key) ?? lookup(DICTS[DEFAULT_LOCALE], key) ?? key;
		if (!vars) return raw;
		return raw.replace(/\{(\w+)\}/g, (_, name) =>
			name in vars ? String(vars[name]) : `{${name}}`,
		);
	};
}

/** Returns the locale's full dictionary (for reading arrays/objects directly). */
export function getDict(locale: Locale): Dict {
	return DICTS[locale];
}

/**
 * Reads a dotted key expected to be a string array (e.g. a list of
 * qualifications), falling back to the default locale, then to an empty array.
 */
export function useList(locale: Locale) {
	return function list(key: string): string[] {
		const read = (dict: Dict): string[] | undefined => {
			const value = key.split('.').reduce<unknown>((acc, part) => {
				if (acc && typeof acc === 'object' && part in (acc as Dict)) {
					return (acc as Dict)[part];
				}
				return undefined;
			}, dict);
			return Array.isArray(value) ? (value as string[]) : undefined;
		};
		return read(DICTS[locale]) ?? read(DICTS[DEFAULT_LOCALE]) ?? [];
	};
}

/**
 * Reads a dotted key expected to be an array of plain objects (e.g. price-table
 * rows of `{ label, price }`), falling back to the default locale, then `[]`.
 */
export function useItems<T = Record<string, string>>(locale: Locale) {
	return function items(key: string): T[] {
		const read = (dict: Dict): T[] | undefined => {
			const value = key.split('.').reduce<unknown>((acc, part) => {
				if (acc && typeof acc === 'object' && part in (acc as Dict)) {
					return (acc as Dict)[part];
				}
				return undefined;
			}, dict);
			return Array.isArray(value) ? (value as T[]) : undefined;
		};
		return read(DICTS[locale]) ?? read(DICTS[DEFAULT_LOCALE]) ?? [];
	};
}

/**
 * Resolves the locale from the `[...locale]` route param. Returns null for an
 * unknown locale so the caller can return a 404.
 */
export function resolveLocale(param: string | undefined): Locale | null {
	if (!param) return DEFAULT_LOCALE;
	return isLocale(param) ? param : null;
}

/**
 * Builds the path for a canonical (locale-less) page path in a given locale.
 * Japanese (the default) has no prefix; every other locale is prefixed.
 *   localizedPath('/', 'ja')        -> '/'
 *   localizedPath('/', 'en')        -> '/en'
 *   localizedPath('/director', 'en')-> '/en/director'
 */
export function localizedPath(path: string, locale: Locale): string {
	const clean = path === '/' ? '' : path;
	if (locale === DEFAULT_LOCALE) return clean || '/';
	return `/${locale}${clean}`;
}

/**
 * Strips the locale prefix from a request path to get the canonical page path.
 *   '/en/director' -> '/director'  ;  '/director' -> '/director'  ;  '/en' -> '/'
 */
export function canonicalPath(pathname: string, locale: Locale): string {
	if (locale === DEFAULT_LOCALE) return pathname || '/';
	const stripped = pathname.replace(new RegExp(`^/${locale}`), '');
	return stripped || '/';
}

export interface AlternateLink {
	locale: Locale | 'x-default';
	hreflang: string;
	path: string;
}

/**
 * hreflang alternates for a canonical page path: one per locale plus x-default
 * (pointing at the default locale). Returns site-relative paths; resolve against
 * Astro.site for absolute URLs.
 */
export function alternateLinks(canonical: string): AlternateLink[] {
	const links: AlternateLink[] = LOCALES.map((locale) => ({
		locale,
		hreflang: locale,
		path: localizedPath(canonical, locale),
	}));
	links.push({ locale: 'x-default', hreflang: 'x-default', path: localizedPath(canonical, DEFAULT_LOCALE) });
	return links;
}
