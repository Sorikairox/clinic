import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { staff, type Staff } from '../db/schema';

const SECRET = process.env.SESSION_SECRET ?? 'dev-insecure-secret-change-me';
const COOKIE_NAME = 'clinic_session';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function sign(payload: string): string {
	return createHmac('sha256', SECRET).update(payload).digest('base64url');
}

function createToken(staffId: string): string {
	const expires = Date.now() + MAX_AGE_SECONDS * 1000;
	const payload = `${staffId}.${expires}`;
	return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string): string | null {
	const parts = token.split('.');
	if (parts.length !== 3) return null;
	const [staffId, expires, sig] = parts;
	const expected = sign(`${staffId}.${expires}`);
	const a = Buffer.from(sig);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
	if (Number(expires) < Date.now()) return null;
	return staffId;
}

export function setSession(cookies: AstroCookies, staffId: string): void {
	cookies.set(COOKIE_NAME, createToken(staffId), {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: MAX_AGE_SECONDS,
	});
}

export function clearSession(cookies: AstroCookies): void {
	cookies.delete(COOKIE_NAME, { path: '/' });
}

/** Returns the logged-in staff record, or null. Used to guard the dashboard. */
export async function getSessionStaff(cookies: AstroCookies): Promise<Staff | null> {
	const token = cookies.get(COOKIE_NAME)?.value;
	if (!token) return null;
	const staffId = verifyToken(token);
	if (!staffId) return null;
	const found = await db.query.staff.findFirst({ where: eq(staff.id, staffId) });
	return found ?? null;
}
