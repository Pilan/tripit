import { cookies } from 'next/headers';
import crypto from 'crypto';

const TOKEN_COOKIE = 'admin_token';
const TOKEN_MAX_AGE = 60 * 60 * 24; // 24 hours

function generateToken(password: string): string {
  return crypto.createHash('sha256').update(password + '_trip_admin_salt').digest('hex');
}

export function validatePassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

export function createSession(password: string): string {
  const token = generateToken(password);
  return token;
}

export function getTokenCookieConfig(token: string) {
  return {
    name: TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: TOKEN_MAX_AGE,
    path: '/',
  };
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) return false;
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return token === generateToken(expected);
}
