import { createRequire } from 'node:module';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient as createWebClient } from '@libsql/client/web';
import type { Client } from '@libsql/client';
import * as schema from './schema';

// Local dev/tests default to a SQLite file; production points DATABASE_URL at a
// remote Turso (libSQL) database with DATABASE_AUTH_TOKEN.
const url = process.env.DATABASE_URL ?? 'file:./local.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

// Remote libSQL/Turso (libsql://, https://, ws://) uses the pure-HTTP "web"
// client. It has NO native dependencies, so it works inside bundled serverless
// functions (Netlify). The default Node client loads the `libsql` native addon,
// which fails to load once deployed — taking down every DB-backed route (the
// reservation and admin pages 404 while DB-free pages keep working).
//
// A local SQLite file (`file:`) is only supported by the Node client, so we load
// it lazily via createRequire. That keeps the native addon out of the serverless
// bundle entirely, since this branch only ever runs in local dev/tests.
function makeClient(): Client {
	if (url.startsWith('file:')) {
		const require = createRequire(import.meta.url);
		const { createClient } = require('@libsql/client') as typeof import('@libsql/client');
		return createClient({ url });
	}
	return createWebClient(authToken ? { url, authToken } : { url });
}

export const client = makeClient();
export const db = drizzle(client, { schema });
