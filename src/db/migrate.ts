import { migrate } from 'drizzle-orm/libsql/migrator';
import { client, db } from './client';

// Applies the generated SQL migrations in ./drizzle. Run with `npm run db:migrate`.
await migrate(db, { migrationsFolder: './drizzle' });
client.close();
console.log('Migrations applied.');
