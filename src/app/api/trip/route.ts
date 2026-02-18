import { NextResponse } from 'next/server';
import { getTripConfig, getMilestones, seedFromConfig } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  let config = getTripConfig();

  // Auto-seed from config file if DB is empty
  if (!config) {
    const configPath = path.join(process.cwd(), 'trip-config.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      seedFromConfig(data);
      config = getTripConfig();
    }
  }

  if (!config) {
    return NextResponse.json({ error: 'No trip configured' }, { status: 404 });
  }

  const milestones = getMilestones();
  return NextResponse.json({ config, milestones });
}
