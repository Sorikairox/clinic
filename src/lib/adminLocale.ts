import type { AstroCookies } from 'astro';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n/config';

const COOKIE = 'admin_locale';

/**
 * Resolves the admin UI language. A `?lang=` query param (from the switcher)
 * wins and is remembered in a cookie so the choice survives action re-renders
 * (which land back on `/admin` with no query string) and later navigation;
 * otherwise the saved cookie is used, falling back to the site default
 * (Japanese). Only the site's configured locales are accepted.
 */
export function resolveAdminLocale(cookies: AstroCookies, url: URL): Locale {
	const requested = url.searchParams.get('lang');
	if (isLocale(requested)) {
		cookies.set(COOKIE, requested, {
			path: '/admin',
			sameSite: 'lax',
			httpOnly: false,
			maxAge: 60 * 60 * 24 * 365,
		});
		return requested;
	}
	const saved = cookies.get(COOKIE)?.value;
	if (isLocale(saved)) return saved;
	return DEFAULT_LOCALE;
}
