// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import node from '@astrojs/node';

// The public site URL. Override in production via the SITE_URL env var
// (used for canonical URLs, hreflang and the sitemap).
const SITE_URL = process.env.SITE_URL ?? 'https://clinic.example.com';

// Deploy target is Netlify by default. Local/CI runs set ASTRO_ADAPTER=node so
// the build produces a runnable Node server (dist/server/entry.mjs) for tests.
const useNode = process.env.ASTRO_ADAPTER === 'node';

// https://astro.build
export default defineConfig({
	site: SITE_URL,
	output: 'server',
	adapter: useNode ? node({ mode: 'standalone' }) : netlify(),
	i18n: {
		defaultLocale: 'ja',
		locales: ['ja', 'en', 'zh-Hans', 'zh-Hant', 'pt-BR', 'ru', 'es'],
		routing: {
			// Japanese lives at the root ("/"), every other locale under "/<locale>/".
			prefixDefaultLocale: false,
		},
	},
	// A custom sitemap endpoint (src/pages/sitemap.xml.ts) is used instead of the
	// sitemap integration, since all routes are server-rendered (on-demand).
});
