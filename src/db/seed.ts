import { randomUUID } from 'node:crypto';
import { client, db } from './client';
import { staff } from './schema';
import { hashPassword } from '../lib/password';

// Seeds the first staff account. Override via env when running:
//   SEED_STAFF_EMAIL=... SEED_STAFF_PASSWORD=... npm run db:seed
const email = process.env.SEED_STAFF_EMAIL ?? 'staff@shibaclinic.example';
const password = process.env.SEED_STAFF_PASSWORD ?? 'changeme123';
const name = process.env.SEED_STAFF_NAME ?? 'Clinic Staff';

const existing = await db.query.staff.findFirst();
if (existing) {
	console.log('Staff already exist — skipping seed.');
} else {
	await db.insert(staff).values({
		id: randomUUID(),
		email,
		name,
		passwordHash: hashPassword(password),
		role: 'admin',
		createdAt: new Date().toISOString(),
	});
	console.log(`Seeded staff account: ${email}`);
	if (password === 'changeme123') {
		console.log('WARNING: using the default password. Set SEED_STAFF_PASSWORD before deploying.');
	}
}

client.close();
