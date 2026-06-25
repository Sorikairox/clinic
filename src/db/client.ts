import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// Local dev defaults to a SQLite file; production points DATABASE_URL at a Turso
// (libSQL) database with DATABASE_AUTH_TOKEN. Same client for both.
const url = process.env.DATABASE_URL ?? 'file:./local.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

export const client = createClient(authToken ? { url, authToken } : { url });
export const db = drizzle(client, { schema });
