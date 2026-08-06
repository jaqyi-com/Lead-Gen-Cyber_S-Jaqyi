import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

const CONFIG_PATH = path.resolve(process.cwd(), '../pipeline-config.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

function writeConfig(config: unknown) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export async function GET() {
  const config = readConfig();
  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 });
  return NextResponse.json(config);
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { keywords?: string[]; categories?: Record<string, string[]>; schedule?: { enabled: boolean; cron: string; label: string } };
    const current = readConfig() ?? {};

    const updated = {
      ...current,
      ...(body.keywords !== undefined ? { keywords: body.keywords } : {}),
      ...(body.categories !== undefined ? { categories: body.categories } : {}),
      ...(body.schedule !== undefined ? { schedule: body.schedule } : {}),
    };

    writeConfig(updated);
    return NextResponse.json({ ok: true, config: updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
