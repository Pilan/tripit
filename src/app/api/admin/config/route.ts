import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getTripConfig, getMilestones, upsertTripConfig, setMilestones } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = getTripConfig();
  const milestones = getMilestones();
  return NextResponse.json({ config, milestones });
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { config, milestones, exportToFile } = body;

  if (config) {
    upsertTripConfig(config);
  }

  if (milestones) {
    setMilestones(milestones);
  }

  if (exportToFile) {
    const currentConfig = getTripConfig();
    const currentMilestones = getMilestones();
    const exportData = {
      goal_city: currentConfig?.goal_city,
      total_cost: currentConfig?.total_cost,
      current_amount: currentConfig?.current_amount,
      start_cities: currentConfig?.start_cities,
      milestones: currentMilestones.map(({ name, cost, order_index, description }) => ({
        name, cost, order_index, description,
      })),
    };
    const configPath = path.join(process.cwd(), 'trip-config.json');
    fs.writeFileSync(configPath, JSON.stringify(exportData, null, 2));
  }

  return NextResponse.json({ success: true });
}
