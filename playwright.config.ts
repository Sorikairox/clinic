import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const BASE_URL = `http://127.0.0.1:${PORT}`;

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
				// The preinstalled Chromium (the bundled build may differ from the
				// @playwright/test default). Override via PW_CHROMIUM_PATH if needed.
				launchOptions: {
					executablePath:
						process.env.PW_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
				},
			},
		},
	],
	webServer: {
		command: 'npm run build && node ./dist/server/entry.mjs',
		url: BASE_URL,
		timeout: 120_000,
		reuseExistingServer: false,
		env: {
			DATABASE_URL: 'file:./e2e.db',
			SESSION_SECRET: 'e2e-secret',
			HOST: '127.0.0.1',
			PORT: String(PORT),
		},
	},
});
