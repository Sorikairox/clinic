// Canonical (locale-less) page paths and the navigation manifest. Shared by the
// header, footer and the sitemap so they never drift apart.

export interface NavItem {
	path: string;
	labelKey: string;
}

export const NAV_ITEMS: NavItem[] = [
	{ path: '/', labelKey: 'nav.home' },
	{ path: '/services', labelKey: 'nav.services' },
	{ path: '/director', labelKey: 'nav.director' },
	{ path: '/facility', labelKey: 'nav.facility' },
	{ path: '/price', labelKey: 'nav.price' },
	{ path: '/access', labelKey: 'nav.access' },
	{ path: '/contact', labelKey: 'nav.contact' },
];

// Every public, indexable page path (locale-less). Drives the sitemap.
export const PUBLIC_PATHS: string[] = [
	'/',
	'/services',
	'/director',
	'/facility',
	'/price',
	'/access',
	'/contact',
	'/reservation',
];
