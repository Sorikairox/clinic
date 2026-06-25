import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Use the preinstalled Chromium when present (this sandbox), otherwise fall back
// to the browser Playwright installs itself (CI: `playwright install chromium`).
const SANDBOX_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const chromiumPath =
	process.env.PW_CHROMIUM_PATH || (existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined);

export default defineConfig({
	testDir: './tests/e2e',
	globalSetup: './tests/e2e/global-setup.ts',
	fullyParallel: false,
	workers: 1,
	timeout: 30_000,
	use: { baseURL: BASE_URL },
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
			},
		},
	],
	webServer: {
		command: 'npm run build && node ./dist/server/entry.mjs',
		url: BASE_URL,
		timeout: 120_000,
		reuseExistingServer: false,
		env: {
			ASTRO_ADAPTER: 'node', // build a runnable Node server for the e2e run
			DATABASE_URL: 'file:./e2e.db',
			SESSION_SECRET: 'e2e-secret',
			HOST: '127.0.0.1',
			PORT: String(PORT),
		},
	},
});
