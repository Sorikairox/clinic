import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// scrypt password hashing using only the Node standard library (no native dep).
// Stored format: "<salt-hex>:<derivedKey-hex>".

export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const derived = scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [salt, keyHex] = stored.split(':');
	if (!salt || !keyHex) return false;
	const keyBuf = Buffer.from(keyHex, 'hex');
	const derived = scryptSync(password, salt, 64);
	return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived);
}
