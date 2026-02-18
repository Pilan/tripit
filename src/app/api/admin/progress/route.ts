import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { updateProgress, getTripConfig } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { current_amount } = body;

  if (typeof current_amount !== 'number' || current_amount < 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  updateProgress(current_amount);
  const config = getTripConfig();
  return NextResponse.json({ success: true, config });
}
