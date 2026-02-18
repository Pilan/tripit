import { NextResponse } from 'next/server';
import { seedFromConfig } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST() {
  const configPath = path.join(process.cwd(), 'trip-config.json');

  if (!fs.existsSync(configPath)) {
    return NextResponse.json({ error: 'trip-config.json not found' }, { status: 404 });
  }

  const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  seedFromConfig(data);
  return NextResponse.json({ success: true, message: 'Database seeded from trip-config.json' });
}
