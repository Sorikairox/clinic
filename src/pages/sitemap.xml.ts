import type { APIRoute } from 'astro';
import { LOCALES } from '@/i18n/config';
import { alternateLinks, localizedPath } from '@/i18n/utils';
import { PUBLIC_PATHS } from '@/lib/routes';

export const prerender = false;

// Multilingual sitemap: every public page × every locale, each with hreflang
// alternates — the indexable counterpart to the old Google-Translate widget.
export const GET: APIRoute = ({ site }) => {
	const base = site ?? new URL('https://clinic.example.com');
	const abs = (path: string) => new URL(path, base).href;

	const urls: string[] = [];
	for (const path of PUBLIC_PATHS) {
		const alts = alternateLinks(path)
			.map((a) => `<xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${abs(a.path)}"/>`)
			.join('');
		for (const locale of LOCALES) {
			urls.push(`<url><loc>${abs(localizedPath(path, locale))}</loc>${alts}</url>`);
		}
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>`;

	return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
