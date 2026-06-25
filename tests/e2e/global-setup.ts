import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

// Resets a dedicated e2e SQLite database, then migrates and seeds a known staff
// account before the Playwright run.
export default function globalSetup() {
	const env = { ...process.env, DATABASE_URL: 'file:./e2e.db' };
	rmSync('./e2e.db', { force: true });
	rmSync('./e2e.db-journal', { force: true });
	execSync('npx tsx src/db/migrate.ts', { env, stdio: 'inherit' });
	execSync('npx tsx src/db/seed.ts', {
		env: {
			...env,
			SEED_STAFF_EMAIL: 'e2e@clinic.test',
			SEED_STAFF_PASSWORD: 'e2epass123',
			SEED_STAFF_NAME: 'E2E Staff',
		},
		stdio: 'inherit',
	});
}
