import { NextRequest, NextResponse } from 'next/server';
import { validatePassword, createSession, getTokenCookieConfig } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password } = body;

  if (!password || !validatePassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = createSession(password);
  const response = NextResponse.json({ success: true });
  const cookieConfig = getTokenCookieConfig(token);
  response.cookies.set(cookieConfig);
  return response;
}
